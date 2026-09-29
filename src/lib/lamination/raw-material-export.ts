import * as XLSX from "xlsx";
import { LaminationRawMaterialReportData } from "./lamination-raw-material-types";

export function exportRawMaterialReportExcel(data: LaminationRawMaterialReportData): void {
  const wb = XLSX.utils.book_new();

  const totalPercentage = Number(
    data.entries.reduce((sum, e) => sum + (Number(e.percentage) || 0), 0).toFixed(1)
  );
  const manualTotal = Number(data.manualTotalKg.toFixed(2));
  const machineTotal = Number(data.machineTotalKg.toFixed(2));
  const diffTotal = Number(data.diffTotalKg.toFixed(2));

  const wsData: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED"],
    ["Sidco Industrial Estate, Ghatti Kathua, Phase-II, (J & K) 184143"],
    ["LAMINATION RAW MATERIAL CONSUMPTION & VARIANCE REPORT"],
    [
      "DATE:",
      data.date,
      "",
      "SHIFT:",
      data.shiftName,
      "",
      "OPERATOR:",
      data.operatorName || "—",
      "",
      "STATUS:",
      data.status,
    ],
    [],
    [
      "S.No.",
      "Raw Material Name",
      "Recipe %",
      "Manual Qty (kg)",
      "Machine Qty (kg)",
      "Diff (kg)",
      "Remarks",
    ],
  ];

  data.entries.forEach((entry, idx) => {
    wsData.push([
      idx + 1,
      entry.materialName,
      entry.percentage,
      entry.manualKg,
      entry.machineKg,
      entry.diffKg,
      entry.remarks || "",
    ]);
  });

  // Footer Totals
  wsData.push([
    "TOTAL",
    "",
    totalPercentage,
    manualTotal,
    machineTotal,
    diffTotal,
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = [
    { wch: 8 },  // S.No.
    { wch: 32 }, // Name
    { wch: 12 }, // %
    { wch: 16 }, // Manual Qty
    { wch: 16 }, // Machine Qty
    { wch: 14 }, // Diff
    { wch: 22 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Raw Materials");
  XLSX.writeFile(wb, `Lamination_Raw_Material_${data.date}_${data.shiftName.replace(/\s+/g, "_")}.xlsx`);
}
