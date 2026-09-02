import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CompleteRunSchema = z.object({
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  endedAt: z.string().datetime().optional(),
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

registry.registerPath({
  method: "get",
  path: "/api/production/runs/{id}",
  summary: "Get production run by ID",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: "Run details" }, 404: { description: "Not found" } },
});

registry.registerPath({
  method: "patch",
  path: "/api/production/runs/{id}",
  summary: "Complete a production run with actuals",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: "Run completed" }, 404: { description: "Not found" } },
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
  const run = await db.productionRun.findUnique({ where: { id }, include: runInclude });
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
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
  const existing = await db.productionRun.findUnique({
    where: { id },
    include: runInclude,
  });
  if (!existing) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  if (existing.endedAt) {
    return NextResponse.json({ error: "Run is already completed" }, { status: 409 });
  }

  try {
    const body = await request.json();
    const parsed = CompleteRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await db.productionRun.update({
      where: { id },
      data: {
        actualQty: data.actualQty,
        acceptedQty: data.acceptedQty,
        rejectedQty: data.rejectedQty,
        reworkQty: data.reworkQty,
        scrapQty: data.scrapQty,
        downtimeMinutes: data.downtimeMinutes,
        endedAt: data.endedAt ? new Date(data.endedAt) : new Date(),
      },
      include: runInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "COMPLETE_PRODUCTION_RUN",
      payload: {
        runId: updated.id,
        acceptedQty: data.acceptedQty,
        targetQty: existing.targetQty,
      },
      diffs: [{ entity: "ProductionRun", entityId: id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error completing production run:", error);
    return NextResponse.json({ error: "Failed to complete run" }, { status: 500 });
  }
}
