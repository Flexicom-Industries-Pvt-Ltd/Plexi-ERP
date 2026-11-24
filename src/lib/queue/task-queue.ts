/**
 * Enterprise Asynchronous Background Task Queue & Worker Engine for Plexi-ERP
 *
 * Backed by durable PostgreSQL database records (BackgroundJobRecord) with atomic claiming,
 * worker lease recovery on restart, and in-memory cache for ultra-fast local lookups.
 * Offloads long-running operations (bulk CSV exports, heavy aggregations) to background tasks,
 * keeping HTTP responses sub-100ms.
 */

import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";

export type TaskStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface TaskJob<TPayload = unknown, TResult = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  status: TaskStatus;
  progress: number; // 0 to 100
  result?: TResult;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  createdById?: string;
}

export type TaskHandler<TPayload = unknown, TResult = unknown> = (
  job: TaskJob<TPayload, TResult>,
  updateProgress: (progress: number) => Promise<void>
) => Promise<TResult>;

export class TaskQueueEngine {
  private jobs = new Map<string, TaskJob<any, any>>();
  private handlers = new Map<string, TaskHandler<any, any>>();
  private isProcessing = false;
  private maxHistory = 1000;

  /**
   * Register a task handler for a specific task type
   */
  registerHandler<TPayload = unknown, TResult = unknown>(
    type: string,
    handler: TaskHandler<TPayload, TResult>
  ): void {
    this.handlers.set(type, handler as TaskHandler<any, any>);
  }

