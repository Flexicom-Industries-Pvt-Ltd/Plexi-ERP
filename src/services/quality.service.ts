import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import {
  Module,
  QcReferenceType,
  QcDecision,
  QcInspectionStatus,
  RollQualityStatus,
} from "@/generated/prisma";
import { parsePaginationParams, createPaginationMeta, PaginationMeta } from "@/lib/pagination";

export interface QcInspectionLineInput {
  parameterName: string;
  standardValue?: string;
  actualValue: string;
  unit?: string;
  status?: QcDecision;
  remarks?: string;
}

export interface CreateQcInspectionInput {
  referenceType: QcReferenceType;
  referenceId: string;
  inspectorId?: string;
  notes?: string;
  samplesInspected?: number;
  parameters?: Record<string, unknown>;
  lines?: QcInspectionLineInput[];
}

export interface RecordQcDecisionInput {
  decision: QcDecision;
  inspectorId?: string;
  notes?: string;
  defectReason?: string;
  reworkInstructions?: string;
  samplesInspected?: number;
  parameters?: Record<string, unknown>;
  lines?: QcInspectionLineInput[];
}

export interface ListQcInspectionsQuery {
  referenceType?: QcReferenceType | string | null;
  referenceId?: string | null;
  status?: QcInspectionStatus | string | null;
  decision?: QcDecision | string | null;
  inspectorId?: string | null;
  search?: string | null;
  page?: number | string | null;
  limit?: number | string | null;
}

export interface QcInspectionListResult {
  inspections: any[];
  meta?: PaginationMeta;
}

export class QualityService {
  /**
   * Generates a unique inspection sequence number (e.g. QC-20260915-0001).
   */
  static async generateInspectionNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `QC-${dateStr}-`;

    const latest = await db.qcInspection.findFirst({
      where: { inspectionNumber: { startsWith: prefix } },
      orderBy: { inspectionNumber: "desc" },
      select: { inspectionNumber: true },
    });

