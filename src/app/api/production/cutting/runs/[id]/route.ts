import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { postCuttingInventoryMovements } from "@/lib/production/cutting-inventory";
import { cuttingRunInclude } from "@/lib/production/cutting-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateCuttingRunSchema = z.object({
  inputQty: z.number().min(0).optional(),
  outputMaterialQty: z.number().min(0).optional(),
  cuttingSpec: z.string().optional().nullable(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
});

const CompleteCuttingRunSchema = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputQty: z.number().min(0),
  outputMaterialQty: z.number().min(0),
  cuttingSpec: z.string().optional().nullable(),
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
  const run = await db.cuttingProductionRun.findUnique({
    where: { id },
    include: cuttingRunInclude,
  });
  if (!run) {
    return NextResponse.json({ error: "Cutting run not found" }, { status: 404 });
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
  const existing = await db.cuttingProductionRun.findUnique({
    where: { id },
    include: cuttingRunInclude,
  });
  if (!existing) {
    return NextResponse.json({ error: "Cutting run not found" }, { status: 404 });
  }
  if (existing.productionRun.endedAt) {
    return NextResponse.json({ error: "Cutting run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();

    if (body.action === "complete") {
      const parsed = CompleteCuttingRunSchema.safeParse(body);
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
          return NextResponse.json({ error: "Output cut material item not found" }, { status: 404 });
        }
        if (outputItem.stock?.materialType !== "CUT_MATERIAL") {
          return NextResponse.json({ error: "Output item must be CUT_MATERIAL type" }, { status: 400 });
        }
      }

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

        await tx.cuttingProductionRun.update({
          where: { id },
          data: {
            inputQty: data.inputQty,
            outputMaterialQty: data.outputMaterialQty,
            cuttingSpec: data.cuttingSpec ?? existing.cuttingSpec,
            outputItemId: data.outputItemId ?? existing.outputItemId,
            characteristics: (data.characteristics as Prisma.InputJsonValue) ?? undefined,
          },
        });

        await tx.productionRoll.update({
          where: { id: existing.inputRollId },
          data: { consumedAt: new Date() },
        });

        return tx.cuttingProductionRun.findUniqueOrThrow({
          where: { id },
          include: cuttingRunInclude,
        });
      });

      const inventoryResult = await postCuttingInventoryMovements({
        userId: authResult.session.user.id,
        cuttingRunId: updated.id,
        productionRunId: updated.productionRunId,
        inputRollId: updated.inputRollId,
        inputQty: updated.inputQty,
        outputItemId: updated.outputItemId,
        outputMaterialQty: updated.outputMaterialQty,
        scrapQty: data.scrapQty,
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "COMPLETE_CUTTING_RUN",
        payload: {
          cuttingRunId: updated.id,
          acceptedQty: data.acceptedQty,
          outputMaterialQty: data.outputMaterialQty,
          outputItemId: updated.outputItemId,
          inputRollId: updated.inputRollId,
          cuttingSpec: updated.cuttingSpec,
          targetQty: existing.productionRun.targetQty,
          inventory: inventoryResult,
        },
        diffs: [{ entity: "CuttingProductionRun", entityId: id, before: existing, after: updated }],
      });

      return NextResponse.json({ ...updated, inventory: inventoryResult });
    }

    const parsed = UpdateCuttingRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    if (parsed.data.outputItemId) {
      const outputItem = await db.inventoryItem.findUnique({
        where: { id: parsed.data.outputItemId },
        include: { stock: true },
      });
      if (!outputItem || outputItem.stock?.materialType !== "CUT_MATERIAL") {
        return NextResponse.json({ error: "Output item must be CUT_MATERIAL type" }, { status: 400 });
      }
    }

    const updated = await db.cuttingProductionRun.update({
      where: { id },
      data: {
        inputQty: parsed.data.inputQty,
        outputMaterialQty: parsed.data.outputMaterialQty,
        cuttingSpec: parsed.data.cuttingSpec,
        outputItemId: parsed.data.outputItemId,
        characteristics: parsed.data.characteristics as Prisma.InputJsonValue | undefined,
      },
      include: cuttingRunInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_CUTTING_RUN",
      payload: { cuttingRunId: id },
      diffs: [{ entity: "CuttingProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating cutting run:", error);
    return NextResponse.json({ error: "Failed to update cutting run" }, { status: 500 });
  }
}
