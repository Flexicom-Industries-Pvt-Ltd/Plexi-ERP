import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { achievementPercent, sumRunTotals } from "@/lib/production/achievement";
import { phaseLabel } from "@/lib/production/phases";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export type ProductionReportFilters = {
  dateFrom: Date;
  dateTo: Date;
  shiftId?: string;
  phase?: string;
  machineId?: string;
  operatorId?: string;
};

type LineWithRelations = {
  id: string;
  phase: string;
  targetQty: number;
  machineId: string | null;
  operatorId: string | null;
  machine: { id: string; name: string } | null;
  operator: { id: string; name: string | null } | null;
  inventoryItem: { id: string; code: string; name: string } | null;
  runs: Array<{
    targetQty: number;
    actualQty: number;
    acceptedQty: number;
    rejectedQty: number;
    reworkQty: number;
    scrapQty: number;
    downtimeMinutes: number;
    startedAt: Date;
    endedAt: Date | null;
  }>;
};

function runsInRange(
  runs: LineWithRelations["runs"],
  dayStart: Date,
  dayEnd: Date,
) {
  return runs.filter((r) => r.startedAt >= dayStart && r.startedAt <= dayEnd);
}

function completedRunsInRange(
  runs: LineWithRelations["runs"],
  dayStart: Date,
  dayEnd: Date,
) {
  return runsInRange(runs, dayStart, dayEnd).filter((r) => r.endedAt);
}

