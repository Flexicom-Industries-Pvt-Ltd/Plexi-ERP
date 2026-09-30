import { PrintingProductionSummaryResult } from "./printing-types";

export function generatePrintingSummaryHtml(data: PrintingProductionSummaryResult): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const periodText =
    data.startDate && data.endDate
      ? `${data.startDate} to ${data.endDate}`
      : "All Active Records";

  const customerRowsHtml =
    data.customers.length > 0
      ? data.customers
          .map((c, i) => `
            <tr style="${i % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; color: #475569;">${i + 1}</td>
              <td style="font-weight: 700; text-align: left; padding-left: 8px; color: #0f172a;">${c.companyName}</td>
              <td style="font-size: 7.5pt; color: #475569; text-align: left; padding-left: 6px;">${c.unitName || "—"}</td>
              <td style="text-align: center; font-family: monospace; font-weight: 700;">${c.totalRolls}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace;">${c.targetMtrs.toLocaleString()}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #0284c7; background-color: #f0f9ff;">
                ${c.printMtrs.toLocaleString()}
              </td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace;">${c.productionMtrs.toLocaleString()}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #0f172a;">
                ${c.netWeightKg.toLocaleString()} kg
              </td>
              <td style="text-align: center; font-family: monospace;">${c.avgGsm.toFixed(1)}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 800; color: #7c3aed; background-color: #faf5ff;">
                ${c.sharePercent.toFixed(1)}%
              </td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="10" style="text-align: center; padding: 16px; color: #64748b; font-style: italic;">No customer print records found.</td></tr>`;

  const qualityRowsHtml =
    data.qualities.length > 0
      ? data.qualities
          .map((q, i) => `
            <tr style="${i % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; color: #475569;">${i + 1}</td>
              <td style="font-weight: 700; text-align: left; padding-left: 8px; color: #0f172a;">${q.quality}</td>
              <td style="text-align: center; font-family: monospace; font-weight: 700;">${q.totalRolls}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #0284c7; background-color: #f0f9ff;">
                ${q.printMtrs.toLocaleString()}
              </td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace;">${q.productionMtrs.toLocaleString()}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #0f172a;">
                ${q.netWeightKg.toLocaleString()} kg
              </td>
              <td style="text-align: center; font-family: monospace;">${q.avgGsm.toFixed(1)}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 800; color: #16a34a; background-color: #f0fdf4;">
                ${q.sharePercent.toFixed(1)}%
              </td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="8" style="text-align: center; padding: 16px; color: #64748b; font-style: italic;">No quality print records found.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Printing Production Summary - ${periodText}</title>
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
      font-size: 8pt;
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
      margin-bottom: 8px;
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
      margin-bottom: 10px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 5px 8px;
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
      font-size: 10pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 1px;
    }

    /* Section Subheadings */
    .section-title {
      font-size: 8pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 8px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 3px;
      height: 10px;
      background-color: #0f172a;
      border-radius: 1px;
    }

    /* Fixed-Layout Main Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 7.5pt;
      table-layout: fixed;
    }
    .data-table th {
      background-color: #e2e8f0 !important;
      border: 1px solid #64748b !important;
      padding: 4px 4px;
      font-weight: 900;
      font-size: 7pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1 !important;
      padding: 4px 5px;
      vertical-align: middle;
    }
    tr.totals-row td {
      font-weight: 900 !important;
      font-size: 8pt !important;
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      padding: 5px 5px;
    }

    /* Signatures Strip */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding: 0 20px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 28px;
      padding-top: 4px;
      font-weight: 700;
      font-size: 7.5pt;
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
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • PRINTING DIVISION</div>
      <div class="doc-main-heading">PRINTING PRODUCTION & DISPATCH SUMMARY REPORT</div>
      <div class="doc-meta-strip">
        <span>Period: <strong>${periodText}</strong></span>
        <span>Total Shift Reports: <strong>${data.overall.totalReports}</strong></span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
        <span>Authority: <strong>Flexicom QMS ISO 9001:2015</strong></span>
      </div>
    </div>
    <div style="width: 70px;"></div>
  </div>

  <!-- Standard KPI Table Strip -->
  <table class="kpi-table">
    <tr>
      <td style="width: 25%;">
        <div class="kpi-label">Total Printed Metres</div>
        <div class="kpi-val" style="color: #0369a1;">${data.overall.totalPrintMtrs.toLocaleString()} m</div>
        <div style="font-size: 6pt; color: #64748b; margin-top: 1px;">${data.overall.totalRolls} total rolls</div>
      </td>
      <td style="width: 25%;">
        <div class="kpi-label">Total Production Net Wt</div>
        <div class="kpi-val" style="color: #15803d;">${data.overall.totalNetWeightKg.toLocaleString()} kg</div>
        <div style="font-size: 6pt; color: #64748b; margin-top: 1px;">Avg GSM: ${data.overall.avgGsm.toFixed(1)}</div>
      </td>
      <td style="width: 25%;">
        <div class="kpi-label">Target vs Printed Variance</div>
        <div class="kpi-val" style="color: ${data.overall.varianceMtrs >= 0 ? "#15803d" : "#b91c1c"};">
          ${data.overall.varianceMtrs >= 0 ? "+" : ""}${data.overall.varianceMtrs.toLocaleString()} m
        </div>
        <div style="font-size: 6pt; color: #64748b; margin-top: 1px;">Target: ${data.overall.totalTargetMtrs.toLocaleString()} m</div>
      </td>
      <td style="width: 25%; background-color: #fafaf9;">
        <div class="kpi-label">Printing Efficiency</div>
        <div class="kpi-val" style="color: #c2410c;">${data.overall.overallEfficiency.toFixed(1)}%</div>
        <div style="font-size: 6pt; color: #64748b; margin-top: 1px;">Overall performance</div>
      </td>
    </tr>
  </table>

  <!-- 1. Customer-Wise Table -->
  <div class="section-title">1. Customer-Wise Printing Performance</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 24%; text-align: left; padding-left: 8px;">Customer / Party Name</th>
        <th style="width: 14%; text-align: left; padding-left: 6px;">Unit / Branch</th>
        <th style="width: 7%;">Rolls</th>
        <th style="width: 11%; text-align: right; padding-right: 8px;">Target (m)</th>
        <th style="width: 11%; text-align: right; padding-right: 8px;">Printed (m)</th>
        <th style="width: 11%; text-align: right; padding-right: 8px;">Fabric (m)</th>
        <th style="width: 11%; text-align: right; padding-right: 8px;">Net Wt (Kg)</th>
        <th style="width: 7%;">Avg GSM</th>
        <th style="width: 7%; text-align: right; padding-right: 8px;">Share %</th>
      </tr>
    </thead>
    <tbody>
      ${customerRowsHtml}
      <tr class="totals-row">
        <td colspan="3" style="text-align: right; padding-right: 8px; text-transform: uppercase;">Total Customer Print:</td>
        <td style="text-align: center; font-family: monospace;">${data.overall.totalRolls}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace;">${data.overall.totalTargetMtrs.toLocaleString()}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #0284c7;">${data.overall.totalPrintMtrs.toLocaleString()}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace;">${data.overall.totalProductionMtrs.toLocaleString()}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace;">${data.overall.totalNetWeightKg.toLocaleString()} kg</td>
        <td style="text-align: center; font-family: monospace;">${data.overall.avgGsm.toFixed(1)}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #7c3aed;">100.0%</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. Quality-Wise Table -->
  <div class="section-title">2. Quality-Wise Printing Breakdown</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 33%; text-align: left; padding-left: 8px;">Fabric Quality / Substrate</th>
        <th style="width: 10%;">Total Rolls</th>
        <th style="width: 14%; text-align: right; padding-right: 8px;">Printed (m)</th>
        <th style="width: 14%; text-align: right; padding-right: 8px;">Fabric (m)</th>
        <th style="width: 14%; text-align: right; padding-right: 8px;">Net Weight (Kg)</th>
        <th style="width: 10%;">Avg GSM</th>
        <th style="width: 10%; text-align: right; padding-right: 8px;">Quality Share</th>
      </tr>
    </thead>
    <tbody>
      ${qualityRowsHtml}
      <tr class="totals-row">
        <td colspan="2" style="text-align: right; padding-right: 8px; text-transform: uppercase;">Total Quality Print:</td>
        <td style="text-align: center; font-family: monospace;">${data.overall.totalRolls}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #0284c7;">${data.overall.totalPrintMtrs.toLocaleString()}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace;">${data.overall.totalProductionMtrs.toLocaleString()}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace;">${data.overall.totalNetWeightKg.toLocaleString()} kg</td>
        <td style="text-align: center; font-family: monospace;">${data.overall.avgGsm.toFixed(1)}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #16a34a;">100.0%</td>
      </tr>
    </tbody>
  </table>

  <!-- Standard Signatures Strip -->
  <div class="signatures-container">
    <div class="sig-box">
      <div class="sig-line">Printing Supervisor</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Quality Manager</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Commercial In-Charge</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Plant Head / Manager</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
}

/**
 * Triggers native browser print via hidden iframe with robust fallback
 */
export function printPrintingSummaryReport(data: PrintingProductionSummaryResult): void {
  const html = generatePrintingSummaryHtml(data);
  let iframe = document.getElementById("printing-sum-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "printing-sum-print-iframe";
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
    win.focus();
  }
}
