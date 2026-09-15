import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import {
  Module,
  ScrapSourceType,
  TransactionType,
  RollQualityStatus,
} from "@/generated/prisma";
import { parsePaginationParams, createPaginationMeta, PaginationMeta } from "@/lib/pagination";

export interface CreateScrapRecordInput {
  sourceType: ScrapSourceType;
  sourceId?: string;
  phase: string;
  reasonCode: string;
  quantity: number;
  unit?: string;
  inventoryItemId?: string;
  locationId?: string;
  recordedById?: string;
  notes?: string;
  recordedAt?: string | Date;
}

export interface ListScrapRecordsQuery {
  phase?: string | null;
  sourceType?: ScrapSourceType | string | null;
  reasonCode?: string | null;
  inventoryItemId?: string | null;
  locationId?: string | null;
  search?: string | null;
  page?: number | string | null;
  limit?: number | string | null;
}

export class ScrapService {
  /**
   * Generates a unique scrap sequence number (e.g. SCR-20260915-0001).
   */
  static async generateScrapNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `SCR-${dateStr}-`;

    const latest = await db.scrapRecord.findFirst({
      where: { scrapNumber: { startsWith: prefix } },
      orderBy: { scrapNumber: "desc" },
      select: { scrapNumber: true },
    });

    let seq = 1;
    if (latest && latest.scrapNumber) {
      const parts = latest.scrapNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, "0")}`;
  }

  /**
   * List scrap records with filtering, search, and pagination.
   */
  static async listScrapRecords(
    query: ListScrapRecordsQuery = {},
    options: { paginate?: boolean } = {}
  ) {
    const { phase, sourceType, reasonCode, inventoryItemId, locationId, search } = query;

    const where: Record<string, unknown> = {};

    if (phase) where.phase = phase;
    if (sourceType) where.sourceType = sourceType as ScrapSourceType;
    if (reasonCode) where.reasonCode = reasonCode;
    if (inventoryItemId) where.inventoryItemId = inventoryItemId;
    if (locationId) where.locationId = locationId;

    if (search) {
      where.OR = [
        { scrapNumber: { contains: search, mode: "insensitive" } },
        { reasonCode: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { phase: { contains: search, mode: "insensitive" } },
      ];
    }

    const { page, limit, skip, take, isPaginated } = parsePaginationParams(
      { page: query.page, limit: query.limit },
      { defaultLimit: 50, maxLimit: 200 }
    );

    const shouldPaginate = options.paginate || isPaginated;

    const [records, total] = await Promise.all([
      db.scrapRecord.findMany({
        where,
        orderBy: { recordedAt: "desc" },
        include: {
          inventoryItem: {
            select: { id: true, code: true, name: true },
          },
          location: {
            select: { id: true, code: true, name: true },
          },
          recordedBy: {
            select: { id: true, name: true, email: true, employeeId: true },
          },
          inventoryTransaction: {
            select: { id: true, type: true, quantity: true },
          },
        },
        ...(shouldPaginate ? { skip, take } : {}),
      }),
      db.scrapRecord.count({ where }),
    ]);

    return {
      records,
      ...(shouldPaginate ? { meta: createPaginationMeta(total, page, limit) } : {}),
    };
  }

  /**
   * Get single scrap record by ID.
   */
  static async getScrapById(id: string) {
    return db.scrapRecord.findUnique({
      where: { id },
      include: {
        inventoryItem: true,
        location: true,
        recordedBy: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
        inventoryTransaction: true,
      },
    });
  }

  /**
   * Calculate Scrap summary analytics & breakdown metrics.
   */
  static async getScrapStats() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [allRecords, todayRecords, monthRecords] = await Promise.all([
      db.scrapRecord.findMany({
        select: { quantity: true, phase: true, reasonCode: true },
      }),
      db.scrapRecord.findMany({
        where: { recordedAt: { gte: startOfToday } },
        select: { quantity: true },
      }),
      db.scrapRecord.findMany({
        where: { recordedAt: { gte: startOfMonth } },
        select: { quantity: true },
      }),
    ]);

    const todayScrapWeight = todayRecords.reduce((sum, r) => sum + r.quantity, 0);
    const monthScrapWeight = monthRecords.reduce((sum, r) => sum + r.quantity, 0);
    const totalScrapWeight = allRecords.reduce((sum, r) => sum + r.quantity, 0);

    const phaseBreakdown: Record<string, number> = {};
    const reasonBreakdown: Record<string, number> = {};

    for (const r of allRecords) {
      phaseBreakdown[r.phase] = (phaseBreakdown[r.phase] || 0) + r.quantity;
      reasonBreakdown[r.reasonCode] = (reasonBreakdown[r.reasonCode] || 0) + r.quantity;
    }

    return {
      todayScrapWeight: Math.round(todayScrapWeight * 100) / 100,
      monthScrapWeight: Math.round(monthScrapWeight * 100) / 100,
      totalScrapWeight: Math.round(totalScrapWeight * 100) / 100,
      phaseBreakdown,
      reasonBreakdown,
    };
  }

  /**
   * Record scrap and automatically post inventory OUT movement if item is specified.
   */
  static async recordScrap(data: CreateScrapRecordInput) {
    const scrapNumber = await this.generateScrapNumber();
    const recordDate = data.recordedAt ? new Date(data.recordedAt) : new Date();

    const result = await withTransaction(
      {
        action: "RECORD_SCRAP_WASTE",
        module: Module.QUALITY_CONTROL,
        newValues: {
          scrapNumber,
          phase: data.phase,
          reasonCode: data.reasonCode,
          quantity: data.quantity,
          inventoryItemId: data.inventoryItemId,
        },
      },
      async (tx) => {
        let inventoryTxId: string | undefined = undefined;

        // Post Inventory OUT transaction if material inventory item is identified
        if (data.inventoryItemId) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: data.inventoryItemId },
          });

          if (item) {
            const inventoryTx = await tx.inventoryTransaction.create({
              data: {
                itemId: data.inventoryItemId,
                type: TransactionType.OUT,
                quantity: data.quantity,
                referenceType: "SCRAP",
                referenceId: scrapNumber,
                remarks: `Scrap generated in phase ${data.phase}: ${data.reasonCode}`,
                userId: data.recordedById,
              },
            });

            inventoryTxId = inventoryTx.id;

            // Decrement item currentStock
            await tx.inventoryItem.update({
              where: { id: data.inventoryItemId },
              data: {
                currentStock: {
                  decrement: data.quantity,
                },
              },
            });
          }
        }

        const scrapRecord = await tx.scrapRecord.create({
          data: {
            scrapNumber,
            sourceType: data.sourceType,
            sourceId: data.sourceId,
            phase: data.phase,
            reasonCode: data.reasonCode,
            quantity: data.quantity,
            unit: data.unit || "kg",
            inventoryItemId: data.inventoryItemId,
            locationId: data.locationId,
            inventoryTransactionId: inventoryTxId,
            recordedById: data.recordedById,
            notes: data.notes,
            recordedAt: recordDate,
          },
          include: {
            inventoryItem: true,
            location: true,
            recordedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        // If scrap source is a roll or bale, update its qualityStatus to FAILED
        if (data.sourceType === ScrapSourceType.ROLL && data.sourceId) {
          await tx.productionRoll.updateMany({
            where: { id: data.sourceId },
            data: { qualityStatus: RollQualityStatus.FAILED },
          });
        } else if (data.sourceType === ScrapSourceType.BALE && data.sourceId) {
          await tx.bale.updateMany({
            where: { id: data.sourceId },
            data: { qualityStatus: RollQualityStatus.FAILED },
          });
        }

        return scrapRecord;
      }
    );

    return result;
  }
}
