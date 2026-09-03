import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { postValvomaticInventoryMovements } from "@/lib/production/valvomatic-inventory";
import { createProductionCorrelationId } from "@/lib/production/inventory-tx";
import {
  ValvomaticInputsSchema,
  validateValvomaticInputs,
} from "@/lib/production/valvomatic-inputs";
import { valvomaticRunInclude } from "@/lib/production/valvomatic-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateValvomaticRunSchema = z.object({
  inputs: ValvomaticInputsSchema.optional(),
  outputBagQty: z.number().min(0).optional(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
});

const CompleteValvomaticRunSchema = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
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
  const run = await db.valvomaticProductionRun.findUnique({
    where: { id },
    include: valvomaticRunInclude,
  });
  if (!run) {
    return NextResponse.json({ error: "Valvomatic run not found" }, { status: 404 });
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
  const existing = await db.valvomaticProductionRun.findUnique({
    where: { id },
    include: valvomaticRunInclude,
  });
  if (!existing) {
    return NextResponse.json({ error: "Valvomatic run not found" }, { status: 404 });
  }
  if (existing.productionRun.endedAt) {
    return NextResponse.json({ error: "Valvomatic run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();

    if (body.action === "complete") {
      const parsed = CompleteValvomaticRunSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
      }

      const inputError = validateValvomaticInputs(parsed.data.inputs);
      if (inputError) {
        return NextResponse.json({ error: inputError }, { status: 400 });
      }

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

        const valvomaticUpdated = await tx.valvomaticProductionRun.update({
          where: { id },
          data: {
            inputs: parsed.data.inputs as Prisma.InputJsonValue,
            outputBagQty: parsed.data.outputBagQty,
            outputItemId: parsed.data.outputItemId ?? existing.outputItemId,
            characteristics: (parsed.data.characteristics as Prisma.InputJsonValue) ?? undefined,
            inventoryPosted: true,
          },
        });

        inventoryResult = await postValvomaticInventoryMovements({
          tx,
          userId: authResult.session.user.id,
          valvomaticRunId: valvomaticUpdated.id,
          productionRunId: valvomaticUpdated.productionRunId,
          inputs: parsed.data.inputs,
          outputItemId: valvomaticUpdated.outputItemId,
          outputBagQty: valvomaticUpdated.outputBagQty,
          scrapQty: parsed.data.scrapQty,
          alreadyPosted: existing.inventoryPosted,
          correlationId,
        });

        return tx.valvomaticProductionRun.findUniqueOrThrow({
          where: { id },
          include: valvomaticRunInclude,
        });
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "COMPLETE_VALVOMATIC_RUN",
        payload: {
          valvomaticRunId: updated.id,
          acceptedQty: parsed.data.acceptedQty,
          outputBagQty: parsed.data.outputBagQty,
          outputItemId: updated.outputItemId,
          inputs: parsed.data.inputs,
          targetQty: existing.productionRun.targetQty,
          correlationId,
          inventory: inventoryResult,
        },
        diffs: [{ entity: "ValvomaticProductionRun", entityId: id, before: existing, after: updated }],
      });

      return NextResponse.json({ ...updated, inventory: inventoryResult });
    }

    const parsed = UpdateValvomaticRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    if (parsed.data.inputs) {
      const inputError = validateValvomaticInputs(parsed.data.inputs);
      if (inputError) {
        return NextResponse.json({ error: inputError }, { status: 400 });
      }
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

    const updated = await db.valvomaticProductionRun.update({
      where: { id },
      data: {
        inputs: parsed.data.inputs as Prisma.InputJsonValue | undefined,
        outputBagQty: parsed.data.outputBagQty,
        outputItemId: parsed.data.outputItemId,
        characteristics: parsed.data.characteristics as Prisma.InputJsonValue | undefined,
      },
      include: valvomaticRunInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_VALVOMATIC_RUN",
      payload: { valvomaticRunId: id },
      diffs: [{ entity: "ValvomaticProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating valvomatic run:", error);
    return NextResponse.json({ error: "Failed to update valvomatic run" }, { status: 500 });
  }
}
