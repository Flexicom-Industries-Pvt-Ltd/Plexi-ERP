import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { convertexRunInclude } from "@/lib/production/convertex-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateConvertexRunSchema = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  convertexMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  inputMaterialId: z.string().min(1),
  inputQty: z.number().min(0).default(0),
  startedAt: z.string().datetime().optional(),
});

async function assertInputMaterial(inputMaterialId: string) {
  const item = await db.inventoryItem.findUnique({
    where: { id: inputMaterialId },
    include: { stock: true },
  });
  if (!item) {
    return { ok: false as const, status: 404, error: "Input material not found" };
  }
  if (item.stock?.materialType !== "CUT_MATERIAL") {
    return { ok: false as const, status: 400, error: "Input must be CUT_MATERIAL type" };
  }
  return { ok: true as const, item };
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
  const convertexMachineId = searchParams.get("convertexMachineId");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const productionRunFilter: Record<string, unknown> = {};
  if (planLineId) productionRunFilter.planLineId = planLineId;
  if (planId) productionRunFilter.planLine = { planId };
  if (activeOnly) productionRunFilter.endedAt = null;

  const where: Record<string, unknown> = {};
  if (Object.keys(productionRunFilter).length) where.productionRun = productionRunFilter;
  if (operatorId) where.operatorId = operatorId;
  if (convertexMachineId) where.convertexMachineId = convertexMachineId;

  try {
    const runs = await db.convertexProductionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: convertexRunInclude,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching convertex runs:", error);
    return NextResponse.json({ error: "Failed to fetch convertex runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateConvertexRunSchema.safeParse(body);
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
    if (line.phase !== "CONVERTEX") {
      return NextResponse.json({ error: "Plan line must be a CONVERTEX phase" }, { status: 400 });
    }
    if (line.finishingRoute && line.finishingRoute !== "CONVERTEX") {
      return NextResponse.json({ error: "Plan line finishing route must be CONVERTEX" }, { status: 400 });
    }
    if (!["APPROVED", "IN_PROGRESS"].includes(line.plan.status)) {
      return NextResponse.json({ error: "Plan must be approved or in progress to start a run" }, { status: 409 });
    }

    const materialCheck = await assertInputMaterial(parsed.data.inputMaterialId);
    if (!materialCheck.ok) {
      return NextResponse.json({ error: materialCheck.error }, { status: materialCheck.status });
    }

    const [machine, operator] = await Promise.all([
      db.machine.findUnique({ where: { id: parsed.data.convertexMachineId } }),
      db.user.findUnique({ where: { id: parsed.data.operatorId } }),
    ]);
    if (!machine || !machine.isActive) {
      return NextResponse.json({ error: "Convertex machine not found or inactive" }, { status: 404 });
    }
    if (!operator || !operator.isActive) {
      return NextResponse.json({ error: "Operator not found or inactive" }, { status: 404 });
    }

    const existingActive = await db.convertexProductionRun.findFirst({
      where: {
        convertexMachineId: parsed.data.convertexMachineId,
        productionRun: { endedAt: null },
      },
    });
    if (existingActive) {
      return NextResponse.json({ error: "Convertex machine already has an active run" }, { status: 409 });
    }

    const convertexRun = await db.$transaction(async (tx) => {
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

      return tx.convertexProductionRun.create({
        data: {
          productionRunId: productionRun.id,
          convertexMachineId: parsed.data.convertexMachineId,
          operatorId: parsed.data.operatorId,
          inputMaterialId: parsed.data.inputMaterialId,
          inputQty: parsed.data.inputQty || parsed.data.targetQty,
        },
        include: convertexRunInclude,
      });
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "START_CONVERTEX_RUN",
      payload: {
        convertexRunId: convertexRun.id,
        productionRunId: convertexRun.productionRunId,
        convertexMachineId: parsed.data.convertexMachineId,
        operatorId: parsed.data.operatorId,
        inputMaterialId: parsed.data.inputMaterialId,
      },
      diffs: [{ entity: "ConvertexProductionRun", entityId: convertexRun.id, before: {}, after: convertexRun }],
    });

    return NextResponse.json(convertexRun, { status: 201 });
  } catch (error) {
    console.error("Error creating convertex run:", error);
    return NextResponse.json({ error: "Failed to create convertex run" }, { status: 500 });
  }
}
