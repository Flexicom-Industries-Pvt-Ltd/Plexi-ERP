import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShiftDigestService } from "../shift-digest.service";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    productionRun: {
      findMany: vi.fn(),
    },
    maintenanceLog: {
      findMany: vi.fn(),
    },
  },
}));

describe("ShiftDigestService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should correctly aggregate production variance, scrap, and downtime for Shift A", async () => {
    vi.mocked(db.productionRun.findMany).mockResolvedValueOnce([
      {
        id: "run-1",
        targetQty: 1000,
        actualQty: 950,
        scrapQty: 25,
        planLine: {
          phase: "BOBBIN",
        },
      },
      {
        id: "run-2",
        targetQty: 2000,
        actualQty: 1980,
        scrapQty: 40,
        planLine: {
          phase: "LOOM",
        },
      },
    ] as any);

    vi.mocked(db.maintenanceLog.findMany).mockResolvedValueOnce([
      {
        id: "m-1",
        downtimeMinutes: 45,
      },
      {
        id: "m-2",
        downtimeMinutes: 15,
      },
    ] as any);

    const result = await ShiftDigestService.generateShiftDigest({ shift: "A" });

    expect(result.shift).toBe("A");
    expect(result.metrics.totalPlannedUnits).toBe(3000);
    expect(result.metrics.totalActualUnits).toBe(2930);
    expect(result.metrics.varianceUnits).toBe(-70);
    expect(result.metrics.achievementPercentage).toBe(97.67);
    expect(result.metrics.totalScrapKg).toBe(65);
    expect(result.metrics.totalDowntimeMinutes).toBe(60);
    expect(result.metrics.breakdownCount).toBe(2);
    expect(result.phaseBreakdown).toHaveLength(2);
    expect(result.executiveSummary).toContain("97.67%");
  });

  it("should handle shifts with zero production runs gracefully", async () => {
    vi.mocked(db.productionRun.findMany).mockResolvedValueOnce([]);
    vi.mocked(db.maintenanceLog.findMany).mockResolvedValueOnce([]);

    const result = await ShiftDigestService.generateShiftDigest({ shift: "C" });

    expect(result.metrics.totalPlannedUnits).toBe(0);
    expect(result.metrics.totalActualUnits).toBe(0);
    expect(result.metrics.achievementPercentage).toBe(100);
    expect(result.metrics.totalDowntimeMinutes).toBe(0);
  });
});
