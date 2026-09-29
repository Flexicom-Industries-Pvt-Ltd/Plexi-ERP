import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLaminationApiPermission } from "@/lib/lamination/permissions";
import {
  calculateLaminationEntry,
  computeLaminationReportTotals,
  LaminationProductionEntryData,
} from "@/lib/lamination/lamination-types";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const date = searchParams.get("date");
  const shiftName = searchParams.get("shiftName");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  try {
    // Single report fetch by ID
    if (id) {
      const report = await db.laminationProductionReport.findUnique({
        where: { id },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    // Single report fetch by Date & Shift
    if (date && shiftName) {
      const report = await db.laminationProductionReport.findUnique({
        where: {
          date_shiftName: {
            date,
            shiftName,
          },
        },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });
      return NextResponse.json({ success: true, report: report || null });
    }

    // List reports with filters
    const where: any = {};
    if (date) {
      where.date = date;
    } else if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }
    if (shiftName && shiftName !== "ALL") {
      where.shiftName = shiftName;
    }

    const reports = await db.laminationProductionReport.findMany({
      where,
      include: {
        _count: {
          select: { entries: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error("GET /api/production/lamination/reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lamination production reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      date,
      shiftName,
      operatorName,
      operatorId,
      helperCount = 0,
      supervisorName,
      status = "DRAFT",
      remarks,
      entries = [],
    } = body;

    if (!date || !shiftName) {
      return NextResponse.json(
        { error: "Date and Shift are required" },
        { status: 400 }
      );
    }

    // Recalculate entries and totals to guarantee data integrity
    const calculatedEntries: LaminationProductionEntryData[] = entries.map(
      (entry: any, index: number) =>
        calculateLaminationEntry({
          ...entry,
          sequence: index + 1,
        })
    );

    const totals = computeLaminationReportTotals(calculatedEntries);

    const savedReport = await db.$transaction(async (tx) => {
      // Upsert report header
      const report = await tx.laminationProductionReport.upsert({
        where: {
          date_shiftName: {
            date,
            shiftName,
          },
        },
        create: {
          date,
          shiftName,
          operatorName: operatorName?.trim() || null,
          operatorId: operatorId || null,
          helperCount: Number(helperCount) || 0,
          supervisorName: supervisorName?.trim() || null,
          status,
          remarks: remarks?.trim() || null,
          totalRollMtrs: totals.totalRollMtrs,
          totalNetWtBefore: totals.totalNetWtBefore,
          avgWtBefore: totals.avgWtBefore,
          totalProductionMtrs: totals.totalProductionMtrs,
          totalNetWtAfter: totals.totalNetWtAfter,
          avgWtAfter: totals.avgWtAfter,
          avgCoating: totals.avgCoating,
        },
        update: {
          operatorName: operatorName?.trim() || null,
          operatorId: operatorId || null,
          helperCount: Number(helperCount) || 0,
          supervisorName: supervisorName?.trim() || null,
          status,
          remarks: remarks?.trim() || null,
          totalRollMtrs: totals.totalRollMtrs,
          totalNetWtBefore: totals.totalNetWtBefore,
          avgWtBefore: totals.avgWtBefore,
          totalProductionMtrs: totals.totalProductionMtrs,
          totalNetWtAfter: totals.totalNetWtAfter,
          avgWtAfter: totals.avgWtAfter,
          avgCoating: totals.avgCoating,
        },
      });

      // Delete existing entries for this report to replace with atomic latest state
      await tx.laminationProductionEntry.deleteMany({
        where: { reportId: report.id },
      });

      // Insert new entries
      if (calculatedEntries.length > 0) {
        await tx.laminationProductionEntry.createMany({
          data: calculatedEntries.map((e) => ({
            reportId: report.id,
            sequence: e.sequence,
            quality: e.quality,
            size: e.size || null,
            loomNumber: e.loomNumber,
            rollNumber: e.rollNumber,
            rollMeter: e.rollMeter,
            netWeightBefore: e.netWeightBefore,
            avgWeightBefore: e.avgWeightBefore,
            productionMeter: e.productionMeter,
            netWeightAfter: e.netWeightAfter,
            avgWeightAfter: e.avgWeightAfter,
            coating: e.coating,
            remarks: e.remarks || null,
            loomRollCuttingEntryId: e.loomRollCuttingEntryId || null,
          })),
        });
      }

      return tx.laminationProductionReport.findUnique({
        where: { id: report.id },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });
    });

    // Non-blocking audit log
    logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: `Saved Lamination Production Report for ${date} (${shiftName})`,
      payload: {
        reportId: savedReport?.id,
        date,
        shiftName,
        totalRolls: calculatedEntries.length,
        totalProductionMtrs: totals.totalProductionMtrs,
      },
      httpMethod: "POST",
      url: "/api/production/lamination/reports",
      statusCode: 200,
    }).catch(console.error);

    return NextResponse.json({ success: true, report: savedReport });
  } catch (error: any) {
    console.error("POST /api/production/lamination/reports error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save lamination production report" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
  }

  try {
    const existing = await db.laminationProductionReport.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await db.laminationProductionReport.delete({
      where: { id },
    });

    logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "WARN",
      action: `Deleted Lamination Production Report for ${existing.date} (${existing.shiftName})`,
      payload: { id, date: existing.date, shiftName: existing.shiftName },
      httpMethod: "DELETE",
      url: `/api/production/lamination/reports?id=${id}`,
      statusCode: 200,
    }).catch(console.error);

    return NextResponse.json({ success: true, message: "Report deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/production/lamination/reports error:", error);
    return NextResponse.json(
      { error: "Failed to delete lamination production report" },
      { status: 500 }
    );
  }
}
