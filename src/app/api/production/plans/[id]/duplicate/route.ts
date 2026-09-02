import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";
import { generatePlanNumber } from "@/lib/production/plan-number";
import { planInclude } from "@/lib/production/plan-include";

export const dynamic = "force-dynamic";

registry.registerPath({
  method: "post",
  path: "/api/production/plans/{id}/duplicate",
  summary: "Duplicate a production plan as a new draft",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    201: { description: "Duplicated plan created" },
    404: { description: "Not found" },
  },
});

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;

  const source = await db.productionPlan.findFirst({
    where: { OR: [{ id }, { planNumber: id }] },
    include: planInclude,
  });

  if (!source) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  try {
    const planNumber = await generatePlanNumber();

    const duplicated = await db.productionPlan.create({
      data: {
        planNumber,
        shiftId: source.shiftId,
        planDate: source.planDate,
        status: "DRAFT",
        notes: source.notes ? `Copy of ${source.planNumber}: ${source.notes}` : `Copy of ${source.planNumber}`,
        createdById: authResult.session.user.id,
        lines: {
          create: source.lines.map((line, index) => ({
            phase: line.phase,
            machineId: line.machineId,
            operatorId: line.operatorId,
            inventoryItemId: line.inventoryItemId,
            targetQty: line.targetQty,
            priority: line.priority,
            instructions: line.instructions,
            sortOrder: line.sortOrder ?? index,
            operators: line.operators.length
              ? { create: line.operators.map((o) => ({ userId: o.userId })) }
              : undefined,
            characteristics: line.characteristics.length
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
      action: "DUPLICATE_PLAN",
      payload: {
        sourcePlanId: source.id,
        sourcePlanNumber: source.planNumber,
        newPlanId: duplicated.id,
        newPlanNumber: duplicated.planNumber,
      },
      diffs: [{
        entity: "ProductionPlan",
        entityId: duplicated.id,
        before: {},
        after: duplicated,
      }],
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    console.error("Error duplicating production plan:", error);
    return NextResponse.json({ error: "Failed to duplicate plan" }, { status: 500 });
  }
}
