import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePrintingApiPermission } from "@/lib/printing/permissions";
import { calculatePrintingWastage } from "@/lib/printing/printing-types";
import { logEvent } from "@/lib/logging";
import { Module } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requirePrintingApiPermission("canRead");
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
    // 1. Single report fetch by ID
    if (id) {
      const report = await db.printingWastageReport.findUnique({
        where: { id },
      });
      if (!report) {
        return NextResponse.json({ error: "Wastage report not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    // 2. Fetch by Date & Shift (includes linked Daily Production data for base production fabric kg & mtrs)
    if (date && shiftName) {
      const [report, dailyReport] = await Promise.all([
        db.printingWastageReport.findUnique({
          where: {
            date_shiftName: {
              date,
              shiftName,
            },
          },
        }),
        db.printingDailyReport.findFirst({
          where: {
            date,
            shiftName,
          },
        }),
      ]);

      const dailyReportTotals = {
        totalProductionKg: dailyReport?.totalNetWt || 0,
        totalProductionMtrs: dailyReport?.totalProductionMtrs || 0,
        totalPrintMtrs: dailyReport?.totalPrintMtrs || 0,
        operatorName: dailyReport?.operatorName || "",
        supervisorName: dailyReport?.supervisorName || "",
      };

      return NextResponse.json({
        success: true,
        report: report || null,
        dailyReportTotals,
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

    const reports = await db.printingWastageReport.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error("Error fetching printing wastage reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch printing wastage reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requirePrintingApiPermission("canWrite");
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
      supervisorName,
      totalProductionMtrs = 0,
      totalProductionKg = 0,
      laminationFabricWasteKg = 0,
      printFabricWasteKg = 0,
      status = "DRAFT",
      remarks,
    } = body;

    if (!date || !shiftName) {
      return NextResponse.json(
        { error: "Date and Shift are required" },
        { status: 400 }
      );
    }

    let prodKg = Number(totalProductionKg) || 0;
    let prodMtrs = Number(totalProductionMtrs) || 0;

    // If totalProductionKg is 0, auto-resolve from the Daily Production Report if available
    if (prodKg <= 0) {
      const dailyReport = await db.printingDailyReport.findFirst({
        where: { date, shiftName },
      });
      if (dailyReport) {
        prodKg = dailyReport.totalNetWt || 0;
        if (prodMtrs <= 0) prodMtrs = dailyReport.totalProductionMtrs || 0;
      }
    }

    const lamKg = Number(laminationFabricWasteKg) || 0;
    const printKg = Number(printFabricWasteKg) || 0;

    // Calculate percentages and totals
    const calc = calculatePrintingWastage(prodKg, lamKg, printKg);

    const savedReport = await db.printingWastageReport.upsert({
      where: {
        date_shiftName: {
          date,
          shiftName,
        },
      },
      update: {
        operatorName: operatorName?.trim() || null,
        operatorId: operatorId || null,
        supervisorName: supervisorName?.trim() || null,
        totalProductionMtrs: prodMtrs,
        totalProductionKg: prodKg,
        laminationFabricWasteKg: lamKg,
        laminationFabricWastePct: calc.laminationFabricWastePct,
        printFabricWasteKg: printKg,
        printFabricWastePct: calc.printFabricWastePct,
        totalWastageKg: calc.totalWastageKg,
        totalWastagePct: calc.totalWastagePct,
        status,
        remarks: remarks?.trim() || null,
      },
      create: {
        date,
        shiftName,
        operatorName: operatorName?.trim() || null,
        operatorId: operatorId || null,
        supervisorName: supervisorName?.trim() || null,
        totalProductionMtrs: prodMtrs,
        totalProductionKg: prodKg,
        laminationFabricWasteKg: lamKg,
        laminationFabricWastePct: calc.laminationFabricWastePct,
        printFabricWasteKg: printKg,
        printFabricWastePct: calc.printFabricWastePct,
        totalWastageKg: calc.totalWastageKg,
        totalWastagePct: calc.totalWastagePct,
        status,
        remarks: remarks?.trim() || null,
      },
    });

    logEvent({
      userId: authResult.session.user.id,
      module: "PRINTING",
      severity: "INFO",
      action: `Saved printing wastage report for ${date} (${shiftName}): Total Waste: ${calc.totalWastageKg} kg (${calc.totalWastagePct}%) on ${prodKg} kg base`,
      payload: {
        reportId: savedReport.id,
        date,
        shiftName,
        totalProductionKg: prodKg,
        totalWastageKg: calc.totalWastageKg,
        totalWastagePct: calc.totalWastagePct,
      },
    });

    return NextResponse.json({ success: true, report: savedReport });
  } catch (error: any) {
    console.error("Error saving printing wastage report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save printing wastage report" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requirePrintingApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    const existing = await db.printingWastageReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await db.printingWastageReport.delete({ where: { id } });

    logEvent({
      userId: authResult.session.user.id,
      module: "PRINTING",
      severity: "INFO",
      action: `Deleted printing wastage report for ${existing.date} (${existing.shiftName})`,
      payload: { id, date: existing.date, shiftName: existing.shiftName },
    });

    return NextResponse.json({ success: true, message: "Report deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting printing wastage report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete printing wastage report" },
      { status: 500 }
    );
  }
}
