import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { postManualStitchInventoryMovements } from "@/lib/production/manual-stitch-inventory";
import { manualStitchRunInclude } from "@/lib/production/manual-stitch-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateManualStitchRunSchema = z.object({
  workerIds: z.array(z.string().min(1)).optional(),
  inputQty: z.number().min(0).optional(),
  outputBagQty: z.number().min(0).optional(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
});

const CompleteManualStitchRunSchema = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  workerIds: z.array(z.string().min(1)).min(1),
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
  const run = await db.manualStitchProductionRun.findUnique({
    where: { id },
    include: manualStitchRunInclude,
  });
  if (!run) return NextResponse.json({ error: "Manual stitch run not found" }, { status: 404 });
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
  const existing = await db.manualStitchProductionRun.findUnique({
    where: { id },
    include: manualStitchRunInclude,
  });
  if (!existing) return NextResponse.json({ error: "Manual stitch run not found" }, { status: 404 });
  if (existing.productionRun.endedAt) {
    return NextResponse.json({ error: "Manual stitch run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();

    if (body.action === "complete") {
      const parsed = CompleteManualStitchRunSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
      }

      const uniqueWorkers = [...new Set(parsed.data.workerIds)];
      if (uniqueWorkers.includes(existing.operatorId)) {
        return NextResponse.json({ error: "Lead operator cannot also be listed as a worker" }, { status: 400 });
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

        return tx.manualStitchProductionRun.update({
          where: { id },
          data: {
            workerIds: uniqueWorkers as Prisma.InputJsonValue,
            inputQty: parsed.data.inputQty,
            outputBagQty: parsed.data.outputBagQty,
            outputItemId: parsed.data.outputItemId ?? existing.outputItemId,
            characteristics: (parsed.data.characteristics as Prisma.InputJsonValue) ?? undefined,
          },
          include: manualStitchRunInclude,
        });
      });

      const inventoryResult = await postManualStitchInventoryMovements({
        userId: authResult.session.user.id,
        manualStitchRunId: updated.id,
        productionRunId: updated.productionRunId,
        inputMaterialId: updated.inputMaterialId,
        inputQty: updated.inputQty,
        workerIds: uniqueWorkers,
        outputItemId: updated.outputItemId,
        outputBagQty: updated.outputBagQty,
        scrapQty: parsed.data.scrapQty,
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "COMPLETE_MANUAL_STITCH_RUN",
        payload: {
          manualStitchRunId: updated.id,
          acceptedQty: parsed.data.acceptedQty,
          outputBagQty: parsed.data.outputBagQty,
          workerIds: uniqueWorkers,
          inventory: inventoryResult,
        },
        diffs: [{ entity: "ManualStitchProductionRun", entityId: id, before: existing, after: updated }],
      });

      return NextResponse.json({ ...updated, inventory: inventoryResult });
    }

    const parsed = UpdateManualStitchRunSchema.safeParse(body);
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

    const updated = await db.manualStitchProductionRun.update({
      where: { id },
      data: {
        workerIds: parsed.data.workerIds as Prisma.InputJsonValue | undefined,
        inputQty: parsed.data.inputQty,
        outputBagQty: parsed.data.outputBagQty,
        outputItemId: parsed.data.outputItemId,
        characteristics: parsed.data.characteristics as Prisma.InputJsonValue | undefined,
      },
      include: manualStitchRunInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_MANUAL_STITCH_RUN",
      payload: { manualStitchRunId: id },
      diffs: [{ entity: "ManualStitchProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating manual stitch run:", error);
    return NextResponse.json({ error: "Failed to update manual stitch run" }, { status: 500 });
  }
}
