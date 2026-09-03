import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { generateRollNumber } from "@/lib/production/roll-number";
import { productionRollInclude } from "@/lib/production/roll-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateRollSchema = z.object({
  rollType: z.enum(["PP", "LPP"]),
  weight: z.number().min(0).optional(),
  length: z.number().min(0).optional(),
  batchLot: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  inventoryItemId: z.string().optional().nullable(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  qualityStatus: z
    .enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"])
    .default("PENDING_QC"),
  sourcePhase: z.enum(["LOOM", "LAMINATION", "PRINTING"]).default("LOOM"),
  productionRunId: z.string().optional().nullable(),
  loomProductionRunId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const rollType = searchParams.get("rollType");
  const qualityStatus = searchParams.get("qualityStatus");
  const sourcePhase = searchParams.get("sourcePhase");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const locationId = searchParams.get("locationId");

  const where: Prisma.ProductionRollWhereInput = {};
  if (rollType) where.rollType = rollType as "PP" | "LPP";
  if (qualityStatus) where.qualityStatus = qualityStatus as Prisma.EnumRollQualityStatusFilter["equals"];
  if (sourcePhase) where.sourcePhase = sourcePhase as Prisma.EnumProductionRollSourcePhaseFilter["equals"];
  if (locationId) where.locationId = locationId;
  if (search) {
    where.OR = [
      { rollNumber: { contains: search, mode: "insensitive" } },
      { batchLot: { contains: search, mode: "insensitive" } },
      { inventoryItem: { name: { contains: search, mode: "insensitive" } } },
      { inventoryItem: { code: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Prisma.DateTimeFilter).lte = end;
    }
  }

  try {
    const rolls = await db.productionRoll.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: productionRollInclude,
    });
    return NextResponse.json(rolls);
  } catch (error) {
    console.error("Error fetching production rolls:", error);
    return NextResponse.json({ error: "Failed to fetch production rolls" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateRollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    if (data.inventoryItemId) {
      const item = await db.inventoryItem.findUnique({ where: { id: data.inventoryItemId } });
      if (!item) {
        return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
      }
    }

    if (data.loomProductionRunId) {
      const existing = await db.productionRoll.findUnique({
        where: { loomProductionRunId: data.loomProductionRunId },
      });
      if (existing) {
        return NextResponse.json({ error: "Roll already exists for this loom run" }, { status: 409 });
      }
    }

    const rollNumber = await generateRollNumber(data.rollType);

    const roll = await db.productionRoll.create({
      data: {
        rollNumber,
        rollType: data.rollType,
        weight: data.weight,
        length: data.length,
        batchLot: data.batchLot,
        locationId: data.locationId,
        inventoryItemId: data.inventoryItemId,
        characteristics: data.characteristics as Prisma.InputJsonValue | undefined,
        qualityStatus: data.qualityStatus,
        sourcePhase: data.sourcePhase,
        productionRunId: data.productionRunId,
        loomProductionRunId: data.loomProductionRunId,
        remarks: data.remarks,
      },
      include: productionRollInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "CREATE_PRODUCTION_ROLL",
      payload: { rollId: roll.id, rollNumber: roll.rollNumber, rollType: roll.rollType },
      diffs: [{ entity: "ProductionRoll", entityId: roll.id, before: {}, after: roll }],
    });

    return NextResponse.json(roll, { status: 201 });
  } catch (error) {
    console.error("Error creating production roll:", error);
    return NextResponse.json({ error: "Failed to create production roll" }, { status: 500 });
  }
}
