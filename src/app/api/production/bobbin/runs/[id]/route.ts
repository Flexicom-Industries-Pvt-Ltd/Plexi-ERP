import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { postBobbinInventoryMovements } from "@/lib/production/bobbin-inventory";
import { bobbinRunInclude } from "@/lib/production/bobbin-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateBobbinRunSchema = z.object({
  rawMaterialItemId: z.string().min(1).optional(),
  outputItemId: z.string().nullable().optional(),
  inputQty: z.number().min(0).optional(),
  outputQty: z.number().min(0).optional(),
  bobbinCharacteristics: z.record(z.string(), z.unknown()).optional(),
});

const CompleteBobbinRunSchema = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputQty: z.number().min(0),
  outputQty: z.number().min(0),
  outputItemId: z.string().nullable().optional(),
  bobbinCharacteristics: z.record(z.string(), z.unknown()).optional(),
  endedAt: z.string().datetime().optional(),
});

registry.registerPath({
  method: "get",
  path: "/api/production/bobbin/runs/{id}",
  summary: "Get bobbin production run by ID",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: "Bobbin run details" }, 404: { description: "Not found" } },
});

registry.registerPath({
  method: "patch",
  path: "/api/production/bobbin/runs/{id}",
  summary: "Update or complete a bobbin production run",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: "Bobbin run updated" }, 404: { description: "Not found" } },
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
  const run = await db.bobbinProductionRun.findUnique({
    where: { id },
    include: bobbinRunInclude,
  });
  if (!run) {
    return NextResponse.json({ error: "Bobbin run not found" }, { status: 404 });
  }
  return NextResponse.json(run);
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
  const existing = await db.bobbinProductionRun.findUnique({
    where: { id },
    include: bobbinRunInclude,
  });
  if (!existing) {
    return NextResponse.json({ error: "Bobbin run not found" }, { status: 404 });
  }
  if (existing.productionRun.endedAt) {
    return NextResponse.json({ error: "Bobbin run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();

    if (body.action === "complete") {
      const parsed = CompleteBobbinRunSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
      }

      const data = parsed.data;
      const updated = await db.$transaction(async (tx) => {
        await tx.productionRun.update({
          where: { id: existing.productionRunId },
          data: {
            actualQty: data.actualQty,
            acceptedQty: data.acceptedQty,
            rejectedQty: data.rejectedQty,
            reworkQty: data.reworkQty,
            scrapQty: data.scrapQty,
            downtimeMinutes: data.downtimeMinutes,
            endedAt: data.endedAt ? new Date(data.endedAt) : new Date(),
          },
        });

        return tx.bobbinProductionRun.update({
          where: { id },
          data: {
            inputQty: data.inputQty,
            outputQty: data.outputQty,
            outputItemId: data.outputItemId ?? existing.outputItemId,
            bobbinCharacteristics: (data.bobbinCharacteristics as Prisma.InputJsonValue) ?? undefined,
          },
          include: bobbinRunInclude,
        });
      });

      const inventoryResult = await postBobbinInventoryMovements({
        userId: authResult.session.user.id,
        bobbinRunId: updated.id,
        productionRunId: updated.productionRunId,
        rawMaterialItemId: updated.rawMaterialItemId,
        outputItemId: updated.outputItemId,
        inputQty: updated.inputQty,
        outputQty: updated.outputQty,
        scrapQty: data.scrapQty,
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "COMPLETE_BOBBIN_RUN",
        payload: {
          bobbinRunId: updated.id,
          acceptedQty: data.acceptedQty,
          targetQty: existing.productionRun.targetQty,
          inventory: inventoryResult,
        },
        diffs: [{ entity: "BobbinProductionRun", entityId: id, before: existing, after: updated }],
      });

      return NextResponse.json({ ...updated, inventory: inventoryResult });
    }

    const parsed = UpdateBobbinRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    if (parsed.data.rawMaterialItemId) {
      const rawMaterial = await db.inventoryItem.findUnique({
        where: { id: parsed.data.rawMaterialItemId },
      });
      if (!rawMaterial) {
        return NextResponse.json({ error: "Raw material item not found" }, { status: 404 });
      }
    }

    if (parsed.data.outputItemId) {
      const outputItem = await db.inventoryItem.findUnique({
        where: { id: parsed.data.outputItemId },
      });
      if (!outputItem) {
        return NextResponse.json({ error: "Output bobbin item not found" }, { status: 404 });
      }
    }

    const updated = await db.bobbinProductionRun.update({
      where: { id },
      data: {
        rawMaterialItemId: parsed.data.rawMaterialItemId,
        outputItemId: parsed.data.outputItemId,
        inputQty: parsed.data.inputQty,
        outputQty: parsed.data.outputQty,
        bobbinCharacteristics: parsed.data.bobbinCharacteristics as Prisma.InputJsonValue | undefined,
      },
      include: bobbinRunInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_BOBBIN_RUN",
      payload: { bobbinRunId: id },
      diffs: [{ entity: "BobbinProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating bobbin run:", error);
    return NextResponse.json({ error: "Failed to update bobbin run" }, { status: 500 });
  }
}
