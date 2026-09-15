import { describe, it, expect, vi, beforeEach } from "vitest";
import { DispatchService } from "../dispatch.service";
import { db } from "../../../test/prisma-mock";
import {
  DispatchOrderStatus,
  DispatchAllocationStatus,
  FinishedGoodsStatus,
  TransactionType,
} from "@/generated/prisma";

describe("DispatchService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateOrderNumber", () => {
    it("should generate first sequence number for today if no prior orders exist", async () => {
      vi.mocked(db.dispatchOrder.findFirst).mockResolvedValue(null);

      const num = await DispatchService.generateOrderNumber();
      expect(num).toMatch(/^DO-\d{8}-0001$/);
    });

    it("should increment sequence number from latest order today", async () => {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      vi.mocked(db.dispatchOrder.findFirst).mockResolvedValue({
        orderNumber: `DO-${today}-0012`,
      } as any);

      const num = await DispatchService.generateOrderNumber();
      expect(num).toBe(`DO-${today}-0013`);
    });
  });

  describe("createDispatchOrder", () => {
    it("should create a dispatch order with lines and audit event", async () => {
      vi.mocked(db.dispatchOrder.findFirst).mockResolvedValue(null);
      vi.mocked(db.dispatchOrder.create).mockResolvedValue({
        id: "order-1",
        orderNumber: "DO-20260915-0001",
        customerName: "UltraTech Cement",
        totalQty: 5000,
        status: DispatchOrderStatus.CONFIRMED,
        lines: [
          {
            id: "line-1",
            inventoryItemId: "item-bag-1",
            orderedQty: 5000,
            unit: "bags",
          },
        ],
      } as any);

      const order = await DispatchService.createDispatchOrder(
        {
          customerName: "UltraTech Cement",
          vehicleNumber: "MH-12-AB-1234",
          transporter: "VRL Logistics",
          lines: [
            {
              inventoryItemId: "item-bag-1",
              orderedQty: 5000,
              unit: "bags",
            },
          ],
        },
        { userId: "user-dispatch-mgr" }
      );

      expect(db.dispatchOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerName: "UltraTech Cement",
            totalQty: 5000,
            status: DispatchOrderStatus.CONFIRMED,
          }),
        })
      );
      expect(order.id).toBe("order-1");
      expect(order.totalQty).toBe(5000);
    });
  });

  describe("listDispatchOrders", () => {
    it("should fetch list of dispatch orders with default query", async () => {
      vi.mocked(db.dispatchOrder.findMany).mockResolvedValue([
        {
          id: "order-1",
          orderNumber: "DO-20260915-0001",
          customerName: "ABC Corp",
          status: DispatchOrderStatus.CONFIRMED,
        },
      ] as any);

      const orders = await DispatchService.listDispatchOrders();
      expect(orders).toHaveLength(1);
      expect(db.dispatchOrder.findMany).toHaveBeenCalled();
    });

    it("should return paginated data with pagination metadata", async () => {
      vi.mocked(db.dispatchOrder.count).mockResolvedValue(25);
      vi.mocked(db.dispatchOrder.findMany).mockResolvedValue([]);

      const result = (await DispatchService.listDispatchOrders(
        { page: 2, limit: 10 },
        { paginate: true }
      )) as any;

      expect(result.pagination).toEqual(
        expect.objectContaining({
          total: 25,
          page: 2,
          limit: 10,
        })
      );
    });
  });

  describe("pickOrderLots", () => {
    it("should pick and allocate stock lots to dispatch order lines", async () => {
      const mockOrder = {
        id: "order-1",
        orderNumber: "DO-20260915-0001",
        status: DispatchOrderStatus.CONFIRMED,
        lines: [{ id: "line-1", dispatchOrderId: "order-1", inventoryItemId: "item-1" }],
      };

      const mockLot = {
        id: "lot-1",
        lotNumber: "FG-20260915-0001",
        quantity: 5000,
        allocatedQty: 1000,
      };

      vi.mocked(db.dispatchOrder.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(db.dispatchOrderLine.findUnique).mockResolvedValue({
        id: "line-1",
        dispatchOrderId: "order-1",
        inventoryItemId: "item-1",
      } as any);
      vi.mocked(db.finishedGoodsLot.findUnique).mockResolvedValue(mockLot as any);
      vi.mocked(db.dispatchAllocation.create).mockResolvedValue({ id: "alloc-1" } as any);
      vi.mocked(db.dispatchOrderLine.update).mockResolvedValue({} as any);
      vi.mocked(db.finishedGoodsLot.update).mockResolvedValue({} as any);
      vi.mocked(db.inventoryItem.update).mockResolvedValue({} as any);
      vi.mocked(db.dispatchOrder.update).mockResolvedValue({
        ...mockOrder,
        status: DispatchOrderStatus.PICKING,
      } as any);

      const updated = await DispatchService.pickOrderLots(
        "order-1",
        {
          allocations: [
            {
              dispatchOrderLineId: "line-1",
              finishedGoodsLotId: "lot-1",
              quantity: 2000,
            },
          ],
        },
        { userId: "user-picker" }
      );

      expect(db.dispatchAllocation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dispatchOrderLineId: "line-1",
            finishedGoodsLotId: "lot-1",
            allocatedQty: 2000,
            status: DispatchAllocationStatus.ALLOCATED,
          }),
        })
      );
      expect(db.finishedGoodsLot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "lot-1" },
          data: expect.objectContaining({
            allocatedQty: { increment: 2000 },
            status: FinishedGoodsStatus.ALLOCATED,
          }),
        })
      );
      expect(db.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-1" },
          data: { reservedStock: { increment: 2000 } },
        })
      );
      expect(updated.status).toBe(DispatchOrderStatus.PICKING);
    });

    it("should throw error if lot has insufficient unallocated stock", async () => {
      const mockOrder = {
        id: "order-1",
        status: DispatchOrderStatus.CONFIRMED,
        lines: [{ id: "line-1", dispatchOrderId: "order-1" }],
      };

      const mockLot = {
        id: "lot-1",
        lotNumber: "FG-20260915-0001",
        quantity: 1000,
        allocatedQty: 800, // available only 200
      };

      vi.mocked(db.dispatchOrder.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(db.dispatchOrderLine.findUnique).mockResolvedValue({
        id: "line-1",
        dispatchOrderId: "order-1",
      } as any);
      vi.mocked(db.finishedGoodsLot.findUnique).mockResolvedValue(mockLot as any);

      await expect(
        DispatchService.pickOrderLots("order-1", {
          allocations: [
            {
              dispatchOrderLineId: "line-1",
              finishedGoodsLotId: "lot-1",
              quantity: 500, // requests 500 when only 200 available
            },
          ],
        })
      ).rejects.toThrow(/Insufficient unallocated stock/);
    });
  });

  describe("loadAndDispatchOrder", () => {
    it("should confirm truck loading, deduct FG lots, and post inventory OUT", async () => {
      const mockOrder = {
        id: "order-load-1",
        orderNumber: "DO-20260915-0001",
        customerName: "Ambuja Cement",
        status: DispatchOrderStatus.PICKING,
        lines: [
          {
            id: "line-1",
            inventoryItemId: "item-1",
            unit: "bags",
            allocations: [
              {
                id: "alloc-1",
                allocatedQty: 2500,
                finishedGoodsLot: {
                  id: "lot-1",
                  lotNumber: "FG-001",
                  quantity: 2500,
                  allocatedQty: 2500,
                  productionBatch: "BATCH-A",
                },
              },
            ],
          },
        ],
      };

      vi.mocked(db.dispatchOrder.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(db.dispatchAllocation.update).mockResolvedValue({} as any);
      vi.mocked(db.dispatchOrderLine.update).mockResolvedValue({} as any);
      vi.mocked(db.finishedGoodsLot.update).mockResolvedValue({} as any);
      vi.mocked(db.inventoryItem.update).mockResolvedValue({} as any);
      vi.mocked(db.inventoryBatch.findUnique).mockResolvedValue({ id: "batch-1", quantity: 2500 } as any);
      vi.mocked(db.inventoryBatch.update).mockResolvedValue({} as any);
      vi.mocked(db.inventoryTransaction.create).mockResolvedValue({ id: "tx-out-1" } as any);
      vi.mocked(db.dispatchOrder.update).mockResolvedValue({
        id: "order-load-1",
        status: DispatchOrderStatus.DISPATCHED,
        dispatchedQty: 2500,
      } as any);

      const dispatched = await DispatchService.loadAndDispatchOrder(
        "order-load-1",
        {
          vehicleNumber: "MH-12-CD-5678",
          driverName: "Ramesh Singh",
        },
        { userId: "user-loader" }
      );

      expect(db.dispatchAllocation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "alloc-1" },
          data: { loadedQty: 2500, status: DispatchAllocationStatus.LOADED },
        })
      );
      expect(db.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemId: "item-1",
            type: TransactionType.OUT,
            quantity: 2500,
            referenceType: "DISPATCH_ORDER",
          }),
        })
      );
      expect(db.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-1" },
          data: { currentStock: { decrement: 2500 }, reservedStock: { decrement: 2500 } },
        })
      );
      expect(dispatched.status).toBe(DispatchOrderStatus.DISPATCHED);
      expect(dispatched.dispatchedQty).toBe(2500);
    });
  });

  describe("getDispatchStats", () => {
    it("should calculate dispatch statistics", async () => {
      vi.mocked(db.dispatchOrder.count).mockResolvedValue(18);
      vi.mocked(db.dispatchOrder.aggregate).mockResolvedValue({
        _sum: { dispatchedQty: 45000, totalQty: 50000 },
      } as any);
      vi.mocked(db.dispatchOrder.findMany).mockResolvedValue([]);

      const stats = await DispatchService.getDispatchStats();

      expect(stats.totalOrders).toBe(18);
      expect(stats.totalDispatchedQty).toBe(45000);
    });
  });
});
