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

  const periodText = dateRange || "All Active Records";

  const qualityRows =
    data.qualities.length > 0
      ? data.qualities
          .map((q, idx) => {
            return `
            <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${idx + 1}</td>
              <td style="font-weight: 700; font-size: 7.5pt; color: #0f172a; background-color: #fffbeb;">${escapeHtml(q.quality)}</td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #0284c7;">${q.rollsCount}</td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background-color: #f0fdf4;">${q.productionPcs.toLocaleString()}</td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f766e; background-color: #f0fdfa;">${q.productionKg.toFixed(1)}</td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">${q.totalRollMtr.toLocaleString()}</td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">${q.totalNetWt.toFixed(1)}</td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #0369a1; background-color: #f0f9ff;">${q.avgGsm.toFixed(1)}</td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #4338ca;">${q.coverPatchOs}</td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #4338ca;">${q.coverPatchDs}</td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #3730a3; font-weight: 600;">${q.valvePatch}</td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #b91c1c; background-color: #fef2f2;">${q.totalWasteKg.toFixed(2)}</td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #c2410c; background-color: #fff7ed;">${q.totalWastePct.toFixed(2)}%</td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #166534; background-color: #f0fdf4;">${q.netProductionKg.toFixed(1)}</td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td colspan="14" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No quality production data found for this selection.</td></tr>`;

  const totalWaste = data.wastage.totalWasteKg || 1;
  const wasteStreams = [
    { label: "Loom Wastage", kg: data.wastage.loomWasteKg, share: totalWaste > 0 ? (data.wastage.loomWasteKg / totalWaste) * 100 : 0 },
    { label: "Lamination Wastage", kg: data.wastage.lamWasteKg, share: totalWaste > 0 ? (data.wastage.lamWasteKg / totalWaste) * 100 : 0 },
    { label: "Printing Wastage", kg: data.wastage.printWasteKg, share: totalWaste > 0 ? (data.wastage.printWasteKg / totalWaste) * 100 : 0 },
    { label: "Machine Wastage", kg: data.wastage.machineWasteKg, share: totalWaste > 0 ? (data.wastage.machineWasteKg / totalWaste) * 100 : 0 },
    { label: "Cover Patch Wastage", kg: data.wastage.coverPatchWasteKg, share: totalWaste > 0 ? (data.wastage.coverPatchWasteKg / totalWaste) * 100 : 0 },
  ];

  const wasteRows = wasteStreams
    .map((w, idx) => {
      const pctOfGross = data.overall.totalProductionKg > 0 ? (w.kg / data.overall.totalProductionKg) * 100 : 0;
      return `
      <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
        <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${idx + 1}</td>
        <td style="font-weight: 700; font-size: 7.5pt; color: #0f172a; text-align: left; padding-left: 8px;">${w.label}</td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #b91c1c;">${w.kg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #7c3aed; background-color: #faf5ff;">${w.share.toFixed(1)}%</td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #64748b;">${pctOfGross.toFixed(2)}%</td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flexicom - Convertex Production & Wastage Summary (${escapeHtml(periodText)})</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 8mm 8mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 7.5pt;
      color: #0f172a;
      background: #ffffff;
      padding: 4px;
      line-height: 1.25;
    }

    /* Enterprise Standard Company Letterhead */
    .company-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #000000;
      text-transform: uppercase;
    }
    .company-sub {
      font-size: 6.5pt;
      color: #475569;
      margin-top: 1px;
    }
    .doc-main-heading {
      display: inline-block;
      border: 1.5px solid #0f172a;
      background: #f8fafc;
      padding: 2px 14px;
      font-size: 8.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 3px;
      margin-bottom: 2px;
    }
    .doc-meta-strip {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 12px;
      font-size: 6.5pt;
      color: #334155;
      margin-top: 2px;
    }
    .doc-meta-strip strong {
      color: #000000;
    }

    /* KPI Summary Row */
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
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
      font-size: 6pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
    .kpi-val {
      font-size: 8.5pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 1px;
    }

    /* Section Subheadings */
    .section-title {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
      margin-bottom: 3px;
      border-left: 3px solid #0284c7;
      padding-left: 6px;
    }

    /* Fixed-Layout Main Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 7pt;
      table-layout: fixed;
    }
    .data-table th {
      background-color: #e2e8f0 !important;
      border: 1px solid #64748b !important;
      padding: 3px 2px;
      font-weight: 900;
      font-size: 6.5pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1 !important;
      padding: 3px 3px;
      vertical-align: middle;
    }
    tr.totals-row td {
      font-weight: 900 !important;
      font-size: 7.5pt !important;
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      padding: 4px 3px;
    }

    /* Signatures Strip */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      padding: 0 16px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 160px;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 24px;
      padding-top: 3px;
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <!-- Standardized Letterhead Strip -->
  <div class="company-header">
    <div style="width: 70px;">
      <img src="${origin}/logo.png" style="height: 38px; width: auto;" onerror="this.style.display='none'" />
    </div>
    <div style="flex: 1; text-align: center;">
      <div class="company-title">FLEXICOM INDUSTRIES PVT. LIMITED</div>
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CONVERTEX DIVISION</div>
      <div class="doc-main-heading">CONVERTEX PRODUCTION & WASTAGE EXECUTIVE SUMMARY</div>
      <div class="doc-meta-strip">
        <span>Period: <strong>${escapeHtml(periodText)}</strong></span>
        <span>Division: <strong>Convertex Bag Making</strong></span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>
    <div style="width: 70px; text-align: right;">
      <span style="font-size: 6.5pt; font-weight: 800; border: 1px solid #94a3b8; padding: 2px 4px; background: #f8fafc; border-radius: 2px;">
        A4 LANDSCAPE
      </span>
    </div>
  </div>

  <!-- Standard KPI Table Strip -->
  <table class="kpi-table">
    <tr>
      <td>
        <div class="kpi-label">Active Rolls</div>
        <div class="kpi-val">${data.overall.totalRolls}</div>
      </td>
      <td style="background-color: #f0fdf4;">
        <div class="kpi-label" style="color: #166534;">Total Bags (Pcs)</div>
        <div class="kpi-val" style="color: #15803d;">${data.overall.totalProductionPcs.toLocaleString()}</div>
      </td>
      <td style="background-color: #f0fdfa;">
        <div class="kpi-label" style="color: #115e59;">Gross Prod (Kg)</div>
        <div class="kpi-val" style="color: #0f766e;">${data.overall.totalProductionKg.toFixed(1)} kg</div>
      </td>
      <td style="background-color: #fef2f2;">
        <div class="kpi-label" style="color: #991b1b;">Total Waste (Kg)</div>
        <div class="kpi-val" style="color: #b91c1c;">${data.overall.totalWastageKg.toFixed(1)} kg</div>
      </td>
      <td style="background-color: #fff7ed;">
        <div class="kpi-label" style="color: #9a3412;">Scrap Rate %</div>
        <div class="kpi-val" style="color: #c2410c;">${data.overall.totalWastagePct.toFixed(2)}%</div>
      </td>
      <td style="background-color: #f0fdf4;">
        <div class="kpi-label" style="color: #166534;">Net Good Prod (Kg)</div>
        <div class="kpi-val" style="color: #16a34a;">${data.overall.totalNetProductionKg.toFixed(1)} kg</div>
      </td>
    </tr>
  </table>

  <!-- Section 1: Quality Breakdown -->
  <div class="section-title">1. Quality-Wise Production & Wastage Breakdown</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 2.5%;">#</th>
        <th style="width: 14%; text-align: left; padding-left: 6px;">Quality Name</th>
        <th style="width: 6%;">Rolls</th>
        <th style="width: 10%; background-color: #dcfce7 !important; color: #166534;">Bags (Pcs)</th>
        <th style="width: 9%; background-color: #ccfbf1 !important; color: #115e59;">Gross (Kg)</th>
        <th style="width: 8%;">Roll Mtr</th>
        <th style="width: 8%;">Net Wt (Kg)</th>
        <th style="width: 6%;">Avg GSM</th>
        <th style="width: 5%;">Cover OS</th>
        <th style="width: 5%;">Cover DS</th>
        <th style="width: 5%;">Valve</th>
        <th style="width: 8%; background-color: #fee2e2 !important; color: #991b1b;">Waste (Kg)</th>
        <th style="width: 6.5%; background-color: #ffedd5 !important; color: #9a3412;">Waste %</th>
        <th style="width: 9%; background-color: #dcfce7 !important; color: #166534;">Net Good (Kg)</th>
      </tr>
    </thead>
    <tbody>
      ${qualityRows}
      <tr class="totals-row">
        <td style="text-align: center;">Σ</td>
        <td style="font-weight: 800; text-transform: uppercase;">Totals:</td>
        <td style="text-align: center; font-family: monospace; color: #0284c7;">${data.overall.totalRolls}</td>
        <td style="text-align: right; font-family: monospace; color: #15803d;">${data.overall.totalProductionPcs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace; color: #0f766e;">${data.overall.totalProductionKg.toFixed(1)} kg</td>
        <td style="text-align: right; font-family: monospace; color: #0284c7;">${data.overall.totalRollMtr.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${data.overall.totalNetWt.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #0369a1;">${data.overall.avgGsm.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #4338ca;">${data.overall.totalCoverPatchOs}</td>
        <td style="text-align: right; font-family: monospace; color: #4338ca;">${data.overall.totalCoverPatchDs}</td>
        <td style="text-align: right; font-family: monospace; color: #3730a3;">${data.overall.totalValvePatch}</td>
        <td style="text-align: right; font-family: monospace; color: #b91c1c;">${data.overall.totalWastageKg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace; color: #c2410c;">${data.overall.totalWastagePct.toFixed(2)}%</td>
        <td style="text-align: right; font-family: monospace; color: #166534;">${data.overall.totalNetProductionKg.toFixed(1)} kg</td>
      </tr>
    </tbody>
  </table>

  <!-- Section 2: Scrap Streams -->
  <div class="section-title">2. Granular Scrap Stream Breakdown</div>
  <table class="data-table" style="width: 70%;">
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 38%; text-align: left; padding-left: 8px;">Scrap Stream / Category</th>
        <th style="width: 20%; text-align: right; padding-right: 8px;">Waste (Kg)</th>
        <th style="width: 18%; text-align: right; padding-right: 8px;">Share of Scrap (%)</th>
        <th style="width: 20%; text-align: right; padding-right: 8px;">% of Gross Output</th>
      </tr>
    </thead>
    <tbody>
      ${wasteRows}
      <tr class="totals-row">
        <td style="text-align: center;">Σ</td>
        <td style="font-weight: 800; text-transform: uppercase;">Total Scrap Recorded:</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #b91c1c;">${data.overall.totalWastageKg.toFixed(2)} kg</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #7c3aed;">100.0%</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #c2410c;">${data.overall.totalWastagePct.toFixed(2)}%</td>
      </tr>
    </tbody>
  </table>

  <!-- Standard 4-Block Signatures Strip -->
  <div class="signatures-container">
    <div class="sig-box">
      <div class="sig-line">Prepared By</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Production In-Charge</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Quality Head</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Plant Head / GM</div>
    </div>
  </div>
</body>
</html>`;
}

export function printConvertexSummaryReport(
  data: ConvertexSummaryResult,
  dateRange: string
): void {
  const html = generateConvertexSummaryHtml(data, dateRange);
  let iframe = document.getElementById("convertex-summary-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "convertex-summary-print-iframe";
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
        console.error("Iframe print failed, falling back to window print", err);
        fallbackWindowPrint(html);
      }
    };

    setTimeout(triggerPrint, 250);
  } else {
    fallbackWindowPrint(html);
  }
}

function fallbackWindowPrint(html: string): void {
  const win = window.open("", "_blank", "width=1200,height=800");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  }
}
