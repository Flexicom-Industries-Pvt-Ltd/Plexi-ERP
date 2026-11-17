import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLatestDatabaseSheetUpdate, invalidateSyncCache } from "../db-sync";
import { db } from "../../../../test/prisma-mock";

describe("Database-Backed Realtime Sync (db-sync)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateSyncCache("loom", "reading-sheet");
  });

  it("should query database and return formatted sync result for loom reading-sheet", async () => {
    const fakeDate = new Date("2026-11-17T10:00:00Z");
    vi.mocked(db.loomReadingSheet.findFirst).mockResolvedValueOnce({
      updatedAt: fakeDate,
      preparedBy: "Ramesh Kumar",
      checkedBy: null,
      approvedBy: null,
      status: "DRAFT",
    } as any);

    const update = await getLatestDatabaseSheetUpdate("loom", "reading-sheet", "2026-11-17", "Day Shift");

    expect(db.loomReadingSheet.findFirst).toHaveBeenCalled();
    expect(update).not.toBeNull();
    expect(update?.timestamp).toBe(fakeDate.getTime());
    expect(update?.user.name).toBe("Ramesh Kumar");
    expect(update?.action).toBe("DRAFT");
  });

  it("should micro-cache result within 1500ms to avoid database thrashing", async () => {
    const fakeDate = new Date("2026-11-17T11:00:00Z");
    vi.mocked(db.loomRollCuttingReport.findFirst).mockResolvedValue({
      updatedAt: fakeDate,
      preparedBy: "Anita Sharma",
      supervisorName: "Sanjay",
      status: "SUBMITTED",
    } as any);

    invalidateSyncCache("loom", "roll-cutting");

    // First call touches db
    const call1 = await getLatestDatabaseSheetUpdate("loom", "roll-cutting", "2026-11-17", "Day Shift");
    // Second call immediately after should hit micro-cache
    const call2 = await getLatestDatabaseSheetUpdate("loom", "roll-cutting", "2026-11-17", "Day Shift");

    expect(db.loomRollCuttingReport.findFirst).toHaveBeenCalledTimes(1);
    expect(call1?.timestamp).toBe(call2?.timestamp);
  });

  it("should invalidate micro-cache when invalidateSyncCache is called", async () => {
    const fakeDate = new Date("2026-11-17T12:00:00Z");
    vi.mocked(db.valvomaticDailyReport.findFirst).mockResolvedValue({
      updatedAt: fakeDate,
      operatorName: "Vikram",
      supervisorName: null,
      status: "DRAFT",
    } as any);

    invalidateSyncCache("valvomatic", "daily-report");

    await getLatestDatabaseSheetUpdate("valvomatic", "daily-report", "2026-11-17", "Day Shift");
    expect(db.valvomaticDailyReport.findFirst).toHaveBeenCalledTimes(1);

    // Invalidate and call again -> must hit DB second time
    invalidateSyncCache("valvomatic", "daily-report");
    await getLatestDatabaseSheetUpdate("valvomatic", "daily-report", "2026-11-17", "Day Shift");
    expect(db.valvomaticDailyReport.findFirst).toHaveBeenCalledTimes(2);
  });
});
