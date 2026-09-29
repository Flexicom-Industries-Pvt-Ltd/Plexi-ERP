import { LaminationProductionReportData, computeLaminationReportTotals } from "./lamination-types";

export function generateLaminationReportHtml(data: LaminationProductionReportData): string {
  const totals = computeLaminationReportTotals(data.entries);

  // Group entries by quality to display nicely, or display each row serially
  // Notice in the Excel report, when a quality has multiple consecutive rolls, the Quality and Width are shown on the first row of that group or clearly identified!
  const rowsHtml = data.entries
    .map((entry, index) => {
      // Check if previous entry has same quality to match the clean grouped style from the Excel sheet
      const prevEntry = index > 0 ? data.entries[index - 1] : null;
      const isNewQuality = !prevEntry || prevEntry.quality !== entry.quality;

      return `
        <tr>
          <td style="text-align: center; font-weight: 500;">${entry.sequence || index + 1}</td>
          <td style="font-weight: ${isNewQuality ? "bold" : "normal"}; color: #1e293b;">
            ${entry.quality || "—"}
          </td>
          <td style="text-align: center;">${entry.size || "—"}</td>
          <td style="text-align: center; font-weight: 500;">${entry.loomNumber || "—"}</td>
          <td style="font-family: monospace; font-weight: 600; text-align: center;">${entry.rollNumber || "—"}</td>
          <td style="text-align: right;">${entry.rollMeter > 0 ? entry.rollMeter.toLocaleString() : "—"}</td>
          <td style="text-align: right;">${entry.netWeightBefore > 0 ? entry.netWeightBefore.toFixed(1) : "—"}</td>
          <td style="text-align: right; background-color: #f8fafc;">${entry.avgWeightBefore > 0 ? entry.avgWeightBefore.toFixed(1) : "—"}</td>
          <td style="text-align: right; font-weight: 600; color: #0284c7;">${entry.productionMeter > 0 ? entry.productionMeter.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-weight: 600;">${entry.netWeightAfter > 0 ? entry.netWeightAfter.toFixed(1) : "—"}</td>
          <td style="text-align: right; font-weight: 600; background-color: #f0f9ff; color: #0369a1;">${entry.avgWeightAfter > 0 ? entry.avgWeightAfter.toFixed(1) : "—"}</td>
          <td style="text-align: right; font-weight: 600; background-color: #f0fdf4; color: #15803d;">${entry.coating !== 0 ? entry.coating.toFixed(1) : "—"}</td>
          <td>${entry.remarks || ""}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lamination Product Report - ${data.date} (${data.shiftName})</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 8mm 10mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      background: #ffffff;
      padding: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-container {
      text-align: center;
      margin-bottom: 12px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
    }
    .company-title {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .company-address {
      font-size: 10.5px;
      color: #475569;
      margin-top: 2px;
    }
    .report-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 5px;
      text-transform: uppercase;
      color: #1e3a8a;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 11px;
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
    }
    .meta-table td {
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
    }
    .meta-label {
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      font-size: 10px;
    }
    .meta-value {
      font-weight: 600;
      color: #0f172a;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 10px;
    }
    table.data-table th,
    table.data-table td {
      border: 1px solid #94a3b8;
      padding: 5px 6px;
    }
    table.data-table th {
      background-color: #e2e8f0;
      color: #0f172a;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.2px;
    }
    .subhead-unlam {
      background-color: #f1f5f9;
      color: #475569;
    }
    .subhead-lam {
      background-color: #e0f2fe;
      color: #0369a1;
    }
    tr.totals-row td {
      font-weight: 800;
      background-color: #f1f5f9;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
    }
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding: 0 20px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-top: 1px solid #475569;
      margin-top: 36px;
      padding-top: 4px;
      font-weight: 600;
      font-size: 10.5px;
      color: #334155;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="company-title">FLEXICOM INDUSTRIES PVT. LIMITED</div>
    <div class="company-address">Sidco Industrial Estate, Ghatti Kathua, Phase-II, (J & K) 184143</div>
    <div class="report-title">LAMINATION PRODUCT REPORT</div>
  </div>

  <table class="meta-table">
    <tr>
      <td width="25%"><span class="meta-label">Date:</span> <span class="meta-value">${data.date}</span></td>
      <td width="25%"><span class="meta-label">Shift:</span> <span class="meta-value">${data.shiftName}</span></td>
      <td width="25%"><span class="meta-label">Operator:</span> <span class="meta-value">${data.operatorName || "—"}</span></td>
      <td width="25%"><span class="meta-label">No. of Helper:</span> <span class="meta-value">${String(data.helperCount || 0).padStart(2, "0")}</span></td>
    </tr>
  </table>

  <table class="data-table">
    <thead>
      <tr>
        <th rowspan="2" width="3%">S.No.</th>
        <th rowspan="2" width="12%">Quality</th>
        <th rowspan="2" width="5%">Width</th>
        <th colspan="5" class="subhead-unlam" style="border-bottom: 1px solid #94a3b8;">Unlaminated Roll (From Roll Stock)</th>
        <th colspan="4" class="subhead-lam" style="border-bottom: 1px solid #94a3b8;">Laminated Output</th>
        <th rowspan="2" width="10%">Remarks</th>
      </tr>
      <tr>
        <th width="5%" class="subhead-unlam">Loom #</th>
        <th width="7%" class="subhead-unlam">Roll No.</th>
        <th width="6%" class="subhead-unlam">Roll Mtr.</th>
        <th width="6%" class="subhead-unlam">Net Wt. (Kg)</th>
        <th width="6%" class="subhead-unlam">Avg Wt. (g/m)</th>
        <th width="6%" class="subhead-lam">Production (M)</th>
        <th width="6%" class="subhead-lam">Net Wt. (Kg)</th>
        <th width="6%" class="subhead-lam">Avg (g/m)</th>
        <th width="6%" class="subhead-lam">Coating (g/m)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="13" style="text-align:center; padding: 20px; color: #64748b;">No production entries recorded</td></tr>`}
      <tr class="totals-row">
        <td colspan="5" style="text-align: right; padding-right: 8px;">TOTAL:</td>
        <td style="text-align: right;">${totals.totalRollMtrs.toLocaleString()}</td>
        <td style="text-align: right;">${totals.totalNetWtBefore.toFixed(1)}</td>
        <td style="text-align: right; background-color: #f1f5f9;">${totals.avgWtBefore.toFixed(1)}</td>
        <td style="text-align: right; color: #0284c7;">${totals.totalProductionMtrs.toLocaleString()}</td>
        <td style="text-align: right;">${totals.totalNetWtAfter.toFixed(1)}</td>
        <td style="text-align: right; background-color: #e0f2fe; color: #0369a1;">${totals.avgWtAfter.toFixed(1)}</td>
        <td style="text-align: right; background-color: #dcfce7; color: #15803d;">${totals.avgCoating.toFixed(1)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="signatures-container">
    <div class="sig-box">
      <div class="sig-line">Operator Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Floor Supervisor</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Plant Head / QA Approved</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Triggers native browser print via hidden iframe
 */
export function printLaminationReport(data: LaminationProductionReportData): void {
  const html = generateLaminationReportHtml(data);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }, 350);
}
