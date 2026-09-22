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
    const records = await db.tapePlantDriveParameter.findMany({
      where: { date, shiftId },
      orderBy: { time: "asc" },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching Tape Plant drive parameters:", error);
    return NextResponse.json({ error: "Failed to fetch drive parameters" }, { status: 500 });
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
      await tx.tapePlantDriveParameter.deleteMany({
        where: { date, shiftId },
      });

      if (records.length > 0) {
        const validRecords = records
          .filter((r) => r.time && String(r.time).trim() !== "")
          .map((r) => ({
            date,
            shiftId,
            time: String(r.time).trim(),
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
          }));

        if (validRecords.length > 0) {
          await tx.tapePlantDriveParameter.createMany({
            data: validRecords,
          });
        }
      }
    });

    const updated = await db.tapePlantDriveParameter.findMany({
      where: { date, shiftId },
      orderBy: { time: "asc" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error saving Tape Plant drive parameters:", error);
    return NextResponse.json({ error: "Failed to save drive parameters" }, { status: 500 });
  }
}
