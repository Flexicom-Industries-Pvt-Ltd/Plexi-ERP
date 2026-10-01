import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireValvomaticApiPermission } from "@/lib/valvomatic/permissions";
import {
  ValvomaticQualitySummaryItem,
  ValvomaticWastageBreakdown,
  ValvomaticSummaryResult,
} from "@/lib/valvomatic/valvomatic-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireValvomaticApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const shiftName = searchParams.get("shiftName");
  const machineNo = searchParams.get("machineNo");
  const qualityFilter = searchParams.get("quality")?.trim().toLowerCase();

  try {
    const whereDaily: any = {};
    const whereWastage: any = {};

    if (dateFrom || dateTo) {
      const dateFilter = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
      whereDaily.date = dateFilter;
      whereWastage.date = dateFilter;
    }

    if (shiftName && shiftName !== "ALL") {
      whereDaily.shiftName = shiftName;
      whereWastage.shiftName = shiftName;
    }

    if (machineNo && machineNo !== "ALL") {
      whereDaily.machineNo = machineNo;
      whereWastage.machineNo = machineNo;
    }

    const [dailyReports, wastageReports] = await Promise.all([
      db.valvomaticDailyReport.findMany({
        where: whereDaily,
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      db.valvomaticWastageReport.findMany({
        where: whereWastage,
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    // Wastage accumulator by roll number and quality
    const rollWastageMap = new Map<
      string,
      {
        totalWasteKg: number;
        loomWasteKg: number;
        lamWasteKg: number;
        printWasteKg: number;
        machineWasteKg: number;
        coverPatchWasteKg: number;
      }
    >();

    let totalLoomWasteKg = 0;
    let totalLamWasteKg = 0;
    let totalPrintWasteKg = 0;
    let totalMachineWasteKg = 0;
    let totalCoverPatchWasteKg = 0;
    let totalWastageKg = 0;

    for (const wReport of wastageReports) {
      for (const wEntry of wReport.entries) {
        totalLoomWasteKg += Number(wEntry.loomWasteKg) || 0;
        totalLamWasteKg += Number(wEntry.lamWasteKg) || 0;
        totalPrintWasteKg += Number(wEntry.printWasteKg) || 0;
        totalMachineWasteKg += Number(wEntry.machineWasteKg) || 0;
        totalCoverPatchWasteKg += Number(wEntry.coverPatchWasteKg) || 0;
        totalWastageKg += Number(wEntry.totalWasteKg) || 0;

        const key = (wEntry.rollNumber || "").trim().toLowerCase();
        if (key) {
          const current = rollWastageMap.get(key) || {
            totalWasteKg: 0,
            loomWasteKg: 0,
            lamWasteKg: 0,
            printWasteKg: 0,
            machineWasteKg: 0,
            coverPatchWasteKg: 0,
          };
          current.totalWasteKg += Number(wEntry.totalWasteKg) || 0;
          current.loomWasteKg += Number(wEntry.loomWasteKg) || 0;
          current.lamWasteKg += Number(wEntry.lamWasteKg) || 0;
          current.printWasteKg += Number(wEntry.printWasteKg) || 0;
          current.machineWasteKg += Number(wEntry.machineWasteKg) || 0;
          current.coverPatchWasteKg += Number(wEntry.coverPatchWasteKg) || 0;
          rollWastageMap.set(key, current);
        }
      }
    }

    // Quality aggregations
    const qualityMap = new Map<
      string,
      {
        quality: string;
        rollsCount: number;
        totalRollMtr: number;
        totalNetWt: number;
        productionPcs: number;
        productionKg: number;
        coverPatchOs: number;
        coverPatchDs: number;
        valvePatch: number;
        totalWasteKg: number;
      }
    >();

    let overallTotalReports = dailyReports.length;
    let overallTotalRolls = 0;
    let overallTotalRollMtr = 0;
    let overallTotalNetWt = 0;
    let overallProductionPcs = 0;
    let overallProductionKg = 0;
    let overallCoverPatchOs = 0;
    let overallCoverPatchDs = 0;
    let overallValvePatch = 0;

    for (const report of dailyReports) {
      overallTotalRolls += report.totalRolls || 0;
      overallTotalRollMtr += report.totalRollMtr || 0;
      overallTotalNetWt += report.totalNetWt || 0;
      overallProductionPcs += report.totalProductionPcs || 0;
      overallProductionKg += report.totalProductionKg || 0;
      overallCoverPatchOs += report.totalCoverPatchOs || 0;
      overallCoverPatchDs += report.totalCoverPatchDs || 0;
      overallValvePatch += report.totalValvePatch || 0;

      for (const entry of report.entries) {
        const qName = (entry.quality || entry.partyName || "Standard Quality").trim();

        if (qualityFilter && !qName.toLowerCase().includes(qualityFilter)) {
          continue;
        }

        const current = qualityMap.get(qName) || {
          quality: qName,
          rollsCount: 0,
          totalRollMtr: 0,
          totalNetWt: 0,
          productionPcs: 0,
          productionKg: 0,
          coverPatchOs: 0,
          coverPatchDs: 0,
          valvePatch: 0,
          totalWasteKg: 0,
        };

        if (entry.rollNumber && entry.rollNumber.trim()) {
          current.rollsCount += 1;
        }
        current.totalRollMtr += Number(entry.rollMtr) || 0;
        current.totalNetWt += Number(entry.netWeight) || 0;
        current.productionPcs += Number(entry.productionPcs) || 0;
        current.productionKg += Number(entry.productionKg) || 0;
        current.coverPatchOs += Number(entry.coverPatchOs) || 0;
        current.coverPatchDs += Number(entry.coverPatchDs) || 0;
        current.valvePatch += Number(entry.valvePatch) || 0;

        const rollKey = (entry.rollNumber || "").trim().toLowerCase();
        if (rollKey && rollWastageMap.has(rollKey)) {
          current.totalWasteKg += rollWastageMap.get(rollKey)!.totalWasteKg;
        }

        qualityMap.set(qName, current);
      }
    }

    const qualitySummary: ValvomaticQualitySummaryItem[] = Array.from(qualityMap.values()).map(
      (q) => {
        const avgGsm = q.totalRollMtr > 0 ? (q.totalNetWt / q.totalRollMtr) * 1000 : 0;
        const totalWastePct =
          q.productionKg > 0 ? (q.totalWasteKg / q.productionKg) * 100 : 0;
        const netProductionKg = Math.max(0, q.productionKg - q.totalWasteKg);

        return {
          quality: q.quality,
          rollsCount: q.rollsCount,
          totalRollMtr: Math.round(q.totalRollMtr * 100) / 100,
          totalNetWt: Math.round(q.totalNetWt * 100) / 100,
          avgGsm: Math.round(avgGsm * 100) / 100,
          productionPcs: Math.round(q.productionPcs),
          productionKg: Math.round(q.productionKg * 100) / 100,
          coverPatchOs: Math.round(q.coverPatchOs * 100) / 100,
          coverPatchDs: Math.round(q.coverPatchDs * 100) / 100,
          valvePatch: Math.round(q.valvePatch * 100) / 100,
          totalWasteKg: Math.round(q.totalWasteKg * 100) / 100,
          totalWastePct: Math.round(totalWastePct * 100) / 100,
          netProductionKg: Math.round(netProductionKg * 100) / 100,
        };
      }
    );

    qualitySummary.sort((a, b) => b.productionKg - a.productionKg);

    const baseProdKg = overallProductionKg > 0 ? overallProductionKg : 1;
    const wastageBreakdown: ValvomaticWastageBreakdown = {
      loomWasteKg: Math.round(totalLoomWasteKg * 100) / 100,
      loomWastePct: Math.round((totalLoomWasteKg / baseProdKg) * 10000) / 100,
      lamWasteKg: Math.round(totalLamWasteKg * 100) / 100,
      lamWastePct: Math.round((totalLamWasteKg / baseProdKg) * 10000) / 100,
      printWasteKg: Math.round(totalPrintWasteKg * 100) / 100,
      printWastePct: Math.round((totalPrintWasteKg / baseProdKg) * 10000) / 100,
      machineWasteKg: Math.round(totalMachineWasteKg * 100) / 100,
      machineWastePct: Math.round((totalMachineWasteKg / baseProdKg) * 10000) / 100,
      coverPatchWasteKg: Math.round(totalCoverPatchWasteKg * 100) / 100,
      coverPatchWastePct: Math.round((totalCoverPatchWasteKg / baseProdKg) * 10000) / 100,
      totalWasteKg: Math.round(totalWastageKg * 100) / 100,
      totalWastePct: Math.round((totalWastageKg / baseProdKg) * 10000) / 100,
    };

    const overallAvgGsm =
      overallTotalRollMtr > 0 ? (overallTotalNetWt / overallTotalRollMtr) * 1000 : 0;
    const overallNetProductionKg = Math.max(0, overallProductionKg - totalWastageKg);

    const result: ValvomaticSummaryResult = {
      qualities: qualitySummary,
      wastage: wastageBreakdown,
      overall: {
        totalReports: overallTotalReports,
        totalRolls: overallTotalRolls,
        totalRollMtr: Math.round(overallTotalRollMtr * 100) / 100,
        totalNetWt: Math.round(overallTotalNetWt * 100) / 100,
        avgGsm: Math.round(overallAvgGsm * 100) / 100,
        totalProductionPcs: Math.round(overallProductionPcs),
        totalProductionKg: Math.round(overallProductionKg * 100) / 100,
        totalCoverPatchOs: Math.round(overallCoverPatchOs * 100) / 100,
        totalCoverPatchDs: Math.round(overallCoverPatchDs * 100) / 100,
        totalValvePatch: Math.round(overallValvePatch * 100) / 100,
        totalWastageKg: Math.round(totalWastageKg * 100) / 100,
        totalWastagePct:
          overallProductionKg > 0
            ? Math.round((totalWastageKg / overallProductionKg) * 10000) / 100
            : 0,
        totalNetProductionKg: Math.round(overallNetProductionKg * 100) / 100,
      },
    };

    return NextResponse.json({ success: true, summary: result });
  } catch (error: any) {
    console.error("GET /api/production/valvomatic/summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate Valvomatic production summary" },
      { status: 500 }
    );
  }
}
