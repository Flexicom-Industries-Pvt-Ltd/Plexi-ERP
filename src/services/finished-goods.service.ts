import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import {
  Module,
  FinishedGoodsStatus,
  RollQualityStatus,
  TransactionType,
  Prisma,
} from "@/generated/prisma";
import { parsePaginationParams, createPaginationMeta } from "@/lib/pagination";
import { logEvent, logDiff } from "@/lib/logging";
import {
  ReceiveFinishedGoodsInput,
  UpdateFinishedGoodsLotInput,
  ListFinishedGoodsQuery,
} from "@/lib/schemas/finished-goods";

export class FinishedGoodsService {
  /**
   * Generates an atomic FG lot number (e.g. FG-20260915-0001).
   */
  static async generateLotNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `FG-${dateStr}-`;

    const latest = await db.finishedGoodsLot.findFirst({
      where: { lotNumber: { startsWith: prefix } },
      orderBy: { lotNumber: "desc" },
      select: { lotNumber: true },
    });

    let seq = 1;
    if (latest && latest.lotNumber) {
      const parts = latest.lotNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, "0")}`;
  }

  /**
   * Promote passed bales or receive manual stock into Finished Goods.
   */
  static async receiveFinishedGoods(
    input: ReceiveFinishedGoodsInput,
    userContext?: { userId?: string }
  ) {
    const userId = userContext?.userId;

    // Handle bale promotion (single or multiple bales)
    const baleIds = input.baleIds || (input.baleId ? [input.baleId] : []);

    if (baleIds.length > 0) {
      const results = [];

      for (const baleId of baleIds) {
        const bale = await db.bale.findUnique({
          where: { id: baleId },
          include: {
            product: true,
            baleItem: true,
            shift: true,
          },
        });

        if (!bale) {
          throw new Error(`Bale not found with ID: ${baleId}`);
        }

        if (bale.qualityStatus !== RollQualityStatus.PASSED) {
          throw new Error(
            `Bale ${bale.baleNumber} has quality status '${bale.qualityStatus}'. Only PASSED bales can be promoted to Finished Goods.`
          );
        }

        const targetItemId = bale.baleItemId || bale.productId;
        const totalBags = bale.quantity * bale.bagsPerBale;
        const lotNumber = await this.generateLotNumber();

        const lot: any = await withTransaction(
          {
            action: "RECEIVE_FINISHED_GOODS_FROM_BALE",
            module: Module.INVENTORY,
          },
          async (tx, context) => {
            // 1. Create Finished Goods Lot
            const createdLot = await tx.finishedGoodsLot.create({
              data: {
                lotNumber,
                inventoryItemId: targetItemId,
                baleId: bale.id,
                quantity: totalBags,
                initialQuantity: totalBags,
                unit: input.unit || "bags",
                productionBatch: bale.productionBatch || null,
                grossWeight: input.grossWeight || null,
                netWeight: input.netWeight || null,
                qualityStatus: RollQualityStatus.PASSED,
                status: FinishedGoodsStatus.AVAILABLE,
                locationId: input.locationId || null,
                notes: input.notes || `Promoted from Bale ${bale.baleNumber}`,
                receivedById: userId || null,
                receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
              },
            });

            // 2. Post Inventory Transaction IN
            const invTx = await tx.inventoryTransaction.create({
              data: {
                itemId: targetItemId,
                type: TransactionType.IN,
                quantity: totalBags,
                batchLot: bale.productionBatch || null,
                referenceType: "FINISHED_GOODS",
                referenceId: createdLot.id,
                remarks: `Received ${totalBags} bags from Bale ${bale.baleNumber} into FG Lot ${lotNumber}`,
                userId: userId || null,
              },
            });

            // 3. Link inventory transaction to lot
            const updatedLot = await tx.finishedGoodsLot.update({
              where: { id: createdLot.id },
              data: { inventoryTransactionId: invTx.id },
              include: {
                inventoryItem: true,
                bale: true,
                location: true,
                receivedBy: { select: { id: true, name: true, email: true } },
              },
            });

            // 4. Update item current stock
            await tx.inventoryItem.update({
              where: { id: targetItemId },
              data: {
                currentStock: { increment: totalBags },
              },
            });

            // 5. Update or create InventoryBatch if batch exists
            if (bale.productionBatch) {
              const existingBatch = await tx.inventoryBatch.findUnique({
                where: {
                  itemId_batchLot: {
                    itemId: targetItemId,
                    batchLot: bale.productionBatch,
                  },
                },
              });

              if (existingBatch) {
                await tx.inventoryBatch.update({
                  where: { id: existingBatch.id },
                  data: {
                    quantity: { increment: totalBags },
                    locationId: input.locationId || existingBatch.locationId,
                  },
                });
              } else {
                await tx.inventoryBatch.create({
                  data: {
                    itemId: targetItemId,
                    batchLot: bale.productionBatch,
                    quantity: totalBags,
                    locationId: input.locationId || null,
                  },
                });
              }
            }

            // 6. Mark Bale as inventoryPosted
            await tx.bale.update({
              where: { id: bale.id },
              data: { inventoryPosted: true },
            });

            return updatedLot;
          }
        );

        await logEvent({
          userId,
          module: "INVENTORY",
          severity: "INFO",
          action: "PROMOTED_BALE_TO_FINISHED_GOODS",
          payload: {
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            baleId: bale.id,
            baleNumber: bale.baleNumber,
            quantity: totalBags,
          },
        });

        results.push(lot);
      }

      return results.length === 1 ? results[0] : results;
    }

    // Direct / manual FG stock intake
    if (!input.inventoryItemId) {
      throw new Error("Either baleIds or inventoryItemId must be provided");
    }

    if (!input.quantity || input.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const item = await db.inventoryItem.findUnique({
      where: { id: input.inventoryItemId },
    });

    if (!item) {
      throw new Error("Inventory Item not found");
    }

    const lotNumber = await this.generateLotNumber();

    const lot: any = await withTransaction(
      {
        action: "RECEIVE_MANUAL_FINISHED_GOODS",
        module: Module.INVENTORY,
      },
      async (tx, context) => {
        const createdLot = await tx.finishedGoodsLot.create({
          data: {
            lotNumber,
            inventoryItemId: input.inventoryItemId!,
            baleId: null,
            quantity: input.quantity!,
            initialQuantity: input.quantity!,
            unit: input.unit || "bags",
            productionBatch: input.productionBatch || null,
            grossWeight: input.grossWeight || null,
            netWeight: input.netWeight || null,
            qualityStatus: input.qualityStatus || RollQualityStatus.PASSED,
            status: FinishedGoodsStatus.AVAILABLE,
            locationId: input.locationId || null,
            notes: input.notes || "Manual finished goods receipt",
            receivedById: userId || null,
            receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
          },
        });

        const invTx = await tx.inventoryTransaction.create({
          data: {
            itemId: input.inventoryItemId!,
            type: TransactionType.IN,
            quantity: input.quantity!,
            batchLot: input.productionBatch || null,
            referenceType: "FINISHED_GOODS",
            referenceId: createdLot.id,
            remarks: `Manual FG receipt into Lot ${lotNumber}`,
            userId: userId || null,
          },
        });

        const updatedLot = await tx.finishedGoodsLot.update({
          where: { id: createdLot.id },
          data: { inventoryTransactionId: invTx.id },
          include: {
            inventoryItem: true,
            location: true,
            receivedBy: { select: { id: true, name: true, email: true } },
          },
        });

        await tx.inventoryItem.update({
          where: { id: input.inventoryItemId },
          data: {
            currentStock: { increment: input.quantity },
          },
        });

        if (input.productionBatch) {
          const existingBatch = await tx.inventoryBatch.findUnique({
            where: {
              itemId_batchLot: {
                itemId: input.inventoryItemId!,
                batchLot: input.productionBatch,
              },
            },
          });

          if (existingBatch) {
            await tx.inventoryBatch.update({
              where: { id: existingBatch.id },
              data: {
                quantity: { increment: input.quantity },
                locationId: input.locationId || existingBatch.locationId,
              },
            });
          } else {
            await tx.inventoryBatch.create({
              data: {
                itemId: input.inventoryItemId!,
                batchLot: input.productionBatch,
                quantity: input.quantity!,
                locationId: input.locationId || null,
              },
            });
          }
        }

        return updatedLot;
      }
    );

    await logEvent({
      userId,
      module: "INVENTORY",
      severity: "INFO",
      action: "RECEIVED_MANUAL_FINISHED_GOODS",
      payload: {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        quantity: input.quantity,
        itemId: input.inventoryItemId,
      },
    });

    return lot;
  }

  /**
   * List finished goods lots with filtering, search, and pagination.
   */
  static async listFinishedGoods(
    query: ListFinishedGoodsQuery = {},
    options: { paginate?: boolean } = {}
  ) {
    const {
      inventoryItemId,
      productionBatch,
      locationId,
      status,
      qualityStatus,
      search,
      dateFrom,
      dateTo,
    } = query;

    const where: Prisma.FinishedGoodsLotWhereInput = {};

    if (inventoryItemId) where.inventoryItemId = inventoryItemId;
    if (productionBatch) where.productionBatch = productionBatch;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (qualityStatus) where.qualityStatus = qualityStatus;

    if (search) {
      where.OR = [
        { lotNumber: { contains: search, mode: "insensitive" } },
        { productionBatch: { contains: search, mode: "insensitive" } },
        { inventoryItem: { name: { contains: search, mode: "insensitive" } } },
        { inventoryItem: { code: { contains: search, mode: "insensitive" } } },
        { bale: { baleNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.receivedAt = {};
      if (dateFrom) where.receivedAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.receivedAt.lte = end;
      }
    }

    if (options.paginate) {
      const { page, limit, skip } = parsePaginationParams({
        page: query.page,
        limit: query.limit,
      });

      const [total, data] = await Promise.all([
        db.finishedGoodsLot.count({ where }),
        db.finishedGoodsLot.findMany({
          where,
          skip,
          take: limit,
          orderBy: { receivedAt: "desc" },
          include: {
            inventoryItem: {
              include: {
                uom: true,
                category: true,
              },
            },
            bale: {
              include: {
                shift: true,
              },
            },
            location: true,
            receivedBy: {
              select: { id: true, name: true, email: true },
            },
            dispatchAllocations: {
              include: {
                dispatchOrderLine: {
                  include: {
                    dispatchOrder: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        data,
        pagination: createPaginationMeta(total, page, limit),
      };
    }

    return db.finishedGoodsLot.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      include: {
        inventoryItem: {
          include: {
            uom: true,
            category: true,
          },
        },
        bale: {
          include: {
            shift: true,
          },
        },
        location: true,
        receivedBy: {
          select: { id: true, name: true, email: true },
        },
        dispatchAllocations: {
          include: {
            dispatchOrderLine: {
              include: {
                dispatchOrder: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get single finished goods lot by ID.
   */
  static async getFinishedGoodsById(id: string) {
    return db.finishedGoodsLot.findUnique({
      where: { id },
      include: {
        inventoryItem: {
          include: {
            uom: true,
            category: true,
            location: true,
          },
        },
        bale: {
          include: {
            product: true,
            shift: true,
            createdBy: { select: { id: true, name: true, email: true } },
          },
        },
        location: true,
        receivedBy: {
          select: { id: true, name: true, email: true },
        },
        inventoryTransaction: true,
        dispatchAllocations: {
          include: {
            dispatchOrderLine: {
              include: {
                dispatchOrder: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Update finished goods lot attributes.
   */
  static async updateFinishedGoodsLot(
    id: string,
    input: UpdateFinishedGoodsLotInput,
    userContext?: { userId?: string }
  ) {
    const existing = await db.finishedGoodsLot.findUnique({ where: { id } });
    if (!existing) return null;

    const data: Prisma.FinishedGoodsLotUpdateInput = {};

    if (input.locationId !== undefined) {
      data.location = input.locationId ? { connect: { id: input.locationId } } : { disconnect: true };
    }
    if (input.status) data.status = input.status;
    if (input.qualityStatus) data.qualityStatus = input.qualityStatus;
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.grossWeight !== undefined) data.grossWeight = input.grossWeight;
    if (input.netWeight !== undefined) data.netWeight = input.netWeight;

    const updated = await db.finishedGoodsLot.update({
      where: { id },
      data,
      include: {
        inventoryItem: true,
        location: true,
        receivedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await logDiff({
      userId: userContext?.userId,
      module: "INVENTORY",
      entity: "FinishedGoodsLot",
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  /**
   * Get queue of passed bales ready to be received into Finished Goods stock.
   */
  static async getBalesQueue(query: { search?: string; shiftId?: string } = {}) {
    const where: Prisma.BaleWhereInput = {
      qualityStatus: RollQualityStatus.PASSED,
      inventoryPosted: false,
    };

    if (query.shiftId) {
      where.shiftId = query.shiftId;
    }

    if (query.search) {
      where.OR = [
        { baleNumber: { contains: query.search, mode: "insensitive" } },
        { productionBatch: { contains: query.search, mode: "insensitive" } },
        { product: { name: { contains: query.search, mode: "insensitive" } } },
        { product: { code: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    return db.bale.findMany({
      where,
      orderBy: { baledAt: "desc" },
      include: {
        product: {
          include: {
            uom: true,
            category: true,
          },
        },
        baleItem: true,
        shift: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Aggregate stats for finished goods dashboard.
   */
  static async getFinishedGoodsStats() {
    const [
      totalLots,
      aggregates,
      availableLots,
      allocatedLots,
      dispatchedLots,
      holdLots,
      qualityPassed,
      qualityHold,
      recentLots,
      queueCount,
    ] = await Promise.all([
      db.finishedGoodsLot.count(),
      db.finishedGoodsLot.aggregate({
        _sum: {
          quantity: true,
          initialQuantity: true,
          allocatedQty: true,
          dispatchedQty: true,
        },
      }),
      db.finishedGoodsLot.count({ where: { status: FinishedGoodsStatus.AVAILABLE } }),
      db.finishedGoodsLot.count({ where: { status: FinishedGoodsStatus.ALLOCATED } }),
      db.finishedGoodsLot.count({ where: { status: FinishedGoodsStatus.DISPATCHED } }),
      db.finishedGoodsLot.count({ where: { status: FinishedGoodsStatus.ON_HOLD } }),
      db.finishedGoodsLot.count({ where: { qualityStatus: RollQualityStatus.PASSED } }),
      db.finishedGoodsLot.count({ where: { qualityStatus: RollQualityStatus.ON_HOLD } }),
      db.finishedGoodsLot.findMany({
        take: 5,
        orderBy: { receivedAt: "desc" },
        include: {
          inventoryItem: true,
          bale: true,
          location: true,
        },
      }),
      db.bale.count({
        where: {
          qualityStatus: RollQualityStatus.PASSED,
          inventoryPosted: false,
        },
      }),
    ]);

    return {
      totalLots,
      totalBagsInStock: aggregates._sum.quantity || 0,
      totalInitialBags: aggregates._sum.initialQuantity || 0,
      totalAllocatedBags: aggregates._sum.allocatedQty || 0,
      totalDispatchedBags: aggregates._sum.dispatchedQty || 0,
      availableLots,
      allocatedLots,
      dispatchedLots,
      holdLots,
      qualityPassed,
      qualityHold,
      queueCount,
      recentLots,
    };
  }

  /**
   * Resolves the full multi-tier upstream traceability chain for a Finished Goods Lot:
   * FG Lot -> Bale -> QC Inspection -> Production Run -> Production Plan -> Upstream Rolls -> Bobbins -> Raw Material Gate Intake
   */
  static async getFinishedGoodsTraceability(id: string) {
    const lot = await db.finishedGoodsLot.findUnique({
      where: { id },
      include: {
        inventoryItem: {
          include: {
            uom: true,
            category: true,
          },
        },
        bale: {
          include: {
            product: true,
            shift: true,
            createdBy: { select: { id: true, name: true, email: true } },
          },
        },
        location: true,
        receivedBy: { select: { id: true, name: true, email: true } },
        inventoryTransaction: true,
      },
    });

    if (!lot) return null;

    // 1. Look for QC Inspection records linked to this Bale
    let qcInspections: any[] = [];
    if (lot.baleId) {
      qcInspections = await db.qcInspection.findMany({
        where: {
          referenceType: "BALE",
          referenceId: lot.baleId,
        },
        include: {
          inspector: { select: { id: true, name: true, email: true } },
          lines: true,
        },
      });
    }

    // 2. Look for Upstream Production Runs that produced this bag product or match productionBatch
    let productionRuns: any[] = [];
    if (lot.productionBatch || lot.bale?.productId) {
      const searchItemId = lot.bale?.productId || lot.inventoryItemId;

      // Find bag production runs (Convertex, BCS, Valvomatic, Manual Stitch, Cutting)
      const matchingRuns = await db.productionRun.findMany({
        where: {
          OR: [
            { convertexRun: { outputItemId: searchItemId } },
            { bcsRun: { outputItemId: searchItemId } },
            { valvomaticRun: { outputItemId: searchItemId } },
            { manualStitchRun: { outputItemId: searchItemId } },
            { cuttingRun: { outputItemId: searchItemId } },
          ],
        },
        take: 3,
        orderBy: { startedAt: "desc" },
        include: {
          planLine: {
            include: {
              plan: {
                include: {
                  shift: true,
                  createdBy: { select: { id: true, name: true, email: true } },
                },
              },
              machine: true,
            },
          },
          convertexRun: { include: { convertexMachine: true, operator: true } },
          bcsRun: { include: { bcsMachine: true, operator: true } },
          valvomaticRun: { include: { valvomaticMachine: true, operator: true } },
          manualStitchRun: { include: { operator: true } },
          cuttingRun: { include: { cuttingMachine: true, operator: true } },
          recordedBy: { select: { id: true, name: true, email: true } },
        },
      });

      productionRuns = matchingRuns;
    }

    // 3. Upstream Rolls (Loom / Lamination / Printing)
    let upstreamRolls: any[] = [];
    if (productionRuns.length > 0) {
      const cuttingRunRollIds = productionRuns
        .map((r) => r.cuttingRun?.inputRollId)
        .filter(Boolean) as string[];

      if (cuttingRunRollIds.length > 0) {
        upstreamRolls = await db.productionRoll.findMany({
          where: { id: { in: cuttingRunRollIds } },
          include: {
            loomProductionRun: {
              include: {
                loomMachine: true,
                operator: true,
                bobbinItem: true,
              },
            },
            laminationProductionRun: {
              include: {
                laminationMachine: true,
                operator: true,
              },
            },
            printingProductionRun: {
              include: {
                printingMachine: true,
                operator: true,
              },
            },
          },
        });
      }
    }

    return {
      lot,
      bale: lot.bale,
      qcInspections,
      productionRuns,
      upstreamRolls,
    };
  }
}
