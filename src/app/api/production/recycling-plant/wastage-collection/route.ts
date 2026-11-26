import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRecyclingApiPermission } from "@/lib/recycling/permissions";
import {
  createDefaultWastageReport,
  recalculateWastageReport,
  RpWastageCollectionData,
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

function isMissingTableError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  return (
    err?.code === "P2021" ||
    Boolean(err?.message && err.message.includes("does not exist"))
  );
}

async function getActiveShiftNames(): Promise<string[]> {
  try {
    const shifts = await db.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
      select: { name: true },
    });
    return shifts.length > 0 ? shifts.map((s) => s.name) : ["Day Shift", "Night Shift"];
  } catch {
    return ["Day Shift", "Night Shift"];
  }
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
      const report = await db.rpWastageCollectionReport.findUnique({ where: { id } });
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

      const [existingReport, prevSameMonthReport, latestPriorReport] = await Promise.all([
        db.rpWastageCollectionReport.findUnique({ where: { date } }),
        db.rpWastageCollectionReport.findFirst({
          where: { date: { gte: monthStart, lt: date } },
          orderBy: { date: "desc" },
        }),
        db.rpWastageCollectionReport.findFirst({
          where: { date: { lt: date } },
          orderBy: { date: "desc" },
          select: { serialNo: true, sections: true },
        }),
      ]);

      const nextSerialNo = (latestPriorReport?.serialNo ?? 0) + 1;

      if (!existingReport) {
        const defaultReport = createDefaultWastageReport(date, activeShifts, nextSerialNo);

        // Preserve any custom rows added on prior day with zeroed daily shift values
        if (latestPriorReport && Array.isArray(latestPriorReport.sections)) {
          const priorSections = latestPriorReport.sections as any[];
          defaultReport.sections = defaultReport.sections.map((sec) => {
            const priorSec = priorSections.find((p) => p.key === sec.key);
            if (!priorSec || !Array.isArray(priorSec.rows)) return sec;

            const customRows = priorSec.rows
              .filter((r: any) => r.isCustom)
              .map((r: any) => ({
                id: r.id,
                label: r.label,
                isCustom: true,
                shifts: Object.fromEntries(activeShifts.map((s) => [s, 0])),
                mtdShifts: Object.fromEntries(activeShifts.map((s) => [s, 0])),
                total: 0,
              }));

            return customRows.length > 0 ? { ...sec, rows: [...sec.rows, ...customRows] } : sec;
          });
        }

        // Seed previous same-month MTD baseline if present
        if (prevSameMonthReport) {
          const prevRecalc = recalculateWastageReport(
            prevSameMonthReport as unknown as RpWastageCollectionData,
            activeShifts
          );
          defaultReport.sections = defaultReport.sections.map((sec) => {
            const prevSec = prevRecalc.sections.find((p) => p.key === sec.key);
            if (!prevSec) return sec;
            return {
              ...sec,
              rows: sec.rows.map((r) => {
                const prevRow = prevSec.rows.find(
                  (pr) => pr.id === r.id || pr.label.toUpperCase() === r.label.toUpperCase()
                );
                if (!prevRow) return r;
                return {
                  ...r,
                  mtdShifts: { ...prevRow.mtdShifts },
                };
              }),
            };
          });
          defaultReport.marginBlocks.bobbinCleaning.rows =
            defaultReport.marginBlocks.bobbinCleaning.rows.map((r) => {
              const prevRow = prevRecalc.marginBlocks.bobbinCleaning.rows.find(
                (pr) => pr.key === r.key
              );
              return prevRow ? { ...r, mtd: prevRow.mtd } : r;
            });
          defaultReport.marginBlocks.oldBobbinCutting.rows =
            defaultReport.marginBlocks.oldBobbinCutting.rows.map((r) => {
              const prevRow = prevRecalc.marginBlocks.oldBobbinCutting.rows.find(
                (pr) => pr.key === r.key
              );
              return prevRow ? { ...r, mtd: prevRow.mtd } : r;
            });
        }

        const calculated = recalculateWastageReport(defaultReport, activeShifts);
        return NextResponse.json(
          {
            success: true,
            exists: false,
            activeShifts,
            prevMonthReport: prevSameMonthReport || null,
            report: calculated,
          },
          { headers: NO_STORE_HEADERS }
        );
      }

      const hydrated = recalculateWastageReport(
        existingReport as unknown as RpWastageCollectionData,
        activeShifts
      );

      return NextResponse.json(
        {
          success: true,
          exists: true,
          activeShifts,
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

    const reports = await db.rpWastageCollectionReport.findMany({
      where,
      orderBy: [{ date: "desc" }],
      take: 100,
    });

    return NextResponse.json(
      { success: true, reports, activeShifts },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    if (isMissingTableError(error)) {
      const activeShifts = await getActiveShiftNames();
      if (date) {
        return NextResponse.json(
          {
            success: true,
            exists: false,
            migrationPending: true,
            activeShifts,
            prevMonthReport: null,
            report: createDefaultWastageReport(date, activeShifts, 1),
          },
          { headers: NO_STORE_HEADERS }
        );
      }
      return NextResponse.json(
        { success: true, migrationPending: true, reports: [], activeShifts },
        { headers: NO_STORE_HEADERS }
      );
    }
    console.error("Error fetching RP wastage collection report:", error);
    return NextResponse.json(
      { error: "Failed to fetch RP wastage collection report" },
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
    const calculated = recalculateWastageReport(
      {
        serialNo: Number(body.serialNo) || 1,
        date,
        shiftNames: activeShifts,
        operatorName: (body.operatorName || "").trim(),
        operatorId: body.operatorId || null,
        supervisorName: (body.supervisorName || "").trim(),
        sections: Array.isArray(body.sections) ? body.sections : [],
        marginBlocks: body.marginBlocks,
        summaryTotalKg: 0,
        grandTotalKg: 0,
        status: body.status || "DRAFT",
        remarks: (body.remarks || "").trim(),
      },
      activeShifts
    );

    const saved = await db.rpWastageCollectionReport.upsert({
      where: { date },
      update: {
        serialNo: calculated.serialNo,
        shiftNames: calculated.shiftNames as any,
        operatorName: calculated.operatorName || null,
        operatorId: calculated.operatorId || null,
        supervisorName: calculated.supervisorName || null,
        sections: calculated.sections as any,
        marginBlocks: calculated.marginBlocks as any,
        summaryTotalKg: calculated.summaryTotalKg,
        grandTotalKg: calculated.grandTotalKg,
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
        sections: calculated.sections as any,
        marginBlocks: calculated.marginBlocks as any,
        summaryTotalKg: calculated.summaryTotalKg,
        grandTotalKg: calculated.grandTotalKg,
        status: calculated.status,
        remarks: calculated.remarks || null,
      },
    });

    await logEvent({
      module: "RECYCLING_PLANT",
      action: `Saved RP Wastage Collection Report for ${saved.date} (Sl. No. ${saved.serialNo})`,
      severity: "INFO",
      payload: {
        reportId: saved.id,
        date: saved.date,
        serialNo: saved.serialNo,
        summaryTotalKg: saved.summaryTotalKg,
        grandTotalKg: saved.grandTotalKg,
        status: saved.status,
      },
      httpMethod: "POST",
      url: "/api/production/recycling-plant/wastage-collection",
      statusCode: 200,
    }).catch(console.error);

    emitProductionSync({
      module: "recycling-plant",
      sheet: "wastage-collection",
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
      message: "Wastage Collection Report saved successfully",
    });
  } catch (error: any) {
    if (isMissingTableError(error)) {
      return NextResponse.json(
        {
          error:
            "RP Wastage table is not migrated yet. Run 'npx prisma migrate deploy' on the database.",
        },
        { status: 503 }
      );
    }
    console.error("Error saving RP wastage collection report:", error);
    return NextResponse.json(
      { error: "Failed to save Wastage Collection Report", details: error.message },
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
      const deleted = await db.rpWastageCollectionReport.delete({ where: { id } });
      await logEvent({
        module: "RECYCLING_PLANT",
        action: `Deleted RP Wastage Collection Report ${deleted.date}`,
        severity: "WARN",
        payload: { id, date: deleted.date },
        httpMethod: "DELETE",
        url: "/api/production/recycling-plant/wastage-collection",
        statusCode: 200,
      }).catch(console.error);
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (date) {
      await db.rpWastageCollectionReport.delete({ where: { date } });
      await logEvent({
        module: "RECYCLING_PLANT",
        action: `Deleted RP Wastage Collection Report ${date}`,
        severity: "WARN",
        payload: { date },
        httpMethod: "DELETE",
        url: "/api/production/recycling-plant/wastage-collection",
        statusCode: 200,
      }).catch(console.error);
      return NextResponse.json({ success: true, date });
    }

    return NextResponse.json({ error: "Missing id or date parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Error deleting RP wastage collection report:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
