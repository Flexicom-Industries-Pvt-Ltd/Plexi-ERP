import { describe, it, expect, vi, beforeEach } from "vitest";
import { RecyclingService } from "../recycling.service";
import { db } from "../../../test/prisma-mock";
import {
  RecyclingStatus,
  TransactionType,
} from "@/generated/prisma";

describe("RecyclingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateBatchNumber", () => {
    it("should generate initial sequence number if no previous batch exists today", async () => {
      vi.mocked(db.recyclingBatch.findFirst).mockResolvedValue(null);

      const num = await RecyclingService.generateBatchNumber();

      expect(num).toMatch(/^RP-\d{8}-0001$/);
    });

    it("should increment sequence number from latest batch", async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      vi.mocked(db.recyclingBatch.findFirst).mockResolvedValue({
        batchNumber: `RP-${today}-0008`,
      } as any);

      const num = await RecyclingService.generateBatchNumber();

      expect(num).toBe(`RP-${today}-0009`);
    });
  });

  describe("getAvailableScrapForRecycling", () => {
    it("should fetch scrap records where isRecycled is false", async () => {
      const mockScraps = [
        { id: "scr-1", scrapNumber: "SCR-20260915-0001", quantity: 50, isRecycled: false },
      ];

      vi.mocked(db.scrapRecord.findMany).mockResolvedValue(mockScraps as any);

      const result = await RecyclingService.getAvailableScrapForRecycling();

      expect(result).toEqual(mockScraps);
      expect(db.scrapRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isRecycled: false, recyclingBatchId: null },
        })
      );
    });
  });

  describe("listRecyclingBatches", () => {
    it("should list batches and compute total count", async () => {
      const mockBatches = [
        {
          id: "rb-1",
          batchNumber: "RP-20260915-0001",
          inputScrapQty: 100,
          outputRpQty: 92,
          status: RecyclingStatus.COMPLETED,
        },
      ];

      vi.mocked(db.recyclingBatch.findMany).mockResolvedValue(mockBatches as any);
      vi.mocked(db.recyclingBatch.count).mockResolvedValue(1);

      const result = await RecyclingService.listRecyclingBatches();

      expect(result.batches).toHaveLength(1);
      expect(result.batches[0].batchNumber).toBe("RP-20260915-0001");
      expect(db.recyclingBatch.findMany).toHaveBeenCalled();
    });

    it("should apply search and status filters with pagination", async () => {
      vi.mocked(db.recyclingBatch.findMany).mockResolvedValue([]);
      vi.mocked(db.recyclingBatch.count).mockResolvedValue(25);

      const result = await RecyclingService.listRecyclingBatches(
        {
          status: RecyclingStatus.IN_PROGRESS,
          granuleGrade: "RP-PP-GRADE-A",
          search: "RP-2026",
          page: 1,
          limit: 10,
        },
        { paginate: true }
      );

      expect(db.recyclingBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RecyclingStatus.IN_PROGRESS,
            granuleGrade: "RP-PP-GRADE-A",
            OR: expect.any(Array),
          }),
        })
      );
      expect(result.meta).toBeDefined();
      expect(result.meta?.total).toBe(25);
      expect(result.meta?.totalPages).toBe(3);
    });
  });

  describe("getRecyclingBatchById", () => {
    it("should fetch single recycling batch with relations", async () => {
      const mockBatch = {
        id: "rb-100",
        batchNumber: "RP-20260915-0001",
        inputScrapQty: 250,
      };

      vi.mocked(db.recyclingBatch.findUnique).mockResolvedValue(mockBatch as any);

      const result = await RecyclingService.getRecyclingBatchById("rb-100");

      expect(result).toEqual(mockBatch);
      expect(db.recyclingBatch.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rb-100" },
        })
      );
    });
  });

  describe("createRecyclingBatch", () => {
    it("should throw error when no valid scrap records are found", async () => {
      vi.mocked(db.scrapRecord.findMany).mockResolvedValue([]);

      await expect(
        RecyclingService.createRecyclingBatch({
          scrapRecordIds: ["invalid-id"],
          granuleGrade: "RP-PP-GRADE-A",
        })
      ).rejects.toThrow("No available scrap records found for the selected IDs");
    });

    it("should create batch and link scrap records in transaction", async () => {
      vi.mocked(db.scrapRecord.findMany).mockResolvedValue([
        { id: "scr-1", quantity: 150 },
        { id: "scr-2", quantity: 100 },
      ] as any);

      vi.mocked(db.recyclingBatch.findFirst).mockResolvedValue(null);

      const mockCreatedBatch = {
        id: "rb-1",
        batchNumber: "RP-20260915-0001",
        inputScrapQty: 250,
        status: RecyclingStatus.IN_PROGRESS,
      };

      vi.mocked(db.recyclingBatch.create).mockResolvedValue(mockCreatedBatch as any);
      vi.mocked(db.scrapRecord.updateMany).mockResolvedValue({ count: 2 });
      vi.mocked(db.recyclingBatch.findUnique).mockResolvedValue(mockCreatedBatch as any);

      const result = await RecyclingService.createRecyclingBatch({
        scrapRecordIds: ["scr-1", "scr-2"],
        granuleGrade: "RP-PP-GRADE-A",
        operatorId: "user-1",
      });

      expect(result).toEqual(mockCreatedBatch);
      expect(db.recyclingBatch.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inputScrapQty: 250,
            granuleGrade: "RP-PP-GRADE-A",
            status: RecyclingStatus.IN_PROGRESS,
          }),
        })
      );
      expect(db.scrapRecord.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["scr-1", "scr-2"] } },
        data: {
          recyclingBatchId: "rb-1",
          isRecycled: true,
        },
      });
    });
  });

  describe("completeRecyclingBatch", () => {
    it("should throw error if batch is not in IN_PROGRESS status", async () => {
      vi.mocked(db.recyclingBatch.findUnique).mockResolvedValue({
        id: "rb-2",
        status: RecyclingStatus.COMPLETED,
      } as any);

      await expect(
        RecyclingService.completeRecyclingBatch("rb-2", {
          outputRpQty: 180,
          outputItemId: "item-rp",
        })
      ).rejects.toThrow("Cannot complete batch with status COMPLETED");
    });

    it("should complete batch, post inventory transaction, and increment item currentStock", async () => {
      const mockBatch = {
        id: "rb-1",
        batchNumber: "RP-20260915-0001",
        inputScrapQty: 200,
        status: RecyclingStatus.IN_PROGRESS,
        granuleGrade: "RP-PP-GRADE-A",
      };

      vi.mocked(db.recyclingBatch.findUnique).mockResolvedValue(mockBatch as any);

      vi.mocked(db.inventoryTransaction.create).mockResolvedValue({
        id: "itx-rp-1",
        type: TransactionType.IN,
        quantity: 185,
      } as any);

      vi.mocked(db.inventoryItem.update).mockResolvedValue({
        id: "item-rp",
        currentStock: 1185,
      } as any);

      const mockCompleted = {
        ...mockBatch,
        outputRpQty: 185,
        wasteLossQty: 15,
        status: RecyclingStatus.COMPLETED,
      };

      vi.mocked(db.recyclingBatch.update).mockResolvedValue(mockCompleted as any);

      const result = await RecyclingService.completeRecyclingBatch("rb-1", {
        outputRpQty: 185,
        outputItemId: "item-rp",
      });

      expect(result).toEqual(mockCompleted);
      expect(db.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemId: "item-rp",
            type: TransactionType.IN,
            quantity: 185,
            referenceType: "RECYCLING",
          }),
        })
      );
      expect(db.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "item-rp" },
        data: { currentStock: { increment: 185 } },
      });
      expect(db.recyclingBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "rb-1" },
          data: expect.objectContaining({
            status: RecyclingStatus.COMPLETED,
            outputRpQty: 185,
            wasteLossQty: 15,
          }),
        })
      );
    });
  });

  describe("getRecyclingStats", () => {
    it("should calculate aggregate recycling stats and yield percentage", async () => {
      const mockBatches = [
        {
          inputScrapQty: 200,
          outputRpQty: 180,
          wasteLossQty: 20,
          status: RecyclingStatus.COMPLETED,
          granuleGrade: "RP-PP-GRADE-A",
        },
        {
          inputScrapQty: 100,
          outputRpQty: null,
          wasteLossQty: null,
          status: RecyclingStatus.IN_PROGRESS,
          granuleGrade: "RP-PP-GRADE-B",
        },
      ];

      const mockAvailableScraps = [{ quantity: 50 }, { quantity: 75 }];

      vi.mocked(db.recyclingBatch.findMany).mockResolvedValue(mockBatches as any);
      vi.mocked(db.scrapRecord.findMany).mockResolvedValue(mockAvailableScraps as any);

      const stats = await RecyclingService.getRecyclingStats();

      expect(stats.totalBatches).toBe(2);
      expect(stats.completedCount).toBe(1);
      expect(stats.inProgressCount).toBe(1);
      expect(stats.totalInputScrap).toBe(200);
      expect(stats.totalOutputRp).toBe(180);
      expect(stats.totalWasteLoss).toBe(20);
      expect(stats.overallYieldPct).toBe(90);
      expect(stats.availableScrapWeight).toBe(125);
      expect(stats.availableScrapCount).toBe(2);
      expect(stats.gradeBreakdown["RP-PP-GRADE-A"]).toEqual({ input: 200, output: 180 });
    });
  });
});
