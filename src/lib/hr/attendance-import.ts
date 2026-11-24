import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { PunchDirection, PunchSource } from "@/generated/prisma";
import { AttendanceProcessor } from "./attendance-processor";
import { parseTimeWatchTimestamp } from "./timewatch-client";

export interface ImportValidationResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: { row: number; error: string }[];
  preview: {
    employeeCode: string;
    employeeName?: string;
    punchTime: string;
    direction: string;
    deviceName?: string;
  }[];
}

export class AttendanceImportService {
  /**
   * Parse and validate uploaded Excel/CSV file buffer
   */
  static parseFile(buffer: Buffer): {
    records: {
      employeeCode: string;
      employeeName?: string;
      punchTime: Date;
      direction: PunchDirection;
      deviceName?: string;
      verifyMode?: string;
    }[];
    validation: ImportValidationResult;
  } {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const records: {
      employeeCode: string;
      employeeName?: string;
      punchTime: Date;
      direction: PunchDirection;
      deviceName?: string;
      verifyMode?: string;
    }[] = [];

    const errors: { row: number; error: string }[] = [];
    const preview: ImportValidationResult["preview"] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // header is row 1
      const code = String(
        row["Employee ID"] ||
          row["UserID"] ||
          row["Employee Code"] ||
          row["User ID"] ||
          row["EmpID"] ||
          ""
      ).trim();

      const name = String(row["Employee Name"] || row["Name"] || "").trim();
      const rawTime = String(
        row["Punch Date & Time"] ||
          row["PunchTime"] ||
          row["Date & Time"] ||
          row["DateTime"] ||
          row["Time"] ||
          ""
      ).trim();

      const rawDir = String(
        row["Direction"] ||
          row["Direction (IN / OUT)"] ||
          row["Direction(IN/OUT)"] ||
          row["InOutMode"] ||
          "AUTO"
      ).trim().toUpperCase();
      const deviceName = String(row["Device Name"] || row["Device"] || "Offline Import").trim();
      const verifyMode = String(row["Verification Mode"] || row["VerifyMode"] || "Manual / File").trim();

      if (!code) {
        errors.push({ row: rowNum, error: "Missing Employee ID" });
        return;
      }

      if (!rawTime) {
        errors.push({ row: rowNum, error: "Missing Punch Date & Time" });
        return;
      }

      const parsedTime = parseTimeWatchTimestamp(rawTime);
      if (isNaN(parsedTime.getTime())) {
        errors.push({ row: rowNum, error: `Invalid Date/Time format: "${rawTime}"` });
        return;
      }

      let direction: PunchDirection = PunchDirection.AUTO;
      if (rawDir.includes("IN") || rawDir === "0") direction = PunchDirection.IN;
      else if (rawDir.includes("OUT") || rawDir === "1") direction = PunchDirection.OUT;

      records.push({
        employeeCode: code,
        employeeName: name || undefined,
        punchTime: parsedTime,
        direction,
        deviceName,
        verifyMode,
      });

      if (preview.length < 15) {
        preview.push({
          employeeCode: code,
          employeeName: name || "—",
          punchTime: parsedTime.toLocaleString("en-IN"),
          direction,
          deviceName,
        });
      }
    });

    return {
      records,
      validation: {
        totalRows: rows.length,
        validRows: records.length,
        errorRows: errors.length,
        errors,
        preview,
      },
    };
  }

  /**
   * Commit parsed records to database and trigger daily aggregation
   */
  static async commitImport(
    records: {
      employeeCode: string;
      employeeName?: string;
      punchTime: Date;
      direction: PunchDirection;
      deviceName?: string;
      verifyMode?: string;
    }[]
  ): Promise<{ inserted: number; datesProcessed: number }> {
    if (records.length === 0) return { inserted: 0, datesProcessed: 0 };

    const distinctDates = new Set<string>();

    // Batch pre-fetch existing punches within the window across all records to eliminate N+1 roundtrips
    const timestamps = records.map((r) => r.punchTime.getTime());
    const minTime = new Date(Math.min(...timestamps) - 60000);
    const maxTime = new Date(Math.max(...timestamps) + 60000);
    const empCodes = Array.from(new Set(records.map((r) => r.employeeCode)));

    const existingPunches = await db.attendancePunch.findMany({
      where: {
        employeeCode: { in: empCodes },
        punchTime: {
          gte: minTime,
          lte: maxTime,
        },
      },
      select: {
        employeeCode: true,
        punchTime: true,
      },
    });

    // In-memory duplicate lookup index
    const punchesToCreate: Array<{
      employeeCode: string;
      employeeName?: string;
      punchTime: Date;
      direction: PunchDirection;
      verifyMode: string;
      deviceName: string;
      source: PunchSource;
    }> = [];

    const existingTimestampsByEmp = new Map<string, number[]>();

    for (const ep of existingPunches) {
      const times = existingTimestampsByEmp.get(ep.employeeCode) || [];
      times.push(ep.punchTime.getTime());
      existingTimestampsByEmp.set(ep.employeeCode, times);
    }

    for (const r of records) {
      const t = r.punchTime.getTime();
      const existingTimes = existingTimestampsByEmp.get(r.employeeCode) || [];
      const isDuplicate = existingTimes.some((time) => Math.abs(time - t) <= 60000);

      if (!isDuplicate) {
        punchesToCreate.push({
          employeeCode: r.employeeCode,
          employeeName: r.employeeName,
          punchTime: r.punchTime,
          direction: r.direction,
          verifyMode: r.verifyMode || "File Upload",
          deviceName: r.deviceName || "Offline Import",
          source: PunchSource.EXCEL_IMPORT,
        });
        existingTimes.push(t);
        existingTimestampsByEmp.set(r.employeeCode, existingTimes);
      }

      const dateKey = r.punchTime.toISOString().split("T")[0];
      distinctDates.add(dateKey);
    }

    let inserted = 0;
    if (punchesToCreate.length > 0) {
      const batchResult = await db.attendancePunch.createMany({
        data: punchesToCreate,
      });
      inserted = batchResult.count;
    }

    // Process daily aggregates for all affected dates
    for (const d of distinctDates) {
      await AttendanceProcessor.processDate(new Date(d));
    }

    return { inserted, datesProcessed: distinctDates.size };
  }
}
