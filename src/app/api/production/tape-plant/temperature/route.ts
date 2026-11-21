import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";
import { emitProductionSync } from "@/lib/realtime/production-bus";
import { invalidateSyncCache } from "@/lib/realtime/db-sync";
import { resolveShiftIdForTime } from "@/lib/tape-plant/telemetry-time-slots";
import { triggerOpportunisticPhotoPrune } from "@/lib/production/photo-retention";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  triggerOpportunisticPhotoPrune();
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
    const readings = await db.tapePlantTemperatureReading.findMany({
      where: isAll ? { date } : { date, shiftId },
      orderBy: { time: "asc" },
    });

    // Deduplicate in memory in case legacy duplicates exist
    const dedupedMap = new Map<string, (typeof readings)[0]>();
    for (const r of readings) {
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
    const cleanReadings = Array.from(dedupedMap.values());

    return NextResponse.json(cleanReadings, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error fetching Tape Plant temperature readings:", error);
    return NextResponse.json({ error: "Failed to fetch temperature readings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { date, shiftId, readings, operatorName, operatorId, deletedTimes, clientId } = body;

    if (!date || !shiftId || !Array.isArray(readings)) {
      return NextResponse.json({ error: "Date, Shift, and Readings array are required" }, { status: 400 });
    }

    const isAll = shiftId.toUpperCase() === "ALL";

    // Load active shifts to satisfy foreign key constraint when shiftId is ALL
    const activeShifts = await db.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, endTime: true, isNightShift: true },
    });
    const fallbackShiftId = activeShifts[0]?.id || "shift_day";

    // Google Docs-grade Row-Level Upsert Architecture
    // Atomically updates or inserts each time slot without wiping existing rows
    await db.$transaction(async (tx: any) => {
      // 1. Explicit row deletions (if any custom rows were removed)
      if (Array.isArray(deletedTimes) && deletedTimes.length > 0) {
        const cleanDeletedTimes = deletedTimes.map((t: string) => String(t).trim()).filter(Boolean);
        if (cleanDeletedTimes.length > 0) {
          if (isAll) {
            await tx.tapePlantTemperatureReading.deleteMany({
              where: { date, time: { in: cleanDeletedTimes } },
            });
          } else {
            await tx.tapePlantTemperatureReading.deleteMany({
              where: { date, shiftId, time: { in: cleanDeletedTimes } },
            });
          }
        }
      }

      // 2. Fetch existing rows to reconcile updates and prevent duplicates
      const existingRows = await tx.tapePlantTemperatureReading.findMany({
        where: isAll ? { date } : { date, shiftId },
      });

      const existingMap = new Map<string, (typeof existingRows)[0]>();
      const duplicateIdsToDelete: string[] = [];

      for (const row of existingRows) {
        const key = isAll ? row.time.trim() : `${row.time.trim()}__${row.shiftId}`;
        if (!existingMap.has(key)) {
          existingMap.set(key, row);
        } else {
          duplicateIdsToDelete.push(row.id);
        }
      }

      // Prune any legacy duplicates in DB
      if (duplicateIdsToDelete.length > 0) {
        await tx.tapePlantTemperatureReading.deleteMany({
          where: { id: { in: duplicateIdsToDelete } },
        });
      }

      // 3. Atomically upsert each reading row
      for (const r of readings) {
        const timeTrimmed = String(r.time || "").trim();
        if (!timeTrimmed) continue;

        const targetShiftId = isAll
          ? resolveShiftIdForTime(timeTrimmed, activeShifts, fallbackShiftId)
          : shiftId;

        const rowKey = isAll ? timeTrimmed : `${timeTrimmed}__${targetShiftId}`;
        const existing = existingMap.get(rowKey);

        const dataPayload = {
          date,
          shiftId: targetShiftId,
          time: timeTrimmed,
          operatorName: r.operatorName || operatorName || null,
          operatorId: r.operatorId || operatorId || null,
          photoUrl: r.photoUrl ? String(r.photoUrl).trim() : null,
          b1: r.b1 !== "" && r.b1 !== null && r.b1 !== undefined ? Number(r.b1) : null,
          b2: r.b2 !== "" && r.b2 !== null && r.b2 !== undefined ? Number(r.b2) : null,
          b3: r.b3 !== "" && r.b3 !== null && r.b3 !== undefined ? Number(r.b3) : null,
          b4: r.b4 !== "" && r.b4 !== null && r.b4 !== undefined ? Number(r.b4) : null,
          b5: r.b5 !== "" && r.b5 !== null && r.b5 !== undefined ? Number(r.b5) : null,
          b6: r.b6 !== "" && r.b6 !== null && r.b6 !== undefined ? Number(r.b6) : null,
          b7: r.b7 !== "" && r.b7 !== null && r.b7 !== undefined ? Number(r.b7) : null,
          screenChanger: r.screenChanger !== "" && r.screenChanger !== null && r.screenChanger !== undefined ? Number(r.screenChanger) : null,
          ad1: r.ad1 !== "" && r.ad1 !== null && r.ad1 !== undefined ? Number(r.ad1) : null,
          ad2: r.ad2 !== "" && r.ad2 !== null && r.ad2 !== undefined ? Number(r.ad2) : null,
          meltPump: r.meltPump !== "" && r.meltPump !== null && r.meltPump !== undefined ? Number(r.meltPump) : null,
          d1: r.d1 !== "" && r.d1 !== null && r.d1 !== undefined ? Number(r.d1) : null,
          d2: r.d2 !== "" && r.d2 !== null && r.d2 !== undefined ? Number(r.d2) : null,
          d3: r.d3 !== "" && r.d3 !== null && r.d3 !== undefined ? Number(r.d3) : null,
          d4: r.d4 !== "" && r.d4 !== null && r.d4 !== undefined ? Number(r.d4) : null,
          d5: r.d5 !== "" && r.d5 !== null && r.d5 !== undefined ? Number(r.d5) : null,
          d6: r.d6 !== "" && r.d6 !== null && r.d6 !== undefined ? Number(r.d6) : null,
          d7: r.d7 !== "" && r.d7 !== null && r.d7 !== undefined ? Number(r.d7) : null,
          meltTemp: r.meltTemp !== "" && r.meltTemp !== null && r.meltTemp !== undefined ? Number(r.meltTemp) : null,
          h1: r.h1 !== "" && r.h1 !== null && r.h1 !== undefined ? Number(r.h1) : null,
          h2: r.h2 !== "" && r.h2 !== null && r.h2 !== undefined ? Number(r.h2) : null,
          housingWater: r.housingWater !== "" && r.housingWater !== null && r.housingWater !== undefined
            ? Number(r.housingWater)
            : r.h1 !== "" && r.h1 !== null && r.h1 !== undefined
            ? Number(r.h1)
            : null,
          hotAirTemp: r.hotAirTemp !== "" && r.hotAirTemp !== null && r.hotAirTemp !== undefined ? Number(r.hotAirTemp) : null,
        };

        if (existing) {
          await tx.tapePlantTemperatureReading.update({
            where: { id: existing.id },
            data: dataPayload,
          });
        } else {
          const created = await tx.tapePlantTemperatureReading.create({
            data: dataPayload,
          });
          existingMap.set(rowKey, created);
        }
      }
    });

    const updated = await db.tapePlantTemperatureReading.findMany({
      where: isAll ? { date } : { date, shiftId },
      orderBy: { time: "asc" },
    });

    invalidateSyncCache("tape-plant", "temperature");
    emitProductionSync({
      module: "tape-plant",
      sheet: "temperature",
      action: "SAVE",
      date,
      shift: shiftId,
      clientId: clientId || null,
      user: {
        name: authResult.session?.user?.name || "Floor Admin",
        email: authResult.session?.user?.email || undefined,
        role: (authResult.session?.user as any)?.roleName || (authResult.session?.user as any)?.role || "Staff",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error saving Tape Plant temperature readings:", error);
    return NextResponse.json({ error: "Failed to save temperature readings" }, { status: 500 });
  }
}
