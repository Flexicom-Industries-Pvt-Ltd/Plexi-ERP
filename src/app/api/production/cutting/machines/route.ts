import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

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
      where: {
        isActive: true,
        section: {
          OR: [
            { code: { equals: "CUT", mode: "insensitive" } },
            { name: { contains: "Cutting", mode: "insensitive" } },
          ],
        },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        serialNumber: true,
        make: true,
        model: true,
        section: { select: { id: true, name: true, code: true } },
      },
    });

    const activeRuns = await db.cuttingProductionRun.findMany({
      where: { productionRun: { endedAt: null } },
      include: {
        productionRun: { select: { id: true, targetQty: true, startedAt: true } },
        operator: { select: { id: true, name: true } },
        cuttingMachine: { select: { id: true } },
        inputRoll: { select: { id: true, rollNumber: true, rollType: true } },
      },
    });

    const runByMachine = new Map(activeRuns.map((r) => [r.cuttingMachineId, r]));

    const grid = machines.map((machine) => {
      const activeRun = runByMachine.get(machine.id);
      let machineStatus: "IDLE" | "RUNNING" | "MAINTENANCE" | "INACTIVE" = "IDLE";
      if (machine.status === "MAINTENANCE") machineStatus = "MAINTENANCE";
      else if (machine.status === "INACTIVE") machineStatus = "INACTIVE";
      else if (activeRun) machineStatus = "RUNNING";

      return {
        ...machine,
        machineStatus,
        activeRun: activeRun
          ? {
              id: activeRun.id,
              productionRunId: activeRun.productionRunId,
              targetQty: activeRun.productionRun.targetQty,
              startedAt: activeRun.productionRun.startedAt,
              operator: activeRun.operator,
              inputRoll: activeRun.inputRoll,
            }
          : null,
      };
    });

    return NextResponse.json({ machines: grid, activeRunCount: activeRuns.length });
  } catch (error) {
    console.error("Error fetching cutting machines:", error);
    return NextResponse.json({ error: "Failed to fetch cutting machines" }, { status: 500 });
  }
}
