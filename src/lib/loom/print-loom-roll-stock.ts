/**
 * Flexicom Central ERP - Loom Roll Stock Printable Sheet Engine
 * High-contrast, A4 landscape print template with company logo and zero-background fail-safes.
 */

import { LoomRollStockItem, LoomRollStockSummary } from "./loom-roll-stock-types";

export interface PrintRollStockOptions {
  rolls: LoomRollStockItem[];
  summary: LoomRollStockSummary;
  filterLabel?: string;
}

export function generateLoomRollStockHtml(options: PrintRollStockOptions): string {
  const { rolls, summary, filterLabel = "All Active Floor Stock" } = options;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const docDate = new Date().toISOString().slice(0, 10).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LM-STK-${docDate}`;

  const qualitySummaryRows = summary.qualityBreakdown.map((q, idx) => `
    <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
      <td style="text-align: center; font-weight: 700; font-size: 8pt; color: #334155; padding: 4px 6px;">${idx + 1}</td>
      <td style="font-size: 8pt; font-weight: 800; color: #0f172a; padding: 4px 6px;">${q.qualityType}</td>
      <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a; padding: 4px 6px;">${q.rollsCount}</td>
      <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; color: #0f172a; padding: 4px 6px;">${q.totalMeters.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #475569; padding: 4px 6px;">${q.totalGrossWeightKg.toFixed(2)}</td>
      <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background: #ecfdf5; padding: 4px 6px;">${q.totalNettWeightKg.toFixed(2)}</td>
      <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; color: #7c3aed; padding: 4px 6px;">${q.avgWeightPerMeter.toFixed(1)}</td>
      <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 700; color: #0369a1; padding: 4px 6px;">${q.percentageByWeight.toFixed(1)}%</td>
    </tr>
  `).join("");

  const detailedRollRows = rolls.map((r, idx) => `
    <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
      <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569; padding: 3px 5px;">${idx + 1}</td>
      <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a; background: #f8fafc; padding: 3px 5px;">
        ${r.rollNumber || "—"}
      </td>
      <td style="font-size: 7.5pt; font-weight: 700; color: #0f172a; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 3px 5px;">
        ${r.qualityType || "—"}
      </td>
      <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a; background: #f1f5f9; padding: 3px 5px;">
        ${r.meter !== undefined && r.meter !== null ? Number(r.meter).toLocaleString() : "0"}
      </td>
      <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background: #ecfdf5; padding: 3px 5px;">
        ${r.nettWeightKg !== undefined && r.nettWeightKg !== null ? Number(r.nettWeightKg).toFixed(2) : "0.00"}
      </td>
      <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0284c7; padding: 3px 5px;">
        #${r.loomNumber}
      </td>
      <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 600; color: #334155; padding: 3px 5px;">
        ${r.size || "—"}
      </td>
      <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #475569; padding: 3px 5px;">
        ${r.grossWeightKg !== undefined && r.grossWeightKg !== null ? Number(r.grossWeightKg).toFixed(2) : "0.00"}
      </td>
      <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #64748b; padding: 3px 5px;">
        ${r.tareWeightKg !== undefined && r.tareWeightKg !== null ? Number(r.tareWeightKg).toFixed(2) : "1.20"}
      </td>
      <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #7c3aed; padding: 3px 5px;">
        ${r.avgWeightPerMeter !== undefined && r.avgWeightPerMeter !== null ? Number(r.avgWeightPerMeter).toFixed(1) : "0.0"}
      </td>
      <td style="text-align: center; font-family: monospace; font-size: 7.5pt; color: #334155; padding: 3px 5px;">
        ${r.date || "—"}
      </td>
      <td style="text-align: center; font-size: 7.5pt; font-weight: 600; color: #475569; padding: 3px 5px;">
        ${r.shiftName || "—"}
      </td>
      <td style="font-size: 7pt; font-weight: 600; color: #334155; max-width: 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 3px 5px;">
        ${r.contractor || "In-House"}
      </td>
      <td style="font-size: 7pt; color: #64748b; max-width: 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 3px 5px;">
        ${r.remarks || "—"}
      </td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Loom Roll Stock Report - ${docRef}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 8mm 8mm 8mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      padding: 4px;
    }
    .sheet-wrapper {
      max-width: 100%;
      margin: 0 auto;
    }
    .header-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      height: 44px;
      width: auto;
      object-fit: contain;
    }
    .company-title {
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: -0.2px;
      color: #0f172a;
    }
    .sheet-title {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-meta {
      text-align: right;
      font-size: 7.5pt;
      color: #475569;
      line-height: 1.35;
    }
    .doc-meta strong {
      color: #0f172a;
      font-family: monospace;
    }

    /* KPI Highlights Bento */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      background: #f8fafc;
    }
    .kpi-label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #64748b;
    }
    .kpi-value {
      font-size: 12pt;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
      margin-top: 1px;
    }
    .kpi-sub {
      font-size: 6.5pt;
      color: #475569;
    }

    /* Section Subheadings */
    .section-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      background: #f1f5f9;
      padding: 4px 8px;
      border-left: 3px solid #0284c7;
      margin: 8px 0 4px 0;
    }

    /* Print Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
    }
    table.data-table thead th {
      background-color: #e2e8f0 !important;
      color: #000000 !important;
      font-size: 7pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 4px 4px;
      border: 1.5px solid #0f172a !important;
    }
    table.data-table tfoot td {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
      font-weight: 800;
      font-family: monospace;
      padding: 4px 6px;
      border-top: 2px solid #0f172a;
    }

    /* Sign-off footer */
    .sign-section {
      margin-top: 16px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      page-break-inside: avoid;
    }
    .sign-box {
      border-top: 1.5px solid #0f172a;
      padding-top: 6px;
      text-align: center;
    }
    .sign-title {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
    }
    .sign-sub {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="sheet-wrapper">
    <!-- Header -->
    <div class="header-box">
      <div class="logo-container">
        <img src="${origin}/logo.png" alt="Flexicom Logo" class="logo-img" onerror="this.style.display='none'" />
        <div>
          <h1 class="company-title">FLEXICOM INDUSTRIES PVT. LTD.</h1>
          <h2 class="sheet-title">Circular Loom — Floor Roll Stock Report</h2>
        </div>
      </div>
      <div class="doc-meta">
        <div>Ref: <strong>${docRef}</strong></div>
        <div>Scope: <strong>${filterLabel}</strong></div>
        <div>Generated: <strong>${genTimestamp}</strong></div>
      </div>
    </div>

    <!-- KPI Summary Row -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">Total Rolls in Stock</div>
        <div class="kpi-value">${summary.totalRolls} <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Rolls</span></div>
        <div class="kpi-sub">${summary.uniqueLoomsCount} Active Looms Recorded</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Quantity (Length)</div>
        <div class="kpi-value">${summary.totalMeters.toLocaleString()} <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Mtrs</span></div>
        <div class="kpi-sub">Total linear fabric meters</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Quantity (Weight)</div>
        <div class="kpi-value" style="color: #15803d;">${summary.totalNettWeightKg.toFixed(2)} <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Kg</span></div>
        <div class="kpi-sub">Gross: ${summary.totalGrossWeightKg.toFixed(2)} kg (Tare: ${summary.totalTareWeightKg.toFixed(2)} kg)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Qualities & Avg Linear Mass</div>
        <div class="kpi-value" style="color: #7c3aed;">${summary.uniqueQualitiesCount} <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Qualities</span></div>
        <div class="kpi-sub">Overall Avg: <strong>${summary.averageWeightPerMeter.toFixed(1)} g/m</strong></div>
      </div>
    </div>

    <!-- Section 1: Quality Summary -->
    <div class="section-title">1. Quality-Wise Stock Summary</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">S.No.</th>
          <th style="text-align: left;">Quality / Recipe Code</th>
          <th style="width: 80px; text-align: center;">Rolls Count</th>
          <th style="width: 110px; text-align: right;">Total Meters</th>
          <th style="width: 100px; text-align: right;">Gross Wt (kg)</th>
          <th style="width: 110px; text-align: right;">Nett Wt (kg)</th>
          <th style="width: 90px; text-align: right;">Avg (g/m)</th>
          <th style="width: 90px; text-align: center;">% Share</th>
        </tr>
      </thead>
      <tbody>
        ${qualitySummaryRows || `<tr><td colspan="8" style="text-align: center; padding: 8px; color: #64748b;">No roll stock records available.</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align: right; padding-right: 10px;">TOTAL:</td>
          <td style="text-align: center;">${summary.totalRolls}</td>
          <td style="text-align: right;">${summary.totalMeters.toLocaleString()}</td>
          <td style="text-align: right;">${summary.totalGrossWeightKg.toFixed(2)}</td>
          <td style="text-align: right; color: #15803d;">${summary.totalNettWeightKg.toFixed(2)}</td>
          <td style="text-align: right; color: #7c3aed;">${summary.averageWeightPerMeter.toFixed(1)}</td>
          <td style="text-align: center;">100.0%</td>
        </tr>
      </tfoot>
    </table>

    <!-- Section 2: Detailed Roll Inventory -->
    <div class="section-title">2. Detailed Roll Inventory Register (${rolls.length} Rolls)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 32px; text-align: center;">#</th>
          <th style="width: 80px; text-align: center;">Roll No.</th>
          <th style="text-align: left;">Quality</th>
          <th style="width: 80px; text-align: right;">Meters</th>
          <th style="width: 80px; text-align: right;">Nett Wt (kg)</th>
          <th style="width: 65px; text-align: center;">Loom #</th>
          <th style="width: 55px; text-align: center;">Size</th>
          <th style="width: 75px; text-align: right;">Gross Wt</th>
          <th style="width: 65px; text-align: right;">Tare Wt</th>
          <th style="width: 65px; text-align: right;">Avg (g/m)</th>
          <th style="width: 75px; text-align: center;">Cut Date</th>
          <th style="width: 65px; text-align: center;">Shift</th>
          <th style="width: 85px; text-align: left;">Contractor</th>
          <th style="width: 80px; text-align: left;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${detailedRollRows || `<tr><td colspan="14" style="text-align: center; padding: 12px; color: #64748b;">No matching rolls found.</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align: right; padding-right: 8px;">TOTAL (${rolls.length} ROLLS):</td>
          <td style="text-align: right;">${summary.totalMeters.toLocaleString()}</td>
          <td style="text-align: right; color: #15803d;">${summary.totalNettWeightKg.toFixed(2)}</td>
          <td colspan="2" style="text-align: center;">—</td>
          <td style="text-align: right;">${summary.totalGrossWeightKg.toFixed(2)}</td>
          <td style="text-align: right;">${summary.totalTareWeightKg.toFixed(2)}</td>
          <td style="text-align: right; color: #7c3aed;">${summary.averageWeightPerMeter.toFixed(1)}</td>
          <td colspan="4" style="text-align: center;">—</td>
        </tr>
      </tfoot>
    </table>

    <!-- Section 3: Signatures -->
    <div class="sign-section">
      <div class="sign-box">
        <div class="sign-title">Prepared / Verified By</div>
        <div class="sign-sub">Loom Floor Data Operator</div>
      </div>
      <div class="sign-box">
        <div class="sign-title">Loom Shift Supervisor</div>
        <div class="sign-sub">Production In-Charge</div>
      </div>
      <div class="sign-box">
        <div class="sign-title">Store / Plant Manager</div>
        <div class="sign-sub">Flexicom Industries Pvt. Ltd.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printLoomRollStock(options: PrintRollStockOptions): void {
  const html = generateLoomRollStockHtml(options);
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    alert("Please allow popups to print the Loom Roll Stock report.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
