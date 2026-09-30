import { PrintingDailyReportData, computePrintingTotals } from "./printing-types";

export function generatePrintingReportHtml(data: PrintingDailyReportData): string {
  const totals = computePrintingTotals(data.entries);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `PRN-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  const rowsHtml = data.entries.length > 0
    ? data.entries
        .map((entry, index) => {
          const targetMtr = Number(entry.targetProductionMtrs) || 0;
          const prodMtr = Number(entry.productionMeter) || 0;
          const netWt = Number(entry.netWeight) || 0;
          const avg = Number(entry.avgWeight) || 0;
          const printMtr = Number(entry.printMeter) || 0;

          return `
            <tr style="${index % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="font-weight: 700; font-size: 7.5pt; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${entry.companyName || "—"}
              </td>
              <td style="font-size: 7.5pt; color: #334155; text-align: center;">
                ${entry.unitName || "—"}
              </td>
              <td style="font-size: 7.5pt; color: #334155; text-align: center;">
                ${entry.grade || "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #1e40af;">
                ${targetMtr > 0 ? targetMtr.toLocaleString() : "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; color: #475569;">
                ${entry.drumSize || "—"}
              </td>
              <td style="font-size: 7.5pt; font-weight: 600; color: #0f172a;">
                ${entry.quality || "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 800; color: #0f172a; background: #f8fafc;">
                ${entry.rollNumber || "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #0284c7;">
                ${entry.loomNumber ? `#${entry.loomNumber}` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #334155;">
                ${prodMtr > 0 ? prodMtr.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">
                ${netWt > 0 ? netWt.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #0369a1; background-color: #f0f9ff;">
                ${avg > 0 ? avg.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${printMtr > 0 ? printMtr.toLocaleString() : "—"}
              </td>
              <td style="font-size: 7pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${entry.remarks || ""}
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="14" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No production entries logged for this shift.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flexicom - Printing Daily Production Report (${data.date} - ${data.shiftName})</title>
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
      margin-bottom: 5px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 3px 5px;
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
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • PRINTING DIVISION</div>
      <div class="doc-main-heading">PRINTING MACHINE DAILY PRODUCTION REPORT</div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>Date: <strong>${data.date}</strong></span>
        <span>Shift: <strong>${data.shiftName}</strong></span>
        <span>Supervisor: <strong>${data.supervisorName || "—"}</strong></span>
        <span>Operator: <strong>${data.operatorName || "—"}</strong></span>
        <span>Status: <strong>${data.status}</strong></span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>
    <div style="width: 70px; text-align: right;">
      <span style="font-size: 6.5pt; font-weight: 800; border: 1px solid #94a3b8; padding: 2px 4px; background: #f8fafc; border-radius: 2px;">
        A4 LANDSCAPE
      </span>
    </div>
  </div>

  <!-- KPI Summary Row -->
  <table class="kpi-table">
    <tr>
      <td>
        <div class="kpi-label">Total Rolls</div>
        <div class="kpi-val">${totals.totalRolls}</div>
      </td>
      <td>
        <div class="kpi-label">Target Prod (m)</div>
        <div class="kpi-val" style="color: #1e40af;">${totals.totalTargetMtrs.toLocaleString()}</div>
      </td>
      <td>
        <div class="kpi-label">Fabric Prod (m)</div>
        <div class="kpi-val" style="color: #0284c7;">${totals.totalProductionMtrs.toLocaleString()}</div>
      </td>
      <td>
        <div class="kpi-label">Total Net Wt (kg)</div>
        <div class="kpi-val">${totals.totalNetWt.toFixed(1)}</div>
      </td>
      <td>
        <div class="kpi-label">Avg GSM (g/m)</div>
        <div class="kpi-val" style="color: #0369a1;">${totals.avgWeightGsm.toFixed(1)}</div>
      </td>
      <td>
        <div class="kpi-label">Total Print (m)</div>
        <div class="kpi-val" style="color: #15803d;">${totals.totalPrintMtrs.toLocaleString()}</div>
      </td>
      <td>
        <div class="kpi-label">Variance (m)</div>
        <div class="kpi-val" style="color: ${totals.varianceMtrs < 0 ? '#b91c1c' : '#15803d'};">
          ${totals.varianceMtrs > 0 ? `+${totals.varianceMtrs.toLocaleString()}` : totals.varianceMtrs.toLocaleString()}
        </div>
      </td>
      <td>
        <div class="kpi-label">Efficiency</div>
        <div class="kpi-val" style="color: ${totals.efficiencyPercent >= 95 ? '#15803d' : '#d97706'};">
          ${totals.efficiencyPercent.toFixed(1)}%
        </div>
      </td>
    </tr>
  </table>

  <!-- Main Fixed 14-Column Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 3%;">Sl.</th>
        <th style="width: 12%;">Company Name</th>
        <th style="width: 7%;">Unit</th>
        <th style="width: 7%;">Grade</th>
        <th style="width: 8%;">Target (m)</th>
        <th style="width: 8%;">Drum Size</th>
        <th style="width: 11%;">Quality</th>
        <th style="width: 7%;">Roll No.</th>
        <th style="width: 6%;">Loom</th>
        <th style="width: 8%;">Prod (m)</th>
        <th style="width: 7%;">Net Wt</th>
        <th style="width: 6%;">Avg</th>
        <th style="width: 8%;">Print (m)</th>
        <th style="width: 12%;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="totals-row">
        <td style="text-align: center;">Σ</td>
        <td colspan="3" style="font-weight: 800; text-transform: uppercase;">Totals / Overall Averages</td>
        <td style="text-align: right; font-family: monospace; color: #1e40af;">${totals.totalTargetMtrs.toLocaleString()}</td>
        <td colspan="4"></td>
        <td style="text-align: right; font-family: monospace; color: #0284c7;">${totals.totalProductionMtrs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${totals.totalNetWt.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #0369a1;">${totals.avgWeightGsm.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #15803d;">${totals.totalPrintMtrs.toLocaleString()}</td>
        <td style="font-size: 6.5pt; color: #475569;">${totals.efficiencyPercent.toFixed(1)}% Eff.</td>
      </tr>
    </tbody>
  </table>

  ${data.remarks ? `
    <div style="margin-top: 4px; padding: 4px 6px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 7pt; color: #334155;">
      <strong>Shift Remarks / Observations:</strong> ${data.remarks}
    </div>
  ` : ""}

  <!-- Standard 4-Block Signatures Strip -->
  <div class="signatures-container">
    <div class="sig-box">
      <div class="sig-line">Operator Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Supervisor Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Quality In-Charge</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Plant Head / Manager</div>
    </div>
  </div>
</body>
</html>`;
}

export function printPrintingReport(data: PrintingDailyReportData): void {
  const html = generatePrintingReportHtml(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print the daily production report.");
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