    let seq = 1;
    if (latest && latest.inspectionNumber) {
      const parts = latest.inspectionNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, "0")}`;
  }

  /**
   * Resolves target entity (Roll, Bale, Production Run) metadata.
   */
  static async resolveTarget(referenceType: QcReferenceType | string, referenceId: string) {
    if (referenceType === QcReferenceType.ROLL || referenceType === "ROLL") {
      return db.productionRoll.findUnique({
        where: { id: referenceId },
        include: { location: true, inventoryItem: true },
      });
    }

    if (referenceType === QcReferenceType.BALE || referenceType === "BALE") {
      return db.bale.findUnique({
        where: { id: referenceId },
        include: { product: true, shift: true },
      });
    }

    if (referenceType === QcReferenceType.PRODUCTION_RUN || referenceType === "PRODUCTION_RUN") {
      return db.productionRun.findUnique({
        where: { id: referenceId },
        include: { planLine: { include: { machine: true } }, recordedBy: true },
      });
    }

    return null;
  }

  /**
   * List QC inspections with filtering, search, and pagination.
   */
  static async listInspections(
    query: ListQcInspectionsQuery = {},
    options: { paginate?: boolean } = {}
  ): Promise<QcInspectionListResult> {
    const { referenceType, referenceId, status, decision, inspectorId, search } = query;

    const where: Record<string, unknown> = {};

    if (referenceType) where.referenceType = referenceType as QcReferenceType;
    if (referenceId) where.referenceId = referenceId;
    if (status) where.status = status as QcInspectionStatus;
    if (decision) where.decision = decision as QcDecision;
    if (inspectorId) where.inspectorId = inspectorId;

    if (search) {
      where.OR = [
        { inspectionNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { defectReason: { contains: search, mode: "insensitive" } },
        { referenceId: { contains: search, mode: "insensitive" } },
      ];
    }

    const { page, limit, skip, take, isPaginated } = parsePaginationParams(
      { page: query.page, limit: query.limit },
      { defaultLimit: 50, maxLimit: 200 }
    );

    const shouldPaginate = options.paginate || isPaginated;

    const [inspections, total] = await Promise.all([
      db.qcInspection.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          inspector: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeId: true,
            },
          },
          lines: true,
        },
        ...(shouldPaginate ? { skip, take } : {}),
      }),
      db.qcInspection.count({ where }),
    ]);

    return {
      inspections,
      ...(shouldPaginate ? { meta: createPaginationMeta(total, page, limit) } : {}),
    };
  }

  /**
   * Get single inspection by ID including line items and target metadata.
   */
  static async getInspectionById(id: string) {
    const inspection = await db.qcInspection.findUnique({
      where: { id },
      include: {
        inspector: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
          },
        },
        lines: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!inspection) return null;

    const target = await this.resolveTarget(inspection.referenceType, inspection.referenceId);

    return {
      ...inspection,
      target,
    };
  }

  /**
   * Create a new QC inspection record.
   */
  static async createInspection(data: CreateQcInspectionInput) {
    const inspectionNumber = await this.generateInspectionNumber();

    const result = await withTransaction(
      {
        action: "CREATE_QC_INSPECTION",
        module: Module.QUALITY_CONTROL,
        newValues: {
          inspectionNumber,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          inspectorId: data.inspectorId,
        },
      },
      async (tx) => {
        const inspection = await tx.qcInspection.create({
          data: {
            inspectionNumber,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            inspectorId: data.inspectorId,
            notes: data.notes,
            samplesInspected: data.samplesInspected ?? 1,
            parameters: data.parameters as any,
            status: QcInspectionStatus.PENDING,
            ...(data.lines && data.lines.length > 0
              ? {
                  lines: {
                    create: data.lines.map((line) => ({
                      parameterName: line.parameterName,
                      standardValue: line.standardValue,
                      actualValue: line.actualValue,
                      unit: line.unit,
                      status: line.status ?? QcDecision.PASSED,
                      remarks: line.remarks,
                    })),
                  },
                }
              : {}),
          },
          include: {
            inspector: true,
            lines: true,
          },
        });

        return inspection;
      }
    );

    return result;
  }

  /**
   * Record a final QC decision and synchronize linked qualityStatus on target roll/bale.
   */
  static async recordDecision(id: string, data: RecordQcDecisionInput) {
    const existing = await db.qcInspection.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existing) {
      throw new Error("QC inspection record not found.");
    }

    const result = await withTransaction(
      {
        action: "RECORD_QC_DECISION",
        module: Module.QUALITY_CONTROL,
        oldValues: { id, decision: existing.decision, status: existing.status },
        newValues: { id, decision: data.decision, defectReason: data.defectReason },
      },
      async (tx) => {
        // If new line evaluations are provided, update/recreate lines
        if (data.lines && data.lines.length > 0) {
          await tx.qcInspectionLine.deleteMany({
            where: { inspectionId: id },
          });

          await tx.qcInspectionLine.createMany({
            data: data.lines.map((line) => ({
              inspectionId: id,
              parameterName: line.parameterName,
              standardValue: line.standardValue,
              actualValue: line.actualValue,
              unit: line.unit,
              status: line.status ?? data.decision,
              remarks: line.remarks,
            })),
          });
        }

        const updatedInspection = await tx.qcInspection.update({
          where: { id },
          data: {
            decision: data.decision,
            status: QcInspectionStatus.COMPLETED,
            inspectedAt: new Date(),
            inspectorId: data.inspectorId ?? existing.inspectorId,
            notes: data.notes ?? existing.notes,
            defectReason: data.defectReason ?? existing.defectReason,
            reworkInstructions: data.reworkInstructions ?? existing.reworkInstructions,
            samplesInspected: data.samplesInspected ?? existing.samplesInspected,
            parameters: data.parameters ? (data.parameters as any) : existing.parameters,
          },
          include: {
            inspector: true,
            lines: true,
          },
        });

        // Synchronize target entity's qualityStatus
        const mappedQualityStatus: RollQualityStatus =
          data.decision === QcDecision.PASSED
            ? RollQualityStatus.PASSED
            : data.decision === QcDecision.FAILED
            ? RollQualityStatus.FAILED
            : data.decision === QcDecision.REWORK
            ? RollQualityStatus.REWORK
            : RollQualityStatus.ON_HOLD;

        if (existing.referenceType === QcReferenceType.ROLL) {
          await tx.productionRoll.updateMany({
            where: { id: existing.referenceId },
            data: { qualityStatus: mappedQualityStatus },
          });
        } else if (existing.referenceType === QcReferenceType.BALE) {
          await tx.bale.updateMany({
            where: { id: existing.referenceId },
            data: { qualityStatus: mappedQualityStatus },
          });
        }

        return updatedInspection;
      }
    );

    return result;
  }

  /**
   * Fetch QC Inspection Queue items and summary KPIs.
   */
  static async getInspectionQueue(
    query: {
      referenceType?: QcReferenceType | string | null;
      status?: RollQualityStatus | "ALL" | string | null;
      search?: string | null;
      page?: number | string | null;
      limit?: number | string | null;
    } = {}
  ) {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // 1. Gather global KPI metrics
    const [
      pendingRollsCount,
      pendingBalesCount,
      onHoldRollsCount,
      onHoldBalesCount,
      reworkRollsCount,
      reworkBalesCount,
      inspectedTodayCount,
      passedTodayCount,
      failedTodayCount,
      reworkTodayCount,
      onHoldTodayCount,
    ] = await Promise.all([
      db.productionRoll.count({ where: { qualityStatus: RollQualityStatus.PENDING_QC } }),
      db.bale.count({ where: { qualityStatus: RollQualityStatus.PENDING_QC } }),
      db.productionRoll.count({ where: { qualityStatus: RollQualityStatus.ON_HOLD } }),
      db.bale.count({ where: { qualityStatus: RollQualityStatus.ON_HOLD } }),
      db.productionRoll.count({ where: { qualityStatus: RollQualityStatus.REWORK } }),
      db.bale.count({ where: { qualityStatus: RollQualityStatus.REWORK } }),
      db.qcInspection.count({ where: { createdAt: { gte: startOfToday } } }),
      db.qcInspection.count({ where: { createdAt: { gte: startOfToday }, decision: QcDecision.PASSED } }),
      db.qcInspection.count({ where: { createdAt: { gte: startOfToday }, decision: QcDecision.FAILED } }),
      db.qcInspection.count({ where: { createdAt: { gte: startOfToday }, decision: QcDecision.REWORK } }),
      db.qcInspection.count({ where: { createdAt: { gte: startOfToday }, decision: QcDecision.ON_HOLD } }),
    ]);

    const stats = {
      pendingCount: pendingRollsCount + pendingBalesCount,
      onHoldCount: onHoldRollsCount + onHoldBalesCount,
      reworkCount: reworkRollsCount + reworkBalesCount,
      inspectedToday: inspectedTodayCount,
      passedToday: passedTodayCount,
      failedToday: failedTodayCount,
      reworkToday: reworkTodayCount,
      onHoldToday: onHoldTodayCount,
      passRate: inspectedTodayCount > 0 ? Math.round((passedTodayCount / inspectedTodayCount) * 100) : 100,
    };

    const targetType = query.referenceType;
    const filterStatus = query.status === "ALL" ? undefined : (query.status as RollQualityStatus) || RollQualityStatus.PENDING_QC;
    const search = query.search?.trim();

    const items: any[] = [];

    // Fetch Rolls if not filtered to another type
    if (!targetType || targetType === QcReferenceType.ROLL || targetType === "ROLL") {
      const rollWhere: Record<string, unknown> = {};
      if (filterStatus) rollWhere.qualityStatus = filterStatus;
      if (search) {
        rollWhere.OR = [
          { rollNumber: { contains: search, mode: "insensitive" } },
          { batchLot: { contains: search, mode: "insensitive" } },
          { inventoryItem: { name: { contains: search, mode: "insensitive" } } },
          { inventoryItem: { code: { contains: search, mode: "insensitive" } } },
        ];
      }

      const rolls = await db.productionRoll.findMany({
        where: rollWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          inventoryItem: true,
          location: true,
          loomProductionRun: { include: { loomMachine: true, operator: true } },
          laminationProductionRun: { include: { laminationMachine: true, operator: true } },
          printingProductionRun: { include: { printingMachine: true, operator: true } },
        },
      });

      for (const r of rolls) {
        items.push({
          id: r.id,
          referenceType: "ROLL",
          referenceId: r.id,
          identifier: r.rollNumber,
          type: r.rollType,
          sourcePhase: r.sourcePhase,
          status: r.qualityStatus,
          itemCode: r.inventoryItem?.code || "—",
          itemName: r.inventoryItem?.name || "Unassigned Item",
          weight: r.weight,
          length: r.length,
          batchLot: r.batchLot || "—",
          locationName: r.location ? `${r.location.code} (${r.location.name})` : "—",
          machineName:
            r.loomProductionRun?.loomMachine?.name ||
            r.laminationProductionRun?.laminationMachine?.name ||
            r.printingProductionRun?.printingMachine?.name ||
            "—",
          operatorName:
            r.loomProductionRun?.operator?.name ||
            r.laminationProductionRun?.operator?.name ||
            r.printingProductionRun?.operator?.name ||
            "—",
          characteristics: r.characteristics,
          createdAt: r.createdAt,
        });
      }
    }

    // Fetch Bales if not filtered to another type
    if (!targetType || targetType === QcReferenceType.BALE || targetType === "BALE") {
      const baleWhere: Record<string, unknown> = {};
      if (filterStatus) baleWhere.qualityStatus = filterStatus;
      if (search) {
        baleWhere.OR = [
          { baleNumber: { contains: search, mode: "insensitive" } },
          { productionBatch: { contains: search, mode: "insensitive" } },
          { product: { name: { contains: search, mode: "insensitive" } } },
          { product: { code: { contains: search, mode: "insensitive" } } },
        ];
      }

      const bales = await db.bale.findMany({
        where: baleWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          product: true,
          baleItem: true,
          shift: true,
          createdBy: true,
        },
      });

      for (const b of bales) {
        items.push({
          id: b.id,
          referenceType: "BALE",
          referenceId: b.id,
          identifier: b.baleNumber,
          type: "BALE",
          sourcePhase: "BALING",
          status: b.qualityStatus,
          itemCode: b.product?.code || "—",
          itemName: b.product?.name || "Baled Product",
          bagsPerBale: b.bagsPerBale,
          quantity: b.quantity,
          batchLot: b.productionBatch || "—",
          shiftName: b.shift?.name || "—",
          operatorName: b.createdBy?.name || "—",
          characteristics: b.characteristics,
          createdAt: b.createdAt,
        });
      }
    }

    // Sort combined queue by creation date descending
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const { page, limit, skip, take } = parsePaginationParams(
      { page: query.page, limit: query.limit },
      { defaultLimit: 50, maxLimit: 200 }
    );

    const paginatedItems = items.slice(skip, skip + take);

    return {
      items: paginatedItems,
      stats,
      meta: createPaginationMeta(items.length, page, limit),
    };
  }
}

