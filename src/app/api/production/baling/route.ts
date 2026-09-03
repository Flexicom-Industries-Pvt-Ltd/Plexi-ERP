import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { baleInclude } from "@/lib/production/bale-include";
import { generateBaleNumber } from "@/lib/production/bale-number";
import { postBalingInventoryMovements } from "@/lib/production/baling-inventory";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateBaleSchema = z.object({
  productId: z.string().min(1),
  baleItemId: z.string().optional().nullable(),
  bagsPerBale: z.number().min(1),
  quantity: z.number().min(1),
  productionBatch: z.string().optional().nullable(),
  qualityStatus: z
    .enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"])
    .default("PENDING_QC"),
  shiftId: z.string().min(1),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  baledAt: z.string().datetime().optional(),
});

async function assertBagProduct(productId: string) {
  const item = await db.inventoryItem.findUnique({
    where: { id: productId },
    include: { stock: true },
  });
  if (!item) {
    return { ok: false as const, status: 404, error: "Product (bag item) not found" };
  }
  if (item.stock?.materialType !== "FINISHED_BAGS") {
    return { ok: false as const, status: 400, error: "Product must be FINISHED_BAGS type" };
  }
  return { ok: true as const, item };
}

async function assertBaleItem(baleItemId: string) {
  const item = await db.inventoryItem.findUnique({
    where: { id: baleItemId },
    include: { stock: true },
  });
  if (!item) {
    return { ok: false as const, status: 404, error: "Bale output item not found" };
  }
  if (item.stock?.materialType !== "BALES") {
    return { ok: false as const, status: 400, error: "Bale output item must be BALES type" };
  }
  return { ok: true as const, item };
}

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get("shiftId");
  const qualityStatus = searchParams.get("qualityStatus");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const productId = searchParams.get("productId");

  const where: Prisma.BaleWhereInput = {};
  if (shiftId) where.shiftId = shiftId;
  if (productId) where.productId = productId;
  if (qualityStatus) {
    where.qualityStatus = qualityStatus as Prisma.EnumRollQualityStatusFilter["equals"];
  }
  if (search) {
    where.OR = [
      { baleNumber: { contains: search, mode: "insensitive" } },
      { productionBatch: { contains: search, mode: "insensitive" } },
      { product: { name: { contains: search, mode: "insensitive" } } },
      { product: { code: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (dateFrom || dateTo) {
    where.baledAt = {};
    if (dateFrom) (where.baledAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      (where.baledAt as Prisma.DateTimeFilter).lte = end;
    }
  }

  try {
    const bales = await db.bale.findMany({
      where,
      orderBy: { baledAt: "desc" },
      include: baleInclude,
    });
    return NextResponse.json(bales);
  } catch (error) {
    console.error("Error fetching bales:", error);
    return NextResponse.json({ error: "Failed to fetch bales" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateBaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    const productCheck = await assertBagProduct(data.productId);
    if (!productCheck.ok) {
      return NextResponse.json({ error: productCheck.error }, { status: productCheck.status });
    }

    if (data.baleItemId) {
      const baleItemCheck = await assertBaleItem(data.baleItemId);
      if (!baleItemCheck.ok) {
        return NextResponse.json({ error: baleItemCheck.error }, { status: baleItemCheck.status });
      }
    }

    const shift = await db.shift.findUnique({ where: { id: data.shiftId } });
    if (!shift || !shift.isActive) {
      return NextResponse.json({ error: "Shift not found or inactive" }, { status: 404 });
    }

    if (data.quantity < data.bagsPerBale) {
      return NextResponse.json(
        { error: "Total bag quantity must be at least bags per bale" },
        { status: 400 },
      );
    }

    if (data.quantity % data.bagsPerBale !== 0) {
      return NextResponse.json(
        { error: "Total bag quantity must be a multiple of bags per bale" },
        { status: 400 },
      );
    }

    const baleCount = data.quantity / data.bagsPerBale;

    const bales = await db.$transaction(async (tx) => {
      const created = [];
      for (let i = 0; i < baleCount; i += 1) {
        const baleNumber = await generateBaleNumber(tx);
        const bale = await tx.bale.create({
          data: {
            baleNumber,
            productId: data.productId,
            baleItemId: data.baleItemId,
            bagsPerBale: data.bagsPerBale,
            quantity: data.bagsPerBale,
            productionBatch: data.productionBatch,
            qualityStatus: data.qualityStatus,
            shiftId: data.shiftId,
            characteristics: data.characteristics as Prisma.InputJsonValue | undefined,
            baledAt: data.baledAt ? new Date(data.baledAt) : new Date(),
            createdById: authResult.session.user.id,
          },
          include: baleInclude,
        });
        created.push(bale);
      }
      return created;
    });

    for (const bale of bales) {
      await postBalingInventoryMovements({
        userId: authResult.session.user.id,
        baleId: bale.id,
        baleNumber: bale.baleNumber,
        productId: data.productId,
        bagQty: bale.quantity,
        baleItemId: data.baleItemId,
        baleQty: 1,
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "CREATE_BALE",
        payload: {
          baleId: bale.id,
          baleNumber: bale.baleNumber,
          productId: data.productId,
          quantity: bale.quantity,
          bagsPerBale: data.bagsPerBale,
          shiftId: data.shiftId,
        },
        diffs: [{ entity: "Bale", entityId: bale.id, before: {}, after: bale }],
      });
    }

    if (bales.length === 1) {
      return NextResponse.json(bales[0], { status: 201 });
    }

    return NextResponse.json(
      { created: bales.length, bales },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating bale:", error);
    return NextResponse.json({ error: "Failed to create bale" }, { status: 500 });
  }
}
