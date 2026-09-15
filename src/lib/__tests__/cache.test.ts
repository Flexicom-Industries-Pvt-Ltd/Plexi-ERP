import { describe, it, expect, beforeEach } from "vitest";
import { cache } from "../cache";

describe("Cache Manager (MemoryCacheManager)", () => {
  beforeEach(async () => {
    await cache.clear();
  });

  it("should set and retrieve values from cache", async () => {
    await cache.set("test:key1", { name: "Extruder-1", speed: 450 });
    const result = await cache.get<{ name: string; speed: number }>("test:key1");

    expect(result).toBeDefined();
    expect(result?.name).toBe("Extruder-1");
    expect(result?.speed).toBe(450);
  });

  it("should return null for non-existent keys", async () => {
    const result = await cache.get("non-existent-key");
    expect(result).toBeNull();
  });

  it("should delete specific keys", async () => {
    await cache.set("test:key2", "temp-value");
    expect(await cache.has("test:key2")).toBe(true);

    const deleted = await cache.del("test:key2");
    expect(deleted).toBe(true);
    expect(await cache.get("test:key2")).toBeNull();
  });

  it("should expire items when TTL is reached", async () => {
    // Set item with negative / 0 TTL or simulate time
    await cache.set("test:expired", "value", -1);
    const result = await cache.get("test:expired");
    expect(result).toBeNull();
  });

  it("should invalidate keys matching a pattern", async () => {
    await cache.set("master:machine:1", { id: "1" });
    await cache.set("master:machine:2", { id: "2" });
    await cache.set("master:role:admin", { id: "admin" });
    await cache.set("user:profile:10", { id: "10" });

    const invalidatedCount = await cache.invalidatePattern("master:machine:*");
    expect(invalidatedCount).toBe(2);

    expect(await cache.get("master:machine:1")).toBeNull();
    expect(await cache.get("master:machine:2")).toBeNull();
    expect(await cache.get("master:role:admin")).toBeDefined();
    expect(await cache.get("user:profile:10")).toBeDefined();
  });

  it("should use remember helper to memoize factory calls", async () => {
    let callCount = 0;
    const expensiveComputation = async () => {
      callCount += 1;
      return { totalLooms: 62, activeLooms: 58 };
    };

    const firstResult = await cache.remember("stats:looms", 60, expensiveComputation);
    expect(firstResult.totalLooms).toBe(62);
    expect(callCount).toBe(1);

    const secondResult = await cache.remember("stats:looms", 60, expensiveComputation);
    expect(secondResult.totalLooms).toBe(62);
    expect(callCount).toBe(1); // Factory was NOT called second time
  });
});
