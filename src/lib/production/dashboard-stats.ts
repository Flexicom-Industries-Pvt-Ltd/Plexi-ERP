import { db } from "@/lib/db";
import { achievementPercent } from "@/lib/production/achievement";
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

export async function getProductionDashboardData(date = new Date()) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const [todayPlans, delayedPlans, todayRuns] = await Promise.all([
    db.productionPlan.findMany({
      where: {
        planDate: { gte: dayStart, lte: dayEnd },
        status: { not: "CANCELLED" },
      },
      include: {
        shift: true,
        lines: {
          include: {
            machine: { select: { id: true, name: true } },
            runs: true,
          },
        },
      },
    }),
    db.productionPlan.findMany({
      where: {
        planDate: { lt: dayStart },
        status: { in: ["APPROVED", "IN_PROGRESS"] },
      },
      include: { shift: true },
      orderBy: { planDate: "asc" },
      take: 20,
    }),
    db.productionRun.findMany({
      where: {
        startedAt: { gte: dayStart, lte: dayEnd },
      },
      include: {
        planLine: {
          include: {
            machine: { select: { id: true, name: true } },
            plan: { include: { shift: true } },
          },
        },
      },
    }),
  ]);

  const todayTarget = todayPlans.reduce(
    (sum, plan) => sum + plan.lines.reduce((ls, line) => ls + line.targetQty, 0),
    0,
  );

  const completedTodayRuns = todayRuns.filter((r) => r.endedAt);
  const todayAccepted = completedTodayRuns.reduce((s, r) => s + r.acceptedQty, 0);
  const todayActual = completedTodayRuns.reduce((s, r) => s + r.actualQty, 0);

  const phaseMap = new Map<string, { target: number; actual: number; accepted: number; planCount: number }>();
  for (const plan of todayPlans) {
    for (const line of plan.lines) {
      const current = phaseMap.get(line.phase) || { target: 0, actual: 0, accepted: 0, planCount: 0 };
      const lineRuns = line.runs.filter((r) => r.startedAt >= dayStart && r.startedAt <= dayEnd);
      const completed = lineRuns.filter((r) => r.endedAt);
      phaseMap.set(line.phase, {
        target: current.target + line.targetQty,
        actual: current.actual + completed.reduce((s, r) => s + r.actualQty, 0),
        accepted: current.accepted + completed.reduce((s, r) => s + r.acceptedQty, 0),
        planCount: current.planCount + 1,
      });
    }
  }

  const byPhase = Array.from(phaseMap.entries())
    .map(([phase, data]) => ({
      phase,
      label: phaseLabel(phase),
      target: data.target,
      actual: data.actual,
      accepted: data.accepted,
      achievement: achievementPercent(data.accepted, data.target),
      planCount: data.planCount,
    }))
    .sort((a, b) => b.target - a.target);

  const shiftMap = new Map<string, { shiftName: string; target: number; actual: number; accepted: number; planCount: number }>();
  for (const plan of todayPlans) {
    const key = plan.shiftId || "unassigned";
    const name = plan.shift?.name || "Unassigned";
    const current = shiftMap.get(key) || { shiftName: name, target: 0, actual: 0, accepted: 0, planCount: 0 };
    const planAccepted = plan.lines.reduce(
      (s, line) => s + line.runs
        .filter((r) => r.endedAt && r.startedAt >= dayStart && r.startedAt <= dayEnd)
        .reduce((rs, r) => rs + r.acceptedQty, 0),
      0,
    );
    const planActual = plan.lines.reduce(
      (s, line) => s + line.runs
        .filter((r) => r.endedAt && r.startedAt >= dayStart && r.startedAt <= dayEnd)
        .reduce((rs, r) => rs + r.actualQty, 0),
      0,
    );
    shiftMap.set(key, {
      shiftName: name,
      target: current.target + plan.lines.reduce((s, l) => s + l.targetQty, 0),
      actual: current.actual + planActual,
      accepted: current.accepted + planAccepted,
      planCount: current.planCount + 1,
    });
  }

  const byShift = Array.from(shiftMap.entries())
    .map(([shiftId, data]) => ({
      shiftId,
      ...data,
      achievement: achievementPercent(data.accepted, data.target),
    }))
    .sort((a, b) => b.target - a.target);

  const machineMap = new Map<string, { machineName: string; target: number; actual: number; accepted: number; runCount: number }>();
  for (const run of completedTodayRuns) {
    const machineId = run.planLine.machineId || "unassigned";
    const machineName = run.planLine.machine?.name || "Unassigned";
    const current = machineMap.get(machineId) || { machineName, target: 0, actual: 0, accepted: 0, runCount: 0 };
    machineMap.set(machineId, {
      machineName,
      target: current.target + run.targetQty,
      actual: current.actual + run.actualQty,
      accepted: current.accepted + run.acceptedQty,
      runCount: current.runCount + 1,
    });
  }

  const byMachine = Array.from(machineMap.entries())
    .map(([machineId, data]) => ({
      machineId,
      ...data,
      achievement: achievementPercent(data.accepted, data.target),
    }))
    .sort((a, b) => b.accepted - a.accepted);

  const activePlans = todayPlans.filter((p) => ["APPROVED", "IN_PROGRESS"].includes(p.status)).length;
  const inProgressPlans = todayPlans.filter((p) => p.status === "IN_PROGRESS").length;

  return {
    date: dayStart.toISOString(),
    kpis: {
      todayTarget,
      todayActual,
      todayAccepted,
      achievementPercent: achievementPercent(todayAccepted, todayTarget),
      delayedPlansCount: delayedPlans.length,
      activePlans,
      inProgressPlans,
      totalPlansToday: todayPlans.length,
      runsToday: todayRuns.length,
      completedRunsToday: completedTodayRuns.length,
    },
    byPhase,
    byShift,
    byMachine,
    delayedPlans: delayedPlans.map((p) => ({
      id: p.id,
      planNumber: p.planNumber,
      planDate: p.planDate,
      shiftName: p.shift?.name ?? "—",
      status: p.status,
    })),
    summary: {
      activeProductionOrders: activePlans + inProgressPlans,
      achievementPercent: achievementPercent(todayAccepted, todayTarget),
    },
  };
}
