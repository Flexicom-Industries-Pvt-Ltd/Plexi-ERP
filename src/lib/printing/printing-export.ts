import * as XLSX from "xlsx";
import { PrintingDailyReportData } from "./printing-types";

export function exportPrintingReportExcel(report: PrintingDailyReportData): void {
  const wb = XLSX.utils.book_new();

  const rows: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED"],
    ["PRINTING MACHINE — DAILY PRODUCTION REPORT"],
    [null, null, null, null, null, null, " "],
    [],
    [],
    [],
    [
      "Sl. No.",
      "Company Name",
      "Unit Name",
      "Grade ",
      "Target Production (in metre) ",
      "Drum Size/Cut Length",
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
      entry.companyName || "",
      entry.unitName || "",
      entry.grade || "",
      entry.targetProductionMtrs !== "" && entry.targetProductionMtrs !== null && entry.targetProductionMtrs !== undefined
        ? Number(entry.targetProductionMtrs)
        : "",
      entry.drumSize || "",
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
    report.totals.totalTargetMtrs || "",
    "",
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
    { wch: 22 }, // Company Name
    { wch: 16 }, // Unit Name
    { wch: 14 }, // Grade
    { wch: 24 }, // Target Production
    { wch: 20 }, // Drum Size/Cut Length
    { wch: 20 }, // quality
    { wch: 14 }, // Roll No.
    { wch: 12 }, // Loom No.
    { wch: 20 }, // Production in Metre
    { wch: 14 }, // Net Wt.
    { wch: 12 }, // Avg.
    { wch: 18 }, // Print in Metre
    { wch: 26 }, // Remarks
  ];

  // Title Merges (Row 1 and Row 2 across all columns A to N)
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } },
  ];

  const sheetName = "Daily Production Report";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanDate = (report.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
  const fileName = `Flexicom_Printing_Daily_Production_Report_${cleanDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
