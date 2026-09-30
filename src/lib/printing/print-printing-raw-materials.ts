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
              <td style="text-align: center; font-weight: 700; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="font-weight: 700; text-align: left; padding-left: 8px; color: #0f172a;">${entry.materialName || "—"}</td>
              <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${entry.unit || "LITRE"}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #1e40af;">
                ${lit > 0 ? lit.toFixed(2) : "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; color: #64748b;">
                ${factor.toFixed(2)}
              </td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #0284c7; background-color: #f0f9ff;">
                ${kg > 0 ? kg.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #7c3aed; background-color: #faf5ff;">
                ${ratio > 0 ? `${ratio.toFixed(1)}%` : "—"}
              </td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${mileage > 0 ? `${mileage.toLocaleString()} m/kg` : "—"}
              </td>
              <td style="text-align: left; padding-left: 6px; font-size: 7.5pt; color: #64748b;">
                ${entry.remarks || "—"}
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">No raw material consumption entries recorded.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Printing Raw Material Consumption - ${data.date} (${data.shiftName})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 10mm 10mm;
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

    /* Fixed-Layout Main Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8pt;
      table-layout: fixed;
    }
    .data-table th {
      background-color: #e2e8f0 !important;
      border: 1px solid #64748b !important;
      padding: 5px 4px;
      font-weight: 900;
      font-size: 7.5pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1 !important;
      padding: 5px 6px;
      vertical-align: middle;
    }
    tr.totals-row td {
      font-weight: 900 !important;
      font-size: 8.5pt !important;
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      padding: 6px 6px;
    }

    /* Signatures Strip */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding: 0 20px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 32px;
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
      <div class="doc-main-heading">PRINTING RAW MATERIAL CONSUMPTION & MILEAGE REPORT</div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>Date: <strong>${data.date}</strong></span>
        <span>Shift: <strong>${data.shiftName}</strong></span>
        <span>Operator: <strong>${data.operatorName || "—"}</strong></span>
        <span>Supervisor: <strong>${data.supervisorName || "—"}</strong></span>
        <span>Status: <strong>${data.status || "DRAFT"}</strong></span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>
    <div style="width: 70px; text-align: right;">
      <span style="font-size: 6.5pt; font-weight: 800; border: 1px solid #94a3b8; padding: 2px 4px; background: #f8fafc; border-radius: 2px;">
        A4 PORTRAIT
      </span>
    </div>
  </div>

  <!-- Standard KPI Table Strip -->
  <table class="kpi-table">
    <tr>
      <td style="width: 25%; background: #f0f9ff;">
        <div class="kpi-label" style="color: #0369a1;">Printed Metres (Base)</div>
        <div class="kpi-val" style="color: #0284c7;">${totals.totalPrintMtrs.toLocaleString()} m</div>
      </td>
      <td style="width: 25%; background: #f0fdf4;">
        <div class="kpi-label" style="color: #15803d;">Total Volume (Litres)</div>
        <div class="kpi-val" style="color: #16a34a;">${totals.totalConsumedLitre.toFixed(2)} L</div>
      </td>
      <td style="width: 25%; background: #faf5ff;">
        <div class="kpi-label" style="color: #6b21a8;">Total Consumed (Kg)</div>
        <div class="kpi-val" style="color: #7e22ce;">${totals.totalConsumedKg.toFixed(2)} kg</div>
      </td>
      <td style="width: 25%; background: #fff7ed;">
        <div class="kpi-label" style="color: #c2410c;">Overall Mileage</div>
        <div class="kpi-val" style="color: #ea580c;">${totals.overallMileage.toLocaleString()} m/kg</div>
      </td>
    </tr>
  </table>

  <!-- Main Fixed-Layout Data Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 28%; text-align: left; padding-left: 8px;">Raw Material (Inks / Solvents)</th>
        <th style="width: 8%;">Unit</th>
        <th style="width: 11%; text-align: right; padding-right: 8px;">Consumed (L)</th>
        <th style="width: 8%;">Factor</th>
        <th style="width: 12%; text-align: right; padding-right: 8px;">Consumed (Kg)</th>
        <th style="width: 10%; text-align: right; padding-right: 8px;">Ratio %</th>
        <th style="width: 11%; text-align: right; padding-right: 8px;">Mileage</th>
        <th style="width: 8%; text-align: left; padding-left: 6px;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="totals-row">
        <td colspan="3" style="text-align: right; padding-right: 8px; text-transform: uppercase;">Totals:</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #1e40af;">${totals.totalConsumedLitre.toFixed(2)} L</td>
        <td style="text-align: center; font-family: monospace; color: #64748b;">—</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #0284c7;">${totals.totalConsumedKg.toFixed(2)} kg</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #7c3aed;">${totals.totalConsumedKg > 0 ? "100.0%" : "—"}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #15803d;">${totals.overallMileage.toLocaleString()} m/kg</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  ${data.remarks ? `
    <div style="margin-top: 4px; padding: 4px 6px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 7pt; color: #334155;">
      <strong>Remarks / Inks & Solvent Notes:</strong> ${data.remarks}
    </div>
  ` : ""}

  <!-- Standard Signatures Strip -->
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

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`.trim();
}

/**
 * Triggers native browser print via hidden iframe with robust fallback
 */
export function printPrintingRawMaterialReport(data: PrintingRawMaterialReportData): void {
  const html = generatePrintingRawMaterialHtml(data);
  let iframe = document.getElementById("printing-rm-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "printing-rm-print-iframe";
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
  const win = window.open("", "_blank", "width=1100,height=800");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  }
}
