import * as XLSX from "xlsx";
import { LoomReadingEntryItem, IntervalKpiSummary } from "./loom-reading-types";

export interface ExportLoomReadingOptions {
  date: string;
  shiftName: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  timeSlots?: string[];
  initialTimeSlot?: string;
  entries: LoomReadingEntryItem[];
  kpis?: {
    totalLooms: number;
    runningLoomsCount: number;
    idleLoomsCount: number;
    totalShiftMeters: number;
    totalShiftKg: number;
    totalWastageKg: number;
    intervalTotals: IntervalKpiSummary[];
  };
  filterActiveOnly?: boolean;
}

export function exportLoomReadingSheetExcel(options: ExportLoomReadingOptions): void {
  const {
    date,
    shiftName,
    preparedBy = "—",
    checkedBy = "—",
    approvedBy = "—",
    timeSlots = ["10:00", "12:00", "02:00", "04:00", "06:00", "08:00"],
    initialTimeSlot = "08:00",
    entries,
    kpis,
    filterActiveOnly = false,
  } = options;

  const activeEntries = filterActiveOnly
    ? entries.filter((e) => e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0))
    : entries;

  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // SHEET 1: 2 HOURS LOOM PRODUCTION REPORT
  // -------------------------------------------------------------
  const reportRows: any[][] = [];

  // Title Block
  reportRows.push(["FLEXICOM INDUSTRIES PVT. LIMITED"]);
  reportRows.push(["SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143"]);
  reportRows.push(["2 HOUR'S LOOM PRODUCTION REPORT"]);
  reportRows.push([
    `Date: ${date}`,
    "",
    `Shift: ${shiftName}`,
    "",
    `Exported: ${new Date().toLocaleString()}`,
    "",
    `Scope: ${filterActiveOnly ? "Active Running Looms" : "All Circular Looms (1-91)"}`,
  ]);
  reportRows.push([]); // Empty row

  // Table Headers
  const slot1 = timeSlots[0] || "10:00";
  const slot2 = timeSlots[1] || "12:00";
  const slot3 = timeSlots[2] || "02:00";
  const slot4 = timeSlots[3] || "04:00";
  const slot5 = timeSlots[4] || "06:00";
  const slot6 = timeSlots[5] || "08:00";

  reportRows.push([
    "Loom No.",
    "Operator Name",
    "Size (mm)",
    "DNR",
    "Type / Quality",
    `I/R ${initialTimeSlot}`,
    `${slot1} Reading`,
    "PROD 1 (m)",
    `${slot2} Reading`,
    "PROD 2 (m)",
    `${slot3} Reading`,
    "PROD 3 (m)",
    `${slot4} Reading`,
    "PROD 4 (m)",
    `${slot5} Reading`,
    "PROD 5 (m)",
    `${slot6} Reading`,
    "PROD 6 (m)",
    "T PROD (Meters)",
    "Status",
    "Remarks",
  ]);

  // Data Rows
  activeEntries.forEach((e) => {
    reportRows.push([
      e.loomNumber,
      e.operatorName || "—",
      e.size || "—",
      e.denier || "—",
      e.qualityType || "—",
      e.initialReading !== null ? e.initialReading : "",
      e.r1Reading !== null ? e.r1Reading : "",
      e.r1Prod !== null && e.r1Prod > 0 ? e.r1Prod : e.r1Prod === 0 ? 0 : "",
      e.r2Reading !== null ? e.r2Reading : "",
      e.r2Prod !== null && e.r2Prod > 0 ? e.r2Prod : e.r2Prod === 0 ? 0 : "",
      e.r3Reading !== null ? e.r3Reading : "",
      e.r3Prod !== null && e.r3Prod > 0 ? e.r3Prod : e.r3Prod === 0 ? 0 : "",
      e.r4Reading !== null ? e.r4Reading : "",
      e.r4Prod !== null && e.r4Prod > 0 ? e.r4Prod : e.r4Prod === 0 ? 0 : "",
      e.r5Reading !== null ? e.r5Reading : "",
      e.r5Prod !== null && e.r5Prod > 0 ? e.r5Prod : e.r5Prod === 0 ? 0 : "",
      e.r6Reading !== null ? e.r6Reading : "",
      e.r6Prod !== null && e.r6Prod > 0 ? e.r6Prod : e.r6Prod === 0 ? 0 : "",
      e.totalProduction > 0 ? e.totalProduction : 0,
      e.status,
      e.remarks || "",
    ]);
  });

  // Calculate Totals
  const totalR1Prod = activeEntries.reduce((s, e) => s + (e.r1Prod || 0), 0);
  const totalR2Prod = activeEntries.reduce((s, e) => s + (e.r2Prod || 0), 0);
  const totalR3Prod = activeEntries.reduce((s, e) => s + (e.r3Prod || 0), 0);
  const totalR4Prod = activeEntries.reduce((s, e) => s + (e.r4Prod || 0), 0);
  const totalR5Prod = activeEntries.reduce((s, e) => s + (e.r5Prod || 0), 0);
  const totalR6Prod = activeEntries.reduce((s, e) => s + (e.r6Prod || 0), 0);
  const totalMeters = activeEntries.reduce((s, e) => s + (e.totalProduction || 0), 0);

  reportRows.push([]); // Empty row
  reportRows.push([
    "TOTAL INTERVAL PRODUCTION (M)",
    "",
    "",
    "",
    "",
    "",
    "",
    totalR1Prod,
    "",
    totalR2Prod,
    "",
    totalR3Prod,
    "",
    totalR4Prod,
    "",
    totalR5Prod,
    "",
    totalR6Prod,
    totalMeters,
    "",
    "",
  ]);

  // Progressive Cumulative Totals
  const prog1 = totalR1Prod;
  const prog2 = prog1 + totalR2Prod;
  const prog3 = prog2 + totalR3Prod;
  const prog4 = prog3 + totalR4Prod;
  const prog5 = prog4 + totalR5Prod;
  const prog6 = prog5 + totalR6Prod;

  reportRows.push([
    "PROGRESSIVE CUMULATIVE METERS",
    "",
    "",
    "",
    "",
    "",
    "",
    prog1,
    "",
    prog2,
    "",
    prog3,
    "",
    prog4,
    "",
    prog5,
    "",
    prog6,
    totalMeters,
    "",
    "",
  ]);

  reportRows.push([]);
  reportRows.push([
    `TOTAL LOOM PRODUCTION: ${totalMeters.toLocaleString()} Meters (${Math.round(totalMeters * 0.16 * 100) / 100} KG)`,
    "",
    "",
    `TOTAL RUNNING LOOMS: ${kpis?.runningLoomsCount || activeEntries.filter((e) => e.status === "RUNNING").length}`,
    "",
    `TOTAL IDLE LOOMS: ${kpis?.idleLoomsCount || activeEntries.filter((e) => e.status !== "RUNNING").length}`,
    "",
    `TOTAL WASTAGE: ${kpis?.totalWastageKg || 0} KG`,
  ]);

  reportRows.push([]);
  reportRows.push([
    `Prepared By: ${preparedBy}`,
    "",
    "",
    `Checked By: ${checkedBy}`,
    "",
    "",
    `Approved By: ${approvedBy}`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(reportRows);

  // Column Widths
  ws["!cols"] = [
    { wch: 10 }, // Loom No.
    { wch: 16 }, // Operator Name
    { wch: 10 }, // Size
    { wch: 10 }, // DNR
    { wch: 22 }, // Type
    { wch: 12 }, // I/R
    { wch: 12 }, // R1
    { wch: 12 }, // P1
    { wch: 12 }, // R2
    { wch: 12 }, // P2
    { wch: 12 }, // R3
    { wch: 12 }, // P3
    { wch: 12 }, // R4
    { wch: 12 }, // P4
    { wch: 12 }, // R5
    { wch: 12 }, // P5
    { wch: 12 }, // R6
    { wch: 12 }, // P6
    { wch: 16 }, // Total Prod
    { wch: 12 }, // Status
    { wch: 24 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, "2 Hours Production Sheet");

  const cleanDate = date.replace(/[^a-zA-Z0-9]/g, "");
  const cleanShift = shiftName.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Flexicom_Loom_2Hours_Report_${cleanDate}_${cleanShift}.xlsx`;

  XLSX.writeFile(wb, filename);
}
