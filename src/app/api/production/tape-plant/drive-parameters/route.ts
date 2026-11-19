import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";
import { emitProductionSync } from "@/lib/realtime/production-bus";
import { invalidateSyncCache } from "@/lib/realtime/db-sync";
import { resolveShiftIdForTime, normalizeTimeSlot } from "@/lib/tape-plant/telemetry-time-slots";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const shiftId = searchParams.get("shiftId");

  if (!date || !shiftId) {
    return NextResponse.json({ error: "Date and Shift are required" }, { status: 400 });
  }

  try {
    const isAll = shiftId.toUpperCase() === "ALL";
    const records = await db.tapePlantDriveParameter.findMany({
      where: isAll ? { date } : { date, shiftId },
      orderBy: { time: "asc" },
    });

    // Deduplicate in memory by normalized time slot in case legacy duplicates exist
    const dedupedMap = new Map<string, (typeof records)[0]>();
    for (const r of records) {
      const normTime = normalizeTimeSlot(r.time);
      if (!normTime) continue;
      const key = isAll ? normTime : `${normTime}__${r.shiftId}`;
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, { ...r, time: normTime });
      } else {
        const existing = dedupedMap.get(key)!;
        for (const [k, v] of Object.entries(r)) {
          if (v !== null && v !== undefined && v !== "") {
            (existing as any)[k] = v;
          }
        }
        if ("photoUrl" in r) existing.photoUrl = r.photoUrl || null;
        dedupedMap.set(key, existing);
      }
    }
    const cleanRecords = Array.from(dedupedMap.values());

    return NextResponse.json(cleanRecords, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error fetching Tape Plant drive parameters:", error);
    return NextResponse.json({ error: "Failed to fetch drive parameters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { date, shiftId, records, operatorName, operatorId, deletedTimes, clientId } = body;

    if (!date || !shiftId || !Array.isArray(records)) {
      return NextResponse.json({ error: "Date, Shift, and Records array are required" }, { status: 400 });
    }

    const isAll = shiftId.toUpperCase() === "ALL";

    // Load active shifts to satisfy foreign key constraint when shiftId is ALL
    const activeShifts = await db.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, endTime: true, isNightShift: true },
    });
    const fallbackShiftId = activeShifts[0]?.id || "shift_day";

    await db.$transaction(async (tx: any) => {
      // 1. Fetch current database state for this date & shift
      const existingRows = await tx.tapePlantDriveParameter.findMany({
        where: isAll ? { date } : { date, shiftId },
      });

      // Group existing rows by normalized time slot
      const existingByTime = new Map<string, any[]>();
      for (const row of existingRows) {
        const t = normalizeTimeSlot(row.time);
        if (!t) continue;
        const list = existingByTime.get(t) || [];
        list.push(row);
        existingByTime.set(t, list);
      }

      // 2. Handle explicit row deletions (if client deleted rows)
      if (Array.isArray(deletedTimes) && deletedTimes.length > 0) {
        const timesToDelete = deletedTimes.map((t: string) => normalizeTimeSlot(t)).filter(Boolean);
        if (timesToDelete.length > 0) {
          await tx.tapePlantDriveParameter.deleteMany({
            where: isAll
              ? { date, time: { in: timesToDelete } }
              : { date, shiftId, time: { in: timesToDelete } },
          });
          timesToDelete.forEach((t: string) => existingByTime.delete(t));
        }
      }

      // 3. Clean up legacy duplicates in DB if present
      for (const [t, duplicates] of existingByTime.entries()) {
        if (duplicates.length > 1) {
          const [keep, ...remove] = duplicates;
          const removeIds = remove.map((r: any) => r.id);
          await tx.tapePlantDriveParameter.deleteMany({
            where: { id: { in: removeIds } },
          });
          existingByTime.set(t, [keep]);
        }
      }

      // 4. Atomic Row Upsert per normalized time slot
      for (const r of records) {
        const normTime = normalizeTimeSlot(r.time);
        if (!normTime) continue;

        const targetShiftId = isAll
          ? resolveShiftIdForTime(normTime, activeShifts, fallbackShiftId)
          : shiftId;

        const rowData = {
          operatorName: r.operatorName || operatorName || null,
          operatorId: r.operatorId || operatorId || null,
          photoUrl: r.photoUrl || null,
          extruderRpm: r.extruderRpm !== "" && r.extruderRpm !== null && r.extruderRpm !== undefined ? Number(r.extruderRpm) : null,
          meltPumpRpm: r.meltPumpRpm !== "" && r.meltPumpRpm !== null && r.meltPumpRpm !== undefined ? Number(r.meltPumpRpm) : null,
          takeUpMpm: r.takeUpMpm !== "" && r.takeUpMpm !== null && r.takeUpMpm !== undefined ? Number(r.takeUpMpm) : null,
          nipRollMpm: r.nipRollMpm !== "" && r.nipRollMpm !== null && r.nipRollMpm !== undefined ? Number(r.nipRollMpm) : null,
          isuMpm: r.isuMpm !== "" && r.isuMpm !== null && r.isuMpm !== undefined ? Number(r.isuMpm) : null,
          pauMpm: r.pauMpm !== "" && r.pauMpm !== null && r.pauMpm !== undefined ? Number(r.pauMpm) : null,
          stretchingMpm: r.stretchingMpm !== "" && r.stretchingMpm !== null && r.stretchingMpm !== undefined ? Number(r.stretchingMpm) : null,
          annealingMpm: r.annealingMpm !== "" && r.annealingMpm !== null && r.annealingMpm !== undefined ? Number(r.annealingMpm) : null,
          stretchingRatio: r.stretchingRatio !== "" && r.stretchingRatio !== null && r.stretchingRatio !== undefined ? Number(r.stretchingRatio) : null,
          meltPressureP1: r.meltPressureP1 !== "" && r.meltPressureP1 !== null && r.meltPressureP1 !== undefined ? Number(r.meltPressureP1) : null,
          meltPressureP2: r.meltPressureP2 !== "" && r.meltPressureP2 !== null && r.meltPressureP2 !== undefined ? Number(r.meltPressureP2) : null,
          meltPressureP3: r.meltPressureP3 !== "" && r.meltPressureP3 !== null && r.meltPressureP3 !== undefined ? Number(r.meltPressureP3) : null,
          waterBath: r.waterBath !== "" && r.waterBath !== null && r.waterBath !== undefined ? Number(r.waterBath) : null,
          colour: r.colour || null,
          denier: r.denier !== "" && r.denier !== null && r.denier !== undefined ? Number(r.denier) : null,
          tapeWidth: r.tapeWidth !== "" && r.tapeWidth !== null && r.tapeWidth !== undefined ? Number(r.tapeWidth) : null,
          strength: r.strength !== "" && r.strength !== null && r.strength !== undefined ? Number(r.strength) : null,
          eloPercent: r.eloPercent !== "" && r.eloPercent !== null && r.eloPercent !== undefined ? Number(r.eloPercent) : null,
          spacerWidth: r.spacerWidth !== "" && r.spacerWidth !== null && r.spacerWidth !== undefined ? Number(r.spacerWidth) : null,
          numberOfTape: r.numberOfTape !== "" && r.numberOfTape !== null && r.numberOfTape !== undefined ? parseInt(String(r.numberOfTape), 10) : null,
        };

        const existingList = existingByTime.get(normTime);
        const existingRecord = existingList?.[0];

        if (existingRecord) {
          // Update existing row
          await tx.tapePlantDriveParameter.update({
            where: { id: existingRecord.id },
            data: {
              ...rowData,
              shiftId: targetShiftId,
              time: normTime,
            },
          });
        } else {
          // Check if row has any non-null data to avoid inserting empty blank ghost rows
          const hasData =
            rowData.photoUrl ||
            rowData.extruderRpm !== null ||
            rowData.meltPumpRpm !== null ||
            rowData.takeUpMpm !== null ||
            rowData.nipRollMpm !== null ||
            rowData.isuMpm !== null ||
            rowData.pauMpm !== null ||
            rowData.stretchingMpm !== null ||
            rowData.annealingMpm !== null ||
            rowData.stretchingRatio !== null ||
            rowData.meltPressureP1 !== null ||
            rowData.meltPressureP2 !== null ||
            rowData.meltPressureP3 !== null ||
            rowData.waterBath !== null ||
            rowData.colour !== null ||
            rowData.denier !== null ||
            rowData.tapeWidth !== null ||
            rowData.strength !== null ||
            rowData.eloPercent !== null ||
            rowData.spacerWidth !== null ||
            rowData.numberOfTape !== null;

          if (hasData) {
            const created = await tx.tapePlantDriveParameter.create({
              data: {
                ...rowData,
                date,
                shiftId: targetShiftId,
                time: normTime,
              },
            });
            existingByTime.set(normTime, [created]);
          }
        }
      }
    });

    const updated = await db.tapePlantDriveParameter.findMany({
      where: isAll ? { date } : { date, shiftId },
      orderBy: { time: "asc" },
    });

    invalidateSyncCache("tape-plant", "drive-parameter");
    emitProductionSync({
      module: "tape-plant",
      sheet: "drive-parameter",
      action: "SAVE",
      date,
      shift: shiftId,
      clientId,
      user: {
        name: authResult.session?.user?.name || "Floor Admin",
        email: authResult.session?.user?.email || undefined,
        role: (authResult.session?.user as any)?.roleName || (authResult.session?.user as any)?.role || "Staff",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error saving Tape Plant drive parameters:", error);
    return NextResponse.json({ error: "Failed to save drive parameters" }, { status: 500 });
  }
}
