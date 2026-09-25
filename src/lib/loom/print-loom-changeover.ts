/**
 * Minimalist Enterprise ERP Loom Changeover Sheet Print & PDF Engine
 * Generates crisp, high-contrast, professional A4 landscape printable schedules.
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
        <td style="text-align: center; font-weight: 800; font-size: 9pt; background-color: #f1f5f9; width: 35px;">
          #${seq}
        </td>
        <td style="text-align: center; font-weight: 800; font-family: monospace; font-size: 8.5pt;">
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
      padding: 4mm;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .org-title {
      font-size: 13pt;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: #0f172a;
      text-transform: uppercase;
    }
    .org-subtitle {
      font-size: 8pt;
      color: #475569;
      font-weight: 500;
      margin-top: 1px;
    }
    .doc-meta {
      text-align: right;
      font-size: 7pt;
      color: #64748b;
    }
    .doc-ref {
      font-family: monospace;
      font-weight: 700;
      font-size: 8.5pt;
      color: #0f172a;
      background: #f1f5f9;
      padding: 2px 6px;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      display: inline-block;
      margin-bottom: 3px;
    }
    .kpi-bar {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px 6px;
      background-color: #f8fafc;
      text-align: center;
    }
    .kpi-label {
      font-size: 6pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .kpi-value {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0f172a;
      font-family: monospace;
      margin-top: 1px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 7pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 3.5px 5px;
      vertical-align: middle;
    }
    table.data-table th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 6.5pt;
      letter-spacing: 0.4px;
      text-align: left;
    }
    table.data-table tr:nth-child(even) td {
      background-color: #fcfdfe;
    }
    .section-title {
      font-size: 8pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 10px;
      background: #0f172a;
      border-radius: 1px;
    }
    .signoff-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      page-break-inside: avoid;
    }
    .signoff-box {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 8px;
      min-height: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .signoff-role {
      font-size: 6.5pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }
    .signoff-line {
      border-top: 1px dotted #94a3b8;
      margin-top: 22px;
      padding-top: 2px;
      font-size: 6pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    .footer-note {
      margin-top: 8px;
      font-size: 6pt;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header-container">
    <div>
      <div class="org-title">Flexicom Industries Pvt. Ltd.</div>
      <div class="org-subtitle">Loom Section — Machine Changeover Sheet & Sequence Schedule</div>
    </div>
    <div class="doc-meta">
      <div><span class="doc-ref">${docRef}</span></div>
      <div>Printed: <strong>${genTimestamp}</strong></div>
      <div>Authoritative Production Schedule</div>
    </div>
  </div>

  <!-- KPI Metrics Bar -->
  <div class="kpi-bar">
    <div class="kpi-card">
      <div class="kpi-label">Total Installed Looms</div>
      <div class="kpi-value">${kpis.totalLooms}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Scheduled Changeovers</div>
      <div class="kpi-value" style="color: #2563eb;">${kpis.totalScheduled}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">In-Progress Conversions</div>
      <div class="kpi-value" style="color: #d97706;">${kpis.totalInProgress}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Completed Changeovers</div>
      <div class="kpi-value" style="color: #059669;">${kpis.totalCompleted}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Reed Size Modifications</div>
      <div class="kpi-value" style="color: #dc2626;">${kpis.totalReedSpaceChanges}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Steady Running (Pending)</div>
      <div class="kpi-value" style="color: #64748b;">${kpis.totalPending}</div>
    </div>
  </div>

  <!-- Changeover Priority Queue Table -->
  <div class="section-title">
    Changeover Priority Execution Queue (${queueItems.length} Looms)
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 35px; text-align: center;">Seq</th>
        <th style="width: 55px; text-align: center;">Loom #</th>
        <th>Current Running Quality</th>
        <th>Color / Denier</th>
        <th style="width: 50px; text-align: center;">Reed</th>
        <th>Bobbin Mark</th>
        <th>Target / Next Quality</th>
        <th>Next Color / Denier</th>
        <th style="width: 55px; text-align: center;">Next Reed</th>
        <th>Next Bobbin</th>
        <th style="width: 60px; text-align: center;">Status</th>
        <th style="width: 65px; text-align: center;">Target Shift</th>
        <th>Technician / Floor Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${queueRows.length > 0 ? queueRows : `
        <tr>
          <td colspan="13" style="text-align: center; padding: 12px; color: #64748b;">
            No active changeovers currently queued. All 91 circular looms are operating on steady allocations.
          </td>
        </tr>
      `}
    </tbody>
  </table>

  <!-- Sign-off Block -->
  <div class="signoff-grid">
    <div class="signoff-box">
      <div class="signoff-role">1. Prepared By (Loom Supervisor)</div>
      <div class="signoff-line">
        <span>Sign & Date</span>
        <span>Emp ID: ______</span>
      </div>
    </div>
    <div class="signoff-box">
      <div class="signoff-role">2. Loom Master (Mechanical)</div>
      <div class="signoff-line">
        <span>Sign & Date</span>
        <span>Creel Verified</span>
      </div>
    </div>
    <div class="signoff-box">
      <div class="signoff-role">3. Quality Inspector (QC Passed)</div>
      <div class="signoff-line">
        <span>Sign & Date</span>
        <span>Sample Approved</span>
      </div>
    </div>
    <div class="signoff-box">
      <div class="signoff-role">4. Factory Production Head</div>
      <div class="signoff-line">
        <span>Sign & Date</span>
        <span>Authorized</span>
      </div>
    </div>
  </div>

  <div class="footer-note">
    Confidential & Proprietary — Plexi-ERP &copy; Flexicom Industries Pvt. Ltd. | Generated automatically from authoritative factory floor database.
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;
}

/**
 * Print the Loom Changeover Schedule via an isolated hidden iframe
 */
export function printLoomChangeover(data: LoomChangeoverDataset): void {
  const html = generateLoomChangeoverHtml(data);
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // Ignore if already removed
    }
  }, 60000);
}
