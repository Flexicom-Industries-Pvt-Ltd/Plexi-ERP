import * as XLSX from "xlsx";

export interface AttendanceExportRecord {
  employeeCode: string;
  employeeName: string;
  department: string;
  shiftName: string;
  firstIn?: string;
  lastOut?: string;
  workHours: number;
  overtimeHours: number;
  status: string;
  isLate: boolean;
  remarks?: string;
}

export interface PunchExportRecord {
  id: string;
  employeeCode: string;
  employeeName?: string;
  punchTime: string;
  direction: string;
  verifyMode?: string;
  deviceName?: string;
  source: string;
}

/**
 * Generates downloadable Excel (.xlsx) buffer for Daily Attendance Register
 */
export function generateDailyAttendanceExcel(records: AttendanceExportRecord[], dateStr: string): Buffer {
  const wb = XLSX.utils.book_new();

  // Summary Metrics
  const totalStaff = records.length;
  const present = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const late = records.filter((r) => r.isLate).length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const halfDay = records.filter((r) => r.status === "HALF_DAY").length;

  const header = [
    ["FLEXICOM INDUSTRIES PVT LTD - TIME OFFICE & ATTENDANCE REGISTER"],
    [`Attendance Date: ${dateStr}`, `Generated At: ${new Date().toLocaleString("en-IN")}`],
    [
      `Total Staff: ${totalStaff}`,
      `Present: ${present} (${totalStaff > 0 ? ((present / totalStaff) * 100).toFixed(1) : 0}%)`,
      `Late: ${late}`,
      `Absent: ${absent}`,
      `Half-Day: ${halfDay}`,
    ],
    [],
  ];

  const columns = [
    "S.No",
    "Employee Code",
    "Employee Name",
    "Department / Section",
    "Shift",
    "In Time",
    "Out Time",
    "Work Hours",
    "Overtime (Hrs)",
    "Attendance Status",
    "Late Arrival",
  ];

  const rows = records.map((r, idx) => [
    idx + 1,
    r.employeeCode,
    r.employeeName,
    r.department,
    r.shiftName,
    r.firstIn || "—",
    r.lastOut || "—",
    r.workHours.toFixed(2),
    r.overtimeHours.toFixed(2),
    r.status,
    r.isLate ? "YES (Late)" : "No",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...header, columns, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Daily Attendance");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Generates downloadable Excel (.xlsx) buffer for Raw Biometric Punch Logs
 */
export function generatePunchLogsExcel(punches: PunchExportRecord[], filterLabel: string): Buffer {
  const wb = XLSX.utils.book_new();

  const header = [
    ["FLEXICOM INDUSTRIES PVT LTD - BIOMETRIC RAW PUNCH LOGS"],
    [`Scope: ${filterLabel}`, `Generated At: ${new Date().toLocaleString("en-IN")}`],
    [`Total Punches Logged: ${punches.length}`],
    [],
  ];

  const columns = [
    "Log ID",
    "Employee Code",
    "Employee Name",
    "Punch Timestamp",
    "Direction",
    "Verification Mode",
    "Device / Station",
    "Ingestion Source",
  ];

  const rows = punches.map((p) => [
    p.id,
    p.employeeCode,
    p.employeeName || "—",
    p.punchTime,
    p.direction,
    p.verifyMode || "Face",
    p.deviceName || "IKOLAHA FACTORY",
    p.source,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([...header, columns, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Raw Punches");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Generates the official Sample Excel Import Template (.xlsx)
 */
export function generateAttendanceSampleTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  const instructions = [
    ["TIMEWATCH BIOMETRIC ATTENDANCE - IMPORT TEMPLATE GUIDELINES"],
    [],
    ["1. Mandatory Columns:", "Employee ID, Punch Date & Time"],
    ["2. Date & Time Format:", "YYYY-MM-DD HH:mm:ss (e.g. 2026-10-30 08:05:00)"],
    ["3. Direction values:", "IN, OUT, or AUTO (default is AUTO if left empty)"],
    ["4. Device Name:", "Optional. e.g. IKOLAHA FACTORY - Gate 1"],
    ["5. Do not rename or remove the column headers in Row 1."],
    [],
  ];

  const columns = [
    "Employee ID",
    "Employee Name",
    "Punch Date & Time",
    "Direction",
    "Device Name",
    "Verification Mode",
  ];

  const sampleRows = [
    ["369839", "Ramesh Sharma", "2026-10-30 07:55:00", "IN", "IKOLAHA FACTORY - Gate 1", "Face"],
    ["369839", "Ramesh Sharma", "2026-10-30 20:05:00", "OUT", "IKOLAHA FACTORY - Gate 1", "Face"],
    ["F100523", "Ajitesh Singh", "2026-10-30 08:02:00", "IN", "IKOLAHA FACTORY - Gate 1", "Finger"],
    ["F100523", "Ajitesh Singh", "2026-10-30 20:10:00", "OUT", "IKOLAHA FACTORY - Gate 1", "Finger"],
    ["9004", "Suraj Verma", "2026-10-30 08:18:00", "IN", "IKOLAHA FACTORY - Gate 1", "Face"],
  ];

  const templateWs = XLSX.utils.aoa_to_sheet([columns, ...sampleRows]);
  const infoWs = XLSX.utils.aoa_to_sheet(instructions);

  XLSX.utils.book_append_sheet(wb, templateWs, "Attendance_Import");
  XLSX.utils.book_append_sheet(wb, infoWs, "Instructions");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

/**
 * Converts array of objects to CSV string
 */
export function convertToCsv(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((obj) =>
    headers.map((h) => `"${String(obj[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

