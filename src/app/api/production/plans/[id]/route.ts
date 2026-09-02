import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logDiff } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdatePlanSchema = z.object({
  shiftId: z.string().optional().nullable(),
  planDate: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().optional().nullable(),
});

registry.registerPath({
  method: "get",
  path: "/api/production/plans/{id}",
  summary: "Get production plan by ID",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: "Production plan details" },
    404: { description: "Not found" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/production/plans/{id}",
  summary: "Update production plan",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: "Plan updated" },
    400: { description: "Validation error" },
    404: { description: "Not found" },
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;

  try {
    const plan = await db.productionPlan.findFirst({
      where: { OR: [{ id }, { planNumber: id }] },
      include: planInclude,
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error fetching production plan:", error);
    return NextResponse.json({ error: "Failed to fetch production plan" }, { status: 500 });
  }
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

  try {
    const existing = await db.productionPlan.findFirst({
      where: { OR: [{ id }, { planNumber: id }] },
      include: planInclude,
    });

    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (data.shiftId !== undefined) updateData.shiftId = data.shiftId;
    if (data.planDate) updateData.planDate = new Date(data.planDate);
    if (data.status) {
      updateData.status = data.status;
      if (data.status === "APPROVED" && !existing.approvedById) {
        updateData.approvedById = authResult.session.user.id;
      }
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await db.productionPlan.update({
      where: { id: existing.id },
      data: updateData,
      include: planInclude,
    });

    await logDiff({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      entity: "ProductionPlan",
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating production plan:", error);
    return NextResponse.json({ error: "Failed to update production plan" }, { status: 500 });
  }
}
