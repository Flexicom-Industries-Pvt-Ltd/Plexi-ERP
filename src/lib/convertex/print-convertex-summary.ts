import { ConvertexSummaryResult } from "./convertex-types";

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateConvertexSummaryHtml(
  data: ConvertexSummaryResult,
  dateRange: string
): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const qualityRows =
    data.qualities.length > 0
      ? data.qualities
          .map((q, idx) => {
            return `
            <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; color: #475569;">${idx + 1}</td>
              <td style="font-weight: 700; color: #0f172a; background-color: #fffbeb;">${escapeHtml(q.quality)}</td>
              <td style="text-align: center; font-family: monospace; font-weight: 700; color: #0284c7;">${q.rollsCount}</td>
              <td style="text-align: right; font-family: monospace;">${q.totalRollMtr.toLocaleString()}</td>
              <td style="text-align: right; font-family: monospace;">${q.totalNetWt.toFixed(1)}</td>
              <td style="text-align: right; font-family: monospace; color: #0369a1; background-color: #f0f9ff;">${q.avgGsm.toFixed(1)}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: #15803d; background-color: #f0fdf4;">${q.productionPcs.toLocaleString()}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: #0f766e; background-color: #f0fdfa;">${q.productionKg.toFixed(1)}</td>
              <td style="text-align: right; font-family: monospace; color: #4338ca;">${q.coverPatchOs}</td>
              <td style="text-align: right; font-family: monospace; color: #4338ca;">${q.coverPatchDs}</td>
              <td style="text-align: right; font-family: monospace; color: #3730a3; font-weight: 600;">${q.valvePatch}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; color: #b91c1c; background-color: #fef2f2;">${q.totalWasteKg.toFixed(2)}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; color: #c2410c; background-color: #fff7ed;">${q.totalWastePct.toFixed(2)}%</td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: #166534; background-color: #f0fdf4;">${q.netProductionKg.toFixed(1)}</td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td colspan="14" style="text-align: center; padding: 14px; color: #64748b;">No quality production data found for this selection.</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Convertex Production & Wastage Executive Summary</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 7mm 8mm 7mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 7.5pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
    }
    .meta-strip {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
    }
    .meta-strip td {
      padding: 4px 6px;
      font-size: 7pt;
      vertical-align: middle;
    }
    .kpi-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 4px;
      margin-bottom: 6px;
    }
    .kpi-cell {
      padding: 4px 6px;
      border-radius: 4px;
      text-align: center;
      border: 1px solid #cbd5e1;
      background: #ffffff;
    }
    .kpi-label {
      font-size: 5.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 1px;
    }
    .kpi-value {
      font-size: 9.5pt;
      font-weight: 800;
      font-family: monospace;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.8pt;
      table-layout: fixed;
      margin-bottom: 8px;
    }
    .data-table th, .data-table td {
      border: 0.5pt solid #cbd5e1;
      padding: 2.5px 3px;
    }
    .data-table th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      font-size: 6pt;
    }
    .section-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      margin: 6px 0 3px 0;
      border-left: 3px solid #0284c7;
      padding-left: 5px;
    }
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    .sign-box {
      border: 0.5pt solid #cbd5e1;
      height: 38px;
      vertical-align: bottom;
      padding: 3px 6px;
      font-size: 6.5pt;
      color: #475569;
      background: #fafafa;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <table class="header-table">
    <tr>
      <td style="width: 20%; vertical-align: middle;">
        <img src="${origin}/flexicom-logo.png" alt="Flexicom" style="height: 32px; object-fit: contain;" onerror="this.style.display='none'" />
        <div style="font-size: 6.5pt; color: #64748b; font-weight: 600; margin-top: 2px;">Doc Ref: CVX-SUM-REPORT</div>
      </td>
      <td style="text-align: center; vertical-align: middle;">
        <div style="font-size: 13pt; font-weight: 900; letter-spacing: 0.5px; color: #0f172a;">
          FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA
        </div>
        <div style="font-size: 9pt; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 1px;">
          CONVERTEX PRODUCTION & WASTAGE EXECUTIVE SUMMARY
        </div>
        <div style="font-size: 6.5pt; color: #475569; margin-top: 1px;">
          Comprehensive Quality Performance, Scrap Breakdown, and Net Conversion
        </div>
      </td>
      <td style="width: 22%; text-align: right; vertical-align: middle; font-size: 6.5pt; color: #475569;">
        <div><strong>Period:</strong> ${escapeHtml(dateRange || "All Recorded Shifts")}</div>
        <div><strong>Printed:</strong> ${escapeHtml(genTimestamp)}</div>
      </td>
    </tr>
  </table>

  <!-- KPI SUMMARY CARDS -->
  <table class="kpi-table">
    <tr>
      <td class="kpi-cell" style="border-left: 2.5px solid #0284c7;">
        <div class="kpi-label">Total Rolls</div>
        <div class="kpi-value" style="color: #0284c7;">${data.overall.totalRolls}</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #0369a1;">
        <div class="kpi-label">Roll Metres</div>
        <div class="kpi-value" style="color: #0369a1;">${data.overall.totalRollMtr.toLocaleString()} m</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #0891b2;">
        <div class="kpi-label">Avg Weight</div>
        <div class="kpi-value" style="color: #0891b2;">${data.overall.avgGsm.toFixed(1)} g/m</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #16a34a; background-color: #f0fdf4;">
        <div class="kpi-label" style="color: #166534;">Production (Pcs)</div>
        <div class="kpi-value" style="color: #166534;">${data.overall.totalProductionPcs.toLocaleString()}</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #0f766e; background-color: #f0fdfa;">
        <div class="kpi-label" style="color: #115e59;">Production (Kg)</div>
        <div class="kpi-value" style="color: #115e59;">${data.overall.totalProductionKg.toFixed(1)} kg</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #e11d48; background-color: #fff1f2;">
        <div class="kpi-label" style="color: #9f1239;">Total Waste</div>
        <div class="kpi-value" style="color: #9f1239;">
          ${data.overall.totalWastageKg.toFixed(1)} kg (${data.overall.totalWastagePct.toFixed(2)}%)
        </div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #16a34a; background-color: #f0fdf4;">
        <div class="kpi-label" style="color: #166534;">Net Production</div>
        <div class="kpi-value" style="color: #166534;">${data.overall.totalNetProductionKg.toFixed(1)} kg</div>
      </td>
    </tr>
  </table>

  <!-- SECTION 1: QUALITY-WISE SUMMARY -->
  <div class="section-title">1. Quality-Wise Production & Output Conversion</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 20px; text-align: center;">Sl.</th>
        <th style="width: 140px; text-align: left; background-color: #1e293b; color: #fde047;">Quality Name</th>
        <th style="width: 45px; text-align: center;">Rolls</th>
        <th style="width: 60px; text-align: right;">Total Mtr</th>
        <th style="width: 55px; text-align: right;">Net Wt (Kg)</th>
        <th style="width: 45px; text-align: right;">Avg (g/m)</th>
        <th style="width: 65px; text-align: right; background-color: #14532d; color: #86efac;">Prod (Pcs)</th>
        <th style="width: 60px; text-align: right; background-color: #134e4a; color: #5eead4;">Prod (Kg)</th>
        <th style="width: 40px; text-align: right; background-color: #312e81;">Patch OS</th>
        <th style="width: 40px; text-align: right; background-color: #312e81;">Patch DS</th>
        <th style="width: 40px; text-align: right; background-color: #1e1b4b;">Valve</th>
        <th style="width: 55px; text-align: right; background-color: #7f1d1d; color: #fca5a5;">Waste (Kg)</th>
        <th style="width: 45px; text-align: right; background-color: #7f1d1d; color: #fca5a5;">Waste %</th>
        <th style="width: 65px; text-align: right; background-color: #14532d; color: #86efac;">Net Prod (Kg)</th>
      </tr>
    </thead>
    <tbody>
      ${qualityRows}
    </tbody>
    <tfoot>
      <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 1.5pt solid #0f172a;">
        <td colspan="2" style="text-align: right; text-transform: uppercase;">GRAND TOTALS:</td>
        <td style="text-align: center; font-family: monospace; color: #0284c7;">${data.overall.totalRolls}</td>
        <td style="text-align: right; font-family: monospace;">${data.overall.totalRollMtr.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${data.overall.totalNetWt.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #0369a1; background-color: #e0f2fe;">${data.overall.avgGsm.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #14532d; background-color: #dcfce7;">${data.overall.totalProductionPcs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #115e59; background-color: #ccfbf1;">${data.overall.totalProductionKg.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #3730a3; background-color: #eef2ff;">${data.overall.totalCoverPatchOs}</td>
        <td style="text-align: right; font-family: monospace; color: #3730a3; background-color: #eef2ff;">${data.overall.totalCoverPatchDs}</td>
        <td style="text-align: right; font-family: monospace; color: #312e81; background-color: #e0e7ff;">${data.overall.totalValvePatch}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 800; color: #991b1b; background-color: #fee2e2;">${data.overall.totalWastageKg.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 800; color: #c2410c; background-color: #ffedd5;">${data.overall.totalWastagePct.toFixed(2)}%</td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #14532d; background-color: #dcfce7;">${data.overall.totalNetProductionKg.toFixed(1)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- SECTION 2: WASTAGE CATEGORISATION BREAKDOWN -->
  <div class="section-title">2. Wastage Stream Categorisation Breakdown</div>
  <table class="data-table" style="max-width: 600px;">
    <thead>
      <tr>
        <th style="text-align: left;">Wastage Category</th>
        <th style="width: 110px; text-align: right;">Quantity (Kg)</th>
        <th style="width: 90px; text-align: right;">Share (% of Prod)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Loom Fabric Wastage</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.loomWasteKg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.loomWastePct.toFixed(2)}%</td>
      </tr>
      <tr style="background-color: #f8fafc;">
        <td>Lamination Fabric Wastage</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.lamWasteKg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.lamWastePct.toFixed(2)}%</td>
      </tr>
      <tr>
        <td>Print Fabric Wastage</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.printWasteKg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.printWastePct.toFixed(2)}%</td>
      </tr>
      <tr style="background-color: #f8fafc;">
        <td>Machine Operational Wastage</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.machineWasteKg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.machineWastePct.toFixed(2)}%</td>
      </tr>
      <tr>
        <td>Cover Patch Wastage</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.coverPatchWasteKg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace;">${data.wastage.coverPatchWastePct.toFixed(2)}%</td>
      </tr>
    </tbody>
    <tfoot>
      <tr style="background-color: #fee2e2; font-weight: 800; border-top: 1.5pt solid #0f172a;">
        <td style="text-transform: uppercase; color: #991b1b;">TOTAL ACCUMULATED WASTAGE:</td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #991b1b;">${data.wastage.totalWasteKg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #991b1b;">${data.wastage.totalWastePct.toFixed(2)}%</td>
      </tr>
    </tfoot>
  </table>

  <!-- SIGNATURES -->
  <table class="sign-table">
    <tr>
      <td class="sign-box" style="width: 25%;">
        Prepared By (Data Entry)<br>
        <strong style="color: #0f172a;">_______________</strong>
      </td>
      <td class="sign-box" style="width: 25%;">
        Shift In-charge / Supervisor<br>
        <strong style="color: #0f172a;">_______________</strong>
      </td>
      <td class="sign-box" style="width: 25%;">
        Quality Control Head<br>
        <strong style="color: #0f172a;">_______________</strong>
      </td>
      <td class="sign-box" style="width: 25%;">
        Plant General Manager / Operations<br>
        <strong style="color: #0f172a;">_______________</strong>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function printConvertexSummaryReport(
  data: ConvertexSummaryResult,
  dateRange: string
): void {
  const html = generateConvertexSummaryHtml(data, dateRange);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print the report.");
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
