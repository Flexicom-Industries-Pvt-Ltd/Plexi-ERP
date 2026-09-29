import * as XLSX from "xlsx";
import { LaminationProductionReportData, computeLaminationReportTotals } from "./lamination-types";

export function exportLaminationReportExcel(data: LaminationProductionReportData): void {
  const wb = XLSX.utils.book_new();
  const totals = computeLaminationReportTotals(data.entries);

  const wsData: any[][] = [
    ["FLEXICOM INDUSTRIES PVT. LIMITED"],
    ["Sidco Industrial Estate, Ghatti Kathua, Phase-II, (J & K) 184143"],
    ["LAMINATION PRODUCT REPORT"],
    [
      "DATE:",
      data.date,
      "",
      "SHIFT:",
      data.shiftName,
      "",
      "",
      "",
      "OPERATOR NAME:",
      data.operatorName || "—",
      "",
      "NO. OF HELPER:",
      String(data.helperCount || 0).padStart(2, "0"),
    ],
    [],
    [
      "S.No.",
      "Quality",
      "Width",
      "Loom No.",
      "Roll No.",
      "Roll Mtr.",
      "Net Wt.",
      "Avg Wt.",
      "Production",
      "Net Wt.",
      "Avg",
      "Coating",
      "Remarks",
    ],
  ];

  data.entries.forEach((entry, idx) => {
    wsData.push([
      entry.sequence || idx + 1,
      entry.quality || "",
      entry.size || "",
      entry.loomNumber || "",
      entry.rollNumber || "",
      entry.rollMeter > 0 ? entry.rollMeter : "",
      entry.netWeightBefore > 0 ? entry.netWeightBefore : "",
      entry.avgWeightBefore > 0 ? entry.avgWeightBefore : "",
      entry.productionMeter > 0 ? entry.productionMeter : "",
      entry.netWeightAfter > 0 ? entry.netWeightAfter : "",
      entry.avgWeightAfter > 0 ? entry.avgWeightAfter : "",
      entry.coating !== 0 ? entry.coating : "",
      entry.remarks || "",
    ]);
  });

  // Totals row
  wsData.push([
    "",
    "TOTAL",
    "",
    "",
    "",
    totals.totalRollMtrs,
    totals.totalNetWtBefore,
    totals.avgWtBefore,
    totals.totalProductionMtrs,
    totals.totalNetWtAfter,
    totals.avgWtAfter,
    totals.avgCoating,
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [
    { wch: 8 },  // S.No.
    { wch: 20 }, // Quality
    { wch: 10 }, // Width
    { wch: 10 }, // Loom No.
    { wch: 14 }, // Roll No.
    { wch: 12 }, // Roll Mtr.
    { wch: 12 }, // Net Wt. (Before)
    { wch: 12 }, // Avg Wt. (Before)
    { wch: 14 }, // Production
    { wch: 12 }, // Net Wt. (After)
    { wch: 10 }, // Avg (After)
    { wch: 12 }, // Coating (g/m)
    { wch: 22 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Lamination Product Report");

  const sanitizedDate = (data.date || "Report").replace(/[^a-zA-Z0-9_-]/g, "-");
  const sanitizedShift = (data.shiftName || "Shift").replace(/[^a-zA-Z0-9_-]/g, "-");
  const filename = `Flexicom_Lamination_Product_Report_${sanitizedDate}_${sanitizedShift}.xlsx`;

  XLSX.writeFile(wb, filename);
}