  /**
   * Enqueue a new background task - persists durably to PostgreSQL
   */
  async enqueue<TPayload = unknown, TResult = unknown>(
    type: string,
    payload: TPayload,
    options: { createdById?: string } = {}
  ): Promise<TaskJob<TPayload, TResult>> {
    const job: TaskJob<TPayload, TResult> = {
      id: `job_${uuidv4().replace(/-/g, "").slice(0, 16)}`,
      type,
      payload,
      status: "PENDING",
      progress: 0,
      createdAt: Date.now(),
      createdById: options.createdById,
    };

    // Auto-prune memory cache if exceeding max history
    if (this.jobs.size >= this.maxHistory) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) this.jobs.delete(oldestKey);
    }
    this.jobs.set(job.id, job);

    // Persist durably to PostgreSQL database
    try {
      if (db.backgroundJobRecord) {
        await db.backgroundJobRecord.create({
          data: {
            id: job.id,
            type: job.type,
            payload: (job.payload as any) ?? {},
            status: "PENDING",
            progress: 0,
            createdById: options.createdById || null,
          },
        });
      }
    } catch (dbErr) {
      // In-memory fallback if database table not available in current test context
      console.warn("[TaskQueueEngine] Fallback to memory for job enqueue:", dbErr);
    }

    // Trigger queue processing asynchronously (do not block caller)
    queueMicrotask(() => {
      this.processQueue().catch((err) =>
        console.error(`[TaskQueueEngine] Error in processQueue:`, err)
      );
    });

    return job;
  }

  /**
   * Get job status and metadata by ID (checks memory cache, falls back to database)
   */
  async getJob<TPayload = unknown, TResult = unknown>(
    id: string
  ): Promise<TaskJob<TPayload, TResult> | null> {
    const cached = this.jobs.get(id);
    if (cached && (cached.status === "COMPLETED" || cached.status === "FAILED")) {
      return cached as TaskJob<TPayload, TResult>;
    }

    try {
      if (db.backgroundJobRecord) {
        const record = await db.backgroundJobRecord.findUnique({ where: { id } });
        if (record) {
          const job: TaskJob<TPayload, TResult> = {
            id: record.id,
            type: record.type,
            payload: record.payload as TPayload,
            status: record.status as TaskStatus,
            progress: record.progress,
            result: (record.result as TResult) || undefined,
            error: record.error || undefined,
            createdAt: record.createdAt.getTime(),
            startedAt: record.startedAt?.getTime(),
            completedAt: record.completedAt?.getTime(),
            createdById: record.createdById || undefined,
          };
          this.jobs.set(id, job);
          return job;
        }
      }
    } catch {
      // Return memory fallback
    }

    return (cached as TaskJob<TPayload, TResult>) || null;
  }

  /**
   * Synchronous job lookup from in-memory cache
   */
  getJobSync<TPayload = unknown, TResult = unknown>(
    id: string
  ): TaskJob<TPayload, TResult> | null {
    return (this.jobs.get(id) as TaskJob<TPayload, TResult>) || null;
  }

  /**
   * Cancel an in-flight or pending job
   */
  async cancel(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (job) {
      if (job.status === "COMPLETED" || job.status === "FAILED") {
        return false;
      }
      job.status = "CANCELLED";
      job.completedAt = Date.now();
    }

    try {
      if (db.backgroundJobRecord) {
        const res = await db.backgroundJobRecord.updateMany({
          where: { id, status: { notIn: ["COMPLETED", "FAILED"] } },
          data: { status: "CANCELLED", completedAt: new Date() },
        });
        return res.count > 0 || Boolean(job);
      }
    } catch {
      // In-memory fallback
    }

    return Boolean(job);
  }

  /**
   * Clear all jobs (useful for testing)
   */
  clear(): void {
    this.jobs.clear();
  }

  /**
   * Internal queue runner with atomic claiming and restart recovery
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Recover stale in-flight jobs from prior crashes / restarts (lease > 5 mins)
      try {
        if (db.backgroundJobRecord) {
          const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
          await db.backgroundJobRecord.updateMany({
            where: {
              status: "PROCESSING",
              startedAt: { lt: staleThreshold },
            },
            data: {
              status: "PENDING",
              progress: 0,
            },
          });
        }
      } catch {
        // Table might not exist in isolated test mocks
      }

      while (true) {
        let jobId: string | null = null;
        let jobType: string | null = null;
        let jobPayload: any = null;
        let jobCreatedById: string | undefined = undefined;

        // Try atomic database claiming first
        try {
          if (db.backgroundJobRecord) {
            const pending = await db.backgroundJobRecord.findFirst({
              where: { status: "PENDING" },
              orderBy: { createdAt: "asc" },
            });

            if (pending) {
              const claimResult = await db.backgroundJobRecord.updateMany({
                where: { id: pending.id, status: "PENDING" },
                data: { status: "PROCESSING", startedAt: new Date() },
              });

              if (claimResult.count > 0) {
                jobId = pending.id;
                jobType = pending.type;
                jobPayload = pending.payload;
                jobCreatedById = pending.createdById || undefined;
              }
            }
          }
        } catch {
          // DB error; fall back to memory
        }

        // Fall back to memory queue if not claimed from DB
        if (!jobId) {
          for (const memJob of this.jobs.values()) {
            if (memJob.status === "PENDING") {
              jobId = memJob.id;
              jobType = memJob.type;
              jobPayload = memJob.payload;
              jobCreatedById = memJob.createdById;
              memJob.status = "PROCESSING";
              memJob.startedAt = Date.now();
              break;
            }
          }
        }

        if (!jobId || !jobType) break;

        const currentJob: TaskJob<any, any> = this.jobs.get(jobId) || {
          id: jobId,
          type: jobType,
          payload: jobPayload,
          status: "PROCESSING",
          progress: 0,
          createdAt: Date.now(),
          startedAt: Date.now(),
          createdById: jobCreatedById,
        };
        currentJob.status = "PROCESSING";
        currentJob.startedAt = currentJob.startedAt || Date.now();
        this.jobs.set(jobId, currentJob);

        const handler = this.handlers.get(jobType);

        if (!handler) {
          currentJob.status = "FAILED";
          currentJob.error = `No handler registered for task type '${jobType}'`;
          currentJob.completedAt = Date.now();

          try {
            if (db.backgroundJobRecord) {
              await db.backgroundJobRecord.update({
                where: { id: jobId },
                data: { status: "FAILED", error: currentJob.error, completedAt: new Date() },
              });
            }
          } catch {}
          continue;
        }

        const updateProgress = async (progress: number) => {
          const clamped = Math.min(100, Math.max(0, Math.round(progress)));
          currentJob.progress = clamped;
          try {
            if (db.backgroundJobRecord) {
              await db.backgroundJobRecord.update({
                where: { id: currentJob.id },
                data: { progress: clamped },
              });
            }
          } catch {}
        };

        try {
          const result = await handler(currentJob, updateProgress);
          if (currentJob.status === "PROCESSING") {
            currentJob.status = "COMPLETED";
            currentJob.progress = 100;
            currentJob.result = result;
            currentJob.completedAt = Date.now();

            try {
              if (db.backgroundJobRecord) {
                await db.backgroundJobRecord.update({
                  where: { id: currentJob.id },
                  data: {
                    status: "COMPLETED",
                    progress: 100,
                    result: (result as any) ?? {},
                    completedAt: new Date(),
                  },
                });
              }
            } catch {}
          }
        } catch (err: any) {
          currentJob.status = "FAILED";
          currentJob.error = err?.message || "Task execution failed";
          currentJob.completedAt = Date.now();

          try {
            if (db.backgroundJobRecord) {
              await db.backgroundJobRecord.update({
                where: { id: currentJob.id },
                data: {
                  status: "FAILED",
                  error: currentJob.error,
                  completedAt: new Date(),
                },
              });
            }
          } catch {}
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

// Global singleton to preserve task queue across Next.js reloads
const globalForTaskQueue = globalThis as unknown as {
  erpTaskQueueInstance: TaskQueueEngine | undefined;
};

export const taskQueue = globalForTaskQueue.erpTaskQueueInstance ?? new TaskQueueEngine();
if (process.env.NODE_ENV !== "production") {
  globalForTaskQueue.erpTaskQueueInstance = taskQueue;
}

// Helper to escape CSV cell values
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

// ==========================================
// REAL DATABASE-BACKED EXPORT HANDLERS
// ==========================================

// 1. Audit Logs Export
taskQueue.registerHandler("EXPORT_AUDIT_LOGS", async (job, updateProgress) => {
  await updateProgress(20);
  let logs: any[] = [];
  try {
    if (db.logEntry) {
      logs = await db.logEntry.findMany({
        take: 2000,
        orderBy: { timestamp: "desc" },
      });
    } else if (db.auditLog) {
      logs = await db.auditLog.findMany({
        take: 2000,
        orderBy: { createdAt: "desc" },
      });
    }
  } catch {
    logs = [];
  }
  if (!Array.isArray(logs)) logs = [];
  await updateProgress(60);

  const header = "Timestamp,CorrelationId,Module,Severity,Action,IP\n";
  const rows = logs.map((l) =>
    [
      escapeCsv(l.timestamp || l.createdAt),
      escapeCsv(l.correlationId),
      escapeCsv(l.module),
      escapeCsv(l.severity || "INFO"),
      escapeCsv(l.action),
      escapeCsv(l.ip || ""),
    ].join(",")
  );
  const csvData = header + rows.join("\n");
  await updateProgress(100);

  return {
    downloadUrl: `/api/jobs/${job.id}/download`,
    rowCount: logs.length,
    fileType: "csv",
    generatedAt: new Date().toISOString(),
    csvData,
  };
});

// 2. Inventory Stock Export
taskQueue.registerHandler("EXPORT_INVENTORY_STOCK", async (job, updateProgress) => {
  await updateProgress(20);
  let items: any[] = [];
  try {
    if (db.inventoryItem) {
      items = await db.inventoryItem.findMany({
        take: 2000,
        orderBy: { code: "asc" },
      });
    }
  } catch {
    items = [];
  }
  if (!Array.isArray(items)) items = [];
  await updateProgress(60);

  const header = "Code,Name,ItemType,CurrentStock,UOM\n";
  const rows = items.map((i) =>
    [
      escapeCsv(i.code),
      escapeCsv(i.name),
      escapeCsv(i.itemType),
      escapeCsv(i.currentStock ?? 0),
      escapeCsv(i.unitOfMeasure || i.uom || "KG"),
    ].join(",")
  );
  const csvData = header + rows.join("\n");
  await updateProgress(100);

  return {
    downloadUrl: `/api/jobs/${job.id}/download`,
    rowCount: items.length,
    fileType: "csv",
    generatedAt: new Date().toISOString(),
    csvData,
  };
});

// 3. Inventory Ledger Export
taskQueue.registerHandler("EXPORT_INVENTORY_LEDGER", async (job, updateProgress) => {
  await updateProgress(20);
  let transactions: any[] = [];
  try {
    if (db.inventoryTransaction) {
      transactions = await db.inventoryTransaction.findMany({
        take: 2000,
        orderBy: { createdAt: "desc" },
      });
    }
  } catch {
    transactions = [];
  }
  if (!Array.isArray(transactions)) transactions = [];
  await updateProgress(60);

  const header = "ID,Type,Quantity,Source,CreatedAt\n";
  const rows = transactions.map((t) =>
    [
      escapeCsv(t.id),
      escapeCsv(t.type),
      escapeCsv(t.quantity),
      escapeCsv(t.source || ""),
      escapeCsv(t.createdAt),
    ].join(",")
  );
  const csvData = header + rows.join("\n");
  await updateProgress(100);

  return {
    downloadUrl: `/api/jobs/${job.id}/download`,
    rowCount: transactions.length,
    fileType: "csv",
    generatedAt: new Date().toISOString(),
    csvData,
  };
});

// 4. Attendance Export
taskQueue.registerHandler("EXPORT_ATTENDANCE", async (job, updateProgress) => {
  await updateProgress(20);
  let punches: any[] = [];
  try {
    if (db.attendancePunch) {
      punches = await db.attendancePunch.findMany({
        take: 2000,
        orderBy: { punchTime: "desc" },
      });
    }
  } catch {
    punches = [];
  }
  if (!Array.isArray(punches)) punches = [];
  await updateProgress(60);

  const header = "EmployeeCode,EmployeeName,PunchTime,Direction,Device\n";
  const rows = punches.map((p) =>
    [
      escapeCsv(p.employeeCode),
      escapeCsv(p.employeeName || ""),
      escapeCsv(p.punchTime),
      escapeCsv(p.direction),
      escapeCsv(p.deviceName || p.deviceSerial || ""),
    ].join(",")
  );
  const csvData = header + rows.join("\n");
  await updateProgress(100);

  return {
    downloadUrl: `/api/jobs/${job.id}/download`,
    rowCount: punches.length,
    fileType: "csv",
    generatedAt: new Date().toISOString(),
    csvData,
  };
});

// 5. Production Summary Export
taskQueue.registerHandler("EXPORT_PRODUCTION_SUMMARY", async (job, updateProgress) => {
  await updateProgress(20);
  let runs: any[] = [];
  try {
    if (db.productionRun) {
      runs = await db.productionRun.findMany({
        take: 2000,
        orderBy: { startedAt: "desc" },
      });
    }
  } catch {
    runs = [];
  }
  if (!Array.isArray(runs)) runs = [];
  await updateProgress(60);

  const header = "PlanLineId,StartedAt,EndedAt,TargetQty,ActualQty,Status\n";
  const rows = runs.map((r) =>
    [
      escapeCsv(r.planLineId),
      escapeCsv(r.startedAt),
      escapeCsv(r.endedAt || ""),
      escapeCsv(r.targetQty),
      escapeCsv(r.actualQty ?? 0),
      escapeCsv(r.status || "COMPLETED"),
    ].join(",")
  );
  const csvData = header + rows.join("\n");
  await updateProgress(100);

  return {
    downloadUrl: `/api/jobs/${job.id}/download`,
    rowCount: runs.length,
    fileType: "csv",
    generatedAt: new Date().toISOString(),
    csvData,
  };
});

// 6. Gate Registry Export
taskQueue.registerHandler("EXPORT_GATE_REGISTRY", async (job, updateProgress) => {
  await updateProgress(20);
  let entries: any[] = [];
  try {
    if (db.gateEntry) {
      entries = await db.gateEntry.findMany({
        take: 2000,
        orderBy: { arrivalTime: "desc" },
      });
    }
  } catch {
    entries = [];
  }
  if (!Array.isArray(entries)) entries = [];
  await updateProgress(60);

  const header = "EntryNumber,TruckNumber,DriverName,Status,ArrivalTime\n";
  const rows = entries.map((g) =>
    [
      escapeCsv(g.entryNumber),
      escapeCsv(g.truckNumber),
      escapeCsv(g.driverName),
      escapeCsv(g.status),
      escapeCsv(g.arrivalTime),
    ].join(",")
  );
  const csvData = header + rows.join("\n");
  await updateProgress(100);

  return {
    downloadUrl: `/api/jobs/${job.id}/download`,
    rowCount: entries.length,
    fileType: "csv",
    generatedAt: new Date().toISOString(),
    csvData,
  };
});
