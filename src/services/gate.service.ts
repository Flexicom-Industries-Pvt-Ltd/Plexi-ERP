import { db } from "@/lib/db";
import { logEvent, logDiff } from "@/lib/logging";
import { GateEntryStatus, StockMaterialType, GatePurpose } from "@/generated/prisma";
import { findGateEntryByIdOrNumber } from "@/lib/gate/resolve-gate-entry";
import { validateGateOut } from "@/lib/gate/validate-gate-out";
import { parsePaginationParams, createPaginationMeta, PaginationMeta } from "@/lib/pagination";

const MATERIAL_TYPES = new Set(Object.values(StockMaterialType));

function codeFromName(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `STK-${slug || "ITEM"}`;
}

export interface ListGateEntriesQuery {
  status?: string | null;
  purpose?: string | null;
  truckNumber?: string | null;
  search?: string | null;
  page?: number | string | null;
  limit?: number | string | null;
}

export interface GateEntryListResult {
  entries: any[];
  meta?: PaginationMeta;
}

export class GateService {
  /**
   * List gate entries with flexible filtering and optional pagination.
   */
  static async listGateEntries(
    query: ListGateEntriesQuery,
    options: { paginate?: boolean } = {}
  ): Promise<GateEntryListResult> {
    const { status, purpose, truckNumber, search } = query;
    const where: any = {};

    if (status) where.status = status;
    if (purpose) where.purpose = purpose;
    if (truckNumber) {
      where.truckNumber = { contains: truckNumber, mode: "insensitive" };
    }
    if (search) {
      where.OR = [
        { truckNumber: { contains: search, mode: "insensitive" } },
        { entryNumber: { contains: search, mode: "insensitive" } },
        { driverName: { contains: search, mode: "insensitive" } },
        { supplierCustomer: { contains: search, mode: "insensitive" } },
      ];
    }

    const { page, limit, skip, take, isPaginated } = parsePaginationParams(
      { page: query.page, limit: query.limit },
      { defaultLimit: 50, maxLimit: 200 }
    );

    const shouldPaginate = options.paginate || isPaginated;

    const [entries, total] = await Promise.all([
      db.gateEntry.findMany({
        where,
        orderBy: { arrivalTime: "desc" },
        include: {
          stockDetails: true,
        },
        ...(shouldPaginate ? { skip, take } : {}),
      }),
      shouldPaginate ? db.gateEntry.count({ where }) : Promise.resolve(0),
    ]);

    return {
      entries,
      ...(shouldPaginate ? { meta: createPaginationMeta(total, page, limit) } : {}),
    };
  }

