import { randomUUID } from "crypto";
import type { Prisma } from "@/generated/prisma";
import { TransactionType as TxType } from "@/generated/prisma";
import { db } from "@/lib/db";

export const PRODUCTION_RUN_REFERENCE = "PRODUCTION_RUN";
export const BALE_REFERENCE = "BALE";

export type ProductionInventoryMovement = {
  itemId: string;
  type: typeof TxType.IN | typeof TxType.OUT;
  quantity: number;
  batchLot?: string | null;
  remarks?: string;
};

export type PostProductionInventoryParams = {
  tx: Prisma.TransactionClient;
  userId: string;
  referenceType: string;
  referenceId: string;
  phase: string;
  correlationId: string;
  movements: ProductionInventoryMovement[];
  skipIfAlreadyPosted?: boolean;
};

export type ProductionInventoryResult = {
  posted: boolean;
  correlationId: string;
  message: string;
  transactions: Array<{
    id: string;
    itemId: string;
    type: string;
    quantity: number;
    batchLot: string | null;
    remarks: string | null;
  }>;
};

export function createProductionCorrelationId(productionRunId: string) {
  return `prod-${productionRunId}-${randomUUID()}`;
}

export function createBaleCorrelationId(baleId: string) {
  return `bale-${baleId}-${randomUUID()}`;
}

async function applyInventoryMovement(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    referenceType: string;
    referenceId: string;
    correlationId: string;
    phase: string;
    movement: ProductionInventoryMovement;
  },
) {
  const { movement, userId, referenceType, referenceId, correlationId, phase } = params;
  if (movement.quantity <= 0) return null;

  const item = await tx.inventoryItem.findUnique({ where: { id: movement.itemId } });
  if (!item) {
    throw new Error(`Inventory item ${movement.itemId} not found`);
  }

  if (movement.type === TxType.OUT && item.currentStock < movement.quantity) {
    throw new Error(
      `Insufficient stock for ${item.code}: need ${movement.quantity}, have ${item.currentStock}`,
    );
  }

  const newStock =
    movement.type === TxType.IN
      ? item.currentStock + movement.quantity
      : item.currentStock - movement.quantity;

  await tx.inventoryItem.update({
    where: { id: movement.itemId },
    data: { currentStock: newStock },
  });

  const batchLot = movement.batchLot?.trim() || null;
  if (batchLot) {
    if (movement.type === TxType.IN) {
      await tx.inventoryBatch.upsert({
        where: { itemId_batchLot: { itemId: movement.itemId, batchLot } },
        create: {
          itemId: movement.itemId,
          batchLot,
          quantity: movement.quantity,
          locationId: item.locationId,
        },
        update: { quantity: { increment: movement.quantity } },
      });
    } else {
      const existingBatch = await tx.inventoryBatch.findUnique({
        where: { itemId_batchLot: { itemId: movement.itemId, batchLot } },
      });
      if (existingBatch) {
        await tx.inventoryBatch.update({
          where: { id: existingBatch.id },
          data: { quantity: { decrement: movement.quantity } },
        });
      }
    }
  }

  const remarks = [
    movement.remarks,
    `${phase} production`,
    `[corr:${correlationId}]`,
  ]
    .filter(Boolean)
    .join(" — ");

  return tx.inventoryTransaction.create({
    data: {
      itemId: movement.itemId,
      type: movement.type,
      quantity: movement.quantity,
      batchLot,
      referenceType,
      referenceId,
      userId,
      remarks,
    },
  });
}

/** Central helper — posts IN/OUT inventory transactions for a production reference. */
export async function postProductionInventoryMovements(
  params: PostProductionInventoryParams,
): Promise<ProductionInventoryResult> {
  const { tx, userId, referenceType, referenceId, phase, correlationId, movements } = params;

  if (params.skipIfAlreadyPosted) {
    const existing = await fetchProductionInventoryTransactions(referenceType, referenceId, tx);
    if (existing.length > 0) {
      return {
        posted: true,
        correlationId,
        message: "Inventory already posted for this reference",
        transactions: existing.map((t) => ({
          id: t.id,
          itemId: t.itemId,
          type: t.type,
          quantity: t.quantity,
          batchLot: t.batchLot,
          remarks: t.remarks,
        })),
      };
    }
  }

  const validMovements = movements.filter((m) => m.quantity > 0);
  const created = [];

  for (const movement of validMovements) {
    const txRecord = await applyInventoryMovement(tx, {
      userId,
      referenceType,
      referenceId,
      correlationId,
      phase,
      movement,
    });
    if (txRecord) created.push(txRecord);
  }

  return {
    posted: created.length > 0,
    correlationId,
    message:
      created.length > 0
        ? `Posted ${created.length} inventory movement(s)`
        : "No inventory items to post",
    transactions: created.map((t) => ({
      id: t.id,
      itemId: t.itemId,
      type: t.type,
      quantity: t.quantity,
      batchLot: t.batchLot,
      remarks: t.remarks,
    })),
  };
}

export async function fetchProductionInventoryTransactions(
  referenceType: string,
  referenceId: string,
  tx: Prisma.TransactionClient | typeof db = db,
) {
  return tx.inventoryTransaction.findMany({
    where: { referenceType, referenceId },
    include: {
      item: { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function resolveRollOutMovement(
  tx: Prisma.TransactionClient,
  rollId: string,
  quantity: number,
  label = "Input roll",
): Promise<ProductionInventoryMovement | null> {
  if (quantity <= 0) return null;

  const roll = await tx.productionRoll.findUnique({
    where: { id: rollId },
    select: { inventoryItemId: true, batchLot: true, rollNumber: true },
  });
  if (!roll?.inventoryItemId) return null;

  return {
    itemId: roll.inventoryItemId,
    type: TxType.OUT,
    quantity,
    batchLot: roll.batchLot,
    remarks: `${label} ${roll.rollNumber}`,
  };
}

export function rollInMovement(
  roll: { inventoryItemId: string | null; batchLot: string | null; rollNumber: string; weight?: number | null },
  quantity?: number,
  label = "Output roll",
): ProductionInventoryMovement | null {
  if (!roll.inventoryItemId) return null;
  const qty = quantity ?? roll.weight ?? 0;
  if (qty <= 0) return null;

  return {
    itemId: roll.inventoryItemId,
    type: TxType.IN,
    quantity: qty,
    batchLot: roll.batchLot,
    remarks: `${label} ${roll.rollNumber}`,
  };
}

export function itemOutMovement(
  itemId: string | null | undefined,
  quantity: number,
  batchLot?: string | null,
  remarks?: string,
): ProductionInventoryMovement | null {
  if (!itemId || quantity <= 0) return null;
  return { itemId, type: TxType.OUT, quantity, batchLot, remarks };
}

export function itemInMovement(
  itemId: string | null | undefined,
  quantity: number,
  batchLot?: string | null,
  remarks?: string,
): ProductionInventoryMovement | null {
  if (!itemId || quantity <= 0) return null;
  return { itemId, type: TxType.IN, quantity, batchLot, remarks };
}

/** PRD P36 alias — central helper for production IN/OUT inventory transactions. */
export const resolveProductionInventoryTx = postProductionInventoryMovements;
