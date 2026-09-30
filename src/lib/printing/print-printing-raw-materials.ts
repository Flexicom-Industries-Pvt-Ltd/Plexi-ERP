import { PrintingRawMaterialReportData, computePrintingRawMaterialTotals } from "./printing-types";

export function generatePrintingRawMaterialHtml(data: PrintingRawMaterialReportData): string {
  const { totals, calculatedEntries } = computePrintingRawMaterialTotals(data.entries, data.totalPrintMtrs);
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
  const docRef = `PRN-RM-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  const rowsHtml = calculatedEntries.length > 0
    ? calculatedEntries
        .map((entry, index) => {
          const lit = Number(entry.consumedLitre) || 0;
          const kg = Number(entry.consumedKg) || 0;
          const factor = Number(entry.conversionFactor) || 0.82;
          const ratio = Number(entry.ratioPercent) || 0;
          const mileage = Number(entry.mileage) || 0;

          return `
            <tr style="${index % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; font-size: 8pt; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="font-weight: 700; font-size: 8pt; color: #0f172a;">${entry.materialName || "—"}</td>
              <td style="text-align: center; font-size: 7.5pt; font-weight: 700; color: #475569;">${entry.unit || "LITRE"}</td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #1e40af;">
                ${lit > 0 ? lit.toFixed(2) : "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; color: #64748b;">
                ${factor.toFixed(2)}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; color: #0284c7; background-color: #f0f9ff;">
                ${kg > 0 ? kg.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; color: #7c3aed; background-color: #faf5ff;">
                ${ratio > 0 ? `${ratio.toFixed(1)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${mileage > 0 ? `${mileage.toLocaleString()} m/kg` : "—"}
              </td>
              <td style="font-size: 7pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${entry.remarks || ""}
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No raw material consumption entries recorded.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flexicom - Printing Raw Material Entry (${data.date} - ${data.shiftName})</title>
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
      text-align: center;
    }
    .kpi-label {
      font-size: 6pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
    .kpi-val {
      font-size: 9pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 1px;
    }
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
      padding: 4px 3px;
      font-weight: 900;
      font-size: 7pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1 !important;
      padding: 4px 4px;
      vertical-align: middle;
    }
    tr.totals-row td {
      font-weight: 900 !important;
      font-size: 8pt !important;
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      padding: 5px 4px;
    }
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding: 0 16px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 160px;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 28px;
      padding-top: 3px;
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="company-header">
    <div style="width: 70px;">
      <img src="${origin}/logo.png" style="height: 38px; width: auto;" onerror="this.style.display='none'" />
    </div>
    <div style="flex: 1; text-align: center;">
      <div class="company-title">FLEXICOM INDUSTRIES PVT. LIMITED</div>
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • PRINTING DIVISION</div>
      <div class="doc-main-heading">PRINTING RAW MATERIAL CONSUMPTION REPORT</div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>Date: <strong>${data.date}</strong></span>
        <span>Shift: <strong>${data.shiftName}</strong></span>
        <span>Operator: <strong>${data.operatorName || "—"}</strong></span>
        <span>Supervisor: <strong>${data.supervisorName || "—"}</strong></span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>
    <div style="width: 70px; text-align: right;">
      <span style="font-size: 6.5pt; font-weight: 800; border: 1px solid #94a3b8; padding: 2px 4px; background: #f8fafc; border-radius: 2px;">
        A4 PORTRAIT
      </span>
    </div>
  </div>

  <table class="kpi-table">
    <tr>
      <td>
        <div class="kpi-label">Printed Metres</div>
        <div class="kpi-val" style="color: #0284c7;">${totals.totalPrintMtrs.toLocaleString()} m</div>
      </td>
      <td>
        <div class="kpi-label">Consumed (Litre)</div>
        <div class="kpi-val" style="color: #1e40af;">${totals.totalConsumedLitre.toFixed(2)} L</div>
      </td>
      <td>
        <div class="kpi-label">Consumed (Kg)</div>
        <div class="kpi-val" style="color: #0284c7;">${totals.totalConsumedKg.toFixed(2)} kg</div>
      </td>
      <td>
        <div class="kpi-label">Overall Mileage</div>
        <div class="kpi-val" style="color: #15803d;">${totals.overallMileage.toLocaleString()} m/kg</div>
      </td>
      <td>
        <div class="kpi-label">Density Factor</div>
        <div class="kpi-val">0.82 kg/L</div>
      </td>
    </tr>
  </table>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 25%;">Material Name</th>
        <th style="width: 9%;">Unit</th>
        <th style="width: 12%;">Qty (Litre)</th>
        <th style="width: 9%;">Factor</th>
        <th style="width: 12%;">Qty (Kg)</th>
        <th style="width: 10%;">Ratio (%)</th>
        <th style="width: 12%;">Mileage</th>
        <th style="width: 15%;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="totals-row">
        <td style="text-align: center;">Σ</td>
        <td colspan="2" style="text-transform: uppercase;">Total Consumption</td>
        <td style="text-align: right; font-family: monospace; color: #1e40af;">${totals.totalConsumedLitre.toFixed(2)} L</td>
        <td></td>
        <td style="text-align: right; font-family: monospace; color: #0284c7;">${totals.totalConsumedKg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace; color: #7c3aed;">100.0%</td>
        <td style="text-align: right; font-family: monospace; color: #15803d;">${totals.overallMileage.toLocaleString()} m/kg</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  ${data.remarks ? `
    <div style="margin-top: 4px; padding: 4px 6px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 7pt; color: #334155;">
      <strong>Remarks / Inks & Solvent Notes:</strong> ${data.remarks}
    </div>
  ` : ""}

  <div class="signatures-container">
    <div class="sig-box">
      <div class="sig-line">Operator Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Supervisor Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Quality / Store In-Charge</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Plant Head / Manager</div>
    </div>
  </div>
</body>
</html>`;
}

export function printPrintingRawMaterialReport(data: PrintingRawMaterialReportData): void {
  const html = generatePrintingRawMaterialHtml(data);
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
