import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";
import { emitProductionSync } from "@/lib/realtime/production-bus";

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
    });

    return NextResponse.json(records, {
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
    const { date, shiftId, records, operatorName, operatorId } = body;

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
      if (isAll) {
        await tx.tapePlantRawMaterial.deleteMany({
          where: { date },
        });
      } else {
        await tx.tapePlantRawMaterial.deleteMany({
          where: { date, shiftId },
        });
      }

      if (records.length > 0) {
        const validRecords = records
          .filter((r) => r.material && String(r.material).trim() !== "")
          .map((r) => {
            const opening = r.openingStock !== "" && r.openingStock !== null && r.openingStock !== undefined ? Number(r.openingStock) : 0;
            const received = r.received !== "" && r.received !== null && r.received !== undefined ? Number(r.received) : 0;
            const total = opening + received;
            const consumption = r.consumption !== "" && r.consumption !== null && r.consumption !== undefined ? Number(r.consumption) : 0;
            const closing = total - consumption;

            return {
              date,
              shiftId: targetShiftId,
              operatorName: r.operatorName || operatorName || null,
              operatorId: r.operatorId || operatorId || null,
              photoUrl: r.photoUrl || null,
              material: String(r.material).trim(),
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
          });

        if (validRecords.length > 0) {
          await tx.tapePlantRawMaterial.createMany({
            data: validRecords,
          });
        }
      }
    });

    const updated = await db.tapePlantRawMaterial.findMany({
      where: isAll ? { date } : { date, shiftId },
    });

    emitProductionSync({
      module: "tape-plant",
      sheet: "raw-material",
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
    console.error("Error saving Tape Plant raw materials:", error);
    return NextResponse.json({ error: "Failed to save raw materials" }, { status: 500 });
  }
}
