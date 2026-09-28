/**
 * Flexicom Central ERP - Daily Loom Roll Cutting Report Print Engine
 * Clean, minimalist, high-fidelity output matching physical factory floor document.
 */

import { LoomRollCuttingEntryItem, LoomRollCuttingReportData, RollCuttingKpis } from "./loom-roll-cutting-types";

export interface PrintRollCuttingOptions {
  report: LoomRollCuttingReportData;
  entries: LoomRollCuttingEntryItem[];
  kpis?: RollCuttingKpis;
}

export function generateLoomRollCuttingHtml(options: PrintRollCuttingOptions): string {
  const { report, entries, kpis } = options;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const totalMeters = entries.reduce((s, e) => s + (e.meter || 0), 0);
  const totalGross = entries.reduce((s, e) => s + (e.grossWeightKg || 0), 0);
  const totalTare = entries.reduce((s, e) => s + (e.tareWeightKg || 1.2), 0);
  const totalNett = entries.reduce((s, e) => s + (e.nettWeightKg || 0), 0);
  const overallAvg = totalMeters > 0 && totalNett > 0 ? Math.round(((totalNett * 1000) / totalMeters) * 10) / 10 : 0;

  const rowsHtml = entries.length > 0
    ? entries.map((entry, idx) => `
        <tr>
          <td style="text-align: center; font-weight: 700; font-size: 8pt; color: #475569;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a; background: #f8fafc;">
            ${entry.rollNumber || "—"}
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 8.5pt; font-weight: 800; color: #0284c7;">
            ${entry.loomNumber}
          </td>
          <td style="text-align: center; font-size: 8pt; font-weight: 600; color: #334155;">
            ${entry.size || "—"}
          </td>
          <td style="font-size: 8pt; font-weight: 700; color: #0f172a;">
            ${entry.qualityType || "—"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #475569;">
            ${entry.initialReading !== undefined && entry.initialReading !== null ? Number(entry.initialReading).toLocaleString() : "—"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #475569;">
            ${entry.finalReading !== undefined && entry.finalReading !== null ? Number(entry.finalReading).toLocaleString() : "—"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8.5pt; font-weight: 800; color: #0f172a; background: #f1f5f9;">
            ${entry.meter !== undefined && entry.meter !== null ? Number(entry.meter).toLocaleString() : "0"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #475569;">
            ${entry.grossWeightKg !== undefined && entry.grossWeightKg !== null ? entry.grossWeightKg.toFixed(2) : "0.00"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #64748b;">
            ${entry.tareWeightKg !== undefined && entry.tareWeightKg !== null ? entry.tareWeightKg.toFixed(2) : "1.20"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8.5pt; font-weight: 800; color: #059669; background: #ecfdf5;">
            ${entry.nettWeightKg !== undefined && entry.nettWeightKg !== null ? entry.nettWeightKg.toFixed(2) : "0.00"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; color: #7c3aed;">
            ${entry.avgWeightPerMeter !== undefined && entry.avgWeightPerMeter !== null ? entry.avgWeightPerMeter.toFixed(1) : "0.0"}
          </td>
          <td style="text-align: center; font-size: 7.5pt; color: #334155;">
            ${entry.supervisorSign || report.supervisorName || "—"}
          </td>
          <td style="font-size: 7.5pt; color: #64748b;">
            ${entry.remarks || "—"}
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="14" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No roll entries logged for this shift.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Daily Loom Roll Cutting Report - ${report.date} (${report.shiftName})</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 8.5pt;
      line-height: 1.3;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .company-title {
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0;
      text-transform: uppercase;
    }
    .doc-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0284c7;
      margin: 2px 0 0 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .meta-box {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 12px;
      margin-bottom: 8px;
      font-size: 8pt;
    }
    .meta-item {
      display: flex;
      gap: 6px;
    }
    .meta-label {
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      font-size: 7.5pt;
    }
    .meta-val {
      font-weight: 800;
      color: #0f172a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-top: 4px;
    }
    .data-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7pt;
      letter-spacing: 0.3px;
      padding: 5px 4px;
      border: 1px solid #334155;
      text-align: center;
    }
    .data-table td {
      padding: 4px 5px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    .totals-row td {
      background: #e2e8f0;
      font-weight: 900;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
    }
    .footer-signs {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      padding: 0 20px;
      page-break-inside: avoid;
    }
    .sign-box {
      text-align: center;
      width: 180px;
      border-top: 1px solid #0f172a;
      padding-top: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      color: #334155;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <h1 class="company-title">FLEXICOM INDUSTRIES PVT. LTD.</h1>
        <h2 class="doc-title">DAILY LOOM ROLL CUTTING REPORT</h2>
      </td>
      <td style="text-align: right; vertical-align: bottom; font-size: 7.5pt; color: #64748b;">
        Report Ref: <strong>RC-${(report.date || "").replace(/-/g, "")}-${report.shiftName?.slice(0, 3)?.toUpperCase() || "SHT"}</strong><br/>
        Generated: ${genTimestamp}
      </td>
    </tr>
  </table>

  <div class="meta-box">
    <div class="meta-item"><span class="meta-label">Date:</span> <span class="meta-val">${report.date || "—"}</span></div>
    <div class="meta-item"><span class="meta-label">Shift:</span> <span class="meta-val">${report.shiftName || "—"}</span></div>
    <div class="meta-item"><span class="meta-label">Supervisor:</span> <span class="meta-val">${report.supervisorName || report.preparedBy || "—"}</span></div>
    <div class="meta-item"><span class="meta-label">Status:</span> <span class="meta-val">${report.status || "DRAFT"}</span></div>
    <div class="meta-item"><span class="meta-label">Total Rolls:</span> <span class="meta-val">${entries.length}</span></div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25px;">S.No.</th>
        <th style="width: 75px;">ROLL NO.</th>
        <th style="width: 45px;">LOOM NO.</th>
        <th style="width: 40px;">SIZE</th>
        <th style="width: 130px;">QUALITY</th>
        <th style="width: 65px;">INIT. RDG</th>
        <th style="width: 65px;">FINAL RDG</th>
        <th style="width: 60px;">METER</th>
        <th style="width: 55px;">GROSS WT</th>
        <th style="width: 50px;">TARE WT</th>
        <th style="width: 55px;">NETT WT</th>
        <th style="width: 50px;">AVG (g/m)</th>
        <th style="width: 65px;">SUP. SIGN</th>
        <th>REMARKS</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td style="text-align: center;">TOTAL</td>
        <td style="text-align: center;">${entries.length} Rolls</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td style="text-align: right; font-family: monospace; font-size: 8.5pt;">${totalMeters.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${totalGross.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace;">${totalTare.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8.5pt; color: #059669;">${totalNett.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace; color: #7c3aed;">${overallAvg.toFixed(1)}</td>
        <td></td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer-signs">
    <div class="sign-box">LOOM OPERATOR / FITTER</div>
    <div class="sign-box">SHIFT SUPERVISOR</div>
    <div class="sign-box">QUALITY CONTROL (QC)</div>
    <div class="sign-box">FACTORY MANAGER</div>
  </div>
</body>
</html>`;
}

export function printLoomRollCutting(options: PrintRollCuttingOptions): void {
  const html = generateLoomRollCuttingHtml(options);
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    alert("Please allow popups to preview and print the Roll Cutting Report.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}
