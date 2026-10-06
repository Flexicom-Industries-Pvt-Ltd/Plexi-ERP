import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireConvertexApiPermission } from "@/lib/convertex/permissions";
import {
  calculateConvertexWastageRow,
  computeConvertexWastageTotals,
  ConvertexWastageEntryItem,
} from "@/lib/convertex/convertex-types";
import { logEvent } from "@/lib/logging";
import { withResourceLock } from "@/lib/concurrency-lock";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireConvertexApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const date = searchParams.get("date");
  const shiftName = searchParams.get("shiftName");
  const machineNo = searchParams.get("machineNo") || "Convertex-1";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  try {
    // 1. Single fetch by ID
    if (id) {
      const report = await db.convertexWastageReport.findUnique({
        where: { id },
        include: {
          entries: { orderBy: { sequence: "asc" } },
        },
      });
      if (!report) {
        return NextResponse.json({ error: "Wastage report not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    // 2. Fetch by Date, Shift, and Machine (also brings linked Daily Production data)
    if (date && shiftName) {
      const [existingWastageReport, dailyProductionReport] = await Promise.all([
        db.convertexWastageReport.findUnique({
          where: {
            date_shiftName_machineNo: {
              date,
              shiftName,
              machineNo,
            },
          },
          include: {
            entries: { orderBy: { sequence: "asc" } },
          },
        }),
        db.convertexDailyReport.findUnique({
          where: {
            date_shiftName_machineNo: {
              date,
              shiftName,
              machineNo,
            },
          },
          include: {
            entries: { orderBy: { sequence: "asc" } },
          },
        }),
      ]);

      const linkedProductionRows = (dailyProductionReport?.entries || []).map((e) => ({
        quality: e.quality || e.partyName || "",
        rollNumber: e.rollNumber,
        productionKg: e.productionKg || 0,
      }));

      return NextResponse.json({
        success: true,
        report: existingWastageReport || null,
        linkedProduction: {
          reportId: dailyProductionReport?.id || null,
          operatorName: dailyProductionReport?.operatorName || "",
          supervisorName: dailyProductionReport?.supervisorName || "",
          totalProductionKg: dailyProductionReport?.totalProductionKg || 0,
          entries: linkedProductionRows,
        },
      });
    }

    // 3. List reports with filters
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
    if (machineNo && machineNo !== "ALL") {
      where.machineNo = machineNo;
    }

    const reports = await db.convertexWastageReport.findMany({
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
    console.error("GET /api/production/convertex/wastage error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Convertex wastage report" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireConvertexApiPermission("canWrite");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      date,
      shiftName,
      machineNo = "Convertex-1",
      operatorName,
      operatorId,
      supervisorName,
      status = "DRAFT",
      remarks,
      entries = [],
    } = body;

    if (!date || !shiftName) {
      return NextResponse.json({ error: "Date and Shift are required" }, { status: 400 });
    }

    // Filter valid rows
    const hasRowContent = (e: any) =>
      Boolean(
        (e.quality && String(e.quality).trim()) ||
        (e.rollNumber && String(e.rollNumber).trim()) ||
        Number(e.productionKg) > 0 ||
        Number(e.loomWasteKg) > 0 ||
        Number(e.lamWasteKg) > 0 ||
        Number(e.printWasteKg) > 0 ||
        Number(e.machineWasteKg) > 0 ||
        Number(e.coverPatchWasteKg) > 0 ||
        (e.remarks && String(e.remarks).trim())
      );

    const validEntries = Array.isArray(entries) ? entries.filter(hasRowContent) : [];

    // Recalculate metrics per row
    const calculatedEntries: ConvertexWastageEntryItem[] = validEntries.map(
      (entry: any, index: number) => {
        return calculateConvertexWastageRow({
          ...entry,
          sequence: index + 1,
        });
      }
    );

    const totals = computeConvertexWastageTotals(calculatedEntries);

    const lockKey = `convertex_wastage:${date}:${shiftName}:${machineNo}`;
    const savedReport = await withResourceLock(lockKey, async () => {
      return await db.$transaction(async (tx) => {
      const report = await tx.convertexWastageReport.upsert({
        where: {
          date_shiftName_machineNo: {
            date,
            shiftName,
            machineNo,
          },
        },
        create: {
          date,
          shiftName,
          machineNo,
          operatorName: operatorName?.trim() || null,
          operatorId: operatorId || null,
          supervisorName: supervisorName?.trim() || null,
          status,
          remarks: remarks?.trim() || null,
          totalProductionKg: totals.totalProductionKg,
          totalLoomWasteKg: totals.totalLoomWasteKg,
          totalLoomWastePct: totals.totalLoomWastePct,
          totalLamWasteKg: totals.totalLamWasteKg,
          totalLamWastePct: totals.totalLamWastePct,
          totalPrintWasteKg: totals.totalPrintWasteKg,
          totalPrintWastePct: totals.totalPrintWastePct,
          totalMachineWasteKg: totals.totalMachineWasteKg,
          totalMachineWastePct: totals.totalMachineWastePct,
          totalCoverPatchWasteKg: totals.totalCoverPatchWasteKg,
          totalCoverPatchWastePct: totals.totalCoverPatchWastePct,
          totalWastageKg: totals.totalWastageKg,
          totalWastagePct: totals.totalWastagePct,
          totalNetProductionKg: totals.totalNetProductionKg,
        },
        update: {
          operatorName: operatorName?.trim() || null,
          operatorId: operatorId || null,
          supervisorName: supervisorName?.trim() || null,
          status,
          remarks: remarks?.trim() || null,
          totalProductionKg: totals.totalProductionKg,
          totalLoomWasteKg: totals.totalLoomWasteKg,
          totalLoomWastePct: totals.totalLoomWastePct,
          totalLamWasteKg: totals.totalLamWasteKg,
          totalLamWastePct: totals.totalLamWastePct,
          totalPrintWasteKg: totals.totalPrintWasteKg,
          totalPrintWastePct: totals.totalPrintWastePct,
          totalMachineWasteKg: totals.totalMachineWasteKg,
          totalMachineWastePct: totals.totalMachineWastePct,
          totalCoverPatchWasteKg: totals.totalCoverPatchWasteKg,
          totalCoverPatchWastePct: totals.totalCoverPatchWastePct,
          totalWastageKg: totals.totalWastageKg,
          totalWastagePct: totals.totalWastagePct,
          totalNetProductionKg: totals.totalNetProductionKg,
        },
      });

      // Clear existing entries and recreate atomically
      await tx.convertexWastageReportEntry.deleteMany({
        where: { reportId: report.id },
      });

      if (calculatedEntries.length > 0) {
        await tx.convertexWastageReportEntry.createMany({
          data: calculatedEntries.map((e) => ({
            reportId: report.id,
            sequence: e.sequence,
            quality: e.quality || "Standard",
            rollNumber: e.rollNumber || "",
            productionKg: Number(e.productionKg) || 0,
            loomWasteKg: Number(e.loomWasteKg) || 0,
            loomWastePct: Number(e.loomWastePct) || 0,
            lamWasteKg: Number(e.lamWasteKg) || 0,
            lamWastePct: Number(e.lamWastePct) || 0,
            printWasteKg: Number(e.printWasteKg) || 0,
            printWastePct: Number(e.printWastePct) || 0,
            machineWasteKg: Number(e.machineWasteKg) || 0,
            machineWastePct: Number(e.machineWastePct) || 0,
            coverPatchWasteKg: Number(e.coverPatchWasteKg) || 0,
            coverPatchWastePct: Number(e.coverPatchWastePct) || 0,
            totalWasteKg: Number(e.totalWasteKg) || 0,
            totalWastePct: Number(e.totalWastePct) || 0,
            netProductionKg: Number(e.netProductionKg) || 0,
            remarks: e.remarks?.trim() || null,
          })),
        });
      }

      return tx.convertexWastageReport.findUnique({
        where: { id: report.id },
        include: {
          entries: { orderBy: { sequence: "asc" } },
        },
      });
    });
  });

    logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: `${status === "SUBMITTED" ? "Submitted" : "Saved"} Convertex wastage report for ${date} (${shiftName}, ${machineNo}): Total waste ${totals.totalWastageKg} kg (${totals.totalWastagePct}%) on ${totals.totalProductionKg} kg production`,
      payload: {
        reportId: savedReport?.id,
        date,
        shiftName,
        machineNo,
        status,
        totalProductionKg: totals.totalProductionKg,
        totalWastageKg: totals.totalWastageKg,
        totalNetProductionKg: totals.totalNetProductionKg,
      },
      httpMethod: "POST",
      url: "/api/production/convertex/wastage",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      report: savedReport,
    });
  } catch (error: any) {
    console.error("POST /api/production/convertex/wastage error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save Convertex wastage report" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireConvertexApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Report ID required" }, { status: 400 });
  }

  try {
    const report = await db.convertexWastageReport.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status === "APPROVED") {
      return NextResponse.json(
        { error: "Cannot delete an approved wastage report" },
        { status: 400 }
      );
    }

    await db.convertexWastageReport.delete({ where: { id } });

    logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: `Deleted Convertex wastage report ${id} (${report.date} - ${report.shiftName})`,
      payload: { reportId: id, date: report.date, shiftName: report.shiftName },
      httpMethod: "DELETE",
      url: "/api/production/convertex/wastage",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Report deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/production/convertex/wastage error:", error);
    return NextResponse.json(
      { error: "Failed to delete Convertex wastage report" },
      { status: 500 }
    );
  }
}
