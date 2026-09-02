import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { loomRunInclude } from "@/lib/production/loom-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateLoomRunSchema = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  loomMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  bobbinItemId: z.string().optional(),
  bobbinIssueQty: z.number().min(0).default(0),
  rollType: z.enum(["PP", "LPP"]).optional(),
  startedAt: z.string().datetime().optional(),
});

registry.registerPath({
  method: "get",
  path: "/api/production/loom/runs",
  summary: "List loom production runs",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: "List of loom runs" } },
});

registry.registerPath({
  method: "post",
  path: "/api/production/loom/runs",
  summary: "Start a loom production run",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: { 201: { description: "Loom run created" } },
});

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const planLineId = searchParams.get("planLineId");
  const planId = searchParams.get("planId");
  const operatorId = searchParams.get("operatorId");
  const loomMachineId = searchParams.get("loomMachineId");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const productionRunFilter: Record<string, unknown> = {};
  if (planLineId) productionRunFilter.planLineId = planLineId;
  if (planId) productionRunFilter.planLine = { planId };
  if (activeOnly) productionRunFilter.endedAt = null;

  const where: Record<string, unknown> = {};
  if (Object.keys(productionRunFilter).length) where.productionRun = productionRunFilter;
  if (operatorId) where.operatorId = operatorId;
  if (loomMachineId) where.loomMachineId = loomMachineId;

  try {
    const runs = await db.loomProductionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: loomRunInclude,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching loom runs:", error);
    return NextResponse.json({ error: "Failed to fetch loom runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateLoomRunSchema.safeParse(body);
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
    if (line.phase !== "LOOM") {
      return NextResponse.json({ error: "Plan line must be a LOOM phase" }, { status: 400 });
    }
    if (!["APPROVED", "IN_PROGRESS"].includes(line.plan.status)) {
      return NextResponse.json({ error: "Plan must be approved or in progress to start a run" }, { status: 409 });
    }

    const [machine, operator] = await Promise.all([
      db.machine.findUnique({ where: { id: parsed.data.loomMachineId } }),
      db.user.findUnique({ where: { id: parsed.data.operatorId } }),
    ]);
    if (!machine || !machine.isActive) {
      return NextResponse.json({ error: "Loom machine not found or inactive" }, { status: 404 });
    }
    if (!operator || !operator.isActive) {
      return NextResponse.json({ error: "Operator not found or inactive" }, { status: 404 });
    }

    if (parsed.data.bobbinItemId) {
      const bobbin = await db.inventoryItem.findUnique({ where: { id: parsed.data.bobbinItemId } });
      if (!bobbin) {
        return NextResponse.json({ error: "Bobbin item not found" }, { status: 404 });
      }
    }

    const existingActive = await db.loomProductionRun.findFirst({
      where: { loomMachineId: parsed.data.loomMachineId, productionRun: { endedAt: null } },
    });
    if (existingActive) {
      return NextResponse.json({ error: "Loom already has an active run" }, { status: 409 });
    }

    const loomRun = await db.$transaction(async (tx) => {
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

      return tx.loomProductionRun.create({
        data: {
          productionRunId: productionRun.id,
          loomMachineId: parsed.data.loomMachineId,
          operatorId: parsed.data.operatorId,
          bobbinItemId: parsed.data.bobbinItemId,
          bobbinIssueQty: parsed.data.bobbinIssueQty,
          rollType: parsed.data.rollType,
        },
        include: loomRunInclude,
      });
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "START_LOOM_RUN",
      payload: {
        loomRunId: loomRun.id,
        productionRunId: loomRun.productionRunId,
        loomMachineId: parsed.data.loomMachineId,
        operatorId: parsed.data.operatorId,
      },
      diffs: [{ entity: "LoomProductionRun", entityId: loomRun.id, before: {}, after: loomRun }],
    });

    return NextResponse.json(loomRun, { status: 201 });
  } catch (error) {
    console.error("Error creating loom run:", error);
    return NextResponse.json({ error: "Failed to create loom run" }, { status: 500 });
  }
}
