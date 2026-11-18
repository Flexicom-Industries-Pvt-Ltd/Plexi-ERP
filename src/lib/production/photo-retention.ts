import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { format } from "date-fns";

let lastPruneTimestamp = 0;
const PRUNE_INTERVAL_MS = 4 * 60 * 60 * 1000; // Run at most once every 4 hours per container

/**
 * Prunes evidence photos older than retentionDays (default 3 days)
 * across all production telemetry and inspection tables.
 * Setting photoUrl to null frees up database storage in Neon while preserving
 * the numerical reading, operator, and audit history.
 */
export async function pruneExpiredEvidencePhotos(retentionDays: number = 3) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffDateStr = format(cutoffDate, "yyyy-MM-dd");

  try {
    const [tempResult, driveResult, rmResult, loomReadingResult, rollCuttingResult] = await Promise.all([
      // 1. Tape Plant Temperature Readings
      db.tapePlantTemperatureReading.updateMany({
        where: {
          OR: [
            { date: { lt: cutoffDateStr } },
            { createdAt: { lt: cutoffDate } },
          ],
          photoUrl: { not: null },
        },
        data: { photoUrl: null },
      }),

      // 2. Tape Plant Drive Parameters
      db.tapePlantDriveParameter.updateMany({
        where: {
          OR: [
            { date: { lt: cutoffDateStr } },
            { createdAt: { lt: cutoffDate } },
          ],
          photoUrl: { not: null },
        },
        data: { photoUrl: null },
      }),

      // 3. Tape Plant Raw Material
      db.tapePlantRawMaterial.updateMany({
        where: {
          OR: [
            { date: { lt: cutoffDateStr } },
            { createdAt: { lt: cutoffDate } },
          ],
          photoUrl: { not: null },
        },
        data: { photoUrl: null },
      }),

      // 4. Loom 2H Reading Entries
      db.loomReadingEntry.updateMany({
        where: {
          createdAt: { lt: cutoffDate },
          OR: [
            { photoUrl: { not: null } },
            { intervalPhotos: { not: Prisma.JsonNull } },
          ],
        },
        data: {
          photoUrl: null,
          intervalPhotos: Prisma.JsonNull,
        },
      }),

      // 5. Loom Roll Cutting Entries
      db.loomRollCuttingEntry.updateMany({
        where: {
          createdAt: { lt: cutoffDate },
          photoUrl: { not: null },
        },
        data: { photoUrl: null },
      }),
    ]);

    const totalPruned =
      tempResult.count +
      driveResult.count +
      rmResult.count +
      loomReadingResult.count +
      rollCuttingResult.count;

    return {
      success: true,
      cutoffDate: cutoffDate.toISOString(),
      totalPruned,
      details: {
        tapePlantTemperature: tempResult.count,
        tapePlantDriveParameters: driveResult.count,
        tapePlantRawMaterial: rmResult.count,
        loomReadingEntries: loomReadingResult.count,
        loomRollCutting: rollCuttingResult.count,
      },
    };
  } catch (error: any) {
    console.error("Photo retention pruning failed:", error);
    return {
      success: false,
      error: error.message || "Pruning failed",
      totalPruned: 0,
    };
  }
}

/**
 * Opportunistically triggers a background photo prune if more than 4 hours
 * have elapsed since the last prune in this runtime.
 * Never blocks the calling request.
 */
export function triggerOpportunisticPhotoPrune() {
  const now = Date.now();
  if (now - lastPruneTimestamp < PRUNE_INTERVAL_MS) {
    return;
  }
  lastPruneTimestamp = now;

  // Run in background without awaiting
  pruneExpiredEvidencePhotos(3).catch((err) => {
    console.warn("Background photo pruning encountered error:", err);
  });
}
