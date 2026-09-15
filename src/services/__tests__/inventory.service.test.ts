import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryService } from "../inventory.service";
import { db } from "../../../test/prisma-mock";
import { ItemType } from "@/generated/prisma";

vi.mock("@/lib/logging", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
  logDiff: vi.fn().mockResolvedValue(undefined),
}));

describe("InventoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listInventoryItems", () => {
    it("should list inventory items with default parameters", async () => {
      const mockItems = [
        { id: "item-1", name: "HDPE Granules", code: "HDPE-01", currentStock: 100 },
        { id: "item-2", name: "PP Granules", code: "PP-01", currentStock: 250 },
      ];

      vi.mocked(db.inventoryItem.findMany).mockResolvedValue(mockItems as any);
      vi.mocked(db.inventoryItem.count).mockResolvedValue(2);

      const result = await InventoryService.listInventoryItems({});

      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe("HDPE Granules");
      expect(db.inventoryItem.findMany).toHaveBeenCalled();
    });

    it("should support search, materialType, and itemType filtering", async () => {
      vi.mocked(db.inventoryItem.findMany).mockResolvedValue([]);

      await InventoryService.listInventoryItems({
        search: "granules",
        materialType: "RAW_MATERIAL",
        type: ItemType.RAW_MATERIAL,
      });

      expect(db.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            itemType: ItemType.RAW_MATERIAL,
            stock: { materialType: "RAW_MATERIAL" },
            OR: [
              { name: { contains: "granules", mode: "insensitive" } },
              { code: { contains: "granules", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("should return pagination meta when pagination is requested", async () => {
      const mockItems = [{ id: "item-1", name: "Item 1", code: "ITM-1" }];
      vi.mocked(db.inventoryItem.findMany).mockResolvedValue(mockItems as any);
      vi.mocked(db.inventoryItem.count).mockResolvedValue(55);

      const result = await InventoryService.listInventoryItems({ page: 1, limit: 10 }, { paginate: true });

      expect(result.items).toHaveLength(1);
      expect(result.meta).toBeDefined();
      expect(result.meta?.total).toBe(55);
      expect(result.meta?.page).toBe(1);
      expect(result.meta?.limit).toBe(10);
      expect(result.meta?.totalPages).toBe(6);
    });

    it("should aggregate movement summary when includeMovement is true", async () => {
      const mockItems = [
        { id: "item-1", name: "Item 1", currentStock: 100, reservedStock: 20 },
      ];

      vi.mocked(db.inventoryItem.findMany).mockResolvedValue(mockItems as any);
      vi.mocked(db.inventoryTransaction.groupBy).mockResolvedValue([
        { itemId: "item-1", type: "IN", _sum: { quantity: 150 } },
        { itemId: "item-1", type: "OUT", _sum: { quantity: 50 } },
      ] as any);

      const result = await InventoryService.listInventoryItems({ includeMovement: true });

      expect(result.items[0].movementSummary).toEqual({
        available: 100,
        reserved: 20,
        received: 150,
        consumed: 50,
      });
    });
  });

  describe("getInventoryItem", () => {
    it("should return single inventory item by ID", async () => {
      const mockItem = { id: "item-1", name: "PP Granules", code: "PP-01" };
      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue(mockItem as any);

      const result = await InventoryService.getInventoryItem("item-1");
      expect(result).toEqual(mockItem);
      expect(db.inventoryItem.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "item-1" } })
      );
    });
  });

  describe("createInventoryItem", () => {
    it("should throw error if code already exists", async () => {
      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue({ id: "item-1", code: "DUP-01" } as any);

      await expect(
        InventoryService.createInventoryItem({ code: "DUP-01", name: "Duplicate" }, "user-1")
      ).rejects.toThrow(/already exists/i);
    });

    it("should create item successfully when code is unique", async () => {
      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue(null);
      const mockCreated = { id: "item-new", code: "NEW-01", name: "New Item" };
      vi.mocked(db.inventoryItem.create).mockResolvedValue(mockCreated as any);

      const result = await InventoryService.createInventoryItem(
        { code: "NEW-01", name: "New Item", itemType: ItemType.RAW_MATERIAL, uomId: "uom-1" },
        "user-1"
      );

      expect(result).toEqual(mockCreated);
      expect(db.inventoryItem.create).toHaveBeenCalled();
    });
  });

  describe("updateInventoryItem", () => {
    it("should return null if item does not exist", async () => {
      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue(null);

      const result = await InventoryService.updateInventoryItem("nonexistent", { name: "Updated" });
      expect(result).toBeNull();
    });

    it("should throw error if updating to another existing item code", async () => {
      const existing = { id: "item-1", code: "OLD-01", name: "Old Item" };
      vi.mocked(db.inventoryItem.findUnique)
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce({ id: "item-2", code: "TAKEN-01" } as any);

      await expect(
        InventoryService.updateInventoryItem("item-1", { code: "TAKEN-01" }, "user-1")
      ).rejects.toThrow(/already exists/i);
    });

    it("should update item and record diff log when valid", async () => {
      const existing = { id: "item-1", code: "CODE-1", name: "Old Name", minimumStock: 10 };
      const updated = { ...existing, name: "New Name", minimumStock: 25 };

      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue(existing as any);
      vi.mocked(db.inventoryItem.update).mockResolvedValue(updated as any);

      const result = await InventoryService.updateInventoryItem(
        "item-1",
        { name: "New Name", minimumStock: 25 },
        "user-1"
      );

      expect(result?.name).toBe("New Name");
      expect(db.inventoryItem.update).toHaveBeenCalled();
    });
  });

  describe("deleteInventoryItem", () => {
    it("should return notFound if item does not exist", async () => {
      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue(null);

      const result = await InventoryService.deleteInventoryItem("item-none");
      expect(result).toEqual({ notFound: true });
    });

    it("should soft delete (deactivate) item when transaction history exists", async () => {
      const existing = {
        id: "item-1",
        code: "CODE-1",
        _count: { transactions: 5 },
      };

      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue(existing as any);
      vi.mocked(db.inventoryItem.update).mockResolvedValue({ id: "item-1", isActive: false } as any);

      const result = await InventoryService.deleteInventoryItem("item-1", "user-1");

      expect(result).toEqual({ success: true, softDeleted: true });
      expect(db.inventoryItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "item-1" },
          data: { isActive: false },
        })
      );
      expect(db.inventoryItem.delete).not.toHaveBeenCalled();
    });

    it("should hard delete item when no transaction history exists", async () => {
      const existing = {
        id: "item-1",
        code: "CODE-1",
        _count: { transactions: 0 },
      };

      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue(existing as any);
      vi.mocked(db.inventoryItem.delete).mockResolvedValue(existing as any);

      const result = await InventoryService.deleteInventoryItem("item-1", "user-1");

      expect(result).toEqual({ success: true, softDeleted: false });
      expect(db.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
    });
  });

  describe("adjustStock", () => {
    it("should throw error if item not found during stock adjustment", async () => {
      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue(null);

      await expect(
        InventoryService.adjustStock("item-none", { quantity: 10 })
      ).rejects.toThrow(/not found/i);
    });

    it("should adjust stock and record transaction record", async () => {
      const mockItem = { id: "item-1", currentStock: 100 };
      const updatedItem = { id: "item-1", currentStock: 125 };

      vi.mocked(db.inventoryItem.findUnique).mockResolvedValue(mockItem as any);
      vi.mocked(db.inventoryItem.update).mockResolvedValue(updatedItem as any);
      vi.mocked(db.inventoryTransaction.create).mockResolvedValue({ id: "tx-1" } as any);

      const result = await InventoryService.adjustStock(
        "item-1",
        { quantity: 25, remarks: "Audit recount" },
        "user-1"
      );

      expect(result.currentStock).toBe(125);
      expect(db.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: { currentStock: 125 },
      });
      expect(db.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            itemId: "item-1",
            type: "IN",
            quantity: 25,
            referenceType: "ADJUSTMENT",
          }),
        })
      );
    });
  });
});