export async function getProductionReports(filters: ProductionReportFilters) {
  const dayStart = startOfDay(filters.dateFrom);
  const dayEnd = endOfDay(filters.dateTo);

  const planWhere: Prisma.ProductionPlanWhereInput = {
    planDate: { gte: dayStart, lte: dayEnd },
    status: { not: "CANCELLED" },
  };
  if (filters.shiftId) planWhere.shiftId = filters.shiftId;

  const lineWhere: Prisma.ProductionPlanLineWhereInput = {};
  if (filters.phase) lineWhere.phase = filters.phase as Prisma.EnumProductionPhaseFilter["equals"];
  if (filters.machineId) lineWhere.machineId = filters.machineId;
  if (filters.operatorId) lineWhere.operatorId = filters.operatorId;

  const plans = await db.productionPlan.findMany({
    where: planWhere,
    include: {
      shift: { select: { id: true, name: true } },
      lines: {
        where: Object.keys(lineWhere).length ? lineWhere : undefined,
        include: {
          machine: { select: { id: true, name: true } },
          operator: { select: { id: true, name: true } },
          inventoryItem: { select: { id: true, code: true, name: true } },
          runs: true,
        },
      },
    },
    orderBy: [{ planDate: "asc" }, { planNumber: "asc" }],
  });

  const detailRows: Array<{
    planNumber: string;
    planDate: string;
    shiftName: string;
    phase: string;
    phaseLabel: string;
    machineName: string;
    operatorName: string;
    productCode: string;
    productName: string;
    targetQty: number;
    actualQty: number;
    acceptedQty: number;
    rejectedQty: number;
    reworkQty: number;
    scrapQty: number;
    achievementPercent: number;
    runCount: number;
    completedRunCount: number;
  }> = [];

  const phaseMap = new Map<string, { target: number; actual: number; accepted: number; planCount: number }>();
  const shiftMap = new Map<string, { shiftName: string; target: number; actual: number; accepted: number; planCount: number }>();
  const machineMap = new Map<string, { machineName: string; target: number; actual: number; accepted: number; runCount: number }>();
  const operatorMap = new Map<string, { operatorName: string; target: number; actual: number; accepted: number; runCount: number }>();
  const productMap = new Map<string, { productCode: string; productName: string; target: number; actual: number; accepted: number; planCount: number }>();

  let totalTarget = 0;
  let totalActual = 0;
  let totalAccepted = 0;
  let totalRuns = 0;
  let totalCompletedRuns = 0;

  for (const plan of plans) {
    const shiftKey = plan.shiftId || "unassigned";
    const shiftName = plan.shift?.name || "Unassigned";

    for (const line of plan.lines) {
      const completed = completedRunsInRange(line.runs, dayStart, dayEnd);
      const totals = sumRunTotals(completed);
      const lineTarget = line.targetQty;
      const lineAccepted = totals.acceptedQty;
      const lineActual = totals.actualQty;

      totalTarget += lineTarget;
      totalActual += lineActual;
      totalAccepted += lineAccepted;
      totalRuns += runsInRange(line.runs, dayStart, dayEnd).length;
      totalCompletedRuns += completed.length;

      detailRows.push({
        planNumber: plan.planNumber,
        planDate: plan.planDate.toISOString(),
        shiftName,
        phase: line.phase,
        phaseLabel: phaseLabel(line.phase),
        machineName: line.machine?.name ?? "—",
        operatorName: line.operator?.name ?? "—",
        productCode: line.inventoryItem?.code ?? "—",
        productName: line.inventoryItem?.name ?? "—",
        targetQty: lineTarget,
        actualQty: lineActual,
        acceptedQty: lineAccepted,
        rejectedQty: totals.rejectedQty,
        reworkQty: totals.reworkQty,
        scrapQty: totals.scrapQty,
        achievementPercent: achievementPercent(lineAccepted, lineTarget),
        runCount: runsInRange(line.runs, dayStart, dayEnd).length,
        completedRunCount: completed.length,
      });

      const phaseEntry = phaseMap.get(line.phase) || { target: 0, actual: 0, accepted: 0, planCount: 0 };
      phaseMap.set(line.phase, {
        target: phaseEntry.target + lineTarget,
        actual: phaseEntry.actual + lineActual,
        accepted: phaseEntry.accepted + lineAccepted,
        planCount: phaseEntry.planCount + 1,
      });

      const shiftEntry = shiftMap.get(shiftKey) || { shiftName, target: 0, actual: 0, accepted: 0, planCount: 0 };
      shiftMap.set(shiftKey, {
        shiftName,
        target: shiftEntry.target + lineTarget,
        actual: shiftEntry.actual + lineActual,
        accepted: shiftEntry.accepted + lineAccepted,
        planCount: shiftEntry.planCount + 1,
      });

      const machineKey = line.machineId || "unassigned";
      const machineName = line.machine?.name || "Unassigned";
      const machineEntry = machineMap.get(machineKey) || { machineName, target: 0, actual: 0, accepted: 0, runCount: 0 };
      machineMap.set(machineKey, {
        machineName,
        target: machineEntry.target + lineTarget,
        actual: machineEntry.actual + lineActual,
        accepted: machineEntry.accepted + lineAccepted,
        runCount: machineEntry.runCount + completed.length,
      });

      const operatorKey = line.operatorId || "unassigned";
      const operatorName = line.operator?.name || "Unassigned";
      const operatorEntry = operatorMap.get(operatorKey) || { operatorName, target: 0, actual: 0, accepted: 0, runCount: 0 };
      operatorMap.set(operatorKey, {
        operatorName,
        target: operatorEntry.target + lineTarget,
        actual: operatorEntry.actual + lineActual,
        accepted: operatorEntry.accepted + lineAccepted,
        runCount: operatorEntry.runCount + completed.length,
      });

      const productKey = line.inventoryItemId || "unassigned";
      const productCode = line.inventoryItem?.code || "—";
      const productName = line.inventoryItem?.name || "Unassigned";
      const productEntry = productMap.get(productKey) || { productCode, productName, target: 0, actual: 0, accepted: 0, planCount: 0 };
      productMap.set(productKey, {
        productCode,
        productName,
        target: productEntry.target + lineTarget,
        actual: productEntry.actual + lineActual,
        accepted: productEntry.accepted + lineAccepted,
        planCount: productEntry.planCount + 1,
      });
    }
  }

  const mapToRows = <T extends { target: number; accepted: number; actual: number }>(
    entries: Array<[string, T]>,
    extra: (id: string, data: T) => Record<string, unknown>,
  ) =>
    entries
      .map(([id, data]) => ({
        id,
        ...data,
        achievement: achievementPercent(data.accepted, data.target),
        ...extra(id, data),
      }))
      .sort((a, b) => b.accepted - a.accepted);

  return {
    dateFrom: dayStart.toISOString(),
    dateTo: dayEnd.toISOString(),
    filters: {
      shiftId: filters.shiftId ?? null,
      phase: filters.phase ?? null,
      machineId: filters.machineId ?? null,
      operatorId: filters.operatorId ?? null,
    },
    summary: {
      targetQty: totalTarget,
      actualQty: totalActual,
      acceptedQty: totalAccepted,
      achievementPercent: achievementPercent(totalAccepted, totalTarget),
      planCount: plans.length,
      lineCount: detailRows.length,
      runCount: totalRuns,
      completedRunCount: totalCompletedRuns,
    },
    plannedVsActual: detailRows.map((row) => ({
      planNumber: row.planNumber,
      planDate: row.planDate,
      phase: row.phaseLabel,
      shift: row.shiftName,
      targetQty: row.targetQty,
      acceptedQty: row.acceptedQty,
      actualQty: row.actualQty,
      achievementPercent: row.achievementPercent,
    })),
    byPhase: mapToRows(Array.from(phaseMap.entries()), (phase) => ({
      phase,
      label: phaseLabel(phase),
    })),
    byShift: mapToRows(Array.from(shiftMap.entries()), (shiftId, data) => ({
      shiftId,
      shiftName: (data as { shiftName: string }).shiftName,
    })),
    byMachine: mapToRows(Array.from(machineMap.entries()), (machineId, data) => ({
      machineId,
      machineName: (data as { machineName: string }).machineName,
      runCount: (data as { runCount: number }).runCount,
    })),
    byOperator: mapToRows(Array.from(operatorMap.entries()), (operatorId, data) => ({
      operatorId,
      operatorName: (data as { operatorName: string }).operatorName,
      runCount: (data as { runCount: number }).runCount,
    })),
    byProduct: mapToRows(Array.from(productMap.entries()), (productId, data) => ({
      productId,
      productCode: (data as { productCode: string }).productCode,
      productName: (data as { productName: string }).productName,
      planCount: (data as { planCount: number }).planCount,
    })),
    detailRows,
  };
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function productionReportToCsv(report: Awaited<ReturnType<typeof getProductionReports>>) {
  const header =
    "Plan Number,Plan Date,Shift,Phase,Machine,Operator,Product Code,Product Name,Target Qty,Actual Qty,Accepted Qty,Rejected Qty,Rework Qty,Scrap Qty,Achievement %,Runs,Completed Runs\n";

  const rows = report.detailRows.map((row) =>
    [
      csvEscape(row.planNumber),
      csvEscape(new Date(row.planDate).toISOString().slice(0, 10)),
      csvEscape(row.shiftName),
      csvEscape(row.phaseLabel),
      csvEscape(row.machineName),
      csvEscape(row.operatorName),
      csvEscape(row.productCode),
      csvEscape(row.productName),
      row.targetQty,
      row.actualQty,
      row.acceptedQty,
      row.rejectedQty,
      row.reworkQty,
      row.scrapQty,
      row.achievementPercent,
      row.runCount,
      row.completedRunCount,
    ].join(","),
  );

  return header + rows.join("\n");
}
