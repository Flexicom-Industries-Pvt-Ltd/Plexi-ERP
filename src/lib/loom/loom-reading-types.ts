export const TOTAL_FACTORY_LOOMS = 91;
export const DEFAULT_TIME_SLOTS = ["10:00", "12:00", "02:00", "04:00", "06:00", "08:00"];
export const DEFAULT_INITIAL_SLOT = "08:00";
export const ESTIMATED_KG_PER_METER = 0.16;

// Standard Speed Rates (Meters / Minute)
export const LOOM_STANDARD_SPEED_PP_MPM = 2.01;  // Standard speed for PP qualities (~1,447.2m / 12h)
export const LOOM_STANDARD_SPEED_LPP_MPM = 2.50; // Standard speed for LPP qualities (~1,800.0m / 12h)

export const LOOM_BREAKDOWN_REASONS = [
  "Change Over",
  "Power Cut",
  "Full Maintenance",
  "Shuttle Mount",
  "Operator Shortage",
  "Full Shut Down",
  "Bobbin Shortage",
] as const;

export type LoomBreakdownReason = typeof LOOM_BREAKDOWN_REASONS[number];

export interface LoomReadingEntryItem {
  id?: string;
  loomNumber: number;
  operatorName: string | null;
  size: string | null;
  denier: string | null;
  qualityType: string | null;
  initialReading: number | null;
  r1Reading: number | null;
  r1Prod: number | null;
  r2Reading: number | null;
  r2Prod: number | null;
  r3Reading: number | null;
  r3Prod: number | null;
  r4Reading: number | null;
  r4Prod: number | null;
  r5Reading: number | null;
  r5Prod: number | null;
  r6Reading: number | null;
  r6Prod: number | null;
  totalProduction: number;
  breakdownReason?: string | null;
  breakdownMinutes?: number | null;
  changeoverTargetQuality?: string | null;
  efficiencyPct?: number | null;
  status: "RUNNING" | "STOP" | "CLEANING" | "CHANGEOVER" | "IDLE" | string;
  remarks: string | null;
}

export interface IntervalKpiSummary {
  slot: string;
  index: number;
  intervalMeters: number;
  cumulativeMeters: number;
  runningCount: number;
}

/**
 * Determine the standard production speed (in meters/min) for a given quality.
 * If quality contains "LPP", standard speed is 2.50 m/min.
 * Otherwise defaults to 2.01 m/min for PP.
 */
export function getLoomStandardSpeed(qualityType?: string | null): number {
  if (!qualityType) return LOOM_STANDARD_SPEED_PP_MPM;
  const q = qualityType.toUpperCase();
  if (q.includes("LPP")) return LOOM_STANDARD_SPEED_LPP_MPM;
  return LOOM_STANDARD_SPEED_PP_MPM;
}

/**
 * Computes theoretical shift production and real-time efficiency percentage based on
 * standard speed (PP: 2.01 m/min, LPP: 2.50 m/min), available running time, and actual meters.
 */
export function computeLoomEfficiency(
  actualProductionMeters: number,
  qualityType?: string | null,
  breakdownMinutes: number = 0,
  shiftHours: number = 12
): {
  standardSpeedMpm: number;
  shiftMinutes: number;
  runningMinutes: number;
  theoreticalMeters: number;
  efficiencyPct: number;
} {
  const standardSpeedMpm = getLoomStandardSpeed(qualityType);
  const shiftMinutes = Math.max(0, shiftHours * 60);
  const validBreakdownMins = Math.min(shiftMinutes, Math.max(0, Number(breakdownMinutes) || 0));
  const runningMinutes = Math.max(0, shiftMinutes - validBreakdownMins);
  const theoreticalMeters = Math.round(runningMinutes * standardSpeedMpm * 10) / 10;

  if (theoreticalMeters <= 0 || actualProductionMeters <= 0) {
    return {
      standardSpeedMpm,
      shiftMinutes,
      runningMinutes,
      theoreticalMeters,
      efficiencyPct: 0,
    };
  }

  const efficiencyPct = Math.min(150, Math.round((actualProductionMeters / theoreticalMeters) * 1000) / 10);
  return {
    standardSpeedMpm,
    shiftMinutes,
    runningMinutes,
    theoreticalMeters,
    efficiencyPct,
  };
}

