import { describe, it, expect, vi, beforeEach } from "vitest";
import { GateService } from "../gate.service";
import { db } from "../../../test/prisma-mock";
import { GatePurpose, GateEntryStatus } from "@/generated/prisma";

vi.mock("@/lib/logging", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
  logDiff: vi.fn().mockResolvedValue(undefined),
}));

describe("GateService Stock Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGateEntry for LOADING", () => {
    it("should throw an error when loading quantity exceeds available stock", async () => {
      const mockStock = {
        id: "stock-1",
        name: "PP Granules",
        code: "STK-PP",
        uom: { abbreviation: "kg" },
        inventoryItems: [
          { currentStock: 100, reservedStock: 20 }, // Available = 80 kg
        ],
      };

      vi.mocked(db.gateEntry.findFirst).mockResolvedValue(null);
      vi.mocked(db.stock.findUnique).mockResolvedValue(mockStock as any);
      vi.mocked(db.stock.findFirst).mockResolvedValue(mockStock as any);

      await expect(
        GateService.createGateEntry({
          truckNumber: "WB11A1234",
          driverName: "John Doe",
          purpose: GatePurpose.LOADING,
          stockItems: [
            {
              stockId: "stock-1",
              materialName: "PP Granules",
              quantity: 150, // Exceeds 80 kg!
              unit: "kg",
            },
          ],
        })
      ).rejects.toThrow(/exceeds available stock/i);
    });

    it("should succeed when loading quantity is within available stock", async () => {
      const mockStock = {
        id: "stock-1",
        name: "PP Granules",
        code: "STK-PP",
        uom: { abbreviation: "kg" },
        inventoryItems: [
          { currentStock: 200, reservedStock: 50 }, // Available = 150 kg
        ],
      };

      const mockCreatedEntry = {
        id: "ge-1",
        entryNumber: "GE-20260914-001",
        truckNumber: "WB11A1234",
        driverName: "John Doe",
        purpose: GatePurpose.LOADING,
        status: GateEntryStatus.ARRIVED,
      };

      vi.mocked(db.gateEntry.findFirst).mockResolvedValue(null);
      vi.mocked(db.stock.findUnique).mockResolvedValue(mockStock as any);
      vi.mocked(db.stock.findFirst).mockResolvedValue(mockStock as any);
      vi.mocked(db.gateEntry.create).mockResolvedValue(mockCreatedEntry as any);
      vi.mocked(db.truckStockDetail.create).mockResolvedValue({ id: "tsd-1" } as any);
      vi.mocked(db.gateEntry.findUnique).mockResolvedValue(mockCreatedEntry as any);

      const result = await GateService.createGateEntry({
        truckNumber: "WB11A1234",
        driverName: "John Doe",
        purpose: GatePurpose.LOADING,
        stockItems: [
          {
            stockId: "stock-1",
            materialName: "PP Granules",
            quantity: 50, // <= 150 kg
            unit: "kg",
          },
        ],
      });

      expect(result).toBeDefined();
      expect(db.gateEntry.create).toHaveBeenCalled();
    });
  });

  describe("createGateEntry for UNLOADING", () => {
    it("should allow unloading quantity greater than current stock without error", async () => {
      const mockStock = {
        id: "stock-1",
        name: "Raw PP Granules",
        code: "STK-RAW-PP",
        uom: { abbreviation: "kg" },
        inventoryItems: [
          { currentStock: 10, reservedStock: 0 },
        ],
      };

      const mockCreatedEntry = {
        id: "ge-2",
        entryNumber: "GE-20260914-002",
        truckNumber: "WB11A5678",
        driverName: "Jane Smith",
        purpose: GatePurpose.UNLOADING,
        status: GateEntryStatus.ARRIVED,
      };

      vi.mocked(db.gateEntry.findFirst).mockResolvedValue(null);
      vi.mocked(db.stock.findUnique).mockResolvedValue(mockStock as any);
      vi.mocked(db.stock.findFirst).mockResolvedValue(mockStock as any);
      vi.mocked(db.gateEntry.create).mockResolvedValue(mockCreatedEntry as any);
      vi.mocked(db.truckStockDetail.create).mockResolvedValue({ id: "tsd-2" } as any);
      vi.mocked(db.gateEntry.findUnique).mockResolvedValue(mockCreatedEntry as any);

      const result = await GateService.createGateEntry({
        truckNumber: "WB11A5678",
        driverName: "Jane Smith",
        purpose: GatePurpose.UNLOADING,
        stockItems: [
          {
            stockId: "stock-1",
            materialName: "Raw PP Granules",
            quantity: 5000, // Receiving 5,000 kg while only 10 kg currently in stock
            unit: "kg",
          },
        ],
      });

      expect(result).toBeDefined();
      expect(db.gateEntry.create).toHaveBeenCalled();
    });
  });

  describe("listGateEntries with pagination and date filter", () => {
    it("should apply date filter correctly", async () => {
      const mockEntries = [
        {
          id: "ge-10",
          entryNumber: "GE-20260929-001",
          arrivalTime: new Date("2026-09-29T10:00:00.000Z"),
          stockDetails: [],
        },
      ];

      vi.mocked(db.gateEntry.findMany).mockResolvedValue(mockEntries as any);
      vi.mocked(db.gateEntry.count).mockResolvedValue(1);

      const result = await GateService.listGateEntries({
        date: "2026-09-29",
        page: 1,
        limit: 20,
      });

      expect(result.entries).toEqual(mockEntries);
      expect(result.meta).toBeDefined();
      expect(result.meta?.page).toBe(1);
      expect(result.meta?.total).toBe(1);

      expect(db.gateEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            arrivalTime: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it("should handle date range filters", async () => {
      vi.mocked(db.gateEntry.findMany).mockResolvedValue([]);
      vi.mocked(db.gateEntry.count).mockResolvedValue(0);

      const result = await GateService.listGateEntries({
        dateFrom: "2026-09-01",
        dateTo: "2026-09-29",
        page: 2,
        limit: 10,
      });

      expect(result.entries).toEqual([]);
      expect(result.meta?.page).toBe(2);
      expect(result.meta?.limit).toBe(10);
      expect(db.gateEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          where: expect.objectContaining({
            arrivalTime: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });
});
