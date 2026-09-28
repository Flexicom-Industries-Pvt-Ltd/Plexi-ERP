/**
 * Flexicom Central ERP - Daily Loom Roll Cutting Report Print Engine
 * High-fidelity, enterprise standard output formatted for A4 landscape print.
 */

import {
  LoomRollCuttingEntryItem,
  LoomRollCuttingReportData,
  RollCuttingKpis,
  computeContractorRollSummary,
  computeQualityRollSummary,
} from "./loom-roll-cutting-types";

export interface PrintRollCuttingOptions {
  report: LoomRollCuttingReportData;
  entries: LoomRollCuttingEntryItem[];
  kpis?: RollCuttingKpis;
}

export function generateLoomRollCuttingHtml(options: PrintRollCuttingOptions): string {
  const { report, entries, kpis } = options;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const docDate = (report.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LM-RC-${docDate}-${(report.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  const totalMeters = entries.reduce((s, e) => s + (Number(e.meter) || 0), 0);
  const totalGross = entries.reduce((s, e) => s + (Number(e.grossWeightKg) || 0), 0);
  const totalTare = entries.reduce((s, e) => {
    const t = e.tareWeightKg !== "" && e.tareWeightKg !== null && e.tareWeightKg !== undefined
      ? (!isNaN(Number(e.tareWeightKg)) ? Number(e.tareWeightKg) : 1.2)
      : 1.2;
    return s + t;
  }, 0);
  const totalNett = entries.reduce((s, e) => s + (Number(e.nettWeightKg) || 0), 0);
  const overallAvg = totalMeters > 0 && totalNett > 0 ? Math.round(((totalNett * 1000) / totalMeters) * 10) / 10 : 0;
  const uniqueLooms = new Set(entries.map((e) => e.loomNumber));

  const contractorSummaries = computeContractorRollSummary(entries);
  const qualitySummaries = computeQualityRollSummary(entries);

  const rowsHtml = entries.length > 0
    ? entries.map((entry, idx) => `
        <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
          <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a; background: #f8fafc;">
            ${entry.rollNumber || "—"}
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0284c7;">
            #${entry.loomNumber}
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 600; color: #334155;">
            ${entry.size || "—"}
          </td>
          <td style="font-size: 7.5pt; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">
            ${entry.qualityType || "—"}
          </td>
          <td style="font-size: 7pt; font-weight: 600; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85px;">
            ${entry.contractor || "In-House"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #475569;">
            ${entry.initialReading !== undefined && entry.initialReading !== null ? Number(entry.initialReading).toLocaleString() : "—"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #475569;">
            ${entry.finalReading !== undefined && entry.finalReading !== null ? Number(entry.finalReading).toLocaleString() : "—"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a; background: #f1f5f9;">
            ${entry.meter !== undefined && entry.meter !== null ? Number(entry.meter).toLocaleString() : "0"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #475569;">
            ${entry.grossWeightKg !== "" && entry.grossWeightKg !== null && entry.grossWeightKg !== undefined ? Number(entry.grossWeightKg).toFixed(2) : "0.00"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #64748b;">
            ${entry.tareWeightKg !== "" && entry.tareWeightKg !== null && entry.tareWeightKg !== undefined ? Number(entry.tareWeightKg).toFixed(2) : "1.20"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background: #ecfdf5;">
            ${entry.nettWeightKg !== undefined && entry.nettWeightKg !== null ? entry.nettWeightKg.toFixed(2) : "0.00"}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #7c3aed;">
            ${entry.avgWeightPerMeter !== undefined && entry.avgWeightPerMeter !== null ? entry.avgWeightPerMeter.toFixed(1) : "0.0"}
          </td>
          <td style="text-align: center; font-size: 7pt; color: #334155;">
            ${entry.supervisorSign || report.supervisorName || "—"}
          </td>
          <td style="font-size: 7pt; color: #64748b;">
            ${entry.remarks || "—"}
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="15" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No roll entries logged for this shift.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Daily Loom Roll Cutting Report - ${docRef}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 4mm 5mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 7.5pt;
      line-height: 1.2;
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
      text-align: center;
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

    /* Main Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
      font-size: 7pt;
      table-layout: fixed;
    }
    .data-table th {
      background-color: #0f172a;
      border: 1px solid #334155;
      padding: 3px 2px;
      font-weight: 700;
      font-size: 6.5pt;
      text-transform: uppercase;
      text-align: center;
      color: #ffffff;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 2px 2px;
      font-size: 7pt;
      color: #0f172a;
    }
    .data-table tfoot td {
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
      font-weight: 700;
      padding: 2.5px 2px;
    }

    /* Sign-off section */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      border: 1px solid #94a3b8;
    }
    .sign-table td {
      width: 25%;
      border: 1px solid #94a3b8;
      padding: 3px 5px;
      text-align: center;
      vertical-align: top;
    }
    .sign-title {
      font-weight: 700;
      font-size: 6.5pt;
      text-transform: uppercase;
      margin-bottom: 12px;
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
    <!-- Header -->
    <div class="header-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
        <div style="width: 55px; text-align: left; display: flex; align-items: center;">
          <img src="${origin}/logo.png" alt="Flexicom" style="height: 40px; width: auto; object-fit: contain; filter: contrast(1.15);" onerror="this.style.display='none'" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div class="company-title">FLEXICOM INDUSTRIES PVT. LIMITED</div>
          <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CIRCULAR WEAVING DIVISION</div>
          <div>
            <span class="doc-main-heading">DAILY LOOM ROLL CUTTING REPORT</span>
          </div>
        </div>
        <div style="width: 55px;" aria-hidden="true"></div>
      </div>
      <div class="doc-meta-strip">
        <div>DOC REF: <strong>${docRef}</strong></div>
        <div>DATE: <strong>${report.date || "—"}</strong></div>
        <div>SHIFT: <strong>${report.shiftName || "—"}</strong></div>
        <div>SUPERVISOR: <strong>${report.supervisorName || report.preparedBy || "—"}</strong></div>
        <div>TOTAL ROLLS: <strong>${entries.length}</strong> (${uniqueLooms.size} LOOMS)</div>
        <div>GENERATED: <strong>${genTimestamp}</strong></div>
      </div>
    </div>

    <!-- KPI Summary Row -->
    <table class="kpi-table">
      <tr>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Rolls Cut</div>
          <div class="kpi-val">${entries.length} <span style="font-size: 6.5pt; font-weight: normal; color: #64748b;">(${uniqueLooms.size} Looms)</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Cut Length</div>
          <div class="kpi-val" style="color: #0284c7;">${totalMeters.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">m</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Gross Weight</div>
          <div class="kpi-val">${totalGross.toFixed(2)} <span style="font-size: 6.5pt; font-weight: normal;">kg</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Tare Weight</div>
          <div class="kpi-val" style="color: #64748b;">${totalTare.toFixed(2)} <span style="font-size: 6.5pt; font-weight: normal;">kg</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Nett Weight</div>
          <div class="kpi-val" style="color: #15803d;">${totalNett.toFixed(2)} <span style="font-size: 6.5pt; font-weight: normal;">kg</span></div>
        </td>
        <td style="width: 17%;">
          <div class="kpi-label">Avg Linear Mass</div>
          <div class="kpi-val" style="color: #7c3aed;">${overallAvg.toFixed(1)} <span style="font-size: 6.5pt; font-weight: normal;">g/m</span></div>
        </td>
      </tr>
    </table>

    <!-- Main Data Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 25px;">S.No</th>
          <th style="width: 70px;">Roll No</th>
          <th style="width: 45px;">Loom #</th>
          <th style="width: 45px;">Size (mm)</th>
          <th style="width: 120px; text-align: left; padding-left: 4px;">Quality Code</th>
          <th style="width: 85px; text-align: left; padding-left: 4px;">Contractor</th>
          <th style="width: 55px; text-align: right; padding-right: 4px;">Init Rdg</th>
          <th style="width: 55px; text-align: right; padding-right: 4px;">Final Rdg</th>
          <th style="width: 60px; text-align: right; padding-right: 4px; background: #1e293b;">Meter</th>
          <th style="width: 60px; text-align: right; padding-right: 4px;">Gross (kg)</th>
          <th style="width: 50px; text-align: right; padding-right: 4px;">Tare (kg)</th>
          <th style="width: 60px; text-align: right; padding-right: 4px; background: #064e3b;">Nett (kg)</th>
          <th style="width: 55px; text-align: right; padding-right: 4px;">Avg (g/m)</th>
          <th style="width: 70px;">Sup. Sign</th>
          <th style="text-align: left; padding-left: 4px;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td style="text-align: center; font-weight: 800;">TOTAL</td>
          <td style="text-align: center; font-family: monospace; font-weight: 800;">${entries.length} Rolls</td>
          <td style="text-align: center; font-family: monospace; font-weight: 800; color: #0284c7;">${uniqueLooms.size} Looms</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td style="text-align: right; font-family: monospace; font-weight: 800; color: #0f172a; background: #f1f5f9;">${totalMeters.toLocaleString()}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700;">${totalGross.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace; color: #64748b;">${totalTare.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 800; color: #15803d; background: #ecfdf5;">${totalNett.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #7c3aed;">${overallAvg.toFixed(1)}</td>
          <td></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <!-- Real-time Breakdowns (Quality & Contractor Summaries) -->
    <div style="display: flex; gap: 8px; margin-top: 5px; margin-bottom: 5px; page-break-inside: avoid;">
      <!-- Quality Breakdown Table -->
      <div style="flex: 1; border: 1px solid #94a3b8; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; font-size: 6.5pt; font-weight: 800; padding: 2.5px 6px; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
          <span>QUALITY-WISE ROLL BREAKDOWN</span>
          <span>${qualitySummaries.length} QUALITIES</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 6.5pt;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; font-weight: 700;">
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: left;">Quality Code</th>
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: center; width: 45px;">Rolls</th>
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; width: 60px;">Meters</th>
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; width: 60px;">Nett (kg)</th>
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; width: 50px;">Avg (g/m)</th>
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; width: 45px;">Share</th>
            </tr>
          </thead>
          <tbody>
            ${qualitySummaries.map((q) => {
              const share = entries.length > 0 ? ((q.rollsCount / entries.length) * 100).toFixed(1) : "0.0";
              return `
                <tr>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; font-weight: 700; color: #0f172a;">${q.qualityType}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: center; font-family: monospace; font-weight: 800;">${q.rollsCount}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; font-family: monospace;">${q.totalMeters.toLocaleString()}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; font-family: monospace; color: #15803d; font-weight: 700;">${q.totalNettWtKg.toFixed(2)}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; font-family: monospace; color: #7c3aed;">${q.avgWeightPerMeter.toFixed(1)}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; font-family: monospace; color: #64748b;">${share}%</td>
                </tr>
              `;
            }).join("")}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 800; border-top: 1.5px solid #0f172a;">
              <td style="border: 1px solid #94a3b8; padding: 2px 4px;">TOTAL</td>
              <td style="border: 1px solid #94a3b8; padding: 2px 4px; text-align: center; font-family: monospace;">${entries.length}</td>
              <td style="border: 1px solid #94a3b8; padding: 2px 4px; text-align: right; font-family: monospace;">${totalMeters.toLocaleString()}</td>
              <td style="border: 1px solid #94a3b8; padding: 2px 4px; text-align: right; font-family: monospace; color: #15803d;">${totalNett.toFixed(2)}</td>
              <td style="border: 1px solid #94a3b8; padding: 2px 4px; text-align: right; font-family: monospace; color: #7c3aed;">${overallAvg.toFixed(1)}</td>
              <td style="border: 1px solid #94a3b8; padding: 2px 4px; text-align: right; font-family: monospace;">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Contractor Breakdown Table -->
      <div style="flex: 1; border: 1px solid #94a3b8; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; font-size: 6.5pt; font-weight: 800; padding: 2.5px 6px; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
          <span>CONTRACTOR-WISE ROLL BREAKDOWN</span>
          <span>${contractorSummaries.length} CONTRACTORS</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 6.5pt;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; font-weight: 700;">
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: left;">Contractor</th>
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: center; width: 45px;">Rolls</th>
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; width: 65px;">Meters</th>
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; width: 65px;">Nett (kg)</th>
              <th style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; width: 45px;">Share</th>
            </tr>
          </thead>
          <tbody>
            ${contractorSummaries.map((c) => {
              const share = entries.length > 0 ? ((c.rollsCount / entries.length) * 100).toFixed(1) : "0.0";
              return `
                <tr>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; font-weight: 700; color: #0f172a;">${c.contractor}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: center; font-family: monospace; font-weight: 800;">${c.rollsCount}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; font-family: monospace;">${c.totalMeters.toLocaleString()}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; font-family: monospace; color: #15803d; font-weight: 700;">${c.totalNettWtKg.toFixed(2)}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 2px 4px; text-align: right; font-family: monospace; color: #64748b;">${share}%</td>
                </tr>
              `;
            }).join("")}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 800; border-top: 1.5px solid #0f172a;">
              <td style="border: 1px solid #94a3b8; padding: 2px 4px;">TOTAL</td>
              <td style="border: 1px solid #94a3b8; padding: 2px 4px; text-align: center; font-family: monospace;">${entries.length}</td>
              <td style="border: 1px solid #94a3b8; padding: 2px 4px; text-align: right; font-family: monospace;">${totalMeters.toLocaleString()}</td>
              <td style="border: 1px solid #94a3b8; padding: 2px 4px; text-align: right; font-family: monospace; color: #15803d;">${totalNett.toFixed(2)}</td>
              <td style="border: 1px solid #94a3b8; padding: 2px 4px; text-align: right; font-family: monospace;">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Floor Sign-Off Section -->
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-title">Prepared By / Operator</div>
          <div class="sign-line">Sign & Date</div>
        </td>
        <td>
          <div class="sign-title">Shift Supervisor / In-Charge</div>
          <div class="sign-line">Sign & Date</div>
        </td>
        <td>
          <div class="sign-title">Quality Control In-Charge</div>
          <div class="sign-line">Sign & Date</div>
        </td>
        <td>
          <div class="sign-title">Plant Manager / HOD</div>
          <div class="sign-line">Sign & Date</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

export function printLoomRollCutting(options: PrintRollCuttingOptions): void {
  const html = generateLoomRollCuttingHtml(options);

  // Hidden iframe to trigger system print dialog seamlessly without leaving blank tabs open
  const iframeId = "__loom_roll_cutting_print_frame__";
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
