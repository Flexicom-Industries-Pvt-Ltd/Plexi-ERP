import * as XLSX from "xlsx";
import { PrintingDailyReportData } from "./printing-types";

export function exportPrintingReportExcel(report: PrintingDailyReportData): void {
  const wb = XLSX.utils.book_new();

  const machineTitle = (report.machineNo || "Machine-1").toUpperCase();
  const rows: any[][] = [
    [report.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED"],
    [`PRINTING ${machineTitle} — DAILY PRODUCTION REPORT`],
    ["Company Name ", report.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED"],
    ["Unit Name ", report.unitName || "Unit-1"],
    [
      `Date: ${report.date}`,
      `Shift: ${report.shiftName}`,
      `Operator: ${report.operatorName || "—"}`,
      `Supervisor: ${report.supervisorName || "—"}`,
      `Status: ${report.status}`,
    ],
    [], // Row 6 empty
    [
      "Sl. No.",
      "quality",
      "Roll No.",
      "Loom No.",
      "Production in Metre",
      "Net Wt.",
      "Avg.",
      "Print in Metre",
      "Remarks",
    ],
  ];

  report.entries.forEach((entry, idx) => {
    rows.push([
      idx + 1,
      entry.quality || "",
      entry.rollNumber || "",
      entry.loomNumber || "",
      Number(entry.productionMeter) || 0,
      Number(entry.netWeight) || 0,
      Number(entry.avgWeight) || 0,
      entry.printMeter !== "" && entry.printMeter !== null && entry.printMeter !== undefined
        ? Number(entry.printMeter)
        : "",
      entry.remarks || "",
    ]);
  });

  // Totals Row
  rows.push([
    "Total",
    "",
    "",
    "",
    report.totals.totalProductionMtrs,
    report.totals.totalNetWt,
    report.totals.avgWeightGsm,
    report.totals.totalPrintMtrs,
    `Variance: ${report.totals.varianceMtrs} m (${report.totals.efficiencyPercent}%)`,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Apply column widths
  ws["!cols"] = [
    { wch: 8 },  // Sl. No.
    { wch: 22 }, // quality
    { wch: 14 }, // Roll No.
    { wch: 12 }, // Loom No.
    { wch: 20 }, // Production in Metre
    { wch: 14 }, // Net Wt.
    { wch: 12 }, // Avg.
    { wch: 18 }, // Print in Metre
    { wch: 28 }, // Remarks
  ];

  // Title Merges (Row 1 and Row 2 across columns A to I)
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
  ];

  const sheetName = "Daily Production Report";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanDate = report.date.replace(/[^0-9-]/g, "");
  const cleanMachine = (report.machineNo || "Machine-1").replace(/\s+/g, "_");
  const fileName = `Flexicom_Printing_${cleanMachine}_Daily_Production_Report_${cleanDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
