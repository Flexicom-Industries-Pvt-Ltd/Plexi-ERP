import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";
import { generatePlanNumber } from "@/lib/production/plan-number";
import { planInclude } from "@/lib/production/plan-include";
import { CreatePlanSchema, buildLineCreateData } from "@/lib/production/plan-schemas";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PlanResponseSchema = z.object({
  id: z.string(),
  planNumber: z.string(),
  status: z.string(),
}).openapi("ProductionPlanResponse");

registry.registerPath({
  method: "get",
  path: "/api/production/plans",
  summary: "List production plans",
  description: "Filter by status, shiftId, phase, dateFrom, dateTo",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: "List of production plans" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/production/plans",
  summary: "Create production plan",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    201: {
      description: "Plan created",
      content: { "application/json": { schema: PlanResponseSchema } },
    },
    400: { description: "Validation error" },
  },
});

async function resolvePlan(idOrNumber: string) {
  return db.productionPlan.findFirst({
    where: { OR: [{ id: idOrNumber }, { planNumber: idOrNumber }] },
    include: planInclude,
  });
}

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const shiftId = searchParams.get("shiftId");
  const phase = searchParams.get("phase");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (shiftId) where.shiftId = shiftId;
  if (dateFrom || dateTo) {
    where.planDate = {};
    if (dateFrom) (where.planDate as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      (where.planDate as Record<string, Date>).lte = end;
    }
  }
  if (phase) {
    where.lines = { some: { phase } };
  }

  try {
    const plans = await db.productionPlan.findMany({
      where,
      orderBy: { planDate: "desc" },
      include: planInclude,
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching production plans:", error);
    return NextResponse.json({ error: "Failed to fetch production plans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const planNumber = await generatePlanNumber();
    const planDate = data.planDate ? new Date(data.planDate) : new Date();

    const newPlan = await db.productionPlan.create({
      data: {
        planNumber,
        shiftId: data.shiftId || null,
        planDate,
        status: "DRAFT",
        notes: data.notes || null,
        createdById: authResult.session.user.id,
        lines: {
          create: data.lines.map((line, index) => buildLineCreateData(line, index)),
        },
      },
      include: planInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "CREATE_PLAN",
      payload: { planId: newPlan.id, planNumber: newPlan.planNumber },
      diffs: [{
        entity: "ProductionPlan",
        entityId: newPlan.id,
        before: {},
        after: newPlan,
      }],
    });

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error) {
    console.error("Error creating production plan:", error);
    return NextResponse.json({ error: "Failed to create production plan" }, { status: 500 });
  }
}

export { resolvePlan };
