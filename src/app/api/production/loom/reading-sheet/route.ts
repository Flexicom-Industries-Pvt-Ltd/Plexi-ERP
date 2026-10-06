import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLoomApiPermission } from "@/lib/loom/permissions";
import { logAudit } from "@/lib/audit-logger";
import { withResourceLock } from "@/lib/concurrency-lock";
import {
  LoomReadingEntryItem,
  IntervalKpiSummary,
  computeIntervalDeltas,
  computeLoomEfficiency,
  TOTAL_FACTORY_LOOMS,
  DEFAULT_TIME_SLOTS,
  DEFAULT_INITIAL_SLOT,
  ESTIMATED_KG_PER_METER,
} from "@/lib/loom/loom-reading-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getNormalizedShiftCandidates(shiftName: string): string[] {
  const clean = (shiftName || "").trim();
  const upper = clean.toUpperCase();
  const candidates = new Set<string>([clean, upper, clean.toLowerCase()]);
  if (upper === "DAY" || upper === "DAY SHIFT" || upper === "SHIFT A") {
    candidates.add("DAY");
    candidates.add("Day Shift");
    candidates.add("Day");
    candidates.add("Shift A");
    candidates.add("DAY SHIFT");
  } else if (upper === "NIGHT" || upper === "NIGHT SHIFT" || upper === "SHIFT B") {
    candidates.add("NIGHT");
    candidates.add("Night Shift");
    candidates.add("Night");
    candidates.add("Shift B");
    candidates.add("NIGHT SHIFT");
  }
  return Array.from(candidates);
}

