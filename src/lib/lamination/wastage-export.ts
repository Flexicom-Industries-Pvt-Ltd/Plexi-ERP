import * as XLSX from "xlsx";
import { LaminationWastageReportData } from "./lamination-wastage-types";

export function exportWastageReportExcel(data: LaminationWastageReportData): void {
  const wb = XLSX.utils.book_new();

  const wsData: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED"],
    ["Sidco Industrial Estate, Ghatti Kathua, Phase-II, (J & K) 184143"],
    ["LAMINATION SHIFT WASTAGE & SCRAP REPORT"],
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
      "CONTRACTOR:",
      data.contractorName || "—",
    ],
    [],
    [
      "S.No.",
      "Wastage Type",
      "Base Input Material (Source)",
      "Base Qty (kg)",
      "Wastage (kg)",
      "Wastage %",
    ],
    [
      1,
      "Lumps",
      "Raw Material Used (Manual Total)",
      data.rawMaterialUsedKg,
      data.lumpsWastageKg,
      `${data.lumpsWastagePct}%`,
    ],
    [
      2,
      "Fabric",
      "Production Sheet Total Net Weight",
      data.fabricNetWeightKg,
      data.fabricWastageKg,
      `${data.fabricWastagePct}%`,
    ],
    [
      "TOTAL",
      "",
      "Total Shift Reconciliation",
      data.totalBaseKg,
      data.totalWastageKg,
      `${data.totalWastagePct}%`,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 8 },  // S.No.
    { wch: 18 }, // Type
    { wch: 38 }, // Source
    { wch: 16 }, // Base Qty
    { wch: 16 }, // Wastage Qty
    { wch: 14 }, // %
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Wastage Report");
  XLSX.writeFile(wb, `Lamination_Wastage_${data.date}_${data.shiftName.replace(/\s+/g, "_")}.xlsx`);
}