  /**
   * Generates next unique gate entry number (e.g. GE-YYYYMMDD-001).
   */
  static async generateEntryNumber(): Promise<string> {
    const today = new Date();
    const datePrefix = `GE-${today.getFullYear()}${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;

    const lastEntry = await db.gateEntry.findFirst({
      where: { entryNumber: { startsWith: datePrefix } },
      orderBy: { entryNumber: "desc" },
    });

    let sequence = 1;
    if (lastEntry) {
      const lastSeq = parseInt(lastEntry.entryNumber.split("-").pop() || "0", 10);
      sequence = lastSeq + 1;
    }

    return `${datePrefix}-${sequence.toString().padStart(3, "0")}`;
  }

  /**
   * Retrieve full details of a single gate entry by ID or Entry Number.
   */
  static async getGateEntry(idOrNumber: string) {
    const entry = await findGateEntryByIdOrNumber(idOrNumber);
    if (!entry) return null;

    const record = await db.gateEntry.findUnique({
      where: { id: entry.id },
      include: {
        stockDetails: true,
        documents: {
          include: { verifier: { select: { name: true, email: true } } },
        },
        statusLogs: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { timestamp: "asc" },
        },
        user: { select: { name: true, email: true } },
      },
    });

    if (!record) return null;

    // Self-healing / backwards compatibility: synthesize logs if empty
    let statusLogs = record.statusLogs || [];
    if (statusLogs.length === 0) {
      const fallbackLogs: any[] = [
        {
          id: `synth_${record.id}_arr`,
          gateEntryId: record.id,
          status: GateEntryStatus.ARRIVED,
          timestamp: record.arrivalTime,
          updatedBy: record.createdBy,
          remarks: "Initial truck arrival registered at gate",
          user: record.user ? { name: record.user.name, email: record.user.email } : null,
          createdAt: record.createdAt,
        },
      ];

      if (record.status !== GateEntryStatus.ARRIVED) {
        fallbackLogs.push({
          id: `synth_${record.id}_curr`,
          gateEntryId: record.id,
          status: record.status,
          timestamp: record.exitTime || record.updatedAt,
          updatedBy: record.updatedBy,
          remarks:
            record.status === GateEntryStatus.GATE_OUT
              ? record.finalRemarks || "Vehicle gated out and departed"
              : record.parkingLocation
              ? `Parking bay allocated: ${record.parkingLocation}`
              : `Status transition to ${String(record.status).replace(/_/g, " ")}`,
          user: null,
          createdAt: record.updatedAt,
        });
      }
      statusLogs = fallbackLogs;
    }

    return {
      ...record,
      statusLogs,
    };
  }

  /**
   * Creates a new gate entry and synchronizes Driver / Stock master data.
   */
  static async createGateEntry(data: any, userId?: string) {
    const entryNumber = await this.generateEntryNumber();

    // Upsert Driver to Data Centre if contact is provided
    if (data.driverContact) {
      await db.driver.upsert({
        where: { phone: data.driverContact },
        update: {
          name: data.driverName,
          ...(data.driverLicenseNumber || data.driverLicense
            ? { licenseNumber: data.driverLicenseNumber || data.driverLicense }
            : {}),
          isActive: true,
        },
        create: {
          phone: data.driverContact,
          name: data.driverName,
          licenseNumber: data.driverLicenseNumber || data.driverLicense || null,
        },
      }).catch((err) => console.error("Failed to sync driver record:", err));
    }

    // Support both stockItems and stockDetails arrays
    const rawStockItems: any[] = Array.isArray(data.stockItems)
      ? data.stockItems
      : Array.isArray(data.stockDetails)
      ? data.stockDetails
      : [];

    if (rawStockItems.length === 0 && data.expectedMaterial && data.expectedQuantity) {
      rawStockItems.push({
        materialName: data.expectedMaterial,
        quantity: data.expectedQuantity,
        unit: data.unit || "kg",
        materialType: "RAW_MATERIALS",
      });
    }

    const summaryMaterial =
      rawStockItems.length > 0
        ? rawStockItems
            .map((item) => item.materialName)
            .filter(Boolean)
            .join(", ")
        : data.expectedMaterial || null;

    const summaryQuantity =
      rawStockItems.length > 0
        ? rawStockItems.reduce((acc, item) => acc + (parseFloat(item.quantity) || 0), 0)
        : data.expectedQuantity
        ? parseFloat(data.expectedQuantity)
        : null;

    const createdEntry = await db.$transaction(
      async (tx) => {
        // Enforce stock availability check for LOADING purpose
        if (data.purpose === GatePurpose.LOADING) {
          for (const item of rawStockItems) {
            if (!item.materialName || item.quantity === undefined || item.quantity === "") continue;
            const requestedQty = parseFloat(item.quantity) || 0;
            if (requestedQty <= 0) continue;

            let catalog = item.stockId
              ? await tx.stock.findUnique({
                  where: { id: item.stockId },
                  include: {
                    uom: true,
                    inventoryItems: {
                      select: { currentStock: true, reservedStock: true },
                    },
                  },
                })
              : null;

            if (!catalog) {
              catalog = await tx.stock.findFirst({
                where: { name: { equals: String(item.materialName).trim(), mode: "insensitive" } },
                include: {
                  uom: true,
                  inventoryItems: {
                    select: { currentStock: true, reservedStock: true },
                  },
                },
              });
            }

            let availableStock = 0;
            if (catalog && catalog.inventoryItems.length > 0) {
              const current = catalog.inventoryItems.reduce((acc, inv) => acc + (inv.currentStock || 0), 0);
              const reserved = catalog.inventoryItems.reduce((acc, inv) => acc + (inv.reservedStock || 0), 0);
              availableStock = Math.max(0, current - reserved);
            } else {
              const standalone = await tx.inventoryItem.findFirst({
                where: {
                  isActive: true,
                  OR: [
                    { name: { equals: String(item.materialName).trim(), mode: "insensitive" } },
                    { code: { equals: String(item.materialName).trim(), mode: "insensitive" } },
                  ],
                },
              });
              if (standalone) {
                availableStock = Math.max(0, (standalone.currentStock || 0) - (standalone.reservedStock || 0));
              }
            }

            if (requestedQty > availableStock) {
              const unitStr = catalog?.uom?.abbreviation || item.unit || "units";
              throw new Error(
                `Cannot create loading gate entry: Requested quantity for "${item.materialName}" (${requestedQty} ${unitStr}) exceeds available stock in factory (${availableStock} ${unitStr}).`
              );
            }
          }
        }

        const entry = await tx.gateEntry.create({
          data: {
            entryNumber,
            truckNumber: data.truckNumber ? String(data.truckNumber).toUpperCase() : "",
            driverName: data.driverName,
            driverContact: data.driverContact || null,
            driverLicenseNumber: data.driverLicenseNumber || data.driverLicense || null,
            transporter: data.transporter || null,
            supplierCustomer: data.supplierCustomer || null,
            purpose: (data.purpose as GatePurpose) || GatePurpose.UNLOADING,
            status: GateEntryStatus.ARRIVED,
            expectedMaterial: summaryMaterial,
            expectedQuantity: summaryQuantity,
            createdBy: userId || null,
          },
        });

        // Record initial status log for Arrival
        await tx.gateStatusLog.create({
          data: {
            gateEntryId: entry.id,
            status: GateEntryStatus.ARRIVED,
            timestamp: entry.arrivalTime,
            updatedBy: userId || null,
            remarks: "Initial truck arrival registered at gate",
          },
        });

        // Process each consignment stock item
        for (const item of rawStockItems) {
          if (!item.materialName || item.quantity === undefined || item.quantity === "") continue;

          let catalog = item.stockId
            ? await tx.stock.findUnique({ where: { id: item.stockId }, include: { uom: true } })
            : null;

          if (!catalog) {
            catalog = await tx.stock.findFirst({
              where: { name: { equals: String(item.materialName).trim(), mode: "insensitive" } },
              include: { uom: true },
            });
          }

          if (!catalog) {
            const unitAbbrev = (item.unit as string) || "kg";
            let uom = await tx.unitOfMeasurement.findFirst({
              where: { abbreviation: { equals: unitAbbrev, mode: "insensitive" }, isActive: true },
            });
            if (!uom) {
              uom = await tx.unitOfMeasurement.findFirst({ where: { isActive: true } });
            }

            if (uom) {
              const rawType = item.materialType || "RAW_MATERIALS";
              const materialType = MATERIAL_TYPES.has(rawType)
                ? (rawType as StockMaterialType)
                : StockMaterialType.RAW_MATERIALS;

              let code = codeFromName(item.materialName);
              const existingCode = await tx.stock.findUnique({ where: { code } });
              if (existingCode) {
                code = `${code}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
              }

