import { db } from "@/lib/db";
import { withTransaction } from "@/lib/transaction";
import {
  Module,
  DispatchOrderStatus,
  DispatchAllocationStatus,
  FinishedGoodsStatus,
  TransactionType,
  Prisma,
} from "@/generated/prisma";
import { parsePaginationParams, createPaginationMeta } from "@/lib/pagination";
import { logEvent, logDiff } from "@/lib/logging";
import {
  CreateDispatchOrderInput,
  UpdateDispatchOrderInput,
  PickDispatchOrderInput,
  LoadDispatchOrderInput,
  ListDispatchOrdersQuery,
} from "@/lib/schemas/dispatch";

export class DispatchService {
  /**
   * Generates a unique atomic dispatch order number (e.g. DO-20260915-0001).
   */
  static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = `DO-${dateStr}-`;

    const latest = await db.dispatchOrder.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    let seq = 1;
    if (latest && latest.orderNumber) {
      const parts = latest.orderNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, "0")}`;
  }

  /**
   * Create a new dispatch order with product lines.
   */
  static async createDispatchOrder(
    input: CreateDispatchOrderInput,
    userContext?: { userId?: string }
  ) {
    const userId = userContext?.userId;
    const orderNumber = await this.generateOrderNumber();
    const totalQty = input.lines.reduce((acc, line) => acc + line.orderedQty, 0);

    const order: any = await withTransaction(
      {
        action: "CREATE_DISPATCH_ORDER",
        module: Module.DISPATCH,
      },
      async (tx) => {
        return tx.dispatchOrder.create({
          data: {
            orderNumber,
            customerName: input.customerName,
            customerContact: input.customerContact || null,
            customerAddress: input.customerAddress || null,
            gateEntryId: input.gateEntryId || null,
            transporter: input.transporter || null,
            vehicleNumber: input.vehicleNumber || null,
            driverName: input.driverName || null,
            driverPhone: input.driverPhone || null,
            totalQty,
            status: DispatchOrderStatus.CONFIRMED,
            notes: input.notes || null,
            createdById: userId || null,
            lines: {
              create: input.lines.map((line) => ({
                inventoryItemId: line.inventoryItemId,
                orderedQty: line.orderedQty,
                unit: line.unit || "bags",
                notes: line.notes || null,
              })),
            },
          },
          include: {
            lines: {
              include: {
                inventoryItem: true,
              },
            },
            createdBy: { select: { id: true, name: true, email: true } },
            gateEntry: true,
          },
        });
      }
    );

    await logEvent({
      userId,
      module: "DISPATCH",
      severity: "INFO",
      action: "CREATED_DISPATCH_ORDER",
      payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        totalQty: order.totalQty,
        linesCount: input.lines.length,
      },
    });

    return order;
  }

  /**
   * List dispatch orders with search, filters, and pagination.
   */
  static async listDispatchOrders(
    query: ListDispatchOrdersQuery = {},
    options: { paginate?: boolean } = {}
  ) {
    const { status, customerName, search, dateFrom, dateTo } = query;

    const where: Prisma.DispatchOrderWhereInput = {};

    if (status) where.status = status;
    if (customerName) {
      where.customerName = { contains: customerName, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { transporter: { contains: search, mode: "insensitive" } },
        { vehicleNumber: { contains: search, mode: "insensitive" } },
        { driverName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (options.paginate) {
      const { page, limit, skip } = parsePaginationParams({
        page: query.page,
        limit: query.limit,
      });

      const [total, data] = await Promise.all([
        db.dispatchOrder.count({ where }),
        db.dispatchOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            lines: {
              include: {
                inventoryItem: true,
                allocations: {
                  include: {
                    finishedGoodsLot: true,
                  },
                },
              },
            },
            createdBy: { select: { id: true, name: true, email: true } },
            loadedBy: { select: { id: true, name: true, email: true } },
            gateEntry: true,
          },
        }),
      ]);

      return {
        data,
        pagination: createPaginationMeta(total, page, limit),
      };
    }

    return db.dispatchOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        lines: {
          include: {
            inventoryItem: true,
            allocations: {
              include: {
                finishedGoodsLot: true,
              },
            },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        loadedBy: { select: { id: true, name: true, email: true } },
        gateEntry: true,
      },
    });
  }

  /**
   * Get single dispatch order by ID.
   */
  static async getDispatchOrderById(id: string) {
    return db.dispatchOrder.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            inventoryItem: {
              include: {
                uom: true,
                location: true,
              },
            },
            allocations: {
              include: {
                finishedGoodsLot: {
                  include: {
                    location: true,
                    bale: true,
                  },
                },
              },
            },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        loadedBy: { select: { id: true, name: true, email: true } },
        gateEntry: {
          include: {
            stockDetails: true,
          },
        },
      },
    });
  }

  /**
   * Update dispatch order metadata.
   */
  static async updateDispatchOrder(
    id: string,
    input: UpdateDispatchOrderInput,
    userContext?: { userId?: string }
  ) {
    const existing = await db.dispatchOrder.findUnique({ where: { id } });
    if (!existing) return null;

    const data: Prisma.DispatchOrderUpdateInput = {};

    if (input.customerName) data.customerName = input.customerName;
    if (input.customerContact !== undefined) data.customerContact = input.customerContact;
    if (input.customerAddress !== undefined) data.customerAddress = input.customerAddress;
    if (input.status) data.status = input.status;
    if (input.gateEntryId !== undefined) {
      data.gateEntry = input.gateEntryId ? { connect: { id: input.gateEntryId } } : { disconnect: true };
    }
    if (input.transporter !== undefined) data.transporter = input.transporter;
    if (input.vehicleNumber !== undefined) data.vehicleNumber = input.vehicleNumber;
    if (input.driverName !== undefined) data.driverName = input.driverName;
    if (input.driverPhone !== undefined) data.driverPhone = input.driverPhone;
    if (input.notes !== undefined) data.notes = input.notes;

    const updated = await db.dispatchOrder.update({
      where: { id },
      data,
      include: {
        lines: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    await logDiff({
      userId: userContext?.userId,
      module: "DISPATCH",
      entity: "DispatchOrder",
      entityId: id,
      before: existing,
      after: updated,
    });

    return updated;
  }

  /**
   * Pick and allocate Finished Goods lots to dispatch order lines.
   */
  static async pickOrderLots(
    orderId: string,
    input: PickDispatchOrderInput,
    userContext?: { userId?: string }
  ) {
    const userId = userContext?.userId;

    const order = await db.dispatchOrder.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });

    if (!order) {
      throw new Error(`Dispatch order not found with ID: ${orderId}`);
    }

    if (order.status === DispatchOrderStatus.DISPATCHED || order.status === DispatchOrderStatus.CANCELLED) {
      throw new Error(`Cannot pick for order with status '${order.status}'`);
    }

    const updatedOrder: any = await withTransaction(
      {
        action: "PICK_DISPATCH_ORDER_LOTS",
        module: Module.DISPATCH,
      },
      async (tx) => {
        for (const alloc of input.allocations) {
          const line = await tx.dispatchOrderLine.findUnique({
            where: { id: alloc.dispatchOrderLineId },
          });

          if (!line || line.dispatchOrderId !== orderId) {
            throw new Error(`Invalid order line ID: ${alloc.dispatchOrderLineId}`);
          }

          const lot = await tx.finishedGoodsLot.findUnique({
            where: { id: alloc.finishedGoodsLotId },
          });

          if (!lot) {
            throw new Error(`Finished goods lot not found with ID: ${alloc.finishedGoodsLotId}`);
          }

          const availableQty = lot.quantity - lot.allocatedQty;
          if (availableQty < alloc.quantity) {
            throw new Error(
              `Insufficient unallocated stock in Lot ${lot.lotNumber}. Available: ${availableQty}, Requested: ${alloc.quantity}`
            );
          }

          // 1. Create DispatchAllocation
          await tx.dispatchAllocation.create({
            data: {
              dispatchOrderLineId: line.id,
              finishedGoodsLotId: lot.id,
              allocatedQty: alloc.quantity,
              status: DispatchAllocationStatus.ALLOCATED,
              notes: alloc.notes || null,
            },
          });

          // 2. Increment line pickedQty
          await tx.dispatchOrderLine.update({
            where: { id: line.id },
            data: {
              pickedQty: { increment: alloc.quantity },
            },
          });

          // 3. Increment lot allocatedQty
          await tx.finishedGoodsLot.update({
            where: { id: lot.id },
            data: {
              allocatedQty: { increment: alloc.quantity },
              status: FinishedGoodsStatus.ALLOCATED,
            },
          });

          // 4. Update item reserved stock
          await tx.inventoryItem.update({
            where: { id: line.inventoryItemId },
            data: {
              reservedStock: { increment: alloc.quantity },
            },
          });
        }

        // Update order status to PICKING
        return tx.dispatchOrder.update({
          where: { id: orderId },
          data: {
            status: DispatchOrderStatus.PICKING,
          },
          include: {
            lines: {
              include: {
                inventoryItem: true,
                allocations: {
                  include: {
                    finishedGoodsLot: true,
                  },
                },
              },
            },
          },
        });
      }
    );

    await logEvent({
      userId,
      module: "DISPATCH",
      severity: "INFO",
      action: "PICKED_DISPATCH_ORDER_LOTS",
      payload: {
        orderId,
        orderNumber: order.orderNumber,
        allocationsCount: input.allocations.length,
      },
    });

    return updatedOrder;
  }

  /**
   * Confirm loading of dispatch order, post inventory OUT transactions, and mark DISPATCHED.
   */
  static async loadAndDispatchOrder(
    orderId: string,
    input: LoadDispatchOrderInput = {},
    userContext?: { userId?: string }
  ) {
    const userId = userContext?.userId;

    const order = await db.dispatchOrder.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: {
            allocations: {
              include: {
                finishedGoodsLot: true,
              },
            },
            inventoryItem: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Dispatch order not found with ID: ${orderId}`);
    }

    if (order.status === DispatchOrderStatus.DISPATCHED) {
      throw new Error(`Order ${order.orderNumber} is already dispatched`);
    }

    const allAllocations = order.lines.flatMap((l) => l.allocations);
    if (allAllocations.length === 0) {
      throw new Error("Cannot dispatch an order with 0 picked allocations. Please pick stock lots first.");
    }

    const updatedOrder: any = await withTransaction(
      {
        action: "CONFIRM_LOAD_AND_DISPATCH",
        module: Module.DISPATCH,
      },
      async (tx) => {
        let totalDispatched = 0;

        for (const line of order.lines) {
          for (const alloc of line.allocations) {
            const loadConfig = input.loadedAllocations?.find(
              (la) => la.allocationId === alloc.id
            );
            const loadQty = loadConfig?.loadedQty ?? alloc.allocatedQty;

            totalDispatched += loadQty;

            // 1. Update Allocation
            await tx.dispatchAllocation.update({
              where: { id: alloc.id },
              data: {
                loadedQty: loadQty,
                status: DispatchAllocationStatus.LOADED,
              },
            });

            // 2. Update Order Line
            await tx.dispatchOrderLine.update({
              where: { id: line.id },
              data: {
                loadedQty: { increment: loadQty },
              },
            });

            // 3. Deduct Finished Goods Lot stock
            const lot = alloc.finishedGoodsLot;
            const remainingLotQty = Math.max(0, lot.quantity - loadQty);
            const remainingAllocQty = Math.max(0, lot.allocatedQty - loadQty);

            await tx.finishedGoodsLot.update({
              where: { id: lot.id },
              data: {
                quantity: remainingLotQty,
                allocatedQty: remainingAllocQty,
                dispatchedQty: { increment: loadQty },
                status: remainingLotQty === 0 ? FinishedGoodsStatus.DISPATCHED : FinishedGoodsStatus.AVAILABLE,
              },
            });

            // 4. Update InventoryItem currentStock & reservedStock
            await tx.inventoryItem.update({
              where: { id: line.inventoryItemId },
              data: {
                currentStock: { decrement: loadQty },
                reservedStock: { decrement: loadQty },
              },
            });

            // 5. Deduct from InventoryBatch if batch lot exists
            if (lot.productionBatch) {
              const batch = await tx.inventoryBatch.findUnique({
                where: {
                  itemId_batchLot: {
                    itemId: line.inventoryItemId,
                    batchLot: lot.productionBatch,
                  },
                },
              });

              if (batch) {
                await tx.inventoryBatch.update({
                  where: { id: batch.id },
                  data: {
                    quantity: { decrement: Math.min(batch.quantity, loadQty) },
                  },
                });
              }
            }

            // 6. Post Inventory OUT Transaction
            await tx.inventoryTransaction.create({
              data: {
                itemId: line.inventoryItemId,
                type: TransactionType.OUT,
                quantity: loadQty,
                batchLot: lot.productionBatch || null,
                referenceType: "DISPATCH_ORDER",
                referenceId: order.id,
                remarks: `Dispatched ${loadQty} ${line.unit} for Order ${order.orderNumber} to ${order.customerName} (from Lot ${lot.lotNumber})`,
                userId: userId || null,
              },
            });
          }
        }

        // 7. Update Dispatch Order to DISPATCHED
        return tx.dispatchOrder.update({
          where: { id: orderId },
          data: {
            status: DispatchOrderStatus.DISPATCHED,
            dispatchedQty: totalDispatched,
            dispatchedAt: new Date(),
            loadedById: userId || null,
            transporter: input.transporter || order.transporter,
            vehicleNumber: input.vehicleNumber || order.vehicleNumber,
            driverName: input.driverName || order.driverName,
            driverPhone: input.driverPhone || order.driverPhone,
            gateEntryId: input.gateEntryId || order.gateEntryId,
            notes: input.notes || order.notes,
          },
          include: {
            lines: {
              include: {
                inventoryItem: true,
                allocations: {
                  include: {
                    finishedGoodsLot: true,
                  },
                },
              },
            },
            gateEntry: true,
            createdBy: { select: { id: true, name: true, email: true } },
            loadedBy: { select: { id: true, name: true, email: true } },
          },
        });
      }
    );

    await logEvent({
      userId,
      module: "DISPATCH",
      severity: "INFO",
      action: "CONFIRMED_ORDER_DISPATCH",
      payload: {
        orderId,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        dispatchedQty: updatedOrder.dispatchedQty,
      },
    });

    return updatedOrder;
  }

  /**
   * Fetch available Finished Goods lots for a given inventory item.
   */
  static async getAvailableLotsForProduct(itemId: string) {
    return db.finishedGoodsLot.findMany({
      where: {
        inventoryItemId: itemId,
        status: { in: [FinishedGoodsStatus.AVAILABLE, FinishedGoodsStatus.ALLOCATED] },
        quantity: { gt: 0 },
      },
      orderBy: { receivedAt: "asc" }, // FIFO order
      include: {
        location: true,
        bale: true,
      },
    });
  }

  /**
   * Compute plant-wide dispatch KPIs and statistics.
   */
  static async getDispatchStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      draftOrders,
      confirmedOrders,
      pickingOrders,
      dispatchedOrders,
      totalDispatchedQty,
      todayDispatchedQty,
      recentOrders,
    ] = await Promise.all([
      db.dispatchOrder.count(),
      db.dispatchOrder.count({ where: { status: DispatchOrderStatus.DRAFT } }),
      db.dispatchOrder.count({ where: { status: DispatchOrderStatus.CONFIRMED } }),
      db.dispatchOrder.count({ where: { status: DispatchOrderStatus.PICKING } }),
      db.dispatchOrder.count({ where: { status: DispatchOrderStatus.DISPATCHED } }),
      db.dispatchOrder.aggregate({
        _sum: { dispatchedQty: true, totalQty: true },
      }),
      db.dispatchOrder.aggregate({
        where: { dispatchedAt: { gte: today } },
        _sum: { dispatchedQty: true },
      }),
      db.dispatchOrder.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          lines: {
            include: { inventoryItem: true },
          },
          createdBy: { select: { name: true } },
        },
      }),
    ]);

    return {
      totalOrders,
      draftOrders,
      confirmedOrders,
      pickingOrders,
      dispatchedOrders,
      totalOrderedQty: totalDispatchedQty._sum.totalQty || 0,
      totalDispatchedQty: totalDispatchedQty._sum.dispatchedQty || 0,
      todayDispatchedQty: todayDispatchedQty._sum.dispatchedQty || 0,
      recentOrders,
    };
  }
}
