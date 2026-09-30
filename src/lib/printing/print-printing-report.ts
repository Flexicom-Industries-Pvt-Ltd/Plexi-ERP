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
  const docRef = `PRN-${(data.machineNo || "M1").toUpperCase().replace(/\s+/g, "")}-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
  const machineTitle = (data.machineNo || "Machine-1").toUpperCase();

  const rowsHtml = data.entries.length > 0
    ? data.entries
        .map((entry, index) => {
          const prodMtr = Number(entry.productionMeter) || 0;
          const netWt = Number(entry.netWeight) || 0;
          const avg = Number(entry.avgWeight) || 0;
          const printMtr = Number(entry.printMeter) || 0;

          return `
            <tr style="${index % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; font-size: 8pt; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="font-weight: 700; font-size: 8.5pt; color: #0f172a; white-space: nowrap;">
                ${entry.quality || "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a; background: #f8fafc;">
                ${entry.rollNumber || "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 700; color: #0284c7;">
                ${entry.loomNumber || "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 600; color: #334155;">
                ${prodMtr > 0 ? prodMtr.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 600; color: #334155;">
                ${netWt > 0 ? netWt.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; color: #0369a1; background-color: #f0f9ff;">
                ${avg > 0 ? avg.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8.5pt; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${printMtr > 0 ? printMtr.toLocaleString() : "—"}
              </td>
              <td style="font-size: 7.5pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${entry.remarks || ""}
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No production entries logged for this shift.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flexicom - Printing ${machineTitle} Daily Production Report (${data.date} - ${data.shiftName})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 7mm 8mm 7mm;
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
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .company-title {
      font-size: 13.5pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #000000;
      text-transform: uppercase;
    }
    .company-sub {
      font-size: 7pt;
      color: #475569;
      margin-top: 1px;
    }
    .doc-main-heading {
      display: inline-block;
      border: 1.5px solid #0f172a;
      background: #f8fafc;
      padding: 3px 16px;
      font-size: 9pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 4px;
      margin-bottom: 3px;
    }
    .doc-meta-strip {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 14px;
      font-size: 7pt;
      color: #334155;
      margin-top: 3px;
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
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      display: block;
      margin-bottom: 1px;
    }
    .kpi-val {
      font-size: 10pt;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
    }
    .kpi-unit {
      font-size: 6.5pt;
      font-weight: normal;
      color: #64748b;
    }

    /* Main Data Table */
    .main-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin-bottom: 6px;
      border: 1px solid #0f172a;
    }
    .main-table th {
      background-color: #0f172a;
      color: #ffffff;
      padding: 5px 4px;
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #334155;
      vertical-align: middle;
    }
    .main-table td {
      padding: 4px 4px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }

    .totals-row td {
      background-color: #f1f5f9;
      font-weight: 900;
      font-family: monospace;
      font-size: 8pt;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      padding: 5px 4px;
    }

    /* Signatures Strip */
    .sig-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      margin-bottom: 8px;
    }
    .sig-table td {
      width: 25%;
      border-top: 1px dashed #64748b;
      padding-top: 4px;
      text-align: center;
      font-size: 7pt;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
    }
    .footer-audit {
      border-top: 1px solid #e2e8f0;
      padding-top: 3px;
      display: flex;
      justify-content: space-between;
      font-size: 6pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- Enterprise Header / Letterhead -->
  <div class="company-header">
    <div style="display: flex; align-items: center; gap: 8px;">
      <img src="${origin}/logo.png" alt="Logo" style="height: 38px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
      <div>
        <div class="company-title">${data.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED"}</div>
        <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • PRINTING DIVISION</div>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-family: monospace; font-size: 7.5pt; font-weight: 800; color: #0284c7;">${docRef}</div>
      <div style="font-size: 6.5pt; color: #64748b;">Generated: ${genTimestamp}</div>
    </div>
  </div>

  <!-- Document Title & Meta -->
  <div style="text-align: center; margin-bottom: 5px;">
    <div class="doc-main-heading">PRINTING ${machineTitle} — DAILY PRODUCTION REPORT</div>
    <div class="doc-meta-strip">
      <div>DATE: <strong>${data.date}</strong></div>
      <div>SHIFT: <strong>${data.shiftName}</strong></div>
      <div>MACHINE: <strong>${machineTitle}</strong></div>
      <div>OPERATOR: <strong>${data.operatorName || "—"}</strong></div>
      <div>SUPERVISOR: <strong>${data.supervisorName || "—"}</strong></div>
      <div>STATUS: <strong>${data.status}</strong></div>
    </div>
  </div>

  <!-- Summary KPI Bento -->
  <table class="kpi-table">
    <tr>
      <td>
        <span class="kpi-label">Total Rolls</span>
        <span class="kpi-val">${totals.totalRolls}</span>
      </td>
      <td>
        <span class="kpi-label">Production (Fabric)</span>
        <span class="kpi-val">${totals.totalProductionMtrs.toLocaleString()} <span class="kpi-unit">m</span></span>
      </td>
      <td>
        <span class="kpi-label">Net Weight</span>
        <span class="kpi-val">${totals.totalNetWt.toLocaleString()} <span class="kpi-unit">kg</span></span>
      </td>
      <td>
        <span class="kpi-label">Average GSM</span>
        <span class="kpi-val" style="color: #0369a1;">${totals.avgWeightGsm} <span class="kpi-unit">g/m</span></span>
      </td>
      <td>
        <span class="kpi-label">Total Print Metre</span>
        <span class="kpi-val" style="color: #15803d;">${totals.totalPrintMtrs.toLocaleString()} <span class="kpi-unit">m</span></span>
      </td>
      <td>
        <span class="kpi-label">Variance</span>
        <span class="kpi-val" style="color: ${totals.varianceMtrs >= 0 ? "#15803d" : "#b91c1c"};">
          ${totals.varianceMtrs >= 0 ? "+" : ""}${totals.varianceMtrs.toLocaleString()} <span class="kpi-unit">m</span>
        </span>
      </td>
      <td>
        <span class="kpi-label">Efficiency</span>
        <span class="kpi-val" style="color: #1d4ed8;">${totals.efficiencyPercent}%</span>
      </td>
    </tr>
  </table>

  <!-- Main Spreadsheet Table -->
  <table class="main-table">
    <thead>
      <tr>
        <th style="width: 28px; text-align: center;">Sl. No.</th>
        <th style="text-align: left; width: 140px;">quality</th>
        <th style="width: 75px; text-align: center;">Roll No.</th>
        <th style="width: 65px; text-align: center;">Loom No.</th>
        <th style="width: 85px; text-align: right;">Production in Metre</th>
        <th style="width: 70px; text-align: right;">Net Wt. (kg)</th>
        <th style="width: 65px; text-align: right;">Avg. (g/m)</th>
        <th style="width: 85px; text-align: right;">Print in Metre</th>
        <th style="text-align: left;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td colspan="4" style="text-align: right; padding-right: 8px;">TOTALS:</td>
        <td style="text-align: right; color: #0f172a;">${totals.totalProductionMtrs.toLocaleString()}</td>
        <td style="text-align: right; color: #0f172a;">${totals.totalNetWt.toFixed(1)}</td>
        <td style="text-align: right; color: #0369a1;">${totals.avgWeightGsm.toFixed(1)}</td>
        <td style="text-align: right; color: #15803d;">${totals.totalPrintMtrs.toLocaleString()}</td>
        <td style="font-size: 7pt; color: #475569; font-weight: 500;">
          Variance: ${totals.varianceMtrs >= 0 ? "+" : ""}${totals.varianceMtrs} m (${totals.efficiencyPercent}%)
        </td>
      </tr>
    </tfoot>
  </table>

  ${data.remarks ? `
    <div style="margin-top: 4px; padding: 4px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 7.5pt;">
      <strong>Shift Notes / Remarks:</strong> ${data.remarks}
    </div>
  ` : ""}

  <!-- Verification Signatures -->
  <table class="sig-table">
    <tr>
      <td>Operator Signature</td>
      <td>QC Inspector Signature</td>
      <td>Shift Supervisor Signature</td>
      <td>Factory Manager</td>
    </tr>
  </table>

  <!-- Footer Audit -->
  <div class="footer-audit">
    <span>Plexi ERP • Manufacturing Execution System • Kathua Plant</span>
    <span>Authoritative Business Record • Ref: ${docRef}</span>
  </div>

</body>
</html>`;
}

export function printPrintingReport(data: PrintingDailyReportData): void {
  const html = generatePrintingReportHtml(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup blocked! Please allow popups for this site to print.");
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
