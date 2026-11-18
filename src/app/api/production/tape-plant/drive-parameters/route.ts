import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";
import { emitProductionSync } from "@/lib/realtime/production-bus";
import { invalidateSyncCache } from "@/lib/realtime/db-sync";
import { resolveShiftIdForTime } from "@/lib/tape-plant/telemetry-time-slots";

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

    // Deduplicate in memory in case legacy duplicates exist
    const dedupedMap = new Map<string, (typeof records)[0]>();
    for (const r of records) {
      const key = isAll ? r.time : `${r.time}__${r.shiftId}`;
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, { ...r });
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
    const { date, shiftId, records, operatorName, operatorId } = body;

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
      if (isAll) {
        await tx.tapePlantDriveParameter.deleteMany({
          where: { date },
        });
      } else {
        await tx.tapePlantDriveParameter.deleteMany({
          where: { date, shiftId },
        });
      }

      if (records.length > 0) {
        const validRecords = records
          .filter((r) => r.time && String(r.time).trim() !== "")
          .map((r) => {
            const timeTrimmed = String(r.time).trim();
            const targetShiftId = isAll
              ? resolveShiftIdForTime(timeTrimmed, activeShifts, fallbackShiftId)
              : shiftId;

            return {
              date,
              shiftId: targetShiftId,
              time: timeTrimmed,
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
          });

        // Enforce strict uniqueness per time slot to prevent exponential duplicate rows
        const dedupedMap = new Map<string, (typeof validRecords)[0]>();
        for (const item of validRecords) {
          const key = isAll ? item.time : `${item.time}__${item.shiftId}`;
          if (!dedupedMap.has(key)) {
            dedupedMap.set(key, { ...item });
          } else {
            const existing = dedupedMap.get(key)!;
            for (const [k, v] of Object.entries(item)) {
              if (v !== null && v !== undefined && v !== "") {
                (existing as any)[k] = v;
              }
            }
            if ("photoUrl" in item) existing.photoUrl = item.photoUrl || null;
            if (item.operatorName) existing.operatorName = item.operatorName;
            if (item.operatorId) existing.operatorId = item.operatorId;
            dedupedMap.set(key, existing);
          }
        }
        const dedupedRecords = Array.from(dedupedMap.values());

        if (dedupedRecords.length > 0) {
          await tx.tapePlantDriveParameter.createMany({
            data: dedupedRecords,
          });
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
