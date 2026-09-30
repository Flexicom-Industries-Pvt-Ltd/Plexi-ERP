import * as XLSX from "xlsx";
import { ConvertexDailyReportData, computeConvertexTotals } from "./convertex-types";

export function exportConvertexReportExcel(report: ConvertexDailyReportData): void {
  const wb = XLSX.utils.book_new();
  const totals = computeConvertexTotals(report.entries);

  const rows: any[][] = [
    [report.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA"],
    ["CONVERTEX MACHINE - DAILY PRODUCTION REPORT"],
    [],
    [],
    [
      `Date: ${report.date} | Shift: ${report.shiftName} | Machine: ${report.machineNo || "Convertex-1"} | Operator: ${report.operatorName || "—"} | Supervisor: ${report.supervisorName || "—"} | Status: ${report.status}`,
    ],
    [],
    [],
    [],
    [
      "Sl. No.",
      "Company Name",
      "Unit name",
      "Grade",
      "Target Production (in pcs)",
      "Party Name",
      "Roll No.",
      "Loom No.",
      "Roll Mtr",
      "Net Wt",
      "Avg.",
      "Opening Meter Reading",
      "Closing Meter Reading",
      "Production (In Pcs)",
      "Loom Fabric Wastage (In Kg)",
      "Lam Fabric Wastage (In Kg)",
      "Print Fabric Wastage (In Kg)",
      "Machine Wastage (In Kg)",
      "Total Wastage (In Kg)",
      "Total Wastage (%)",
      "Total Wastage MTD (In Kg)",
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
      entry.partyName || "",
      entry.rollNumber || "",
      entry.loomNumber || "",
      Number(entry.rollMtr) || 0,
      Number(entry.netWeight) || 0,
      Number(entry.avgWeight) || 0,
      Number(entry.openingMeterReading) || 0,
      Number(entry.closingMeterReading) || 0,
      Number(entry.productionPcs) || 0,
      Number(entry.loomFabricWasteKg) || 0,
      Number(entry.lamFabricWasteKg) || 0,
      Number(entry.printFabricWasteKg) || 0,
      Number(entry.machineWasteKg) || 0,
      Number(entry.totalWastageKg) || 0,
      entry.totalWastagePct ? `${Number(entry.totalWastagePct).toFixed(2)}%` : "0%",
      Number(entry.totalWastageMtdKg) || 0,
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
    totals.totalProductionPcs,
    totals.totalLoomWasteKg,
    totals.totalLamWasteKg,
    totals.totalPrintWasteKg,
    totals.totalMachineWasteKg,
    totals.totalWastageKg,
    `${totals.totalWastagePct.toFixed(2)}%`,
    totals.totalWastageMtdKg,
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths matching the 22 columns
  ws["!cols"] = [
    { wch: 8 },  // Sl. No.
    { wch: 22 }, // Company Name
    { wch: 16 }, // Unit name
    { wch: 12 }, // Grade
    { wch: 24 }, // Target Production (in pcs)
    { wch: 20 }, // Party Name
    { wch: 14 }, // Roll No.
    { wch: 12 }, // Loom No.
    { wch: 14 }, // Roll Mtr
    { wch: 12 }, // Net Wt
    { wch: 12 }, // Avg.
    { wch: 22 }, // Opening Meter Reading
    { wch: 22 }, // Closing Meter Reading
    { wch: 20 }, // Production (In Pcs)
    { wch: 24 }, // Loom Fabric Wastage (In Kg)
    { wch: 24 }, // Lam Fabric Wastage (In Kg)
    { wch: 24 }, // Print Fabric Wastage (In Kg)
    { wch: 22 }, // Machine Wastage (In Kg)
    { wch: 20 }, // Total Wastage (In Kg)
    { wch: 18 }, // Total Wastage (%)
    { wch: 24 }, // Total Wastage MTD (In Kg)
    { wch: 24 }, // Remarks
  ];

  // Header merges matching rows 1, 2, and 5
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 21 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 21 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 21 } },
  ];

  const sheetName = "Daily Production Report";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeDate = (report.date || new Date().toISOString().slice(0, 10)).replace(/[^0-9-]/g, "");
  const safeShift = (report.shiftName || "Shift").replace(/\s+/g, "_");
  const fileName = `Flexicom_Convertex_Daily_Production_Report_${safeDate}_${safeShift}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
