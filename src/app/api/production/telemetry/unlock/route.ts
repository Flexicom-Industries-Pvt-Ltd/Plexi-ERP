import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { Module } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module");
  const date = searchParams.get("date");
  const shiftId = searchParams.get("shiftId");

  if (!moduleParam || !date || !shiftId) {
    return NextResponse.json(
      { error: "Missing required query parameters: module, date, shiftId" },
      { status: 400 }
    );
  }

  try {
    const records = await db.telemetryTimeSlotUnlock.findMany({
      where: {
        module: moduleParam,
        date,
        shiftId,
      },
      select: {
        id: true,
        timeSlot: true,
        unlockedAt: true,
        unlockedBy: true,
        notes: true,
      },
    });

    return NextResponse.json({
      success: true,
      unlockedSlots: records.map((r) => r.timeSlot),
      details: records,
    });
  } catch (error: any) {
    console.error("Failed to query unlocked time slots:", error);
    return NextResponse.json(
      { error: error.message || "Failed to query unlocked time slots" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUnlock = Boolean((session.user as any).canUnlockTimeSlots);
  if (!canUnlock) {
    return NextResponse.json(
      { error: "Forbidden: Your role does not have permission to override or unlock expired time slots." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { module, date, shiftId, timeSlot, notes } = body;

    if (!module || !date || !shiftId || !timeSlot) {
      return NextResponse.json(
        { error: "Missing required fields: module, date, shiftId, timeSlot" },
        { status: 400 }
      );
    }

    const userName = session.user.name || session.user.email || session.user.id || "Authorized User";

    const unlockRecord = await db.telemetryTimeSlotUnlock.upsert({
      where: {
        module_date_shiftId_timeSlot: {
          module,
          date,
          shiftId,
          timeSlot,
        },
      },
      create: {
        module,
        date,
        shiftId,
        timeSlot,
        unlockedBy: userName,
        notes: notes || null,
      },
      update: {
        unlockedAt: new Date(),
        unlockedBy: userName,
        notes: notes || null,
      },
    });

    try {
      logEvent({
        userId: session.user.id,
        module: Module.PRODUCTION,
        severity: "INFO",
        action: "UNLOCK_TIME_SLOT",
        payload: { entity: "TelemetryTimeSlotUnlock", entityId: unlockRecord.id },
        meta: { module, date, shiftId, timeSlot, unlockedBy: userName },
      });
    } catch (logErr) {
      console.warn("Audit log event failed for unlock:", logErr);
    }

    return NextResponse.json({
      success: true,
      unlocked: true,
      timeSlot,
      record: unlockRecord,
    });
  } catch (error: any) {
    console.error("Failed to unlock time slot:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unlock time slot" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUnlock = Boolean((session.user as any).canUnlockTimeSlots);
  if (!canUnlock) {
    return NextResponse.json(
      { error: "Forbidden: Your role does not have permission to override or re-lock time slots." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module");
  const date = searchParams.get("date");
  const shiftId = searchParams.get("shiftId");
  const timeSlot = searchParams.get("timeSlot");

  if (!moduleParam || !date || !shiftId || !timeSlot) {
    return NextResponse.json(
      { error: "Missing required query parameters: module, date, shiftId, timeSlot" },
      { status: 400 }
    );
  }

  try {
    await db.telemetryTimeSlotUnlock.deleteMany({
      where: {
        module: moduleParam,
        date,
        shiftId,
        timeSlot,
      },
    });

    try {
      logEvent({
        userId: session.user.id,
        module: Module.PRODUCTION,
        severity: "INFO",
        action: "RELOCK_TIME_SLOT",
        payload: { entity: "TelemetryTimeSlotUnlock", entityId: `${moduleParam}-${date}-${shiftId}-${timeSlot}` },
        meta: { module: moduleParam, date, shiftId, timeSlot },
      });
    } catch (logErr) {
      console.warn("Audit log event failed for relock:", logErr);
    }

    return NextResponse.json({
      success: true,
      unlocked: false,
      timeSlot,
    });
  } catch (error: any) {
    console.error("Failed to re-lock time slot:", error);
    return NextResponse.json(
      { error: error.message || "Failed to re-lock time slot" },
      { status: 500 }
    );
  }
}

