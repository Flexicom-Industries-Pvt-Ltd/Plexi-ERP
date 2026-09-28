import * as XLSX from "xlsx";
import { LoomRollCuttingEntryItem, LoomRollCuttingReportData, RollCuttingKpis } from "./loom-roll-cutting-types";

export interface RollCuttingExportOptions {
  report: LoomRollCuttingReportData;
  entries: LoomRollCuttingEntryItem[];
  kpis?: RollCuttingKpis;
}

export function exportLoomRollCuttingExcel(options: RollCuttingExportOptions): void {
  const { report, entries, kpis } = options;
  const wb = XLSX.utils.book_new();
  const emptyRow: any[] = [];

  // -------------------------------------------------------------
  // Sheet 1: Daily Loom Roll Cutting Report (Physical Sheet Layout)
  // -------------------------------------------------------------
  const sheetHeader = [
    "S.No.",
    "ROLL NO.",
    "LOOM NO.",
    "SIZE",
    "QUALITY",
    "INITIAL READING",
    "FINAL READING",
    "METER",
    "GROSS WT. (KG)",
    "TARE WT. (KG)",
    "NETT WT. (KG)",
    "AVG. (G/M)",
    "SUP.SIGN.",
    "REMARKS",
  ];

  const dataRows = entries.map((entry, idx) => [
    idx + 1,
    entry.rollNumber || "—",
    `Loom #${entry.loomNumber}`,
    entry.size || "—",
    entry.qualityType || "—",
    entry.initialReading ?? 0,
    entry.finalReading ?? 0,
    entry.meter ?? 0,
    entry.grossWeightKg ?? 0,
    entry.tareWeightKg ?? 1.2,
    entry.nettWeightKg ?? 0,
    entry.avgWeightPerMeter ?? 0,
    entry.supervisorSign || report.supervisorName || "—",
    entry.remarks || "—",
  ]);

  const totalMeters = entries.reduce((s, e) => s + (Number(e.meter) || 0), 0);
  const totalGross = entries.reduce((s, e) => s + (Number(e.grossWeightKg) || 0), 0);
  const totalTare = entries.reduce((s, e) => {
    const t = e.tareWeightKg !== "" && e.tareWeightKg !== null && e.tareWeightKg !== undefined
      ? (!isNaN(Number(e.tareWeightKg)) ? Number(e.tareWeightKg) : 1.2)
      : 1.2;
    return s + t;
  }, 0);
  const totalNett = entries.reduce((s, e) => s + (Number(e.nettWeightKg) || 0), 0);
  const overallAvg = totalMeters > 0 && totalNett > 0 ? Math.round(((totalNett * 1000) / totalMeters) * 10) / 10 : 0;

  const totalsRow = [
    "TOTALS",
    `${entries.length} Rolls`,
    "—",
    "—",
    "—",
    "—",
    "—",
    totalMeters,
    Math.round(totalGross * 100) / 100,
    Math.round(totalTare * 100) / 100,
    Math.round(totalNett * 100) / 100,
    overallAvg,
    "—",
    "—",
  ];

  const wsData = [
    ["FLEXICOM INDUSTRIES PVT. LTD."],
    ["DAILY LOOM ROLL CUTTING REPORT"],
    emptyRow,
    ["Date:", report.date || "—", "Shift:", report.shiftName || "—", "Supervisor:", report.supervisorName || "—", "Status:", report.status || "DRAFT"],
    ["Total Rolls Cut:", entries.length, "Total Meters:", totalMeters, "Total Nett Wt (kg):", Math.round(totalNett * 100) / 100, "Avg Weight (g/m):", overallAvg],
    emptyRow,
    sheetHeader,
    ...dataRows,
    emptyRow,
    totalsRow,
    emptyRow,
    ["Exported from Flexicom Central ERP on:", new Date().toLocaleString()],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column width formatting
  ws["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 16 }, // Roll No
    { wch: 12 }, // Loom No
    { wch: 10 }, // Size
    { wch: 24 }, // Quality
    { wch: 16 }, // Initial Reading
    { wch: 16 }, // Final Reading
    { wch: 12 }, // Meter
    { wch: 16 }, // Gross Wt
    { wch: 14 }, // Tare Wt
    { wch: 16 }, // Nett Wt
    { wch: 14 }, // Avg (g/m)
    { wch: 14 }, // Sup Sign
    { wch: 26 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Roll Cutting Report");

  const cleanDate = (report.date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const cleanShift = (report.shiftName || "Shift").replace(/\s+/g, "_");
  const fileName = `Loom_Roll_Cutting_Report_${cleanDate}_${cleanShift}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
