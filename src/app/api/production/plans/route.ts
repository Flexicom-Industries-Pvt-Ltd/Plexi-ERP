import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent, logDiff } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";
import { generatePlanNumber } from "@/lib/production/plan-number";

export const dynamic = "force-dynamic";

const CharacteristicValueSchema = z.object({
  definitionId: z.string().min(1),
  value: z.string(),
});

const PlanLineSchema = z.object({
  phase: z.enum([
    "BOBBIN", "LOOM", "LAMINATION", "PRINTING", "CUTTING",
    "CONVERTEX", "VALVOMATIC", "BCS", "MANUAL_STITCH", "BALING",
  ]),
  machineId: z.string().optional().nullable(),
  operatorId: z.string().optional().nullable(),
  targetQty: z.number().min(0).default(0),
  priority: z.number().int().default(0),
  instructions: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  characteristics: z.array(CharacteristicValueSchema).optional(),
});

const CreatePlanSchema = z.object({
  shiftId: z.string().optional().nullable(),
  planDate: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("DRAFT"),
  notes: z.string().optional().nullable(),
  lines: z.array(PlanLineSchema).min(1, "At least one plan line is required"),
}).openapi("CreateProductionPlanInput");

const PlanResponseSchema = z.object({
  id: z.string(),
  planNumber: z.string(),
  status: z.string(),
}).openapi("ProductionPlanResponse");

registry.registerPath({
  method: "get",
  path: "/api/production/plans",
  summary: "List production plans",
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
  request: {
    body: {
      content: {
        "application/json": { schema: CreatePlanSchema },
      },
    },
  },
  responses: {
    201: {
      description: "Plan created",
      content: { "application/json": { schema: PlanResponseSchema } },
    },
    400: { description: "Validation error" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
  },
});

const planInclude = {
  shift: true,
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      machine: { select: { id: true, name: true } },
      operator: { select: { id: true, name: true, email: true } },
      characteristics: {
        include: { definition: true },
      },
    },
  },
};

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const shiftId = searchParams.get("shiftId");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (shiftId) where.shiftId = shiftId;

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

    const newPlan = await db.productionPlan.create({
      data: {
        planNumber,
        shiftId: data.shiftId || null,
        planDate: data.planDate ? new Date(data.planDate) : new Date(),
        status: data.status,
        notes: data.notes || null,
        createdById: authResult.session.user.id,
        lines: {
          create: data.lines.map((line, index) => ({
            phase: line.phase,
            machineId: line.machineId || null,
            operatorId: line.operatorId || null,
            targetQty: line.targetQty,
            priority: line.priority,
            instructions: line.instructions || null,
            sortOrder: line.sortOrder ?? index,
            characteristics: line.characteristics?.length
              ? {
                  create: line.characteristics.map((c) => ({
                    definitionId: c.definitionId,
                    value: c.value,
                  })),
                }
              : undefined,
          })),
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
