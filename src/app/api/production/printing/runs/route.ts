import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { printingRunInclude } from "@/lib/production/printing-run-include";
import {
  getPrintingHelpersPerOperator,
  validatePrintingHelperCount,
} from "@/lib/production/printing-manpower";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const InkMaterialSchema = z.object({
  itemId: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().min(0),
  unit: z.string().optional(),
});

const CreatePrintingRunSchema = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  printingMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  inputRollId: z.string().min(1),
  helperUserIds: z.array(z.string().min(1)).default([]),
  brand: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  artworkRef: z.string().optional().nullable(),
  inkMaterials: z.array(InkMaterialSchema).optional(),
  inputQty: z.number().min(0).default(0),
  startedAt: z.string().datetime().optional(),
});

async function assertInputRollAvailable(inputRollId: string) {
  const roll = await db.productionRoll.findUnique({
    where: { id: inputRollId },
    include: {
      printingRunsAsInput: {
        where: { productionRun: { endedAt: null } },
        select: { id: true },
      },
    },
  });
  if (!roll) {
    return { ok: false as const, status: 404, error: "Input roll not found" };
  }
  if (roll.consumedAt) {
    return { ok: false as const, status: 409, error: "Input roll has already been consumed" };
  }
  if (!["LOOM", "LAMINATION"].includes(roll.sourcePhase)) {
    return { ok: false as const, status: 400, error: "Input roll must be from loom or lamination output" };
  }
  if (roll.printingRunsAsInput.length > 0) {
    return { ok: false as const, status: 409, error: "Input roll is already assigned to an active printing run" };
  }
  return { ok: true as const, roll };
}

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const planLineId = searchParams.get("planLineId");
  const planId = searchParams.get("planId");
  const operatorId = searchParams.get("operatorId");
  const printingMachineId = searchParams.get("printingMachineId");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const productionRunFilter: Record<string, unknown> = {};
  if (planLineId) productionRunFilter.planLineId = planLineId;
  if (planId) productionRunFilter.planLine = { planId };
  if (activeOnly) productionRunFilter.endedAt = null;

  const where: Record<string, unknown> = {};
  if (Object.keys(productionRunFilter).length) where.productionRun = productionRunFilter;
  if (operatorId) where.operatorId = operatorId;
  if (printingMachineId) where.printingMachineId = printingMachineId;

  try {
    const runs = await db.printingProductionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: printingRunInclude,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching printing runs:", error);
    return NextResponse.json({ error: "Failed to fetch printing runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreatePrintingRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const requiredHelpers = await getPrintingHelpersPerOperator();
    const helperValidation = validatePrintingHelperCount(
      parsed.data.helperUserIds,
      parsed.data.operatorId,
      requiredHelpers,
    );
    if (!helperValidation.valid) {
      return NextResponse.json({ error: helperValidation.error }, { status: 400 });
    }

    const line = await db.productionPlanLine.findUnique({
      where: { id: parsed.data.planLineId },
      include: { plan: true },
    });
    if (!line) {
      return NextResponse.json({ error: "Plan line not found" }, { status: 404 });
    }
    if (line.phase !== "PRINTING") {
      return NextResponse.json({ error: "Plan line must be a PRINTING phase" }, { status: 400 });
    }
    if (!["APPROVED", "IN_PROGRESS"].includes(line.plan.status)) {
      return NextResponse.json({ error: "Plan must be approved or in progress to start a run" }, { status: 409 });
    }

    const rollCheck = await assertInputRollAvailable(parsed.data.inputRollId);
    if (!rollCheck.ok) {
      return NextResponse.json({ error: rollCheck.error }, { status: rollCheck.status });
    }

    const helperIds = [...new Set(parsed.data.helperUserIds)];
    const [machine, operator, helpers] = await Promise.all([
      db.machine.findUnique({ where: { id: parsed.data.printingMachineId } }),
      db.user.findUnique({ where: { id: parsed.data.operatorId } }),
      db.user.findMany({ where: { id: { in: helperIds }, isActive: true } }),
    ]);
    if (!machine || !machine.isActive) {
      return NextResponse.json({ error: "Printing machine not found or inactive" }, { status: 404 });
    }
    if (!operator || !operator.isActive) {
      return NextResponse.json({ error: "Operator not found or inactive" }, { status: 404 });
    }
    if (helpers.length !== helperIds.length) {
      return NextResponse.json({ error: "One or more helpers not found or inactive" }, { status: 404 });
    }

    const existingActive = await db.printingProductionRun.findFirst({
      where: {
        printingMachineId: parsed.data.printingMachineId,
        productionRun: { endedAt: null },
      },
    });
    if (existingActive) {
      return NextResponse.json({ error: "Printing machine already has an active run" }, { status: 409 });
    }

    const printingRun = await db.$transaction(async (tx) => {
      if (line.plan.status === "APPROVED") {
        await tx.productionPlan.update({
          where: { id: line.planId },
          data: { status: "IN_PROGRESS" },
        });
      }

      const productionRun = await tx.productionRun.create({
        data: {
          planLineId: parsed.data.planLineId,
          targetQty: parsed.data.targetQty,
          startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
          recordedById: authResult.session.user.id,
        },
      });

      const run = await tx.printingProductionRun.create({
        data: {
          productionRunId: productionRun.id,
          printingMachineId: parsed.data.printingMachineId,
          operatorId: parsed.data.operatorId,
          inputRollId: parsed.data.inputRollId,
          brand: parsed.data.brand,
          colour: parsed.data.colour,
          artworkRef: parsed.data.artworkRef,
          inkMaterials: parsed.data.inkMaterials as Prisma.InputJsonValue | undefined,
          inputQty: parsed.data.inputQty || rollCheck.roll.weight || parsed.data.targetQty,
        },
      });

      if (helperIds.length) {
        await tx.printingProductionRunHelper.createMany({
          data: helperIds.map((userId) => ({ printingRunId: run.id, userId })),
        });
      }

      return tx.printingProductionRun.findUniqueOrThrow({
        where: { id: run.id },
        include: printingRunInclude,
      });
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "START_PRINTING_RUN",
      payload: {
        printingRunId: printingRun.id,
        productionRunId: printingRun.productionRunId,
        printingMachineId: parsed.data.printingMachineId,
        operatorId: parsed.data.operatorId,
        helperUserIds: helperIds,
        inputRollId: parsed.data.inputRollId,
        inkMaterials: parsed.data.inkMaterials,
      },
      diffs: [{ entity: "PrintingProductionRun", entityId: printingRun.id, before: {}, after: printingRun }],
    });

    return NextResponse.json(printingRun, { status: 201 });
  } catch (error) {
    console.error("Error creating printing run:", error);
    return NextResponse.json({ error: "Failed to create printing run" }, { status: 500 });
  }
}
