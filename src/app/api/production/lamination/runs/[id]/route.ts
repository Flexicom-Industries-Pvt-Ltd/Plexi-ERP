import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { postLaminationInventoryMovements } from "@/lib/production/lamination-inventory";
import { createProductionCorrelationId } from "@/lib/production/inventory-tx";
import { createProductionRollFromLaminationRun } from "@/lib/production/create-roll-from-lamination";
import { laminationRunInclude } from "@/lib/production/lamination-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateLaminationRunSchema = z.object({
  inputQty: z.number().min(0).optional(),
  outputQty: z.number().min(0).optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
});

const CompleteLaminationRunSchema = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputQty: z.number().min(0),
  outputQty: z.number().min(0),
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
  const run = await db.laminationProductionRun.findUnique({
    where: { id },
    include: laminationRunInclude,
  });
  if (!run) {
    return NextResponse.json({ error: "Lamination run not found" }, { status: 404 });
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
  const existing = await db.laminationProductionRun.findUnique({
    where: { id },
    include: {
      ...laminationRunInclude,
      inputRoll: {
        select: {
          id: true,
          rollType: true,
          weight: true,
          length: true,
          batchLot: true,
          locationId: true,
          inventoryItemId: true,
          characteristics: true,
        },
      },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lamination run not found" }, { status: 404 });
  }
  if (existing.productionRun.endedAt) {
    return NextResponse.json({ error: "Lamination run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();

    if (body.action === "complete") {
      const parsed = CompleteLaminationRunSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
      }

      const data = parsed.data;
      let createdRollId: string | null = null;
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

        const laminationUpdated = await tx.laminationProductionRun.update({
          where: { id },
          data: {
            inputQty: data.inputQty,
            outputQty: data.outputQty,
            characteristics: (data.characteristics as Prisma.InputJsonValue) ?? undefined,
            inventoryPosted: true,
          },
        });

        await tx.productionRoll.update({
          where: { id: existing.inputRollId },
          data: { consumedAt: new Date() },
        });

        const roll = await createProductionRollFromLaminationRun(tx, {
          id: laminationUpdated.id,
          productionRunId: laminationUpdated.productionRunId,
          outputQty: laminationUpdated.outputQty,
          characteristics: laminationUpdated.characteristics,
          inputRoll: existing.inputRoll,
        });
        createdRollId = roll?.id ?? null;

        inventoryResult = await postLaminationInventoryMovements({
          tx,
          userId: authResult.session.user.id,
          laminationRunId: laminationUpdated.id,
          productionRunId: laminationUpdated.productionRunId,
          inputRollId: existing.inputRollId,
          inputQty: laminationUpdated.inputQty,
          outputRoll: roll,
          outputQty: laminationUpdated.outputQty,
          scrapQty: data.scrapQty,
          alreadyPosted: existing.inventoryPosted,
          correlationId,
        });

        return tx.laminationProductionRun.findUniqueOrThrow({
          where: { id },
          include: laminationRunInclude,
        });
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "COMPLETE_LAMINATION_RUN",
        payload: {
          laminationRunId: updated.id,
          acceptedQty: data.acceptedQty,
          outputQty: data.outputQty,
          outputRollId: createdRollId,
          inputRollId: updated.inputRollId,
          targetQty: existing.productionRun.targetQty,
          correlationId,
          inventory: inventoryResult,
        },
        diffs: [{ entity: "LaminationProductionRun", entityId: id, before: existing, after: updated }],
      });

      return NextResponse.json({ ...updated, inventory: inventoryResult });
    }

    const parsed = UpdateLaminationRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const updated = await db.laminationProductionRun.update({
      where: { id },
      data: {
        inputQty: parsed.data.inputQty,
        outputQty: parsed.data.outputQty,
        characteristics: parsed.data.characteristics as Prisma.InputJsonValue | undefined,
      },
      include: laminationRunInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_LAMINATION_RUN",
      payload: { laminationRunId: id },
      diffs: [{ entity: "LaminationProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating lamination run:", error);
    return NextResponse.json({ error: "Failed to update lamination run" }, { status: 500 });
  }
}
