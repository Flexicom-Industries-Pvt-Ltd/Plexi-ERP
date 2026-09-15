import { describe, it, expect, vi, beforeEach } from "vitest";
import { FinishedGoodsService } from "../finished-goods.service";
import { db } from "../../../test/prisma-mock";
import {
  FinishedGoodsStatus,
  RollQualityStatus,
  TransactionType,
} from "@/generated/prisma";

describe("FinishedGoodsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateLotNumber", () => {
    it("should generate first lot number for today when no previous lot exists", async () => {
      vi.mocked(db.finishedGoodsLot.findFirst).mockResolvedValue(null);

      const num = await FinishedGoodsService.generateLotNumber();
      expect(num).toMatch(/^FG-\d{8}-0001$/);
    });

    it("should increment sequence number from latest lot", async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      vi.mocked(db.finishedGoodsLot.findFirst).mockResolvedValue({
        lotNumber: `FG-${today}-0008`,
      } as any);

      const num = await FinishedGoodsService.generateLotNumber();
      expect(num).toBe(`FG-${today}-0009`);
    });
  });

  describe("receiveFinishedGoods from Bale", () => {
    it("should promote a PASSED bale into Finished Goods inventory lot", async () => {
      const mockBale = {
        id: "bale-1",
        baleNumber: "BAL-20260915-0001",
        productId: "item-bag-1",
        baleItemId: null,
        bagsPerBale: 500,
        quantity: 2,
        productionBatch: "BATCH-2026-A",
        qualityStatus: RollQualityStatus.PASSED,
        inventoryPosted: false,
        product: { id: "item-bag-1", name: "Cement Bag 50kg", code: "BAG-50KG" },
        shift: { id: "shift-1", name: "Shift Morning" },
      };

      vi.mocked(db.bale.findUnique).mockResolvedValue(mockBale as any);
      vi.mocked(db.finishedGoodsLot.findFirst).mockResolvedValue(null);
      vi.mocked(db.finishedGoodsLot.create).mockResolvedValue({
        id: "lot-1",
        lotNumber: "FG-20260915-0001",
        inventoryItemId: "item-bag-1",
        quantity: 1000,
      } as any);
      vi.mocked(db.inventoryTransaction.create).mockResolvedValue({
        id: "tx-1",
        type: TransactionType.IN,
        quantity: 1000,
      } as any);
      vi.mocked(db.finishedGoodsLot.update).mockResolvedValue({
        id: "lot-1",
        lotNumber: "FG-20260915-0001",
        inventoryItemId: "item-bag-1",
        quantity: 1000,
        inventoryTransactionId: "tx-1",
      } as any);
      vi.mocked(db.inventoryItem.update).mockResolvedValue({} as any);
      vi.mocked(db.inventoryBatch.findUnique).mockResolvedValue(null);
      vi.mocked(db.inventoryBatch.create).mockResolvedValue({} as any);
      vi.mocked(db.bale.update).mockResolvedValue({} as any);

      const result = await FinishedGoodsService.receiveFinishedGoods(
        {
          baleId: "bale-1",
          unit: "bags",
        },
        { userId: "user-1" }
      );

      expect(db.bale.findUnique).toHaveBeenCalledWith({
        where: { id: "bale-1" },
        include: { product: true, baleItem: true, shift: true },
      });
      expect(db.finishedGoodsLot.create).toHaveBeenCalled();
      expect(db.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemId: "item-bag-1",
            type: TransactionType.IN,
            quantity: 1000,
            referenceType: "FINISHED_GOODS",
          }),
        })
      );
      expect(db.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-bag-1" },
          data: { currentStock: { increment: 1000 } },
        })
      );
      expect(db.bale.update).toHaveBeenCalledWith({
        where: { id: "bale-1" },
        data: { inventoryPosted: true },
      });
      expect(result).toHaveProperty("id", "lot-1");
    });

    it("should throw error if bale is not in PASSED quality status", async () => {
      const mockBale = {
        id: "bale-2",
        baleNumber: "BAL-20260915-0002",
        productId: "item-bag-1",
        qualityStatus: RollQualityStatus.PENDING_QC,
      };

      vi.mocked(db.bale.findUnique).mockResolvedValue(mockBale as any);

      await expect(
        FinishedGoodsService.receiveFinishedGoods({ baleId: "bale-2" })
      ).rejects.toThrow(/Only PASSED bales can be promoted/);
    });
  });

  describe("receiveFinishedGoods manual intake", () => {
    it("should receive manual finished goods stock directly into warehouse", async () => {
      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue({
        id: "item-bag-2",
        name: "Sugar Bag 25kg",
      } as any);
      vi.mocked(db.finishedGoodsLot.findFirst).mockResolvedValue(null);
      vi.mocked(db.finishedGoodsLot.create).mockResolvedValue({
        id: "lot-2",
        lotNumber: "FG-20260915-0001",
        inventoryItemId: "item-bag-2",
        quantity: 500,
      } as any);
      vi.mocked(db.inventoryTransaction.create).mockResolvedValue({
        id: "tx-2",
        type: TransactionType.IN,
      } as any);
      vi.mocked(db.finishedGoodsLot.update).mockResolvedValue({
        id: "lot-2",
        lotNumber: "FG-20260915-0001",
        inventoryItemId: "item-bag-2",
        quantity: 500,
      } as any);
      vi.mocked(db.inventoryItem.update).mockResolvedValue({} as any);

      const result = await FinishedGoodsService.receiveFinishedGoods(
        {
          inventoryItemId: "item-bag-2",
          quantity: 500,
          unit: "bags",
          productionBatch: "BATCH-MANUAL-1",
        },
        { userId: "user-admin" }
      );

      expect(db.finishedGoodsLot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inventoryItemId: "item-bag-2",
            quantity: 500,
            status: FinishedGoodsStatus.AVAILABLE,
          }),
        })
      );
      expect(db.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-bag-2" },
          data: { currentStock: { increment: 500 } },
        })
      );
      expect(result).toHaveProperty("id", "lot-2");
    });
  });

  describe("listFinishedGoods", () => {
    it("should return list of finished goods lots", async () => {
      const mockLots = [
        {
          id: "lot-1",
          lotNumber: "FG-20260915-0001",
          quantity: 1000,
          status: FinishedGoodsStatus.AVAILABLE,
        },
      ];

      vi.mocked(db.finishedGoodsLot.findMany).mockResolvedValue(mockLots as any);

      const result = await FinishedGoodsService.listFinishedGoods();
      expect(result).toHaveLength(1);
      expect(db.finishedGoodsLot.findMany).toHaveBeenCalled();
    });

    it("should return paginated data with metadata", async () => {
      vi.mocked(db.finishedGoodsLot.count).mockResolvedValue(10);
      vi.mocked(db.finishedGoodsLot.findMany).mockResolvedValue([]);

      const result = (await FinishedGoodsService.listFinishedGoods(
        { page: 1, limit: 5 },
        { paginate: true }
      )) as any;

      expect(result.pagination).toEqual(
        expect.objectContaining({
          total: 10,
          page: 1,
          limit: 5,
        })
      );
    });
  });

  describe("getBalesQueue", () => {
    it("should fetch unposted passed bales", async () => {
      const mockBales = [
        {
          id: "bale-passed",
          baleNumber: "BAL-20260915-0001",
          qualityStatus: RollQualityStatus.PASSED,
          inventoryPosted: false,
        },
      ];

      vi.mocked(db.bale.findMany).mockResolvedValue(mockBales as any);

      const queue = await FinishedGoodsService.getBalesQueue();
      expect(queue).toHaveLength(1);
      expect(db.bale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            qualityStatus: RollQualityStatus.PASSED,
            inventoryPosted: false,
          }),
        })
      );
    });
  });

  describe("getFinishedGoodsStats", () => {
    it("should compute plant-wide FG statistics", async () => {
      vi.mocked(db.finishedGoodsLot.count).mockResolvedValue(15);
      vi.mocked(db.finishedGoodsLot.aggregate).mockResolvedValue({
        _sum: {
          quantity: 50000,
          initialQuantity: 60000,
          allocatedQty: 10000,
          dispatchedQty: 10000,
        },
      } as any);
      vi.mocked(db.bale.count).mockResolvedValue(4);
      vi.mocked(db.finishedGoodsLot.findMany).mockResolvedValue([]);

      const stats = await FinishedGoodsService.getFinishedGoodsStats();

      expect(stats.totalBagsInStock).toBe(50000);
      expect(stats.totalAllocatedBags).toBe(10000);
      expect(stats.queueCount).toBe(4);
    });
  });

  describe("getFinishedGoodsTraceability", () => {
    it("should return multi-tier provenance tree", async () => {
      const mockLot = {
        id: "lot-trace-1",
        lotNumber: "FG-20260915-0001",
        baleId: "bale-trace-1",
        productionBatch: "BATCH-100",
        inventoryItem: { name: "Woven Bag" },
        bale: {
          id: "bale-trace-1",
          baleNumber: "BAL-001",
          productId: "item-bag-1",
        },
      };

      vi.mocked(db.finishedGoodsLot.findUnique).mockResolvedValue(mockLot as any);
      vi.mocked(db.qcInspection.findMany).mockResolvedValue([
        { id: "qc-1", inspectionNumber: "QC-2026-001", decision: "PASSED" },
      ] as any);
      vi.mocked(db.productionRun.findMany).mockResolvedValue([
        { id: "run-1", targetQty: 5000, actualQty: 5000 },
      ] as any);

      const trace = await FinishedGoodsService.getFinishedGoodsTraceability("lot-trace-1");

      expect(trace).not.toBeNull();
      expect(trace?.lot.lotNumber).toBe("FG-20260915-0001");
      expect(trace?.qcInspections).toHaveLength(1);
    });
  });
});
