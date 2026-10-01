import * as XLSX from "xlsx";
import {
  ConvertexDailyReportData,
  computeConvertexTotals,
  ConvertexWastageReportData,
  computeConvertexWastageTotals,
  ConvertexSummaryResult,
} from "./convertex-types";

export function exportConvertexReportExcel(report: ConvertexDailyReportData): void {
  const wb = XLSX.utils.book_new();
  const totals = computeConvertexTotals(report.entries);

  const rows: any[][] = [
    [report.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA"],
    ["CONVERTEX MACHINE - DAILY PRODUCTION REPORT"],
    [],
    [
      `Date: ${report.date} | Shift: ${report.shiftName} | Machine: ${report.machineNo || "Convertex-1"} | Operator: ${report.operatorName || "—"} | Supervisor: ${report.supervisorName || "—"} | Status: ${report.status}`,
    ],
    [],
    [
      "Sl. No.",
      "Company Name",
      "Unit Name",
      "Grade",
      "Target (Pcs)",
      "Quality",
      "Roll No.",
      "Loom No.",
      "Roll Mtr",
      "Net Wt (Kg)",
      "Avg. (g/m)",
      "Opening Meter Reading",
      "Closing Meter Reading",
      "Cover Patch OS",
      "Cover Patch DS",
      "Valve Patch",
      "Production (In Pcs)",
      "Production (In Kg)",
      "Remarks",
    ],
  ];

  report.entries.forEach((entry, idx) => {
    rows.push([
      entry.sequence || idx + 1,
      entry.companyName || "",
      entry.unitName || "",
      entry.grade || "",
      entry.targetProductionPcs || "",
      entry.quality || entry.partyName || "",
      entry.rollNumber || "",
      entry.loomNumber || "",
      Number(entry.rollMtr) || 0,
      Number(entry.netWeight) || 0,
      Number(entry.avgWeight) || 0,
      Number(entry.openingMeterReading) || 0,
      Number(entry.closingMeterReading) || 0,
      Number(entry.coverPatchOs) || 0,
      Number(entry.coverPatchDs) || 0,
      Number(entry.valvePatch) || 0,
      Number(entry.productionPcs) || 0,
      Number(entry.productionKg) || 0,
      entry.remarks || "",
    ]);
  });

  // Totals Row
  rows.push([
    "Total",
    "",
    "",
    "",
    totals.totalTargetPcs || "",
    `${totals.totalRolls} Rolls`,
    "",
    "",
    totals.totalRollMtr,
    totals.totalNetWt,
    totals.avgWeightGsm,
    "",
    "",
    totals.totalCoverPatchOs,
    totals.totalCoverPatchDs,
    totals.totalValvePatch,
    totals.totalProductionPcs,
    totals.totalProductionKg,
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 8 },  // Sl. No.
    { wch: 22 }, // Company Name
    { wch: 16 }, // Unit name
    { wch: 12 }, // Grade
    { wch: 16 }, // Target (Pcs)
    { wch: 20 }, // Quality
    { wch: 14 }, // Roll No.
    { wch: 12 }, // Loom No.
    { wch: 14 }, // Roll Mtr
    { wch: 14 }, // Net Wt (Kg)
    { wch: 12 }, // Avg.
    { wch: 22 }, // Opening Meter Reading
    { wch: 22 }, // Closing Meter Reading
    { wch: 16 }, // Cover Patch OS
    { wch: 16 }, // Cover Patch DS
    { wch: 14 }, // Valve Patch
    { wch: 20 }, // Production (In Pcs)
    { wch: 20 }, // Production (In Kg)
    { wch: 24 }, // Remarks
  ];

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 18 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 18 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 18 } },
  ];

  const sheetName = "Daily Production";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeDate = (report.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
  const safeShift = (report.shiftName || "Shift").replace(/\s+/g, "_");
  const fileName = `Convertex_Daily_Production_${safeDate}_${safeShift}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

export function exportConvertexWastageReportExcel(report: ConvertexWastageReportData): void {
  const wb = XLSX.utils.book_new();
  const totals = computeConvertexWastageTotals(report.entries);

  const rows: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA"],
    ["CONVERTEX MACHINE - WASTAGE REPORT"],
    [],
    [
      `Date: ${report.date} | Shift: ${report.shiftName} | Machine: ${report.machineNo || "Convertex-1"} | Operator: ${report.operatorName || "—"} | Supervisor: ${report.supervisorName || "—"} | Status: ${report.status}`,
    ],
    [],
    [
      "Sl. No.",
      "Quality",
      "Roll Number",
      "Production (Kg)",
      "Loom Waste (Kg)",
      "Loom Waste (%)",
      "Lam Waste (Kg)",
      "Lam Waste (%)",
      "Print Waste (Kg)",
      "Print Waste (%)",
      "Machine Waste (Kg)",
      "Machine Waste (%)",
      "Cover Patch Waste (Kg)",
      "Cover Patch Waste (%)",
      "Total Waste (Kg)",
      "Total Waste (%)",
      "Net Production (Kg)",
      "Remarks",
    ],
  ];

  report.entries.forEach((entry, idx) => {
    rows.push([
      entry.sequence || idx + 1,
      entry.quality || "",
      entry.rollNumber || "",
      Number(entry.productionKg) || 0,
      Number(entry.loomWasteKg) || 0,
      `${(entry.loomWastePct || 0).toFixed(2)}%`,
      Number(entry.lamWasteKg) || 0,
      `${(entry.lamWastePct || 0).toFixed(2)}%`,
      Number(entry.printWasteKg) || 0,
      `${(entry.printWastePct || 0).toFixed(2)}%`,
      Number(entry.machineWasteKg) || 0,
      `${(entry.machineWastePct || 0).toFixed(2)}%`,
      Number(entry.coverPatchWasteKg) || 0,
      `${(entry.coverPatchWastePct || 0).toFixed(2)}%`,
      Number(entry.totalWasteKg) || 0,
      `${(entry.totalWastePct || 0).toFixed(2)}%`,
      Number(entry.netProductionKg) || 0,
      entry.remarks || "",
    ]);
  });

  rows.push([
    "Total",
    "",
    `${report.entries.length} Rolls`,
    totals.totalProductionKg,
    totals.totalLoomWasteKg,
    `${totals.totalLoomWastePct.toFixed(2)}%`,
    totals.totalLamWasteKg,
    `${totals.totalLamWastePct.toFixed(2)}%`,
    totals.totalPrintWasteKg,
    `${totals.totalPrintWastePct.toFixed(2)}%`,
    totals.totalMachineWasteKg,
    `${totals.totalMachineWastePct.toFixed(2)}%`,
    totals.totalCoverPatchWasteKg,
    `${totals.totalCoverPatchWastePct.toFixed(2)}%`,
    totals.totalWastageKg,
    `${totals.totalWastagePct.toFixed(2)}%`,
    totals.totalNetProductionKg,
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 8 },  // Sl. No.
    { wch: 20 }, // Quality
    { wch: 16 }, // Roll Number
    { wch: 18 }, // Production (Kg)
    { wch: 16 }, // Loom Waste (Kg)
    { wch: 16 }, // Loom Waste (%)
    { wch: 16 }, // Lam Waste (Kg)
    { wch: 16 }, // Lam Waste (%)
    { wch: 16 }, // Print Waste (Kg)
    { wch: 16 }, // Print Waste (%)
    { wch: 18 }, // Machine Waste (Kg)
    { wch: 18 }, // Machine Waste (%)
    { wch: 22 }, // Cover Patch Waste (Kg)
    { wch: 22 }, // Cover Patch Waste (%)
    { wch: 18 }, // Total Waste (Kg)
    { wch: 16 }, // Total Waste (%)
    { wch: 20 }, // Net Production (Kg)
    { wch: 24 }, // Remarks
  ];

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 17 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 17 } },
  ];

  const sheetName = "Wastage Report";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeDate = (report.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
  const safeShift = (report.shiftName || "Shift").replace(/\s+/g, "_");
  const fileName = `Convertex_Wastage_Report_${safeDate}_${safeShift}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

export function exportConvertexSummaryExcel(
  summary: ConvertexSummaryResult,
  dateRange: string
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Quality Summary
  const qRows: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA"],
    ["CONVERTEX PRODUCTION SUMMARY - QUALITY WISE"],
    [`Period: ${dateRange}`],
    [],
    [
      "Quality",
      "Processed Rolls",
      "Total Mtrs",
      "Net Weight (Kg)",
      "Avg (g/m)",
      "Production (Pcs)",
      "Production (Kg)",
      "Cover Patch OS",
      "Cover Patch DS",
      "Valve Patch",
      "Total Waste (Kg)",
      "Waste (%)",
      "Net Production (Kg)",
    ],
  ];

  summary.qualities.forEach((q) => {
    qRows.push([
      q.quality,
      q.rollsCount,
      q.totalRollMtr,
      q.totalNetWt,
      q.avgGsm,
      q.productionPcs,
      q.productionKg,
      q.coverPatchOs,
      q.coverPatchDs,
      q.valvePatch,
      q.totalWasteKg,
      `${q.totalWastePct.toFixed(2)}%`,
      q.netProductionKg,
    ]);
  });

  qRows.push([
    "Total",
    summary.overall.totalRolls,
    summary.overall.totalRollMtr,
    summary.overall.totalNetWt,
    summary.overall.avgGsm,
    summary.overall.totalProductionPcs,
    summary.overall.totalProductionKg,
    summary.overall.totalCoverPatchOs,
    summary.overall.totalCoverPatchDs,
    summary.overall.totalValvePatch,
    summary.overall.totalWastageKg,
    `${summary.overall.totalWastagePct.toFixed(2)}%`,
    summary.overall.totalNetProductionKg,
  ]);

  const qWs = XLSX.utils.aoa_to_sheet(qRows);
  XLSX.utils.book_append_sheet(wb, qWs, "Quality Summary");

  // Sheet 2: Wastage Breakdown
  const wRows: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA"],
    ["CONVERTEX WASTAGE BREAKDOWN"],
    [`Period: ${dateRange}`],
    [],
    ["Wastage Stream", "Wastage (Kg)", "Wastage (%)"],
    ["Loom Wastage", summary.wastage.loomWasteKg, `${summary.wastage.loomWastePct.toFixed(2)}%`],
    ["Lam Wastage", summary.wastage.lamWasteKg, `${summary.wastage.lamWastePct.toFixed(2)}%`],
    ["Print Wastage", summary.wastage.printWasteKg, `${summary.wastage.printWastePct.toFixed(2)}%`],
    ["Machine Wastage", summary.wastage.machineWasteKg, `${summary.wastage.machineWastePct.toFixed(2)}%`],
    ["Cover Patch Wastage", summary.wastage.coverPatchWasteKg, `${summary.wastage.coverPatchWastePct.toFixed(2)}%`],
    ["TOTAL WASTAGE", summary.wastage.totalWasteKg, `${summary.wastage.totalWastePct.toFixed(2)}%`],
  ];

  const wWs = XLSX.utils.aoa_to_sheet(wRows);
  XLSX.utils.book_append_sheet(wb, wWs, "Wastage Breakdown");

  const fileName = `Convertex_Production_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
