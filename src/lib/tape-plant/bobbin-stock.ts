import * as XLSX from "xlsx";

export const BOBBIN_WEIGHT_KG = 1.6;
export const CRATE_WEIGHT_KG = 12.8;
export const BOBBINS_PER_CRATE = 8; // 12.8 / 1.6 = 8 bobbins per crate

export interface BobbinStockItem {
  slNo: number;
  id?: string;
  recipeQuality: string;
  productionDoneKg: number;
  wasteKg: number;
  netProductionKg: number;
  bobbinStock: number;
  crateStock: number;
  shiftName?: string;
  remarks?: string;
}

export interface BobbinStockTotals {
  totalGrossDoneKg: number;
  totalWasteKg: number;
  totalNetProductionKg: number;
  totalBobbinStock: number;
  totalCrateStock: number;
  uniqueQualitiesCount: number;
}

/**
 * Calculates net production output in KG after deducting wastage.
 */
export function computeNetProductionKg(
  productionDoneKg: number | string | undefined | null,
  wasteKg: number | string | undefined | null
): number {
  const done = Number(productionDoneKg) || 0;
  const waste = Number(wasteKg) || 0;
  return Math.max(0, Number((done - waste).toFixed(2)));
}

/**
 * Calculates stock of bobbins: Net Output (kg) / 1.6 kg
 */
export function computeBobbinStockCount(netProductionKg: number | string | undefined | null): number {
  const netKg = Number(netProductionKg) || 0;
  if (netKg <= 0) return 0;
  return Number((netKg / BOBBIN_WEIGHT_KG).toFixed(2));
}

/**
 * Calculates stock of crates: Net Output (kg) / 12.8 kg
 */
export function computeCrateStockCount(netProductionKg: number | string | undefined | null): number {
  const netKg = Number(netProductionKg) || 0;
  if (netKg <= 0) return 0;
  return Number((netKg / CRATE_WEIGHT_KG).toFixed(2));
}

/**
 * Aggregates summary totals from list of BobbinStockItems.
 */
export function computeBobbinStockTotals(items: BobbinStockItem[]): BobbinStockTotals {
  const totalGrossDoneKg = items.reduce((sum, item) => sum + (item.productionDoneKg || 0), 0);
  const totalWasteKg = items.reduce((sum, item) => sum + (item.wasteKg || 0), 0);
  const totalNetProductionKg = items.reduce((sum, item) => sum + (item.netProductionKg || 0), 0);
  const totalBobbinStock = items.reduce((sum, item) => sum + (item.bobbinStock || 0), 0);
  const totalCrateStock = items.reduce((sum, item) => sum + (item.crateStock || 0), 0);
  const uniqueQualities = new Set(items.map((i) => (i.recipeQuality || "").trim()).filter(Boolean));

  return {
    totalGrossDoneKg: Number(totalGrossDoneKg.toFixed(2)),
    totalWasteKg: Number(totalWasteKg.toFixed(2)),
    totalNetProductionKg: Number(totalNetProductionKg.toFixed(2)),
    totalBobbinStock: Number(totalBobbinStock.toFixed(2)),
    totalCrateStock: Number(totalCrateStock.toFixed(2)),
    uniqueQualitiesCount: uniqueQualities.size,
  };
}

/**
 * Exports Bobbin Stock Summary to Excel (.xlsx)
 */
