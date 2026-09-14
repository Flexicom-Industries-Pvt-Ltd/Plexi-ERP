import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import { logEvent, logDiff } from "@/lib/logging";
import { Module, ItemType } from "@/generated/prisma";
import { parsePaginationParams, createPaginationMeta, PaginationMeta } from "@/lib/pagination";

export interface ListInventoryItemsQuery {
  type?: string | null;
  search?: string | null;
  materialType?: string | null;
  includeMovement?: boolean;
  page?: number | string | null;
  limit?: number | string | null;
}

export interface InventoryItemListResult {
  items: any[];
  meta?: PaginationMeta;
}

export class InventoryService {
  /**
   * List inventory items with optional movement summaries and pagination.
   */
  static async listInventoryItems(
    query: ListInventoryItemsQuery,
    options: { paginate?: boolean } = {}
  ): Promise<InventoryItemListResult> {
    const { type, search, materialType, includeMovement = false } = query;

    const where: Record<string, unknown> = {};
    if (type) where.itemType = type;
    if (materialType) where.stock = { materialType };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const { page, limit, skip, take, isPaginated } = parsePaginationParams(
      { page: query.page, limit: query.limit },
      { defaultLimit: 50, maxLimit: 200 }
    );

    const shouldPaginate = options.paginate || isPaginated;

    const [items, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          category: true,
          subCategory: true,
          uom: true,
          location: true,
          stock: true,
        },
        ...(shouldPaginate ? { skip, take } : {}),
      }),
      shouldPaginate ? db.inventoryItem.count({ where }) : Promise.resolve(0),
    ]);

    if (!includeMovement) {
      return {
        items,
        ...(shouldPaginate ? { meta: createPaginationMeta(total, page, limit) } : {}),
      };
    }

    // Batch movement calculation using groupBy to eliminate N+1 queries
    const itemIds = items.map((i) => i.id);
    const movements = itemIds.length
      ? await db.inventoryTransaction.groupBy({
          by: ["itemId", "type"],
          where: { itemId: { in: itemIds } },
          _sum: { quantity: true },
        })
      : [];

    const movementMap = new Map<string, { received: number; consumed: number }>();
    for (const row of movements) {
      const current = movementMap.get(row.itemId) || { received: 0, consumed: 0 };
      const qty = row._sum.quantity ?? 0;
      if (row.type === "IN") current.received += qty;
      if (row.type === "OUT") current.consumed += qty;
      movementMap.set(row.itemId, current);
    }

    const enriched = items.map((item) => {
      const movement = movementMap.get(item.id) || { received: 0, consumed: 0 };
      return {
        ...item,
        movementSummary: {
          available: item.currentStock,
          reserved: item.reservedStock,
          received: movement.received,
          consumed: movement.consumed,
        },
      };
    });

    return {
      items: enriched,
      ...(shouldPaginate ? { meta: createPaginationMeta(total, page, limit) } : {}),
    };
  }

  /**
   * Get single inventory item with details.
   */
  static async getInventoryItem(id: string) {
    return db.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
        uom: true,
        location: true,
        stock: true,
      },
    });
  }

  /**
   * Create inventory item with unique code verification.
   */
  static async createInventoryItem(data: any, userId?: string) {
    const existing = await db.inventoryItem.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new Error(`An inventory item with code ${data.code} already exists.`);
    }

    const item = await db.inventoryItem.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description || null,
        itemType: data.itemType as ItemType,
        categoryId: data.categoryId || null,
        subCategoryId: data.subCategoryId || null,
        uomId: data.uomId,
        locationId: data.locationId || null,
        currentStock: data.currentStock ?? 0,
        minimumStock: data.minimumStock ?? 0,
        isActive: data.isActive ?? true,
      },
      include: {
        category: true,
        subCategory: true,
        uom: true,
        location: true,
      },
    });

    logEvent({
      userId,
      module: "INVENTORY",
      severity: "INFO",
      action: "Created Inventory Item",
      payload: { itemId: item.id, code: item.code, name: item.name },
    }).catch(console.error);

    return item;
  }

  /**
   * Update inventory item attributes.
   */
  static async updateInventoryItem(id: string, data: any, userId?: string) {
    const existing = await db.inventoryItem.findUnique({ where: { id } });
    if (!existing) return null;

    if (data.code && data.code !== existing.code) {
      const duplicate = await db.inventoryItem.findUnique({ where: { code: data.code } });
      if (duplicate) {
        throw new Error(`An inventory item with code ${data.code} already exists.`);
      }
    }

    const updated = await db.inventoryItem.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.itemType && { itemType: data.itemType as ItemType }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.subCategoryId !== undefined && { subCategoryId: data.subCategoryId }),
        ...(data.uomId && { uomId: data.uomId }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
        ...(data.minimumStock !== undefined && { minimumStock: Number(data.minimumStock) }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
      },
      include: {
        category: true,
        subCategory: true,
        uom: true,
        location: true,
      },
    });

    await logDiff({
      userId: userId || undefined,
      module: "INVENTORY",
      entity: "InventoryItem",
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  /**
   * Soft-deletes or hard-deletes inventory item safely depending on transaction history.
   */
  static async deleteInventoryItem(id: string, userId?: string) {
    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    });
    if (!item) return { notFound: true };

    // If item has past transaction ledger records, soft-delete (deactivate) to protect relational integrity
    if (item._count.transactions > 0) {
      await db.inventoryItem.update({
        where: { id },
        data: { isActive: false },
      });

      logEvent({
        userId,
        module: "INVENTORY",
        severity: "WARN",
        action: "Deactivated Inventory Item (Has Transaction History)",
        payload: { itemId: item.id, code: item.code, transactionCount: item._count.transactions },
      }).catch(console.error);

      return { success: true, softDeleted: true };
    }

    // No transactions attached — safe to hard delete
    await db.inventoryItem.delete({
      where: { id },
    });

    logEvent({
      userId,
      module: "INVENTORY",
      severity: "WARN",
      action: "Deleted Inventory Item",
      payload: { itemId: item.id, code: item.code },
    }).catch(console.error);

    return { success: true, softDeleted: false };
  }

  /**
   * Performs an atomic inventory stock adjustment.
   */
  static async adjustStock(
    itemId: string,
    data: { quantity: number; remarks?: string },
    userId?: string
  ) {
    return withTransaction(
      {
        action: "ADJUST_INVENTORY_STOCK",
        module: Module.INVENTORY,
        entityId: itemId,
        newValues: data,
      },
      async (tx, context) => {
        const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
        if (!item) throw new Error("Inventory item not found");

        const qtyDelta = Number(data.quantity);
        const newStock = item.currentStock + qtyDelta;

        const updatedItem = await tx.inventoryItem.update({
          where: { id: itemId },
          data: { currentStock: newStock },
        });

        await tx.inventoryTransaction.create({
          data: {
            itemId,
            type: qtyDelta >= 0 ? "IN" : "OUT",
            quantity: Math.abs(qtyDelta),
            referenceType: "ADJUSTMENT",
            remarks: data.remarks || "Manual stock adjustment",
            userId: context.userId || null,
          },
        });

        return updatedItem;
      }
    );
  }
}
