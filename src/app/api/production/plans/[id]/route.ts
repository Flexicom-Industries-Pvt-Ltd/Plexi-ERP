import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logDiff, logEvent } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";
import { planInclude } from "@/lib/production/plan-include";
import { UpdatePlanSchema, buildLineCreateData } from "@/lib/production/plan-schemas";
import { validatePlanForApproval } from "@/lib/production/validate-plan";

export const dynamic = "force-dynamic";

registry.registerPath({
  method: "get",
  path: "/api/production/plans/{id}",
  summary: "Get production plan by ID or plan number",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: "Production plan details" },
    404: { description: "Not found" },
  },
});

registry.registerPath({
  method: "put",
  path: "/api/production/plans/{id}",
  summary: "Update production plan (draft only)",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: "Plan updated" },
    400: { description: "Validation error" },
    404: { description: "Not found" },
    409: { description: "Plan is not editable" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/production/plans/{id}",
  summary: "Delete draft production plan",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: "Plan deleted" },
    404: { description: "Not found" },
    409: { description: "Only draft plans can be deleted" },
  },
});

async function resolvePlan(idOrNumber: string) {
  return db.productionPlan.findFirst({
    where: { OR: [{ id: idOrNumber }, { planNumber: idOrNumber }] },
    include: planInclude,
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;
  const plan = await resolvePlan(id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json(plan);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canUpdate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;
  const existing = await resolvePlan(id);
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft plans can be edited" }, { status: 409 });
  }

  try {
    const body = await request.json();
    const parsed = UpdatePlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    await db.$transaction(async (tx) => {
      if (data.lines) {
        await tx.productionPlanLine.deleteMany({ where: { planId: existing.id } });
      }

      await tx.productionPlan.update({
        where: { id: existing.id },
        data: {
          ...(data.shiftId !== undefined && { shiftId: data.shiftId }),
          ...(data.planDate && { planDate: new Date(data.planDate) }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.lines && {
            lines: {
              create: data.lines.map((line, index) => buildLineCreateData(line, index)),
            },
          }),
        },
      });
    });

    const updated = await resolvePlan(existing.id);
    if (!updated) {
      return NextResponse.json({ error: "Plan not found after update" }, { status: 500 });
    }

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

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;
  const existing = await resolvePlan(id);
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft plans can be deleted" }, { status: 409 });
  }

  await db.productionPlan.delete({ where: { id: existing.id } });

  await logEvent({
    userId: authResult.session.user.id,
    module: "PRODUCTION",
    severity: "INFO",
    action: "DELETE_PLAN",
    payload: { planId: existing.id, planNumber: existing.planNumber },
    diffs: [{
      entity: "ProductionPlan",
      entityId: existing.id,
      before: existing,
      after: {},
    }],
  });

  return NextResponse.json({ success: true });
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
  const existing = await resolvePlan(id);
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const body = await request.json();
  const action = body.action as string | undefined;

  if (action === "approve") {
    if (existing.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft plans can be approved" }, { status: 409 });
    }

    const validation = await validatePlanForApproval(existing);
    if (!validation.valid) {
      return NextResponse.json({ error: "Plan cannot be approved", details: validation.errors }, { status: 400 });
    }

    const updated = await db.productionPlan.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        approvedById: authResult.session.user.id,
      },
      include: planInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "APPROVE_PLAN",
      payload: { planId: updated.id, planNumber: updated.planNumber },
      diffs: [{ entity: "ProductionPlan", entityId: updated.id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  }

  if (action === "cancel") {
    if (!["DRAFT", "APPROVED"].includes(existing.status)) {
      return NextResponse.json({ error: "Only draft or approved plans can be cancelled" }, { status: 409 });
    }

    const updated = await db.productionPlan.update({
      where: { id: existing.id },
      data: { status: "CANCELLED" },
      include: planInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "CANCEL_PLAN",
      payload: { planId: updated.id, planNumber: updated.planNumber },
      diffs: [{ entity: "ProductionPlan", entityId: updated.id, before: existing, after: updated }],
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Unknown action. Use approve or cancel." }, { status: 400 });
}
