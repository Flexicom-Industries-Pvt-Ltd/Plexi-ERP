/**
 * Flexicom Central ERP - Tape Plant Post Production Sheet Print Engine
 * Generates high-contrast, professional A4 printable reports matching
 * the on-screen Post Production Entry layout with top-left company logo,
 * KPI summary strip, run-wise output breakdown table, and official sign-offs.
 */

export interface PostProductionPrintEntry {
  id?: string;
  recipeQuality: string;
  plannedProductionKg: number | string;
  productionDoneKg: number | string;
  gapKg?: number | string;
  wasteKg: number | string;
  wastePercent: number | string;
  netProductionKg?: number | string;
  remarks?: string;
}

export interface PostProductionPrintData {
  date: string;
  shiftName: string;
  operatorName?: string;
  status: string;
  entries: PostProductionPrintEntry[];
}

export function generatePostProductionSheetHtml(data: PostProductionPrintData): string {
  const { date, shiftName, operatorName, status, entries } = data;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const docDate = (date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `TP-PP-${docDate}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  // KPI Computations
  const totalPlannedKg = entries.reduce((s, e) => s + (Number(e.plannedProductionKg) || 0), 0);
  const totalDoneKg = entries.reduce((s, e) => s + (Number(e.productionDoneKg) || 0), 0);
  const totalGapKg = totalPlannedKg - totalDoneKg;
  const totalWasteKg = entries.reduce((s, e) => s + (Number(e.wasteKg) || 0), 0);
  const totalNetKg = totalDoneKg - totalWasteKg;
  const overallEfficiency = totalPlannedKg > 0 ? Math.round((totalNetKg / totalPlannedKg) * 100) : 0;
  const totalWastePercent = totalDoneKg > 0 ? ((totalWasteKg / totalDoneKg) * 100).toFixed(1) : "0.0";

  const rowsHtml = entries.map((entry, index) => {
    const planned = Number(entry.plannedProductionKg) || 0;
    const done = Number(entry.productionDoneKg) || 0;
    const gap = planned - done;
    const waste = Number(entry.wasteKg) || 0;
    const wastePct = done > 0 ? ((waste / done) * 100).toFixed(1) : (Number(entry.wastePercent) || 0).toFixed(1);
    const net = done - waste;
    const eff = planned > 0 ? Math.round((net / planned) * 100) : (done > 0 ? 100 : 0);

    const isEven = index % 2 === 1;
    const rowBg = isEven ? "background-color: #f8fafc;" : "background-color: #ffffff;";

    return `
      <tr style="${rowBg}">
        <td style="text-align: center; font-weight: 700; color: #475569; font-size: 7.5pt;">${index + 1}</td>
        <td style="font-family: monospace; font-weight: 800; font-size: 8.5pt; color: #0f172a; white-space: nowrap;">
          ${entry.recipeQuality || "—"}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #334155;">
          ${planned > 0 ? planned.toLocaleString() : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 8.5pt; color: #0284c7; background: #f0f9ff;">
          ${done > 0 ? done.toLocaleString() : "0"}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; font-size: 8pt; color: ${gap <= 0 ? "#15803d" : "#b45309"};">
          ${gap !== 0 ? (gap > 0 ? `+${gap.toLocaleString()}` : gap.toLocaleString()) : "0"}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #dc2626;">
          ${waste > 0 ? waste.toLocaleString() : "0"}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #dc2626;">
          ${wastePct}%
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 800; font-size: 8.5pt; color: #15803d; background: #f0fdf4;">
          ${net > 0 ? net.toLocaleString() : "0"}
        </td>
        <td style="text-align: center; font-family: monospace; font-weight: 700; font-size: 8pt; color: ${eff >= 85 ? "#15803d" : eff >= 70 ? "#b45309" : "#dc2626"};">
          ${eff}%
        </td>
        <td style="font-size: 7pt; color: #475569; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${entry.remarks || "—"}
        </td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tape Plant Post Production Report - ${docRef}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 7mm 8mm 7mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      width: 100%;
    }
    .sheet-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Enterprise Header */
    .header-container {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 6px;
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
      margin-bottom: 6px;
    }
    .kpi-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      background: #f8fafc;
      vertical-align: middle;
      text-align: center;
    }
    .kpi-label {
      font-size: 5.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 1px;
    }
    .kpi-val {
      font-family: monospace;
      font-size: 9.5pt;
      font-weight: 900;
      color: #0f172a;
    }

    /* Data Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    .data-table th {
      background-color: #0f172a;
      color: #ffffff;
      border: 1px solid #0f172a;
      padding: 4px 4px;
      font-size: 6.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-align: center;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 3.5px 4px;
      vertical-align: middle;
    }
    .totals-row td {
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      font-weight: 900 !important;
      font-size: 8pt !important;
      font-family: monospace;
    }

    /* Sign-Off Block */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      border: 1px solid #94a3b8;
      page-break-inside: avoid;
    }
    .sign-table td {
      width: 33.33%;
      border: 1px solid #94a3b8;
      padding: 6px 8px;
      text-align: center;
      vertical-align: top;
      background: #ffffff;
    }
    .sign-title {
      font-weight: 700;
      font-size: 6.5pt;
      text-transform: uppercase;
      margin-bottom: 20px;
      color: #334155;
    }
    .sign-line {
      font-size: 6pt;
      color: #64748b;
      border-top: 1px dashed #94a3b8;
      padding-top: 2px;
      display: inline-block;
      width: 80%;
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- Header with Vivid Top-Left Logo -->
    <div class="header-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
        <div style="width: 55px; text-align: left; display: flex; align-items: center;">
          <img src="${origin}/logo.png" alt="Flexicom Logo" style="height: 40px; width: auto; object-fit: contain; filter: contrast(1.15);" onerror="this.style.display='none'" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div class="company-title">FLEXICOM INDUSTRIES PVT. LIMITED</div>
          <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • TAPE EXTRUSION DIVISION</div>
          <div>
            <span class="doc-main-heading">DAILY TAPE PLANT POST-PRODUCTION REPORT</span>
          </div>
        </div>
        <div style="width: 55px;" aria-hidden="true"></div>
      </div>
      <div class="doc-meta-strip">
        <div>DOC REF: <strong>${docRef}</strong></div>
        <div>DATE: <strong>${date || "—"}</strong></div>
        <div>SHIFT: <strong>${shiftName || "—"}</strong></div>
        <div>OPERATOR: <strong>${operatorName || "—"}</strong></div>
        <div>TOTAL RUNS: <strong>${entries.length}</strong></div>
        <div>STATUS: <strong>${status || "SAVED"}</strong></div>
        <div>GENERATED: <strong>${genTimestamp}</strong></div>
      </div>
    </div>

    <!-- 6-Metric KPI Summary Row matching on-screen design -->
    <table class="kpi-table">
      <tr>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Planned</div>
          <div class="kpi-val">${totalPlannedKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal; color: #64748b;">KG</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Production Done</div>
          <div class="kpi-val" style="color: #0284c7;">${totalDoneKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Gap</div>
          <div class="kpi-val" style="color: ${totalGapKg <= 0 ? "#15803d" : "#b45309"};">${totalGapKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Waste</div>
          <div class="kpi-val" style="color: #dc2626;">${totalWasteKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG (${totalWastePercent}%)</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Net Output</div>
          <div class="kpi-val" style="color: #15803d;">${totalNetKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Efficiency</div>
          <div class="kpi-val" style="color: ${overallEfficiency >= 85 ? "#15803d" : overallEfficiency >= 70 ? "#b45309" : "#dc2626"};">${overallEfficiency}%</div>
        </td>
      </tr>
    </table>

    <!-- Main Output Breakdown Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 25px;">#</th>
          <th style="text-align: left; width: 140px;">Recipe / Quality</th>
          <th style="text-align: right; width: 70px;">Planned (KG)</th>
          <th style="text-align: right; width: 75px;">Done (KG)</th>
          <th style="text-align: right; width: 65px;">Gap (KG)</th>
          <th style="text-align: right; width: 65px;">Waste (KG)</th>
          <th style="text-align: right; width: 50px;">Waste %</th>
          <th style="text-align: right; width: 75px;">Net (KG)</th>
          <th style="width: 50px;">Eff %</th>
          <th style="text-align: left;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="10" style="text-align: center; padding: 12px; color: #64748b; font-style: italic;">No recipe entries recorded for this shift</td></tr>`}
      </tbody>
      <tfoot>
        <tr class="totals-row">
          <td colspan="2" style="text-align: right; font-weight: 900; font-size: 8pt; padding: 4px 6px;">SHIFT TOTALS:</td>
          <td style="text-align: right;">${totalPlannedKg.toLocaleString()}</td>
          <td style="text-align: right; color: #0284c7;">${totalDoneKg.toLocaleString()}</td>
          <td style="text-align: right; color: ${totalGapKg <= 0 ? "#15803d" : "#b45309"};">${totalGapKg.toLocaleString()}</td>
          <td style="text-align: right; color: #dc2626;">${totalWasteKg.toLocaleString()}</td>
          <td style="text-align: right; color: #dc2626;">${totalWastePercent}%</td>
          <td style="text-align: right; color: #15803d;">${totalNetKg.toLocaleString()}</td>
          <td style="text-align: center;">${overallEfficiency}%</td>
          <td style="font-size: 6.5pt; color: #64748b; font-weight: normal; font-family: sans-serif;">${entries.length} Recipe Run(s)</td>
        </tr>
      </tfoot>
    </table>

    <!-- 3-Column Formal Verification Signatures -->
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-title">Shift Operator (Data Entry)</div>
          <div class="sign-line">${operatorName || "Name & Signature"}</div>
        </td>
        <td>
          <div class="sign-title">Shift Supervisor / In-Charge</div>
          <div class="sign-line">Signature & Date</div>
        </td>
        <td>
          <div class="sign-title">Production Manager / Plant Head</div>
          <div class="sign-line">Authorized Signatory</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Print Post Production sheet via hidden iframe with logo loading guarantee
 */
export function printTapePlantPostProductionSheet(data: PostProductionPrintData): void {
  const html = generatePostProductionSheetHtml(data);

  const iframeId = "__tape_plant_post_production_print_frame__";
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = iframeId;
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

    const logoImg = doc.querySelector("img");
    const triggerPrint = () => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print failed, falling back to window print", err);
        fallbackWindowPrint(html);
      }
    };

    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 100);
      logoImg.onerror = () => setTimeout(triggerPrint, 100);
      setTimeout(triggerPrint, 800);
    } else {
      setTimeout(triggerPrint, 250);
    }
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
    setTimeout(() => {
      win.print();
    }, 300);
  }
}
