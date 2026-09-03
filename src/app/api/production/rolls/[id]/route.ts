import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logDiff, logEvent } from "@/lib/logging";
import { productionRollInclude } from "@/lib/production/roll-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateRollSchema = z.object({
  weight: z.number().min(0).optional(),
  length: z.number().min(0).optional(),
  batchLot: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  inventoryItemId: z.string().optional().nullable(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  qualityStatus: z.enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"]).optional(),
  remarks: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;
  const roll = await db.productionRoll.findFirst({
    where: { OR: [{ id }, { rollNumber: id }] },
    include: productionRollInclude,
  });

  if (!roll) {
    return NextResponse.json({ error: "Production roll not found" }, { status: 404 });
  }

  return NextResponse.json(roll);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canUpdate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;
  const existing = await db.productionRoll.findFirst({
    where: { OR: [{ id }, { rollNumber: id }] },
    include: productionRollInclude,
  });

  if (!existing) {
    return NextResponse.json({ error: "Production roll not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = UpdateRollSchema.safeParse(body);
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

    const updated = await db.productionRoll.update({
      where: { id: existing.id },
      data: {
        weight: data.weight,
        length: data.length,
        batchLot: data.batchLot,
        locationId: data.locationId,
        inventoryItemId: data.inventoryItemId,
        qualityStatus: data.qualityStatus,
        remarks: data.remarks,
        characteristics: data.characteristics as Prisma.InputJsonValue | undefined,
      },
      include: productionRollInclude,
    });

    const statusChanged = data.qualityStatus && data.qualityStatus !== existing.qualityStatus;

    await logDiff({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      entity: "ProductionRoll",
      entityId: existing.id,
      before: existing,
      after: updated,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: statusChanged ? "WARN" : "INFO",
      action: statusChanged ? "UPDATE_ROLL_QUALITY_STATUS" : "UPDATE_PRODUCTION_ROLL",
      payload: {
        rollId: existing.id,
        rollNumber: existing.rollNumber,
        previousStatus: existing.qualityStatus,
        newStatus: updated.qualityStatus,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating production roll:", error);
    return NextResponse.json({ error: "Failed to update production roll" }, { status: 500 });
  }
}