export function exportBobbinStockExcel({
  date,
  shiftName,
  items,
  totals,
}: {
  date: string;
  shiftName: string;
  items: BobbinStockItem[];
  totals: BobbinStockTotals;
}) {
  const wb = XLSX.utils.book_new();

  const titleRow = ["FLEXICOM INDUSTRIES PVT. LTD. - TAPE PLANT BOBBIN STOCK SUMMARY"];
  const metaRow1 = [
    `Date: ${date}`,
    `Shift: ${shiftName}`,
    `Total Qualities: ${items.length}`,
    `Standard Bobbin Weight: ${BOBBIN_WEIGHT_KG} kg`,
    `Standard Crate Weight: ${CRATE_WEIGHT_KG} kg (${BOBBINS_PER_CRATE} bobbins/crate)`,
    `Generated: ${new Date().toLocaleString()}`,
  ];
  const emptyRow: string[] = [];

  const headerRow = [
    "Sl No",
    "Quality Name",
    "Gross Production (kg)",
    "Wastage (kg)",
    "Production Done in KG (Net Output)",
    "Stock of Bobbins (@ 1.6 kg)",
    "Stock of Crates (@ 12.8 kg)",
    "Shift",
    "Remarks",
  ];

  const dataRows = items.map((item) => [
    item.slNo,
    item.recipeQuality,
    item.productionDoneKg,
    item.wasteKg,
    item.netProductionKg,
    item.bobbinStock,
    item.crateStock,
    item.shiftName || shiftName,
    item.remarks || "-",
  ]);

  const totalsRow = [
    "TOTAL",
    "-",
    totals.totalGrossDoneKg,
    totals.totalWasteKg,
    totals.totalNetProductionKg,
    totals.totalBobbinStock,
    totals.totalCrateStock,
    "-",
    "-",
  ];

  const wsData = [
    titleRow,
    metaRow1,
    emptyRow,
    headerRow,
    ...dataRows,
    emptyRow,
    totalsRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 8 },  // Sl No
    { wch: 28 }, // Quality Name
    { wch: 22 }, // Gross Production (kg)
    { wch: 16 }, // Wastage (kg)
    { wch: 34 }, // Production Done in KG (Net Output)
    { wch: 26 }, // Stock of Bobbins (@ 1.6 kg)
    { wch: 26 }, // Stock of Crates (@ 12.8 kg)
    { wch: 20 }, // Shift
    { wch: 24 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Bobbin Stock Summary");

  const sanitizedDate = date.replace(/[^0-9-]/g, "_");
  const sanitizedShift = shiftName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Bobbin_Stock_Summary_${sanitizedDate}_${sanitizedShift}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Triggers clean print view for Bobbin Stock Summary
 */
export function printBobbinStockSummary({
  date,
  shiftName,
  items,
  totals,
}: {
  date: string;
  shiftName: string;
  items: BobbinStockItem[];
  totals: BobbinStockTotals;
}) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print the Bobbin Stock Summary.");
    return;
  }

  const tableRowsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${item.slNo}</td>
        <td style="font-weight: 600; color: #0f172a;">${item.recipeQuality}</td>
        <td style="text-align: right;">${item.productionDoneKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; color: #dc2626;">${item.wasteKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold; color: #047857; background-color: #f0fdf4;">${item.netProductionKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold; color: #1e40af; background-color: #eff6ff;">${item.bobbinStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold; color: #6b21a8; background-color: #faf5ff;">${item.crateStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: center; font-size: 11px; color: #64748b;">${item.shiftName || shiftName}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Tape Plant - Bobbin Stock Summary (${date})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 12mm 12mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 16px;
      color: #0f172a;
      background: #ffffff;
      font-size: 12px;
    }
    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .sheet-title {
      font-size: 14px;
      font-weight: 700;
      color: #2563eb;
      margin-top: 2px;
    }
    .meta-box {
      font-size: 11px;
      color: #475569;
      text-align: right;
      line-height: 1.4;
    }
    .kpi-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      background: #f8fafc;
    }
    .kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .kpi-val {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      padding: 8px 6px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 6px;
      border: 1px solid #e2e8f0;
      font-size: 11.5px;
    }
    tfoot td {
      background-color: #f8fafc;
      font-weight: 800;
      border-top: 2px solid #0f172a;
      padding: 8px 6px;
    }
    .conversion-note {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 8px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 4px;
      border-left: 3px solid #3b82f6;
    }
    .footer {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
      padding-top: 15px;
      border-top: 1px dashed #cbd5e1;
    }
    .signature-line {
      margin-top: 40px;
      border-top: 1px solid #94a3b8;
      width: 180px;
      text-align: center;
      padding-top: 4px;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
      <div class="sheet-title">Tape Plant - Bobbin Stock Summary Report</div>
    </div>
    <div class="meta-box">
      <div><strong>Date:</strong> ${date}</div>
      <div><strong>Shift:</strong> ${shiftName}</div>
      <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="kpi-cards">
    <div class="kpi-card">
      <div class="kpi-label">Total Net Output (KG)</div>
      <div class="kpi-val" style="color: #047857;">${totals.totalNetProductionKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Bobbins (@ 1.6 kg)</div>
      <div class="kpi-val" style="color: #1e40af;">${totals.totalBobbinStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Crates (@ 12.8 kg)</div>
      <div class="kpi-val" style="color: #6b21a8;">${totals.totalCrateStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Active Qualities</div>
      <div class="kpi-val">${totals.uniqueQualitiesCount}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Quality Name</th>
        <th style="text-align: right;">Gross (kg)</th>
        <th style="text-align: right;">Waste (kg)</th>
        <th style="text-align: right; background-color: #e2fbe8; color: #047857;">Net Output (kg)</th>
        <th style="text-align: right; background-color: #dbeafe; color: #1e40af;">Bobbin Stock (@ 1.6 kg)</th>
        <th style="text-align: right; background-color: #f3e8ff; color: #6b21a8;">Crate Stock (@ 12.8 kg)</th>
        <th style="text-align: center; width: 80px;">Shift</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="text-align: right;">TOTAL:</td>
        <td style="text-align: right;">${totals.totalGrossDoneKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; color: #dc2626;">${totals.totalWasteKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; color: #047857;">${totals.totalNetProductionKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; color: #1e40af;">${totals.totalBobbinStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; color: #6b21a8;">${totals.totalCrateStock.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: center;">-</td>
      </tr>
    </tfoot>
  </table>

  <div class="conversion-note">
    <strong>Formula & Standard Packing:</strong> Bobbin Count = Net Output (kg) ÷ 1.6 kg/bobbin. Crate Count = Net Output (kg) ÷ 12.8 kg/crate (8 bobbins per crate). Net Output = Gross Production Done minus Wastage.
  </div>

  <div class="footer">
    <div>
      <div class="signature-line">Plant Operator / Incharge</div>
    </div>
    <div>
      <div class="signature-line">Quality Control Manager</div>
    </div>
    <div>
      <div class="signature-line">Authorized Signatory</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
