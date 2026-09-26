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
    const TOTAL_LOOMS = 91;

    // 1. Fetch live Tape Plant Recipes, Shifts, and Manual Loom Machine Mappings
    const [tapeRecipes, shifts, mappings, bobbinIssuesRaw] = await Promise.all([
      db.tapePlantRecipe.findMany({
        where: { isActive: true },
        orderBy: [{ colorGroup: "asc" }, { code: "asc" }],
      }),
      db.shift.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      }),
      db.loomMachineMapping.findMany({
        where: { isActive: true },
        orderBy: [{ totalLooms: "desc" }, { colorGroup: "asc" }, { qualityCode: "asc" }],
      }),
      db.tapePlantBobbinIssue.findMany({
        where: { status: { not: "CANCELLED" } },
        include: {
          shift: { select: { id: true, name: true } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    // Build map of recipes for spec lookup
    const recipeSpecMap = new Map<string, typeof tapeRecipes[0]>();
    tapeRecipes.forEach((r) => {
      recipeSpecMap.set(r.code.toLowerCase().trim(), r);
    });

    // Filter bobbin issues if date/shift filter specified
    let filteredBobbinIssues = bobbinIssuesRaw;
    if (dateFilter && dateFilter !== "ALL") {
      filteredBobbinIssues = filteredBobbinIssues.filter((i) => i.date === dateFilter);
    } else if (dateFrom && dateTo) {
      filteredBobbinIssues = filteredBobbinIssues.filter((i) => i.date >= dateFrom && i.date <= dateTo);
    } else if (dateFrom) {
      filteredBobbinIssues = filteredBobbinIssues.filter((i) => i.date >= dateFrom);
    } else if (dateTo) {
      filteredBobbinIssues = filteredBobbinIssues.filter((i) => i.date <= dateTo);
    }

    if (shiftFilter && shiftFilter !== "ALL") {
      filteredBobbinIssues = filteredBobbinIssues.filter((i) => i.shiftId === shiftFilter);
    }

    // Available dates list
    const availableDates = Array.from(new Set(bobbinIssuesRaw.map((i) => i.date))).sort().reverse().slice(0, 45);

    // 2. Flatten all multi-loom allocations and single-loom issues into normalized transactions
    const normalizedAllocations: LoomIssueAllocationEntry[] = [];

    for (const issue of filteredBobbinIssues) {
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

    // 3. Build Recipe-Wise Summary Map using Authoritative LoomMachineMapping + Bobbin Issues
    const recipeMap = new Map<string, {
      recipeQuality: string;
      colorGroup: string;
      colour: string;
      denier: number | null;
      tapeWidth: number | null;
      bobbinMarking: string;
      reedSpaceCm: number | null;
      mesh: string;
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

    // First populate from LoomMachineMapping (manual assignments)
    for (const mapping of mappings) {
      const q = mapping.qualityCode;
      const matchedSpec = recipeSpecMap.get(q.toLowerCase());
      const looms = (mapping.loomNumbers || []).filter((n) => typeof n === "number" && n >= 1 && n <= TOTAL_LOOMS);

      recipeMap.set(q, {
        recipeQuality: q,
        colorGroup: mapping.colorGroup || matchedSpec?.colorGroup || "Standard",
        colour: mapping.colour || matchedSpec?.colour || "White",
        denier: mapping.denier ?? matchedSpec?.denier ?? null,
        tapeWidth: mapping.tapeWidth ?? matchedSpec?.tapeWidth ?? null,
        bobbinMarking: mapping.bobbinMarking || matchedSpec?.bobbinMarking || "Bobbin Issue",
        reedSpaceCm: mapping.reedSpaceCm ?? null,
        mesh: mapping.mesh || "Standard",
        assignedLoomsSet: new Set<number>(looms),
        assignedLoomIdentsSet: new Set<string>(looms.map((n) => `Loom #${n}`)),
        totalCrates: 0,
        totalBobbins: 0,
        totalWeightKg: 0,
        latestDate: "",
        activeShiftsSet: new Set<string>(),
        issuesCount: 0,
        issuersSet: new Set<string>(),
        receiversSet: new Set<string>(),
        recentIssues: [],
      });
    }

    // Next aggregate bobbin issue allocations into the recipeMap
    for (const alloc of normalizedAllocations) {
      const q = alloc.recipeQuality;
      let entry = recipeMap.get(q);
      if (!entry) {
        const matchedSpec = recipeSpecMap.get(q.toLowerCase());
        entry = {
          recipeQuality: q,
          colorGroup: matchedSpec?.colorGroup || "Standard",
          colour: matchedSpec?.colour || "White",
          denier: matchedSpec?.denier ?? null,
          tapeWidth: matchedSpec?.tapeWidth ?? null,
          bobbinMarking: matchedSpec?.bobbinMarking || "Bobbin Issue",
          reedSpaceCm: null,
          mesh: "Standard",
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

      if (alloc.loomNumber && alloc.loomNumber >= 1 && alloc.loomNumber <= TOTAL_LOOMS) {
        entry.assignedLoomsSet.add(alloc.loomNumber);
      }
      if (alloc.loomIdentifier) entry.assignedLoomIdentsSet.add(alloc.loomIdentifier);
      entry.totalCrates += alloc.crateCount;
      entry.totalBobbins += alloc.bobbinCount;
      entry.totalWeightKg += alloc.weightKg;
      entry.activeShiftsSet.add(alloc.shiftName);
      entry.issuesCount += 1;
      if (alloc.date && (!entry.latestDate || alloc.date > entry.latestDate)) {
        entry.latestDate = alloc.date;
      }
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

    const allRecipeSummaries: RecipeLoomSummaryItem[] = Array.from(recipeMap.values())
      .filter((r) => r.assignedLoomsSet.size > 0 || r.totalCrates > 0)
      .map((r) => ({
        recipeQuality: r.recipeQuality,
        totalLoomsCount: r.assignedLoomsSet.size,
        assignedLooms: Array.from(r.assignedLoomsSet).sort((a, b) => a - b),
        assignedLoomIdentifiers: Array.from(r.assignedLoomsSet).sort((a, b) => a - b).map((n) => `Loom #${n}`),
        totalCratesIssued: Number(r.totalCrates.toFixed(2)),
        totalBobbinsIssued: Number(r.totalBobbins.toFixed(2)),
        totalWeightIssuedKg: Number(r.totalWeightKg.toFixed(2)),
        latestIssueDate: r.latestDate || (r.assignedLoomsSet.size > 0 ? "Assigned" : "—"),
        activeShifts: Array.from(r.activeShiftsSet),
        issuesCount: r.issuesCount,
        issuers: Array.from(r.issuersSet),
        receivers: Array.from(r.receiversSet),
        recentIssues: r.recentIssues,
      }));

    // Sort recipes by assigned looms count descending, then total crates
    allRecipeSummaries.sort((a, b) => b.totalLoomsCount - a.totalLoomsCount || b.totalCratesIssued - a.totalCratesIssued);

    // 4. Build Loom-Wise Summary (Looms 1 to 91) based on Authoritative Manual Mappings
    const loomSummaries: LoomMachineSummaryItem[] = [];

    // Map each loom 1..91 to its assigned mapping
    const loomToMappingMap = new Map<number, typeof mappings[0]>();
    for (const m of mappings) {
      for (const num of m.loomNumbers || []) {
        if (num >= 1 && num <= TOTAL_LOOMS && !loomToMappingMap.has(num)) {
          loomToMappingMap.set(num, m);
        }
      }
    }

    for (let loomNo = 1; loomNo <= TOTAL_LOOMS; loomNo++) {
      const assignedMapping = loomToMappingMap.get(loomNo);
      const loomAllocs = normalizedAllocations.filter((a) => a.loomNumber === loomNo);

      const isActive = Boolean(assignedMapping || loomAllocs.length > 0);
      const activeRecipe = assignedMapping ? assignedMapping.qualityCode : loomAllocs[0]?.recipeQuality || null;
      const allRecipes = Array.from(
        new Set([
          ...(activeRecipe ? [activeRecipe] : []),
          ...loomAllocs.map((a) => a.recipeQuality),
        ])
      );

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
        latestDate: latestAlloc ? latestAlloc.date : (assignedMapping ? "Assigned" : null),
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

    // Filter results if search query or loom filter provided
    let filteredRecipes = allRecipeSummaries;
    let filteredLooms = loomSummaries;

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredRecipes = allRecipeSummaries.filter(
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
      filteredRecipes = allRecipeSummaries.filter((r) => r.assignedLooms.includes(targetNo));
    }

    // Construct backward-compatible qualities array for existing print/export helpers
    const backwardQualities = filteredRecipes.map((r, idx) => {
      const m = mappings.find((mapping) => mapping.qualityCode.toLowerCase() === r.recipeQuality.toLowerCase());
      const spec = recipeSpecMap.get(r.recipeQuality.toLowerCase());
      return {
        id: m?.id || `recipe-${idx}`,
        qualityCode: r.recipeQuality,
        colorGroup: m?.colorGroup || spec?.colorGroup || "Standard",
        colour: m?.colour || spec?.colour || "White",
        denier: m?.denier ?? spec?.denier ?? null,
        tapeWidth: m?.tapeWidth ?? spec?.tapeWidth ?? null,
        bobbinMarking: m?.bobbinMarking || spec?.bobbinMarking || "Bobbin Issue",
        reedSpaceCm: m?.reedSpaceCm ?? null,
        mesh: m?.mesh || "Standard",
        targetPpm: m?.targetPpm ?? null,
        remarks: m?.remarks || null,
        loomNumbers: r.assignedLooms,
        totalLooms: r.totalLoomsCount,
        status: (r.totalLoomsCount > 0 ? "RUNNING" : "STANDBY") as "RUNNING" | "STANDBY",
        lastRunDate: r.latestIssueDate,
        latestOperator: r.issuers[0] || null,
        activeShifts: r.activeShifts,
        actualOutputKg: r.totalWeightIssuedKg,
      };
    });

    // Construct 91 matrix nodes
    const loomMatrixNodes = loomSummaries.map((l) => {
      const m = loomToMappingMap.get(l.loomNumber);
      return {
        loomNumber: l.loomNumber,
        isAllocated: l.isActive,
        qualityId: m?.id || (l.activeRecipe ? `quality-${l.loomNumber}` : null),
        qualityCode: l.activeRecipe,
        colorGroup: m?.colorGroup || (l.isActive ? "Active" : "Idle"),
        colour: m?.colour || (l.isActive ? "Assigned" : "Unassigned"),
        denier: m?.denier ?? null,
        tapeWidth: m?.tapeWidth ?? null,
        reedSpaceCm: m?.reedSpaceCm ?? null,
        bobbinMarking: m?.bobbinMarking || (l.isActive ? `${l.totalCrates} Crates` : "Idle"),
        status: (l.isActive ? "RUNNING" : "UNALLOCATED") as "RUNNING" | "UNALLOCATED",
        latestOperator: l.lastIssuedBy,
        activeShifts: l.latestShiftName ? [l.latestShiftName] : [],
      };
    });

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
      availableRecipes: tapeRecipes.map((r) => ({
        id: r.id,
        code: r.code,
        tapeType: r.tapeType,
        colorGroup: r.colorGroup,
        colour: r.colour,
        denier: r.denier,
        tapeWidth: r.tapeWidth,
        bobbinMarking: r.bobbinMarking,
      })),
      recipeSummaries: filteredRecipes,
      loomSummaries: filteredLooms,
      qualities: backwardQualities,
      loomMatrix: loomMatrixNodes,
      kpis: {
        totalLooms: TOTAL_LOOMS,
        activeLoomsCount,
        idleLoomsCount,
        uniqueRecipesCount: filteredRecipes.length,
        totalCratesDispatched: Number(totalCratesDispatched.toFixed(2)),
        totalBobbinsDispatched: Number(totalBobbinsDispatched.toFixed(2)),
        totalWeightDispatchedKg: Number(totalWeightDispatchedKg.toFixed(2)),
        totalIssueSlipsCount: filteredBobbinIssues.length,
        totalFactoryLooms: TOTAL_LOOMS,
        totalAllocatedLooms: activeLoomsCount,
        totalRunningLooms: activeLoomsCount,
        totalPlannedLooms: 0,
        totalStandbyLooms: idleLoomsCount,
        totalUnallocatedLooms: idleLoomsCount,
        runningQualitiesCount: filteredRecipes.length,
        plannedQualitiesCount: 0,
        totalQualitiesCount: filteredRecipes.length,
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

export async function POST(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canUpdate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { action, loomNumber, qualityCode, loomNumbers } = body;
    const TOTAL_LOOMS = 91;

    // Action 1: Assign a single loom to a quality (or unassign if qualityCode is empty)
    if (action === "ASSIGN_LOOM") {
      const lNum = Number(loomNumber);
      if (isNaN(lNum) || lNum < 1 || lNum > TOTAL_LOOMS) {
        return NextResponse.json({ error: `Invalid loom number: ${loomNumber}. Must be between 1 and ${TOTAL_LOOMS}.` }, { status: 400 });
      }

      if (!qualityCode || typeof qualityCode !== "string" || !qualityCode.trim()) {
        // Unassign loom
        const existingMappings = await db.loomMachineMapping.findMany({
          where: { loomNumbers: { has: lNum } },
        });

        for (const m of existingMappings) {
          const updatedLooms = m.loomNumbers.filter((n) => n !== lNum);
          await db.loomMachineMapping.update({
            where: { id: m.id },
            data: { loomNumbers: updatedLooms, totalLooms: updatedLooms.length },
          });
        }

        return NextResponse.json({
          success: true,
          message: `Loom #${lNum} has been unassigned and set to Idle.`,
        });
      }

      const cleanCode = qualityCode.trim();

      // Find or create mapping for this quality
      let targetMapping = await db.loomMachineMapping.findUnique({
        where: { qualityCode: cleanCode },
      });

      if (!targetMapping) {
        const recipe = await db.tapePlantRecipe.findFirst({
          where: { code: { equals: cleanCode, mode: "insensitive" } },
        });

        targetMapping = await db.loomMachineMapping.create({
          data: {
            qualityCode: cleanCode,
            tapePlantRecipeId: recipe?.id || null,
            colorGroup: recipe?.colorGroup || "Standard",
            colour: recipe?.colour || "White",
            denier: recipe?.denier ?? null,
            tapeWidth: recipe?.tapeWidth ?? null,
            bobbinMarking: recipe?.bobbinMarking || "Bobbin Issue",
            loomNumbers: [lNum],
            totalLooms: 1,
            isActive: true,
          },
        });
      }

      // Remove lNum from all other mappings
      const otherMappings = await db.loomMachineMapping.findMany({
        where: {
          loomNumbers: { has: lNum },
          qualityCode: { not: cleanCode },
        },
      });

      for (const m of otherMappings) {
        const updated = m.loomNumbers.filter((n) => n !== lNum);
        await db.loomMachineMapping.update({
          where: { id: m.id },
          data: { loomNumbers: updated, totalLooms: updated.length },
        });
      }

      // Add lNum to targetMapping
      const targetLooms = Array.from(new Set([...(targetMapping.loomNumbers || []), lNum])).sort((a, b) => a - b);
      await db.loomMachineMapping.update({
        where: { id: targetMapping.id },
        data: {
          loomNumbers: targetLooms,
          totalLooms: targetLooms.length,
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Loom #${lNum} successfully assigned to quality "${cleanCode}".`,
      });
    }

    // Action 2: Unassign single loom
    if (action === "UNASSIGN_LOOM") {
      const lNum = Number(loomNumber);
      if (isNaN(lNum) || lNum < 1 || lNum > TOTAL_LOOMS) {
        return NextResponse.json({ error: `Invalid loom number: ${loomNumber}.` }, { status: 400 });
      }

      const existingMappings = await db.loomMachineMapping.findMany({
        where: { loomNumbers: { has: lNum } },
      });

      for (const m of existingMappings) {
        const updatedLooms = m.loomNumbers.filter((n) => n !== lNum);
        await db.loomMachineMapping.update({
          where: { id: m.id },
          data: { loomNumbers: updatedLooms, totalLooms: updatedLooms.length },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Loom #${lNum} set to Idle.`,
      });
    }

    // Action 3: Assign a list of looms to a quality in bulk
    if (action === "ASSIGN_RECIPE_LOOMS") {
      if (!qualityCode || typeof qualityCode !== "string" || !qualityCode.trim()) {
        return NextResponse.json({ error: "Quality Code is required." }, { status: 400 });
      }

      const cleanCode = qualityCode.trim();
      const sanitizedLooms: number[] = Array.isArray(loomNumbers)
        ? Array.from(
            new Set(
              loomNumbers
                .map((n: any) => Number(n))
                .filter((n: number) => !isNaN(n) && n >= 1 && n <= TOTAL_LOOMS)
            )
          ).sort((a: number, b: number) => a - b)
        : [];

      // Find or create target mapping
      let targetMapping = await db.loomMachineMapping.findUnique({
        where: { qualityCode: cleanCode },
      });

      if (!targetMapping) {
        const recipe = await db.tapePlantRecipe.findFirst({
          where: { code: { equals: cleanCode, mode: "insensitive" } },
        });

        targetMapping = await db.loomMachineMapping.create({
          data: {
            qualityCode: cleanCode,
            tapePlantRecipeId: recipe?.id || null,
            colorGroup: recipe?.colorGroup || "Standard",
            colour: recipe?.colour || "White",
            denier: recipe?.denier ?? null,
            tapeWidth: recipe?.tapeWidth ?? null,
            bobbinMarking: recipe?.bobbinMarking || "Bobbin Issue",
            loomNumbers: sanitizedLooms,
            totalLooms: sanitizedLooms.length,
            isActive: true,
          },
        });
      } else {
        await db.loomMachineMapping.update({
          where: { id: targetMapping.id },
          data: {
            loomNumbers: sanitizedLooms,
            totalLooms: sanitizedLooms.length,
            isActive: true,
          },
        });
      }

      // Remove these looms from any other mappings
      if (sanitizedLooms.length > 0) {
        const otherMappings = await db.loomMachineMapping.findMany({
          where: {
            qualityCode: { not: cleanCode },
          },
        });

        for (const m of otherMappings) {
          const overlap = m.loomNumbers.some((num) => sanitizedLooms.includes(num));
          if (overlap) {
            const updated = m.loomNumbers.filter((num) => !sanitizedLooms.includes(num));
            await db.loomMachineMapping.update({
              where: { id: m.id },
              data: { loomNumbers: updated, totalLooms: updated.length },
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Allocated ${sanitizedLooms.length} looms to quality "${cleanCode}".`,
      });
    }

    // Action 4: Clear all looms for a recipe
    if (action === "CLEAR_RECIPE_LOOMS") {
      if (!qualityCode || typeof qualityCode !== "string") {
        return NextResponse.json({ error: "Quality Code is required." }, { status: 400 });
      }

      const cleanCode = qualityCode.trim();
      const existing = await db.loomMachineMapping.findUnique({
        where: { qualityCode: cleanCode },
      });

      if (existing) {
        await db.loomMachineMapping.update({
          where: { id: existing.id },
          data: { loomNumbers: [], totalLooms: 0 },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Cleared all loom allocations for "${cleanCode}".`,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("Error in Loom Summary assignment:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update loom assignment" },
      { status: 500 }
    );
  }
}
