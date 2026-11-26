import * as XLSX from "xlsx";
import {
  RpProductionReportData,
  RpWastageCollectionData,
} from "./rp-types";

export function exportWastageCollectionExcel(data: RpWastageCollectionData): void {
  const wb = XLSX.utils.book_new();
  const shifts = data.shiftNames.length > 0 ? data.shiftNames : ["Day Shift", "Night Shift"];

  const headerCols = [
    "SECTION",
    "COLOUR / TYPE",
    ...shifts.flatMap((s) => [`${s.toUpperCase()} (KG)`, `${s.toUpperCase()} MTD`]),
    "TOTAL (KG)",
  ];

  const rows: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED"],
    ["WASTAGE COLLECTION REPORT"],
    [
      "DATE:",
      data.date,
      "",
      "SHIFTS:",
      shifts.join(" + "),
      "",
      "SL. NO.:",
      String(data.serialNo).padStart(3, "0"),
      "",
      "OPERATOR:",
      data.operatorName || "—",
    ],
    [],
    headerCols,
  ];

  for (const sec of data.sections) {
    for (const r of sec.rows) {
      rows.push([
        sec.title,
        r.label,
        ...shifts.flatMap((s) => [r.shifts[s] || 0, r.mtdShifts[s] || 0]),
        r.total,
      ]);
    }
    rows.push([
      sec.title,
      "SECTION TOTAL",
      ...shifts.flatMap((s) => [
        sec.sectionShiftTotals[s] || 0,
        sec.sectionMtdShiftTotals[s] || 0,
      ]),
      sec.sectionTotal,
    ]);
    rows.push([]);
  }

  // Summary Box
  rows.push(["SUMMARY"]);
  for (const sec of data.sections) {
    rows.push([sec.title, sec.sectionTotal]);
  }
  rows.push(["SUMMARY TOTAL (KG)", data.summaryTotalKg]);
  rows.push([]);

  // Margin Blocks
  rows.push(["BOBBIN CLEANING", "DAY (KG)", "MTD (KG)"]);
  for (const bc of data.marginBlocks.bobbinCleaning.rows) {
    rows.push([bc.label, bc.day, bc.mtd]);
  }
  rows.push([
    "TOTAL BOBBIN CLEANING",
    data.marginBlocks.bobbinCleaning.totalDay,
    data.marginBlocks.bobbinCleaning.totalMtd,
  ]);
  rows.push([]);

  rows.push(["SEGREGATION", "QTY (KG)"]);
  for (const seg of data.marginBlocks.segregation.rows) {
    rows.push([seg.label, seg.qty]);
  }
  rows.push(["TOTAL SEGREGATION", data.marginBlocks.segregation.total]);
  rows.push([]);

  rows.push(["OLD BOBBIN CUTTING", "DAY (KG)", "MTD (KG)"]);
  for (const obc of data.marginBlocks.oldBobbinCutting.rows) {
    rows.push([obc.label, obc.day, obc.mtd]);
  }
  rows.push([
    "TOTAL OLD BOBBIN CUTTING",
    data.marginBlocks.oldBobbinCutting.totalDay,
    data.marginBlocks.oldBobbinCutting.totalMtd,
  ]);
  rows.push([
    "CUTTEX SMALL ROLL WASTAGE",
    data.marginBlocks.oldBobbinCutting.cuttexSmallRollWastage,
  ]);
  rows.push([]);

  rows.push(["NOTE / RECONCILIATION", "QTY (KG)"]);
  rows.push(["B. Cleaning", data.marginBlocks.noteBox.bCleaning]);
  rows.push(["RP Lums", data.marginBlocks.noteBox.rpLums]);
  rows.push(["Summary", data.marginBlocks.noteBox.summary]);
  rows.push(["GRAND TOTAL", data.marginBlocks.noteBox.total]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 24 },
    { wch: 22 },
    ...shifts.flatMap(() => [{ wch: 15 }, { wch: 14 }]),
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Wastage Collection");
  XLSX.writeFile(wb, `RP_Wastage_Collection_${data.date}.xlsx`);
}

export function exportRpProductionExcel(data: RpProductionReportData): void {
  const wb = XLSX.utils.book_new();
  const shifts = data.shiftNames.length > 0 ? data.shiftNames : ["Day Shift", "Night Shift"];

  const headerCols = [
    "No.",
    "Particulars",
    "Colors",
    "Opening Stock",
    ...shifts.map((s) => `Prod (${s})`),
    "Prod Total",
    "Production MTD",
    "Issued to Tape Plant",
    "Issued to TP MTD",
    "Lumps on Date",
    "Lumps MTD",
    "Dispatch on Date",
    "Dispatch MTD",
    "Closing Stock",
    "Remarks",
  ];

  const wsRows: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED, GHATTI (KATHUA)"],
    ["R.P. PLANT PRODUCTION REPORT"],
    [
      "DATE:",
      data.date,
      "",
      "SHIFTS:",
      shifts.join(" + "),
      "",
      "SR. NO.:",
      String(data.serialNo).padStart(3, "0"),
      "",
      "OPERATOR:",
      data.operatorName || "—",
    ],
    [],
    headerCols,
  ];

  for (const r of data.rows) {
    wsRows.push([
      r.seq,
      r.particular,
      r.color || "—",
      r.isLumpsOnly ? "—" : r.openingStock,
      ...shifts.map((s) => r.productionShifts[s] || 0),
      r.productionTotal,
      r.productionMtd,
      r.issuedToTapePlant,
      r.issuedToTapePlantMtd,
      r.lumpsOnDate,
      r.lumpsMtd,
      r.dispatchOnDate,
      r.dispatchMtd,
      r.isLumpsOnly ? "—" : r.closingStock,
      r.remarks || "",
    ]);
  }

  wsRows.push([
    "TOTAL",
    "",
    "",
    data.totalOpeningStock,
    ...shifts.map((s) => data.shiftProductionTotals?.[s] || 0),
    data.totalProductionOnDate,
    data.totalProductionMtd,
    data.totalIssuedToTapePlant,
    data.totalIssuedToTapePlantMtd,
    data.totalLumpsOnDate,
    data.totalLumpsMtd,
    data.totalDispatchOnDate,
    data.totalDispatchMtd,
    data.totalClosingStock,
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsRows);
  ws["!cols"] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    ...shifts.map(() => ({ wch: 12 })),
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "RP Production Report");
  XLSX.writeFile(wb, `RP_Plant_Production_${data.date}.xlsx`);
}
