import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireConvertexApiPermission } from "@/lib/convertex/permissions";
import {
  calculateConvertexRow,
  computeConvertexTotals,
  ConvertexReportItem,
} from "@/lib/convertex/convertex-types";
import { logEvent } from "@/lib/logging";

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
    // 1. Single report fetch by ID
    if (id) {
      const report = await db.convertexDailyReport.findUnique({
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

    // 2. Single report fetch by Date, Shift, and Machine
    if (date && shiftName) {
      const report = await db.convertexDailyReport.findUnique({
        where: {
          date_shiftName_machineNo: {
            date,
            shiftName,
            machineNo,
          },
        },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });

      // Calculate MTD wastage up to this date
      const monthStart = date.slice(0, 7) + "-01";
      const mtdRecords = await db.convertexDailyReport.findMany({
        where: {
          date: { gte: monthStart, lte: date },
          machineNo,
        },
        select: { totalWastageKg: true },
      });
      const calculatedMtdWastageKg = mtdRecords.reduce((acc, r) => acc + (r.totalWastageKg || 0), 0);

      return NextResponse.json({
        success: true,
        report: report || null,
        calculatedMtdWastageKg,
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

    const reports = await db.convertexDailyReport.findMany({
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
    console.error("GET /api/production/convertex/reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Convertex production reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireConvertexApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      date,
      shiftName,
      machineNo = "Convertex-1",
      companyName = "FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA",
      unitName = "Unit-1",
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

    // Calculate month-to-date wastage
    const monthStart = date.slice(0, 7) + "-01";
    const priorMtdRecords = await db.convertexDailyReport.findMany({
      where: {
        date: { gte: monthStart, lt: date },
        machineNo,
      },
      select: { totalWastageKg: true },
    });
    const priorMtdKg = priorMtdRecords.reduce((acc, r) => acc + (r.totalWastageKg || 0), 0);

    // Recalculate row metrics
    let runningShiftWaste = 0;
    const calculatedEntries: ConvertexReportItem[] = entries.map((entry: any, index: number) => {
      const row = calculateConvertexRow({
        ...entry,
        sequence: index + 1,
      });
      runningShiftWaste += row.totalWastageKg;
      row.totalWastageMtdKg = Math.round((priorMtdKg + runningShiftWaste) * 100) / 100;
      return row;
    });

    const totals = computeConvertexTotals(calculatedEntries);
    const finalMtdKg = Math.round((priorMtdKg + totals.totalWastageKg) * 100) / 100;

    const savedReport = await db.$transaction(async (tx) => {
      // Upsert report header
      const report = await tx.convertexDailyReport.upsert({
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
          companyName: companyName?.trim() || "FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA",
          unitName: unitName?.trim() || "Unit-1",
          operatorName: operatorName?.trim() || null,
          operatorId: operatorId || null,
          supervisorName: supervisorName?.trim() || null,
          status,
          remarks: remarks?.trim() || null,
          totalRolls: totals.totalRolls,
          totalRollMtr: totals.totalRollMtr,
          totalNetWt: totals.totalNetWt,
          avgWeightGsm: totals.avgWeightGsm,
          totalProductionPcs: totals.totalProductionPcs,
          totalTargetPcs: totals.totalTargetPcs,
          totalLoomWasteKg: totals.totalLoomWasteKg,
          totalLamWasteKg: totals.totalLamWasteKg,
          totalPrintWasteKg: totals.totalPrintWasteKg,
          totalMachineWasteKg: totals.totalMachineWasteKg,
          totalWastageKg: totals.totalWastageKg,
          totalWastagePct: totals.totalWastagePct,
          totalWastageMtdKg: finalMtdKg,
        },
        update: {
          companyName: companyName?.trim() || "FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA",
          unitName: unitName?.trim() || "Unit-1",
          operatorName: operatorName?.trim() || null,
          operatorId: operatorId || null,
          supervisorName: supervisorName?.trim() || null,
          status,
          remarks: remarks?.trim() || null,
          totalRolls: totals.totalRolls,
          totalRollMtr: totals.totalRollMtr,
          totalNetWt: totals.totalNetWt,
          avgWeightGsm: totals.avgWeightGsm,
          totalProductionPcs: totals.totalProductionPcs,
          totalTargetPcs: totals.totalTargetPcs,
          totalLoomWasteKg: totals.totalLoomWasteKg,
          totalLamWasteKg: totals.totalLamWasteKg,
          totalPrintWasteKg: totals.totalPrintWasteKg,
          totalMachineWasteKg: totals.totalMachineWasteKg,
          totalWastageKg: totals.totalWastageKg,
          totalWastagePct: totals.totalWastagePct,
          totalWastageMtdKg: finalMtdKg,
        },
      });

      // Clear existing entries and recreate atomically
      await tx.convertexDailyReportEntry.deleteMany({
        where: { reportId: report.id },
      });

      if (calculatedEntries.length > 0) {
        await tx.convertexDailyReportEntry.createMany({
          data: calculatedEntries.map((e) => ({
            reportId: report.id,
            sequence: e.sequence,
            companyName: e.companyName?.trim() || null,
            unitName: e.unitName?.trim() || null,
            grade: e.grade?.trim() || null,
            targetProductionPcs: e.targetProductionPcs || null,
            partyName: e.partyName?.trim() || null,
            rollNumber: e.rollNumber.trim(),
            loomNumber: e.loomNumber?.trim() || null,
            rollMtr: e.rollMtr,
            netWeight: e.netWeight,
            avgWeight: e.avgWeight,
            openingMeterReading: e.openingMeterReading,
            closingMeterReading: e.closingMeterReading,
            productionPcs: e.productionPcs,
            loomFabricWasteKg: e.loomFabricWasteKg,
            lamFabricWasteKg: e.lamFabricWasteKg,
            printFabricWasteKg: e.printFabricWasteKg,
            machineWasteKg: e.machineWasteKg,
            totalWastageKg: e.totalWastageKg,
            totalWastagePct: e.totalWastagePct,
            totalWastageMtdKg: e.totalWastageMtdKg || finalMtdKg,
            remarks: e.remarks?.trim() || null,
          })),
        });
      }

      return tx.convertexDailyReport.findUnique({
        where: { id: report.id },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });
    });

    // Comprehensive logging
    logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: `${status === "SUBMITTED" ? "Submitted" : "Saved"} Convertex daily production report for ${date} (${shiftName}, ${machineNo}) with ${calculatedEntries.length} rolls`,
      payload: {
        reportId: savedReport?.id,
        date,
        shiftName,
        machineNo,
        status,
        totalRolls: totals.totalRolls,
        totalProductionPcs: totals.totalProductionPcs,
        totalWastageKg: totals.totalWastageKg,
      },
      httpMethod: "POST",
      url: "/api/production/convertex/reports",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      report: savedReport,
    });
  } catch (error: any) {
    console.error("POST /api/production/convertex/reports error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save Convertex daily production report" },
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
    const report = await db.convertexDailyReport.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status === "APPROVED") {
      return NextResponse.json(
        { error: "Cannot delete an approved production report" },
        { status: 400 }
      );
    }

    await db.convertexDailyReport.delete({
      where: { id },
    });

    logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: `Deleted Convertex daily report ${id} (${report.date} - ${report.shiftName})`,
      payload: { reportId: id, date: report.date, shiftName: report.shiftName },
      httpMethod: "DELETE",
      url: "/api/production/convertex/reports",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Report deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/production/convertex/reports error:", error);
    return NextResponse.json(
      { error: "Failed to delete Convertex report" },
      { status: 500 }
    );
  }
}
