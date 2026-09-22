import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
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
    const records = await db.tapePlantRawMaterial.findMany({
      where: { date, shiftId },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching Tape Plant raw materials:", error);
    return NextResponse.json({ error: "Failed to fetch raw materials" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { date, shiftId, records } = body;

    if (!date || !shiftId || !Array.isArray(records)) {
      return NextResponse.json({ error: "Date, Shift, and Records array are required" }, { status: 400 });
    }

    await db.$transaction(async (tx: any) => {
      await tx.tapePlantRawMaterial.deleteMany({
        where: { date, shiftId },
      });

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
              shiftId,
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
      where: { date, shiftId },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error saving Tape Plant raw materials:", error);
    return NextResponse.json({ error: "Failed to save raw materials" }, { status: 500 });
  }
}
