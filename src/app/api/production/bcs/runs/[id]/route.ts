import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { postBcsInventoryMovements } from "@/lib/production/bcs-inventory";
import { createProductionCorrelationId } from "@/lib/production/inventory-tx";
import { bcsRunInclude } from "@/lib/production/bcs-run-include";
import { validateValvomaticInputs, ValvomaticInputsSchema } from "@/lib/production/valvomatic-inputs";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateBcsRunSchema = z.object({
  teamMemberIds: z.array(z.string().min(1)).optional(),
  inputs: ValvomaticInputsSchema.optional(),
  outputBagQty: z.number().min(0).optional(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
});

const CompleteBcsRunSchema = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  teamMemberIds: z.array(z.string().min(1)).default([]),
  inputs: ValvomaticInputsSchema,
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
  const run = await db.bcsProductionRun.findUnique({
    where: { id },
    include: bcsRunInclude,
  });
  if (!run) return NextResponse.json({ error: "BCS run not found" }, { status: 404 });
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
  const existing = await db.bcsProductionRun.findUnique({
    where: { id },
    include: bcsRunInclude,
  });
  if (!existing) return NextResponse.json({ error: "BCS run not found" }, { status: 404 });
  if (existing.productionRun.endedAt) {
    return NextResponse.json({ error: "BCS run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();

    if (body.action === "complete") {
      const parsed = CompleteBcsRunSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
      }

      const inputError = validateValvomaticInputs(parsed.data.inputs);
      if (inputError) return NextResponse.json({ error: inputError }, { status: 400 });

      if (parsed.data.outputItemId) {
        const outputItem = await db.inventoryItem.findUnique({
          where: { id: parsed.data.outputItemId },
          include: { stock: true },
        });
        if (!outputItem) {
          return NextResponse.json({ error: "Output finished bag item not found" }, { status: 404 });
        }
        if (outputItem.stock?.materialType !== "FINISHED_BAGS") {
          return NextResponse.json({ error: "Output item must be FINISHED_BAGS type" }, { status: 400 });
        }
      }

      const uniqueTeam = [...new Set(parsed.data.teamMemberIds)];
      const correlationId = createProductionCorrelationId(existing.productionRunId);
      let inventoryResult;

      const updated = await db.$transaction(async (tx) => {
        await tx.productionRun.update({
          where: { id: existing.productionRunId },
          data: {
            actualQty: parsed.data.actualQty,
            acceptedQty: parsed.data.acceptedQty,
            rejectedQty: parsed.data.rejectedQty,
            reworkQty: parsed.data.reworkQty,
            scrapQty: parsed.data.scrapQty,
            downtimeMinutes: parsed.data.downtimeMinutes,
            endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date(),
          },
        });

        const bcsUpdated = await tx.bcsProductionRun.update({
          where: { id },
          data: {
            teamMemberIds: uniqueTeam as Prisma.InputJsonValue,
            inputs: parsed.data.inputs as Prisma.InputJsonValue,
            outputBagQty: parsed.data.outputBagQty,
            outputItemId: parsed.data.outputItemId ?? existing.outputItemId,
            characteristics: (parsed.data.characteristics as Prisma.InputJsonValue) ?? undefined,
            inventoryPosted: true,
          },
        });

        inventoryResult = await postBcsInventoryMovements({
          tx,
          userId: authResult.session.user.id,
          bcsRunId: bcsUpdated.id,
          productionRunId: bcsUpdated.productionRunId,
          inputs: parsed.data.inputs,
          teamMemberIds: uniqueTeam,
          outputItemId: bcsUpdated.outputItemId,
          outputBagQty: bcsUpdated.outputBagQty,
          scrapQty: parsed.data.scrapQty,
          alreadyPosted: existing.inventoryPosted,
          correlationId,
        });

        return tx.bcsProductionRun.findUniqueOrThrow({
          where: { id },
          include: bcsRunInclude,
        });
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "COMPLETE_BCS_RUN",
        payload: {
          bcsRunId: updated.id,
          acceptedQty: parsed.data.acceptedQty,
          outputBagQty: parsed.data.outputBagQty,
          teamMemberIds: uniqueTeam,
          inputs: parsed.data.inputs,
          correlationId,
          inventory: inventoryResult,
        },
        diffs: [{ entity: "BcsProductionRun", entityId: id, before: existing, after: updated }],
      });

      return NextResponse.json({ ...updated, inventory: inventoryResult });
    }

    const parsed = UpdateBcsRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    if (parsed.data.inputs) {
      const inputError = validateValvomaticInputs(parsed.data.inputs);
      if (inputError) return NextResponse.json({ error: inputError }, { status: 400 });
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

    const updated = await db.bcsProductionRun.update({
      where: { id },
      data: {
        teamMemberIds: parsed.data.teamMemberIds
          ? (parsed.data.teamMemberIds as Prisma.InputJsonValue)
          : undefined,
        inputs: parsed.data.inputs as Prisma.InputJsonValue | undefined,
        outputBagQty: parsed.data.outputBagQty,
        outputItemId: parsed.data.outputItemId,
        characteristics: parsed.data.characteristics as Prisma.InputJsonValue | undefined,
      },
      include: bcsRunInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_BCS_RUN",
      payload: { bcsRunId: id },
      diffs: [{ entity: "BcsProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating BCS run:", error);
    return NextResponse.json({ error: "Failed to update BCS run" }, { status: 500 });
  }
}
