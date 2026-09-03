import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { postConvertexInventoryMovements } from "@/lib/production/convertex-inventory";
import { createProductionCorrelationId } from "@/lib/production/inventory-tx";
import { convertexRunInclude } from "@/lib/production/convertex-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateConvertexRunSchema = z.object({
  inputQty: z.number().min(0).optional(),
  outputBagQty: z.number().min(0).optional(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
});

const CompleteConvertexRunSchema = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputQty: z.number().min(0),
  outputBagQty: z.number().min(0),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  endedAt: z.string().datetime().optional(),
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
  const run = await db.convertexProductionRun.findUnique({
    where: { id },
    include: convertexRunInclude,
  });
  if (!run) {
    return NextResponse.json({ error: "Convertex run not found" }, { status: 404 });
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
  const existing = await db.convertexProductionRun.findUnique({
    where: { id },
    include: convertexRunInclude,
  });
  if (!existing) {
    return NextResponse.json({ error: "Convertex run not found" }, { status: 404 });
  }
  if (existing.productionRun.endedAt) {
    return NextResponse.json({ error: "Convertex run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();

    if (body.action === "complete") {
      const parsed = CompleteConvertexRunSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
      }

      const data = parsed.data;

      if (data.outputItemId) {
        const outputItem = await db.inventoryItem.findUnique({
          where: { id: data.outputItemId },
          include: { stock: true },
        });
        if (!outputItem) {
          return NextResponse.json({ error: "Output finished bag item not found" }, { status: 404 });
        }
        if (outputItem.stock?.materialType !== "FINISHED_BAGS") {
          return NextResponse.json({ error: "Output item must be FINISHED_BAGS type" }, { status: 400 });
        }
      }

      const correlationId = createProductionCorrelationId(existing.productionRunId);
      let inventoryResult;

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

        const convertexUpdated = await tx.convertexProductionRun.update({
          where: { id },
          data: {
            inputQty: data.inputQty,
            outputBagQty: data.outputBagQty,
            outputItemId: data.outputItemId ?? existing.outputItemId,
            characteristics: (data.characteristics as Prisma.InputJsonValue) ?? undefined,
            inventoryPosted: true,
          },
        });

        inventoryResult = await postConvertexInventoryMovements({
          tx,
          userId: authResult.session.user.id,
          convertexRunId: convertexUpdated.id,
          productionRunId: convertexUpdated.productionRunId,
          inputMaterialId: convertexUpdated.inputMaterialId,
          inputQty: convertexUpdated.inputQty,
          outputItemId: convertexUpdated.outputItemId,
          outputBagQty: convertexUpdated.outputBagQty,
          scrapQty: data.scrapQty,
          alreadyPosted: existing.inventoryPosted,
          correlationId,
        });

        return tx.convertexProductionRun.findUniqueOrThrow({
          where: { id },
          include: convertexRunInclude,
        });
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "COMPLETE_CONVERTEX_RUN",
        payload: {
          convertexRunId: updated.id,
          acceptedQty: data.acceptedQty,
          outputBagQty: data.outputBagQty,
          outputItemId: updated.outputItemId,
          inputMaterialId: updated.inputMaterialId,
          targetQty: existing.productionRun.targetQty,
          correlationId,
          inventory: inventoryResult,
        },
        diffs: [{ entity: "ConvertexProductionRun", entityId: id, before: existing, after: updated }],
      });

      return NextResponse.json({ ...updated, inventory: inventoryResult });
    }

    const parsed = UpdateConvertexRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    if (parsed.data.outputItemId) {
      const outputItem = await db.inventoryItem.findUnique({
        where: { id: parsed.data.outputItemId },
        include: { stock: true },
      });
      if (!outputItem || outputItem.stock?.materialType !== "FINISHED_BAGS") {
        return NextResponse.json({ error: "Output item must be FINISHED_BAGS type" }, { status: 400 });
      }
    }

    const updated = await db.convertexProductionRun.update({
      where: { id },
      data: {
        inputQty: parsed.data.inputQty,
        outputBagQty: parsed.data.outputBagQty,
        outputItemId: parsed.data.outputItemId,
        characteristics: parsed.data.characteristics as Prisma.InputJsonValue | undefined,
      },
      include: convertexRunInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_CONVERTEX_RUN",
      payload: { convertexRunId: id },
      diffs: [{ entity: "ConvertexProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating convertex run:", error);
    return NextResponse.json({ error: "Failed to update convertex run" }, { status: 500 });
  }
}
