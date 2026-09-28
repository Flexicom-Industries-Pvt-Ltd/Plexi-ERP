import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.PRODUCTION, Module.DATA_CENTRE, Module.SETTINGS],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const todayStr = new Date().toISOString().slice(0, 10);
  const startDate = searchParams.get("startDate")?.trim() || todayStr;
  const endDate = searchParams.get("endDate")?.trim() || startDate;
  const shiftName = searchParams.get("shiftName")?.trim() || "ALL";
  const loomNumberParam = searchParams.get("loomNumber")?.trim();
  const targetLoomNumber = loomNumberParam && loomNumberParam !== "ALL" ? Number(loomNumberParam) : null;
  const supervisorParam = searchParams.get("supervisorName")?.trim();
  const targetSupervisor = supervisorParam && supervisorParam !== "ALL" ? supervisorParam : null;
  const operatorParam = searchParams.get("operatorName")?.trim();
  const targetOperator = operatorParam && operatorParam !== "ALL" ? operatorParam : null;

  try {
    // 1. Fetch Roll Cutting Reports & Entries in date range
    const rollReportWhere: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (shiftName !== "ALL") {
      rollReportWhere.shiftName = { contains: shiftName, mode: "insensitive" };
    }
    if (targetSupervisor) {
      rollReportWhere.OR = [
        { supervisorName: { contains: targetSupervisor, mode: "insensitive" } },
        { entries: { some: { supervisorSign: { contains: targetSupervisor, mode: "insensitive" } } } },
      ];
    }

    // 2. Fetch Reading Sheets & Entries in date range
    const readingSheetWhere: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (shiftName !== "ALL") {
      readingSheetWhere.shiftName = { contains: shiftName, mode: "insensitive" };
    }
    if (targetOperator) {
      readingSheetWhere.entries = {
        some: { operatorName: { contains: targetOperator, mode: "insensitive" } },
      };
    }

    const [rollReports, readingSheets, allSupervisors, allOperators, activeShifts] = await Promise.all([
      db.loomRollCuttingReport.findMany({
        where: rollReportWhere,
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
        orderBy: [{ date: "asc" }, { shiftName: "asc" }],
      }),
      db.loomReadingSheet.findMany({
        where: readingSheetWhere,
        include: {
          entries: true,
        },
        orderBy: [{ date: "asc" }, { shiftName: "asc" }],
      }),
      db.supervisor.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      db.operator.findMany({
        where: { isActive: true },
        orderBy: [{ section: "asc" }, { name: "asc" }],
      }),
      db.shift.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // Flatten roll entries
    const allRollEntries: Array<{
      reportDate: string;
      shiftName: string;
      supervisorName: string;
      sequence: number;
      rollNumber: string;
      loomNumber: number;
      size: string | null;
      qualityType: string;
      meter: number;
      grossWeightKg: number;
      tareWeightKg: number;
      nettWeightKg: number;
      avgWeightPerMeter: number | null;
      contractor: string | null;
      supervisorSign: string | null;
    }> = [];

    rollReports.forEach((rep) => {
      rep.entries.forEach((e) => {
        if (targetLoomNumber && e.loomNumber !== targetLoomNumber) return;
        if (targetSupervisor && !e.supervisorSign?.toLowerCase().includes(targetSupervisor.toLowerCase()) && !rep.supervisorName?.toLowerCase().includes(targetSupervisor.toLowerCase())) {
          return;
        }

        allRollEntries.push({
          reportDate: rep.date,
          shiftName: rep.shiftName,
          supervisorName: rep.supervisorName || e.supervisorSign || "Unassigned",
          sequence: e.sequence,
          rollNumber: e.rollNumber,
          loomNumber: e.loomNumber,
          size: e.size,
          qualityType: e.qualityType,
          meter: e.meter,
          grossWeightKg: e.grossWeightKg,
          tareWeightKg: e.tareWeightKg,
          nettWeightKg: e.nettWeightKg,
          avgWeightPerMeter: e.avgWeightPerMeter,
          contractor: e.contractor,
          supervisorSign: e.supervisorSign || rep.supervisorName || null,
        });
      });
    });

    // Flatten reading entries
    const allReadingEntries: Array<{
      sheetDate: string;
      shiftName: string;
      loomNumber: number;
      operatorName: string;
      qualityType: string | null;
      totalProduction: number;
      efficiencyPct: number;
      breakdownMinutes: number;
      breakdownReason: string | null;
      status: string;
    }> = [];

    readingSheets.forEach((sheet) => {
      sheet.entries.forEach((e) => {
        if (targetLoomNumber && e.loomNumber !== targetLoomNumber) return;
        if (targetOperator && (!e.operatorName || !e.operatorName.toLowerCase().includes(targetOperator.toLowerCase()))) {
          return;
        }

        allReadingEntries.push({
          sheetDate: sheet.date,
          shiftName: sheet.shiftName,
          loomNumber: e.loomNumber,
          operatorName: e.operatorName || "Unassigned",
          qualityType: e.qualityType,
          totalProduction: e.totalProduction || 0,
          efficiencyPct: e.efficiencyPct || 0,
          breakdownMinutes: e.breakdownMinutes || 0,
          breakdownReason: e.breakdownReason,
          status: e.status || "RUNNING",
        });
      });
    });

    // -------------------------------------------------------------
    // 3. Aggregate Loom-Wise Production
    // -------------------------------------------------------------
    interface LoomAgg {
      loomNumber: number;
      qualities: Set<string>;
      totalRolls: number;
      cutMeters: number;
      readingMeters: number;
      grossWeightKg: number;
      tareWeightKg: number;
      nettWeightKg: number;
      efficiencySum: number;
      efficiencyCount: number;
      breakdownMinutes: number;
      breakdownReasons: Map<string, number>;
      activeShiftsCount: number;
    }

    const loomMap = new Map<number, LoomAgg>();

    // Seed active looms 1..91
    const activeLoomSet = new Set<number>();
    allRollEntries.forEach((e) => activeLoomSet.add(e.loomNumber));
    allReadingEntries.forEach((e) => activeLoomSet.add(e.loomNumber));

    activeLoomSet.forEach((loomNum) => {
      loomMap.set(loomNum, {
        loomNumber: loomNum,
        qualities: new Set<string>(),
        totalRolls: 0,
        cutMeters: 0,
        readingMeters: 0,
        grossWeightKg: 0,
        tareWeightKg: 0,
        nettWeightKg: 0,
        efficiencySum: 0,
        efficiencyCount: 0,
        breakdownMinutes: 0,
        breakdownReasons: new Map<string, number>(),
        activeShiftsCount: 0,
      });
    });

    // Populate from Roll Entries
    allRollEntries.forEach((e) => {
      const agg = loomMap.get(e.loomNumber);
      if (!agg) return;
      if (e.qualityType) agg.qualities.add(e.qualityType);
      agg.totalRolls += 1;
      agg.cutMeters += e.meter;
      agg.grossWeightKg += e.grossWeightKg;
      agg.tareWeightKg += e.tareWeightKg;
      agg.nettWeightKg += e.nettWeightKg;
    });

    // Populate from Reading Entries
    allReadingEntries.forEach((e) => {
      const agg = loomMap.get(e.loomNumber);
      if (!agg) return;
      if (e.qualityType) agg.qualities.add(e.qualityType);
      agg.readingMeters += e.totalProduction;
      if (e.efficiencyPct > 0) {
        agg.efficiencySum += e.efficiencyPct;
        agg.efficiencyCount += 1;
      }
      if (e.breakdownMinutes > 0) {
        agg.breakdownMinutes += e.breakdownMinutes;
        if (e.breakdownReason) {
          const curCount = agg.breakdownReasons.get(e.breakdownReason) || 0;
          agg.breakdownReasons.set(e.breakdownReason, curCount + e.breakdownMinutes);
        }
      }
    });

    const loomWise = Array.from(loomMap.values())
      .map((item) => {
        const avgWeightPerMeter = item.cutMeters > 0 && item.nettWeightKg > 0
          ? Math.round(((item.nettWeightKg * 1000) / item.cutMeters) * 10) / 10
          : 0;
        const avgEfficiency = item.efficiencyCount > 0
          ? Math.round((item.efficiencySum / item.efficiencyCount) * 10) / 10
          : 0;

        // Top breakdown reason
        let primaryBreakdownReason = "None";
        let maxReasonMins = 0;
        item.breakdownReasons.forEach((mins, rsn) => {
          if (mins > maxReasonMins) {
            maxReasonMins = mins;
            primaryBreakdownReason = `${rsn} (${mins}m)`;
          }
        });

        return {
          loomNumber: item.loomNumber,
          qualities: Array.from(item.qualities).join(", ") || "—",
          totalRolls: item.totalRolls,
          cutMeters: Math.round(item.cutMeters * 100) / 100,
          readingMeters: Math.round(item.readingMeters * 100) / 100,
          grossWeightKg: Math.round(item.grossWeightKg * 100) / 100,
          tareWeightKg: Math.round(item.tareWeightKg * 100) / 100,
          nettWeightKg: Math.round(item.nettWeightKg * 100) / 100,
          avgWeightPerMeter,
          avgEfficiency,
          breakdownMinutes: item.breakdownMinutes,
          primaryBreakdownReason,
        };
      })
      .sort((a, b) => a.loomNumber - b.loomNumber);

    // -------------------------------------------------------------
    // 4. Aggregate Supervisor-Wise Production
    // -------------------------------------------------------------
    interface SupAgg {
      supervisorName: string;
      shiftCount: number;
      uniqueDates: Set<string>;
      totalRolls: number;
      cutMeters: number;
      grossWeightKg: number;
      tareWeightKg: number;
      nettWeightKg: number;
      loomsCovered: Set<number>;
    }

    const supMap = new Map<string, SupAgg>();

    rollReports.forEach((rep) => {
      const sup = rep.supervisorName?.trim() || "Unassigned";
      if (targetSupervisor && !sup.toLowerCase().includes(targetSupervisor.toLowerCase())) return;

      if (!supMap.has(sup)) {
        supMap.set(sup, {
          supervisorName: sup,
          shiftCount: 0,
          uniqueDates: new Set(),
          totalRolls: 0,
          cutMeters: 0,
          grossWeightKg: 0,
          tareWeightKg: 0,
          nettWeightKg: 0,
          loomsCovered: new Set(),
        });
      }
      const agg = supMap.get(sup)!;
      agg.shiftCount += 1;
      agg.uniqueDates.add(rep.date);
    });

    allRollEntries.forEach((e) => {
      const sup = e.supervisorSign?.trim() || e.supervisorName?.trim() || "Unassigned";
      if (!supMap.has(sup)) {
        supMap.set(sup, {
          supervisorName: sup,
          shiftCount: 1,
          uniqueDates: new Set([e.reportDate]),
          totalRolls: 0,
          cutMeters: 0,
          grossWeightKg: 0,
          tareWeightKg: 0,
          nettWeightKg: 0,
          loomsCovered: new Set(),
        });
      }
      const agg = supMap.get(sup)!;
      agg.totalRolls += 1;
      agg.cutMeters += e.meter;
      agg.grossWeightKg += e.grossWeightKg;
      agg.tareWeightKg += e.tareWeightKg;
      agg.nettWeightKg += e.nettWeightKg;
      agg.loomsCovered.add(e.loomNumber);
    });

    const totalPlantNettKg = Array.from(supMap.values()).reduce((s, a) => s + a.nettWeightKg, 0);

    const supervisorWise = Array.from(supMap.values())
      .map((item) => {
        const avgWeightPerMeter = item.cutMeters > 0 && item.nettWeightKg > 0
          ? Math.round(((item.nettWeightKg * 1000) / item.cutMeters) * 10) / 10
          : 0;
        const sharePct = totalPlantNettKg > 0
          ? Math.round((item.nettWeightKg / totalPlantNettKg) * 1000) / 10
          : 0;

        return {
          supervisorName: item.supervisorName,
          shiftsSupervised: item.shiftCount,
          daysActive: item.uniqueDates.size,
          totalRolls: item.totalRolls,
          cutMeters: Math.round(item.cutMeters * 100) / 100,
          grossWeightKg: Math.round(item.grossWeightKg * 100) / 100,
          tareWeightKg: Math.round(item.tareWeightKg * 100) / 100,
          nettWeightKg: Math.round(item.nettWeightKg * 100) / 100,
          avgWeightPerMeter,
          sharePct,
          loomsCoveredCount: item.loomsCovered.size,
        };
      })
      .sort((a, b) => b.nettWeightKg - a.nettWeightKg);

    // -------------------------------------------------------------
    // 5. Aggregate Operator-Wise Production
    // -------------------------------------------------------------
    interface OpAgg {
      operatorName: string;
      shiftEntriesCount: number;
      uniqueDates: Set<string>;
      loomsOperated: Set<number>;
      totalProductionMeters: number;
      efficiencySum: number;
      efficiencyCount: number;
      breakdownMinutes: number;
    }

    const opMap = new Map<string, OpAgg>();

    allReadingEntries.forEach((e) => {
      const op = e.operatorName?.trim() || "Unassigned";
      if (!opMap.has(op)) {
        opMap.set(op, {
          operatorName: op,
          shiftEntriesCount: 0,
          uniqueDates: new Set(),
          loomsOperated: new Set(),
          totalProductionMeters: 0,
          efficiencySum: 0,
          efficiencyCount: 0,
          breakdownMinutes: 0,
        });
      }
      const agg = opMap.get(op)!;
      agg.shiftEntriesCount += 1;
      agg.uniqueDates.add(e.sheetDate);
      agg.loomsOperated.add(e.loomNumber);
      agg.totalProductionMeters += e.totalProduction;
      if (e.efficiencyPct > 0) {
        agg.efficiencySum += e.efficiencyPct;
        agg.efficiencyCount += 1;
      }
      agg.breakdownMinutes += e.breakdownMinutes;
    });

    const operatorWise = Array.from(opMap.values())
      .map((item) => {
        const avgEfficiency = item.efficiencyCount > 0
          ? Math.round((item.efficiencySum / item.efficiencyCount) * 10) / 10
          : 0;

        return {
          operatorName: item.operatorName,
          shiftLogsCount: item.shiftEntriesCount,
          daysActive: item.uniqueDates.size,
          loomsHandledCount: item.loomsOperated.size,
          loomsList: Array.from(item.loomsOperated).sort((a, b) => a - b).join(", "),
          totalProductionMeters: Math.round(item.totalProductionMeters * 100) / 100,
          avgEfficiency,
          breakdownMinutes: item.breakdownMinutes,
        };
      })
      .sort((a, b) => b.totalProductionMeters - a.totalProductionMeters);

    // -------------------------------------------------------------
    // 6. Overall Grand Totals & KPIs
    // -------------------------------------------------------------
    const grandTotalRolls = allRollEntries.length;
    const grandTotalCutMeters = Math.round(allRollEntries.reduce((s, e) => s + e.meter, 0) * 100) / 100;
    const grandTotalReadingMeters = Math.round(allReadingEntries.reduce((s, e) => s + e.totalProduction, 0) * 100) / 100;
    const grandTotalGrossKg = Math.round(allRollEntries.reduce((s, e) => s + e.grossWeightKg, 0) * 100) / 100;
    const grandTotalTareKg = Math.round(allRollEntries.reduce((s, e) => s + e.tareWeightKg, 0) * 100) / 100;
    const grandTotalNettKg = Math.round(allRollEntries.reduce((s, e) => s + e.nettWeightKg, 0) * 100) / 100;
    const grandTotalNettMT = Math.round((grandTotalNettKg / 1000) * 1000) / 1000;

    const grandAvgWeightPerMeter = grandTotalCutMeters > 0 && grandTotalNettKg > 0
      ? Math.round(((grandTotalNettKg * 1000) / grandTotalCutMeters) * 10) / 10
      : 0;

    const allEfficiencies = allReadingEntries.filter((e) => e.efficiencyPct > 0).map((e) => e.efficiencyPct);
    const grandAvgEfficiency = allEfficiencies.length > 0
      ? Math.round((allEfficiencies.reduce((s, v) => s + v, 0) / allEfficiencies.length) * 10) / 10
      : 0;

    const grandTotalBreakdownMinutes = allReadingEntries.reduce((s, e) => s + e.breakdownMinutes, 0);

    return NextResponse.json({
      period: {
        startDate,
        endDate,
        shiftName,
        targetLoomNumber,
        targetSupervisor,
        targetOperator,
      },
      kpis: {
        totalRollsCut: grandTotalRolls,
        totalCutMeters: grandTotalCutMeters,
        totalReadingMeters: grandTotalReadingMeters,
        totalGrossKg: grandTotalGrossKg,
        totalTareKg: grandTotalTareKg,
        totalNettKg: grandTotalNettKg,
        totalNettMT: grandTotalNettMT,
        avgWeightPerMeter: grandAvgWeightPerMeter,
        avgEfficiency: grandAvgEfficiency,
        totalBreakdownMinutes: grandTotalBreakdownMinutes,
        activeLoomsCount: activeLoomSet.size,
        activeSupervisorsCount: supervisorWise.length,
        activeOperatorsCount: operatorWise.length,
      },
      loomWise,
      supervisorWise,
      operatorWise,
      filters: {
        availableSupervisors: allSupervisors.map((s) => ({ id: s.id, name: s.name, code: s.code, department: s.department })),
        availableOperators: allOperators.map((o) => ({ id: o.id, name: o.name, code: o.code, section: o.section })),
        availableShifts: activeShifts.map((s) => ({ id: s.id, name: s.name })),
      },
    });
  } catch (error: any) {
    console.error("GET /api/production/loom/production-report error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate Loom Production Report" },
      { status: 500 }
    );
  }
}
