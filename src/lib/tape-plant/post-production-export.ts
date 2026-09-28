import * as XLSX from "xlsx";
import { PostProductionPrintData } from "./print-post-production-sheet";

export function exportTapePlantPostProductionExcel(data: PostProductionPrintData): void {
  const { date, shiftName, operatorName, status, entries } = data;
  const wb = XLSX.utils.book_new();

  const titleRow = [
    "FLEXICOM INDUSTRIES PVT. LTD. - TAPE PLANT POST-PRODUCTION REPORT",
  ];
  const metaRow = [
    `Date: ${date}`,
    `Shift: ${shiftName}`,
    `Operator: ${operatorName || "—"}`,
    `Status: ${status}`,
    `Total Runs: ${entries.length}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];

  const headers = [
    "Run #",
    "Recipe Quality",
    "Planned Qty (KG)",
    "Production Done (KG)",
    "Gap (KG)",
    "Waste (KG)",
    "Waste (%)",
    "Net Output (KG)",
    "Efficiency (%)",
    "Remarks",
  ];

  const totalPlanned = entries.reduce((s, e) => s + (Number(e.plannedProductionKg) || 0), 0);
  const totalDone = entries.reduce((s, e) => s + (Number(e.productionDoneKg) || 0), 0);
  const totalGap = totalPlanned - totalDone;
  const totalWaste = entries.reduce((s, e) => s + (Number(e.wasteKg) || 0), 0);
  const totalNet = totalDone - totalWaste;
  const totalWastePct = totalDone > 0 ? Number(((totalWaste / totalDone) * 100).toFixed(1)) : 0;
  const totalEfficiency = totalPlanned > 0 ? Math.round((totalNet / totalPlanned) * 100) : 0;

  const dataRows = entries.map((entry, index) => {
    const planned = Number(entry.plannedProductionKg) || 0;
    const done = Number(entry.productionDoneKg) || 0;
    const gap = planned - done;
    const waste = Number(entry.wasteKg) || 0;
    const wastePct = done > 0 ? Number(((waste / done) * 100).toFixed(1)) : 0;
    const net = done - waste;
    const eff = planned > 0 ? Math.round((net / planned) * 100) : (done > 0 ? 100 : 0);

    return [
      index + 1,
      entry.recipeQuality,
      planned,
      done,
      gap,
      waste,
      wastePct,
      net,
      eff,
      entry.remarks || "",
    ];
  });

  const totalsRow = [
    "TOTALS",
    `${entries.length} Runs`,
    totalPlanned,
    totalDone,
    totalGap,
    totalWaste,
    totalWastePct,
    totalNet,
    totalEfficiency,
    "",
  ];

  const sheetData = [
    titleRow,
    metaRow,
    [],
    headers,
    ...dataRows,
    totalsRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws["!cols"] = [
    { wch: 8 },  // Run
    { wch: 28 }, // Recipe
    { wch: 18 }, // Planned
    { wch: 22 }, // Done
    { wch: 14 }, // Gap
    { wch: 14 }, // Waste
    { wch: 12 }, // Waste %
    { wch: 18 }, // Net
    { wch: 14 }, // Efficiency %
    { wch: 25 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Post-Production Report");

  const cleanDate = date.replace(/[^a-zA-Z0-9]/g, "-");
  const cleanShift = shiftName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Tape_Plant_Post_Production_${cleanDate}_${cleanShift}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
