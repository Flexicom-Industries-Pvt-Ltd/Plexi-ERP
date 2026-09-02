import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent, logDiff } from "@/lib/logging";

import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateRunSchema = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  startedAt: z.string().datetime().optional(),
});

const runInclude = {
  planLine: {
    include: {
      plan: { select: { id: true, planNumber: true, status: true } },
      machine: { select: { id: true, name: true } },
    },
  },
  recordedBy: { select: { id: true, name: true, email: true } },
};

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const planLineId = searchParams.get("planLineId");
  const planId = searchParams.get("planId");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const where: Record<string, unknown> = {};
  if (planLineId) where.planLineId = planLineId;
  if (planId) where.planLine = { planId };
  if (activeOnly) where.endedAt = null;

  try {
    const runs = await db.productionRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: runInclude,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching production runs:", error);
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateRunSchema.safeParse(body);
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
    if (!["APPROVED", "IN_PROGRESS"].includes(line.plan.status)) {
      return NextResponse.json({ error: "Plan must be approved or in progress to start a run" }, { status: 409 });
    }

    const run = await db.$transaction(async (tx) => {
      if (line.plan.status === "APPROVED") {
        await tx.productionPlan.update({
          where: { id: line.planId },
          data: { status: "IN_PROGRESS" },
        });
      }

      return tx.productionRun.create({
        data: {
          planLineId: parsed.data.planLineId,
          targetQty: parsed.data.targetQty,
          startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
          recordedById: authResult.session.user.id,
        },
        include: runInclude,
      });
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "START_PRODUCTION_RUN",
      payload: { runId: run.id, planLineId: run.planLineId },
      diffs: [{ entity: "ProductionRun", entityId: run.id, before: {}, after: run }],
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    console.error("Error creating production run:", error);
    return NextResponse.json({ error: "Failed to create run" }, { status: 500 });
  }
}
