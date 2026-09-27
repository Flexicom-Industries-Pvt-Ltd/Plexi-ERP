import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLoomApiPermission } from "@/lib/loom/permissions";
import { logAudit } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TOTAL_FACTORY_LOOMS = 91;
const DEFAULT_TIME_SLOTS = ["10:00", "12:00", "02:00", "04:00", "06:00", "08:00"];
const DEFAULT_INITIAL_SLOT = "08:00";

// Standard estimation factor: 1 meter woven PP circular fabric ~ 0.160 kg (can be tuned per denier)
const ESTIMATED_KG_PER_METER = 0.16;

export interface LoomReadingEntryItem {
  id?: string;
  loomNumber: number;
  operatorName: string;
  size: string;
  denier: string;
  qualityType: string;
  initialReading: number | null;
  r1Reading: number | null;
  r1Prod: number | null;
  r2Reading: number | null;
  r2Prod: number | null;
  r3Reading: number | null;
  r3Prod: number | null;
  r4Reading: number | null;
  r4Prod: number | null;
  r5Reading: number | null;
  r5Prod: number | null;
  r6Reading: number | null;
  r6Prod: number | null;
  totalProduction: number;
  status: "RUNNING" | "STOP" | "CLEANING" | "CHANGEOVER" | "IDLE";
  remarks: string;
}

export interface IntervalKpiSummary {
  slot: string;
  index: number;
  intervalMeters: number;
  cumulativeMeters: number;
  runningCount: number;
}

export function computeIntervalDeltas(entry: Partial<LoomReadingEntryItem>): {
  r1Prod: number | null;
  r2Prod: number | null;
  r3Prod: number | null;
  r4Prod: number | null;
  r5Prod: number | null;
  r6Prod: number | null;
  totalProduction: number;
} {
  const init = typeof entry.initialReading === "number" && !isNaN(entry.initialReading) ? entry.initialReading : null;
  const r1 = typeof entry.r1Reading === "number" && !isNaN(entry.r1Reading) ? entry.r1Reading : null;
  const r2 = typeof entry.r2Reading === "number" && !isNaN(entry.r2Reading) ? entry.r2Reading : null;
  const r3 = typeof entry.r3Reading === "number" && !isNaN(entry.r3Reading) ? entry.r3Reading : null;
  const r4 = typeof entry.r4Reading === "number" && !isNaN(entry.r4Reading) ? entry.r4Reading : null;
  const r5 = typeof entry.r5Reading === "number" && !isNaN(entry.r5Reading) ? entry.r5Reading : null;
  const r6 = typeof entry.r6Reading === "number" && !isNaN(entry.r6Reading) ? entry.r6Reading : null;

  const calcDiff = (curr: number | null, prev: number | null): number | null => {
    if (curr === null || prev === null) return null;
    let diff = curr - prev;
    if (diff < 0) {
      // Counter rollover (e.g. 9999 -> 0010)
      if (prev > 8000 && curr < 2000) {
        diff = (10000 - prev) + curr;
      } else {
        diff = 0;
      }
    }
    return Math.round(diff * 100) / 100;
  };

  const r1Prod = entry.r1Prod !== undefined && entry.r1Prod !== null ? entry.r1Prod : calcDiff(r1, init);
  const r2Prod = entry.r2Prod !== undefined && entry.r2Prod !== null ? entry.r2Prod : calcDiff(r2, r1 ?? init);
  const r3Prod = entry.r3Prod !== undefined && entry.r3Prod !== null ? entry.r3Prod : calcDiff(r3, r2 ?? r1 ?? init);
  const r4Prod = entry.r4Prod !== undefined && entry.r4Prod !== null ? entry.r4Prod : calcDiff(r4, r3 ?? r2 ?? r1 ?? init);
  const r5Prod = entry.r5Prod !== undefined && entry.r5Prod !== null ? entry.r5Prod : calcDiff(r5, r4 ?? r3 ?? r2 ?? r1 ?? init);
  const r6Prod = entry.r6Prod !== undefined && entry.r6Prod !== null ? entry.r6Prod : calcDiff(r6, r5 ?? r4 ?? r3 ?? r2 ?? r1 ?? init);

  const prodList = [r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod].filter((p): p is number => p !== null && !isNaN(p) && p > 0);
  let totalProduction = prodList.reduce((sum, val) => sum + val, 0);

  // Fallback to (r6 - init) if individual intervals were not recorded separately
  if (totalProduction === 0 && r6 !== null && init !== null && r6 > init) {
    totalProduction = r6 - init;
  }

  return {
    r1Prod,
    r2Prod,
    r3Prod,
    r4Prod,
    r5Prod,
    r6Prod,
    totalProduction: Math.round(totalProduction * 100) / 100,
  };
}

