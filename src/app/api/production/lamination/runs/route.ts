import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { laminationRunInclude } from "@/lib/production/lamination-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateLaminationRunSchema = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  laminationMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  inputRollId: z.string().min(1),
  inputQty: z.number().min(0).default(0),
  startedAt: z.string().datetime().optional(),
});

async function assertInputRollAvailable(inputRollId: string) {
  const roll = await db.productionRoll.findUnique({
    where: { id: inputRollId },
    include: {
      laminationRunsAsInput: {
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
  if (roll.laminationRunsAsInput.length > 0) {
    return { ok: false as const, status: 409, error: "Input roll is already assigned to an active lamination run" };
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
  const laminationMachineId = searchParams.get("laminationMachineId");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const productionRunFilter: Record<string, unknown> = {};
  if (planLineId) productionRunFilter.planLineId = planLineId;
  if (planId) productionRunFilter.planLine = { planId };
  if (activeOnly) productionRunFilter.endedAt = null;

  const where: Record<string, unknown> = {};
  if (Object.keys(productionRunFilter).length) where.productionRun = productionRunFilter;
  if (operatorId) where.operatorId = operatorId;
  if (laminationMachineId) where.laminationMachineId = laminationMachineId;

  try {
    const runs = await db.laminationProductionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: laminationRunInclude,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching lamination runs:", error);
    return NextResponse.json({ error: "Failed to fetch lamination runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateLaminationRunSchema.safeParse(body);
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
    if (line.phase !== "LAMINATION") {
      return NextResponse.json({ error: "Plan line must be a LAMINATION phase" }, { status: 400 });
    }
    if (!["APPROVED", "IN_PROGRESS"].includes(line.plan.status)) {
      return NextResponse.json({ error: "Plan must be approved or in progress to start a run" }, { status: 409 });
    }

    const rollCheck = await assertInputRollAvailable(parsed.data.inputRollId);
    if (!rollCheck.ok) {
      return NextResponse.json({ error: rollCheck.error }, { status: rollCheck.status });
    }

    const [machine, operator] = await Promise.all([
      db.machine.findUnique({ where: { id: parsed.data.laminationMachineId } }),
      db.user.findUnique({ where: { id: parsed.data.operatorId } }),
    ]);
    if (!machine || !machine.isActive) {
      return NextResponse.json({ error: "Lamination machine not found or inactive" }, { status: 404 });
    }
    if (!operator || !operator.isActive) {
      return NextResponse.json({ error: "Operator not found or inactive" }, { status: 404 });
    }

    const existingActive = await db.laminationProductionRun.findFirst({
      where: {
        laminationMachineId: parsed.data.laminationMachineId,
        productionRun: { endedAt: null },
      },
    });
    if (existingActive) {
      return NextResponse.json({ error: "Lamination machine already has an active run" }, { status: 409 });
    }

    const laminationRun = await db.$transaction(async (tx) => {
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

      return tx.laminationProductionRun.create({
        data: {
          productionRunId: productionRun.id,
          laminationMachineId: parsed.data.laminationMachineId,
          operatorId: parsed.data.operatorId,
          inputRollId: parsed.data.inputRollId,
          inputQty: parsed.data.inputQty || rollCheck.roll.weight || parsed.data.targetQty,
        },
        include: laminationRunInclude,
      });
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "START_LAMINATION_RUN",
      payload: {
        laminationRunId: laminationRun.id,
        productionRunId: laminationRun.productionRunId,
        laminationMachineId: parsed.data.laminationMachineId,
        operatorId: parsed.data.operatorId,
        inputRollId: parsed.data.inputRollId,
      },
      diffs: [{ entity: "LaminationProductionRun", entityId: laminationRun.id, before: {}, after: laminationRun }],
    });

    return NextResponse.json(laminationRun, { status: 201 });
  } catch (error) {
    console.error("Error creating lamination run:", error);
    return NextResponse.json({ error: "Failed to create lamination run" }, { status: 500 });
  }
}
