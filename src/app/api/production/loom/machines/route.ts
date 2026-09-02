import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

registry.registerPath({
  method: "get",
  path: "/api/production/loom/machines",
  summary: "List looms with current run status",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: "Loom machine grid data" } },
});

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get("shiftId");
  const assignmentDate = searchParams.get("assignmentDate");

  try {
    const machines = await db.machine.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        serialNumber: true,
        section: { select: { id: true, name: true, code: true } },
      },
    });

    const activeRuns = await db.loomProductionRun.findMany({
      where: { productionRun: { endedAt: null } },
      include: {
        productionRun: { select: { id: true, targetQty: true, startedAt: true } },
        operator: { select: { id: true, name: true } },
        loomMachine: { select: { id: true } },
      },
    });

    const runByMachine = new Map(activeRuns.map((r) => [r.loomMachineId, r]));

    let assignments: Array<{
      operatorId: string;
      operator: { id: string; name: string | null };
      machines: { machineId: string }[];
    }> = [];
    if (shiftId && assignmentDate) {
      const day = new Date(assignmentDate);
      day.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      assignments = await db.loomAssignment.findMany({
        where: { shiftId, assignmentDate: { gte: day, lte: dayEnd } },
        include: {
          operator: { select: { id: true, name: true } },
          machines: { select: { machineId: true } },
        },
      });
    }

    const assignmentByMachine = new Map<string, { operatorId: string; operatorName: string }>();
    for (const assignment of assignments) {
      for (const m of assignment.machines) {
        assignmentByMachine.set(m.machineId, {
          operatorId: assignment.operatorId,
          operatorName: assignment.operator?.name ?? "—",
        });
      }
    }

    const grid = machines.map((machine) => {
      const activeRun = runByMachine.get(machine.id);
      const assigned = assignmentByMachine.get(machine.id);
      let loomStatus: "IDLE" | "RUNNING" | "MAINTENANCE" | "INACTIVE" = "IDLE";
      if (machine.status === "MAINTENANCE") loomStatus = "MAINTENANCE";
      else if (machine.status === "INACTIVE") loomStatus = "INACTIVE";
      else if (activeRun) loomStatus = "RUNNING";

      return {
        ...machine,
        loomStatus,
        assignedOperator: assigned ?? null,
        activeRun: activeRun
          ? {
              id: activeRun.id,
              productionRunId: activeRun.productionRunId,
              targetQty: activeRun.productionRun.targetQty,
              startedAt: activeRun.productionRun.startedAt,
              operator: activeRun.operator,
            }
          : null,
      };
    });

    return NextResponse.json({ machines: grid, activeRunCount: activeRuns.length });
  } catch (error) {
    console.error("Error fetching loom machines:", error);
    return NextResponse.json({ error: "Failed to fetch loom machines" }, { status: 500 });
  }
}