export async function GET(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const shiftNameParam = searchParams.get("shiftName") || "Day Shift";
  const search = searchParams.get("search")?.toLowerCase().trim() || "";

  try {
    // 1. Fetch available shifts, operators, and active loom mappings concurrently
    const [shifts, operators, mappings, existingSheet] = await Promise.all([
      db.shift.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      db.operator.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      db.loomMachineMapping.findMany({
        where: { isActive: true },
        orderBy: [{ colorGroup: "asc" }, { qualityCode: "asc" }],
      }),
      db.loomReadingSheet.findUnique({
        where: {
          date_shiftName: {
            date: dateParam,
            shiftName: shiftNameParam,
          },
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

    for (const mapping of mappings) {
      for (const num of mapping.loomNumbers) {
        loomAllocationMap.set(num, {
          qualityCode: mapping.qualityCode,
          denier: mapping.denier ? String(mapping.denier) : "",
          size: mapping.reedSpaceCm ? String(mapping.reedSpaceCm * 10) : mapping.tapeWidth ? String(mapping.tapeWidth) : "",
        });
      }
    }

    // 2. Build 1..91 entries list
    let entries: LoomReadingEntryItem[] = [];

    if (existingSheet && existingSheet.entries.length > 0) {
      const entryMap = new Map<number, typeof existingSheet.entries[0]>();
      existingSheet.entries.forEach((e) => entryMap.set(e.loomNumber, e));

      for (let i = 1; i <= TOTAL_FACTORY_LOOMS; i++) {
        const existing = entryMap.get(i);
        const alloc = loomAllocationMap.get(i);

        if (existing) {
          entries.push({
            id: existing.id,
            loomNumber: i,
            operatorName: existing.operatorName || "",
            size: existing.size || alloc?.size || "",
            denier: existing.denier || alloc?.denier || "",
            qualityType: existing.qualityType || alloc?.qualityCode || "",
            initialReading: existing.initialReading,
            r1Reading: existing.r1Reading,
            r1Prod: existing.r1Prod,
            r2Reading: existing.r2Reading,
            r2Prod: existing.r2Prod,
            r3Reading: existing.r3Reading,
            r3Prod: existing.r3Prod,
            r4Reading: existing.r4Reading,
            r4Prod: existing.r4Prod,
            r5Reading: existing.r5Reading,
            r5Prod: existing.r5Prod,
            r6Reading: existing.r6Reading,
            r6Prod: existing.r6Prod,
            totalProduction: existing.totalProduction || 0,
            status: (existing.status as any) || "RUNNING",
            remarks: existing.remarks || "",
          });
        } else {
          entries.push({
            loomNumber: i,
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
      if (e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0)) {
        runningLoomsCount++;
      } else {
        idleLoomsCount++;
      }
    });

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
        intervalTotals,
      },
      availableShifts: shifts.map((s) => ({ id: s.id, name: s.name })),
      availableOperators: operators.map((o) => ({ id: o.id, name: o.name, employeeCode: o.code })),
      availableQualities: mappings.map((m) => ({
        code: m.qualityCode,
        colorGroup: m.colorGroup,
        denier: m.denier,
        reedSpaceCm: m.reedSpaceCm,
      })),
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
      } = body;

      // Validate & re-calculate entries
      let sheetTotalMeters = 0;
      let runningCount = 0;
      let idleCount = 0;

      const processedEntries = (entries as LoomReadingEntryItem[]).map((e) => {
        const { r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod, totalProduction } = computeIntervalDeltas(e);

        sheetTotalMeters += totalProduction;
        const isRunning = (e.status === "RUNNING" || totalProduction > 0) && e.status !== "STOP";
        if (isRunning) runningCount++;
        else idleCount++;

        return {
          loomNumber: Number(e.loomNumber),
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
          status: e.status || "RUNNING",
          remarks: e.remarks?.trim() || null,
        };
      });

      const totalShiftKg = Math.round(sheetTotalMeters * ESTIMATED_KG_PER_METER * 100) / 100;

      // Upsert sheet record in transaction
      const savedSheet = await db.$transaction(async (tx) => {
        const sheet = await tx.loomReadingSheet.upsert({
          where: {
            date_shiftName: {
              date,
              shiftName,
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
            remarks,
            status,
          },
          create: {
            date,
            shiftName,
            preparedBy,
            checkedBy,
            approvedBy,
            totalLoomProductionMeters: sheetTotalMeters,
            totalLoomProductionKg: totalShiftKg,
            totalWastageKg: Number(totalWastageKg) || 0,
            runningLoomsCount: runningCount,
            idleLoomsCount: idleCount,
            remarks,
            status,
          },
        });

        // Upsert all 1..91 entries
        for (const item of processedEntries) {
          await tx.loomReadingEntry.upsert({
            where: {
              sheetId_loomNumber: {
                sheetId: sheet.id,
                loomNumber: item.loomNumber,
              },
            },
            update: {
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
              status: item.status,
              remarks: item.remarks,
            },
            create: {
              sheetId: sheet.id,
              loomNumber: item.loomNumber,
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
              status: item.status,
              remarks: item.remarks,
            },
          });
        }

        return sheet;
      });

      await logAudit({
        action: "UPDATE",
        module: "LOOM",
        entityId: savedSheet.id,
        newValues: {
          details: `Saved 2 Hours Loom Reading Sheet for ${date} (${shiftName}): ${sheetTotalMeters.toLocaleString()} meters, ${runningCount} running looms.`,
        },
      });

      return NextResponse.json({
        success: true,
        sheetId: savedSheet.id,
        totalMeters: sheetTotalMeters,
        totalKg: totalShiftKg,
        runningCount,
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
              sheetId_loomNumber: {
                sheetId: sheet.id,
                loomNumber: l,
              },
            },
            update: updateData,
            create: {
              sheetId: sheet.id,
              loomNumber: l,
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

    // -------------------------------------------------------------
    // ACTION 4: SEED_SAMPLE_DATA (Exact 21/09/26 Shop Floor Report Data)
    // -------------------------------------------------------------
    if (action === "SEED_SAMPLE_DATA") {
      const sampleDate = date || "2026-09-21";
      const sampleShift = shiftName || "Day Shift";

      const sampleRows: Array<{
        loomNumber: number;
        operatorName: string;
        size: string;
        denier: string;
        qualityType: string;
        initialReading: number;
        r1Reading: number;
        r1Prod: number;
        r2Reading: number;
        r2Prod: number;
        r3Reading: number;
        r3Prod: number;
        r4Reading: number;
        r4Prod: number;
        r5Reading: number;
        r5Prod: number;
        r6Reading: number;
        totalProduction: number;
        remarks: string;
        status: "RUNNING" | "STOP";
      }> = [
        { loomNumber: 31, operatorName: "Ravinder", size: "480", denier: "850", qualityType: "Mahal/LPP/W", initialReading: 7220, r1Reading: 7480, r1Prod: 260, r2Reading: 7730, r2Prod: 250, r3Reading: 7980, r3Prod: 250, r4Reading: 8210, r4Prod: 230, r5Reading: 8440, r5Prod: 230, r6Reading: 8780, totalProduction: 1560, remarks: "", status: "RUNNING" },
        { loomNumber: 32, operatorName: "Ravinder", size: "500", denier: "850", qualityType: "Amb/PP/Y/76", initialReading: 2850, r1Reading: 3140, r1Prod: 290, r2Reading: 3450, r2Prod: 310, r3Reading: 3730, r3Prod: 280, r4Reading: 3970, r4Prod: 240, r5Reading: 4210, r5Prod: 240, r6Reading: 4370, totalProduction: 1520, remarks: "", status: "RUNNING" },
        { loomNumber: 33, operatorName: "Ravinder", size: "500", denier: "1000", qualityType: "1000D/LPP/W", initialReading: 6630, r1Reading: 6850, r1Prod: 220, r2Reading: 7030, r2Prod: 180, r3Reading: 7390, r3Prod: 360, r4Reading: 7690, r4Prod: 300, r5Reading: 7930, r5Prod: 240, r6Reading: 8320, totalProduction: 1690, remarks: "", status: "RUNNING" },
        { loomNumber: 34, operatorName: "Ravinder", size: "500", denier: "1000", qualityType: "1000D/LPP/W", initialReading: 2180, r1Reading: 2390, r1Prod: 210, r2Reading: 3050, r2Prod: 660, r3Reading: 3320, r3Prod: 270, r4Reading: 3590, r4Prod: 270, r5Reading: 3860, r5Prod: 270, r6Reading: 4050, totalProduction: 1590, remarks: "", status: "RUNNING" },
        { loomNumber: 35, operatorName: "Manoj", size: "500", denier: "1000", qualityType: "1000D/LPP/W", initialReading: 2630, r1Reading: 3490, r1Prod: 860, r2Reading: 3640, r2Prod: 150, r3Reading: 3900, r3Prod: 260, r4Reading: 4200, r4Prod: 300, r5Reading: 4460, r5Prod: 260, r6Reading: 4720, totalProduction: 1690, remarks: "", status: "RUNNING" },
        { loomNumber: 36, operatorName: "Manoj", size: "500", denier: "1000", qualityType: "UTCL/LPP/Y/67", initialReading: 6410, r1Reading: 7110, r1Prod: 700, r2Reading: 7110, r2Prod: 0, r3Reading: 7410, r3Prod: 300, r4Reading: 7710, r4Prod: 300, r5Reading: 8010, r5Prod: 300, r6Reading: 8310, totalProduction: 1900, remarks: "", status: "RUNNING" },
        { loomNumber: 37, operatorName: "STP", size: "500", denier: "1000", qualityType: "Amb/PP/Y/76", initialReading: 7010, r1Reading: 7030, r1Prod: 20, r2Reading: 7030, r2Prod: 0, r3Reading: 7030, r3Prod: 0, r4Reading: 7030, r4Prod: 0, r5Reading: 7030, r5Prod: 0, r6Reading: 7030, totalProduction: 20, remarks: "STOP", status: "STOP" },
        { loomNumber: 38, operatorName: "STP", size: "485", denier: "850", qualityType: "Bis Sample", initialReading: 6800, r1Reading: 7010, r1Prod: 210, r2Reading: 7270, r2Prod: 260, r3Reading: 7520, r3Prod: 250, r4Reading: 7780, r4Prod: 260, r5Reading: 8040, r5Prod: 260, r6Reading: 8300, totalProduction: 1500, remarks: "", status: "RUNNING" },
        { loomNumber: 39, operatorName: "Amit", size: "500", denier: "1000", qualityType: "1000D/LPP/W", initialReading: 320, r1Reading: 540, r1Prod: 220, r2Reading: 1260, r2Prod: 720, r3Reading: 1540, r3Prod: 280, r4Reading: 1750, r4Prod: 210, r5Reading: 2420, r5Prod: 670, r6Reading: 2620, totalProduction: 2300, remarks: "", status: "RUNNING" },
        { loomNumber: 40, operatorName: "Amit", size: "500", denier: "1000", qualityType: "1000D/LPP/W", initialReading: 4430, r1Reading: 4690, r1Prod: 260, r2Reading: 5660, r2Prod: 970, r3Reading: 5940, r3Prod: 280, r4Reading: 6230, r4Prod: 290, r5Reading: 6500, r5Prod: 270, r6Reading: 6760, totalProduction: 2330, remarks: "", status: "RUNNING" },
        { loomNumber: 41, operatorName: "Amit", size: "500", denier: "1000", qualityType: "1000D/LPP/W", initialReading: 5460, r1Reading: 5730, r1Prod: 270, r2Reading: 5730, r2Prod: 0, r3Reading: 6000, r3Prod: 270, r4Reading: 6300, r4Prod: 300, r5Reading: 6880, r5Prod: 580, r6Reading: 7190, totalProduction: 1730, remarks: "", status: "RUNNING" },
        { loomNumber: 42, operatorName: "Amit", size: "500", denier: "850", qualityType: "Amb/PP/Y/76", initialReading: 770, r1Reading: 950, r1Prod: 180, r2Reading: 1120, r2Prod: 170, r3Reading: 1340, r3Prod: 220, r4Reading: 1640, r4Prod: 300, r5Reading: 2240, r5Prod: 600, r6Reading: 2540, totalProduction: 1770, remarks: "", status: "RUNNING" },
        { loomNumber: 43, operatorName: "Rakesh", size: "500", denier: "850", qualityType: "1000D/LPP/W", initialReading: 7260, r1Reading: 7560, r1Prod: 300, r2Reading: 8430, r2Prod: 870, r3Reading: 8640, r3Prod: 210, r4Reading: 8860, r4Prod: 220, r5Reading: 9380, r5Prod: 520, r6Reading: 9660, totalProduction: 2400, remarks: "Winder emery cheese", status: "RUNNING" },
        { loomNumber: 44, operatorName: "Rakesh", size: "490", denier: "760", qualityType: "UTCL/LPP/Y/76", initialReading: 6360, r1Reading: 6610, r1Prod: 250, r2Reading: 7460, r2Prod: 850, r3Reading: 7750, r3Prod: 290, r4Reading: 8040, r4Prod: 290, r5Reading: 8470, r5Prod: 430, r6Reading: 8740, totalProduction: 2380, remarks: "", status: "RUNNING" },
        { loomNumber: 45, operatorName: "Rakesh", size: "500", denier: "670", qualityType: "1000D/LPP/W/67", initialReading: 4270, r1Reading: 4520, r1Prod: 250, r2Reading: 5340, r2Prod: 820, r3Reading: 5640, r3Prod: 300, r4Reading: 5920, r4Prod: 280, r5Reading: 6280, r5Prod: 360, r6Reading: 6520, totalProduction: 2250, remarks: "", status: "RUNNING" },
        { loomNumber: 46, operatorName: "Rakesh", size: "500", denier: "670", qualityType: "UTCL/LPP/Y/67", initialReading: 2010, r1Reading: 2300, r1Prod: 290, r2Reading: 2910, r2Prod: 610, r3Reading: 3210, r3Prod: 300, r4Reading: 3520, r4Prod: 310, r5Reading: 3890, r5Prod: 370, r6Reading: 4130, totalProduction: 2120, remarks: "", status: "RUNNING" },
        { loomNumber: 47, operatorName: "Rajkumar", size: "500", denier: "850", qualityType: "1000D/LPP/W", initialReading: 5700, r1Reading: 5990, r1Prod: 290, r2Reading: 6960, r2Prod: 970, r3Reading: 7240, r3Prod: 280, r4Reading: 7550, r4Prod: 310, r5Reading: 7750, r5Prod: 200, r6Reading: 8030, totalProduction: 2330, remarks: "", status: "RUNNING" },
        { loomNumber: 48, operatorName: "Rajkumar", size: "500", denier: "850", qualityType: "1000D/LPP/W", initialReading: 8430, r1Reading: 8710, r1Prod: 280, r2Reading: 8720, r2Prod: 10, r3Reading: 9020, r3Prod: 300, r4Reading: 9300, r4Prod: 280, r5Reading: 10140, r5Prod: 840, r6Reading: 10430, totalProduction: 2000, remarks: "", status: "RUNNING" },
        { loomNumber: 49, operatorName: "Rajkumar", size: "500", denier: "670", qualityType: "1000D/LPP/W/67", initialReading: 7280, r1Reading: 7520, r1Prod: 240, r2Reading: 8320, r2Prod: 800, r3Reading: 8600, r3Prod: 280, r4Reading: 8860, r4Prod: 260, r5Reading: 9490, r5Prod: 630, r6Reading: 9780, totalProduction: 2500, remarks: "", status: "RUNNING" },
        { loomNumber: 50, operatorName: "Rajkumar", size: "500", denier: "850", qualityType: "1000D/LPP/W", initialReading: 2800, r1Reading: 3030, r1Prod: 230, r2Reading: 3030, r2Prod: 0, r3Reading: 3030, r3Prod: 0, r4Reading: 3030, r4Prod: 0, r5Reading: 3030, r5Prod: 0, r6Reading: 3030, totalProduction: 230, remarks: "11 PM STOP", status: "STOP" },
        { loomNumber: 51, operatorName: "Ravi Pal", size: "500", denier: "670", qualityType: "UTCL/LPP/Y/67", initialReading: 8840, r1Reading: 8840, r1Prod: 0, r2Reading: 8840, r2Prod: 0, r3Reading: 8840, r3Prod: 0, r4Reading: 8840, r4Prod: 0, r5Reading: 8840, r5Prod: 0, r6Reading: 8840, totalProduction: 0, remarks: "STOP Cleaning", status: "STOP" },
        { loomNumber: 52, operatorName: "Ravi Pal", size: "500", denier: "670", qualityType: "1000D/LPP/W/67", initialReading: 7100, r1Reading: 7380, r1Prod: 280, r2Reading: 7970, r2Prod: 590, r3Reading: 8180, r3Prod: 210, r4Reading: 8600, r4Prod: 420, r5Reading: 9070, r5Prod: 470, r6Reading: 9280, totalProduction: 2180, remarks: "", status: "RUNNING" },
        { loomNumber: 53, operatorName: "Ravi Pal", size: "500", denier: "760", qualityType: "Amb/PP/Y/76", initialReading: 1920, r1Reading: 2130, r1Prod: 210, r2Reading: 2500, r2Prod: 370, r3Reading: 240, r3Prod: 240, r4Reading: 470, r4Prod: 230, r5Reading: 650, r5Prod: 180, r6Reading: 910, totalProduction: 1490, remarks: "Winder emery cheese", status: "RUNNING" },
        { loomNumber: 54, operatorName: "Ravi Pal", size: "500", denier: "760", qualityType: "Amb/PP/Y/76", initialReading: 4735, r1Reading: 4885, r1Prod: 150, r2Reading: 5655, r2Prod: 770, r3Reading: 5825, r3Prod: 170, r4Reading: 6035, r4Prod: 210, r5Reading: 6845, r5Prod: 810, r6Reading: 7065, totalProduction: 2330, remarks: "", status: "RUNNING" },
        { loomNumber: 55, operatorName: "Mohit", size: "490", denier: "760", qualityType: "UTCL/PP/Y/76", initialReading: 3960, r1Reading: 4120, r1Prod: 160, r2Reading: 4490, r2Prod: 370, r3Reading: 4740, r3Prod: 250, r4Reading: 4970, r4Prod: 230, r5Reading: 5160, r5Prod: 190, r6Reading: 5350, totalProduction: 1390, remarks: "", status: "RUNNING" },
        { loomNumber: 56, operatorName: "Mohit", size: "500", denier: "760", qualityType: "TOP/PP/Y/76", initialReading: 6250, r1Reading: 6410, r1Prod: 160, r2Reading: 6740, r2Prod: 330, r3Reading: 6960, r3Prod: 220, r4Reading: 7230, r4Prod: 270, r5Reading: 8120, r5Prod: 890, r6Reading: 8370, totalProduction: 2120, remarks: "", status: "RUNNING" },
        { loomNumber: 57, operatorName: "Mohit", size: "500", denier: "760", qualityType: "Amb/PP/Y/76", initialReading: 2480, r1Reading: 2660, r1Prod: 180, r2Reading: 3540, r2Prod: 880, r3Reading: 3760, r3Prod: 220, r4Reading: 4020, r4Prod: 260, r5Reading: 4850, r5Prod: 830, r6Reading: 5090, totalProduction: 2610, remarks: "", status: "RUNNING" },
        { loomNumber: 58, operatorName: "Mohit", size: "500", denier: "760", qualityType: "TOP/PP/Y/76", initialReading: 9780, r1Reading: 9960, r1Prod: 180, r2Reading: 10150, r2Prod: 190, r3Reading: 10420, r3Prod: 270, r4Reading: 10670, r4Prod: 250, r5Reading: 11050, r5Prod: 380, r6Reading: 11300, totalProduction: 1520, remarks: "", status: "RUNNING" },
        { loomNumber: 59, operatorName: "Shahid", size: "490", denier: "760", qualityType: "UTCL/PP/Y/76", initialReading: 4300, r1Reading: 4460, r1Prod: 160, r2Reading: 5160, r2Prod: 700, r3Reading: 5400, r3Prod: 240, r4Reading: 5640, r4Prod: 240, r5Reading: 6310, r5Prod: 670, r6Reading: 6550, totalProduction: 2250, remarks: "", status: "RUNNING" },
        { loomNumber: 60, operatorName: "Shahid", size: "490", denier: "760", qualityType: "UTCL/PP/Y/76", initialReading: 4260, r1Reading: 4460, r1Prod: 200, r2Reading: 5160, r2Prod: 700, r3Reading: 5400, r3Prod: 240, r4Reading: 5670, r4Prod: 270, r5Reading: 5890, r5Prod: 220, r6Reading: 6140, totalProduction: 1880, remarks: "", status: "RUNNING" },
        { loomNumber: 61, operatorName: "Shahid", size: "490", denier: "760", qualityType: "UTCL/PP/Y/76", initialReading: 7220, r1Reading: 7390, r1Prod: 170, r2Reading: 8030, r2Prod: 640, r3Reading: 8280, r3Prod: 250, r4Reading: 8540, r4Prod: 260, r5Reading: 8750, r5Prod: 210, r6Reading: 9000, totalProduction: 1780, remarks: "", status: "RUNNING" },
        { loomNumber: 62, operatorName: "Shahid", size: "490", denier: "760", qualityType: "UTCL/PP/Y/76", initialReading: 1400, r1Reading: 1530, r1Prod: 130, r2Reading: 2290, r2Prod: 760, r3Reading: 2520, r3Prod: 230, r4Reading: 2780, r4Prod: 260, r5Reading: 3040, r5Prod: 260, r6Reading: 3280, totalProduction: 1880, remarks: "", status: "RUNNING" },
      ];

      const sheetTotalMeters = sampleRows.reduce((s, r) => s + r.totalProduction, 0);
      const totalShiftKg = Math.round(sheetTotalMeters * ESTIMATED_KG_PER_METER * 100) / 100;
      const runningCount = sampleRows.filter((r) => r.status === "RUNNING").length;
      const idleCount = sampleRows.filter((r) => r.status === "STOP").length;

      const sheet = await db.loomReadingSheet.upsert({
        where: {
          date_shiftName: {
            date: sampleDate,
            shiftName: sampleShift,
          },
        },
        update: {
          preparedBy: "Ravinder Kumar",
          checkedBy: "Suresh Sharma",
          approvedBy: "Plant Manager",
          totalLoomProductionMeters: sheetTotalMeters,
          totalLoomProductionKg: totalShiftKg,
          runningLoomsCount: runningCount,
          idleLoomsCount: idleCount,
          remarks: "21/09/26 Shop-floor bi-hourly shift production record",
          status: "APPROVED",
        },
        create: {
          date: sampleDate,
          shiftName: sampleShift,
          preparedBy: "Ravinder Kumar",
          checkedBy: "Suresh Sharma",
          approvedBy: "Plant Manager",
          totalLoomProductionMeters: sheetTotalMeters,
          totalLoomProductionKg: totalShiftKg,
          runningLoomsCount: runningCount,
          idleLoomsCount: idleCount,
          remarks: "21/09/26 Shop-floor bi-hourly shift production record",
          status: "APPROVED",
        },
      });

      // Insert all sample rows
      for (const row of sampleRows) {
        await db.loomReadingEntry.upsert({
          where: {
            sheetId_loomNumber: {
              sheetId: sheet.id,
              loomNumber: row.loomNumber,
            },
          },
          update: row,
          create: {
            sheetId: sheet.id,
            ...row,
          },
        });
      }

      await logAudit({
        action: "CREATE",
        module: "LOOM",
        entityId: sheet.id,
        newValues: {
          details: `Loaded sample 21/09/26 2-Hours Loom Production Report (${sampleRows.length} looms, ${sheetTotalMeters} meters)`,
        },
      });

      return NextResponse.json({
        success: true,
        sheetId: sheet.id,
        totalMeters: sheetTotalMeters,
        totalKg: totalShiftKg,
        message: "Sample 21/09/26 2-Hours Loom Production Report loaded successfully",
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/production/loom/reading-sheet error:", error);
    return NextResponse.json({ error: error.message || "Failed to process reading sheet action" }, { status: 500 });
  }
}
