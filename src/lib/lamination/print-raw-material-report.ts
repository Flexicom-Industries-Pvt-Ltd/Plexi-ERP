import { LaminationRawMaterialReportData } from "./lamination-raw-material-types";

export function generateRawMaterialReportHtml(data: LaminationRawMaterialReportData): string {
  const manualTotal = Number(data.manualTotalKg.toFixed(2));
  const machineTotal = Number(data.machineTotalKg.toFixed(2));
  const diffTotal = Number(data.diffTotalKg.toFixed(2));
  const totalPercentage = Number(
    data.entries.reduce((sum, e) => sum + (Number(e.percentage) || 0), 0).toFixed(1)
  );

  const rowsHtml = (data.entries || [])
    .map((e, idx) => {
      const diffVal = Number(e.diffKg.toFixed(2));
      const diffColor = diffVal > 0 ? "#15803d" : diffVal < 0 ? "#b45309" : "#334155";
      const diffSign = diffVal > 0 ? `+${diffVal}` : `${diffVal}`;

      return `
        <tr>
          <td style="text-align: center; font-weight: 500;">${idx + 1}</td>
          <td style="font-weight: 600; text-align: left; padding-left: 8px;">${e.materialName}</td>
          <td style="text-align: right; padding-right: 8px;">${Number(e.percentage).toFixed(1)}%</td>
          <td style="text-align: right; padding-right: 8px; font-weight: 500;">${Number(e.manualKg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; padding-right: 8px; font-weight: 500;">${Number(e.machineKg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align: right; padding-right: 8px; font-weight: 700; color: ${diffColor};">${diffSign}</td>
          <td style="text-align: left; padding-left: 6px; font-size: 8.5pt;">${e.remarks || "—"}</td>
        </tr>
      `;
    })
    .join("");

  const netDiffSign = diffTotal > 0 ? `+${diffTotal}` : `${diffTotal}`;
  const netDiffColor = diffTotal > 0 ? "#15803d" : diffTotal < 0 ? "#b45309" : "#0f172a";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lamination Raw Material Report - ${data.date} (${data.shiftName})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 9pt;
      line-height: 1.3;
    }
    .header-container {
      text-align: center;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .company-title {
      font-size: 15pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0369a1;
      text-transform: uppercase;
      margin: 0;
    }
    .company-address {
      font-size: 8pt;
      color: #475569;
      margin-top: 2px;
    }
    .report-title {
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #0f172a;
      margin-top: 6px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
    }
    .meta-table td {
      padding: 5px 8px;
      font-size: 8.5pt;
      border: 1px solid #e2e8f0;
    }
    .meta-label {
      font-weight: 600;
      color: #475569;
      display: inline-block;
      margin-right: 4px;
    }
    .meta-value {
      font-weight: 700;
      color: #0f172a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #94a3b8;
    }
    .data-table th, .data-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 6px;
      font-size: 9pt;
    }
    .data-table th {
      background-color: #f1f5f9;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8pt;
      color: #1e293b;
      text-align: center;
    }
    .subhead-manual {
      background-color: #f0f9ff !important;
      color: #0369a1 !important;
    }
    .subhead-machine {
      background-color: #f5f3ff !important;
      color: #6d28d9 !important;
    }
    .subhead-diff {
      background-color: #f0fdf4 !important;
      color: #15803d !important;
    }
    .totals-row td {
      background-color: #f8fafc;
      font-weight: 700;
      border-top: 2px solid #64748b;
      border-bottom: 2px solid #64748b;
      padding: 7px 6px;
    }
    .summary-cards-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .summary-card {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: center;
      background: #ffffff;
    }
    .summary-card-title {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .summary-card-value {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
    }
    .signatures-table {
      width: 100%;
      margin-top: 36px;
      border-collapse: collapse;
    }
    .signatures-table td {
      width: 33.33%;
      text-align: center;
      vertical-align: bottom;
      padding: 0 16px;
    }
    .sig-line {
      border-top: 1px solid #475569;
      padding-top: 5px;
      font-weight: 600;
      font-size: 8.5pt;
      color: #334155;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="company-title">FLEXICOM INDUSTRIES PVT. LIMITED</div>
    <div class="company-address">Sidco Industrial Estate, Ghatti Kathua, Phase-II, (J & K) 184143</div>
    <div class="report-title">LAMINATION RAW MATERIAL CONSUMPTION & VARIANCE REPORT</div>
  </div>

  <table class="meta-table">
    <tr>
      <td width="25%"><span class="meta-label">Date:</span> <span class="meta-value">${data.date}</span></td>
      <td width="25%"><span class="meta-label">Shift:</span> <span class="meta-value">${data.shiftName}</span></td>
      <td width="25%"><span class="meta-label">Operator:</span> <span class="meta-value">${data.operatorName || "—"}</span></td>
      <td width="25%"><span class="meta-label">Status:</span> <span class="meta-value">${data.status}</span></td>
    </tr>
    ${data.remarks ? `
    <tr>
      <td colspan="4"><span class="meta-label">Shift Remarks:</span> <span class="meta-value">${data.remarks}</span></td>
    </tr>` : ""}
  </table>

  <!-- KPI Reconciliation Summary -->
  <table class="summary-cards-table">
    <tr>
      <td width="30%" class="summary-card" style="border-right: none; background: #f0f9ff;">
        <div class="summary-card-title">Manual Target Usage</div>
        <div class="summary-card-value" style="color: #0369a1;">${manualTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style="font-size: 8.5pt; font-weight: 500;">kg</span></div>
      </td>
      <td width="5%" style="text-align: center; font-size: 14pt; font-weight: 800; color: #64748b;">−</td>
      <td width="30%" class="summary-card" style="border-left: none; border-right: none; background: #f5f3ff;">
        <div class="summary-card-title">Actual Machine Input</div>
        <div class="summary-card-value" style="color: #6d28d9;">${machineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style="font-size: 8.5pt; font-weight: 500;">kg</span></div>
      </td>
      <td width="5%" style="text-align: center; font-size: 14pt; font-weight: 800; color: #64748b;">=</td>
      <td width="30%" class="summary-card" style="border-left: none; background: #f0fdf4;">
        <div class="summary-card-title">Variance (Diff = Manual − Machine)</div>
        <div class="summary-card-value" style="color: ${netDiffColor};">${netDiffSign} <span style="font-size: 8.5pt; font-weight: 500;">kg</span></div>
      </td>
    </tr>
  </table>

  <!-- Detailed Consumption Comparison Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th width="5%">S.No.</th>
        <th width="32%" style="text-align: left; padding-left: 8px;">Raw Material</th>
        <th width="10%">Recipe %</th>
        <th width="16%" class="subhead-manual">Manual Qty (kg)</th>
        <th width="16%" class="subhead-machine">Machine Qty (kg)</th>
        <th width="13%" class="subhead-diff">Diff (kg)</th>
        <th width="8%">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td colspan="2" style="text-align: center;">TOTAL USAGE / BATCH</td>
        <td style="text-align: right; padding-right: 8px;">${totalPercentage}%</td>
        <td style="text-align: right; padding-right: 8px; color: #0369a1;">${manualTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; color: #6d28d9;">${machineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; color: ${netDiffColor};">${netDiffSign}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <!-- Signatures -->
  <table class="signatures-table">
    <tr>
      <td>
        <div class="sig-line">Operator / Technician</div>
      </td>
      <td>
        <div class="sig-line">Shift Supervisor</div>
      </td>
      <td>
        <div class="sig-line">Plant Head / Manager</div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function printRawMaterialReport(data: LaminationRawMaterialReportData) {
  const html = generateRawMaterialReportHtml(data);
  const printIframe = document.createElement("iframe");
  printIframe.style.position = "fixed";
  printIframe.style.right = "0";
  printIframe.style.bottom = "0";
  printIframe.style.width = "0";
  printIframe.style.height = "0";
  printIframe.style.border = "none";
  printIframe.srcdoc = html;

  document.body.appendChild(printIframe);

  printIframe.onload = () => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch (e) {
      console.error("Print trigger failed:", e);
    } finally {
      setTimeout(() => {
        document.body.removeChild(printIframe);
      }, 2000);
    }
  };
}
