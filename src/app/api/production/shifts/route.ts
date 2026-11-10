import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch active shifts from Shift Master
    let dbShifts = await db.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        isNightShift: true,
        isActive: true,
      },
    });

    // 2. If no shifts in Shift Master, seed default factory shifts
    if (!dbShifts || dbShifts.length === 0) {
      try {
        const defaultShifts = [
          { name: "Day Shift", startTime: "08:00", endTime: "20:00", isNightShift: false, isActive: true },
          { name: "Night Shift", startTime: "20:00", endTime: "08:00", isNightShift: true, isActive: true },
        ];
        for (const s of defaultShifts) {
          await db.shift.upsert({
            where: { name: s.name },
            update: { isActive: true },
            create: s,
          });
        }
        dbShifts = await db.shift.findMany({
          where: { isActive: true },
          orderBy: { startTime: "asc" },
        });
      } catch (seedErr) {
        console.warn("Could not seed default shifts:", seedErr);
      }
    }

    // 3. Fetch 24-Hour Day+Night combined shift configuration
    const config = await db.configParameter.findUnique({
      where: { key: "PRODUCTION_ENABLE_DAY_NIGHT_SHIFT" },
    });
    const allowDayNight = config ? config.value === "true" || config.value === "1" : true;

    const dayNightOption = {
      id: "DAY_NIGHT",
      name: "Day + Night (24h)",
      startTime: "08:00",
      endTime: "08:00",
      isDayNight: true,
      isNightShift: false,
    };

    return NextResponse.json({
      success: true,
      shifts: dbShifts,
      allowDayNight,
      dayNightOption: allowDayNight ? dayNightOption : null,
      allOptions: allowDayNight ? [...dbShifts, dayNightOption] : dbShifts,
    });
  } catch (error: any) {
    console.error("GET /api/production/shifts error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch production shifts" }, { status: 500 });
  }
}

