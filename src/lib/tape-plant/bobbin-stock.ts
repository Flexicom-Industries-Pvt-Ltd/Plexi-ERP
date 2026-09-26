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
  producedBobbins?: number;
  producedCrates?: number;
  issuedCrates?: number;
  issuedBobbins?: number;
  issuedKg?: number;
  bobbinStock: number; // Available Bobbin Stock (Produced - Issued)
  crateStock: number;  // Available Crate Stock (Produced - Issued)
  availableKg?: number; // Available KG Stock (Net Produced - Issued KG)
  availableBobbins?: number; // Available Bobbin Stock (Net Produced - Issued Bobbins)
  availableCrates?: number;  // Available Crate Stock (Net Produced - Issued Crates)
  shiftName?: string;
  remarks?: string;
}

export interface BobbinStockTotals {
  totalGrossDoneKg: number;
  totalWasteKg: number;
  totalNetProductionKg: number;
  totalProducedBobbins: number;
  totalProducedCrates: number;
  totalIssuedCrates: number;
  totalIssuedBobbins: number;
  totalIssuedKg: number;
  totalBobbinStock: number; // Available Bobbins
  totalCrateStock: number;  // Available Crates
  totalAvailableKg: number; // Available KG
  totalAvailableBobbinStock: number; // Total Available Bobbins
  totalAvailableCrateStock: number;  // Total Available Crates
  uniqueQualitiesCount: number;
}

export interface BobbinStockPrintData {
  dateDescription?: string;
  shiftDescription?: string;
  items: BobbinStockItem[];
  totals: BobbinStockTotals;
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
  const totalProducedBobbins = computeBobbinStockCount(totalNetProductionKg);
  const totalProducedCrates = computeCrateStockCount(totalNetProductionKg);

  const totalIssuedCrates = items.reduce((sum, item) => sum + (item.issuedCrates || 0), 0);
  const totalIssuedBobbins = items.reduce((sum, item) => sum + (item.issuedBobbins || 0), 0);
  const totalIssuedKg = items.reduce((sum, item) => sum + (item.issuedKg || 0), 0);

  const totalAvailableKg = Math.max(0, totalNetProductionKg - totalIssuedKg);
  const totalAvailableBobbinStock = computeBobbinStockCount(totalAvailableKg);
  const totalAvailableCrateStock = computeCrateStockCount(totalAvailableKg);

  const totalBobbinStock = items.reduce(
    (sum, item) => sum + (item.availableBobbins !== undefined ? item.availableBobbins : item.bobbinStock || 0),
    0
  );
  const totalCrateStock = items.reduce(
    (sum, item) => sum + (item.availableCrates !== undefined ? item.availableCrates : item.crateStock || 0),
    0
  );

  const uniqueQualities = new Set(items.map((i) => (i.recipeQuality || "").trim()).filter(Boolean));

  return {
    totalGrossDoneKg: Number(totalGrossDoneKg.toFixed(2)),
    totalWasteKg: Number(totalWasteKg.toFixed(2)),
    totalNetProductionKg: Number(totalNetProductionKg.toFixed(2)),
    totalProducedBobbins: Number(totalProducedBobbins.toFixed(2)),
    totalProducedCrates: Number(totalProducedCrates.toFixed(2)),
    totalIssuedCrates: Number(totalIssuedCrates.toFixed(2)),
    totalIssuedBobbins: Number(totalIssuedBobbins.toFixed(2)),
    totalIssuedKg: Number(totalIssuedKg.toFixed(2)),
    totalBobbinStock: Number(totalBobbinStock.toFixed(2)),
    totalCrateStock: Number(totalCrateStock.toFixed(2)),
    totalAvailableKg: Number(totalAvailableKg.toFixed(2)),
    totalAvailableBobbinStock: Number(totalAvailableBobbinStock.toFixed(2)),
    totalAvailableCrateStock: Number(totalAvailableCrateStock.toFixed(2)),
    uniqueQualitiesCount: uniqueQualities.size,
  };
}

/**
 * Exports Bobbin Stock Summary to Excel (.xlsx) with Produced, Available, and Issued to Looms
 */
