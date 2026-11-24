import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { timewatchClient } from "@/lib/hr/timewatch-client";
import { AttendanceProcessor } from "@/lib/hr/attendance-processor";
import { PunchSource } from "@/generated/prisma";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Automated Background Biometric Sync Poller
 * Polls TimeWatch iDMS for new punches and triggers real-time daily aggregation
 */
export async function GET(request: NextRequest) {
  const authCheck = verifyCronRequest(request);
  if (!authCheck.ok) return authCheck.response;

  const { searchParams } = new URL(request.url);
  const targetDateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const syncRes = await timewatchClient.getPunchData({
      fromDate: targetDateStr,
      toDate: targetDateStr,
    });

    // Zero-Defect Rule: Never insert mock/simulated punches into real production database
    if (syncRes.isMock) {
      return apiSuccess({
        date: targetDateStr,
        newPunches: 0,
        isMock: true,
        message: "TimeWatch live device offline; mock punches ignored for production database integrity.",
      });
    }

    let newCount = 0;
    if (syncRes.success && syncRes.data.length > 0) {
      for (const p of syncRes.data) {
        const windowStart = new Date(p.punchTime.getTime() - 45000);
        const windowEnd = new Date(p.punchTime.getTime() + 45000);

        const created = await db.$transaction(async (tx) => {
          const exists = await tx.attendancePunch.findFirst({
            where: {
              employeeCode: p.employeeCode,
              punchTime: { gte: windowStart, lte: windowEnd },
            },
          });

          if (!exists) {
            return tx.attendancePunch.create({
              data: {
                employeeCode: p.employeeCode,
                employeeName: p.employeeName,
                punchTime: p.punchTime,
                direction: p.direction,
                verifyMode: p.verifyMode,
                deviceName: p.deviceName,
                source: PunchSource.API_POLL,
                rawPayload: p.rawPayload || undefined,
              },
            });
          }
          return null;
        });

        if (created) {
          newCount++;
        }
      }
    }

    // Process daily aggregates against dynamic Shifts
    await AttendanceProcessor.processDate(new Date(targetDateStr));

    return apiSuccess({
      date: targetDateStr,
      newPunches: newCount,
      isMock: syncRes.isMock,
      message: `Realtime background sync completed. ${newCount} new punches added.`,
    });
  } catch (err: any) {
    return apiError(err.message || "Background sync failed", 500);
  }
}

