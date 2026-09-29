import { LaminationProductionReportData, computeLaminationReportTotals } from "./lamination-types";

export function generateLaminationReportHtml(data: LaminationProductionReportData): string {
  const totals = computeLaminationReportTotals(data.entries);
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
  const docRef = `LAM-PR-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  const rowsHtml = data.entries.length > 0
    ? data.entries
        .map((entry, index) => {
          const prevEntry = index > 0 ? data.entries[index - 1] : null;
          const isNewQuality = !prevEntry || prevEntry.quality !== entry.quality;

          return `
            <tr style="${index % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="font-weight: ${isNewQuality ? "800" : "500"}; font-size: 8pt; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${entry.quality || "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 600; color: #334155;">
                ${entry.size || "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0284c7;">
                #${entry.loomNumber || "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a; background: #f8fafc;">
                ${entry.rollNumber || "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">
                ${entry.rollMeter > 0 ? entry.rollMeter.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">
                ${entry.netWeightBefore > 0 ? entry.netWeightBefore.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #64748b; background-color: #f8fafc;">
                ${entry.avgWeightBefore > 0 ? entry.avgWeightBefore.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0284c7; background: #f0f9ff;">
                ${entry.productionMeter > 0 ? entry.productionMeter.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a;">
                ${entry.netWeightAfter > 0 ? entry.netWeightAfter.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #0369a1; background-color: #f0f9ff;">
                ${entry.avgWeightAfter > 0 ? entry.avgWeightAfter.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${entry.coating !== 0 ? entry.coating.toFixed(1) : "—"}
              </td>
              <td style="font-size: 7pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${entry.remarks || ""}
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="13" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No production entries logged for this shift.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lamination Product Report - ${data.date} (${data.shiftName})</title>
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
    .subhead-unlam {
      background-color: #f1f5f9 !important;
      color: #334155 !important;
      font-weight: 800;
      border-bottom: 1.5px solid #64748b !important;
    }
    .subhead-lam {
      background-color: #e0f2fe !important;
      color: #0369a1 !important;
      font-weight: 800;
      border-bottom: 1.5px solid #0284c7 !important;
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
      width: 180px;
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
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • LAMINATION DIVISION</div>
      <div class="doc-main-heading">LAMINATION PRODUCT REPORT</div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>Date: <strong>${data.date}</strong></span>
        <span>Shift: <strong>${data.shiftName}</strong></span>
        <span>Supervisor: <strong>${data.supervisorName || "—"}</strong></span>
        <span>Operator: <strong>${data.operatorName || "—"}</strong></span>
        <span>Helpers: <strong>${String(data.helperCount || 0).padStart(2, "0")}</strong></span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>
    <div style="width: 70px; text-align: right;">
      <span style="font-size: 6.5pt; font-weight: 800; border: 1px solid #94a3b8; padding: 2px 4px; background: #f8fafc; border-radius: 2px;">
        A4 LANDSCAPE
      </span>
    </div>
  </div>

  <!-- KPI Strip (7 Cards) -->
  <table class="kpi-table">
    <tr>
      <td style="width: 14%;">
        <div class="kpi-label">Total Rolls</div>
        <div class="kpi-val">${data.entries.length}</div>
      </td>
      <td style="width: 14%;">
        <div class="kpi-label">Input Roll Mtrs</div>
        <div class="kpi-val">${totals.totalRollMtrs.toLocaleString()} M</div>
      </td>
      <td style="width: 14%;">
        <div class="kpi-label">Input Net Wt</div>
        <div class="kpi-val">${totals.totalNetWtBefore.toFixed(1)} Kg</div>
      </td>
      <td style="width: 14%;">
        <div class="kpi-label">Avg Input Wt</div>
        <div class="kpi-val">${totals.avgWtBefore.toFixed(1)} g/m</div>
      </td>
      <td style="width: 15%; background: #f0f9ff;">
        <div class="kpi-label" style="color: #0369a1;">Output Prod Mtrs</div>
        <div class="kpi-val" style="color: #0284c7;">${totals.totalProductionMtrs.toLocaleString()} M</div>
      </td>
      <td style="width: 15%; background: #f0f9ff;">
        <div class="kpi-label" style="color: #0369a1;">Output Net Wt</div>
        <div class="kpi-val" style="color: #0369a1;">${totals.totalNetWtAfter.toFixed(1)} Kg</div>
      </td>
      <td style="width: 14%; background: #f0fdf4;">
        <div class="kpi-label" style="color: #15803d;">Avg Coating</div>
        <div class="kpi-val" style="color: #15803d;">${totals.avgCoating.toFixed(1)} g/m</div>
      </td>
    </tr>
  </table>

  <!-- Fixed-width Data Table (Strict 100% width budget) -->
  <table class="data-table">
    <thead>
      <tr>
        <th rowspan="2" style="width: 3%;">Seq</th>
        <th rowspan="2" style="width: 14%;">Quality Name</th>
        <th rowspan="2" style="width: 6%;">Size</th>
        <th rowspan="2" style="width: 6%;">Loom#</th>
        <th rowspan="2" style="width: 9%;">Roll Number</th>
        <th colspan="3" class="subhead-unlam" style="width: 23%;">Raw Fabric (Before Lamination)</th>
        <th colspan="3" class="subhead-lam" style="width: 23%;">Laminated Fabric (After Lamination)</th>
        <th rowspan="2" style="width: 8%; background-color: #ecfdf5 !important; color: #15803d !important;">Coating<br>(g/m)</th>
        <th rowspan="2" style="width: 8%;">Remarks</th>
      </tr>
      <tr>
        <th class="subhead-unlam" style="width: 8%;">Mtr</th>
        <th class="subhead-unlam" style="width: 8%;">Net Wt (kg)</th>
        <th class="subhead-unlam" style="width: 7%;">Avg (g/m)</th>
        <th class="subhead-lam" style="width: 8%;">Prod Mtr</th>
        <th class="subhead-lam" style="width: 8%;">Net Wt (kg)</th>
        <th class="subhead-lam" style="width: 7%;">Avg (g/m)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="totals-row">
        <td colspan="5" style="text-align: right; padding-right: 8px;">SHIFT TOTAL:</td>
        <td style="text-align: right; font-family: monospace;">${totals.totalRollMtrs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${totals.totalNetWtBefore.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; background-color: #f1f5f9;">${totals.avgWtBefore.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #0284c7; background: #f0f9ff;">${totals.totalProductionMtrs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${totals.totalNetWtAfter.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; background-color: #e0f2fe; color: #0369a1;">${totals.avgWtAfter.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; background-color: #dcfce7; color: #15803d;">${totals.avgCoating.toFixed(1)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <!-- Official Signatures -->
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
</html>`.trim();
}

/**
 * Triggers native browser print via hidden iframe with robust fallback
 */
export function printLaminationReport(data: LaminationProductionReportData): void {
  const html = generateLaminationReportHtml(data);
  let iframe = document.getElementById("lamination-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "lamination-print-iframe";
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
    setTimeout(() => {
      win.print();
    }, 300);
  }
}
