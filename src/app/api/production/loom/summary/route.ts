import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLoomApiPermission } from "@/lib/loom/permissions";
import {
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
} from "@/lib/tape-plant/bobbin-stock";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface LoomIssueAllocationEntry {
  issueId: string;
  slipNumber: string;
  date: string;
  shiftId: string;
  shiftName: string;
  recipeQuality: string;
  loomNumber: number | null;
  loomIdentifier: string;
  crateCount: number;
  bobbinCount: number;
  weightKg: number;
  issuedBy?: string | null;
  receivedBy?: string | null;
  remarks?: string | null;
}

export interface RecipeLoomSummaryItem {
  recipeQuality: string;
  totalLoomsCount: number;
  assignedLooms: number[];
  assignedLoomIdentifiers: string[];
  totalCratesIssued: number;
  totalBobbinsIssued: number;
  totalWeightIssuedKg: number;
  latestIssueDate: string;
  activeShifts: string[];
  issuesCount: number;
  issuers: string[];
  receivers: string[];
  recentIssues: {
    slipNumber: string;
    date: string;
    shiftName: string;
    crateCount: number;
    weightKg: number;
    loomIdentifier: string;
  }[];
}

export interface LoomMachineSummaryItem {
  loomNumber: number;
  loomIdentifier: string;
  isActive: boolean;
  activeRecipe: string | null;
  allRecipes: string[];
  totalCrates: number;
  totalBobbins: number;
  totalWeightKg: number;
  latestDate: string | null;
  latestShiftName: string | null;
  lastIssuedBy: string | null;
  lastReceivedBy: string | null;
  allocationsCount: number;
  recentIssues: {
    slipNumber: string;
    date: string;
    shiftName: string;
    recipeQuality: string;
    crateCount: number;
    weightKg: number;
  }[];
}

