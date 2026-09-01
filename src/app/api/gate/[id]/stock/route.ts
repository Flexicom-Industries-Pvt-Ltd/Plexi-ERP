import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { StockMaterialType } from "@/generated/prisma";
import { findGateEntryByIdOrNumber } from "@/lib/gate/resolve-gate-entry";

export const dynamic = "force-dynamic";

const MATERIAL_TYPES = new Set(Object.values(StockMaterialType));

function codeFromName(name: string) {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `STK-${slug || "ITEM"}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SECURITY_GATE" && p.canUpdate);

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = await request.json();
    const entry = await findGateEntryByIdOrNumber(id);

    if (!entry) return NextResponse.json({ error: "Gate Entry not found" }, { status: 404 });

    if (entry.status === "GATE_OUT") {
      return NextResponse.json({ error: "Cannot add stock details to a completed journey (GATE_OUT)" }, { status: 400 });
    }

    if (!data.materialName || data.quantity === undefined || data.quantity === "") {
      return NextResponse.json({ error: "Material name and quantity are required" }, { status: 400 });
    }

    const newStock = await db.$transaction(async (tx) => {
      let catalog = data.stockId
        ? await tx.stock.findUnique({ where: { id: data.stockId }, include: { uom: true } })
        : null;

      if (!catalog) {
        catalog = await tx.stock.findFirst({
          where: { name: { equals: data.materialName.trim(), mode: "insensitive" } },
          include: { uom: true },
        });
      }

      if (!catalog) {
        const unitAbbrev = (data.unit as string) || "kg";
        let uom = await tx.unitOfMeasurement.findFirst({
          where: { abbreviation: { equals: unitAbbrev, mode: "insensitive" }, isActive: true },
        });
        if (!uom) {
          uom = await tx.unitOfMeasurement.findFirst({ where: { isActive: true } });
        }
        if (!uom) {
          throw new Error("NO_UOM");
        }

        const materialType = MATERIAL_TYPES.has(data.materialType)
          ? (data.materialType as StockMaterialType)
          : StockMaterialType.RAW_MATERIALS;

        let code = codeFromName(data.materialName);
        const existingCode = await tx.stock.findUnique({ where: { code } });
        if (existingCode) {
          code = `${code}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
        }

        catalog = await tx.stock.create({
          data: {
            code,
            name: data.materialName.trim(),
            materialType,
            uomId: uom.id,
            isActive: true,
          },
          include: { uom: true },
        });

        logEvent({
          userId: session.user?.id,
          module: "DATA_CENTRE",
          severity: "INFO",
          action: "Auto-created Stock from Gate Entry",
          payload: catalog,
          meta: { gateEntryNumber: entry.entryNumber },
        }).catch(console.error);
      }

      const unit = catalog.uom?.abbreviation || data.unit;
      const materialType = catalog.materialType || data.materialType;

      return tx.truckStockDetail.create({
        data: {
          gateEntryId: entry.id,
          stockId: catalog.id,
          materialName: catalog.name,
          materialType,
          quantity: parseFloat(data.quantity),
          unit,
          batchLot: data.batchLot,
          supplierCustomer: data.supplierCustomer,
          expectedQuantity: data.expectedQuantity ? parseFloat(data.expectedQuantity) : null,
          actualQuantity: data.actualQuantity ? parseFloat(data.actualQuantity) : null,
        },
      });
    });

    logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: "Added Stock Detail to Gate Entry",
      payload: newStock,
      meta: { entryId: entry.id, entryNumber: entry.entryNumber, stockId: newStock.stockId },
    }).catch(console.error);

    return NextResponse.json(newStock, { status: 201 });
  } catch (error: any) {
    if (error?.message === "NO_UOM") {
      return NextResponse.json(
        { error: "No unit of measurement is configured. Add a UOM in Settings first." },
        { status: 400 }
      );
    }
    console.error("Error adding stock detail:", error);
    return NextResponse.json({ error: "Failed to add stock detail" }, { status: 500 });
  }
}
