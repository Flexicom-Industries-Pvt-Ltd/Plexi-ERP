import * as XLSX from "xlsx";
import { LoomRollStockItem, LoomRollStockSummary } from "./loom-roll-stock-types";

export interface RollStockExportOptions {
  rolls: LoomRollStockItem[];
  summary: LoomRollStockSummary;
  filterLabel?: string;
}

export function exportLoomRollStockExcel(options: RollStockExportOptions): void {
  const { rolls, summary, filterLabel = "All Active Stock" } = options;
  const wb = XLSX.utils.book_new();
  const emptyRow: any[] = [];

  // -------------------------------------------------------------
  // Sheet 1: Roll Stock Inventory (Detail List)
  // -------------------------------------------------------------
  const headerInfo = [
    ["FLEXICOM INDUSTRIES PVT LTD - CIRCULAR LOOM ROLL STOCK"],
    [`Filter Scope: ${filterLabel}`, `Generated At: ${new Date().toLocaleString("en-IN")}`],
    [`Total Rolls: ${summary.totalRolls}`, `Total Meters: ${summary.totalMeters.toLocaleString()} m`, `Total Nett Wt: ${summary.totalNettWeightKg.toFixed(2)} kg`],
    emptyRow,
  ];

  const rollHeaders = [
    "S.No.",
    "ROLL NUMBER",
    "QUALITY",
    "QUANTITY (METERS)",
    "QUANTITY (NETT KG)",
    "LOOM NO.",
    "SIZE (MM)",
    "GROSS WT. (KG)",
    "TARE WT. (KG)",
    "AVG (G/M)",
    "CUT DATE",
    "SHIFT",
    "CONTRACTOR",
    "SUPERVISOR",
    "REMARKS",
  ];

  const rollRows = rolls.map((r, idx) => [
    idx + 1,
    r.rollNumber || "—",
    r.qualityType || "—",
    r.meter ?? 0,
    r.nettWeightKg ?? 0,
    `Loom #${r.loomNumber}`,
    r.size || "—",
    r.grossWeightKg ?? 0,
    r.tareWeightKg ?? 1.2,
    r.avgWeightPerMeter ?? 0,
    r.date || "—",
    r.shiftName || "—",
    r.contractor || "In-House",
    r.supervisorSign || "—",
    r.remarks || "—",
  ]);

  const totalRow = [
    "TOTAL",
    `${summary.totalRolls} ROLLS`,
    "—",
    summary.totalMeters,
    summary.totalNettWeightKg,
    "—",
    "—",
    summary.totalGrossWeightKg,
    summary.totalTareWeightKg,
    summary.averageWeightPerMeter,
    "—",
    "—",
    "—",
    "—",
    "—",
  ];

  const wsRollsData = [...headerInfo, rollHeaders, ...rollRows, emptyRow, totalRow];
  const wsRolls = XLSX.utils.aoa_to_sheet(wsRollsData);

  wsRolls["!cols"] = [
    { wch: 8 },  // S.No
    { wch: 18 }, // Roll Number
    { wch: 24 }, // Quality
    { wch: 20 }, // Meters
    { wch: 20 }, // Nett Wt
    { wch: 14 }, // Loom No
    { wch: 12 }, // Size
    { wch: 16 }, // Gross Wt
    { wch: 14 }, // Tare Wt
    { wch: 14 }, // Avg g/m
    { wch: 14 }, // Cut Date
    { wch: 14 }, // Shift
    { wch: 20 }, // Contractor
    { wch: 16 }, // Supervisor
    { wch: 24 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, wsRolls, "Roll Stock Inventory");

  // -------------------------------------------------------------
  // Sheet 2: Quality-wise Stock Summary
  // -------------------------------------------------------------
  const qualityHeaders = [
    "S.No.",
    "QUALITY / RECIPE",
    "ROLLS COUNT",
    "TOTAL METERS (M)",
    "TOTAL GROSS WT. (KG)",
    "TOTAL NETT WT. (KG)",
    "AVG (G/M)",
    "% OF TOTAL WEIGHT",
  ];

  const qualityRows = summary.qualityBreakdown.map((q, idx) => [
    idx + 1,
    q.qualityType,
    q.rollsCount,
    q.totalMeters,
    q.totalGrossWeightKg,
    q.totalNettWeightKg,
    q.avgWeightPerMeter,
    `${q.percentageByWeight.toFixed(1)}%`,
  ]);

  const qualityTotalRow = [
    "TOTAL",
    `${summary.uniqueQualitiesCount} QUALITIES`,
    summary.totalRolls,
    summary.totalMeters,
    summary.totalGrossWeightKg,
    summary.totalNettWeightKg,
    summary.averageWeightPerMeter,
    "100.0%",
  ];

  const wsQualityData = [
    ["QUALITY-WISE ROLL STOCK BREAKDOWN"],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    emptyRow,
    qualityHeaders,
    ...qualityRows,
    emptyRow,
    qualityTotalRow,
  ];

  const wsQuality = XLSX.utils.aoa_to_sheet(wsQualityData);
  wsQuality["!cols"] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, wsQuality, "Quality Summary");

  // -------------------------------------------------------------
  // Write & Download
  // -------------------------------------------------------------
  const safeTimestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Loom_Roll_Stock_${safeTimestamp}.xlsx`);
}
