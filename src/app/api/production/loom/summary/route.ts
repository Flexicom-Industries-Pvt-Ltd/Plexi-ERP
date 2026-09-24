import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLoomApiPermission } from "@/lib/loom/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const colorGroupFilter = searchParams.get("colorGroup");
  const statusFilter = searchParams.get("status");
  const search = searchParams.get("search");

  try {
    // 1. Fetch all Loom Machine Mappings from Data Centre
    const mappings = await db.loomMachineMapping.findMany({
      where: { isActive: true },
      orderBy: [{ colorGroup: "asc" }, { qualityCode: "asc" }],
    });

    // 2. Fetch recent Tape Plant Plans and Post Productions
    const plans = await db.tapePlantPlan.findMany({
      include: { shift: true },
      orderBy: { date: "desc" },
      take: 100,
    });

    const postProductions = await db.tapePlantPostProduction.findMany({
      include: { shift: true },
      orderBy: { date: "desc" },
      take: 100,
    });

    // 3. Build live status for each quality
    const enrichedQualities = mappings.map((m) => {
      const qCode = m.qualityCode.trim();

      // Find matching plans & post-production runs
      const matchedPlans = plans.filter((p) =>
        p.recipeQuality && p.recipeQuality.toLowerCase().includes(qCode.toLowerCase())
      );
      const matchedPosts = postProductions.filter((p) => {
        if (p.recipeQuality && p.recipeQuality.toLowerCase().includes(qCode.toLowerCase())) return true;
        if (Array.isArray(p.entries)) {
          return (p.entries as any[]).some(
            (e) => e.recipeQuality && e.recipeQuality.toLowerCase().includes(qCode.toLowerCase())
          );
        }
        return false;
      });

      // Compute status
      let status: "RUNNING" | "PLANNED" | "STANDBY" = "STANDBY";
      let latestDate: string | null = null;
      let latestOperator: string | null = null;
      const activeShiftsSet = new Set<string>();

      let plannedOutputKg = 0;
      let actualOutputKg = 0;

      if (matchedPosts.length > 0) {
        status = "RUNNING";
        latestDate = matchedPosts[0].date;
        latestOperator = matchedPosts[0].operatorName || null;
        matchedPosts.forEach((p) => {
          actualOutputKg += p.productionDoneKg || 0;
          if (p.shift?.name) activeShiftsSet.add(p.shift.name);
        });
      } else if (matchedPlans.length > 0) {
        status = "PLANNED";
        latestDate = matchedPlans[0].date;
        matchedPlans.forEach((p) => {
          plannedOutputKg += p.plannedQtyKg || 0;
          if (p.shift?.name) activeShiftsSet.add(p.shift.name);
        });
      }

      const assignedLooms = (m.loomNumbers || []).sort((a, b) => a - b);

      return {
        id: m.id,
        qualityCode: m.qualityCode,
        colorGroup: m.colorGroup || "Unassigned",
        colour: m.colour || "—",
        denier: m.denier || null,
        tapeWidth: m.tapeWidth || null,
        bobbinMarking: m.bobbinMarking || "—",
        reedSpaceCm: m.reedSpaceCm || null,
        mesh: m.mesh || "—",
        targetPpm: m.targetPpm || null,
        remarks: m.remarks || null,
        loomNumbers: assignedLooms,
        totalLooms: assignedLooms.length,
        status,
        lastRunDate: latestDate,
        latestOperator,
        activeShifts: Array.from(activeShiftsSet),
        plannedOutputKg,
        actualOutputKg,
      };
    });

    // 4. Build Factory Floor 1-91 Loom Matrix
    const TOTAL_FACTORY_LOOMS = 91;
    const loomMatrix = Array.from({ length: TOTAL_FACTORY_LOOMS }, (_, i) => {
      const loomNo = i + 1;
      const matchedQuality = enrichedQualities.find((q) =>
        q.loomNumbers.includes(loomNo)
      );

      if (matchedQuality) {
        return {
          loomNumber: loomNo,
          isAllocated: true,
          qualityId: matchedQuality.id,
          qualityCode: matchedQuality.qualityCode,
          colorGroup: matchedQuality.colorGroup,
          colour: matchedQuality.colour,
          denier: matchedQuality.denier,
          tapeWidth: matchedQuality.tapeWidth,
          reedSpaceCm: matchedQuality.reedSpaceCm,
          bobbinMarking: matchedQuality.bobbinMarking,
          status: matchedQuality.status,
          latestOperator: matchedQuality.latestOperator,
        };
      }

      return {
        loomNumber: loomNo,
        isAllocated: false,
        qualityId: null,
        qualityCode: null,
        colorGroup: "Unallocated",
        colour: "—",
        denier: null,
        tapeWidth: null,
        reedSpaceCm: null,
        bobbinMarking: "—",
        status: "UNALLOCATED" as const,
        latestOperator: null,
      };
    });

    // 5. Aggregate KPI Scorecards
    const allocatedLoomsSet = new Set<number>();
    const runningLoomsSet = new Set<number>();
    const plannedLoomsSet = new Set<number>();
    const standbyLoomsSet = new Set<number>();

    enrichedQualities.forEach((q) => {
      q.loomNumbers.forEach((loomNo) => {
        allocatedLoomsSet.add(loomNo);
        if (q.status === "RUNNING") runningLoomsSet.add(loomNo);
        else if (q.status === "PLANNED") plannedLoomsSet.add(loomNo);
        else standbyLoomsSet.add(loomNo);
      });
    });

    const totalAllocatedLooms = allocatedLoomsSet.size;
    const totalRunningLooms = runningLoomsSet.size;
    const totalPlannedLooms = plannedLoomsSet.size;
    const totalStandbyLooms = standbyLoomsSet.size;
    const totalUnallocatedLooms = Math.max(0, TOTAL_FACTORY_LOOMS - totalAllocatedLooms);

    const runningQualitiesCount = enrichedQualities.filter((q) => q.status === "RUNNING").length;
    const plannedQualitiesCount = enrichedQualities.filter((q) => q.status === "PLANNED").length;

    const totalTapePlannedKg = enrichedQualities.reduce((s, q) => s + q.plannedOutputKg, 0);
    const totalTapeProducedKg = enrichedQualities.reduce((s, q) => s + q.actualOutputKg, 0);

    // Color Group Breakdown
    const colorGroupMap = new Map<string, { totalLooms: number; qualityCount: number; activeLooms: number }>();
    enrichedQualities.forEach((q) => {
      const cg = q.colorGroup;
      if (!colorGroupMap.has(cg)) {
        colorGroupMap.set(cg, { totalLooms: 0, qualityCount: 0, activeLooms: 0 });
      }
      const item = colorGroupMap.get(cg)!;
      item.qualityCount += 1;
      item.totalLooms += q.totalLooms;
      if (q.status === "RUNNING") {
        item.activeLooms += q.totalLooms;
      }
    });

    const colorGroupsSummary = Array.from(colorGroupMap.entries()).map(([colorGroup, stats]) => ({
      colorGroup,
      ...stats,
    }));

    // Filter qualities if query parameters passed
    let filteredQualities = enrichedQualities;
    if (colorGroupFilter) {
      filteredQualities = filteredQualities.filter(
        (q) => q.colorGroup.toLowerCase() === colorGroupFilter.toLowerCase()
      );
    }
    if (statusFilter) {
      filteredQualities = filteredQualities.filter(
        (q) => q.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    if (search) {
      const q = search.toLowerCase().trim();
      filteredQualities = filteredQualities.filter(
        (item) =>
          item.qualityCode.toLowerCase().includes(q) ||
          item.colour.toLowerCase().includes(q) ||
          item.bobbinMarking.toLowerCase().includes(q) ||
          item.colorGroup.toLowerCase().includes(q) ||
          item.loomNumbers.some((num) => String(num) === q || `loom ${num}` === q || `#${num}` === q)
      );
    }

    return NextResponse.json(
      {
        qualities: filteredQualities,
        allQualities: enrichedQualities,
        loomMatrix,
        kpis: {
          totalFactoryLooms: TOTAL_FACTORY_LOOMS,
          totalAllocatedLooms,
          totalRunningLooms,
          totalPlannedLooms,
          totalStandbyLooms,
          totalUnallocatedLooms,
          runningQualitiesCount,
          plannedQualitiesCount,
          totalQualitiesCount: enrichedQualities.length,
          totalTapePlannedKg,
          totalTapeProducedKg,
        },
        colorGroupsSummary,
        count: filteredQualities.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error generating Loom Summary:", error);
    return NextResponse.json({ error: "Failed to generate Loom Summary" }, { status: 500 });
  }
}
