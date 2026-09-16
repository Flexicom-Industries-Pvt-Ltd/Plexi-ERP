import { describe, it, expect, beforeEach, vi } from "vitest";
import { taskQueue } from "../task-queue";

describe("Asynchronous Task Queue Engine (TaskQueueEngine)", () => {
  beforeEach(() => {
    taskQueue.clear();
  });

  it("should enqueue a task with PENDING status and generate a unique jobId", async () => {
    const job = await taskQueue.enqueue("CUSTOM_PROCESS", { payloadKey: "test-val" });

    expect(job).toBeDefined();
    expect(job.id).toMatch(/^job_/);
    expect(job.type).toBe("CUSTOM_PROCESS");
    expect(job.progress).toBe(0);
  });

  it("should execute registered handler and transition status from PENDING to COMPLETED", async () => {
    let handlerExecuted = false;

    taskQueue.registerHandler("TEST_ASYNC_CALC", async (job, updateProgress) => {
      handlerExecuted = true;
      await updateProgress(50);
      await updateProgress(100);
      return { totalScore: 98.5 };
    });

    const job = await taskQueue.enqueue("TEST_ASYNC_CALC", { input: 123 });
    expect(["PENDING", "PROCESSING"]).toContain(job.status);

    // Wait for microtask queue to process
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updatedJob = taskQueue.getJob(job.id);
    expect(handlerExecuted).toBe(true);
    expect(updatedJob?.status).toBe("COMPLETED");
    expect(updatedJob?.progress).toBe(100);
    expect(updatedJob?.result).toEqual({ totalScore: 98.5 });
  });

  it("should transition status to FAILED if handler throws an error", async () => {
    taskQueue.registerHandler("FAILING_TASK", async () => {
      throw new Error("Disk write timeout");
    });

    const job = await taskQueue.enqueue("FAILING_TASK", {});
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updatedJob = taskQueue.getJob(job.id);
    expect(updatedJob?.status).toBe("FAILED");
    expect(updatedJob?.error).toBe("Disk write timeout");
  });

  it("should mark task as CANCELLED when requested", async () => {
    taskQueue.registerHandler("LONG_TASK", async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { done: true };
    });

    const job = await taskQueue.enqueue("LONG_TASK", {});
    const cancelled = await taskQueue.cancel(job.id);

    expect(cancelled).toBe(true);
    const updatedJob = taskQueue.getJob(job.id);
    expect(updatedJob?.status).toBe("CANCELLED");
  });
});
