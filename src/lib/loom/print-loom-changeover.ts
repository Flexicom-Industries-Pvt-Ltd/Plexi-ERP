/**
 * Minimalist Enterprise ERP Loom Changeover Sheet Print & PDF Engine
 * Formatted precisely as per Tape Planning standards with top-left Flexicom logo,
 * centered title, KPI summary cards, structured allocation tables, and official 4-column sign-offs.
 */

import { LoomChangeoverDataset } from "./loom-changeover-export";

export function generateLoomChangeoverHtml(data: LoomChangeoverDataset): string {
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const docDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const docRef = `LM-CO-${docDate}`;
  const kpis = data.kpis;

  const queueItems = data.changeoverQueue.length > 0 ? data.changeoverQueue : data.allLooms.filter((l) => l.hasChangeover || l.sequence > 0);

  const queueRows = queueItems.map((item, idx) => {
    const seq = item.sequence > 0 ? item.sequence : idx + 1;
    const isReedDiff = item.isReedSpaceChanged;
    const isColorDiff = item.isColorChanged;

    return `
      <tr>
        <td style="text-align: center; font-weight: 800; font-size: 8pt; background-color: #f1f5f9; width: 35px;">
          #${seq}
        </td>
        <td style="text-align: center; font-weight: 800; font-family: monospace; font-size: 8pt;">
          Loom #${item.loomNumber}
        </td>
        <td style="font-weight: 700; font-family: monospace; font-size: 7.5pt; color: #334155;">
          ${item.currentQuality}
        </td>
        <td style="font-size: 7pt;">
          ${item.currentColor} / ${item.currentDenier ? `${item.currentDenier}D` : "—"}
        </td>
        <td style="text-align: center; font-family: monospace; font-size: 7.5pt;">
          ${item.currentReedSpace ? `${item.currentReedSpace} cm` : "—"}
        </td>
        <td style="font-size: 7pt; font-weight: 600;">
          ${item.currentBobbinMark}
        </td>
        <td style="font-weight: 800; font-family: monospace; font-size: 8pt; color: #0f172a; background-color: #f8fafc;">
          ${item.nextQualityCode || "—"}
        </td>
        <td style="font-size: 7pt; ${isColorDiff ? 'color: #b91c1c; font-weight: 700;' : ''}">
          ${item.nextColor || "—"} / ${item.nextDenier ? `${item.nextDenier}D` : "—"}
        </td>
        <td style="text-align: center; font-family: monospace; font-size: 7.5pt; ${isReedDiff ? 'background-color: #fef2f2; color: #b91c1c; font-weight: 800; border: 1px dashed #ef4444;' : ''}">
          ${item.nextReedSpace ? `${item.nextReedSpace} cm` : "—"}
          ${isReedDiff ? `<span style="font-size: 6pt; display: block; color: #dc2626;">(Diff: ${(item.nextReedSpace! - item.currentReedSpace!) > 0 ? `+${item.nextReedSpace! - item.currentReedSpace!}` : (item.nextReedSpace! - item.currentReedSpace!)}cm)</span>` : ''}
        </td>
        <td style="font-size: 7pt; font-weight: 700;">
          ${item.nextBobbinMark || "—"}
        </td>
        <td style="text-align: center; font-size: 6.5pt; font-weight: 700;">
          <span style="border: 1px solid ${
            item.status === 'IN_PROGRESS'
              ? '#f59e0b; background-color: #fef3c7; color: #b45309;'
              : item.status === 'COMPLETED'
              ? '#10b981; background-color: #d1fae5; color: #047857;'
              : item.status === 'SCHEDULED'
              ? '#3b82f6; background-color: #dbeafe; color: #1d4ed8;'
              : '#94a3b8; background-color: #f1f5f9; color: #475569;'
          } padding: 2px 5px; border-radius: 3px; display: inline-block;">
            ${item.status}
          </span>
        </td>
        <td style="font-size: 6.5pt; text-align: center;">
          ${item.targetShiftName ? `<strong>${item.targetShiftName}</strong><br/>` : ""}${item.targetDate || "—"}
        </td>
        <td style="font-size: 6.5pt; color: #475569;">
          ${item.remarks || "—"}
        </td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Loom Changeover Sheet - ${docRef}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 5mm 6mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 7.5pt;
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
      box-sizing: border-box;
    }
    .header-container {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 6px;
    }
    .company-title {
      font-size: 13.5pt;
      font-weight: 900;
      letter-spacing: 0.6px;
      color: #000000;
      text-transform: uppercase;
      text-align: center;
    }
    .company-sub {
      font-size: 7pt;
      color: #475569;
      margin-top: 1px;
      text-align: center;
    }
    .doc-main-heading {
      display: inline-block;
      border: 1.5px solid #0f172a;
      background: #f8fafc;
      padding: 2.5px 14px;
      font-size: 8.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 3px;
      margin-bottom: 2px;
      text-align: center;
    }
    .doc-meta-strip {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 10px;
      font-size: 7pt;
      color: #334155;
      margin-top: 2px;
      text-align: center;
    }
    .doc-meta-strip strong {
      color: #000000;
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
      padding: 3.5px 5px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      text-align: center;
    }
    .kpi-label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.3px;
    }
    .kpi-val {
      font-size: 9.5pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 1px;
    }

    /* Section Titles */
    .section-title {
      font-size: 8pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      text-align: center;
      background-color: #e2e8f0;
      border: 1px solid #94a3b8;
      border-bottom: none;
      padding: 3px 6px;
      margin-top: 5px;
      color: #0f172a;
    }

    /* Data Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 7pt;
      table-layout: auto;
    }
    .data-table th {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 3px 4px;
      font-weight: 700;
      font-size: 6.5pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 3px 4px;
      font-size: 7pt;
      color: #0f172a;
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
      padding: 4px 6px;
      text-align: center;
      vertical-align: top;
    }
    .sign-title {
      font-weight: 700;
      font-size: 6.5pt;
      text-transform: uppercase;
      margin-bottom: 14px;
      color: #334155;
    }
    .sign-line {
      border-top: 1px dotted #64748b;
      padding-top: 2px;
      font-size: 6pt;
      color: #64748b;
    }

    /* Footer */
    .footer-note {
      margin-top: 3px;
      font-size: 6pt;
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
  <div class="sheet-container">
    <!-- Header with Flexicom Logo -->
    <div class="header-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
        <div style="width: 65px; text-align: left; display: flex; align-items: center;">
          <img src="/logo.png" alt="Flexicom Logo" style="height: 44px; width: auto; object-fit: contain; filter: contrast(1.25) saturate(1.25);" onerror="this.style.display='none'" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
          <div class="company-sub">Circular Loom Weaving & Fabric Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)</div>
          <div class="doc-main-heading">LOOM MACHINE CHANGEOVER & SEQUENCE SCHEDULE</div>
        </div>
        <div style="width: 65px;" aria-hidden="true"></div>
      </div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>•</span>
        <span>Scope: <strong>Looms #1–91 Changeover Queue</strong></span>
        <span>•</span>
        <span>Printed: <strong>${genTimestamp}</strong></span>
      </div>
    </div>

    <!-- KPI Summary Row -->
    <table class="kpi-table">
      <tr>
        <td style="width: 16.66%;">
          <div class="kpi-label">Total Looms</div>
          <div class="kpi-val">${kpis.totalLooms}</div>
        </td>
        <td style="width: 16.66%;">
          <div class="kpi-label">Scheduled Queue</div>
          <div class="kpi-val" style="color: #1d4ed8;">${kpis.totalScheduled}</div>
        </td>
        <td style="width: 16.66%;">
          <div class="kpi-label">In-Progress</div>
          <div class="kpi-val" style="color: #b45309;">${kpis.totalInProgress}</div>
        </td>
        <td style="width: 16.66%;">
          <div class="kpi-label">Completed</div>
          <div class="kpi-val" style="color: #047857;">${kpis.totalCompleted}</div>
        </td>
        <td style="width: 16.66%;">
          <div class="kpi-label">Reed Modifications</div>
          <div class="kpi-val" style="color: #b91c1c;">${kpis.totalReedSpaceChanges}</div>
        </td>
        <td style="width: 16.66%;">
          <div class="kpi-label">Steady Running</div>
          <div class="kpi-val" style="color: #64748b;">${kpis.totalPending}</div>
        </td>
      </tr>
    </table>

    <!-- Priority Queue Section -->
    <div class="section-title">CHANGEOVER PRIORITY EXECUTION QUEUE (${queueItems.length} MACHINES)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 32px; text-align: center;">Seq</th>
          <th style="width: 48px; text-align: center;">Loom #</th>
          <th style="text-align: left;">Current Quality</th>
          <th style="text-align: left;">Color / Denier</th>
          <th style="width: 45px; text-align: center;">Reed</th>
          <th style="text-align: left;">Bobbin Mark</th>
          <th style="text-align: left;">Target Next Quality</th>
          <th style="text-align: left;">Next Color / Denier</th>
          <th style="width: 50px; text-align: center;">Next Reed</th>
          <th style="text-align: left;">Next Mark</th>
          <th style="width: 55px; text-align: center;">Status</th>
          <th style="width: 60px; text-align: center;">Target Shift</th>
          <th style="text-align: left;">Floor Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${queueRows.length > 0 ? queueRows : `
          <tr>
            <td colspan="13" style="text-align: center; padding: 14px; color: #64748b; font-style: italic;">
              No active changeovers currently queued. All 91 circular looms are operating on steady formulations.
            </td>
          </tr>
        `}
      </tbody>
    </table>

    <!-- 4-Column Official Sign-Off Strip -->
    <div class="avoid-break">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">1. Prepared By (Loom Supervisor)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">2. Mechanical (Loom Master)</div>
            <div class="sign-line">Creel & Reed Verified</div>
          </td>
          <td>
            <div class="sign-title">3. QC Passed (Inspector)</div>
            <div class="sign-line">Fabric Sample Approved</div>
          </td>
          <td>
            <div class="sign-title">4. Approved By (Production Head)</div>
            <div class="sign-line">Authorized</div>
          </td>
        </tr>
      </table>

      <!-- Footer Note -->
      <div class="footer-note">
        <span>Flexicom ERP • Loom Weaving & Tape Plant Sync</span>
        <span>Confidential & Proprietary • Flexicom Industries Pvt. Ltd.</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printLoomChangeover(data: LoomChangeoverDataset): void {
  const html = generateLoomChangeoverHtml(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups for printable reports.");
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
