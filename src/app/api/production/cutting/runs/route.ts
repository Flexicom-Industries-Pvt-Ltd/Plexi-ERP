import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { cuttingRunInclude } from "@/lib/production/cutting-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateCuttingRunSchema = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  cuttingMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  inputRollId: z.string().min(1),
  cuttingSpec: z.string().optional().nullable(),
  inputQty: z.number().min(0).default(0),
  startedAt: z.string().datetime().optional(),
});

async function assertInputRollAvailable(inputRollId: string) {
  const roll = await db.productionRoll.findUnique({
    where: { id: inputRollId },
    include: {
      cuttingRunsAsInput: {
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
  if (roll.sourcePhase !== "PRINTING") {
    return { ok: false as const, status: 400, error: "Input roll must be from printing output" };
  }
  if (roll.cuttingRunsAsInput.length > 0) {
    return { ok: false as const, status: 409, error: "Input roll is already assigned to an active cutting run" };
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
  const cuttingMachineId = searchParams.get("cuttingMachineId");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const productionRunFilter: Record<string, unknown> = {};
  if (planLineId) productionRunFilter.planLineId = planLineId;
  if (planId) productionRunFilter.planLine = { planId };
  if (activeOnly) productionRunFilter.endedAt = null;

  const where: Record<string, unknown> = {};
  if (Object.keys(productionRunFilter).length) where.productionRun = productionRunFilter;
  if (operatorId) where.operatorId = operatorId;
  if (cuttingMachineId) where.cuttingMachineId = cuttingMachineId;

  try {
    const runs = await db.cuttingProductionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: cuttingRunInclude,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching cutting runs:", error);
    return NextResponse.json({ error: "Failed to fetch cutting runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateCuttingRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const line = await db.productionPlanLine.findUnique({
      where: { id: parsed.data.planLineId },
      include: { plan: true },
    });
    if (!line) {
      return NextResponse.json({ error: "Plan line not found" }, { status: 404 });
    }
    if (line.phase !== "CUTTING") {
      return NextResponse.json({ error: "Plan line must be a CUTTING phase" }, { status: 400 });
    }
    if (!["APPROVED", "IN_PROGRESS"].includes(line.plan.status)) {
      return NextResponse.json({ error: "Plan must be approved or in progress to start a run" }, { status: 409 });
    }

    const rollCheck = await assertInputRollAvailable(parsed.data.inputRollId);
    if (!rollCheck.ok) {
      return NextResponse.json({ error: rollCheck.error }, { status: rollCheck.status });
    }

    const [machine, operator] = await Promise.all([
      db.machine.findUnique({ where: { id: parsed.data.cuttingMachineId } }),
      db.user.findUnique({ where: { id: parsed.data.operatorId } }),
    ]);
    if (!machine || !machine.isActive) {
      return NextResponse.json({ error: "Cutting machine not found or inactive" }, { status: 404 });
    }
    if (!operator || !operator.isActive) {
      return NextResponse.json({ error: "Operator not found or inactive" }, { status: 404 });
    }

    const existingActive = await db.cuttingProductionRun.findFirst({
      where: {
        cuttingMachineId: parsed.data.cuttingMachineId,
        productionRun: { endedAt: null },
      },
    });
    if (existingActive) {
      return NextResponse.json({ error: "Cutting machine already has an active run" }, { status: 409 });
    }

    const cuttingRun = await db.$transaction(async (tx) => {
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

      return tx.cuttingProductionRun.create({
        data: {
          productionRunId: productionRun.id,
          cuttingMachineId: parsed.data.cuttingMachineId,
          operatorId: parsed.data.operatorId,
          inputRollId: parsed.data.inputRollId,
          cuttingSpec: parsed.data.cuttingSpec,
          inputQty: parsed.data.inputQty || rollCheck.roll.weight || parsed.data.targetQty,
        },
        include: cuttingRunInclude,
      });
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "START_CUTTING_RUN",
      payload: {
        cuttingRunId: cuttingRun.id,
        productionRunId: cuttingRun.productionRunId,
        cuttingMachineId: parsed.data.cuttingMachineId,
        operatorId: parsed.data.operatorId,
        inputRollId: parsed.data.inputRollId,
        cuttingSpec: parsed.data.cuttingSpec,
      },
      diffs: [{ entity: "CuttingProductionRun", entityId: cuttingRun.id, before: {}, after: cuttingRun }],
    });

    return NextResponse.json(cuttingRun, { status: 201 });
  } catch (error) {
    console.error("Error creating cutting run:", error);
    return NextResponse.json({ error: "Failed to create cutting run" }, { status: 500 });
  }
}
