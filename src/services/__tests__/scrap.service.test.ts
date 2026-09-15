import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScrapService } from "../scrap.service";
import { db } from "../../../test/prisma-mock";
import {
  ScrapSourceType,
  TransactionType,
  RollQualityStatus,
} from "@/generated/prisma";

describe("ScrapService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateScrapNumber", () => {
    it("should generate initial sequence number if no previous scrap record exists today", async () => {
      vi.mocked(db.scrapRecord.findFirst).mockResolvedValue(null);

      const num = await ScrapService.generateScrapNumber();

      expect(num).toMatch(/^SCR-\d{8}-0001$/);
    });

    it("should increment sequence number from latest scrap record", async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      vi.mocked(db.scrapRecord.findFirst).mockResolvedValue({
        scrapNumber: `SCR-${today}-0015`,
      } as any);

      const num = await ScrapService.generateScrapNumber();

      expect(num).toBe(`SCR-${today}-0016`);
    });
  });

  describe("listScrapRecords", () => {
    it("should fetch scrap records list with default filters", async () => {
      const mockScraps = [
        {
          id: "scr-1",
          scrapNumber: "SCR-20260915-0001",
          phase: "EXTRUSION",
          reasonCode: "EDGE_TRIM",
          quantity: 25.5,
          unit: "kg",
        },
      ];

      vi.mocked(db.scrapRecord.findMany).mockResolvedValue(mockScraps as any);
      vi.mocked(db.scrapRecord.count).mockResolvedValue(1);

      const result = await ScrapService.listScrapRecords();

      expect(result.records).toHaveLength(1);
      expect(result.records[0].scrapNumber).toBe("SCR-20260915-0001");
      expect(db.scrapRecord.findMany).toHaveBeenCalled();
    });

    it("should apply search filters and pagination metadata", async () => {
      vi.mocked(db.scrapRecord.findMany).mockResolvedValue([]);
      vi.mocked(db.scrapRecord.count).mockResolvedValue(45);

      const result = await ScrapService.listScrapRecords(
        {
          phase: "LOOM",
          sourceType: ScrapSourceType.PRODUCTION_RUN,
          search: "LOOM_TRIM",
          page: 1,
          limit: 20,
        },
        { paginate: true }
      );

      expect(db.scrapRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            phase: "LOOM",
            sourceType: ScrapSourceType.PRODUCTION_RUN,
            OR: expect.any(Array),
          }),
        })
      );
      expect(result.meta).toBeDefined();
      expect(result.meta?.total).toBe(45);
      expect(result.meta?.totalPages).toBe(3);
    });
  });

  describe("getScrapById", () => {
    it("should retrieve single scrap record with related entities", async () => {
      const mockRecord = {
        id: "scr-123",
        scrapNumber: "SCR-20260915-0001",
        phase: "LAMINATION",
        quantity: 12.0,
      };

      vi.mocked(db.scrapRecord.findUnique).mockResolvedValue(mockRecord as any);

      const result = await ScrapService.getScrapById("scr-123");

      expect(result).toEqual(mockRecord);
      expect(db.scrapRecord.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "scr-123" },
        })
      );
    });
  });

  describe("getScrapStats", () => {
    it("should calculate summary weights and breakdown by phase and reason", async () => {
      const allRecords = [
        { quantity: 20, phase: "EXTRUSION", reasonCode: "STARTUP_LUMP" },
        { quantity: 15, phase: "LOOM", reasonCode: "WEFT_BREAK" },
        { quantity: 25, phase: "EXTRUSION", reasonCode: "EDGE_TRIM" },
      ];
      const todayRecords = [{ quantity: 20 }, { quantity: 15 }];
      const monthRecords = [{ quantity: 20 }, { quantity: 15 }, { quantity: 25 }];

      vi.mocked(db.scrapRecord.findMany)
        .mockResolvedValueOnce(allRecords as any)
        .mockResolvedValueOnce(todayRecords as any)
        .mockResolvedValueOnce(monthRecords as any);

      const stats = await ScrapService.getScrapStats();

      expect(stats.totalScrapWeight).toBe(60);
      expect(stats.todayScrapWeight).toBe(35);
      expect(stats.monthScrapWeight).toBe(60);
      expect(stats.phaseBreakdown["EXTRUSION"]).toBe(45);
      expect(stats.phaseBreakdown["LOOM"]).toBe(15);
      expect(stats.reasonBreakdown["STARTUP_LUMP"]).toBe(20);
      expect(stats.reasonBreakdown["EDGE_TRIM"]).toBe(25);
    });
  });

  describe("recordScrap", () => {
    it("should record scrap record and deduct inventory stock when inventoryItemId is provided", async () => {
      vi.mocked(db.scrapRecord.findFirst).mockResolvedValue(null);
      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue({
        id: "item-1",
        currentStock: 500,
      } as any);

      vi.mocked(db.inventoryTransaction.create).mockResolvedValue({
        id: "itx-1",
        type: TransactionType.OUT,
        quantity: 50,
      } as any);

      vi.mocked(db.inventoryItem.update).mockResolvedValue({
        id: "item-1",
        currentStock: 450,
      } as any);

      const mockCreated = {
        id: "scr-1",
        scrapNumber: "SCR-20260915-0001",
        phase: "PRINTING",
        reasonCode: "INK_MISALIGN",
        quantity: 50,
      };

      vi.mocked(db.scrapRecord.create).mockResolvedValue(mockCreated as any);

      const result = await ScrapService.recordScrap({
        sourceType: ScrapSourceType.MANUAL,
        phase: "PRINTING",
        reasonCode: "INK_MISALIGN",
        quantity: 50,
        inventoryItemId: "item-1",
        recordedById: "user-1",
      });

      expect(result).toEqual(mockCreated);
      expect(db.inventoryItem.findUnique).toHaveBeenCalledWith({
        where: { id: "item-1" },
      });
      expect(db.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemId: "item-1",
            type: TransactionType.OUT,
            quantity: 50,
            referenceType: "SCRAP",
          }),
        })
      );
      expect(db.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-1" },
          data: { currentStock: { decrement: 50 } },
        })
      );
    });

    it("should update roll quality status to FAILED when scrap source is ROLL", async () => {
      vi.mocked(db.scrapRecord.findFirst).mockResolvedValue(null);
      vi.mocked(db.productionRoll.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(db.scrapRecord.create).mockResolvedValue({
        id: "scr-2",
        scrapNumber: "SCR-20260915-0001",
      } as any);

      await ScrapService.recordScrap({
        sourceType: ScrapSourceType.ROLL,
        sourceId: "roll-99",
        phase: "LOOM",
        reasonCode: "FABRIC_DEFECT",
        quantity: 40,
      });

      expect(db.productionRoll.updateMany).toHaveBeenCalledWith({
        where: { id: "roll-99" },
        data: { qualityStatus: RollQualityStatus.FAILED },
      });
    });

    it("should update bale quality status to FAILED when scrap source is BALE", async () => {
      vi.mocked(db.scrapRecord.findFirst).mockResolvedValue(null);
      vi.mocked(db.bale.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(db.scrapRecord.create).mockResolvedValue({
        id: "scr-3",
        scrapNumber: "SCR-20260915-0001",
      } as any);

      await ScrapService.recordScrap({
        sourceType: ScrapSourceType.BALE,
        sourceId: "bale-77",
        phase: "FINISHING",
        reasonCode: "STITCHING_DEFECT",
        quantity: 100,
      });

      expect(db.bale.updateMany).toHaveBeenCalledWith({
        where: { id: "bale-77" },
        data: { qualityStatus: RollQualityStatus.FAILED },
      });
    });
  });
});
