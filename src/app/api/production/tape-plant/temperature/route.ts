import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const readings = await db.tapePlantTemperatureReading.findMany({
      where: { date, shiftId },
      orderBy: { time: "asc" },
    });

    return NextResponse.json(readings, {
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
    const { date, shiftId, readings, operatorName, operatorId } = body;

    if (!date || !shiftId || !Array.isArray(readings)) {
      return NextResponse.json({ error: "Date, Shift, and Readings array are required" }, { status: 400 });
    }

    // Delete existing readings for date and shift and recreate clean spreadsheet state
    await db.$transaction(async (tx: any) => {
      await tx.tapePlantTemperatureReading.deleteMany({
        where: { date, shiftId },
      });

      if (readings.length > 0) {
        const validReadings = readings
          .filter((r) => r.time && String(r.time).trim() !== "")
          .map((r) => ({
            date,
            shiftId,
            time: String(r.time).trim(),
            operatorName: r.operatorName || operatorName || null,
            operatorId: r.operatorId || operatorId || null,
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
          }));

        if (validReadings.length > 0) {
          await tx.tapePlantTemperatureReading.createMany({
            data: validReadings,
          });
        }
      }
    });

    const updated = await db.tapePlantTemperatureReading.findMany({
      where: { date, shiftId },
      orderBy: { time: "asc" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error saving Tape Plant temperature readings:", error);
    return NextResponse.json({ error: "Failed to save temperature readings" }, { status: 500 });
  }
}
