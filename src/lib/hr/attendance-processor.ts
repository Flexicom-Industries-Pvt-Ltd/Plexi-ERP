import { db } from "@/lib/db";
import { AttendanceStatus } from "@/generated/prisma";

export interface ProcessedDailyRecord {
  date: Date;
  employeeCode: string;
  employeeName: string;
  department: string;
  shiftId?: string;
  shiftName: string;
  firstIn?: Date;
  lastOut?: Date;
  workHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  isLate: boolean;
}

export class AttendanceProcessor {
  /**
   * Process and aggregate punches for a specific date against dynamic Shifts
   */
  static async processDate(targetDate: Date): Promise<void> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Fetch dynamic shifts from DB (never hardcoded)
    const shifts = await db.shift.findMany({
      where: { isActive: true },
      orderBy: { startTime: "asc" },
    });

    // Default to Day Shift if none found
    const dayShift = shifts.find((s) => s.name.toUpperCase().includes("DAY") || s.name.includes("A")) || shifts[0];
    const nightShift = shifts.find((s) => s.name.toUpperCase().includes("NIGHT") || s.name.includes("B"));

    // 2. Fetch all punches for this date
    const punches = await db.attendancePunch.findMany({
      where: {
        punchTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { punchTime: "asc" },
    });

    // Group punches by employeeCode
    const employeePunchMap = new Map<string, typeof punches>();
    for (const p of punches) {
      const code = p.employeeCode.trim();
      if (!employeePunchMap.has(code)) {
        employeePunchMap.set(code, []);
      }
      employeePunchMap.get(code)!.push(p);
    }

    // Lookup known employees from Operator, Supervisor, User
    const [operators, supervisors, users] = await Promise.all([
      db.operator.findMany({ select: { code: true, name: true, section: true } }),
      db.supervisor.findMany({ select: { code: true, name: true, department: true } }),
      db.user.findMany({ select: { employeeId: true, name: true } }),
    ]);

    const employeeMetaMap = new Map<string, { name: string; department: string }>();
    operators.forEach((o) => {
      if (o.code) employeeMetaMap.set(o.code.trim(), { name: o.name, department: o.section || "PRODUCTION" });
    });
    supervisors.forEach((s) => {
      if (s.code) employeeMetaMap.set(s.code.trim(), { name: s.name, department: s.department || "MANAGEMENT" });
    });
    users.forEach((u) => {
      if (u.employeeId) employeeMetaMap.set(u.employeeId.trim(), { name: u.name || u.employeeId, department: "ADMIN" });
    });

    const headcountByDeptAndShift = new Map<string, number>();

    for (const [code, empPunches] of employeePunchMap.entries()) {
      const meta = employeeMetaMap.get(code) || {
        name: empPunches[0]?.employeeName || `Staff ${code}`,
        department: "GENERAL",
      };

      const firstPunch = empPunches[0]?.punchTime;
      const lastPunch = empPunches[empPunches.length - 1]?.punchTime;

      const firstIn = firstPunch;
      const lastOut = empPunches.length > 1 ? lastPunch : undefined;

      // Determine shift dynamically based on first in time
      const punchHour = firstIn ? firstIn.getHours() + firstIn.getMinutes() / 60 : 8;
      const assignedShift = punchHour >= 18 || punchHour < 6 ? nightShift || dayShift : dayShift;

      // Dynamic calculation parameters
      const gracePeriod = assignedShift?.gracePeriodMinutes ?? 15;
      const halfDayReq = assignedShift?.halfDayHours ?? 4.0;
      const fullDayReq = assignedShift?.fullDayHours ?? 8.0;

      // Calculate shift start time object
      let isLate = false;
      if (assignedShift && firstIn) {
        const [shiftHour, shiftMin] = assignedShift.startTime.split(":").map(Number);
        const shiftStartMins = shiftHour * 60 + shiftMin;
        const actualInMins = firstIn.getHours() * 60 + firstIn.getMinutes();
        if (actualInMins > shiftStartMins + gracePeriod) {
          isLate = true;
        }
      }

      // Work hours calculation
      let workHours = 0;
      if (firstIn && lastOut) {
        const diffMs = lastOut.getTime() - firstIn.getTime();
        workHours = Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
      } else if (firstIn) {
        // Single punch recorded so far (e.g. morning in)
        workHours = 4.0; // tentative active status
      }

      const overtimeHours = Math.max(0, parseFloat((workHours - fullDayReq).toFixed(2)));

      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      if (workHours === 0) {
        status = AttendanceStatus.ABSENT;
      } else if (workHours < halfDayReq && lastOut) {
        status = AttendanceStatus.HALF_DAY;
      } else if (isLate) {
        status = AttendanceStatus.LATE;
      }

      // Upsert DailyAttendance
      await db.dailyAttendance.upsert({
        where: {
          date_employeeCode: {
            date: startOfDay,
            employeeCode: code,
          },
        },
        update: {
          employeeName: meta.name,
          department: meta.department,
          shiftId: assignedShift?.id,
          shiftName: assignedShift?.name || "DAY",
          firstIn,
          lastOut,
          workHours,
          overtimeHours,
          status,
          isLate,
        },
        create: {
          date: startOfDay,
          employeeCode: code,
          employeeName: meta.name,
          department: meta.department,
          shiftId: assignedShift?.id,
          shiftName: assignedShift?.name || "DAY",
          firstIn,
          lastOut,
          workHours,
          overtimeHours,
          status,
          isLate,
        },
      });

      // Tally for Shift Headcount feed (H-04 & X-01)
      const deptKey = `${assignedShift?.name || "DAY"}::${meta.department.toUpperCase()}`;
      headcountByDeptAndShift.set(deptKey, (headcountByDeptAndShift.get(deptKey) || 0) + 1);
    }

    // 3. Update ShiftHeadcount for factory modules
    for (const [key, total] of headcountByDeptAndShift.entries()) {
      const [shiftName, dept] = key.split("::");
      await db.shiftHeadcount.upsert({
        where: {
          date_shiftName_department: {
            date: startOfDay,
            shiftName,
            department: dept,
          },
        },
        update: {
          totalReported: total,
          operatorsCount: Math.round(total * 0.8),
          helpersCount: Math.round(total * 0.2),
          isVerified: true,
        },
        create: {
          date: startOfDay,
          shiftName,
          department: dept,
          totalReported: total,
          operatorsCount: Math.round(total * 0.8),
          helpersCount: Math.round(total * 0.2),
          isVerified: true,
        },
      });
    }
  }
}
