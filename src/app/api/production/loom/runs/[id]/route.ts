import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { postLoomInventoryMovements } from "@/lib/production/loom-inventory";
import { createProductionRollFromLoomRun } from "@/lib/production/create-roll-from-loom";
import { loomRunInclude } from "@/lib/production/loom-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateLoomRunSchema = z.object({
  bobbinItemId: z.string().nullable().optional(),
  bobbinIssueQty: z.number().min(0).optional(),
  rollOutputQty: z.number().min(0).optional(),
  rollType: z.enum(["PP", "LPP"]).nullable().optional(),
  rollItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
});

const CompleteLoomRunSchema = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  bobbinIssueQty: z.number().min(0),
  rollOutputQty: z.number().min(0),
  rollType: z.enum(["PP", "LPP"]).optional(),
  rollItemId: z.string().nullable().optional(),
  bobbinItemId: z.string().nullable().optional(),
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
  const run = await db.loomProductionRun.findUnique({
    where: { id },
    include: loomRunInclude,
  });
  if (!run) {
    return NextResponse.json({ error: "Loom run not found" }, { status: 404 });
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
  const existing = await db.loomProductionRun.findUnique({
    where: { id },
    include: loomRunInclude,
  });
  if (!existing) {
    return NextResponse.json({ error: "Loom run not found" }, { status: 404 });
  }
  if (existing.productionRun.endedAt) {
    return NextResponse.json({ error: "Loom run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();

    if (body.action === "complete") {
      const parsed = CompleteLoomRunSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
      }

      const data = parsed.data;
      let createdRollId: string | null = null;

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

        const loomUpdated = await tx.loomProductionRun.update({
          where: { id },
          data: {
            bobbinIssueQty: data.bobbinIssueQty,
            rollOutputQty: data.rollOutputQty,
            rollType: data.rollType ?? existing.rollType,
            rollItemId: data.rollItemId ?? existing.rollItemId,
            bobbinItemId: data.bobbinItemId ?? existing.bobbinItemId,
            characteristics: (data.characteristics as Prisma.InputJsonValue) ?? undefined,
          },
        });

        const roll = await createProductionRollFromLoomRun(tx, loomUpdated);
        createdRollId = roll?.id ?? null;

        return tx.loomProductionRun.findUniqueOrThrow({
          where: { id },
          include: loomRunInclude,
        });
      });

      const inventoryResult = await postLoomInventoryMovements({
        userId: authResult.session.user.id,
        loomRunId: updated.id,
        productionRunId: updated.productionRunId,
        bobbinItemId: updated.bobbinItemId,
        bobbinIssueQty: updated.bobbinIssueQty,
        rollItemId: updated.rollItemId,
        rollOutputQty: updated.rollOutputQty,
        scrapQty: data.scrapQty,
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "COMPLETE_LOOM_RUN",
        payload: {
          loomRunId: updated.id,
          acceptedQty: data.acceptedQty,
          rollOutputQty: data.rollOutputQty,
          productionRollId: createdRollId,
          targetQty: existing.productionRun.targetQty,
          inventory: inventoryResult,
        },
        diffs: [{ entity: "LoomProductionRun", entityId: id, before: existing, after: updated }],
      });

      return NextResponse.json({ ...updated, inventory: inventoryResult });
    }

    const parsed = UpdateLoomRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const updated = await db.loomProductionRun.update({
      where: { id },
      data: {
        bobbinItemId: parsed.data.bobbinItemId,
        bobbinIssueQty: parsed.data.bobbinIssueQty,
        rollOutputQty: parsed.data.rollOutputQty,
        rollType: parsed.data.rollType,
        rollItemId: parsed.data.rollItemId,
        characteristics: parsed.data.characteristics as Prisma.InputJsonValue | undefined,
      },
      include: loomRunInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_LOOM_RUN",
      payload: { loomRunId: id },
      diffs: [{ entity: "LoomProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating loom run:", error);
    return NextResponse.json({ error: "Failed to update loom run" }, { status: 500 });
  }
}
