import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLoomApiPermission } from "@/lib/loom/permissions";
import { logAudit } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TOTAL_FACTORY_LOOMS = 91;

export interface LoomChangeoverLogItem {
  id: string;
  source: "READING_SHEET" | "SCHEDULED" | "MANUAL";
  date: string;
  shiftName: string;
  loomNumber: number;
  operatorName: string;
  fromQuality: string;
  toQuality: string;
  downtimeMinutes: number;
  status: "LOGGED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CHANGEOVER" | string;
  remarks: string;
  loggedBy: string;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").toLowerCase().trim();
  const filterDate = searchParams.get("date") || "";
  const filterShift = searchParams.get("shift") || "";
  const filterStatus = searchParams.get("status") || "ALL";

  try {
    // 1. Fetch live changeovers logged from 2-Hour Reading Sheets
    const readingSheetEntries = await db.loomReadingEntry.findMany({
      where: {
        OR: [
          { breakdownReason: { equals: "Change Over", mode: "insensitive" } },
          { changeoverTargetQuality: { not: null } },
          { status: { equals: "CHANGEOVER", mode: "insensitive" } },
        ],
      },
      include: {
        sheet: {
          select: {
            id: true,
            date: true,
            shiftName: true,
            preparedBy: true,
            checkedBy: true,
          },
        },
      },
      orderBy: [{ sheet: { date: "desc" } }, { loomNumber: "asc" }],
    });

    // 2. Fetch master scheduled changeovers, recipes, shifts, and mappings in parallel
    const [changeovers, tapeRecipes, shifts, mappings] = await Promise.all([
      db.loomChangeover.findMany({
        orderBy: [{ sequence: "asc" }, { loomNumber: "asc" }],
      }),
      db.tapePlantRecipe.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
      }),
      db.shift.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      db.loomMachineMapping.findMany({
        where: { isActive: true },
        orderBy: [{ colorGroup: "asc" }, { qualityCode: "asc" }],
      }),
    ]);

    // Build available qualities list
    const qualityMap = new Map<string, { code: string; colorGroup?: string | null; colour?: string | null; denier?: number | null }>();
    tapeRecipes.forEach((r) => {
      qualityMap.set(r.code, {
        code: r.code,
        colorGroup: r.colorGroup || "Standard",
        colour: r.colour || "—",
        denier: r.denier ?? null,
      });
    });
    mappings.forEach((m) => {
      if (!qualityMap.has(m.qualityCode)) {
        qualityMap.set(m.qualityCode, {
          code: m.qualityCode,
          colorGroup: m.colorGroup || "Standard",
          colour: m.colour || "—",
          denier: m.denier ?? null,
        });
      }
    });
    const availableQualities = Array.from(qualityMap.values()).sort((a, b) => a.code.localeCompare(b.code));

    // Map reading sheet changeover entries into clean log items
    const readingSheetLogs: LoomChangeoverLogItem[] = readingSheetEntries.map((e) => ({
      id: `rs_${e.id}`,
      source: "READING_SHEET",
      date: e.sheet?.date || "—",
      shiftName: e.sheet?.shiftName || "—",
      loomNumber: e.loomNumber,
      operatorName: e.operatorName || "—",
      fromQuality: e.qualityType || "Unassigned",
      toQuality: e.changeoverTargetQuality || "Pending Spec",
      downtimeMinutes: e.breakdownMinutes || 0,
      status: e.status === "CHANGEOVER" ? "CHANGEOVER" : "LOGGED",
      remarks: e.remarks || "",
      loggedBy: e.sheet?.preparedBy || "Loom Operator",
      createdAt: e.createdAt.toISOString(),
    }));

    // Map master scheduled changeovers into scheduled items
    const scheduledLogs: LoomChangeoverLogItem[] = changeovers
      .filter((co) => Boolean(co.nextQualityCode && co.nextQualityCode.trim()))
      .map((co) => ({
        id: `sc_${co.id}`,
        source: "SCHEDULED",
        date: co.targetDate || "Scheduled",
        shiftName: co.targetShiftName || "General",
        loomNumber: co.loomNumber,
        operatorName: "—",
        fromQuality: co.currentQuality || "Unallocated",
        toQuality: co.nextQualityCode || "—",
        downtimeMinutes: 0,
        status: co.status || "SCHEDULED",
        remarks: co.remarks || "",
        loggedBy: co.updatedBy || "Planner",
        createdAt: co.updatedAt.toISOString(),
      }));

    // Combine all logs
    const allLogs: LoomChangeoverLogItem[] = [...readingSheetLogs, ...scheduledLogs];

    // Filter logs
    let filteredLogs = allLogs;

    if (filterDate) {
      filteredLogs = filteredLogs.filter((item) => item.date === filterDate);
    }

    if (filterShift) {
      filteredLogs = filteredLogs.filter((item) =>
        item.shiftName.toLowerCase().includes(filterShift.toLowerCase())
      );
    }

    if (filterStatus && filterStatus !== "ALL") {
      filteredLogs = filteredLogs.filter((item) => item.status.toUpperCase() === filterStatus.toUpperCase());
    }

    if (search) {
      filteredLogs = filteredLogs.filter((item) => {
        const str = `${item.loomNumber} loom #${item.loomNumber} ${item.operatorName} ${item.fromQuality} ${item.toQuality} ${item.shiftName} ${item.date} ${item.remarks}`.toLowerCase();
        return str.includes(search);
      });
    }

    // Sort logs: Date descending, Shift descending, Loom ascending
    filteredLogs.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.shiftName !== b.shiftName) return a.shiftName.localeCompare(b.shiftName);
      return a.loomNumber - b.loomNumber;
    });

    // Compute summary KPI metrics
    const totalLogsCount = filteredLogs.length;
    const totalDowntimeMinutes = filteredLogs.reduce((acc, l) => acc + (l.downtimeMinutes || 0), 0);
    const avgDowntimeMinutes = totalLogsCount > 0 ? Math.round((totalDowntimeMinutes / totalLogsCount) * 10) / 10 : 0;
    const uniqueLoomsCount = new Set(filteredLogs.map((l) => l.loomNumber)).size;
    const scheduledCount = scheduledLogs.length;

    return NextResponse.json(
      {
        logs: filteredLogs,
        allLogsCount: allLogs.length,
        kpis: {
          totalLogs: totalLogsCount,
          totalDowntimeMinutes,
          totalDowntimeHours: Math.round((totalDowntimeMinutes / 60) * 10) / 10,
          avgDowntimeMinutes,
          uniqueLoomsCount,
          scheduledCount,
          factoryTotalLooms: TOTAL_FACTORY_LOOMS,
        },
        availableQualities,
        availableShifts: shifts.map((s) => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
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
    console.error("Error fetching Loom Changeover logs:", error);
    return NextResponse.json({ error: "Failed to fetch Loom Changeover data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canUpdate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const startTime = Date.now();

  try {
    const body = await request.json();
    const { updates, action } = body;

    // ACTION: QUICK_SCHEDULE_CHANGEOVER
    if (action === "QUICK_SCHEDULE") {
      const { loomNumber, fromQuality, toQuality, targetDate, targetShiftName, remarks } = body;
      const lNum = Number(loomNumber);
      if (!lNum || lNum < 1 || lNum > TOTAL_FACTORY_LOOMS) {
        return NextResponse.json({ error: "Invalid Loom Number" }, { status: 400 });
      }

      const upserted = await db.loomChangeover.upsert({
        where: { loomNumber: lNum },
        create: {
          loomNumber: lNum,
          currentQuality: fromQuality || null,
          nextQualityCode: toQuality || null,
          targetDate: targetDate || new Date().toISOString().slice(0, 10),
          targetShiftName: targetShiftName || "Day Shift",
          status: "SCHEDULED",
          remarks: remarks || null,
          updatedBy: authResult.session?.user?.name || "Floor Admin",
        },
        update: {
          currentQuality: fromQuality || undefined,
          nextQualityCode: toQuality || undefined,
          targetDate: targetDate || undefined,
          targetShiftName: targetShiftName || undefined,
          status: "SCHEDULED",
          remarks: remarks || undefined,
          updatedBy: authResult.session?.user?.name || "Floor Admin",
        },
      });

      return NextResponse.json({ success: true, record: upserted });
    }

    // Standard batch updates for master changeovers
    const itemsToUpdate = Array.isArray(updates) ? updates : [body];
    if (!itemsToUpdate || itemsToUpdate.length === 0) {
      return NextResponse.json({ error: "No changeover updates provided" }, { status: 400 });
    }

    const updatedResults = [];

    for (const item of itemsToUpdate) {
      const loomNumber = Number(item.loomNumber);
      if (!loomNumber || loomNumber < 1 || loomNumber > TOTAL_FACTORY_LOOMS) {
        continue;
      }

      const existing = await db.loomChangeover.findUnique({
        where: { loomNumber },
      });

      const dataToUpsert = {
        loomNumber,
        currentQuality: item.currentQuality ?? existing?.currentQuality ?? null,
        currentColor: item.currentColor ?? existing?.currentColor ?? null,
        currentColorGroup: item.currentColorGroup ?? existing?.currentColorGroup ?? null,
        currentDenier: item.currentDenier !== undefined ? (item.currentDenier === null ? null : Number(item.currentDenier)) : existing?.currentDenier,
        currentReedSpace: item.currentReedSpace !== undefined ? (item.currentReedSpace === null ? null : Number(item.currentReedSpace)) : existing?.currentReedSpace,
        currentBobbinMark: item.currentBobbinMark ?? existing?.currentBobbinMark ?? null,
        currentMesh: item.currentMesh ?? existing?.currentMesh ?? null,

        nextQualityCode: item.nextQualityCode !== undefined ? (item.nextQualityCode ? String(item.nextQualityCode).trim() : null) : existing?.nextQualityCode,
        nextColor: item.nextColor !== undefined ? item.nextColor : existing?.nextColor,
        nextColorGroup: item.nextColorGroup !== undefined ? item.nextColorGroup : existing?.nextColorGroup,
        nextDenier: item.nextDenier !== undefined ? (item.nextDenier === null ? null : Number(item.nextDenier)) : existing?.nextDenier,
        nextReedSpace: item.nextReedSpace !== undefined ? (item.nextReedSpace === null ? null : Number(item.nextReedSpace)) : existing?.nextReedSpace,
        nextBobbinMark: item.nextBobbinMark !== undefined ? item.nextBobbinMark : existing?.nextBobbinMark,
        nextMesh: item.nextMesh !== undefined ? item.nextMesh : existing?.nextMesh,

        sequence: item.sequence !== undefined ? Number(item.sequence) : (existing?.sequence ?? 0),
        status: item.status !== undefined ? String(item.status) : (existing?.status ?? (item.nextQualityCode ? "SCHEDULED" : "PENDING")),
        targetDate: item.targetDate !== undefined ? item.targetDate : existing?.targetDate,
        targetShiftId: item.targetShiftId !== undefined ? item.targetShiftId : existing?.targetShiftId,
        targetShiftName: item.targetShiftName !== undefined ? item.targetShiftName : existing?.targetShiftName,
        remarks: item.remarks !== undefined ? item.remarks : existing?.remarks,
        updatedBy: authResult.session?.user?.name || authResult.session?.user?.email || "System",
      };

      const record = await db.loomChangeover.upsert({
        where: { loomNumber },
        create: dataToUpsert,
        update: dataToUpsert,
      });

      updatedResults.push(record);
    }

    // Deep Audit Logging
    const durationMs = Date.now() - startTime;
    await logAudit({
      action: "UPDATE_LOOM_CHANGEOVER_SHEET",
      module: "LOOM",
      entityId: `loom_changeover_batch_${updatedResults.length}`,
      newValues: {
        updatedCount: updatedResults.length,
        loomNumbers: updatedResults.map((r) => r.loomNumber),
      },
      durationMs,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedResults.length} loom changeover record(s)`,
      updatedRecords: updatedResults,
    });
  } catch (error) {
    console.error("Error saving Loom Changeover data:", error);
    return NextResponse.json({ error: "Failed to save Loom Changeover changes" }, { status: 500 });
  }
}
