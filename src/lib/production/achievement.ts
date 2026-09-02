/** Compute achievement percentage from accepted vs target quantity. */
export function achievementPercent(accepted: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.round((accepted / target) * 1000) / 10;
}

export interface RunTotals {
  targetQty: number;
  actualQty: number;
  acceptedQty: number;
  rejectedQty: number;
  reworkQty: number;
  scrapQty: number;
  downtimeMinutes: number;
}

export function sumRunTotals(
  runs: Array<{
    targetQty?: number;
    actualQty?: number;
    acceptedQty?: number;
    rejectedQty?: number;
    reworkQty?: number;
    scrapQty?: number;
    downtimeMinutes?: number;
  }>,
): RunTotals {
  const initial: RunTotals = {
    targetQty: 0,
    actualQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    reworkQty: 0,
    scrapQty: 0,
    downtimeMinutes: 0,
  };

  return runs.reduce<RunTotals>(
    (acc, run) => ({
      targetQty: acc.targetQty + (run.targetQty ?? 0),
      actualQty: acc.actualQty + (run.actualQty ?? 0),
      acceptedQty: acc.acceptedQty + (run.acceptedQty ?? 0),
      rejectedQty: acc.rejectedQty + (run.rejectedQty ?? 0),
      reworkQty: acc.reworkQty + (run.reworkQty ?? 0),
      scrapQty: acc.scrapQty + (run.scrapQty ?? 0),
      downtimeMinutes: acc.downtimeMinutes + (run.downtimeMinutes ?? 0),
    }),
    initial,
  );
}
