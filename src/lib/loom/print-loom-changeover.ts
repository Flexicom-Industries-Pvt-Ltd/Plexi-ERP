/**
 * Enterprise ERP Loom Changeover Log Sheet Print Engine
 * Clean, minimalist, professional output formatted for A4 landscape print.
 */

import { LoomChangeoverLogItem } from "@/app/api/production/loom/changeover/route";

export interface PrintLoomChangeoverOptions {
  logs: LoomChangeoverLogItem[];
  kpis?: {
    totalLogs: number;
    totalDowntimeMinutes: number;
    totalDowntimeHours: number;
    avgDowntimeMinutes: number;
    uniqueLoomsCount: number;
    scheduledCount: number;
  };
  filterDate?: string;
  filterShift?: string;
}

export function generateLoomChangeoverHtml(options: PrintLoomChangeoverOptions): string {
  const { logs, kpis, filterDate, filterShift } = options;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const docDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const docRef = `LM-CO-LOG-${docDate}`;

  const totalDowntime = logs.reduce((sum, l) => sum + (l.downtimeMinutes || 0), 0);
  const avgDowntime = logs.length > 0 ? Math.round((totalDowntime / logs.length) * 10) / 10 : 0;

  const rowsHtml = logs.length > 0
    ? logs.map((item, idx) => {
        const isReadingSheet = item.source === "READING_SHEET";
        return `
          <tr>
            <td style="text-align: center; font-weight: 800; font-size: 7.5pt; color: #475569; width: 30px;">
              #${idx + 1}
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #0f172a;">
              ${item.date}
            </td>
            <td style="text-align: center; font-size: 7pt; font-weight: 600; color: #334155;">
              ${item.shiftName}
            </td>
            <td style="text-align: center; font-weight: 900; font-family: monospace; font-size: 8pt; color: #0f172a; background: #f8fafc;">
              #${item.loomNumber}
            </td>
            <td style="font-size: 7pt; font-weight: 600; color: #334155;">
              ${item.operatorName}
            </td>
            <td style="font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #475569;">
              ${item.fromQuality}
            </td>
            <td style="text-align: center; color: #94a3b8; font-weight: bold; font-size: 8pt;">
              →
            </td>
            <td style="font-family: monospace; font-size: 7.5pt; font-weight: 800; color: #0f172a; background: #fffbeb;">
              ${item.toQuality}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 800; color: #9a3412; background: #fef3c7;">
              ${item.downtimeMinutes > 0 ? `${item.downtimeMinutes}m` : "—"}
            </td>
            <td style="text-align: center; font-size: 6.5pt; font-weight: 700;">
              <span style="border: 1px solid ${
                item.status === 'CHANGEOVER' || item.status === 'IN_PROGRESS'
                  ? '#f59e0b; background-color: #fef3c7; color: #b45309;'
                  : item.status === 'COMPLETED'
                  ? '#10b981; background-color: #d1fae5; color: #047857;'
                  : item.status === 'SCHEDULED'
                  ? '#3b82f6; background-color: #dbeafe; color: #1d4ed8;'
                  : '#cbd5e1; background-color: #f8fafc; color: #334155;'
              } padding: 2px 6px; border-radius: 4px; display: inline-block;">
                ${item.status}
              </span>
            </td>
            <td style="font-size: 6.5pt; color: #475569;">
              ${item.remarks || "—"}
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="11" style="text-align: center; color: #64748b; font-style: italic; padding: 24px;">
          No changeover logs recorded for the selected criteria.
        </td>
      </tr>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Loom Changeover Log Report - ${docRef}</title>
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
    }
    .header-container {
      text-align: center;
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
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 3px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      text-align: center;
    }
    .kpi-label {
      font-size: 5.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.5px;
    }
    .kpi-val {
      font-size: 9.5pt;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
      margin-bottom: 8px;
    }
    .data-table th {
      background-color: #0f172a;
      color: #ffffff;
      padding: 3px 4px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 6.5pt;
      border: 1px solid #334155;
      text-align: left;
    }
    .data-table td {
      padding: 2.5px 4px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    .data-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .signoff-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      page-break-inside: avoid;
    }
    .signoff-table td {
      width: 25%;
      border: 1px solid #94a3b8;
      padding: 4px 6px;
      text-align: center;
      background: #fdfdfd;
    }
    .sign-title {
      font-size: 6.5pt;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .sign-line {
      border-top: 1px dashed #64748b;
      margin-top: 4px;
      font-size: 5.5pt;
      color: #64748b;
      padding-top: 2px;
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- HEADER -->
    <div class="header-container">
      <div class="company-title">Flexicom Industries Pvt. Limited</div>
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CIRCULAR WEAVING DIVISION</div>
      <div class="doc-main-heading">CIRCULAR LOOMS QUALITY CHANGEOVER AUDIT LOG</div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>•</span>
        <span>Date: <strong>${filterDate || "All Recorded Dates"}</strong></span>
        <span>•</span>
        <span>Shift: <strong>${filterShift || "All Shifts"}</strong></span>
        <span>•</span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>

    <!-- KPIS -->
    <table class="kpi-table">
      <tr>
        <td style="width: 25%;">
          <div class="kpi-label">Total Changeover Events</div>
          <div class="kpi-val" style="color: #1e40af;">${logs.length}</div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Total Recorded Downtime</div>
          <div class="kpi-val" style="color: #ea580c;">${totalDowntime} <span style="font-size: 6.5pt; font-weight: normal;">Mins (${Math.round((totalDowntime / 60) * 10) / 10} Hrs)</span></div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Average Downtime per Event</div>
          <div class="kpi-val" style="color: #0284c7;">${avgDowntime} <span style="font-size: 6.5pt; font-weight: normal;">Mins</span></div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Looms Involved</div>
          <div class="kpi-val" style="color: #15803d;">${kpis?.uniqueLoomsCount ?? new Set(logs.map((l) => l.loomNumber)).size} <span style="font-size: 6.5pt; font-weight: normal;">Looms</span></div>
        </td>
      </tr>
    </table>

    <!-- TABLE -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 28px; text-align: center;">#</th>
          <th style="width: 60px; text-align: center;">Date</th>
          <th style="width: 55px; text-align: center;">Shift</th>
          <th style="width: 48px; text-align: center;">Loom #</th>
          <th style="width: 75px;">Operator</th>
          <th style="width: 90px;">From Quality</th>
          <th style="width: 18px; text-align: center;"></th>
          <th style="width: 90px;">To Quality (Target)</th>
          <th style="width: 55px; text-align: right;">Downtime</th>
          <th style="width: 60px; text-align: center;">Status</th>
          <th style="width: 110px;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9; font-weight: 800;">
          <td colspan="8" style="text-align: right; text-transform: uppercase; font-size: 6.5pt;">Total Downtime:</td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #9a3412;">${totalDowntime}m</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>

    <!-- SIGN-OFFS -->
    <table class="signoff-table">
      <tr>
        <td>
          <div class="sign-title">Prepared By (Floor Operator)</div>
          <div class="sign-line">Signature & Date</div>
        </td>
        <td>
          <div class="sign-title">Weaving Supervisor</div>
          <div class="sign-line">Signature & Date</div>
        </td>
        <td>
          <div class="sign-title">Production Manager</div>
          <div class="sign-line">Signature & Date</div>
        </td>
        <td>
          <div class="sign-title">Plant In-Charge</div>
          <div class="sign-line">Signature & Date</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

export function printLoomChangeover(options: PrintLoomChangeoverOptions): void {
  const html = generateLoomChangeoverHtml(options);
  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) {
    alert("Please allow popups to print Loom Changeover Logs");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
