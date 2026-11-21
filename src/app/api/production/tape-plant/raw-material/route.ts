import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";
import { emitProductionSync } from "@/lib/realtime/production-bus";
import { invalidateSyncCache } from "@/lib/realtime/db-sync";

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
    const records = await db.tapePlantRawMaterial.findMany({
      where: isAll ? { date } : { date, shiftId },
      orderBy: { createdAt: "asc" },
    });

    // Deduplicate in memory by material name in case legacy duplicates exist
    const dedupedMap = new Map<string, (typeof records)[0]>();
    for (const r of records) {
      const matKey = (r.material || "").trim().toUpperCase();
      if (!matKey) continue;
      if (!dedupedMap.has(matKey)) {
        dedupedMap.set(matKey, { ...r });
      } else {
        const existing = dedupedMap.get(matKey)!;
        for (const [k, v] of Object.entries(r)) {
          if (v !== null && v !== undefined && v !== "") {
            (existing as any)[k] = v;
          }
        }
        if ("photoUrl" in r) existing.photoUrl = r.photoUrl || null;
        dedupedMap.set(matKey, existing);
      }
    }

    return NextResponse.json(Array.from(dedupedMap.values()), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error fetching Tape Plant raw materials:", error);
    return NextResponse.json({ error: "Failed to fetch raw materials" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { date, shiftId, records, operatorName, operatorId, deletedMaterials, clientId } = body;

    if (!date || !shiftId || !Array.isArray(records)) {
      return NextResponse.json({ error: "Date, Shift, and Records array are required" }, { status: 400 });
    }

    const isAll = shiftId.toUpperCase() === "ALL";

    // Resolve active shift to satisfy foreign key constraint when shiftId is ALL
    const defaultShift = await db.shift.findFirst({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
      select: { id: true },
    });
    const fallbackShiftId = defaultShift?.id || "shift_day";
    const targetShiftId = isAll ? fallbackShiftId : shiftId;

    await db.$transaction(async (tx: any) => {
      // 1. Fetch current database state for this date & shift
      const existingRows = await tx.tapePlantRawMaterial.findMany({
        where: isAll ? { date } : { date, shiftId },
      });

      // Group existing rows by normalized material key
      const existingByMaterial = new Map<string, any[]>();
      for (const row of existingRows) {
        const m = (row.material || "").trim().toUpperCase();
        if (!m) continue;
        const list = existingByMaterial.get(m) || [];
        list.push(row);
        existingByMaterial.set(m, list);
      }

      // 2. Handle explicit deletions
      if (Array.isArray(deletedMaterials) && deletedMaterials.length > 0) {
        const matsToDelete = deletedMaterials.map((m: string) => (m || "").trim()).filter(Boolean);
        if (matsToDelete.length > 0) {
          await tx.tapePlantRawMaterial.deleteMany({
            where: isAll
              ? { date, material: { in: matsToDelete } }
              : { date, shiftId, material: { in: matsToDelete } },
          });
          matsToDelete.forEach((m: string) => existingByMaterial.delete(m.toUpperCase()));
        }
      }

      // 3. Clean up legacy duplicate rows in DB if present
      for (const [m, duplicates] of existingByMaterial.entries()) {
        if (duplicates.length > 1) {
          const [keep, ...remove] = duplicates;
          const removeIds = remove.map((r: any) => r.id);
          await tx.tapePlantRawMaterial.deleteMany({
            where: { id: { in: removeIds } },
          });
          existingByMaterial.set(m, [keep]);
        }
      }

      // 4. Atomic Row Upsert per Material
      for (const r of records) {
        const matName = String(r.material || "").trim();
        if (!matName) continue;
        const matKey = matName.toUpperCase();

        const opening = r.openingStock !== "" && r.openingStock !== null && r.openingStock !== undefined ? Number(r.openingStock) : 0;
        const received = r.received !== "" && r.received !== null && r.received !== undefined ? Number(r.received) : 0;
        const total = opening + received;
        const consumption = r.consumption !== "" && r.consumption !== null && r.consumption !== undefined ? Number(r.consumption) : 0;
        const closing = total - consumption;

        const rowData = {
          operatorName: r.operatorName || operatorName || null,
          operatorId: r.operatorId || operatorId || null,
          photoUrl: r.photoUrl ? String(r.photoUrl).trim() : null,
          material: matName,
          grade: r.grade ? String(r.grade).trim() : null,
          openingStock: opening,
          received: received,
          total: total,
          consumption: consumption,
          closingStock: closing,
          settingPercent: r.settingPercent !== "" && r.settingPercent !== null && r.settingPercent !== undefined ? Number(r.settingPercent) : null,
          actualPercent: r.actualPercent !== "" && r.actualPercent !== null && r.actualPercent !== undefined ? Number(r.actualPercent) : null,
          wastage: r.wastage !== "" && r.wastage !== null && r.wastage !== undefined ? Number(r.wastage) : null,
        };

        const existingList = existingByMaterial.get(matKey);
        const existingRecord = existingList?.[0];

        if (existingRecord) {
          await tx.tapePlantRawMaterial.update({
            where: { id: existingRecord.id },
            data: {
              ...rowData,
              shiftId: targetShiftId,
            },
          });
        } else {
          const created = await tx.tapePlantRawMaterial.create({
            data: {
              ...rowData,
              date,
              shiftId: targetShiftId,
            },
          });
          existingByMaterial.set(matKey, [created]);
        }
      }
    });

    const updated = await db.tapePlantRawMaterial.findMany({
      where: isAll ? { date } : { date, shiftId },
      orderBy: { createdAt: "asc" },
    });

    invalidateSyncCache("tape-plant", "raw-material");
    emitProductionSync({
      module: "tape-plant",
      sheet: "raw-material",
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
    console.error("Error saving Tape Plant raw materials:", error);
    return NextResponse.json({ error: "Failed to save raw materials" }, { status: 500 });
  }
}