export async function GET(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const shiftNameParam = searchParams.get("shiftName") || "DAY";
  const search = searchParams.get("search")?.toLowerCase().trim() || "";

  try {
    const candidateShiftNames = getNormalizedShiftCandidates(shiftNameParam);

    // 1. Fetch available shifts, operators, active loom mappings, tape recipes, and existing sheet concurrently
    const [shifts, operators, mappings, tapeRecipes, existingSheet] = await Promise.all([
      db.shift.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      db.operator.findMany({
        where: { isActive: true },
        orderBy: [{ section: "asc" }, { name: "asc" }],
      }),
      db.loomMachineMapping.findMany({
        where: { isActive: true },
        orderBy: [{ colorGroup: "asc" }, { qualityCode: "asc" }],
      }),
      db.tapePlantRecipe.findMany({
        where: { isActive: true },
        orderBy: [{ colorGroup: "asc" }, { code: "asc" }],
      }),
      db.loomReadingSheet.findFirst({
        where: {
          date: dateParam,
          shiftName: { in: candidateShiftNames, mode: "insensitive" },
        },
        include: {
          entries: {
            orderBy: { loomNumber: "asc" },
          },
        },
      }),
    ]);

    // Build map of allocated loom specifications (quality, size/reed space, denier)
    const loomAllocationMap = new Map<number, {
      qualityCode: string;
      denier: string;
      size: string;
    }>();

    // Map recipes by code for spec lookup
    const recipeSpecMap = new Map<string, typeof tapeRecipes[0]>();
    tapeRecipes.forEach((r) => {
      recipeSpecMap.set(r.code.toLowerCase().trim(), r);
    });

    for (const mapping of mappings) {
      const spec = recipeSpecMap.get(mapping.qualityCode.toLowerCase().trim());
      for (const num of mapping.loomNumbers) {
        const resolvedDenier = mapping.denier ? String(mapping.denier) : spec?.denier ? String(spec.denier) : "";
        const resolvedSize = mapping.reedSpaceCm ? String(mapping.reedSpaceCm * 10) : mapping.tapeWidth ? String(mapping.tapeWidth) : spec?.spacerSize ? String(spec.spacerSize * 10) : spec?.tapeWidth ? String(spec.tapeWidth) : "";

        loomAllocationMap.set(num, {
          qualityCode: mapping.qualityCode,
          denier: resolvedDenier,
          size: resolvedSize,
        });
      }
    }

    // 2. Build 1..91 entries list (supporting multi-row changeovers per loom)
    let entries: LoomReadingEntryItem[] = [];

    if (existingSheet && existingSheet.entries.length > 0) {
      const entryGroupMap = new Map<number, typeof existingSheet.entries>();
      existingSheet.entries.forEach((e) => {
        const list = entryGroupMap.get(e.loomNumber) || [];
        list.push(e);
        entryGroupMap.set(e.loomNumber, list);
      });

      for (let i = 1; i <= TOTAL_FACTORY_LOOMS; i++) {
        const loomExistingList = entryGroupMap.get(i);
        const alloc = loomAllocationMap.get(i);

        if (loomExistingList && loomExistingList.length > 0) {
          loomExistingList.sort((a, b) => (a.rowSequence || 1) - (b.rowSequence || 1));

          for (const existing of loomExistingList) {
            const quality = existing.qualityType || alloc?.qualityCode || "";
            const bdMinutes = existing.breakdownMinutes || 0;
            const { r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod, totalProduction } = computeIntervalDeltas(existing);
            const eff = computeLoomEfficiency(
              totalProduction,
              quality,
              bdMinutes,
              existingSheet.shiftHours || 12
            );

            entries.push({
              id: existing.id,
              loomNumber: i,
              rowSequence: existing.rowSequence || 1,
              operatorName: existing.operatorName || "",
              size: existing.size || alloc?.size || "",
              denier: existing.denier || alloc?.denier || "",
              qualityType: quality,
              initialReading: existing.initialReading,
              r1Reading: existing.r1Reading,
              r1Prod,
              r2Reading: existing.r2Reading,
              r2Prod,
              r3Reading: existing.r3Reading,
              r3Prod,
              r4Reading: existing.r4Reading,
              r4Prod,
              r5Reading: existing.r5Reading,
              r5Prod,
              r6Reading: existing.r6Reading,
              r6Prod,
              totalProduction,
              breakdownReason: existing.breakdownReason || null,
              breakdownMinutes: bdMinutes,
              changeoverTargetQuality: existing.changeoverTargetQuality || null,
              efficiencyPct: eff.efficiencyPct,
              status: (existing.status as any) || "RUNNING",
              remarks: existing.remarks || "",
            });
          }
        } else {
          entries.push({
            loomNumber: i,
            rowSequence: 1,
            operatorName: "",
            size: alloc?.size || "",
            denier: alloc?.denier || "",
            qualityType: alloc?.qualityCode || "",
            initialReading: null,
            r1Reading: null,
            r1Prod: null,
            r2Reading: null,
            r2Prod: null,
            r3Reading: null,
            r3Prod: null,
            r4Reading: null,
            r4Prod: null,
            r5Reading: null,
            r5Prod: null,
            r6Reading: null,
            r6Prod: null,
            totalProduction: 0,
            breakdownReason: null,
            breakdownMinutes: 0,
            changeoverTargetQuality: null,
            efficiencyPct: 0,
            status: alloc ? "RUNNING" : "IDLE",
            remarks: "",
          });
        }
      }
    } else {
      // Default fresh 1..91 entries from allocation spec
      for (let i = 1; i <= TOTAL_FACTORY_LOOMS; i++) {
        const alloc = loomAllocationMap.get(i);
        entries.push({
          loomNumber: i,
          rowSequence: 1,
          operatorName: "",
          size: alloc?.size || "",
          denier: alloc?.denier || "",
          qualityType: alloc?.qualityCode || "",
          initialReading: null,
          r1Reading: null,
          r1Prod: null,
          r2Reading: null,
          r2Prod: null,
          r3Reading: null,
          r3Prod: null,
          r4Reading: null,
          r4Prod: null,
          r5Reading: null,
          r5Prod: null,
          r6Reading: null,
          r6Prod: null,
          totalProduction: 0,
          breakdownReason: null,
          breakdownMinutes: 0,
          changeoverTargetQuality: null,
          efficiencyPct: 0,
          status: alloc ? "RUNNING" : "IDLE",
          remarks: "",
        });
      }
    }

    // 3. Compute interval KPI summaries
    const timeSlots = existingSheet?.timeSlots?.length ? existingSheet.timeSlots : DEFAULT_TIME_SLOTS;
    const initialTimeSlot = existingSheet?.initialTimeSlot || DEFAULT_INITIAL_SLOT;

    let totalShiftMeters = 0;
    let runningLoomsCount = 0;
    let idleLoomsCount = 0;
    let totalBreakdownMins = 0;
    let totalRunningEffSum = 0;
    let runningWithEffCount = 0;

    const interval1Sum = entries.reduce((s, e) => s + (e.r1Prod || 0), 0);
    const interval2Sum = entries.reduce((s, e) => s + (e.r2Prod || 0), 0);
    const interval3Sum = entries.reduce((s, e) => s + (e.r3Prod || 0), 0);
    const interval4Sum = entries.reduce((s, e) => s + (e.r4Prod || 0), 0);
    const interval5Sum = entries.reduce((s, e) => s + (e.r5Prod || 0), 0);
    const interval6Sum = entries.reduce((s, e) => s + (e.r6Prod || 0), 0);

    const r1Count = entries.filter((e) => (e.r1Prod || 0) > 0 || e.r1Reading !== null).length;
    const r2Count = entries.filter((e) => (e.r2Prod || 0) > 0 || e.r2Reading !== null).length;
    const r3Count = entries.filter((e) => (e.r3Prod || 0) > 0 || e.r3Reading !== null).length;
    const r4Count = entries.filter((e) => (e.r4Prod || 0) > 0 || e.r4Reading !== null).length;
    const r5Count = entries.filter((e) => (e.r5Prod || 0) > 0 || e.r5Reading !== null).length;
    const r6Count = entries.filter((e) => (e.r6Prod || 0) > 0 || e.r6Reading !== null).length;

    entries.forEach((e) => {
      totalShiftMeters += e.totalProduction || 0;
      totalBreakdownMins += Number(e.breakdownMinutes) || 0;
      const isRunning = e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0);
      if (isRunning) {
        runningLoomsCount++;
        if (typeof e.efficiencyPct === "number" && e.efficiencyPct > 0) {
          totalRunningEffSum += e.efficiencyPct;
          runningWithEffCount++;
        }
      } else {
        idleLoomsCount++;
      }
    });

    const averageEfficiency = runningWithEffCount > 0
      ? Math.round((totalRunningEffSum / runningWithEffCount) * 10) / 10
      : 0;

    const intervalSums = [interval1Sum, interval2Sum, interval3Sum, interval4Sum, interval5Sum, interval6Sum];
    const intervalCounts = [r1Count, r2Count, r3Count, r4Count, r5Count, r6Count];

    let runningCumulative = 0;
    const intervalTotals: IntervalKpiSummary[] = timeSlots.map((slot, idx) => {
      const intervalMeters = intervalSums[idx] || 0;
      runningCumulative += intervalMeters;
      return {
        slot,
        index: idx + 1,
        intervalMeters,
        cumulativeMeters: runningCumulative,
        runningCount: intervalCounts[idx] || 0,
      };
    });

    const totalShiftKg = Math.round(totalShiftMeters * ESTIMATED_KG_PER_METER * 100) / 100;

    // Optional Search Filter for UI display
    let filteredEntries = entries;
    if (search) {
      filteredEntries = entries.filter((e) =>
        `#${e.loomNumber}`.includes(search) ||
        String(e.loomNumber).includes(search) ||
        (e.operatorName && e.operatorName.toLowerCase().includes(search)) ||
        (e.qualityType && e.qualityType.toLowerCase().includes(search)) ||
        (e.size && e.size.toLowerCase().includes(search)) ||
        (e.denier && e.denier.toLowerCase().includes(search)) ||
        (e.breakdownReason && e.breakdownReason.toLowerCase().includes(search)) ||
        (e.remarks && e.remarks.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      sheet: {
        id: existingSheet?.id || null,
        date: dateParam,
        shiftName: shiftNameParam,
        shiftId: existingSheet?.shiftId || null,
        shiftHours: existingSheet?.shiftHours || 12,
        timeSlots,
        initialTimeSlot,
        preparedBy: existingSheet?.preparedBy || "",
        checkedBy: existingSheet?.checkedBy || "",
        approvedBy: existingSheet?.approvedBy || "",
        totalLoomProductionMeters: existingSheet?.totalLoomProductionMeters || totalShiftMeters,
        totalLoomProductionKg: existingSheet?.totalLoomProductionKg || totalShiftKg,
        totalWastageKg: existingSheet?.totalWastageKg || 0,
        runningLoomsCount,
        idleLoomsCount,
        averageEfficiency: existingSheet?.averageEfficiency ?? averageEfficiency,
        totalBreakdownMins: existingSheet?.totalBreakdownMins ?? totalBreakdownMins,
        remarks: existingSheet?.remarks || "",
        status: existingSheet?.status || "DRAFT",
        createdAt: existingSheet?.createdAt?.toISOString(),
        updatedAt: existingSheet?.updatedAt?.toISOString(),
      },
      entries: filteredEntries,
      allEntriesCount: entries.length,
      kpis: {
        totalLooms: TOTAL_FACTORY_LOOMS,
        runningLoomsCount,
        idleLoomsCount,
        totalShiftMeters: Math.round(totalShiftMeters * 100) / 100,
        totalShiftKg,
        totalWastageKg: existingSheet?.totalWastageKg || 0,
        averageEfficiency,
        totalBreakdownMins,
        intervalTotals,
      },
      availableShifts: shifts.map((s) => ({ id: s.id, name: s.name })),
      availableOperators: operators.map((o) => ({
        id: o.id,
        name: o.name,
        employeeCode: o.code,
        section: o.section,
        designation: o.designation,
      })),
      availableQualities: (() => {
        const qualityMap = new Map<string, {
          code: string;
          colorGroup: string;
          colour: string;
          denier: number | null;
          reedSpaceCm: number | null;
          size: string;
        }>();

        tapeRecipes.forEach((r) => {
          qualityMap.set(r.code, {
            code: r.code,
            colorGroup: r.colorGroup || "Standard",
            colour: r.colour || "White",
            denier: r.denier ?? null,
            reedSpaceCm: r.spacerSize ?? null,
            size: r.spacerSize ? String(r.spacerSize * 10) : r.tapeWidth ? String(r.tapeWidth) : "",
          });
        });

        mappings.forEach((m) => {
          const existing = qualityMap.get(m.qualityCode);
          qualityMap.set(m.qualityCode, {
            code: m.qualityCode,
            colorGroup: m.colorGroup || existing?.colorGroup || "Standard",
            colour: m.colour || existing?.colour || "White",
            denier: m.denier ?? existing?.denier ?? null,
            reedSpaceCm: m.reedSpaceCm ?? existing?.reedSpaceCm ?? null,
            size: m.reedSpaceCm ? String(m.reedSpaceCm * 10) : m.tapeWidth ? String(m.tapeWidth) : existing?.size || "",
          });
        });

        return Array.from(qualityMap.values()).sort((a, b) => a.code.localeCompare(b.code));
      })(),
    });
  } catch (error: any) {
    console.error("GET /api/production/loom/reading-sheet error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch loom reading sheet" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const action = body.action || "SAVE_SHEET";
    const date = body.date || new Date().toISOString().slice(0, 10);
    const shiftName = body.shiftName || "Day Shift";
    const userEmail = authResult.session?.user?.email || "System User";

    // -------------------------------------------------------------
    // ACTION 1: SAVE_SHEET
    // -------------------------------------------------------------
    if (action === "SAVE_SHEET") {
      const {
        entries = [],
        preparedBy = "",
        checkedBy = "",
        approvedBy = "",
        totalWastageKg = 0,
        remarks = "",
        status = "DRAFT",
        shiftHours = 12,
      } = body;

      // Validate & re-calculate entries
      let sheetTotalMeters = 0;
      let runningCount = 0;
      let idleCount = 0;
      let totalBreakdownMins = 0;
      let totalRunningEffSum = 0;
      let runningWithEffCount = 0;

      const loomRowSeqTracker = new Map<number, number>();
      const processedEntries = (entries as LoomReadingEntryItem[]).map((e) => {
        const { r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod, totalProduction } = computeIntervalDeltas(e);
        const bdMinutes = Number(e.breakdownMinutes) || 0;
        const bdReason = e.breakdownReason?.trim() || null;
        const effCalc = computeLoomEfficiency(totalProduction, e.qualityType, bdMinutes, shiftHours);
        const efficiencyPct = effCalc.efficiencyPct;

        sheetTotalMeters += totalProduction;
        totalBreakdownMins += bdMinutes;

        const isRunning = (e.status === "RUNNING" || totalProduction > 0) && e.status !== "STOP";
        if (isRunning) {
          runningCount++;
          if (efficiencyPct > 0) {
            totalRunningEffSum += efficiencyPct;
            runningWithEffCount++;
          }
        } else {
          idleCount++;
        }

        const loomNum = Number(e.loomNumber);
        const nextSeq = (loomRowSeqTracker.get(loomNum) || 0) + 1;
        loomRowSeqTracker.set(loomNum, nextSeq);
        const rowSeq = typeof e.rowSequence === "number" && e.rowSequence > 0 ? e.rowSequence : nextSeq;

        return {
          loomNumber: loomNum,
          rowSequence: rowSeq,
          operatorName: e.operatorName?.trim() || null,
          size: e.size?.trim() || null,
          denier: e.denier?.trim() || null,
          qualityType: e.qualityType?.trim() || null,
          initialReading: typeof e.initialReading === "number" && !isNaN(e.initialReading) ? e.initialReading : null,
          r1Reading: typeof e.r1Reading === "number" && !isNaN(e.r1Reading) ? e.r1Reading : null,
          r1Prod,
          r2Reading: typeof e.r2Reading === "number" && !isNaN(e.r2Reading) ? e.r2Reading : null,
          r2Prod,
          r3Reading: typeof e.r3Reading === "number" && !isNaN(e.r3Reading) ? e.r3Reading : null,
          r3Prod,
          r4Reading: typeof e.r4Reading === "number" && !isNaN(e.r4Reading) ? e.r4Reading : null,
          r4Prod,
          r5Reading: typeof e.r5Reading === "number" && !isNaN(e.r5Reading) ? e.r5Reading : null,
          r5Prod,
          r6Reading: typeof e.r6Reading === "number" && !isNaN(e.r6Reading) ? e.r6Reading : null,
          r6Prod,
          totalProduction,
          breakdownReason: bdReason,
          breakdownMinutes: bdMinutes,
          changeoverTargetQuality: e.changeoverTargetQuality ? String(e.changeoverTargetQuality).trim() : null,
          efficiencyPct,
          status: e.status || "RUNNING",
          remarks: e.remarks?.trim() || null,
        };
      });

      const averageEfficiency = runningWithEffCount > 0
        ? Math.round((totalRunningEffSum / runningWithEffCount) * 10) / 10
        : 0;

      const totalShiftKg = Math.round(sheetTotalMeters * ESTIMATED_KG_PER_METER * 100) / 100;

      const lockKey = `loom_reading_sheet:${date}:${shiftName}`;
      const savedSheet = await withResourceLock(lockKey, async () => {
        const candidateShiftNames = getNormalizedShiftCandidates(shiftName);
        const existingSheet = await db.loomReadingSheet.findFirst({
          where: {
            date,
            shiftName: { in: candidateShiftNames, mode: "insensitive" },
          },
        });

        const targetShiftName = existingSheet?.shiftName || shiftName;

        // Upsert sheet record directly
        const sheet = await db.loomReadingSheet.upsert({
        where: {
          date_shiftName: {
            date,
            shiftName: targetShiftName,
          },
        },
        update: {
          preparedBy,
          checkedBy,
          approvedBy,
          totalLoomProductionMeters: sheetTotalMeters,
          totalLoomProductionKg: totalShiftKg,
          totalWastageKg: Number(totalWastageKg) || 0,
          runningLoomsCount: runningCount,
          idleLoomsCount: idleCount,
          averageEfficiency,
          totalBreakdownMins,
          remarks,
          status,
        },
        create: {
          date,
          shiftName: targetShiftName,
          preparedBy,
          checkedBy,
          approvedBy,
          totalLoomProductionMeters: sheetTotalMeters,
          totalLoomProductionKg: totalShiftKg,
          totalWastageKg: Number(totalWastageKg) || 0,
          runningLoomsCount: runningCount,
          idleLoomsCount: idleCount,
          averageEfficiency,
          totalBreakdownMins,
          remarks,
          status,
        },
      });

      // Fast batch replace entries in a single SQL statement
      await db.loomReadingEntry.deleteMany({
        where: { sheetId: savedSheet.id },
      });

      if (processedEntries.length > 0) {
        await db.loomReadingEntry.createMany({
          data: processedEntries.map((item) => ({
            sheetId: savedSheet.id,
            loomNumber: item.loomNumber,
            rowSequence: item.rowSequence,
            operatorName: item.operatorName,
            size: item.size,
            denier: item.denier,
            qualityType: item.qualityType,
            initialReading: item.initialReading,
            r1Reading: item.r1Reading,
            r1Prod: item.r1Prod,
            r2Reading: item.r2Reading,
            r2Prod: item.r2Prod,
            r3Reading: item.r3Reading,
            r3Prod: item.r3Prod,
            r4Reading: item.r4Reading,
            r4Prod: item.r4Prod,
            r5Reading: item.r5Reading,
            r5Prod: item.r5Prod,
            r6Reading: item.r6Reading,
            r6Prod: item.r6Prod,
            totalProduction: item.totalProduction,
            breakdownReason: item.breakdownReason,
            breakdownMinutes: item.breakdownMinutes,
            changeoverTargetQuality: item.changeoverTargetQuality,
            efficiencyPct: item.efficiencyPct,
            status: item.status,
            remarks: item.remarks,
          })),
        });

        // -------------------------------------------------------------
        // Automatic Changeover Execution & Roll Stock WIP Preservation
        // -------------------------------------------------------------
        const changeoverEntries = processedEntries.filter(
          (e) =>
            (e.breakdownReason === "Change Over" || e.status === "CHANGEOVER") &&
            Boolean(e.changeoverTargetQuality && e.changeoverTargetQuality.trim())
        );

        for (const co of changeoverEntries) {
          const targetQuality = co.changeoverTargetQuality!.trim();
          const loomNum = co.loomNumber;
          const prevQuality = co.qualityType || "Unassigned";

          try {
            // 1. Reassign loom machine mapping (free from previous, assign to target quality)
            const otherMappings = await db.loomMachineMapping.findMany({
              where: {
                loomNumbers: { has: loomNum },
                qualityCode: { not: targetQuality },
              },
            });

            for (const om of otherMappings) {
              const updatedLooms = om.loomNumbers.filter((n) => n !== loomNum);
              await db.loomMachineMapping.update({
                where: { id: om.id },
                data: { loomNumbers: updatedLooms, totalLooms: updatedLooms.length },
              });
            }

            let targetMapping = await db.loomMachineMapping.findUnique({
              where: { qualityCode: targetQuality },
            });

            if (targetMapping) {
              const updatedLooms = Array.from(new Set([...(targetMapping.loomNumbers || []), loomNum])).sort((a, b) => a - b);
              await db.loomMachineMapping.update({
                where: { id: targetMapping.id },
                data: { loomNumbers: updatedLooms, totalLooms: updatedLooms.length, isActive: true },
              });
            } else {
              const recipe = await db.tapePlantRecipe.findFirst({
                where: { code: { equals: targetQuality, mode: "insensitive" } },
              });
              await db.loomMachineMapping.create({
                data: {
                  qualityCode: targetQuality,
                  tapePlantRecipeId: recipe?.id || null,
                  colorGroup: recipe?.colorGroup || "Standard",
                  colour: recipe?.colour || "White",
                  denier: recipe?.denier ?? null,
                  tapeWidth: recipe?.tapeWidth ?? null,
                  bobbinMarking: recipe?.bobbinMarking || "Changeover",
                  loomNumbers: [loomNum],
                  totalLooms: 1,
                  allocationDate: date,
                  activeShifts: [targetShiftName],
                  isActive: true,
                },
              });
            }

            // 2. Save Roll Stock for previous quality if meters were produced
            if (co.totalProduction > 0) {
              const rollType = prevQuality.toUpperCase().includes("LPP") ? "LPP" : "PP";
              const today = new Date();
              const datePart = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;
              const rollNumber = `PR-${rollType}-${datePart}-L${loomNum}-${Date.now().toString().slice(-4)}`;

              await db.productionRoll.create({
                data: {
                  rollNumber,
                  rollType,
                  weight: Math.round(co.totalProduction * ESTIMATED_KG_PER_METER * 100) / 100,
                  length: co.totalProduction,
                  qualityStatus: "PASSED",
                  sourcePhase: "LOOM",
                  characteristics: {
                    loomNumber: loomNum,
                    previousQuality: prevQuality,
                    newQuality: targetQuality,
                    size: co.size,
                    denier: co.denier,
                    date,
                    shiftName: targetShiftName,
                    operatorName: co.operatorName,
                    downtimeMinutes: co.breakdownMinutes,
                    rollStockSource: "LOOM_CHANGEOVER",
                  },
                  remarks: `Roll Stock from Loom #${loomNum} Changeover: ${prevQuality} -> ${targetQuality} (${co.totalProduction}m)`,
                },
              }).catch((rollErr) => console.error("Roll stock creation notice:", rollErr?.message));
            }

            // 3. Upsert LoomChangeover tracking record
            await db.loomChangeover.upsert({
              where: { loomNumber: loomNum },
              create: {
                loomNumber: loomNum,
                currentQuality: prevQuality,
                nextQualityCode: targetQuality,
                status: "COMPLETED",
                targetDate: date,
                targetShiftName: targetShiftName,
                remarks: co.remarks || `Changeover from ${prevQuality} to ${targetQuality}`,
                updatedBy: preparedBy || userEmail || "Operator",
              },
              update: {
                currentQuality: prevQuality,
                nextQualityCode: targetQuality,
                status: "COMPLETED",
                targetDate: date,
                targetShiftName: targetShiftName,
                remarks: co.remarks || `Changeover from ${prevQuality} to ${targetQuality}`,
                updatedBy: preparedBy || userEmail || "Operator",
              },
            }).catch((coErr) => console.error("Changeover log notice:", coErr?.message));
          } catch (err) {
            console.error(`Error processing changeover for Loom #${loomNum}:`, err);
          }
        }
      }

      return sheet;
    });

      await logAudit({
        action: "UPDATE",
        module: "LOOM",
        entityId: savedSheet.id,
        newValues: {
          details: `Saved 2 Hours Loom Reading Sheet for ${date} (${shiftName}): ${sheetTotalMeters.toLocaleString()} meters, ${runningCount} running looms, Avg Eff: ${averageEfficiency}%.`,
        },
      });

      return NextResponse.json({
        success: true,
        sheetId: savedSheet.id,
        totalMeters: sheetTotalMeters,
        totalKg: totalShiftKg,
        runningCount,
        averageEfficiency,
        totalBreakdownMins,
        message: "Loom 2 Hours Reading Sheet saved successfully",
      });
    }

    // -------------------------------------------------------------
    // ACTION 2: BULK_ASSIGN_OPERATOR (e.g. Ravinder -> Looms 31 to 34)
    // -------------------------------------------------------------
    if (action === "BULK_ASSIGN_OPERATOR") {
      const { startLoom, endLoom, operatorName, qualityType, size, denier } = body;
      const start = Math.max(1, Number(startLoom) || 1);
      const end = Math.min(TOTAL_FACTORY_LOOMS, Number(endLoom) || TOTAL_FACTORY_LOOMS);

      let sheet = await db.loomReadingSheet.findUnique({
        where: {
          date_shiftName: { date, shiftName },
        },
      });

      if (!sheet) {
        sheet = await db.loomReadingSheet.create({
          data: {
            date,
            shiftName,
            status: "DRAFT",
          },
        });
      }

      const updates: any[] = [];
      for (let l = start; l <= end; l++) {
        const updateData: any = {};
        if (operatorName !== undefined) updateData.operatorName = operatorName;
        if (qualityType !== undefined) updateData.qualityType = qualityType;
        if (size !== undefined) updateData.size = size;
        if (denier !== undefined) updateData.denier = denier;

        updates.push(
          db.loomReadingEntry.upsert({
            where: {
              sheetId_loomNumber_rowSequence: {
                sheetId: sheet.id,
                loomNumber: l,
                rowSequence: 1,
              },
            },
            update: updateData,
            create: {
              sheetId: sheet.id,
              loomNumber: l,
              rowSequence: 1,
              ...updateData,
            },
          })
        );
      }

      await db.$transaction(updates);

      await logAudit({
        action: "UPDATE",
        module: "LOOM",
        entityId: sheet.id,
        newValues: {
          details: `Bulk assigned operator '${operatorName}' to looms #${start}-#${end} on ${date} (${shiftName})`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Assigned operator to looms #${start} - #${end}`,
      });
    }

    // -------------------------------------------------------------
    // ACTION 3: RESET_SHEET
    // -------------------------------------------------------------
    if (action === "RESET_SHEET") {
      const existing = await db.loomReadingSheet.findUnique({
        where: { date_shiftName: { date, shiftName } },
      });

      if (existing) {
        await db.loomReadingSheet.delete({
          where: { id: existing.id },
        });

        await logAudit({
          action: "DELETE",
          module: "LOOM",
          entityId: existing.id,
          newValues: {
            details: `Reset 2 Hours Loom Reading Sheet for ${date} (${shiftName})`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Loom reading sheet reset to clean blank state",
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/production/loom/reading-sheet error:", error);
    return NextResponse.json({ error: error.message || "Failed to process reading sheet action" }, { status: 500 });
  }
}
