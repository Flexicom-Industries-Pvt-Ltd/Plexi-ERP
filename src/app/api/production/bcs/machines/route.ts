import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summarizeValvomaticInputs, ValvomaticInputsSchema } from "@/lib/production/valvomatic-inputs";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const machines = await db.machine.findMany({
      where: {
        isActive: true,
        section: {
          OR: [
            { code: { equals: "BCS", mode: "insensitive" } },
            { name: { contains: "BCS", mode: "insensitive" } },
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

    const activeRuns = await db.bcsProductionRun.findMany({
      where: { productionRun: { endedAt: null } },
      include: {
        productionRun: { select: { id: true, targetQty: true, startedAt: true } },
        operator: { select: { id: true, name: true } },
        bcsMachine: { select: { id: true } },
      },
    });

    const runByMachine = new Map(activeRuns.map((r) => [r.bcsMachineId, r]));

    const grid = machines.map((machine) => {
      const activeRun = runByMachine.get(machine.id);
      let machineStatus: "IDLE" | "RUNNING" | "MAINTENANCE" | "INACTIVE" = "IDLE";
      if (machine.status === "MAINTENANCE") machineStatus = "MAINTENANCE";
      else if (machine.status === "INACTIVE") machineStatus = "INACTIVE";
      else if (activeRun) machineStatus = "RUNNING";

      const inputs = activeRun
        ? ValvomaticInputsSchema.safeParse(activeRun.inputs).data
        : undefined;

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
              inputsSummary: inputs ? summarizeValvomaticInputs(inputs) : "—",
            }
          : null,
      };
    });

    return NextResponse.json({ machines: grid, activeRunCount: activeRuns.length });
  } catch (error) {
    console.error("Error fetching BCS machines:", error);
    return NextResponse.json({ error: "Failed to fetch BCS machines" }, { status: 500 });
  }
}
