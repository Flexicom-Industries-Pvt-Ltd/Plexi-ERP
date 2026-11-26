import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRecyclingApiPermission } from "@/lib/recycling/permissions";
import {
  createDefaultRpProductionReport,
  recalculateRpProductionReport,
  RpProductionReportData,
} from "@/lib/recycling/rp-types";
import { logEvent } from "@/lib/logging";
import { emitProductionSync } from "@/lib/realtime/production-bus";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

async function getActiveShiftNames(): Promise<string[]> {
  const shifts = await db.shift.findMany({
    where: { isActive: true },
    orderBy: { startTime: "asc" },
    select: { name: true },
  });
  return shifts.length > 0 ? shifts.map((s) => s.name) : ["Day Shift", "Night Shift"];
}

export async function GET(request: NextRequest) {
  const authResult = await requireRecyclingApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const date = searchParams.get("date");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  try {
    const activeShifts = await getActiveShiftNames();

    if (id) {
      const report = await db.rpProductionReport.findUnique({ where: { id } });
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json(
        { success: true, report, activeShifts },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (date) {
      const monthPrefix = date.slice(0, 7);
      const monthStart = `${monthPrefix}-01`;

      const [existingReport, previousDayReport, prevSameMonthReport] = await Promise.all([
        db.rpProductionReport.findUnique({ where: { date } }),
        db.rpProductionReport.findFirst({
          where: { date: { lt: date } },
          orderBy: { date: "desc" },
        }),
        db.rpProductionReport.findFirst({
          where: { date: { gte: monthStart, lt: date } },
          orderBy: { date: "desc" },
        }),
      ]);

      const nextSerialNo = (previousDayReport?.serialNo ?? 0) + 1;

      if (!existingReport) {
        const defaultReport = createDefaultRpProductionReport(
          date,
          activeShifts,
          nextSerialNo,
          previousDayReport
            ? (previousDayReport as unknown as RpProductionReportData)
            : null
        );

        return NextResponse.json(
          {
            success: true,
            exists: false,
            activeShifts,
            hasPreviousOpening: Boolean(previousDayReport),
            previousDate: previousDayReport?.date || null,
            prevMonthReport: prevSameMonthReport || null,
            report: defaultReport,
          },
          { headers: NO_STORE_HEADERS }
        );
      }

      const hydrated = recalculateRpProductionReport(
        existingReport as unknown as RpProductionReportData,
        activeShifts
      );

      return NextResponse.json(
        {
          success: true,
          exists: true,
          activeShifts,
          hasPreviousOpening: Boolean(previousDayReport),
          previousDate: previousDayReport?.date || null,
          prevMonthReport: prevSameMonthReport || null,
          report: hydrated,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    // List register
    const where: Record<string, unknown> = {};
    if (dateFrom && dateTo) {
      where.date = { gte: dateFrom, lte: dateTo };
    } else if (dateFrom) {
      where.date = { gte: dateFrom };
    }

    const reports = await db.rpProductionReport.findMany({
      where,
      orderBy: [{ date: "desc" }],
      take: 100,
    });

    return NextResponse.json(
      { success: true, reports, activeShifts },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    console.error("Error fetching RP production report:", error);
    return NextResponse.json(
      { error: "Failed to fetch RP production report" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRecyclingApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { date, clientId } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const activeShifts = await getActiveShiftNames();
    const calculated = recalculateRpProductionReport(
      {
        serialNo: Number(body.serialNo) || 1,
        date,
        shiftNames: activeShifts,
        operatorName: (body.operatorName || "").trim(),
        operatorId: body.operatorId || null,
        supervisorName: (body.supervisorName || "").trim(),
        rows: Array.isArray(body.rows) ? body.rows : [],
        totalOpeningStock: 0,
        totalProductionOnDate: 0,
        totalProductionMtd: 0,
        totalIssuedToTapePlant: 0,
        totalIssuedToTapePlantMtd: 0,
        totalLumpsOnDate: 0,
        totalLumpsMtd: 0,
        totalDispatchOnDate: 0,
        totalDispatchMtd: 0,
        totalClosingStock: 0,
        status: body.status || "DRAFT",
        remarks: (body.remarks || "").trim(),
      },
      activeShifts
    );

    const saved = await db.rpProductionReport.upsert({
      where: { date },
      update: {
        serialNo: calculated.serialNo,
        shiftNames: calculated.shiftNames as any,
        operatorName: calculated.operatorName || null,
        operatorId: calculated.operatorId || null,
        supervisorName: calculated.supervisorName || null,
        rows: calculated.rows as any,
        totalOpeningStock: calculated.totalOpeningStock,
        totalProductionOnDate: calculated.totalProductionOnDate,
        totalProductionMtd: calculated.totalProductionMtd,
        totalIssuedToTapePlant: calculated.totalIssuedToTapePlant,
        totalIssuedToTapePlantMtd: calculated.totalIssuedToTapePlantMtd,
        totalLumpsOnDate: calculated.totalLumpsOnDate,
        totalLumpsMtd: calculated.totalLumpsMtd,
        totalDispatchOnDate: calculated.totalDispatchOnDate,
        totalDispatchMtd: calculated.totalDispatchMtd,
        totalClosingStock: calculated.totalClosingStock,
        status: calculated.status,
        remarks: calculated.remarks || null,
      },
      create: {
        serialNo: calculated.serialNo,
        date: calculated.date,
        shiftNames: calculated.shiftNames as any,
        operatorName: calculated.operatorName || null,
        operatorId: calculated.operatorId || null,
        supervisorName: calculated.supervisorName || null,
        rows: calculated.rows as any,
        totalOpeningStock: calculated.totalOpeningStock,
        totalProductionOnDate: calculated.totalProductionOnDate,
        totalProductionMtd: calculated.totalProductionMtd,
        totalIssuedToTapePlant: calculated.totalIssuedToTapePlant,
        totalIssuedToTapePlantMtd: calculated.totalIssuedToTapePlantMtd,
        totalLumpsOnDate: calculated.totalLumpsOnDate,
        totalLumpsMtd: calculated.totalLumpsMtd,
        totalDispatchOnDate: calculated.totalDispatchOnDate,
        totalDispatchMtd: calculated.totalDispatchMtd,
        totalClosingStock: calculated.totalClosingStock,
        status: calculated.status,
        remarks: calculated.remarks || null,
      },
    });

    await logEvent({
      module: "RECYCLING_PLANT",
      action: `Saved R.P. Plant Production Report for ${saved.date} (Sr. No. ${saved.serialNo})`,
      severity: "INFO",
      payload: {
        reportId: saved.id,
        date: saved.date,
        serialNo: saved.serialNo,
        totalProductionOnDate: saved.totalProductionOnDate,
        totalIssuedToTapePlant: saved.totalIssuedToTapePlant,
        totalClosingStock: saved.totalClosingStock,
        status: saved.status,
      },
      httpMethod: "POST",
      url: "/api/production/recycling-plant/production",
      statusCode: 200,
    }).catch(console.error);

    emitProductionSync({
      module: "recycling-plant",
      sheet: "production",
      action: saved.status === "SUBMITTED" ? "SUBMIT" : "SAVE",
      date: saved.date,
      clientId: clientId || undefined,
      user: {
        name: authResult.session?.user?.name || "RP Operator",
        email: authResult.session?.user?.email || undefined,
        role:
          (authResult.session?.user as any)?.roleName ||
          (authResult.session?.user as any)?.role ||
          "Staff",
      },
    });

    return NextResponse.json({
      success: true,
      report: saved,
      message: "R.P. Plant Production Report saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving RP production report:", error);
    return NextResponse.json(
      { error: "Failed to save R.P. Plant Production Report", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireRecyclingApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const date = searchParams.get("date");

  try {
    if (id) {
      const deleted = await db.rpProductionReport.delete({ where: { id } });
      await logEvent({
        module: "RECYCLING_PLANT",
        action: `Deleted R.P. Plant Production Report ${deleted.date}`,
        severity: "WARN",
        payload: { id, date: deleted.date },
        httpMethod: "DELETE",
        url: "/api/production/recycling-plant/production",
        statusCode: 200,
      }).catch(console.error);
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (date) {
      await db.rpProductionReport.delete({ where: { date } });
      await logEvent({
        module: "RECYCLING_PLANT",
        action: `Deleted R.P. Plant Production Report ${date}`,
        severity: "WARN",
        payload: { date },
        httpMethod: "DELETE",
        url: "/api/production/recycling-plant/production",
        statusCode: 200,
      }).catch(console.error);
      return NextResponse.json({ success: true, date });
    }

    return NextResponse.json({ error: "Missing id or date parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Error deleting RP production report:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
