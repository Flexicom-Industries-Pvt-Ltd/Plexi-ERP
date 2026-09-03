import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { bcsRunInclude } from "@/lib/production/bcs-run-include";
import {
  getBcsProductionRules,
  validateBcsRulesAgainstInputs,
  validateBcsTeamMembers,
} from "@/lib/production/bcs-rules";
import {
  ValvomaticInputsSchema,
  validateValvomaticInputs,
} from "@/lib/production/valvomatic-inputs";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateBcsRunSchema = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  bcsMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  teamMemberIds: z.array(z.string().min(1)).default([]),
  inputs: ValvomaticInputsSchema,
  startedAt: z.string().datetime().optional(),
});

async function assertInputRollAvailable(inputRollId: string) {
  const roll = await db.productionRoll.findUnique({ where: { id: inputRollId } });
  if (!roll) return { ok: false as const, status: 404, error: "Input roll not found" };
  if (roll.consumedAt) return { ok: false as const, status: 409, error: "Input roll has already been consumed" };
  return { ok: true as const, roll };
}

async function assertInventoryItem(itemId: string, materialType: string, label: string) {
  const item = await db.inventoryItem.findUnique({
    where: { id: itemId },
    include: { stock: true },
  });
  if (!item) return { ok: false as const, status: 404, error: `${label} item not found` };
  if (item.stock?.materialType !== materialType) {
    return { ok: false as const, status: 400, error: `${label} must be ${materialType} type` };
  }
  return { ok: true as const, item };
}

async function validateBcsInputRefs(inputs: z.infer<typeof ValvomaticInputsSchema>) {
  const inputError = validateValvomaticInputs(inputs);
  if (inputError) return { ok: false as const, status: 400, error: inputError };

  if (inputs.inputRollId) {
    const rollCheck = await assertInputRollAvailable(inputs.inputRollId);
    if (!rollCheck.ok) return rollCheck;
  }
  if (inputs.yarnItemId) {
    const yarnCheck = await assertInventoryItem(inputs.yarnItemId, "BOBBINS", "Yarn");
    if (!yarnCheck.ok) return yarnCheck;
  }
  if (inputs.ppItemId) {
    const ppCheck = await assertInventoryItem(inputs.ppItemId, "PP_ROLLS", "PP");
    if (!ppCheck.ok) return ppCheck;
  }
  if (inputs.lppItemId) {
    const lppCheck = await assertInventoryItem(inputs.lppItemId, "LPP_ROLLS", "LPP");
    if (!lppCheck.ok) return lppCheck;
  }

  return { ok: true as const };
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
  const bcsMachineId = searchParams.get("bcsMachineId");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const productionRunFilter: Record<string, unknown> = {};
  if (planLineId) productionRunFilter.planLineId = planLineId;
  if (planId) productionRunFilter.planLine = { planId };
  if (activeOnly) productionRunFilter.endedAt = null;

  const where: Record<string, unknown> = {};
  if (Object.keys(productionRunFilter).length) where.productionRun = productionRunFilter;
  if (operatorId) where.operatorId = operatorId;
  if (bcsMachineId) where.bcsMachineId = bcsMachineId;

  try {
    const runs = await db.bcsProductionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: bcsRunInclude,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching BCS runs:", error);
    return NextResponse.json({ error: "Failed to fetch BCS runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateBcsRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const rules = await getBcsProductionRules();
    const teamError = validateBcsTeamMembers(parsed.data.teamMemberIds, parsed.data.operatorId, rules);
    if (teamError) {
      return NextResponse.json({ error: teamError }, { status: 400 });
    }

    const rulesInputError = validateBcsRulesAgainstInputs(parsed.data.inputs, rules);
    if (rulesInputError) {
      return NextResponse.json({ error: rulesInputError }, { status: 400 });
    }

    const line = await db.productionPlanLine.findUnique({
      where: { id: parsed.data.planLineId },
      include: { plan: true },
    });
    if (!line) return NextResponse.json({ error: "Plan line not found" }, { status: 404 });
    if (line.phase !== "BCS") {
      return NextResponse.json({ error: "Plan line must be a BCS phase" }, { status: 400 });
    }
    if (line.finishingRoute && line.finishingRoute !== "BCS") {
      return NextResponse.json({ error: "Plan line finishing route must be BCS" }, { status: 400 });
    }
    if (!["APPROVED", "IN_PROGRESS"].includes(line.plan.status)) {
      return NextResponse.json({ error: "Plan must be approved or in progress to start a run" }, { status: 409 });
    }

    const inputsCheck = await validateBcsInputRefs(parsed.data.inputs);
    if (!inputsCheck.ok) {
      return NextResponse.json({ error: inputsCheck.error }, { status: inputsCheck.status });
    }

    const uniqueTeam = [...new Set(parsed.data.teamMemberIds)];
    if (uniqueTeam.length) {
      const members = await db.user.findMany({
        where: { id: { in: uniqueTeam }, isActive: true },
        select: { id: true },
      });
      if (members.length !== uniqueTeam.length) {
        return NextResponse.json({ error: "One or more team members not found or inactive" }, { status: 404 });
      }
    }

    const [machine, operator] = await Promise.all([
      db.machine.findUnique({ where: { id: parsed.data.bcsMachineId } }),
      db.user.findUnique({ where: { id: parsed.data.operatorId } }),
    ]);
    if (!machine || !machine.isActive) {
      return NextResponse.json({ error: "BCS machine not found or inactive" }, { status: 404 });
    }
    if (!operator || !operator.isActive) {
      return NextResponse.json({ error: "Operator not found or inactive" }, { status: 404 });
    }

    const existingActive = await db.bcsProductionRun.findFirst({
      where: {
        bcsMachineId: parsed.data.bcsMachineId,
        productionRun: { endedAt: null },
      },
    });
    if (existingActive) {
      return NextResponse.json({ error: "BCS machine already has an active run" }, { status: 409 });
    }

    const bcsRun = await db.$transaction(async (tx) => {
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

      return tx.bcsProductionRun.create({
        data: {
          productionRunId: productionRun.id,
          bcsMachineId: parsed.data.bcsMachineId,
          operatorId: parsed.data.operatorId,
          teamMemberIds: uniqueTeam as Prisma.InputJsonValue,
          inputs: parsed.data.inputs as Prisma.InputJsonValue,
          bcsRulesSnapshot: rules as Prisma.InputJsonValue,
        },
        include: bcsRunInclude,
      });
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "START_BCS_RUN",
      payload: {
        bcsRunId: bcsRun.id,
        productionRunId: bcsRun.productionRunId,
        bcsMachineId: parsed.data.bcsMachineId,
        operatorId: parsed.data.operatorId,
        teamMemberIds: uniqueTeam,
        inputs: parsed.data.inputs,
        rules,
      },
      diffs: [{ entity: "BcsProductionRun", entityId: bcsRun.id, before: {}, after: bcsRun }],
    });

    return NextResponse.json(bcsRun, { status: 201 });
  } catch (error) {
    console.error("Error creating BCS run:", error);
    return NextResponse.json({ error: "Failed to create BCS run" }, { status: 500 });
  }
}
