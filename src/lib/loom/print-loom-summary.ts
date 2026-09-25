/**
 * Minimalist Enterprise ERP Loom Summary & Machine Allocations Print & PDF Engine
 * Generates crisp, high-contrast, professional A4 landscape printable documents.
 */

import { LoomSummaryDataset } from "./loom-summary-export";

export function generateLoomSummaryHtml(data: LoomSummaryDataset): string {
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const dateLabel = data.selectedDate && data.selectedDate !== "ALL" ? data.selectedDate : "All Production Dates (Latest)";
  const shiftLabel = data.selectedShiftName || (data.selectedShiftId && data.selectedShiftId !== "ALL" ? data.selectedShiftId : "All Shifts");
  const docDate = (data.selectedDate && data.selectedDate !== "ALL" ? data.selectedDate : new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const docRef = `LM-SUM-${docDate}`;
  const kpis = data.kpis;

  const qualityRows = data.qualities.map((q, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 700; width: 24px;">${idx + 1}</td>
      <td style="font-weight: 800; font-family: monospace; font-size: 8pt;">${q.qualityCode}</td>
      <td style="text-align: center; font-weight: 700; font-size: 6.5pt;">
        <span style="border: 1px solid ${q.status === 'RUNNING' ? '#059669' : q.status === 'PLANNED' ? '#2563eb' : '#64748b'}; padding: 1px 4px; border-radius: 2px;">
          ${q.status === 'RUNNING' ? 'RUNNING IN TAPE' : q.status === 'PLANNED' ? 'PLANNED IN TAPE' : 'STANDBY'}
        </span>
      </td>
      <td>${q.colorGroup}</td>
      <td>${q.colour}</td>
      <td style="text-align: right; font-family: monospace;">${q.denier || "—"}</td>
      <td style="text-align: right; font-family: monospace;">${q.tapeWidth || "—"}</td>
      <td style="text-align: right; font-family: monospace;">${q.reedSpaceCm ? `${q.reedSpaceCm} cm` : "—"}</td>
      <td>${q.bobbinMarking}</td>
      <td style="text-align: center; font-weight: 800; font-family: monospace; background-color: #f8fafc; font-size: 8.5pt;">
        ${q.totalLooms}
      </td>
      <td style="font-family: monospace; font-size: 7pt; color: #0f172a;">
        ${q.loomNumbers.map((n) => `#${n}`).join(", ") || "None"}
      </td>
      <td style="text-align: right; font-family: monospace; font-weight: 700;">${q.actualOutputKg ? `${q.actualOutputKg} kg` : "—"}</td>
      <td style="font-size: 6.5pt; color: #475569;">${(q.activeShifts || []).join(", ") || "—"}</td>
    </tr>
  `).join("");

  const shiftRows = (data.shiftSummaryList || []).map((s) => `
    <tr>
      <td style="font-weight: 700;">${s.shiftName}</td>
      <td style="font-family: monospace;">${s.startTime} - ${s.endTime}</td>
      <td style="text-align: center; font-weight: 700;">${s.qualitiesCount} Qualities</td>
      <td style="text-align: center; font-weight: 800; font-family: monospace;">${s.activeLoomsCount} Looms</td>
      <td style="text-align: right; font-family: monospace; font-weight: 700;">${s.producedKg} Kg</td>
      <td style="text-align: right; font-family: monospace;">${s.plannedKg} Kg</td>
      <td style="font-size: 7pt;">${s.operators.join(", ") || "—"}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Loom Summary & Allocations - ${docRef}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 7.5pt;
      line-height: 1.3;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
    }
    .report-container {
      width: 100%;
      max-width: 281mm;
      margin: 0 auto;
    }

    /* Minimalist Header */
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #000000;
      text-transform: uppercase;
    }
    .company-sub {
      font-size: 7.5pt;
      color: #334155;
      margin-top: 1px;
    }
    .doc-badge-title {
      display: inline-block;
      border: 1px solid #0f172a;
      background: #f8fafc;
      padding: 2px 8px;
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 3px;
    }
    .doc-meta-box {
      text-align: right;
      vertical-align: top;
    }
    .doc-ref-no {
      font-family: monospace;
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
    }
    .doc-meta-item {
      font-size: 7pt;
      color: #475569;
      margin-top: 1px;
    }

    /* Filter Indicator Banner */
    .filter-banner {
      display: flex;
      justify-content: space-between;
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 3px 6px;
      margin-bottom: 5px;
      font-size: 7pt;
      font-weight: 700;
      color: #1e293b;
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
      padding: 3px 5px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    .kpi-label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.3px;
    }
    .kpi-val {
      font-size: 8.5pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
    }

    /* Section styling */
    .section-title {
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #0f172a;
      padding-bottom: 2px;
      margin-top: 6px;
      margin-bottom: 3px;
      color: #000000;
    }

    /* Data Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
      font-size: 7.5pt;
    }
    .data-table th {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 3px 4px;
      font-weight: 700;
      font-size: 6.8pt;
      text-transform: uppercase;
      text-align: left;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 2.5px 4px;
      font-size: 7pt;
      color: #0f172a;
    }
    .data-table tfoot td {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      font-weight: 700;
      padding: 3px 4px;
    }

    /* 1-91 Loom Floor Layout Matrix */
    .floor-matrix-grid {
      display: grid;
      grid-template-columns: repeat(13, 1fr);
      gap: 3px;
      margin-bottom: 6px;
      background: #f8fafc;
      padding: 5px;
      border: 1px solid #cbd5e1;
    }
    .floor-loom-cell {
      border: 1px solid #94a3b8;
      background: #ffffff;
      padding: 2px 3px;
      font-size: 6.5pt;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 28px;
    }
    .cell-top {
      display: flex;
      justify-content: space-between;
      font-weight: 800;
      font-family: monospace;
    }
    .cell-qual {
      font-size: 5.5pt;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #334155;
    }

    /* Sign-off section */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      border: 1px solid #94a3b8;
    }
    .sign-table td {
      width: 33.33%;
      border: 1px solid #94a3b8;
      padding: 4px 6px;
      text-align: center;
      vertical-align: top;
    }
    .sign-title {
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      margin-bottom: 18px;
      color: #334155;
    }
    .sign-line {
      border-top: 1px dotted #64748b;
      padding-top: 2px;
      font-size: 6.5pt;
      color: #64748b;
    }

    /* Footer */
    .footer-note {
      margin-top: 4px;
      font-size: 6.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e2e8f0;
      padding-top: 2px;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- HEADER -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
          <div class="company-sub">Circular Loom Weaving Division • Kathua Industrial Complex, Phase-II (J&K)</div>
          <div class="doc-badge-title">Loom Machine Master Allocations & Running Qualities</div>
        </td>
        <td class="doc-meta-box">
          <div class="doc-ref-no">${docRef}</div>
          <div class="doc-meta-item">Date: <strong>${dateLabel}</strong></div>
          <div class="doc-meta-item">Shift: <strong>${shiftLabel}</strong></div>
          <div class="doc-meta-item">Generated: <strong>${genTimestamp}</strong></div>
        </td>
      </tr>
    </table>

    <!-- FILTER BANNER -->
    <div class="filter-banner">
      <span>PRODUCTION DATE: <strong>${dateLabel}</strong></span>
      <span>SHIFT CONTEXT: <strong>${shiftLabel}</strong></span>
      <span>TOTAL LOOMS ALLOCATED: <strong>${kpis.totalAllocatedLooms} / ${kpis.totalFactoryLooms}</strong></span>
    </div>

    <!-- KEY KPIS -->
    <table class="kpi-table">
      <tr>
        <td style="width: 20%;">
          <div class="kpi-label">Total Factory Looms</div>
          <div class="kpi-val">${kpis.totalFactoryLooms} <span style="font-size: 6.5pt; font-weight: normal;">Units</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Allocated Machine Count</div>
          <div class="kpi-val">${kpis.totalAllocatedLooms} <span style="font-size: 6.5pt; font-weight: normal;">Looms</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Looms On Running Tape</div>
          <div class="kpi-val" style="color: #059669;">${kpis.totalRunningLooms} <span style="font-size: 6.5pt; font-weight: normal;">Active</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Looms On Planned Tape</div>
          <div class="kpi-val" style="color: #2563eb;">${kpis.totalPlannedLooms} <span style="font-size: 6.5pt; font-weight: normal;">Planned</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Active Tape Qualities</div>
          <div class="kpi-val" style="color: #4338ca;">${kpis.runningQualitiesCount} <span style="font-size: 6.5pt; font-weight: normal;">In Prod (${kpis.totalQualitiesCount} Mapped)</span></div>
        </td>
      </tr>
    </table>

    <!-- SHIFT-WISE SUMMARY TABLE (IF AVAILABLE) -->
    ${shiftRows ? `
      <div class="section-title">Shift-Wise Tape Output & Active Loom Machine Deployments</div>
      <table class="data-table" style="margin-bottom: 8px;">
        <thead>
          <tr>
            <th style="width: 80px;">Shift</th>
            <th style="width: 100px;">Timing</th>
            <th style="text-align: center; width: 80px;">Qualities</th>
            <th style="text-align: center; width: 90px;">Active Looms</th>
            <th style="text-align: right; width: 90px;">Tape Produced</th>
            <th style="text-align: right; width: 90px;">Tape Planned</th>
            <th>Shift Operators</th>
          </tr>
        </thead>
        <tbody>
          ${shiftRows}
        </tbody>
      </table>
    ` : ""}

    <!-- SECTION 1: MASTER LOOM QUALITY ALLOCATIONS TABLE -->
    <div class="section-title">Master Quality Formulations & Loom Machine Allocations</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align: center; width: 24px;">#</th>
          <th>Quality Formulation Code</th>
          <th style="text-align: center; width: 85px;">Tape Status</th>
          <th style="width: 65px;">Color Group</th>
          <th style="width: 55px;">Colour</th>
          <th style="text-align: right; width: 40px;">Denier</th>
          <th style="text-align: right; width: 45px;">Width</th>
          <th style="text-align: right; width: 45px;">Reed</th>
          <th style="width: 65px;">Bobbin</th>
          <th style="text-align: center; width: 40px;">Looms</th>
          <th>Assigned Loom Numbers</th>
          <th style="text-align: right; width: 65px;">Produced</th>
          <th style="width: 70px;">Shifts</th>
        </tr>
      </thead>
      <tbody>
        ${qualityRows || `<tr><td colspan="13" style="text-align: center; color: #64748b; padding: 6px;">No Loom Machine Mappings found.</td></tr>`}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align: right; text-transform: uppercase; font-size: 7pt;">Total Formulations:</td>
          <td style="text-align: center; font-weight: 800;">${kpis.runningQualitiesCount} Running</td>
          <td colspan="6">—</td>
          <td style="text-align: center; font-family: monospace; font-weight: 800; background-color: #f1f5f9;">
            ${kpis.totalAllocatedLooms}
          </td>
          <td>Allocated across ${kpis.totalFactoryLooms} Factory Loom bays</td>
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${kpis.totalTapeProducedKg} Kg</td>
          <td>—</td>
        </tr>
      </tfoot>
    </table>

    <!-- SECTION 2: 1-91 LOOM FLOOR MAP MATRIX -->
    <div class="avoid-break">
      <div class="section-title">Factory Floor 1-91 Circular Loom Machine Status Matrix (${dateLabel} • ${shiftLabel})</div>
      <div class="floor-matrix-grid">
        ${data.loomMatrix.map((m) => `
          <div class="floor-loom-cell" style="background-color: ${m.status === 'RUNNING' ? '#ecfdf5' : m.status === 'PLANNED' ? '#eff6ff' : m.isAllocated ? '#ffffff' : '#f1f5f9'}; border-color: ${m.status === 'RUNNING' ? '#10b981' : m.status === 'PLANNED' ? '#60a5fa' : '#cbd5e1'};">
            <div class="cell-top">
              <span>#${m.loomNumber}</span>
              <span style="font-size: 5.5pt; color: ${m.status === 'RUNNING' ? '#047857' : m.status === 'PLANNED' ? '#1d4ed8' : '#64748b'};">${m.status === 'RUNNING' ? 'RUN' : m.status === 'PLANNED' ? 'PLN' : m.isAllocated ? 'MAP' : 'IDL'}</span>
            </div>
            <div class="cell-qual" title="${m.qualityCode || 'Unallocated'}">${m.qualityCode || '—'}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- AUTHORIZATION SIGN-OFFS -->
    <div class="avoid-break">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">Prepared By (Loom Section Master)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Verified By (Tape Plant In-Charge)</div>
            <div class="sign-line">Signature & Tape Verification</div>
          </td>
          <td>
            <div class="sign-title">Approved By (Plant Supervisor / GM)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        <span>Flexicom ERP • Circular Loom Production & Machine Allocation Master • Doc: ${docRef}</span>
        <span>Generated: ${genTimestamp} • Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printLoomSummary(data: LoomSummaryDataset): void {
  const html = generateLoomSummaryHtml(data);

  let iframe = document.getElementById("loom-summary-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "loom-summary-print-iframe";
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

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print failed, falling back to window.open", err);
        fallbackWindowPrint(html);
      }
    }, 250);
  } else {
    fallbackWindowPrint(html);
  }
}

function fallbackWindowPrint(html: string): void {
  const win = window.open("", "_blank", "width=1000,height=800");
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
