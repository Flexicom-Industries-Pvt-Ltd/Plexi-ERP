import { db } from "@/lib/db";

export interface DatabaseSyncResult {
  timestamp: number;
  user: {
    name: string;
    role: string;
    email?: string | null;
  };
  action: string;
}

// In-memory micro-cache (1.5 seconds) to avoid database hammering under multi-user concurrency
const statusCache = new Map<string, { result: DatabaseSyncResult | null; cachedAt: number }>();
const CACHE_TTL_MS = 1500;

export function invalidateSyncCache(moduleName: string, sheetName?: string): void {
  const prefix = `${moduleName.toLowerCase()}:${(sheetName || "").toLowerCase()}`;
  for (const key of statusCache.keys()) {
    if (key.startsWith(prefix)) {
      statusCache.delete(key);
    }
  }
}

/**
 * Resolves the true latest modification timestamp and updater across serverless instances
 * by querying the authoritative Neon PostgreSQL database with index-optimized micro-queries.
 */
export async function getLatestDatabaseSheetUpdate(
  mod: string,
  sheet?: string,
  date?: string,
  shift?: string
): Promise<DatabaseSyncResult | null> {
  const normMod = mod.toLowerCase();
  const normSheet = (sheet || "default").toLowerCase();
  const cacheKey = `${normMod}:${normSheet}:${date || ""}:${shift || ""}`;

  const now = Date.now();
  const cached = statusCache.get(cacheKey);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.result;
  }

  let result: DatabaseSyncResult | null = null;

  try {
    switch (normMod) {
      case "loom": {
        if (normSheet === "reading-sheet" || normSheet === "summary" || normSheet === "reports") {
          const row = await db.loomReadingSheet.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, preparedBy: true, checkedBy: true, approvedBy: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: {
                name: row.preparedBy || row.checkedBy || row.approvedBy || "Loom Operator",
                role: "Operator",
              },
              action: row.status || "UPDATE",
            };
          }
        } else if (normSheet === "roll-cutting" || normSheet === "roll-stock") {
          const row = await db.loomRollCuttingReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, preparedBy: true, supervisorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: {
                name: row.supervisorName || row.preparedBy || "Loom Supervisor",
                role: "Supervisor",
              },
              action: row.status || "UPDATE",
            };
          }
        } else if (normSheet === "changeover") {
          const row = await db.loomChangeover.findFirst({
            where: {
              ...(date ? { targetDate: date } : {}),
              ...(shift ? { targetShiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, updatedBy: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: {
                name: row.updatedBy || "Loom Operator",
                role: "Operator",
              },
              action: row.status || "UPDATE",
            };
          }
        }
        break;
      }

      case "tape-plant": {
        if (normSheet === "planning") {
          const row = await db.tapePlantPlan.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: "Tape Plant Planner", role: "Planner" },
              action: row.status || "UPDATE",
            };
          }
        } else if (normSheet === "temperature") {
          const row = await db.tapePlantTemperatureReading.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftId: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: row.operatorName || "Tape Plant Operator", role: "Operator" },
              action: "UPDATE",
            };
          }
        } else if (normSheet === "drive-parameter" || normSheet === "drive-parameters") {
          const row = await db.tapePlantDriveParameter.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftId: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: row.operatorName || "Tape Plant Operator", role: "Operator" },
              action: "UPDATE",
            };
          }
        } else if (normSheet === "raw-material") {
          const row = await db.tapePlantRawMaterial.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftId: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: row.operatorName || "Tape Plant Operator", role: "Operator" },
              action: "UPDATE",
            };
          }
        } else if (normSheet === "post-production") {
          const row = await db.tapePlantPostProduction.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftId: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: row.operatorName || "Tape Plant Operator", role: "Operator" },
              action: "UPDATE",
            };
          }
        } else if (normSheet === "bobbin-issue" || normSheet === "bobbin-stock") {
          const row = await db.tapePlantBobbinIssue.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, issuedBy: true, receivedBy: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: row.issuedBy || row.receivedBy || "Bobbin Issuer", role: "Operator" },
              action: "UPDATE",
            };
          }
        }
        break;
      }

      case "lamination": {
        if (normSheet === "daily-report" || normSheet === "reports" || normSheet === "summary") {
          const row = await db.laminationProductionReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, supervisorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: {
                name: row.operatorName || row.supervisorName || "Lamination Operator",
                role: "Operator",
              },
              action: row.status || "UPDATE",
            };
          }
        } else if (normSheet === "raw-materials") {
          const row = await db.laminationRawMaterialReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: row.operatorName || "Lamination Operator", role: "Operator" },
              action: row.status || "UPDATE",
            };
          }
        } else if (normSheet === "wastage") {
          const row = await db.laminationWastageReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: row.operatorName || "Lamination Operator", role: "Operator" },
              action: row.status || "UPDATE",
            };
          }
        }
        break;
      }

      case "printing": {
        if (normSheet === "daily-report" || normSheet === "reports" || normSheet === "summary") {
          const row = await db.printingDailyReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, supervisorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: {
                name: row.operatorName || row.supervisorName || "Printing Operator",
                role: "Operator",
              },
              action: row.status || "UPDATE",
            };
          }
        } else if (normSheet === "raw-materials") {
          const row = await db.printingRawMaterialReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: row.operatorName || "Printing Operator", role: "Operator" },
              action: row.status || "UPDATE",
            };
          }
        } else if (normSheet === "wastage") {
          const row = await db.printingWastageReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: { name: row.operatorName || "Printing Operator", role: "Operator" },
              action: row.status || "UPDATE",
            };
          }
        }
        break;
      }

      case "convertex": {
        if (normSheet === "daily-report" || normSheet === "reports" || normSheet === "summary") {
          const row = await db.convertexDailyReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, supervisorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: {
                name: row.operatorName || row.supervisorName || "Convertex Operator",
                role: "Operator",
              },
              action: row.status || "UPDATE",
            };
          }
        } else if (normSheet === "wastage") {
          const row = await db.convertexWastageReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, supervisorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: {
                name: row.operatorName || row.supervisorName || "Convertex Operator",
                role: "Operator",
              },
              action: row.status || "UPDATE",
            };
          }
        }
        break;
      }

      case "valvomatic": {
        if (normSheet === "daily-report" || normSheet === "reports" || normSheet === "summary") {
          const row = await db.valvomaticDailyReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, supervisorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: {
                name: row.operatorName || row.supervisorName || "Valvomatic Operator",
                role: "Operator",
              },
              action: row.status || "UPDATE",
            };
          }
        } else if (normSheet === "wastage") {
          const row = await db.valvomaticWastageReport.findFirst({
            where: {
              ...(date ? { date } : {}),
              ...(shift ? { shiftName: shift } : {}),
            },
            orderBy: { updatedAt: "desc" },
            select: { updatedAt: true, operatorName: true, supervisorName: true, status: true },
          });
          if (row) {
            result = {
              timestamp: row.updatedAt.getTime(),
              user: {
                name: row.operatorName || row.supervisorName || "Valvomatic Operator",
                role: "Operator",
              },
              action: row.status || "UPDATE",
            };
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error(`[db-sync] Error checking database for ${normMod}:${normSheet}:`, error);
  }

  statusCache.set(cacheKey, { result, cachedAt: now });
  return result;
}
