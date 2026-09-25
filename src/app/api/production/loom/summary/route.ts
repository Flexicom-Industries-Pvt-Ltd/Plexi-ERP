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
  const dateFilter = searchParams.get("date"); // YYYY-MM-DD or "ALL"
  const shiftFilter = searchParams.get("shiftId"); // shift ID or "ALL"
  const colorGroupFilter = searchParams.get("colorGroup");
  const statusFilter = searchParams.get("status");
  const search = searchParams.get("search");

  try {
    // 1. Fetch all Loom Machine Mappings from Data Centre
    const mappings = await db.loomMachineMapping.findMany({
      where: { isActive: true },
      orderBy: [{ colorGroup: "asc" }, { qualityCode: "asc" }],
    });

    // 2. Fetch all active Shifts from Master Data
    const shifts = await db.shift.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // 3. Build query filters for Tape Plant Plans and Post Productions
    const planWhere: any = {};
    const postWhere: any = {};

    if (dateFilter && dateFilter !== "ALL") {
      planWhere.date = dateFilter;
      postWhere.date = dateFilter;
    }

    if (shiftFilter && shiftFilter !== "ALL") {
      planWhere.shiftId = shiftFilter;
      postWhere.shiftId = shiftFilter;
    }

    // Fetch Tape Plant Plans and Post Productions
    const plans = await db.tapePlantPlan.findMany({
      where: planWhere,
      include: { shift: true },
      orderBy: { date: "desc" },
      take: 200,
    });

    const postProductions = await db.tapePlantPostProduction.findMany({
      where: postWhere,
      include: { shift: true },
      orderBy: { date: "desc" },
      take: 200,
    });

    // Fetch available distinct dates for the date picker dropdown/presets
    const [recentPostDates, recentPlanDates] = await Promise.all([
      db.tapePlantPostProduction.findMany({
        select: { date: true },
        distinct: ["date"],
        orderBy: { date: "desc" },
        take: 30,
      }),
      db.tapePlantPlan.findMany({
        select: { date: true },
        distinct: ["date"],
        orderBy: { date: "desc" },
        take: 30,
      }),
    ]);

    const availableDatesSet = new Set<string>();
    recentPostDates.forEach((d) => d.date && availableDatesSet.add(d.date));
    recentPlanDates.forEach((d) => d.date && availableDatesSet.add(d.date));
    const availableDates = Array.from(availableDatesSet).sort((a, b) => b.localeCompare(a));

    // 4. Build live status for each quality formulation
    const enrichedQualities = mappings.map((m) => {
      const qCode = m.qualityCode.trim();

      // Find matching plans & post-production runs for this quality
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

      // Compute status & shift-level tracking
      let status: "RUNNING" | "PLANNED" | "STANDBY" = "STANDBY";
      let latestDate: string | null = null;
      let latestOperator: string | null = null;
      const activeShiftsSet = new Set<string>();

      let plannedOutputKg = 0;
      let actualOutputKg = 0;

      const shiftBreakdownMap = new Map<string, {
        shiftId: string;
        shiftName: string;
        date: string;
        operatorName: string | null;
        plannedKg: number;
        producedKg: number;
        wasteKg: number;
      }>();

      if (matchedPosts.length > 0) {
        status = "RUNNING";
        latestDate = matchedPosts[0].date;
        latestOperator = matchedPosts[0].operatorName || null;

        matchedPosts.forEach((p) => {
          const shiftName = p.shift?.name || "Shift A";
          const shiftId = p.shiftId || "shift-unknown";
          const date = p.date;

          let producedForQuality = 0;
          let wasteForQuality = 0;

          if (Array.isArray(p.entries)) {
            const entry = (p.entries as any[]).find(
              (e) => e.recipeQuality && e.recipeQuality.toLowerCase().includes(qCode.toLowerCase())
            );
            if (entry) {
              producedForQuality = Number(entry.productionDoneKg) || 0;
              wasteForQuality = Number(entry.wasteKg) || 0;
            }
          } else {
            producedForQuality = p.productionDoneKg || 0;
            wasteForQuality = p.wasteKg || 0;
          }

          actualOutputKg += producedForQuality;
          activeShiftsSet.add(shiftName);

          const key = `${date}_${shiftId}`;
          if (!shiftBreakdownMap.has(key)) {
            shiftBreakdownMap.set(key, {
              shiftId,
              shiftName,
              date,
              operatorName: p.operatorName || null,
              plannedKg: 0,
              producedKg: 0,
              wasteKg: 0,
            });
          }
          const item = shiftBreakdownMap.get(key)!;
          item.producedKg += producedForQuality;
          item.wasteKg += wasteForQuality;
          if (p.operatorName) item.operatorName = p.operatorName;
        });
      }

      if (matchedPlans.length > 0) {
        if (status === "STANDBY") {
          status = "PLANNED";
          latestDate = matchedPlans[0].date;
        }

        matchedPlans.forEach((p) => {
          const shiftName = p.isDayNight ? "Day + Night (24h)" : (p.shift?.name || "Shift A");
          const shiftId = p.shiftId || "shift-unknown";
          const date = p.date;
          const planKg = p.plannedQtyKg || 0;

          plannedOutputKg += planKg;
          activeShiftsSet.add(shiftName);

          const key = `${date}_${shiftId}`;
          if (!shiftBreakdownMap.has(key)) {
            shiftBreakdownMap.set(key, {
              shiftId,
              shiftName,
              date,
              operatorName: null,
              plannedKg: 0,
              producedKg: 0,
              wasteKg: 0,
            });
          }
          const item = shiftBreakdownMap.get(key)!;
          item.plannedKg += planKg;
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
        shiftBreakdown: Array.from(shiftBreakdownMap.values()),
        plannedOutputKg,
        actualOutputKg,
      };
    });

    // 5. Build Factory Floor 1-91 Loom Matrix
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
          activeShifts: matchedQuality.activeShifts,
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
        activeShifts: [],
      };
    });

    // 6. Aggregate KPI Scorecards
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

    // 7. Aggregate Shift Summary Cards
    const shiftSummaryList = shifts.map((s) => {
      const shiftPlans = plans.filter((p) => p.shiftId === s.id);
      const shiftPosts = postProductions.filter((p) => p.shiftId === s.id);

      const shiftQualitiesSet = new Set<string>();
      let producedKg = 0;
      let plannedKg = 0;
      const shiftOperatorsSet = new Set<string>();

      shiftPosts.forEach((p) => {
        if (p.operatorName) shiftOperatorsSet.add(p.operatorName);
        if (Array.isArray(p.entries)) {
          (p.entries as any[]).forEach((e) => {
            if (e.recipeQuality) shiftQualitiesSet.add(e.recipeQuality);
            producedKg += Number(e.productionDoneKg) || 0;
          });
        } else if (p.recipeQuality) {
          shiftQualitiesSet.add(p.recipeQuality);
          producedKg += p.productionDoneKg || 0;
        }
      });

      shiftPlans.forEach((p) => {
        if (p.recipeQuality) shiftQualitiesSet.add(p.recipeQuality);
        plannedKg += p.plannedQtyKg || 0;
      });

      // Calculate looms running on this shift
      const activeLoomsSet = new Set<number>();
      shiftQualitiesSet.forEach((qCode) => {
        const found = enrichedQualities.find((eq) =>
          eq.qualityCode.toLowerCase().includes(qCode.toLowerCase())
        );
        if (found) {
          found.loomNumbers.forEach((ln) => activeLoomsSet.add(ln));
        }
      });

      return {
        shiftId: s.id,
        shiftName: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        qualitiesCount: shiftQualitiesSet.size,
        activeLoomsCount: activeLoomsSet.size,
        producedKg,
        plannedKg,
        operators: Array.from(shiftOperatorsSet),
        qualityCodes: Array.from(shiftQualitiesSet),
      };
    });

    // 8. Color Group Breakdown
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

    // 9. Filter qualities by query parameters
    let filteredQualities = enrichedQualities;
    if (colorGroupFilter && colorGroupFilter !== "ALL") {
      filteredQualities = filteredQualities.filter(
        (q) => q.colorGroup.toLowerCase() === colorGroupFilter.toLowerCase()
      );
    }
    if (statusFilter && statusFilter !== "ALL") {
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
          item.activeShifts.some((s) => s.toLowerCase().includes(q)) ||
          item.loomNumbers.some((num) => String(num) === q || `loom ${num}` === q || `#${num}` === q)
      );
    }

    return NextResponse.json(
      {
        selectedDate: dateFilter || "ALL",
        selectedShiftId: shiftFilter || "ALL",
        availableDates,
        availableShifts: shifts.map((s) => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        shiftSummaryList,
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
