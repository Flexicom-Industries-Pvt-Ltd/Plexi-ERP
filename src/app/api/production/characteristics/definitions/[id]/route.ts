import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent, logDiff } from "@/lib/logging";

import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const UpdateDefinitionSchema = z.object({
  label: z.string().min(1).optional(),
  fieldType: z.enum(["TEXT", "NUMBER", "SELECT", "BOOLEAN", "DATE"]).optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional().nullable(),
  required: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

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
    const existing = await db.productionCharacteristicDefinition.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Definition not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = UpdateDefinitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await db.productionCharacteristicDefinition.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.fieldType !== undefined && { fieldType: data.fieldType }),
        ...(data.options !== undefined && { options: data.options ?? undefined }),
        ...(data.required !== undefined && { required: data.required }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await logDiff({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      entity: "ProductionCharacteristicDefinition",
      entityId: id,
      before: existing,
      after: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating characteristic definition:", error);
    return NextResponse.json({ error: "Failed to update definition" }, { status: 500 });
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

  try {
    const existing = await db.productionCharacteristicDefinition.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Definition not found" }, { status: 404 });
    }

    const inUse = await db.productionCharacteristicValue.count({ where: { definitionId: id } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: "Cannot delete definition that is referenced by plan lines. Deactivate it instead." },
        { status: 409 },
      );
    }

    await db.productionCharacteristicDefinition.delete({ where: { id } });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "DELETE_CHARACTERISTIC_DEFINITION",
      payload: existing,
      diffs: [{
        entity: "ProductionCharacteristicDefinition",
        entityId: id,
        before: existing,
        after: {},
      }],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting characteristic definition:", error);
    return NextResponse.json({ error: "Failed to delete definition" }, { status: 500 });
  }
}
