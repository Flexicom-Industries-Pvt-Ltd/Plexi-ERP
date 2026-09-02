import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { getLoomsPerOperatorLimit, validateLoomAssignmentCount } from "@/lib/production/loom-manpower";
import { loomAssignmentInclude } from "@/lib/production/loom-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateAssignmentSchema = z.object({
  shiftId: z.string().min(1),
  operatorId: z.string().min(1),
  assignmentDate: z.string().optional(),
  machineIds: z.array(z.string().min(1)).min(1),
  forceOverride: z.boolean().default(false),
});

function startOfDay(dateStr?: string) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get("shiftId");
  const operatorId = searchParams.get("operatorId");
  const assignmentDate = searchParams.get("assignmentDate");

  const where: Record<string, unknown> = {};
  if (shiftId) where.shiftId = shiftId;
  if (operatorId) where.operatorId = operatorId;
  if (assignmentDate) {
    const day = startOfDay(assignmentDate);
    where.assignmentDate = { gte: day, lte: endOfDay(day) };
  }

  try {
    const assignments = await db.loomAssignment.findMany({
      where,
      orderBy: { assignmentDate: "desc" },
      include: loomAssignmentInclude,
    });
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching loom assignments:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const day = startOfDay(data.assignmentDate);
    const limit = await getLoomsPerOperatorLimit();
    const validation = validateLoomAssignmentCount(data.machineIds, limit);

    if (!validation.valid && !data.forceOverride) {
      return NextResponse.json(
        {
          error: "Loom assignment exceeds operator limit",
          warnings: validation.warnings,
          limit: validation.limit,
          assignedCount: validation.assignedCount,
          canOverride: true,
        },
        { status: 422 },
      );
    }

    const [shift, operator, machines] = await Promise.all([
      db.shift.findUnique({ where: { id: data.shiftId } }),
      db.user.findUnique({ where: { id: data.operatorId } }),
      db.machine.findMany({ where: { id: { in: data.machineIds }, isActive: true } }),
    ]);

    if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    if (machines.length !== data.machineIds.length) {
      return NextResponse.json({ error: "One or more machines not found or inactive" }, { status: 404 });
    }

    const conflicting = await db.loomAssignmentMachine.findMany({
      where: {
        machineId: { in: data.machineIds },
        assignment: {
          shiftId: data.shiftId,
          assignmentDate: { gte: day, lte: endOfDay(day) },
          operatorId: { not: data.operatorId },
        },
      },
      include: { machine: { select: { name: true } }, assignment: { select: { operatorId: true } } },
    });

    if (conflicting.length > 0 && !data.forceOverride) {
      return NextResponse.json(
        {
          error: "One or more looms already assigned to another operator this shift",
          conflicts: conflicting.map((c) => ({ machineId: c.machineId, machineName: c.machine.name })),
          canOverride: true,
        },
        { status: 409 },
      );
    }

    const assignment = await db.$transaction(async (tx) => {
      const existing = await tx.loomAssignment.findFirst({
        where: {
          shiftId: data.shiftId,
          operatorId: data.operatorId,
          assignmentDate: { gte: day, lte: endOfDay(day) },
        },
      });

      if (existing) {
        await tx.loomAssignmentMachine.deleteMany({ where: { assignmentId: existing.id } });
        await tx.loomAssignment.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() },
        });
        await tx.loomAssignmentMachine.createMany({
          data: data.machineIds.map((machineId) => ({
            assignmentId: existing.id,
            machineId,
          })),
        });
        return tx.loomAssignment.findUnique({
          where: { id: existing.id },
          include: loomAssignmentInclude,
        });
      }

      const created = await tx.loomAssignment.create({
        data: {
          shiftId: data.shiftId,
          operatorId: data.operatorId,
          assignmentDate: day,
          createdById: authResult.session.user.id,
          machines: {
            create: data.machineIds.map((machineId) => ({ machineId })),
          },
        },
        include: loomAssignmentInclude,
      });
      return created;
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: validation.valid ? "INFO" : "WARN",
      action: "LOOM_ASSIGNMENT_CHANGED",
      payload: {
        assignmentId: assignment?.id,
        operatorId: data.operatorId,
        shiftId: data.shiftId,
        machineIds: data.machineIds,
        warnings: validation.warnings,
        forceOverride: data.forceOverride,
      },
      diffs: [{ entity: "LoomAssignment", entityId: assignment?.id ?? "", before: {}, after: assignment }],
    });

    return NextResponse.json(
      { ...assignment, warnings: validation.warnings },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating loom assignment:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