export function computeIntervalDeltas(entry: Partial<LoomReadingEntryItem> | Record<string, any>): {
  r1Prod: number | null;
  r2Prod: number | null;
  r3Prod: number | null;
  r4Prod: number | null;
  r5Prod: number | null;
  r6Prod: number | null;
  totalProduction: number;
} {
  const init = typeof entry.initialReading === "number" && !isNaN(entry.initialReading) ? entry.initialReading : null;
  const r1 = typeof entry.r1Reading === "number" && !isNaN(entry.r1Reading) ? entry.r1Reading : null;
  const r2 = typeof entry.r2Reading === "number" && !isNaN(entry.r2Reading) ? entry.r2Reading : null;
  const r3 = typeof entry.r3Reading === "number" && !isNaN(entry.r3Reading) ? entry.r3Reading : null;
  const r4 = typeof entry.r4Reading === "number" && !isNaN(entry.r4Reading) ? entry.r4Reading : null;
  const r5 = typeof entry.r5Reading === "number" && !isNaN(entry.r5Reading) ? entry.r5Reading : null;
  const r6 = typeof entry.r6Reading === "number" && !isNaN(entry.r6Reading) ? entry.r6Reading : null;

  const calcDiff = (curr: number | null, prev: number | null): number | null => {
    if (curr === null || prev === null) return null;
    let diff = curr - prev;
    if (diff < 0) {
      // Counter rollover (e.g. 9999 -> 0010)
      if (prev > 8000 && curr < 2000) {
        diff = (10000 - prev) + curr;
      } else {
        diff = 0;
      }
    }
    return Math.round(diff * 100) / 100;
  };

  const r1Prod = calcDiff(r1, init);
  const r2Prod = calcDiff(r2, r1 ?? init);
  const r3Prod = calcDiff(r3, r2 ?? r1 ?? init);
  const r4Prod = calcDiff(r4, r3 ?? r2 ?? r1 ?? init);
  const r5Prod = calcDiff(r5, r4 ?? r3 ?? r2 ?? r1 ?? init);
  const r6Prod = calcDiff(r6, r5 ?? r4 ?? r3 ?? r2 ?? r1 ?? init);

  const prodList = [r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod].filter((p): p is number => p !== null && !isNaN(p) && p > 0);
  let totalProduction = prodList.reduce((sum, val) => sum + val, 0);

  // Fallback to (r6 - init) if individual intervals were not recorded separately
  if (totalProduction === 0 && r6 !== null && init !== null && r6 > init) {
    totalProduction = calcDiff(r6, init) ?? 0;
  }

  return {
    r1Prod,
    r2Prod,
    r3Prod,
    r4Prod,
    r5Prod,
    r6Prod,
    totalProduction: Math.round(totalProduction * 100) / 100,
  };
}

/**
 * Determines whether a loom has active activity/data in the reading sheet.
 * A loom is considered active if:
 * - its status is RUNNING
 * - it has recorded production (> 0)
 * - it has an initial reading entered
 * - it has any interval readings entered (r1..r6)
 * - it has an operator assigned
 * - it has a quality type assigned
 * - it has breakdown minutes or reasons logged
 */
export function isLoomActive(entry: LoomReadingEntryItem): boolean {
  if (entry.status === "RUNNING") return true;
  if ((entry.totalProduction ?? 0) > 0) return true;
  if (typeof entry.initialReading === "number" && !isNaN(entry.initialReading)) return true;
  if (typeof entry.r1Reading === "number" && !isNaN(entry.r1Reading)) return true;
  if (typeof entry.r2Reading === "number" && !isNaN(entry.r2Reading)) return true;
  if (typeof entry.r3Reading === "number" && !isNaN(entry.r3Reading)) return true;
  if (typeof entry.r4Reading === "number" && !isNaN(entry.r4Reading)) return true;
  if (typeof entry.r5Reading === "number" && !isNaN(entry.r5Reading)) return true;
  if (typeof entry.r6Reading === "number" && !isNaN(entry.r6Reading)) return true;
  if (Boolean(entry.operatorName && entry.operatorName.trim())) return true;
  if (Boolean(entry.qualityType && entry.qualityType.trim())) return true;
  if ((Number(entry.breakdownMinutes) || 0) > 0) return true;
  if (Boolean(entry.breakdownReason && entry.breakdownReason.trim())) return true;
  if (Boolean(entry.changeoverTargetQuality && entry.changeoverTargetQuality.trim())) return true;
  return false;
}
