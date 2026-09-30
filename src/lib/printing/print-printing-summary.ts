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

  // Customer rows
  const customerRowsHtml =
    data.customers.length > 0
      ? data.customers
          .map((c, i) => `
            <tr style="${i % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; font-size: 7.5pt;">${i + 1}</td>
              <td style="font-weight: 800; font-size: 8pt; color: #0f172a;">${c.companyName}</td>
              <td style="font-size: 7.5pt; color: #475569;">${c.unitName || "Main Plant"}</td>
              <td style="text-align: center; font-weight: 700; font-size: 8pt;">${c.totalRolls}</td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt;">${c.targetMtrs.toLocaleString()}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 8pt; color: #0284c7; background-color: #f0f9ff;">
                ${c.printMtrs.toLocaleString()}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt;">${c.productionMtrs.toLocaleString()}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; font-size: 8pt; color: #0f172a;">
                ${c.netWeightKg.toLocaleString()} kg
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 8pt;">${c.avgGsm.toFixed(1)}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 8pt; color: #7c3aed; background-color: #faf5ff;">
                ${c.sharePercent.toFixed(1)}%
              </td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="10" style="text-align: center; padding: 16px; color: #64748b; font-style: italic;">No customer print records found.</td></tr>`;

  // Quality rows
  const qualityRowsHtml =
    data.qualities.length > 0
      ? data.qualities
          .map((q, i) => `
            <tr style="${i % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; font-size: 7.5pt;">${i + 1}</td>
              <td style="font-weight: 800; font-size: 8pt; color: #0f172a;">${q.quality}</td>
              <td style="text-align: center; font-weight: 700; font-size: 8pt;">${q.totalRolls}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 8pt; color: #0284c7; background-color: #f0f9ff;">
                ${q.printMtrs.toLocaleString()}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt;">${q.productionMtrs.toLocaleString()}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; font-size: 8pt; color: #0f172a;">
                ${q.netWeightKg.toLocaleString()} kg
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 8pt;">${q.avgGsm.toFixed(1)}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 8pt; color: #16a34a; background-color: #f0fdf4;">
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
  <title>Flexicom - Printing Production Summary Report (${periodText})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 9mm 10mm 9mm;
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
      line-height: 1.3;
    }
    .company-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }
    .company-title {
      font-size: 13.5pt;
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
    .doc-badge {
      text-align: right;
    }
    .doc-type {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .doc-meta {
      font-size: 7pt;
      color: #64748b;
      margin-top: 2px;
      font-family: monospace;
    }

    /* Overall KPI Grid */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 8px;
      background: #ffffff;
    }
    .kpi-title {
      font-size: 6.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .kpi-num {
      font-size: 12pt;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
    }
    .kpi-sub {
      font-size: 6.5pt;
      color: #475569;
      margin-top: 1px;
    }

    /* Section Headings */
    .section-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 10px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 11px;
      background-color: #0f172a;
      border-radius: 1px;
    }

    /* Table Styles */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-size: 7pt;
      font-weight: 700;
      padding: 5px 6px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      border: 1px solid #0f172a;
    }
    td {
      padding: 5px 6px;
      border: 1px solid #e2e8f0;
      font-size: 7.5pt;
    }

    /* Signatures */
    .sign-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .sign-card {
      border-top: 1.5px solid #0f172a;
      padding-top: 5px;
      text-align: center;
    }
    .sign-role {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
    }
    .sign-sub {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 1px;
    }
    .footer-note {
      margin-top: 12px;
      padding-top: 5px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="company-header">
    <div style="display: flex; align-items: center; gap: 10px;">
      <img src="${origin}/flexicom-logo.png" alt="Flexicom" style="height: 36px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
      <div>
        <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
        <div class="company-sub">Printing & Conversion Division · Executive Production & Dispatch Summary</div>
      </div>
    </div>
    <div class="doc-badge">
      <div class="doc-type">Printing Production Summary</div>
      <div class="doc-meta">Period: ${periodText}</div>
      <div class="doc-meta">Generated: ${genTimestamp}</div>
    </div>
  </div>

  <!-- Overall Performance KPIs -->
  <div class="kpi-row">
    <div class="kpi-card" style="border-left: 3.5px solid #0284c7;">
      <div class="kpi-title">Total Printed Metres</div>
      <div class="kpi-num" style="color: #0369a1;">${data.overall.totalPrintMtrs.toLocaleString()} <span style="font-size: 7.5pt;">m</span></div>
      <div class="kpi-sub">${data.overall.totalRolls} total rolls printed</div>
    </div>
    <div class="kpi-card" style="border-left: 3.5px solid #16a34a;">
      <div class="kpi-title">Production Net Weight</div>
      <div class="kpi-num" style="color: #15803d;">${data.overall.totalNetWeightKg.toLocaleString()} <span style="font-size: 7.5pt;">kg</span></div>
      <div class="kpi-sub">Avg GSM: ${data.overall.avgGsm.toFixed(1)}</div>
    </div>
    <div class="kpi-card" style="border-left: 3.5px solid #8b5cf6;">
      <div class="kpi-title">Target vs Printed Variance</div>
      <div class="kpi-num" style="color: ${data.overall.varianceMtrs >= 0 ? "#15803d" : "#b91c1c"};">
        ${data.overall.varianceMtrs >= 0 ? "+" : ""}${data.overall.varianceMtrs.toLocaleString()} <span style="font-size: 7.5pt;">m</span>
      </div>
      <div class="kpi-sub">Target: ${data.overall.totalTargetMtrs.toLocaleString()} m</div>
    </div>
    <div class="kpi-card" style="border-left: 3.5px solid #ea580c; background-color: #fffaf5;">
      <div class="kpi-title">Overall Printing Efficiency</div>
      <div class="kpi-num" style="color: #c2410c;">${data.overall.overallEfficiency.toFixed(1)}%</div>
      <div class="kpi-sub">Across ${data.overall.totalReports} shift reports</div>
    </div>
  </div>

  <!-- 1. Customer-Wise Printing Report -->
  <div class="section-title">1. Customer-Wise Printing Performance</div>
  <table>
    <thead>
      <tr>
        <th style="width: 4%; text-align: center;">#</th>
        <th style="width: 25%; text-align: left;">Customer / Party Name</th>
        <th style="width: 14%; text-align: left;">Unit / Branch</th>
        <th style="width: 7%; text-align: center;">Rolls</th>
        <th style="width: 10%; text-align: right;">Target (m)</th>
        <th style="width: 11%; text-align: right;">Printed (m)</th>
        <th style="width: 10%; text-align: right;">Fabric (m)</th>
        <th style="width: 11%; text-align: right;">Net Wt (Kg)</th>
        <th style="width: 8%; text-align: center;">Avg GSM</th>
        <th style="width: 8%; text-align: right;">Share %</th>
      </tr>
    </thead>
    <tbody>
      ${customerRowsHtml}
      <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a;">
        <td colspan="3" style="text-align: right; text-transform: uppercase;">Total Customer Print:</td>
        <td style="text-align: center;">${data.overall.totalRolls}</td>
        <td style="text-align: right; font-family: monospace;">${data.overall.totalTargetMtrs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace; color: #0284c7;">${data.overall.totalPrintMtrs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${data.overall.totalProductionMtrs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${data.overall.totalNetWeightKg.toLocaleString()} kg</td>
        <td style="text-align: center; font-family: monospace;">${data.overall.avgGsm.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #7c3aed;">100.0%</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. Quality-Wise Printing Report -->
  <div class="section-title">2. Quality-Wise Printing Breakdown</div>
  <table>
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 32%; text-align: left;">Fabric Quality / Substrate</th>
        <th style="width: 9%; text-align: center;">Total Rolls</th>
        <th style="width: 14%; text-align: right;">Printed (m)</th>
        <th style="width: 14%; text-align: right;">Fabric (m)</th>
        <th style="width: 14%; text-align: right;">Net Weight (Kg)</th>
        <th style="width: 9%; text-align: center;">Avg GSM</th>
        <th style="width: 9%; text-align: right;">Quality Share</th>
      </tr>
    </thead>
    <tbody>
      ${qualityRowsHtml}
      <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a;">
        <td colspan="2" style="text-align: right; text-transform: uppercase;">Total Quality Print:</td>
        <td style="text-align: center;">${data.overall.totalRolls}</td>
        <td style="text-align: right; font-family: monospace; color: #0284c7;">${data.overall.totalPrintMtrs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${data.overall.totalProductionMtrs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${data.overall.totalNetWeightKg.toLocaleString()} kg</td>
        <td style="text-align: center; font-family: monospace;">${data.overall.avgGsm.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #16a34a;">100.0%</td>
      </tr>
    </tbody>
  </table>

  <!-- Signatures -->
  <div class="sign-row">
    <div class="sign-card">
      <div class="sign-role">Printing Supervisor</div>
      <div class="sign-sub">Operational Verification</div>
    </div>
    <div class="sign-card">
      <div class="sign-role">Quality Manager</div>
      <div class="sign-sub">QA & Specification Audit</div>
    </div>
    <div class="sign-card">
      <div class="sign-role">Commercial In-Charge</div>
      <div class="sign-sub">Sales & Billing Reconciliation</div>
    </div>
    <div class="sign-card">
      <div class="sign-role">Plant Head</div>
      <div class="sign-sub">Executive Approval</div>
    </div>
  </div>

  <div class="footer-note">
    <span>Flexicom ERP v4.2 · Printing & Conversion Division</span>
    <span>Generated: ${genTimestamp}</span>
    <span>Authority: Flexicom Quality Management System</span>
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

export function printPrintingSummaryReport(data: PrintingProductionSummaryResult): void {
  const html = generatePrintingSummaryHtml(data);
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

