import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { baleInclude } from "@/lib/production/bale-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateBaleSchema = z.object({
  productionBatch: z.string().optional().nullable(),
  qualityStatus: z.enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"]).optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  baleItemId: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await params;

  try {
    const bale = await db.bale.findUnique({
      where: { id },
      include: baleInclude,
    });
    if (!bale) {
      return NextResponse.json({ error: "Bale not found" }, { status: 404 });
    }
    return NextResponse.json(bale);
  } catch (error) {
    console.error("Error fetching bale:", error);
    return NextResponse.json({ error: "Failed to fetch bale" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canUpdate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await params;

  try {
    const existing = await db.bale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bale not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateBaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    if (parsed.data.baleItemId) {
      const item = await db.inventoryItem.findUnique({
        where: { id: parsed.data.baleItemId },
        include: { stock: true },
      });
      if (!item) {
        return NextResponse.json({ error: "Bale output item not found" }, { status: 404 });
      }
      if (item.stock?.materialType !== "BALES") {
        return NextResponse.json({ error: "Bale output item must be BALES type" }, { status: 400 });
      }
    }

    const updateData: Prisma.BaleUpdateInput = {};
    if (parsed.data.productionBatch !== undefined) updateData.productionBatch = parsed.data.productionBatch;
    if (parsed.data.qualityStatus) updateData.qualityStatus = parsed.data.qualityStatus;
    if (parsed.data.characteristics !== undefined) {
      updateData.characteristics = parsed.data.characteristics as Prisma.InputJsonValue;
    }
    if (parsed.data.baleItemId !== undefined) {
      updateData.baleItem = parsed.data.baleItemId
        ? { connect: { id: parsed.data.baleItemId } }
        : { disconnect: true };
    }

    const bale = await db.bale.update({
      where: { id },
      data: updateData,
      include: baleInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_BALE",
      payload: { baleId: bale.id, baleNumber: bale.baleNumber },
      diffs: [{ entity: "Bale", entityId: bale.id, before: existing, after: bale }],
    });

    return NextResponse.json(bale);
  } catch (error) {
    console.error("Error updating bale:", error);
    return NextResponse.json({ error: "Failed to update bale" }, { status: 500 });
  }
}
