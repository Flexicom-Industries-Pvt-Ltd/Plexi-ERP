import { describe, it, expect, vi, beforeEach } from "vitest";
import { postProductionInventoryMovements } from "../inventory-tx";
import { TransactionType } from "@/generated/prisma";

describe("Production Inventory Transactions (inventory-tx)", () => {
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      inventoryItem: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      inventoryBatch: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      inventoryTransaction: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "tx-created", ...data })),
      },
    };
  });

  it("should post IN movements by incrementing item stock and batch", async () => {
    mockTx.inventoryItem.findUnique.mockResolvedValue({
      id: "item-1",
      code: "RM-PP-01",
      currentStock: 100,
      locationId: "loc-1",
    });

    const result = await postProductionInventoryMovements({
      tx: mockTx,
      userId: "user-1",
      referenceType: "PRODUCTION_RUN",
      referenceId: "run-101",
      phase: "Tape Plant",
      correlationId: "corr-101",
      movements: [
        {
          itemId: "item-1",
          type: TransactionType.IN,
          quantity: 50,
          batchLot: "LOT-2026-A",
        },
      ],
    });

    expect(result.posted).toBe(true);
    expect(mockTx.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { currentStock: { increment: 50 } },
    });
    expect(mockTx.inventoryBatch.upsert).toHaveBeenCalledWith({
      where: { itemId_batchLot: { itemId: "item-1", batchLot: "LOT-2026-A" } },
      create: {
        itemId: "item-1",
        batchLot: "LOT-2026-A",
        quantity: 50,
        locationId: "loc-1",
      },
      update: { quantity: { increment: 50 } },
    });
  });

  it("should fail OUT movement if item current stock is insufficient", async () => {
    mockTx.inventoryItem.findUnique.mockResolvedValue({
      id: "item-1",
      code: "RM-PP-01",
      currentStock: 30,
    });

    await expect(
      postProductionInventoryMovements({
        tx: mockTx,
        userId: "user-1",
        referenceType: "PRODUCTION_RUN",
        referenceId: "run-101",
        phase: "Tape Plant",
        correlationId: "corr-101",
        movements: [
          {
            itemId: "item-1",
            type: TransactionType.OUT,
            quantity: 50,
          },
        ],
      })
    ).rejects.toThrow(/Insufficient stock for RM-PP-01: need 50, have 30/);
  });

  it("should atomically decrement item stock for valid OUT movement", async () => {
    mockTx.inventoryItem.findUnique.mockResolvedValue({
      id: "item-1",
      code: "RM-PP-01",
      currentStock: 100,
    });
    mockTx.inventoryItem.updateMany.mockResolvedValue({ count: 1 });

    const result = await postProductionInventoryMovements({
      tx: mockTx,
      userId: "user-1",
      referenceType: "PRODUCTION_RUN",
      referenceId: "run-101",
      phase: "Tape Plant",
      correlationId: "corr-101",
      movements: [
        {
          itemId: "item-1",
          type: TransactionType.OUT,
          quantity: 40,
        },
      ],
    });

    expect(result.posted).toBe(true);
    expect(mockTx.inventoryItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: "item-1",
        currentStock: { gte: 40 },
      },
      data: {
        currentStock: { decrement: 40 },
      },
    });
  });

  it("should fail OUT movement when batch lot does not exist", async () => {
    mockTx.inventoryItem.findUnique.mockResolvedValue({
      id: "item-1",
      code: "RM-PP-01",
      currentStock: 100,
    });
    mockTx.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    mockTx.inventoryBatch.findUnique.mockResolvedValue(null);

    await expect(
      postProductionInventoryMovements({
        tx: mockTx,
        userId: "user-1",
        referenceType: "PRODUCTION_RUN",
        referenceId: "run-101",
        phase: "Tape Plant",
        correlationId: "corr-101",
        movements: [
          {
            itemId: "item-1",
            type: TransactionType.OUT,
            quantity: 40,
            batchLot: "NONEXISTENT-LOT",
          },
        ],
      })
    ).rejects.toThrow(/Inventory batch lot "NONEXISTENT-LOT" not found/);
  });

  it("should fail OUT movement when batch quantity is insufficient", async () => {
    mockTx.inventoryItem.findUnique.mockResolvedValue({
      id: "item-1",
      code: "RM-PP-01",
      currentStock: 100,
    });
    mockTx.inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    mockTx.inventoryBatch.findUnique.mockResolvedValue({
      id: "batch-1",
      quantity: 15,
    });
    mockTx.inventoryBatch.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      postProductionInventoryMovements({
        tx: mockTx,
        userId: "user-1",
        referenceType: "PRODUCTION_RUN",
        referenceId: "run-101",
        phase: "Tape Plant",
        correlationId: "corr-101",
        movements: [
          {
            itemId: "item-1",
            type: TransactionType.OUT,
            quantity: 40,
            batchLot: "LOW-LOT",
          },
        ],
      })
    ).rejects.toThrow(/Insufficient batch stock in lot "LOW-LOT"/);
  });

  it("should return existing transactions and skip posting when skipIfAlreadyPosted is true", async () => {
    mockTx.inventoryTransaction.findMany.mockResolvedValue([
      {
        id: "tx-existing-1",
        itemId: "item-1",
        type: "IN",
        quantity: 50,
        batchLot: null,
        remarks: "Already posted",
      },
    ]);

    const result = await postProductionInventoryMovements({
      tx: mockTx,
      userId: "user-1",
      referenceType: "PRODUCTION_RUN",
      referenceId: "run-101",
      phase: "Tape Plant",
      correlationId: "corr-101",
      movements: [
        {
          itemId: "item-1",
          type: TransactionType.IN,
          quantity: 50,
        },
      ],
      skipIfAlreadyPosted: true,
    });

    expect(result.posted).toBe(true);
    expect(result.message).toBe("Inventory already posted for this reference");
    expect(mockTx.inventoryItem.update).not.toHaveBeenCalled();
    expect(mockTx.inventoryTransaction.create).not.toHaveBeenCalled();
  });
});
