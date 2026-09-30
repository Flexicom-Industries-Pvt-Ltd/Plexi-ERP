import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePrintingApiPermission } from "@/lib/printing/permissions";
import {
  computePrintingRawMaterialTotals,
  PrintingRawMaterialEntryItem,
} from "@/lib/printing/printing-types";
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
      const report = await db.printingRawMaterialReport.findUnique({
        where: { id },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });
      if (!report) {
        return NextResponse.json({ error: "Raw material report not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    // 2. Fetch by Date & Shift (includes linked Daily Production data for totalPrintMtrs)
    if (date && shiftName) {
      const [report, dailyReport] = await Promise.all([
        db.printingRawMaterialReport.findUnique({
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
        }),
        db.printingDailyReport.findFirst({
          where: {
            date,
            shiftName,
          },
        }),
      ]);

      const dailyReportTotals = {
        totalPrintMtrs: dailyReport?.totalPrintMtrs || 0,
        totalProductionMtrs: dailyReport?.totalProductionMtrs || 0,
        totalProductionKg: dailyReport?.totalNetWt || 0,
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

    const reports = await db.printingRawMaterialReport.findMany({
      where,
      include: {
        entries: {
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error("Error fetching printing raw material reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch printing raw material reports" },
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
      totalPrintMtrs = 0,
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

    // Check if totalPrintMtrs is provided or if we should resolve it from the Daily Production Report
    let printMtrs = Number(totalPrintMtrs) || 0;
    if (printMtrs <= 0) {
      const dailyReport = await db.printingDailyReport.findFirst({
        where: { date, shiftName },
      });
      if (dailyReport && dailyReport.totalPrintMtrs > 0) {
        printMtrs = dailyReport.totalPrintMtrs;
      }
    }

    const filteredEntries = (Array.isArray(entries) ? entries : []).filter(
      (e: any) => e && e.materialName && String(e.materialName).trim().length > 0
    );

    // Calculate totals, conversions (0.82 factor), ratios, and mileage
    const { totals, calculatedEntries } = computePrintingRawMaterialTotals(
      filteredEntries as PrintingRawMaterialEntryItem[],
      printMtrs
    );

    // Upsert the master report
    const savedReport = await db.$transaction(async (tx) => {
      const report = await tx.printingRawMaterialReport.upsert({
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
          totalPrintMtrs: totals.totalPrintMtrs,
          totalConsumedLitre: totals.totalConsumedLitre,
          totalConsumedKg: totals.totalConsumedKg,
          overallMileage: totals.overallMileage,
          status,
          remarks: remarks?.trim() || null,
        },
        create: {
          date,
          shiftName,
          operatorName: operatorName?.trim() || null,
          operatorId: operatorId || null,
          supervisorName: supervisorName?.trim() || null,
          totalPrintMtrs: totals.totalPrintMtrs,
          totalConsumedLitre: totals.totalConsumedLitre,
          totalConsumedKg: totals.totalConsumedKg,
          overallMileage: totals.overallMileage,
          status,
          remarks: remarks?.trim() || null,
        },
      });

      // Clear existing entries for fresh sync
      await tx.printingRawMaterialReportEntry.deleteMany({
        where: { reportId: report.id },
      });

      // Insert calculated entries
      if (calculatedEntries.length > 0) {
        await tx.printingRawMaterialReportEntry.createMany({
          data: calculatedEntries.map((e, index) => ({
            reportId: report.id,
            rawMaterialId: e.rawMaterialId || null,
            materialName: String(e.materialName || "").trim(),
            unit: (e.unit || "LITRE").toUpperCase(),
            consumedLitre: Number(e.consumedLitre) || 0,
            conversionFactor: Number(e.conversionFactor) || 0.82,
            consumedKg: Number(e.consumedKg) || 0,
            ratioPercent: Number(e.ratioPercent) || 0,
            mileage: Number(e.mileage) || 0,
            sequence: index + 1,
            remarks: e.remarks?.trim() || null,
          })),
        });
      }

      return tx.printingRawMaterialReport.findUnique({
        where: { id: report.id },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });
    });

    logEvent({
      userId: authResult.session.user.id,
      action: `Saved printing raw material report for ${date} (${shiftName}): Total Kg: ${totals.totalConsumedKg}`,
      module: "PRINTING",
      severity: "INFO",
      payload: {
        reportId: savedReport?.id,
        date,
        shiftName,
        totalPrintMtrs: totals.totalPrintMtrs,
        totalConsumedKg: totals.totalConsumedKg,
        overallMileage: totals.overallMileage,
        entriesCount: calculatedEntries.length,
      },
    });

    return NextResponse.json({ success: true, report: savedReport });
  } catch (error: any) {
    console.error("Error saving printing raw material report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save printing raw material report" },
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

    const existing = await db.printingRawMaterialReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    await db.printingRawMaterialReport.delete({ where: { id } });

    logEvent({
      userId: authResult.session.user.id,
      action: `Deleted printing raw material report for ${existing.date} (${existing.shiftName})`,
      module: "PRINTING",
      severity: "INFO",
      payload: { id, date: existing.date, shiftName: existing.shiftName },
    });

    return NextResponse.json({ success: true, message: "Report deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting printing raw material report:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete printing raw material report" },
      { status: 500 }
    );
  }
}
