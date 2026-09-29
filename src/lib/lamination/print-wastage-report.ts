import { LaminationWastageReportData } from "./lamination-wastage-types";

export function generateWastageReportHtml(data: LaminationWastageReportData): string {
  const rmUsed = Number(data.rawMaterialUsedKg.toFixed(2));
  const lumpsKg = Number(data.lumpsWastageKg.toFixed(2));
  const lumpsPct = Number(data.lumpsWastagePct.toFixed(2));

  const fabricBase = Number(data.fabricNetWeightKg.toFixed(2));
  const fabricKg = Number(data.fabricWastageKg.toFixed(2));
  const fabricPct = Number(data.fabricWastagePct.toFixed(2));

  const totalBase = Number(data.totalBaseKg.toFixed(2));
  const totalWaste = Number(data.totalWastageKg.toFixed(2));
  const totalPct = Number(data.totalWastagePct.toFixed(2));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lamination Wastage Report - ${data.date} (${data.shiftName})</title>
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
      line-height: 1.35;
    }
    .header-container {
      text-align: center;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 6px;
      margin-bottom: 12px;
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
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .kpi-box {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      text-align: center;
      background: #ffffff;
    }
    .kpi-title {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .kpi-value {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #94a3b8;
    }
    .data-table th, .data-table td {
      border: 1px solid #cbd5e1;
      padding: 7px 8px;
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
    .totals-row td {
      background-color: #f8fafc;
      font-weight: 700;
      border-top: 2px solid #64748b;
      border-bottom: 2px solid #64748b;
      padding: 8px 8px;
    }
    .signatures-table {
      width: 100%;
      margin-top: 40px;
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
    <div class="report-title">LAMINATION SHIFT WASTAGE & SCRAP REPORT</div>
  </div>

  <table class="meta-table">
    <tr>
      <td width="25%"><span class="meta-label">Date:</span> <span class="meta-value">${data.date}</span></td>
      <td width="25%"><span class="meta-label">Shift:</span> <span class="meta-value">${data.shiftName}</span></td>
      <td width="25%"><span class="meta-label">Operator:</span> <span class="meta-value">${data.operatorName || "—"}</span></td>
      <td width="25%"><span class="meta-label">Contractor:</span> <span class="meta-value">${data.contractorName || "—"}</span></td>
    </tr>
    ${data.remarks ? `
    <tr>
      <td colspan="4"><span class="meta-label">Shift Remarks:</span> <span class="meta-value">${data.remarks}</span></td>
    </tr>` : ""}
  </table>

  <!-- KPI Cards -->
  <table class="kpi-table">
    <tr>
      <td width="33.33%" class="kpi-box" style="background: #f0f9ff;">
        <div class="kpi-title">Polymer Lumps Wastage</div>
        <div class="kpi-value" style="color: #0369a1;">${lumpsKg.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style="font-size: 8.5pt;">kg</span> <span style="font-size: 9pt; font-weight: 600; color: #0284c7;">(${lumpsPct}%)</span></div>
      </td>
      <td width="33.33%" class="kpi-box" style="background: #f5f3ff;">
        <div class="kpi-title">Fabric Edge / Reject Wastage</div>
        <div class="kpi-value" style="color: #6d28d9;">${fabricKg.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style="font-size: 8.5pt;">kg</span> <span style="font-size: 9pt; font-weight: 600; color: #7c3aed;">(${fabricPct}%)</span></div>
      </td>
      <td width="33.33%" class="kpi-box" style="background: #fef2f2;">
        <div class="kpi-title">Total Shift Wastage</div>
        <div class="kpi-value" style="color: #be123c;">${totalWaste.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style="font-size: 8.5pt;">kg</span> <span style="font-size: 9pt; font-weight: 600; color: #e11d48;">(${totalPct}%)</span></div>
      </td>
    </tr>
  </table>

  <!-- Wastage Breakdown Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th width="6%">S.No.</th>
        <th width="20%" style="text-align: left; padding-left: 8px;">Wastage Type</th>
        <th width="32%" style="text-align: left; padding-left: 8px;">Base Input Material (Source)</th>
        <th width="14%" style="text-align: right; padding-right: 8px;">Base Qty (kg)</th>
        <th width="14%" style="text-align: right; padding-right: 8px;">Wastage (kg)</th>
        <th width="14%" style="text-align: right; padding-right: 8px;">Wastage %</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center; font-weight: 500;">1</td>
        <td style="font-weight: 700; text-align: left; padding-left: 8px; color: #0369a1;">Lumps</td>
        <td style="text-align: left; padding-left: 8px;">Raw Material Used (Manual Total)</td>
        <td style="text-align: right; padding-right: 8px; font-weight: 500;">${rmUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; font-weight: 700; color: #0f172a;">${lumpsKg.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; font-weight: 800; color: #0369a1;">${lumpsPct}%</td>
      </tr>
      <tr>
        <td style="text-align: center; font-weight: 500;">2</td>
        <td style="font-weight: 700; text-align: left; padding-left: 8px; color: #6d28d9;">Fabric</td>
        <td style="text-align: left; padding-left: 8px;">Production Sheet Total Net Weight</td>
        <td style="text-align: right; padding-right: 8px; font-weight: 500;">${fabricBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; font-weight: 700; color: #0f172a;">${fabricKg.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; font-weight: 800; color: #6d28d9;">${fabricPct}%</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td colspan="3" style="text-align: center; text-transform: uppercase;">TOTAL SHIFT RECONCILIATION</td>
        <td style="text-align: right; padding-right: 8px; color: #0f172a;">${totalBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; color: #be123c;">${totalWaste.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; color: #be123c;">${totalPct}%</td>
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

export function printWastageReport(data: LaminationWastageReportData) {
  const html = generateWastageReportHtml(data);
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
