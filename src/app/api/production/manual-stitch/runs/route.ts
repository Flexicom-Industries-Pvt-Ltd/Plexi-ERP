import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { manualStitchRunInclude } from "@/lib/production/manual-stitch-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateManualStitchRunSchema = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  operatorId: z.string().min(1),
  workerIds: z.array(z.string().min(1)).min(1),
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
  const activeOnly = searchParams.get("activeOnly") === "true";

  const productionRunFilter: Record<string, unknown> = {};
  if (planLineId) productionRunFilter.planLineId = planLineId;
  if (planId) productionRunFilter.planLine = { planId };
  if (activeOnly) productionRunFilter.endedAt = null;

  const where: Record<string, unknown> = {};
  if (Object.keys(productionRunFilter).length) where.productionRun = productionRunFilter;
  if (operatorId) where.operatorId = operatorId;

  try {
    const runs = await db.manualStitchProductionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: manualStitchRunInclude,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching manual stitch runs:", error);
    return NextResponse.json({ error: "Failed to fetch manual stitch runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateManualStitchRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const uniqueWorkers = [...new Set(parsed.data.workerIds)];
    if (uniqueWorkers.includes(parsed.data.operatorId)) {
      return NextResponse.json({ error: "Lead operator cannot also be listed as a worker" }, { status: 400 });
    }

    const line = await db.productionPlanLine.findUnique({
      where: { id: parsed.data.planLineId },
      include: { plan: true },
    });
    if (!line) return NextResponse.json({ error: "Plan line not found" }, { status: 404 });
    if (line.phase !== "MANUAL_STITCH") {
      return NextResponse.json({ error: "Plan line must be a MANUAL_STITCH phase" }, { status: 400 });
    }
    if (line.finishingRoute && line.finishingRoute !== "MANUAL_STITCH") {
      return NextResponse.json({ error: "Plan line finishing route must be MANUAL_STITCH" }, { status: 400 });
    }
    if (!["APPROVED", "IN_PROGRESS"].includes(line.plan.status)) {
      return NextResponse.json({ error: "Plan must be approved or in progress to start a run" }, { status: 409 });
    }

    const materialCheck = await assertInputMaterial(parsed.data.inputMaterialId);
    if (!materialCheck.ok) {
      return NextResponse.json({ error: materialCheck.error }, { status: materialCheck.status });
    }

    const [operator, workers] = await Promise.all([
      db.user.findUnique({ where: { id: parsed.data.operatorId } }),
      db.user.findMany({
        where: { id: { in: uniqueWorkers }, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!operator || !operator.isActive) {
      return NextResponse.json({ error: "Lead operator not found or inactive" }, { status: 404 });
    }
    if (workers.length !== uniqueWorkers.length) {
      return NextResponse.json({ error: "One or more workers not found or inactive" }, { status: 404 });
    }

    const manualStitchRun = await db.$transaction(async (tx) => {
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

      return tx.manualStitchProductionRun.create({
        data: {
          productionRunId: productionRun.id,
          operatorId: parsed.data.operatorId,
          workerIds: uniqueWorkers as Prisma.InputJsonValue,
          inputMaterialId: parsed.data.inputMaterialId,
          inputQty: parsed.data.inputQty || parsed.data.targetQty,
        },
        include: manualStitchRunInclude,
      });
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "START_MANUAL_STITCH_RUN",
      payload: {
        manualStitchRunId: manualStitchRun.id,
        productionRunId: manualStitchRun.productionRunId,
        operatorId: parsed.data.operatorId,
        workerIds: uniqueWorkers,
        inputMaterialId: parsed.data.inputMaterialId,
      },
      diffs: [{ entity: "ManualStitchProductionRun", entityId: manualStitchRun.id, before: {}, after: manualStitchRun }],
    });

    return NextResponse.json(manualStitchRun, { status: 201 });
  } catch (error) {
    console.error("Error creating manual stitch run:", error);
    return NextResponse.json({ error: "Failed to create manual stitch run" }, { status: 500 });
  }
}