export function exportBobbinStockExcel({
  dateDescription,
  shiftDescription,
  items,
  totals,
}: {
  dateDescription?: string;
  shiftDescription?: string;
  items: BobbinStockItem[];
  totals: BobbinStockTotals;
}) {
  const wb = XLSX.utils.book_new();

  const titleRow = ["FLEXICOM INDUSTRIES PVT. LTD. - TAPE PLANT BOBBIN STOCK SUMMARY"];
  const metaRow1 = [
    `Period / Date: ${dateDescription || "All Time (Till Date)"}`,
    `Shift: ${shiftDescription || "All Shifts"}`,
    `Total Active Qualities: ${items.length}`,
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
    "Produced Net (kg)",
    "Available Stock (Crates @ 12.8 kg)",
    "Available Bobbins (kg)",
    "Issued to Looms (Crates)",
    "Issued to Looms (kg)",
  ];

  const dataRows = items.map((item) => {
    const availCrates = item.availableCrates !== undefined ? item.availableCrates : item.crateStock;
    const availKg = item.availableKg !== undefined ? item.availableKg : item.netProductionKg - (item.issuedKg || 0);
    return [
      item.slNo,
      item.recipeQuality,
      item.productionDoneKg,
      item.wasteKg,
      item.netProductionKg,
      availCrates,
      availKg,
      item.issuedCrates || 0,
      item.issuedKg || 0,
    ];
  });

  const totalsRow = [
    "TOTAL",
    "-",
    totals.totalGrossDoneKg,
    totals.totalWasteKg,
    totals.totalNetProductionKg,
    totals.totalAvailableCrateStock ?? totals.totalCrateStock,
    totals.totalAvailableKg,
    totals.totalIssuedCrates,
    totals.totalIssuedKg,
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
    { wch: 32 }, // Quality Name
    { wch: 20 }, // Gross Production (kg)
    { wch: 15 }, // Wastage (kg)
    { wch: 20 }, // Produced Net (kg)
    { wch: 32 }, // Available Stock (Crates @ 12.8 kg)
    { wch: 22 }, // Available Bobbins (kg)
    { wch: 24 }, // Issued to Looms (Crates)
    { wch: 20 }, // Issued to Looms (kg)
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Bobbin Stock Summary");

  const sanitizedDate = (dateDescription || "All_Till_Date").replace(/[^0-9a-zA-Z_-]/g, "_");
  const filename = `Bobbin_Stock_Summary_${sanitizedDate}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Generates high-contrast, professional HTML for Bobbin Stock Summary print
 * with reordered columns: Produced Net -> Available Crates -> Available Bobbins (KG) -> Issued to Looms.
 */
export function generateBobbinStockSheetHtml({
  dateDescription,
  shiftDescription,
  items,
  totals,
}: BobbinStockPrintData): string {
  const period = dateDescription || `All Time (Till ${new Date().toISOString().slice(0, 10)})`;
  const shift = shiftDescription || "All Shifts";
  const docRef = `TP-BSTK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const printTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const tableRowsHtml = items.length > 0
    ? items.map(
        (item) => {
          const availCrates = item.availableCrates !== undefined ? item.availableCrates : item.crateStock;
          const availKg = item.availableKg !== undefined ? item.availableKg : item.netProductionKg - (item.issuedKg || 0);
          const issuedCrates = item.issuedCrates || 0;
          const issuedKg = item.issuedKg || 0;

          return `
        <tr>
          <td style="text-align: center; font-weight: 700; width: 28px;">${item.slNo}</td>
          <td style="font-weight: 700; font-family: monospace; font-size: 8pt; color: #0f172a;">${item.recipeQuality}</td>
          <td style="text-align: right; font-family: monospace;">${item.productionDoneKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">${item.wasteKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace; color: #047857;">${item.netProductionKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</td>
          <td style="text-align: right; font-weight: 800; font-family: monospace; color: #047857; background-color: #f0fdf4;">${availCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} CRATES</td>
          <td style="text-align: right; font-weight: 800; font-family: monospace; color: #1e40af; background-color: #eff6ff;">${availKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</td>
          <td style="text-align: right; font-weight: 700; font-family: monospace; color: #6b21a8; background-color: #faf5ff;">${issuedCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Crates <span style="font-size: 6.5pt; color: #7e22ce;">(${issuedKg.toFixed(1)} kg)</span></td>
        </tr>`;
        }
      ).join("")
    : `
      <tr>
        <td colspan="8" style="text-align: center; color: #64748b; font-style: italic; padding: 12px;">
          No bobbin stock records found for the selected period.
        </td>
      </tr>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tape Plant - Bobbin Stock Summary (${docRef})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 8mm 8mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      width: 100%;
    }
    .sheet-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Minimalist Centered Header with Top-Left Corner Vivid Flexicom Logo */
    .header-container {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .logo-box {
      width: 70px;
      text-align: left;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .logo-box img {
      height: 48px;
      width: auto;
      object-fit: contain;
      filter: contrast(1.25) saturate(1.25);
    }
    .company-title {
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 0.6px;
      color: #000000;
      text-transform: uppercase;
      text-align: center;
    }
    .company-sub {
      font-size: 7.5pt;
      color: #475569;
      margin-top: 1px;
      text-align: center;
    }
    .doc-main-heading {
      display: inline-block;
      border: 1.5px solid #0f172a;
      background: #f8fafc;
      padding: 2.5px 14px;
      font-size: 9pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 4px;
      margin-bottom: 2px;
      text-align: center;
    }
    .doc-meta-strip {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 12px;
      font-size: 7.5pt;
      color: #334155;
      margin-top: 4px;
      text-align: center;
    }
    .doc-meta-strip strong {
      color: #000000;
    }

    /* KPI Summary Row */
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 4px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      text-align: center;
    }
    .kpi-label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.4px;
    }
    .kpi-val {
      font-size: 10pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 1px;
    }

    /* Section Title */
    .section-title {
      font-size: 8pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      text-align: center;
      background-color: #e2e8f0;
      border: 1px solid #94a3b8;
      border-bottom: none;
      padding: 3px 6px;
      color: #0f172a;
    }

    /* Data Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 7.5pt;
    }
    .data-table th {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 4px 5px;
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 5px;
      font-size: 7.5pt;
      color: #0f172a;
    }
    .data-table tfoot td {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      font-weight: 800;
      padding: 5px 6px;
    }

    /* Conversion note */
    .conversion-note {
      font-size: 7pt;
      color: #334155;
      margin-bottom: 12px;
      background: #f8fafc;
      padding: 5px 8px;
      border-radius: 3px;
      border: 1px solid #cbd5e1;
      border-left: 3px solid #2563eb;
    }

    /* Sign-off section */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      border: 1px solid #94a3b8;
    }
    .sign-table td {
      width: 33.33%;
      border: 1px solid #94a3b8;
      padding: 5px 8px;
      text-align: center;
      vertical-align: top;
    }
    .sign-title {
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      margin-bottom: 24px;
      color: #334155;
    }
    .sign-line {
      border-top: 1px dotted #64748b;
      padding-top: 3px;
      font-size: 6.5pt;
      color: #64748b;
    }

    /* Footer */
    .footer-note {
      margin-top: 6px;
      font-size: 6.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e2e8f0;
      padding-top: 3px;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- MAIN HEADER WITH TOP-LEFT VIVID FLEXICOM LOGO -->
    <div class="header-container">
      <div class="header-top">
        <div class="logo-box">
          <img src="${typeof window !== "undefined" ? window.location.origin : ""}/logo.png" alt="Flexicom Logo" style="height: 48px; width: auto; object-fit: contain; filter: contrast(1.25) saturate(1.25);" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
          <div class="company-sub">Tape Plant Extrusion & Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)</div>
          <div class="doc-main-heading">BOBBIN & CRATE STOCK SUMMARY REPORT</div>
        </div>
        <div style="width: 70px;" aria-hidden="true"></div>
      </div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>•</span>
        <span>Period: <strong>${period}</strong></span>
        <span>•</span>
        <span>Shift: <strong>${shift}</strong></span>
        <span>•</span>
        <span>Active Qualities: <strong>${items.length}</strong></span>
        <span>•</span>
        <span>Printed: <strong>${printTimestamp}</strong></span>
      </div>
    </div>

    <!-- KEY KPI SUMMARY STRIP -->
    <table class="kpi-table">
      <tr>
        <td style="width: 25%;">
          <div class="kpi-label">Total Produced Net (KG)</div>
          <div class="kpi-val" style="color: #047857;">${totals.totalNetProductionKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Available Crate Stock</div>
          <div class="kpi-val" style="color: #047857;">${(totals.totalAvailableCrateStock ?? totals.totalCrateStock).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} CRATES</div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Available Bobbin Stock (KG)</div>
          <div class="kpi-val" style="color: #1e40af;">${(totals.totalAvailableKg ?? totals.totalNetProductionKg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Total Issued to Looms</div>
          <div class="kpi-val" style="color: #6b21a8;">${totals.totalIssuedCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Crates (${totals.totalIssuedKg.toFixed(1)} kg)</div>
        </td>
      </tr>
    </table>

    <!-- 1. FINISHED BOBBIN & CRATE STOCK SUMMARY -->
    <div class="section-title">1. FINISHED BOBBIN & CRATE STOCK SUMMARY (PRODUCED − ISSUED)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 28px; text-align: center;">#</th>
          <th style="text-align: left;">Quality Name / Recipe Code</th>
          <th style="text-align: right; width: 80px;">Gross (KG)</th>
          <th style="text-align: right; width: 70px;">Waste (KG)</th>
          <th style="text-align: right; width: 90px; color: #065f46;">Produced Net</th>
          <th style="text-align: right; width: 105px; background-color: #dcfce7; color: #065f46;">Avail Crates (@ 12.8)</th>
          <th style="text-align: right; width: 105px; background-color: #dbeafe; color: #1e40af;">Avail Bobbins (KG)</th>
          <th style="text-align: right; width: 95px; background-color: #faf5ff; color: #6b21a8;">Issued to Looms</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align: right; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.5px;">Grand Total:</td>
          <td style="text-align: right; font-family: monospace;">${totals.totalGrossDoneKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-family: monospace; color: #b91c1c;">${totals.totalWasteKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; font-family: monospace; color: #047857;">${totals.totalNetProductionKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</td>
          <td style="text-align: right; font-family: monospace; color: #047857; background-color: #dcfce7;">${(totals.totalAvailableCrateStock ?? totals.totalCrateStock).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} CRATES</td>
          <td style="text-align: right; font-family: monospace; color: #1e40af; background-color: #dbeafe;">${(totals.totalAvailableKg ?? totals.totalNetProductionKg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</td>
          <td style="text-align: right; font-family: monospace; color: #6b21a8; background-color: #faf5ff;">${totals.totalIssuedCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Crates</td>
        </tr>
      </tfoot>
    </table>

    <!-- CONVERSION NOTES -->
    <div class="conversion-note">
      <strong>Stock Accounting:</strong> Available Stock = Produced Net Output − Dispatched Bobbin Issues. 1 Crate = 8 Bobbins = 12.8 KG • Standard Bobbin = 1.6 KG.
    </div>

    <!-- SIGN-OFF AUTHORIZATION -->
    <div class="avoid-break">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">Prepared By (Shift Operator / In-Charge)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Verified By (Quality Control / Lab)</div>
            <div class="sign-line">Signature & Stamp</div>
          </td>
          <td>
            <div class="sign-title">Approved By (Plant Supervisor / Manager)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        <span>Flexicom ERP • Tape Plant Extrusion System • Document: ${docRef}</span>
        <span>Printed: ${printTimestamp} • Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Directly prints the bobbin stock summary sheet in a clean, isolated iframe.
 * Completely immune to modal overflow or blank about:blank tabs.
 */
export function printBobbinStockSummary(data: BobbinStockPrintData): void {
  const html = generateBobbinStockSheetHtml(data);

  let iframe = document.getElementById("tape-plant-bobbin-stock-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "tape-plant-bobbin-stock-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc && iframe.contentWindow) {
    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print failed, falling back to window.open", err);
        fallbackWindowPrint(html);
      }
    };

    const logoImg = doc.querySelector("img");
    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 100);
      logoImg.onerror = () => setTimeout(triggerPrint, 100);
      setTimeout(triggerPrint, 400);
    } else {
      setTimeout(triggerPrint, 200);
    }
  } else {
    fallbackWindowPrint(html);
  }
}

function fallbackWindowPrint(html: string): void {
  const win = window.open("", "_blank", "width=1000,height=750");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 300);
  }
}
