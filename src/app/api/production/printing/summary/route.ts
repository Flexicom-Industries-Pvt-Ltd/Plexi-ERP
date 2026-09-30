import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePrintingApiPermission } from "@/lib/printing/permissions";
import {
  CustomerPrintingSummaryItem,
  QualityPrintingSummaryItem,
  ShiftPrintingHistoryItem,
  PrintingProductionSummaryResult,
} from "@/lib/printing/printing-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requirePrintingApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const shiftName = searchParams.get("shiftName");
  const companyFilter = searchParams.get("companyName")?.trim().toLowerCase();
  const qualityFilter = searchParams.get("quality")?.trim().toLowerCase();

  try {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }
    if (shiftName && shiftName !== "ALL") {
      where.shiftName = shiftName;
    }

    const reports = await db.printingDailyReport.findMany({
      where,
      include: {
        entries: {
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    let overallTotalReports = reports.length;
    let overallTotalRolls = 0;
    let overallTargetMtrs = 0;
    let overallProductionMtrs = 0;
    let overallNetWeightKg = 0;
    let overallPrintMtrs = 0;
    let totalGsmSum = 0;
    let gsmCount = 0;

    const customerMap = new Map<string, CustomerPrintingSummaryItem>();
    const qualityMap = new Map<string, QualityPrintingSummaryItem>();
    const historyList: ShiftPrintingHistoryItem[] = [];

    for (const report of reports) {
      const reportTargetMtrs = report.entries.reduce(
        (acc, e) => acc + (Number(e.targetProductionMtrs) || 0),
        0
      );
      overallTotalRolls += report.totalRolls || 0;
      overallTargetMtrs += reportTargetMtrs;
      overallProductionMtrs += report.totalProductionMtrs || 0;
      overallNetWeightKg += report.totalNetWt || 0;
      overallPrintMtrs += report.totalPrintMtrs || 0;

      const varianceMtrs = Math.round((report.totalPrintMtrs - reportTargetMtrs) * 10) / 10;
      const efficiency =
        reportTargetMtrs > 0
          ? Math.round(((report.totalPrintMtrs / reportTargetMtrs) * 100) * 10) / 10
          : 100;

      historyList.push({
        id: report.id,
        date: report.date,
        shiftName: report.shiftName,
        operatorName: report.operatorName || undefined,
        supervisorName: report.supervisorName || undefined,
        totalRolls: report.totalRolls,
        productionMtrs: report.totalProductionMtrs,
        printMtrs: report.totalPrintMtrs,
        varianceMtrs,
        efficiencyPercent: efficiency,
        status: report.status,
      });

      for (const entry of report.entries) {
        const cName = (entry.companyName || "Unknown Customer").trim();
        const uName = (entry.unitName || "").trim();
        const qName = (entry.quality || "Standard Quality").trim();

        if (companyFilter && !cName.toLowerCase().includes(companyFilter)) {
          continue;
        }
        if (qualityFilter && !qName.toLowerCase().includes(qualityFilter)) {
          continue;
        }

        const gsm = Number(entry.avgWeight) || 0;
        if (gsm > 0) {
          totalGsmSum += gsm;
          gsmCount += 1;
        }

        const targetM = Number(entry.targetProductionMtrs) || 0;
        const printM = Number(entry.printMeter) || 0;
        const prodM = Number(entry.productionMeter) || 0;
        const netW = Number(entry.netWeight) || 0;

        // Customer aggregation key: Company + Unit
        const custKey = `${cName}:::${uName}`;
        const existingCust = customerMap.get(custKey);
        if (existingCust) {
          existingCust.totalRolls += 1;
          existingCust.targetMtrs += targetM;
          existingCust.printMtrs += printM;
          existingCust.productionMtrs += prodM;
          existingCust.netWeightKg += netW;
          if (gsm > 0) {
            existingCust.avgGsm = Math.round(((existingCust.avgGsm + gsm) / 2) * 10) / 10;
          }
        } else {
          customerMap.set(custKey, {
            companyName: cName,
            unitName: uName,
            totalRolls: 1,
            targetMtrs: targetM,
            printMtrs: printM,
            productionMtrs: prodM,
            netWeightKg: netW,
            avgGsm: gsm,
            sharePercent: 0,
          });
        }

        // Quality aggregation key: Quality name
        const qualKey = qName;
        const existingQual = qualityMap.get(qualKey);
        if (existingQual) {
          existingQual.totalRolls += 1;
          existingQual.printMtrs += printM;
          existingQual.productionMtrs += prodM;
          existingQual.netWeightKg += netW;
          if (gsm > 0) {
            existingQual.avgGsm = Math.round(((existingQual.avgGsm + gsm) / 2) * 10) / 10;
          }
        } else {
          qualityMap.set(qualKey, {
            quality: qName,
            totalRolls: 1,
            printMtrs: printM,
            productionMtrs: prodM,
            netWeightKg: netW,
            avgGsm: gsm,
            sharePercent: 0,
          });
        }
      }
    }

    // Compute Customer share percentages
    const customers = Array.from(customerMap.values())
      .map((c) => ({
        ...c,
        targetMtrs: Math.round(c.targetMtrs),
        printMtrs: Math.round(c.printMtrs),
        productionMtrs: Math.round(c.productionMtrs),
        netWeightKg: Math.round(c.netWeightKg * 10) / 10,
        sharePercent:
          overallPrintMtrs > 0
            ? Math.round(((c.printMtrs / overallPrintMtrs) * 100) * 10) / 10
            : 0,
      }))
      .sort((a, b) => b.printMtrs - a.printMtrs);

    // Compute Quality share percentages
    const qualities = Array.from(qualityMap.values())
      .map((q) => ({
        ...q,
        printMtrs: Math.round(q.printMtrs),
        productionMtrs: Math.round(q.productionMtrs),
        netWeightKg: Math.round(q.netWeightKg * 10) / 10,
        sharePercent:
          overallPrintMtrs > 0
            ? Math.round(((q.printMtrs / overallPrintMtrs) * 100) * 10) / 10
            : 0,
      }))
      .sort((a, b) => b.printMtrs - a.printMtrs);

    const overallEfficiency =
      overallTargetMtrs > 0
        ? Math.round(((overallPrintMtrs / overallTargetMtrs) * 100) * 10) / 10
        : 100;
    const overallAvgGsm =
      gsmCount > 0 ? Math.round((totalGsmSum / gsmCount) * 10) / 10 : 0;

    const summaryResult: PrintingProductionSummaryResult = {
      startDate: dateFrom || (reports.length > 0 ? reports[reports.length - 1].date : ""),
      endDate: dateTo || (reports.length > 0 ? reports[0].date : ""),
      overall: {
        totalReports: overallTotalReports,
        totalRolls: overallTotalRolls,
        totalTargetMtrs: Math.round(overallTargetMtrs),
        totalProductionMtrs: Math.round(overallProductionMtrs),
        totalNetWeightKg: Math.round(overallNetWeightKg * 10) / 10,
        avgGsm: overallAvgGsm,
        totalPrintMtrs: Math.round(overallPrintMtrs),
        varianceMtrs: Math.round((overallPrintMtrs - overallTargetMtrs) * 10) / 10,
        overallEfficiency,
      },
      customers,
      qualities,
      history: historyList,
    };

    return NextResponse.json({ success: true, summary: summaryResult });
  } catch (error: any) {
    console.error("Error generating printing production summary:", error);
    return NextResponse.json(
      { error: "Failed to generate printing production summary" },
      { status: 500 }
    );
  }
}
