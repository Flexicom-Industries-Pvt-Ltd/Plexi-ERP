import { describe, it, expect } from "vitest";
import { withResourceLock, getActiveLockCount } from "../concurrency-lock";

describe("Concurrency Resource Lock (withResourceLock)", () => {
  it("should serialize concurrent executions on identical resource key", async () => {
    const key = "sheet:test-serialization";
    const log: string[] = [];

    const task1 = withResourceLock(key, async () => {
      log.push("start-1");
      await new Promise((r) => setTimeout(r, 40));
      log.push("end-1");
      return "res-1";
    });

    const task2 = withResourceLock(key, async () => {
      log.push("start-2");
      await new Promise((r) => setTimeout(r, 10));
      log.push("end-2");
      return "res-2";
    });

    const [r1, r2] = await Promise.all([task1, task2]);

    expect(r1).toBe("res-1");
    expect(r2).toBe("res-2");
    expect(log).toEqual(["start-1", "end-1", "start-2", "end-2"]);
  });

  it("should allow parallel execution on different resource keys", async () => {
    const log: string[] = [];

    const taskA = withResourceLock("key-A", async () => {
      log.push("start-A");
      await new Promise((r) => setTimeout(r, 30));
      log.push("end-A");
    });

    const taskB = withResourceLock("key-B", async () => {
      log.push("start-B");
      await new Promise((r) => setTimeout(r, 10));
      log.push("end-B");
    });

    await Promise.all([taskA, taskB]);

    // taskB should finish before taskA because they run in parallel
    expect(log.indexOf("start-A")).toBeGreaterThanOrEqual(0);
    expect(log.indexOf("start-B")).toBeGreaterThanOrEqual(0);
    expect(log.indexOf("end-B")).toBeLessThan(log.indexOf("end-A"));
  });

  it("should clean up lock Map entry and prevent memory leak (ERP-007)", async () => {
    const key = "sheet:test-memory-cleanup";

    await withResourceLock(key, async () => {
      return "done";
    });

    // Small tick to ensure promise resolution completes
    await new Promise((r) => setTimeout(r, 10));

    expect(getActiveLockCount()).toBe(0);
  });

  it("should release lock and clean up even when inner task throws exception", async () => {
    const key = "sheet:test-error-handling";

    await expect(
      withResourceLock(key, async () => {
        throw new Error("Task failed unexpectedly");
      })
    ).rejects.toThrow("Task failed unexpectedly");

    await new Promise((r) => setTimeout(r, 10));
    expect(getActiveLockCount()).toBe(0);
  });
});
