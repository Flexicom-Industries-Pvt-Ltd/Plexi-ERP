import { db } from "@/lib/db";

export interface ShiftDigestResult {
  shift: string;
  date: string;
  metrics: {
    totalPlannedUnits: number;
    totalActualUnits: number;
    varianceUnits: number;
    achievementPercentage: number;
    totalScrapKg: number;
    scrapRatePercentage: number;
    totalDowntimeMinutes: number;
    breakdownCount: number;
  };
  phaseBreakdown: Array<{
    phase: string;
    planned: number;
    actual: number;
    achievement: number;
    scrapKg: number;
  }>;
  executiveSummary: string;
  generatedAt: string;
}

export class ShiftDigestService {
  /**
   * Generate shift performance variance and downtime digest
   */
  static async generateShiftDigest(options: {
    shift: string;
    date?: string;
  }): Promise<ShiftDigestResult> {
    const shift = options.shift.toUpperCase();
    const dateStr = options.date || new Date().toISOString().split("T")[0];

    // Query production plans/runs filtered by shift and planDate
    const runs = await db.productionRun.findMany({
      where: {
        planLine: {
          plan: {
            shift: {
              name: {
                contains: shift,
                mode: "insensitive",
              },
            },
          },
        },
      },
      include: {
        planLine: {
          include: {
            plan: {
              include: {
                shift: true,
              },
            },
            machine: true,
          },
        },
      },
    });

    let totalPlanned = 0;
    let totalActual = 0;
    let totalScrap = 0;

    const phaseMap = new Map<string, { planned: number; actual: number; scrap: number }>();

    for (const run of runs) {
      const planned = run.targetQty || 0;
      const actual = run.actualQty || 0;
      const scrap = Number(run.scrapQty || 0);

      totalPlanned += planned;
      totalActual += actual;
      totalScrap += scrap;

      const phase = run.planLine?.phase || "GENERAL";
      const existing = phaseMap.get(phase) || { planned: 0, actual: 0, scrap: 0 };
      existing.planned += planned;
      existing.actual += actual;
      existing.scrap += scrap;
      phaseMap.set(phase, existing);
    }

    // Query maintenance logs reported around the target date
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const maintenanceLogs = await db.maintenanceLog.findMany({
      where: {
        reportedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const totalDowntimeMinutes = maintenanceLogs.reduce(
      (sum, log) => sum + (log.downtimeMinutes || 0),
      0
    );

    const variance = totalActual - totalPlanned;
    const achievementPercentage =
      totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 10000) / 100 : 100;
    const scrapRatePercentage =
      totalActual > 0
        ? Math.round((totalScrap / (totalActual + totalScrap)) * 10000) / 100
        : 0;

    const phaseBreakdown = Array.from(phaseMap.entries()).map(([phase, data]) => ({
      phase,
      planned: data.planned,
      actual: data.actual,
      achievement:
        data.planned > 0 ? Math.round((data.actual / data.planned) * 10000) / 100 : 100,
      scrapKg: data.scrap,
    }));

    const executiveSummary = [
      `📊 SHIFT ${shift} PRODUCTION DIGEST (${dateStr})`,
      `• Target Achievement: ${achievementPercentage}% (${totalActual} / ${totalPlanned} units)`,
      `• Scrap Generated: ${totalScrap} KG (${scrapRatePercentage}% scrap rate)`,
      `• Total Machine Downtime: ${totalDowntimeMinutes} mins across ${maintenanceLogs.length} incidents`,
      `• Status: ${achievementPercentage >= 95 ? "ON TARGET ✅" : "BELOW TARGET ⚠️"}`,
    ].join("\n");

    return {
      shift,
      date: dateStr,
      metrics: {
        totalPlannedUnits: totalPlanned,
        totalActualUnits: totalActual,
        varianceUnits: variance,
        achievementPercentage,
        totalScrapKg: totalScrap,
        scrapRatePercentage,
        totalDowntimeMinutes,
        breakdownCount: maintenanceLogs.length,
      },
      phaseBreakdown,
      executiveSummary,
      generatedAt: new Date().toISOString(),
    };
  }
}