              catalog = await tx.stock.create({
                data: {
                  code,
                  name: String(item.materialName).trim(),
                  materialType,
                  uomId: uom.id,
                  isActive: true,
                },
                include: { uom: true },
              });
            }
          }

          const unit = catalog?.uom?.abbreviation || item.unit || "kg";
          const materialType = catalog?.materialType || item.materialType || "RAW_MATERIALS";
          const qtyNum = parseFloat(item.quantity) || 0;

          await tx.truckStockDetail.create({
            data: {
              gateEntryId: entry.id,
              stockId: catalog?.id || null,
              materialName: catalog?.name || String(item.materialName).trim(),
              materialType,
              quantity: qtyNum,
              expectedQuantity: qtyNum,
              unit,
              batchLot: item.batchLot || item.batchNumber || null,
              supplierCustomer: data.supplierCustomer || null,
            },
          });
        }

        return tx.gateEntry.findUnique({
          where: { id: entry.id },
          include: {
            stockDetails: true,
            statusLogs: {
              include: { user: { select: { name: true, email: true } } },
              orderBy: { timestamp: "asc" },
            },
          },
        });
      },
      { maxWait: 15000, timeout: 30000 }
    );

    logEvent({
      userId,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: "Created Gate Entry with Stock Items",
      payload: createdEntry,
      meta: { entryId: createdEntry?.id, entryNumber: createdEntry?.entryNumber },
    }).catch(console.error);

    return createdEntry;
  }

  /**
   * Updates gate entry status or details with audit tracking and gate-out validation.
   */
  static async updateGateEntry(idOrNumber: string, data: any, userId?: string) {
    const existing = await findGateEntryByIdOrNumber(idOrNumber);
    if (!existing) return null;

    const updatedData: Record<string, unknown> = { ...data, updatedBy: userId };

    if (data.status === GateEntryStatus.GATE_OUT && existing.status !== GateEntryStatus.GATE_OUT) {
      const validation = await validateGateOut(existing.id);
      if (!validation.ok) {
        throw new Error(validation.error || "Gate Out validation failed");
      }
      updatedData.exitTime = new Date();
    }

    const updated = await db.gateEntry.update({
      where: { id: existing.id },
      data: updatedData,
    });

    // Record status transition log if status is modified or updated
    if (data.status) {
      const statusRemark =
        data.statusRemarks ||
        data.remarks ||
        (data.status === GateEntryStatus.GATE_OUT
          ? data.finalRemarks || "Vehicle gated out and departed"
          : data.parkingLocation
          ? `Parking location updated: ${data.parkingLocation}`
          : data.waitingReason
          ? `Waiting reason: ${data.waitingReason}`
          : `Status transition to ${String(data.status).replace(/_/g, " ")}`);

      await db.gateStatusLog.create({
        data: {
          gateEntryId: existing.id,
          status: data.status as GateEntryStatus,
          timestamp: new Date(),
          updatedBy: userId || null,
          remarks: statusRemark,
        },
      }).catch((err) => console.error("Failed to record GateStatusLog:", err));
    }

    await logDiff({
      userId: userId || undefined,
      module: "SECURITY_GATE",
      entity: "GateEntry",
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    logEvent({
      userId,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: `Updated Gate Entry Status to ${updated.status}`,
      payload: { entryId: updated.id, status: updated.status },
      meta: { entryNumber: updated.entryNumber },
    }).catch(console.error);

    return updated;
  }

  /**
   * Deletes a gate entry if not already completed / gated out.
   */
  static async deleteGateEntry(idOrNumber: string, userId?: string) {
    const existing = await findGateEntryByIdOrNumber(idOrNumber);
    if (!existing) return { notFound: true };

    if (existing.status === GateEntryStatus.COMPLETED || existing.status === GateEntryStatus.GATE_OUT) {
      throw new Error("Cannot delete a completed journey.");
    }

    await db.gateEntry.delete({
      where: { id: existing.id },
    });

    logEvent({
      userId,
      module: "SECURITY_GATE",
      severity: "WARN",
      action: "Deleted Gate Entry",
      payload: { deletedEntryId: existing.id, entryNumber: existing.entryNumber },
      meta: { entryNumber: existing.entryNumber },
    }).catch(console.error);

    return { success: true };
  }
}
