import { describe, it, expect, vi, beforeEach } from "vitest";
import { pruneExpiredEvidencePhotos } from "../photo-retention";
import { db } from "@/lib/db";

// Mock database operations
vi.mock("@/lib/db", () => ({
  db: {
    tapePlantTemperatureReading: {
      updateMany: vi.fn(),
    },
    tapePlantDriveParameter: {
      updateMany: vi.fn(),
    },
    tapePlantRawMaterial: {
      updateMany: vi.fn(),
    },
    loomReadingEntry: {
      updateMany: vi.fn(),
    },
    loomRollCuttingEntry: {
      updateMany: vi.fn(),
    },
  },
}));

describe("Photo Retention & 3-Day Auto-Purge Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully updates all 5 production tables and nulls photoUrl older than 3 days", async () => {
    (db.tapePlantTemperatureReading.updateMany as any).mockResolvedValue({ count: 12 });
    (db.tapePlantDriveParameter.updateMany as any).mockResolvedValue({ count: 5 });
    (db.tapePlantRawMaterial.updateMany as any).mockResolvedValue({ count: 3 });
    (db.loomReadingEntry.updateMany as any).mockResolvedValue({ count: 8 });
    (db.loomRollCuttingEntry.updateMany as any).mockResolvedValue({ count: 4 });

    const result = await pruneExpiredEvidencePhotos(3);

    expect(result.success).toBe(true);
    expect(result.totalPruned).toBe(32);
    expect(result.details?.tapePlantTemperature).toBe(12);
    expect(result.details?.tapePlantDriveParameters).toBe(5);
    expect(result.details?.tapePlantRawMaterial).toBe(3);
    expect(result.details?.loomReadingEntries).toBe(8);
    expect(result.details?.loomRollCutting).toBe(4);

    expect(db.tapePlantTemperatureReading.updateMany).toHaveBeenCalledTimes(1);
    expect(db.tapePlantDriveParameter.updateMany).toHaveBeenCalledTimes(1);
    expect(db.tapePlantRawMaterial.updateMany).toHaveBeenCalledTimes(1);
    expect(db.loomReadingEntry.updateMany).toHaveBeenCalledTimes(1);
    expect(db.loomRollCuttingEntry.updateMany).toHaveBeenCalledTimes(1);
  });

  it("handles database exceptions gracefully without crashing", async () => {
    (db.tapePlantTemperatureReading.updateMany as any).mockRejectedValue(new Error("Connection reset"));

    const result = await pruneExpiredEvidencePhotos(3);

    expect(result.success).toBe(false);
    expect(result.totalPruned).toBe(0);
    expect(result.error).toBe("Connection reset");
  });
});
