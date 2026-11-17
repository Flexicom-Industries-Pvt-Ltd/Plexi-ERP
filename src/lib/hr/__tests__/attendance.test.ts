import { describe, it, expect } from "vitest";
import { parseTimeWatchTimestamp } from "../timewatch-client";
import {
  generateDailyAttendanceExcel,
  generatePunchLogsExcel,
  generateAttendanceSampleTemplate,
} from "../attendance-export";
import { AttendanceImportService } from "../attendance-import";
import * as XLSX from "xlsx";

describe("TimeWatch & Attendance Unit Tests", () => {
  describe("parseTimeWatchTimestamp", () => {
    it("should parse standard ISO string", () => {
      const dt = parseTimeWatchTimestamp("2026-10-30T08:15:00");
      expect(dt.getFullYear()).toBe(2026);
      expect(dt.getMonth()).toBe(9); // 0-indexed month
      expect(dt.getDate()).toBe(30);
    });

    it("should parse space-delimited datetime format (YYYY-MM-DD HH:mm:ss)", () => {
      const dt = parseTimeWatchTimestamp("2026-10-30 08:30:00");
      expect(dt.getFullYear()).toBe(2026);
      expect(dt.getMonth()).toBe(9);
      expect(dt.getDate()).toBe(30);
    });

    it("should handle ISO string with timezone offset", () => {
      const dt = parseTimeWatchTimestamp("2026-10-30T08:00:00+05:30");
      expect(dt.getTime()).not.toBeNaN();
    });

    it("should return invalid date for unparseable input", () => {
      const dt = parseTimeWatchTimestamp("invalid-datetime");
      expect(isNaN(dt.getTime())).toBe(true);
    });
  });

  describe("Attendance Export Helpers", () => {
    it("should generate a valid Daily Attendance Excel buffer", () => {
      const mockRecords = [
        {
          employeeCode: "369839",
          employeeName: "Ramesh Sharma",
          department: "LOOM",
          shiftName: "DAY",
          firstIn: "08:02 AM",
          lastOut: "08:05 PM",
          workHours: 12.05,
          overtimeHours: 0.05,
          status: "PRESENT",
          isLate: false,
        },
      ];

      const buffer = generateDailyAttendanceExcel(mockRecords, "2026-10-30");
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);

      const wb = XLSX.read(buffer, { type: "buffer" });
      expect(wb.SheetNames).toContain("Daily Attendance");
    });

    it("should generate a valid Punch Logs Excel buffer", () => {
      const mockPunches = [
        {
          id: "punch-1",
          employeeCode: "F100523",
          employeeName: "Ajitesh Singh",
          punchTime: "2026-10-30 08:00:00",
          direction: "IN",
          verifyMode: "Finger",
          deviceName: "IKOLAHA GATE",
          source: "API_REALTIME",
        },
      ];

      const buffer = generatePunchLogsExcel(mockPunches, "Today");
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);

      const wb = XLSX.read(buffer, { type: "buffer" });
      expect(wb.SheetNames).toContain("Raw Punches");
    });

    it("should generate a valid Sample Template with instructional headers", () => {
      const buffer = generateAttendanceSampleTemplate();
      expect(buffer).toBeDefined();
      const wb = XLSX.read(buffer, { type: "buffer" });
      expect(wb.SheetNames).toContain("Attendance_Import");
      expect(wb.SheetNames).toContain("Instructions");
    });
  });

  describe("Attendance Import Service", () => {
    it("should parse and validate an Excel buffer with valid punches", () => {
      const rows = [
        {
          "Employee Code": "EMP-001",
          "Employee Name": "Test Operator",
          "Punch Date & Time": "2026-10-30 08:05:00",
          "Direction (IN / OUT)": "IN",
          "Device Name": "IKOLAHA GATE",
        },
        {
          "Employee Code": "EMP-001",
          "Employee Name": "Test Operator",
          "Punch Date & Time": "2026-10-30 20:05:00",
          "Direction (IN / OUT)": "OUT",
          "Device Name": "IKOLAHA GATE",
        },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const parsed = AttendanceImportService.parseFile(buffer);
      expect(parsed.validation.totalRows).toBe(2);
      expect(parsed.validation.validRows).toBe(2);
      expect(parsed.validation.errorRows).toBe(0);
      expect(parsed.records.length).toBe(2);
      expect(parsed.records[0].direction).toBe("IN");
      expect(parsed.records[1].direction).toBe("OUT");
    });

    it("should report errors when mandatory fields are missing or invalid", () => {
      const rows = [
        {
          "Employee Code": "", // missing
          "Punch Date & Time": "2026-10-30 08:05:00",
          "Direction (IN / OUT)": "IN",
        },
        {
          "Employee Code": "EMP-002",
          "Punch Date & Time": "invalid-datetime",
          "Direction (IN / OUT)": "IN",
        },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const parsed = AttendanceImportService.parseFile(buffer);
      expect(parsed.validation.totalRows).toBe(2);
      expect(parsed.validation.errorRows).toBe(2);
      expect(parsed.validation.errors.length).toBe(2);
    });
  });
});

