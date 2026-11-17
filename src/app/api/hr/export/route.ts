import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import {
  generateDailyAttendanceExcel,
  generatePunchLogsExcel,
  convertToCsv,
} from "@/lib/hr/attendance-export";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.HR, Module.SETTINGS, Module.DATA_CENTRE],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "attendance"; // "attendance" or "punches"
  const format = searchParams.get("format") || "xlsx"; // "xlsx" or "csv"
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    if (type === "attendance") {
      const records = await db.dailyAttendance.findMany({
        where: { date: targetDate },
        orderBy: [{ department: "asc" }, { employeeName: "asc" }],
      });

      const exportData = records.map((r) => ({
        employeeCode: r.employeeCode,
        employeeName: r.employeeName,
        department: r.department,
        shiftName: r.shiftName || "DAY",
        firstIn: r.firstIn ? new Date(r.firstIn).toLocaleTimeString("en-IN") : undefined,
        lastOut: r.lastOut ? new Date(r.lastOut).toLocaleTimeString("en-IN") : undefined,
        workHours: r.workHours,
        overtimeHours: r.overtimeHours,
        status: r.status,
        isLate: r.isLate,
      }));

      if (format === "csv") {
        const csv = convertToCsv(exportData);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="Attendance_${dateStr}.csv"`,
          },
        });
      }

      const buffer = generateDailyAttendanceExcel(exportData, dateStr);
      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Daily_Attendance_${dateStr}.xlsx"`,
        },
      });
    } else {
      // Punches
      const punches = await db.attendancePunch.findMany({
        where: {
          punchTime: {
            gte: targetDate,
            lte: new Date(targetDate.getTime() + 86400000 - 1),
          },
        },
        orderBy: { punchTime: "desc" },
      });

      const exportData = punches.map((p) => ({
        id: p.id,
        employeeCode: p.employeeCode,
        employeeName: p.employeeName || undefined,
        punchTime: new Date(p.punchTime).toLocaleString("en-IN"),
        direction: p.direction,
        verifyMode: p.verifyMode || "Face",
        deviceName: p.deviceName || "IKOLAHA FACTORY",
        source: p.source,
      }));

      if (format === "csv") {
        const csv = convertToCsv(exportData);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="Punches_${dateStr}.csv"`,
          },
        });
      }

      const buffer = generatePunchLogsExcel(exportData, dateStr);
      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="Biometric_Punches_${dateStr}.xlsx"`,
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate export" },
      { status: 500 }
    );
  }
}

