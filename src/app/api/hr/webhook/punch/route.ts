import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { PunchDirection, PunchSource } from "@/generated/prisma";
import { AttendanceProcessor } from "@/lib/hr/attendance-processor";
import { parseTimeWatchTimestamp } from "@/lib/hr/timewatch-client";

export const dynamic = "force-dynamic";

/**
 * Inbound Real-Time Webhook for Biometric Punch Push
 * Called instantly when a worker punches on the TimeWatch biometric device
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support single punch object or array of punches
    const punches = Array.isArray(body) ? body : [body];
    if (punches.length === 0) {
      return apiError("Empty punch payload", 400);
    }

    const insertedIds: string[] = [];
    const affectedDates = new Set<string>();

    for (const p of punches) {
      const code = String(p.UserID || p.employeeCode || p.userId || "").trim();
      const rawTime = p.PunchTime || p.punchTime || p.dateTime;

      if (!code || !rawTime) continue;

      const punchTime = parseTimeWatchTimestamp(String(rawTime));
      const rawMode = String(p.InOutMode || p.direction || "0").trim();
      const direction: PunchDirection =
        rawMode === "0" || rawMode === "IN"
          ? PunchDirection.IN
          : rawMode === "1" || rawMode === "OUT"
          ? PunchDirection.OUT
          : PunchDirection.AUTO;

      const deviceSerial = String(p.DeviceID || p.deviceId || p.SerialNumber || "").trim();
      const device = deviceSerial ? await db.biometricDevice.findUnique({ where: { serialNumber: deviceSerial } }) : null;
      const deviceName = String(p.DeviceName || p.deviceName || device?.name || "IKOLAHA FACTORY").trim();
      const verifyMode = String(p.VerifyMode || p.verifyMode || "Face").trim();

      // Check duplicate within 45s window
      const windowStart = new Date(punchTime.getTime() - 45000);
      const windowEnd = new Date(punchTime.getTime() + 45000);

      const existing = await db.attendancePunch.findFirst({
        where: {
          employeeCode: code,
          punchTime: { gte: windowStart, lte: windowEnd },
        },
      });

      if (!existing) {
        const created = await db.attendancePunch.create({
          data: {
            employeeCode: code,
            employeeName: p.Name || p.name || undefined,
            punchTime,
            direction,
            verifyMode,
            deviceId: device?.id,
            deviceName,
            source: PunchSource.API_REALTIME,
            rawPayload: p,
          },
        });
        insertedIds.push(created.id);
      }

      const dateStr = punchTime.toISOString().split("T")[0];
      affectedDates.add(dateStr);
    }

    // Process daily attendance aggregates for all affected dates
    for (const d of affectedDates) {
      await AttendanceProcessor.processDate(new Date(d));
    }

    return apiSuccess({
      message: `Realtime punch ingested successfully. ${insertedIds.length} punches recorded.`,
      count: insertedIds.length,
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to process punch webhook", 500);
  }
}
