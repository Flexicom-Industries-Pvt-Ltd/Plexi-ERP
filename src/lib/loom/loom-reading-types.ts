export const TOTAL_FACTORY_LOOMS = 91;
export const DEFAULT_TIME_SLOTS = ["10:00", "12:00", "02:00", "04:00", "06:00", "08:00"];
export const DEFAULT_INITIAL_SLOT = "08:00";
export const ESTIMATED_KG_PER_METER = 0.16;

export interface LoomReadingEntryItem {
  id?: string;
  loomNumber: number;
  operatorName: string;
  size: string;
  denier: string;
  qualityType: string;
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
  status: "RUNNING" | "STOP" | "CLEANING" | "CHANGEOVER" | "IDLE";
  remarks: string;
}

export interface IntervalKpiSummary {
  slot: string;
  index: number;
  intervalMeters: number;
  cumulativeMeters: number;
  runningCount: number;
}

export function computeIntervalDeltas(entry: Partial<LoomReadingEntryItem>): {
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

  const r1Prod = entry.r1Prod !== undefined && entry.r1Prod !== null ? entry.r1Prod : calcDiff(r1, init);
  const r2Prod = entry.r2Prod !== undefined && entry.r2Prod !== null ? entry.r2Prod : calcDiff(r2, r1 ?? init);
  const r3Prod = entry.r3Prod !== undefined && entry.r3Prod !== null ? entry.r3Prod : calcDiff(r3, r2 ?? r1 ?? init);
  const r4Prod = entry.r4Prod !== undefined && entry.r4Prod !== null ? entry.r4Prod : calcDiff(r4, r3 ?? r2 ?? r1 ?? init);
  const r5Prod = entry.r5Prod !== undefined && entry.r5Prod !== null ? entry.r5Prod : calcDiff(r5, r4 ?? r3 ?? r2 ?? r1 ?? init);
  const r6Prod = entry.r6Prod !== undefined && entry.r6Prod !== null ? entry.r6Prod : calcDiff(r6, r5 ?? r4 ?? r3 ?? r2 ?? r1 ?? init);

  const prodList = [r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod].filter((p): p is number => p !== null && !isNaN(p) && p > 0);
  let totalProduction = prodList.reduce((sum, val) => sum + val, 0);

  // Fallback to (r6 - init) if individual intervals were not recorded separately
  if (totalProduction === 0 && r6 !== null && init !== null && r6 > init) {
    totalProduction = r6 - init;
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
