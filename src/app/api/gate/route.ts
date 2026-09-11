import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SECURITY_GATE" && p.canRead);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const purpose = searchParams.get("purpose");
  const truckNumber = searchParams.get("truckNumber");
  
  const where: any = {};
  if (status) where.status = status;
  if (purpose) where.purpose = purpose;
  if (truckNumber) where.truckNumber = { contains: truckNumber, mode: "insensitive" };

  try {
    const entries = await db.gateEntry.findMany({
      where,
      orderBy: { arrivalTime: "desc" },
      include: {
        stockDetails: true,
      },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching gate entries:", error);
    return NextResponse.json({ error: "Failed to fetch gate entries" }, { status: 500 });
  }
}

import { StockMaterialType } from "@/generated/prisma";

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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SECURITY_GATE" && p.canCreate);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await request.json();
    
    // Generate unique entry number (e.g., GE-YYYYMMDD-001)
    const today = new Date();
    const datePrefix = `GE-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;
    
    // Get the last entry for today to increment the number
    const lastEntry = await db.gateEntry.findFirst({
      where: { entryNumber: { startsWith: datePrefix } },
      orderBy: { entryNumber: "desc" },
    });

    let sequence = 1;
    if (lastEntry) {
      const lastSeq = parseInt(lastEntry.entryNumber.split("-").pop() || "0");
      sequence = lastSeq + 1;
    }
    const entryNumber = `${datePrefix}-${sequence.toString().padStart(3, "0")}`;

    // Upsert Driver to Data Centre if contact is provided
    if (data.driverContact) {
      await db.driver.upsert({
        where: { phone: data.driverContact },
        update: { 
          name: data.driverName,
          ...(data.driverLicenseNumber ? { licenseNumber: data.driverLicenseNumber } : {})
        },
        create: { 
          phone: data.driverContact, 
          name: data.driverName,
          licenseNumber: data.driverLicenseNumber || null
        },
      });
    }

    // Normalize stock items from payload
    const rawStockItems: any[] = Array.isArray(data.stockItems) ? data.stockItems : [];
    if (rawStockItems.length === 0 && data.expectedMaterial && data.expectedQuantity) {
      rawStockItems.push({
        materialName: data.expectedMaterial,
        quantity: data.expectedQuantity,
        unit: data.unit || "kg",
        materialType: "RAW_MATERIALS",
      });
    }

    const summaryMaterial = rawStockItems.length > 0
      ? rawStockItems.map((item) => item.materialName).filter(Boolean).join(", ")
      : (data.expectedMaterial || null);

    const summaryQuantity = rawStockItems.length > 0
      ? rawStockItems.reduce((acc, item) => acc + (parseFloat(item.quantity) || 0), 0)
      : (data.expectedQuantity ? parseFloat(data.expectedQuantity) : null);

    const newEntry = await db.$transaction(async (tx) => {
      const entry = await tx.gateEntry.create({
        data: {
          entryNumber,
          truckNumber: data.truckNumber,
          driverName: data.driverName,
          driverContact: data.driverContact,
          driverLicenseNumber: data.driverLicenseNumber,
          transporter: data.transporter,
          supplierCustomer: data.supplierCustomer,
          purpose: data.purpose,
          expectedMaterial: summaryMaterial,
          expectedQuantity: summaryQuantity,
          createdBy: session.user.id,
        },
      });

      // Process and create each stock detail line
      for (const item of rawStockItems) {
        if (!item.materialName || item.quantity === undefined || item.quantity === "") continue;

        let catalog = item.stockId
          ? await tx.stock.findUnique({ where: { id: item.stockId }, include: { uom: true } })
          : null;

        if (!catalog) {
          catalog = await tx.stock.findFirst({
            where: { name: { equals: item.materialName.trim(), mode: "insensitive" } },
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
            const materialType = MATERIAL_TYPES.has(item.materialType)
              ? (item.materialType as StockMaterialType)
              : StockMaterialType.RAW_MATERIALS;

            let code = codeFromName(item.materialName);
            const existingCode = await tx.stock.findUnique({ where: { code } });
            if (existingCode) {
              code = `${code}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
            }

            catalog = await tx.stock.create({
              data: {
                code,
                name: item.materialName.trim(),
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
            materialName: catalog?.name || item.materialName.trim(),
            materialType,
            quantity: qtyNum,
            expectedQuantity: qtyNum,
            unit,
            batchLot: item.batchLot || null,
            supplierCustomer: data.supplierCustomer || null,
          },
        });
      }

      return tx.gateEntry.findUnique({
        where: { id: entry.id },
        include: { stockDetails: true },
      });
    }, { maxWait: 15000, timeout: 30000 });

    logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: "Created Gate Entry with Stock Items",
      payload: newEntry,
      meta: { entryId: newEntry?.id, entryNumber: newEntry?.entryNumber },
    }).catch(console.error);

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating gate entry:", error);
    return NextResponse.json({ error: "Failed to create gate entry" }, { status: 500 });
  }
}
