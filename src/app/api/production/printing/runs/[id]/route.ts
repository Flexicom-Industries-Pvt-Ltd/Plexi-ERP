import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { postPrintingInventoryMovements } from "@/lib/production/printing-inventory";
import { createProductionCorrelationId } from "@/lib/production/inventory-tx";
import { createProductionRollFromPrintingRun } from "@/lib/production/create-roll-from-printing";
import { printingRunInclude } from "@/lib/production/printing-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const InkMaterialSchema = z.object({
  itemId: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().min(0),
  unit: z.string().optional(),
});

const UpdatePrintingRunSchema = z.object({
  inputQty: z.number().min(0).optional(),
  outputQty: z.number().min(0).optional(),
  brand: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  artworkRef: z.string().optional().nullable(),
  inkMaterials: z.array(InkMaterialSchema).optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
});

const CompletePrintingRunSchema = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputQty: z.number().min(0),
  outputQty: z.number().min(0),
  brand: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  artworkRef: z.string().optional().nullable(),
  inkMaterials: z.array(InkMaterialSchema).optional(),
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
  const run = await db.printingProductionRun.findUnique({
    where: { id },
    include: printingRunInclude,
  });
  if (!run) {
    return NextResponse.json({ error: "Printing run not found" }, { status: 404 });
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
  const existing = await db.printingProductionRun.findUnique({
    where: { id },
    include: {
      ...printingRunInclude,
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
    return NextResponse.json({ error: "Printing run not found" }, { status: 404 });
  }
  if (existing.productionRun.endedAt) {
    return NextResponse.json({ error: "Printing run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();

    if (body.action === "complete") {
      const parsed = CompletePrintingRunSchema.safeParse(body);
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

        const printingUpdated = await tx.printingProductionRun.update({
          where: { id },
          data: {
            inputQty: data.inputQty,
            outputQty: data.outputQty,
            brand: data.brand ?? existing.brand,
            colour: data.colour ?? existing.colour,
            artworkRef: data.artworkRef ?? existing.artworkRef,
            inkMaterials: (data.inkMaterials as Prisma.InputJsonValue) ?? existing.inkMaterials ?? undefined,
            characteristics: (data.characteristics as Prisma.InputJsonValue) ?? undefined,
            inventoryPosted: true,
          },
        });

        await tx.productionRoll.update({
          where: { id: existing.inputRollId },
          data: { consumedAt: new Date() },
        });

        const roll = await createProductionRollFromPrintingRun(tx, {
          id: printingUpdated.id,
          productionRunId: printingUpdated.productionRunId,
          outputQty: printingUpdated.outputQty,
          brand: printingUpdated.brand,
          colour: printingUpdated.colour,
          artworkRef: printingUpdated.artworkRef,
          characteristics: printingUpdated.characteristics,
          inputRoll: existing.inputRoll,
        });
        createdRollId = roll?.id ?? null;

        inventoryResult = await postPrintingInventoryMovements({
          tx,
          userId: authResult.session.user.id,
          printingRunId: printingUpdated.id,
          productionRunId: printingUpdated.productionRunId,
          inputRollId: existing.inputRollId,
          inputQty: printingUpdated.inputQty,
          outputRoll: roll,
          outputQty: printingUpdated.outputQty,
          inkMaterials: printingUpdated.inkMaterials,
          scrapQty: data.scrapQty,
          alreadyPosted: existing.inventoryPosted,
          correlationId,
        });

        return tx.printingProductionRun.findUniqueOrThrow({
          where: { id },
          include: printingRunInclude,
        });
      });

      await logEvent({
        userId: authResult.session.user.id,
        module: "PRODUCTION",
        severity: "INFO",
        action: "COMPLETE_PRINTING_RUN",
        payload: {
          printingRunId: updated.id,
          acceptedQty: data.acceptedQty,
          outputQty: data.outputQty,
          outputRollId: createdRollId,
          inputRollId: updated.inputRollId,
          inkMaterials: updated.inkMaterials,
          targetQty: existing.productionRun.targetQty,
          correlationId,
          inventory: inventoryResult,
        },
        diffs: [{ entity: "PrintingProductionRun", entityId: id, before: existing, after: updated }],
      });

      return NextResponse.json({ ...updated, inventory: inventoryResult });
    }

    const parsed = UpdatePrintingRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const updated = await db.printingProductionRun.update({
      where: { id },
      data: {
        inputQty: parsed.data.inputQty,
        outputQty: parsed.data.outputQty,
        brand: parsed.data.brand,
        colour: parsed.data.colour,
        artworkRef: parsed.data.artworkRef,
        inkMaterials: parsed.data.inkMaterials as Prisma.InputJsonValue | undefined,
        characteristics: parsed.data.characteristics as Prisma.InputJsonValue | undefined,
      },
      include: printingRunInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_PRINTING_RUN",
      payload: { printingRunId: id },
      diffs: [{ entity: "PrintingProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating printing run:", error);
    return NextResponse.json({ error: "Failed to update printing run" }, { status: 500 });
  }
}
