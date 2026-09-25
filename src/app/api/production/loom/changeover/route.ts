import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLoomApiPermission } from "@/lib/loom/permissions";
import { logAudit } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TOTAL_FACTORY_LOOMS = 91;

export async function GET(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status"); // ALL | SCHEDULED | IN_PROGRESS | COMPLETED | PENDING
  const search = searchParams.get("search");

  try {
    // 1. Fetch Loom Machine Mappings (Current factory master allocations)
    const mappings = await db.loomMachineMapping.findMany({
      where: { isActive: true },
      orderBy: [{ colorGroup: "asc" }, { qualityCode: "asc" }],
    });

    // 2. Fetch all Tape Plant Recipes & Active Mappings for next quality selection
    const [tapeRecipes, shifts, changeovers] = await Promise.all([
      db.tapePlantRecipe.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
      }),
      db.shift.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      db.loomChangeover.findMany({
        orderBy: [{ sequence: "asc" }, { loomNumber: "asc" }],
      }),
    ]);

    // Build map of existing changeover records by loom number
    const changeoverMap = new Map<number, typeof changeovers[0]>();
    changeovers.forEach((co) => changeoverMap.set(co.loomNumber, co));

    // Map each loom #1..91 to find current quality from LoomMachineMapping
    const currentAllocationMap = new Map<number, {
      qualityCode: string;
      colorGroup: string;
      colour: string;
      denier: number | null;
      reedSpaceCm: number | null;
      bobbinMarking: string;
      mesh: string;
    }>();

    mappings.forEach((m) => {
      (m.loomNumbers || []).forEach((loomNo) => {
        currentAllocationMap.set(loomNo, {
          qualityCode: m.qualityCode,
          colorGroup: m.colorGroup || "Unassigned",
          colour: m.colour || "—",
          denier: m.denier ?? null,
          reedSpaceCm: m.reedSpaceCm ?? null,
          bobbinMarking: m.bobbinMarking || "—",
          mesh: m.mesh || "—",
        });
      });
    });

    // Available quality options list combining TapePlantRecipe & LoomMachineMapping
    const qualityOptionsMap = new Map<string, {
      code: string;
      colour: string;
      colorGroup: string;
      denier: number | null;
      reedSpaceCm: number | null;
      bobbinMarking: string;
      mesh: string;
    }>();

    mappings.forEach((m) => {
      qualityOptionsMap.set(m.qualityCode, {
        code: m.qualityCode,
        colour: m.colour || "—",
        colorGroup: m.colorGroup || "Unassigned",
        denier: m.denier ?? null,
        reedSpaceCm: m.reedSpaceCm ?? null,
        bobbinMarking: m.bobbinMarking || "—",
        mesh: m.mesh || "—",
      });
    });

    tapeRecipes.forEach((r) => {
      if (!qualityOptionsMap.has(r.code)) {
        qualityOptionsMap.set(r.code, {
          code: r.code,
          colour: r.colour || "—",
          colorGroup: r.colorGroup || "Unassigned",
          denier: r.denier ?? null,
          reedSpaceCm: null,
          bobbinMarking: r.bobbinMarking || "—",
          mesh: "—",
        });
      }
    });

    const availableQualities = Array.from(qualityOptionsMap.values()).sort((a, b) =>
      a.code.localeCompare(b.code)
    );

    // Build comprehensive 1-91 loom changeover items
    const allLoomItems = Array.from({ length: TOTAL_FACTORY_LOOMS }, (_, i) => {
      const loomNo = i + 1;
      const current = currentAllocationMap.get(loomNo);
      const co = changeoverMap.get(loomNo);

      // Current running values
      const currentQuality = co?.currentQuality || current?.qualityCode || "UNALLOCATED";
      const currentColor = co?.currentColor || current?.colour || "—";
      const currentColorGroup = co?.currentColorGroup || current?.colorGroup || "Unallocated";
      const currentDenier = co?.currentDenier ?? current?.denier ?? null;
      const currentReedSpace = co?.currentReedSpace ?? current?.reedSpaceCm ?? null;
      const currentBobbinMark = co?.currentBobbinMark || current?.bobbinMarking || "—";
      const currentMesh = co?.currentMesh || current?.mesh || "—";

      // Next scheduled values
      const nextQualityCode = co?.nextQualityCode || null;
      const nextColor = co?.nextColor || null;
      const nextColorGroup = co?.nextColorGroup || null;
      const nextDenier = co?.nextDenier ?? null;
      const nextReedSpace = co?.nextReedSpace ?? null;
      const nextBobbinMark = co?.nextBobbinMark || null;
      const nextMesh = co?.nextMesh || null;

      const sequence = co?.sequence ?? 0;
      const status = co?.status || (nextQualityCode ? "SCHEDULED" : "PENDING");
      const targetDate = co?.targetDate || null;
      const targetShiftId = co?.targetShiftId || null;
      const targetShiftName = co?.targetShiftName || null;
      const remarks = co?.remarks || null;
      const updatedAt = co?.updatedAt || null;

      const hasChangeover = Boolean(nextQualityCode && nextQualityCode !== currentQuality);
      const isReedSpaceChanged = Boolean(
        nextReedSpace !== null && currentReedSpace !== null && nextReedSpace !== currentReedSpace
      );
      const isColorChanged = Boolean(nextColor && currentColor && nextColor !== currentColor);
      const isBobbinMarkChanged = Boolean(
        nextBobbinMark && currentBobbinMark && nextBobbinMark !== currentBobbinMark
      );

      return {
        id: co?.id || `loom_${loomNo}`,
        loomNumber: loomNo,
        currentQuality,
        currentColor,
        currentColorGroup,
        currentDenier,
        currentReedSpace,
        currentBobbinMark,
        currentMesh,
        nextQualityCode,
        nextColor,
        nextColorGroup,
        nextDenier,
        nextReedSpace,
        nextBobbinMark,
        nextMesh,
        sequence,
        status,
        targetDate,
        targetShiftId,
        targetShiftName,
        remarks,
        hasChangeover,
        isReedSpaceChanged,
        isColorChanged,
        isBobbinMarkChanged,
        updatedAt,
      };
    });

    // KPI Metrics calculation
    const totalScheduled = allLoomItems.filter(
      (item) => item.status === "SCHEDULED" || (item.hasChangeover && item.status !== "COMPLETED")
    ).length;
    const totalInProgress = allLoomItems.filter((item) => item.status === "IN_PROGRESS").length;
    const totalCompleted = allLoomItems.filter((item) => item.status === "COMPLETED").length;
    const totalPending = allLoomItems.filter((item) => item.status === "PENDING" && !item.hasChangeover).length;
    const totalReedSpaceChanges = allLoomItems.filter((item) => item.isReedSpaceChanged && item.hasChangeover).length;

    // Filter items
    let filteredItems = allLoomItems;

    if (statusFilter && statusFilter !== "ALL") {
      filteredItems = filteredItems.filter((item) => {
        if (statusFilter === "SCHEDULED") return item.status === "SCHEDULED" || item.hasChangeover;
        return item.status === statusFilter;
      });
    }

    if (search) {
      const q = search.toLowerCase().trim();
      filteredItems = filteredItems.filter(
        (item) =>
          String(item.loomNumber) === q ||
          `loom ${item.loomNumber}` === q ||
          `#${item.loomNumber}` === q ||
          item.currentQuality.toLowerCase().includes(q) ||
          (item.nextQualityCode && item.nextQualityCode.toLowerCase().includes(q)) ||
          item.currentColor.toLowerCase().includes(q) ||
          (item.nextColor && item.nextColor.toLowerCase().includes(q)) ||
          item.currentBobbinMark.toLowerCase().includes(q) ||
          (item.targetShiftName && item.targetShiftName.toLowerCase().includes(q)) ||
          (item.remarks && item.remarks.toLowerCase().includes(q))
      );
    }

    // Sort items: Items with active sequence (> 0) come first ordered by sequence, then remaining looms ordered by loomNumber
    const sortedFilteredItems = [...filteredItems].sort((a, b) => {
      if (a.sequence > 0 && b.sequence > 0) return a.sequence - b.sequence;
      if (a.sequence > 0) return -1;
      if (b.sequence > 0) return 1;
      return a.loomNumber - b.loomNumber;
    });

    // Changeover queue (only looms that have next quality scheduled or in progress, sorted by sequence)
    const changeoverQueue = allLoomItems
      .filter((item) => item.hasChangeover || item.sequence > 0 || item.status === "SCHEDULED" || item.status === "IN_PROGRESS")
      .sort((a, b) => {
        if (a.sequence > 0 && b.sequence > 0) return a.sequence - b.sequence;
        if (a.sequence > 0) return -1;
        if (b.sequence > 0) return 1;
        return a.loomNumber - b.loomNumber;
      });

    return NextResponse.json(
      {
        looms: sortedFilteredItems,
        allLooms: allLoomItems,
        changeoverQueue,
        availableQualities,
        availableShifts: shifts.map((s) => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        kpis: {
          totalLooms: TOTAL_FACTORY_LOOMS,
          totalScheduled,
          totalInProgress,
          totalCompleted,
          totalPending,
          totalReedSpaceChanges,
          queueLength: changeoverQueue.length,
        },
        count: sortedFilteredItems.length,
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
    console.error("Error fetching Loom Changeover Sheet:", error);
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
    const { updates } = body; // Array of LoomChangeover update payload or single object

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
    console.error("Error saving Loom Changeover Sheet:", error);
    return NextResponse.json({ error: "Failed to save Loom Changeover changes" }, { status: 500 });
  }
}
