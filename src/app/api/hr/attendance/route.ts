import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { AttendanceProcessor } from "@/lib/hr/attendance-processor";
import { timewatchClient } from "@/lib/hr/timewatch-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.HR, Module.SETTINGS, Module.DATA_CENTRE],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const department = searchParams.get("department")?.trim();
  const shift = searchParams.get("shift")?.trim();
  const search = searchParams.get("search")?.trim().toLowerCase();

  try {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    // Check if daily records exist for this date
    const recordsCount = await db.dailyAttendance.count({
      where: { date: targetDate },
    });

    // If zero records, auto-sync from TimeWatch client and process date
    if (recordsCount === 0) {
      const syncResult = await timewatchClient.getPunchData({
        fromDate: dateStr,
        toDate: dateStr,
      });

      if (syncResult.success && syncResult.data.length > 0) {
        for (const p of syncResult.data) {
          const duplicate = await db.attendancePunch.findFirst({
            where: {
              employeeCode: p.employeeCode,
              punchTime: p.punchTime,
            },
          });

          if (!duplicate) {
            await db.attendancePunch.create({
              data: {
                employeeCode: p.employeeCode,
                employeeName: p.employeeName,
                punchTime: p.punchTime,
                direction: p.direction,
                verifyMode: p.verifyMode,
                deviceName: p.deviceName,
                source: "API_REALTIME",
                rawPayload: p.rawPayload || undefined,
              },
            });
          }
        }
      }

      // Process day records against dynamic Shifts
      await AttendanceProcessor.processDate(targetDate);
    }

    // Build filter query
    const where: any = { date: targetDate };

    if (department && department !== "ALL") {
      where.department = { equals: department, mode: "insensitive" };
    }

    if (shift && shift !== "ALL") {
      where.shiftName = { equals: shift, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { employeeName: { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const records = await db.dailyAttendance.findMany({
      where,
      orderBy: [{ status: "asc" }, { firstIn: "asc" }],
    });

    // Aggregate summary KPIs
    const allForDate = await db.dailyAttendance.findMany({
      where: { date: targetDate },
      select: { status: true, isLate: true, workHours: true },
    });

    const totalStaff = allForDate.length;
    const presentCount = allForDate.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
    const lateCount = allForDate.filter((r) => r.isLate).length;
    const absentCount = allForDate.filter((r) => r.status === "ABSENT").length;
    const halfDayCount = allForDate.filter((r) => r.status === "HALF_DAY").length;

    // Fetch dynamic active shifts for filter dropdowns
    const activeShifts = await db.shift.findMany({
      where: { isActive: true },
      select: { id: true, name: true, startTime: true, endTime: true },
    });

    return apiSuccess({
      date: dateStr,
      kpis: {
        totalStaff,
        presentCount,
        lateCount,
        absentCount,
        halfDayCount,
        attendancePct: totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0,
      },
      shifts: activeShifts,
      records,
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to fetch attendance records", 500);
  }
}
