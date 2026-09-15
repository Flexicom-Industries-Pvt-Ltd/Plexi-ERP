import { describe, it, expect, vi } from "vitest";
import { GET as getLive } from "../live/route";
import { GET as getReady } from "../ready/route";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn(),
  },
}));

describe("Health Probes API (/api/health)", () => {
  it("GET /api/health/live should return 200 and process telemetry", async () => {
    const response = await getLive();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("UP");
    expect(data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(data.process.nodeVersion).toBeDefined();
    expect(data.process.memoryUsageMb.heapUsed).toBeGreaterThan(0);
  });

  it("GET /api/health/ready should return 200 READY when database is healthy", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }] as never);

    const response = await getReady();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("READY");
    expect(data.checks.database.status).toBe("UP");
    expect(data.checks.cache.status).toBe("UP");
  });

  it("GET /api/health/ready should return 503 NOT_READY when database is down", async () => {
    vi.mocked(db.$queryRaw).mockRejectedValueOnce(new Error("Connection refused"));

    const response = await getReady();
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.status).toBe("NOT_READY");
    expect(data.checks.database.status).toBe("DOWN");
    expect(data.checks.database.error).toBe("Connection refused");
  });
});