export async function GET(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const dateFilter = searchParams.get("date"); // YYYY-MM-DD or "ALL"
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const shiftFilter = searchParams.get("shiftId"); // shift ID or "ALL"
  const search = searchParams.get("search");
  const loomNumberFilter = searchParams.get("loomNumber");

  try {
    // 1. Build where clause for Tape Plant Bobbin Issues
    const issueWhere: any = {
      status: { not: "CANCELLED" },
    };

    if (dateFilter && dateFilter !== "ALL") {
      issueWhere.date = dateFilter;
    } else if (dateFrom && dateTo) {
      issueWhere.date = { gte: dateFrom, lte: dateTo };
    } else if (dateFrom) {
      issueWhere.date = { gte: dateFrom };
    } else if (dateTo) {
      issueWhere.date = { lte: dateTo };
    }

    if (shiftFilter && shiftFilter !== "ALL") {
      issueWhere.shiftId = shiftFilter;
    }

    // Fetch all active shifts for metadata
    const shifts = await db.shift.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    // Fetch distinct dates for filter presets
    const distinctDates = await db.tapePlantBobbinIssue.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { date: true },
      distinct: ["date"],
      orderBy: { date: "desc" },
      take: 45,
    });
    const availableDates = distinctDates.map((d) => d.date);

    // Fetch all relevant Bobbin Issue records
    const bobbinIssues = await db.tapePlantBobbinIssue.findMany({
      where: issueWhere,
      include: {
        shift: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    // 2. Flatten all multi-loom allocations and single-loom issues into a normalized transaction list
    const normalizedAllocations: LoomIssueAllocationEntry[] = [];

    for (const issue of bobbinIssues) {
      const shiftName = issue.shift?.name || issue.shiftName || "General Shift";
      const recipe = (issue.recipeQuality || "").trim();
      if (!recipe) continue;

      const multiAllocations = Array.isArray(issue.loomAllocations) ? (issue.loomAllocations as any[]) : [];

      if (multiAllocations.length > 0) {
        for (const alloc of multiAllocations) {
          const lNum = alloc.loomNumber ? Number(alloc.loomNumber) : null;
          const lIdent = alloc.loomIdentifier || (lNum ? `Loom #${lNum}` : "Loom Shed");
          const cCount = Number(alloc.crateCount) || 0;
          if (cCount <= 0) continue;

          const bCount = alloc.bobbinCount ? Number(alloc.bobbinCount) : Number((cCount * BOBBINS_PER_CRATE).toFixed(2));
          const wKg = alloc.weightKg ? Number(alloc.weightKg) : Number((cCount * CRATE_WEIGHT_KG).toFixed(2));

          normalizedAllocations.push({
            issueId: issue.id,
            slipNumber: issue.slipNumber,
            date: issue.date,
            shiftId: issue.shiftId || "shift_day",
            shiftName,
            recipeQuality: recipe,
            loomNumber: lNum,
            loomIdentifier: lIdent,
            crateCount: cCount,
            bobbinCount: bCount,
            weightKg: wKg,
            issuedBy: issue.issuedBy,
            receivedBy: issue.receivedBy,
            remarks: alloc.remarks || issue.remarks,
          });
        }
      } else {
        const lNum = issue.loomNumber ? Number(issue.loomNumber) : null;
        const lIdent = issue.loomIdentifier || (lNum ? `Loom #${lNum}` : "Loom Shed");
        const cCount = Number(issue.crateCount) || 0;
        const bCount = Number(issue.bobbinCount) || Number((cCount * BOBBINS_PER_CRATE).toFixed(2));
        const wKg = Number(issue.weightKg) || Number((cCount * CRATE_WEIGHT_KG).toFixed(2));

        normalizedAllocations.push({
          issueId: issue.id,
          slipNumber: issue.slipNumber,
          date: issue.date,
          shiftId: issue.shiftId || "shift_day",
          shiftName,
          recipeQuality: recipe,
          loomNumber: lNum,
          loomIdentifier: lIdent,
          crateCount: cCount,
          bobbinCount: bCount,
          weightKg: wKg,
          issuedBy: issue.issuedBy,
          receivedBy: issue.receivedBy,
          remarks: issue.remarks,
        });
      }
    }

    // 3. Build Recipe-Wise Summary Map
    const recipeMap = new Map<string, {
      recipeQuality: string;
      assignedLoomsSet: Set<number>;
      assignedLoomIdentsSet: Set<string>;
      totalCrates: number;
      totalBobbins: number;
      totalWeightKg: number;
      latestDate: string;
      activeShiftsSet: Set<string>;
      issuesCount: number;
      issuersSet: Set<string>;
      receiversSet: Set<string>;
      recentIssues: any[];
    }>();

    for (const alloc of normalizedAllocations) {
      const q = alloc.recipeQuality;
      let entry = recipeMap.get(q);
      if (!entry) {
        entry = {
          recipeQuality: q,
          assignedLoomsSet: new Set<number>(),
          assignedLoomIdentsSet: new Set<string>(),
          totalCrates: 0,
          totalBobbins: 0,
          totalWeightKg: 0,
          latestDate: alloc.date,
          activeShiftsSet: new Set<string>(),
          issuesCount: 0,
          issuersSet: new Set<string>(),
          receiversSet: new Set<string>(),
          recentIssues: [],
        };
        recipeMap.set(q, entry);
      }

      if (alloc.loomNumber) entry.assignedLoomsSet.add(alloc.loomNumber);
      if (alloc.loomIdentifier) entry.assignedLoomIdentsSet.add(alloc.loomIdentifier);
      entry.totalCrates += alloc.crateCount;
      entry.totalBobbins += alloc.bobbinCount;
      entry.totalWeightKg += alloc.weightKg;
      entry.activeShiftsSet.add(alloc.shiftName);
      entry.issuesCount += 1;
      if (alloc.issuedBy) entry.issuersSet.add(alloc.issuedBy);
      if (alloc.receivedBy) entry.receiversSet.add(alloc.receivedBy);

      if (entry.recentIssues.length < 5) {
        entry.recentIssues.push({
          slipNumber: alloc.slipNumber,
          date: alloc.date,
          shiftName: alloc.shiftName,
          crateCount: alloc.crateCount,
          weightKg: alloc.weightKg,
          loomIdentifier: alloc.loomIdentifier,
        });
      }
    }

    const recipeSummaries: RecipeLoomSummaryItem[] = Array.from(recipeMap.values()).map((r) => ({
      recipeQuality: r.recipeQuality,
      totalLoomsCount: r.assignedLoomsSet.size || r.assignedLoomIdentsSet.size,
      assignedLooms: Array.from(r.assignedLoomsSet).sort((a, b) => a - b),
      assignedLoomIdentifiers: Array.from(r.assignedLoomIdentsSet),
      totalCratesIssued: Number(r.totalCrates.toFixed(2)),
      totalBobbinsIssued: Number(r.totalBobbins.toFixed(2)),
      totalWeightIssuedKg: Number(r.totalWeightKg.toFixed(2)),
      latestIssueDate: r.latestDate,
      activeShifts: Array.from(r.activeShiftsSet),
      issuesCount: r.issuesCount,
      issuers: Array.from(r.issuersSet),
      receivers: Array.from(r.receiversSet),
      recentIssues: r.recentIssues,
    }));

    // Sort recipes by total crates descending
    recipeSummaries.sort((a, b) => b.totalCratesIssued - a.totalCratesIssued);

    // 4. Build Loom-Wise Summary (Looms 1 to 91)
    const loomSummaries: LoomMachineSummaryItem[] = [];
    const TOTAL_LOOMS = 91;

    for (let loomNo = 1; loomNo <= TOTAL_LOOMS; loomNo++) {
      const loomAllocs = normalizedAllocations.filter((a) => a.loomNumber === loomNo);
      const isActive = loomAllocs.length > 0;

      const allRecipes = Array.from(new Set(loomAllocs.map((a) => a.recipeQuality)));
      const activeRecipe = allRecipes.length > 0 ? allRecipes[0] : null;

      const totalCrates = loomAllocs.reduce((sum, a) => sum + a.crateCount, 0);
      const totalBobbins = loomAllocs.reduce((sum, a) => sum + a.bobbinCount, 0);
      const totalWeightKg = loomAllocs.reduce((sum, a) => sum + a.weightKg, 0);

      const latestAlloc = loomAllocs[0] || null;

      loomSummaries.push({
        loomNumber: loomNo,
        loomIdentifier: `Loom #${loomNo}`,
        isActive,
        activeRecipe,
        allRecipes,
        totalCrates: Number(totalCrates.toFixed(2)),
        totalBobbins: Number(totalBobbins.toFixed(2)),
        totalWeightKg: Number(totalWeightKg.toFixed(2)),
        latestDate: latestAlloc ? latestAlloc.date : null,
        latestShiftName: latestAlloc ? latestAlloc.shiftName : null,
        lastIssuedBy: latestAlloc?.issuedBy || null,
        lastReceivedBy: latestAlloc?.receivedBy || null,
        allocationsCount: loomAllocs.length,
        recentIssues: loomAllocs.slice(0, 3).map((a) => ({
          slipNumber: a.slipNumber,
          date: a.date,
          shiftName: a.shiftName,
          recipeQuality: a.recipeQuality,
          crateCount: a.crateCount,
          weightKg: a.weightKg,
        })),
      });
    }

    // 5. Compute Grand KPIs
    const activeLoomsCount = loomSummaries.filter((l) => l.isActive).length;
    const idleLoomsCount = TOTAL_LOOMS - activeLoomsCount;
    const totalCratesDispatched = normalizedAllocations.reduce((sum, a) => sum + a.crateCount, 0);
    const totalBobbinsDispatched = normalizedAllocations.reduce((sum, a) => sum + a.bobbinCount, 0);
    const totalWeightDispatchedKg = normalizedAllocations.reduce((sum, a) => sum + a.weightKg, 0);

    // Filter results if search query provided
    let filteredRecipes = recipeSummaries;
    let filteredLooms = loomSummaries;

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredRecipes = recipeSummaries.filter(
        (r) =>
          r.recipeQuality.toLowerCase().includes(q) ||
          r.assignedLooms.some((n) => String(n).includes(q)) ||
          r.assignedLoomIdentifiers.some((ident) => ident.toLowerCase().includes(q))
      );

      filteredLooms = loomSummaries.filter(
        (l) =>
          String(l.loomNumber).includes(q) ||
          l.loomIdentifier.toLowerCase().includes(q) ||
          (l.activeRecipe && l.activeRecipe.toLowerCase().includes(q)) ||
          l.allRecipes.some((rec) => rec.toLowerCase().includes(q))
      );
    }

    if (loomNumberFilter && !isNaN(Number(loomNumberFilter))) {
      const targetNo = Number(loomNumberFilter);
      filteredLooms = loomSummaries.filter((l) => l.loomNumber === targetNo);
      filteredRecipes = recipeSummaries.filter((r) => r.assignedLooms.includes(targetNo));
    }

    // 6. Construct backward-compatible qualities array for existing print/export helpers
    const backwardQualities = filteredRecipes.map((r, idx) => ({
      id: `recipe-${idx}`,
      qualityCode: r.recipeQuality,
      colorGroup: "Standard",
      colour: "White",
      denier: null,
      tapeWidth: null,
      bobbinMarking: "Bobbin Issue",
      reedSpaceCm: null,
      mesh: "Standard",
      targetPpm: null,
      remarks: null,
      loomNumbers: r.assignedLooms,
      totalLooms: r.totalLoomsCount,
      status: (r.totalLoomsCount > 0 ? "RUNNING" : "STANDBY") as "RUNNING" | "STANDBY",
      lastRunDate: r.latestIssueDate,
      latestOperator: r.issuers[0] || null,
      activeShifts: r.activeShifts,
      actualOutputKg: r.totalWeightIssuedKg,
    }));

    // Construct 91 matrix nodes
    const loomMatrixNodes = loomSummaries.map((l) => ({
      loomNumber: l.loomNumber,
      isAllocated: l.isActive,
      qualityId: l.activeRecipe ? `quality-${l.loomNumber}` : null,
      qualityCode: l.activeRecipe,
      colorGroup: l.isActive ? "Active" : "Idle",
      colour: l.isActive ? "Assigned" : "Unassigned",
      denier: null,
      tapeWidth: null,
      reedSpaceCm: null,
      bobbinMarking: l.isActive ? `${l.totalCrates} Crates` : "Idle",
      status: (l.isActive ? "RUNNING" : "UNALLOCATED") as "RUNNING" | "UNALLOCATED",
      latestOperator: l.lastIssuedBy,
      activeShifts: l.latestShiftName ? [l.latestShiftName] : [],
    }));

    return NextResponse.json({
      selectedDate: dateFilter || "ALL",
      selectedShiftId: shiftFilter || "ALL",
      availableDates,
      availableShifts: shifts.map((s) => ({
        id: s.id,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      recipeSummaries: filteredRecipes,
      loomSummaries: filteredLooms,
      qualities: backwardQualities,
      loomMatrix: loomMatrixNodes,
      kpis: {
        totalLooms: TOTAL_LOOMS,
        activeLoomsCount,
        idleLoomsCount,
        uniqueRecipesCount: recipeSummaries.length,
        totalCratesDispatched: Number(totalCratesDispatched.toFixed(2)),
        totalBobbinsDispatched: Number(totalBobbinsDispatched.toFixed(2)),
        totalWeightDispatchedKg: Number(totalWeightDispatchedKg.toFixed(2)),
        totalIssueSlipsCount: bobbinIssues.length,
        totalFactoryLooms: TOTAL_LOOMS,
        totalAllocatedLooms: activeLoomsCount,
        totalRunningLooms: activeLoomsCount,
        totalPlannedLooms: 0,
        totalStandbyLooms: idleLoomsCount,
        totalUnallocatedLooms: idleLoomsCount,
        runningQualitiesCount: recipeSummaries.length,
        plannedQualitiesCount: 0,
        totalQualitiesCount: recipeSummaries.length,
        totalTapePlannedKg: 0,
        totalTapeProducedKg: Number(totalWeightDispatchedKg.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error("Error fetching loom summary:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch loom summary" },
      { status: 500 }
    );
  }
}
