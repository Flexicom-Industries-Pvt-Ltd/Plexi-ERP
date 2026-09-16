/**
 * Enterprise Asynchronous Background Task Queue & Worker Engine for Plexi-ERP
 *
 * Offloads long-running CPU/IO operations (bulk CSV exports, heavy PDF invoices,
 * multi-month variance analyses) to background tasks, keeping HTTP responses sub-100ms.
 */

import { v4 as uuidv4 } from "uuid";

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

class TaskQueueEngine {
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
   * Enqueue a new background task
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

    // Auto-prune old completed/failed jobs if exceeding max history
    if (this.jobs.size >= this.maxHistory) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) this.jobs.delete(oldestKey);
    }

    this.jobs.set(job.id, job);

    // Trigger queue processing asynchronously (do not block caller)
    queueMicrotask(() => {
      this.processQueue().catch((err) =>
        console.error(`[TaskQueueEngine] Error in processQueue:`, err)
      );
    });

    return job;
  }

  /**
   * Get job status and metadata by ID
   */
  getJob<TPayload = unknown, TResult = unknown>(
    id: string
  ): TaskJob<TPayload, TResult> | null {
    const job = this.jobs.get(id);
    return (job as TaskJob<TPayload, TResult>) || null;
  }

  /**
   * Cancel an in-flight or pending job
   */
  async cancel(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || job.status === "COMPLETED" || job.status === "FAILED") {
      return false;
    }
    job.status = "CANCELLED";
    job.completedAt = Date.now();
    return true;
  }

  /**
   * Clear all jobs (useful for testing)
   */
  clear(): void {
    this.jobs.clear();
  }

  /**
   * Internal queue runner
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      for (const [id, job] of Array.from(this.jobs.entries())) {
        if (job.status === "PENDING") {
          const handler = this.handlers.get(job.type);

          if (!handler) {
            job.status = "FAILED";
            job.error = `No handler registered for task type '${job.type}'`;
            job.completedAt = Date.now();
            continue;
          }

          job.status = "PROCESSING";
          job.startedAt = Date.now();

          const updateProgress = async (progress: number) => {
            job.progress = Math.min(100, Math.max(0, Math.round(progress)));
          };

          try {
            const result = await handler(job, updateProgress);
            if (job.status === "PROCESSING") {
              job.status = "COMPLETED";
              job.progress = 100;
              job.result = result;
              job.completedAt = Date.now();
            }
          } catch (err: any) {
            job.status = "FAILED";
            job.error = err?.message || "Task execution failed";
            job.completedAt = Date.now();
          }
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

// Register standard background export handler
taskQueue.registerHandler("EXPORT_AUDIT_LOGS", async (job, updateProgress) => {
  await updateProgress(20);
  // Simulates high-throughput streaming/export processing
  await new Promise((resolve) => setTimeout(resolve, 50));
  await updateProgress(70);
  await new Promise((resolve) => setTimeout(resolve, 50));
  await updateProgress(100);

  return {
    downloadUrl: `/api/logs/export?jobId=${job.id}`,
    rowCount: 2500,
    fileType: "csv",
    generatedAt: new Date().toISOString(),
  };
});

taskQueue.registerHandler("EXPORT_INVENTORY_LEDGER", async (job, updateProgress) => {
  await updateProgress(30);
  await new Promise((resolve) => setTimeout(resolve, 50));
  await updateProgress(80);
  await new Promise((resolve) => setTimeout(resolve, 50));
  await updateProgress(100);

  return {
    downloadUrl: `/api/inventory/transactions?format=csv&jobId=${job.id}`,
    rowCount: 1200,
    fileType: "csv",
    generatedAt: new Date().toISOString(),
  };
});
