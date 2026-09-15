import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import {
  Module,
  RecyclingStatus,
  TransactionType,
} from "@/generated/prisma";
import { parsePaginationParams, createPaginationMeta } from "@/lib/pagination";
import { CreateRecyclingBatchInput, CompleteRecyclingBatchInput, ListRecyclingBatchesQuery } from "@/lib/schemas/recycling";

export class RecyclingService {
  /**
   * Generates a unique recycling batch number (e.g. RP-20260915-0001).
   */
  static async generateBatchNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `RP-${dateStr}-`;

    const latest = await db.recyclingBatch.findFirst({
      where: { batchNumber: { startsWith: prefix } },
      orderBy: { batchNumber: "desc" },
      select: { batchNumber: true },
    });

    let seq = 1;
    if (latest && latest.batchNumber) {
      const parts = latest.batchNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, "0")}`;
  }

  /**
   * List un-recycled scrap records available for batching.
   */
  static async getAvailableScrapForRecycling() {
    return db.scrapRecord.findMany({
      where: {
        isRecycled: false,
        recyclingBatchId: null,
      },
      orderBy: { recordedAt: "desc" },
      include: {
        inventoryItem: {
          select: { id: true, code: true, name: true },
        },
        location: {
          select: { id: true, code: true, name: true },
        },
        recordedBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * List recycling batches with search, filters, and pagination.
   */
  static async listRecyclingBatches(
    query: ListRecyclingBatchesQuery = {},
    options: { paginate?: boolean } = {}
  ) {
    const { status, granuleGrade, search } = query;

    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (granuleGrade) where.granuleGrade = granuleGrade;

    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: "insensitive" } },
        { granuleGrade: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const { page, limit, skip, take, isPaginated } = parsePaginationParams(
      { page: query.page, limit: query.limit },
      { defaultLimit: 50, maxLimit: 200 }
    );

    const shouldPaginate = options.paginate || isPaginated;

    const [batches, total] = await Promise.all([
      db.recyclingBatch.findMany({
        where,
        orderBy: { startedAt: "desc" },
        include: {
          outputItem: {
            select: { id: true, code: true, name: true },
          },
          outputLocation: {
            select: { id: true, code: true, name: true },
          },
          operator: {
            select: { id: true, name: true, employeeId: true },
          },
          _count: {
            select: { scrapRecords: true },
          },
        },
        ...(shouldPaginate ? { skip, take } : {}),
      }),
      db.recyclingBatch.count({ where }),
    ]);

    return {
      batches,
      ...(shouldPaginate ? { meta: createPaginationMeta(total, page, limit) } : {}),
    };
  }

  /**
   * Get single recycling batch by ID with scrap lines and transaction.
   */
  static async getRecyclingBatchById(id: string) {
    return db.recyclingBatch.findUnique({
      where: { id },
      include: {
        outputItem: true,
        outputLocation: true,
        operator: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
        scrapRecords: {
          include: {
            inventoryItem: { select: { id: true, code: true, name: true } },
            location: { select: { id: true, code: true, name: true } },
          },
        },
        inventoryTransaction: true,
      },
    });
  }

  /**
   * Create a new recycling batch consuming selected scrap records.
   */
  static async createRecyclingBatch(data: CreateRecyclingBatchInput) {
    const scrapRecords = await db.scrapRecord.findMany({
      where: {
        id: { in: data.scrapRecordIds },
        isRecycled: false,
        recyclingBatchId: null,
      },
      select: { id: true, quantity: true },
    });

    if (scrapRecords.length === 0) {
      throw new Error("No available scrap records found for the selected IDs");
    }

    const totalInputScrapQty = scrapRecords.reduce((sum, r) => sum + r.quantity, 0);
    const batchNumber = await this.generateBatchNumber();
    const startedAt = data.startedAt ? new Date(data.startedAt) : new Date();

    const result = await withTransaction(
      {
        action: "CREATE_RECYCLING_BATCH",
        module: Module.PRODUCTION,
        newValues: {
          batchNumber,
          inputScrapQty: totalInputScrapQty,
          granuleGrade: data.granuleGrade,
          scrapCount: scrapRecords.length,
        },
      },
      async (tx) => {
        const batch = await tx.recyclingBatch.create({
          data: {
            batchNumber,
            inputScrapQty: totalInputScrapQty,
            granuleGrade: data.granuleGrade,
            status: RecyclingStatus.IN_PROGRESS,
            outputItemId: data.outputItemId,
            outputLocationId: data.outputLocationId,
            operatorId: data.operatorId,
            notes: data.notes,
            startedAt,
          },
        });

        // Link scrap records to batch and mark recycled
        await tx.scrapRecord.updateMany({
          where: { id: { in: data.scrapRecordIds } },
          data: {
            recyclingBatchId: batch.id,
            isRecycled: true,
          },
        });

        return tx.recyclingBatch.findUnique({
          where: { id: batch.id },
          include: {
            outputItem: true,
            outputLocation: true,
            operator: { select: { id: true, name: true } },
            scrapRecords: true,
          },
        });
      }
    );

    return result;
  }

  /**
   * Complete recycling batch processing and record RP Granules inventory IN.
   */
  static async completeRecyclingBatch(id: string, data: CompleteRecyclingBatchInput) {
    const batch = await db.recyclingBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      throw new Error("Recycling batch not found");
    }

    if (batch.status !== RecyclingStatus.IN_PROGRESS) {
      throw new Error(`Cannot complete batch with status ${batch.status}`);
    }

    const completedAt = data.completedAt ? new Date(data.completedAt) : new Date();
    const outputRpQty = data.outputRpQty;
    const wasteLossQty = Math.max(0, Math.round((batch.inputScrapQty - outputRpQty) * 100) / 100);

    const result = await withTransaction(
      {
        action: "COMPLETE_RECYCLING_BATCH",
        module: Module.PRODUCTION,
        newValues: {
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          inputScrapQty: batch.inputScrapQty,
          outputRpQty,
          wasteLossQty,
          outputItemId: data.outputItemId,
        },
      },
      async (tx) => {
        // 1. Post Inventory IN transaction for the RP Granules item
        const inventoryTx = await tx.inventoryTransaction.create({
          data: {
            itemId: data.outputItemId,
            type: TransactionType.IN,
            quantity: outputRpQty,
            batchLot: batch.batchNumber,
            referenceType: "RECYCLING",
            referenceId: batch.batchNumber,
            remarks: `RP Granules batch ${batch.batchNumber} produced from ${batch.inputScrapQty}kg scrap (${batch.granuleGrade || "STANDARD"})`,
            userId: batch.operatorId,
          },
        });

        // 2. Increment target inventory item stock
        await tx.inventoryItem.update({
          where: { id: data.outputItemId },
          data: {
            currentStock: {
              increment: outputRpQty,
            },
          },
        });

        // 3. Update recycling batch status and metrics
        const updatedBatch = await tx.recyclingBatch.update({
          where: { id },
          data: {
            status: RecyclingStatus.COMPLETED,
            outputRpQty,
            wasteLossQty,
            outputItemId: data.outputItemId,
            outputLocationId: data.outputLocationId || batch.outputLocationId,
            inventoryTransactionId: inventoryTx.id,
            completedAt,
            notes: data.notes ? `${batch.notes || ""}\n${data.notes}`.trim() : batch.notes,
          },
          include: {
            outputItem: true,
            outputLocation: true,
            operator: { select: { id: true, name: true } },
            scrapRecords: true,
            inventoryTransaction: true,
          },
        });

        return updatedBatch;
      }
    );

    return result;
  }

  /**
   * Calculate recycling summary KPIs and yield conversion metrics.
   */
  static async getRecyclingStats() {
    const [allBatches, availableScraps] = await Promise.all([
      db.recyclingBatch.findMany({
        select: {
          inputScrapQty: true,
          outputRpQty: true,
          wasteLossQty: true,
          status: true,
          granuleGrade: true,
        },
      }),
      db.scrapRecord.findMany({
        where: { isRecycled: false, recyclingBatchId: null },
        select: { quantity: true },
      }),
    ]);

    let totalInputScrap = 0;
    let totalOutputRp = 0;
    let totalWasteLoss = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    const gradeBreakdown: Record<string, { input: number; output: number }> = {};

    for (const b of allBatches) {
      if (b.status === RecyclingStatus.COMPLETED) {
        completedCount++;
        totalInputScrap += b.inputScrapQty;
        totalOutputRp += b.outputRpQty || 0;
        totalWasteLoss += b.wasteLossQty || 0;

        const grade = b.granuleGrade || "STANDARD";
        if (!gradeBreakdown[grade]) {
          gradeBreakdown[grade] = { input: 0, output: 0 };
        }
        gradeBreakdown[grade].input += b.inputScrapQty;
        gradeBreakdown[grade].output += b.outputRpQty || 0;
      } else if (b.status === RecyclingStatus.IN_PROGRESS) {
        inProgressCount++;
      }
    }

    const availableScrapWeight = availableScraps.reduce((sum, s) => sum + s.quantity, 0);
    const overallYieldPct =
      totalInputScrap > 0 ? Math.round((totalOutputRp / totalInputScrap) * 10000) / 100 : 0;

    return {
      totalBatches: allBatches.length,
      completedCount,
      inProgressCount,
      totalInputScrap: Math.round(totalInputScrap * 100) / 100,
      totalOutputRp: Math.round(totalOutputRp * 100) / 100,
      totalWasteLoss: Math.round(totalWasteLoss * 100) / 100,
      availableScrapWeight: Math.round(availableScrapWeight * 100) / 100,
      availableScrapCount: availableScraps.length,
      overallYieldPct,
      gradeBreakdown,
    };
  }
}
