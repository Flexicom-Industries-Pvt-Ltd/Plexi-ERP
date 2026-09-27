import { LoomReadingEntryItem, IntervalKpiSummary, isLoomActive } from "./loom-reading-types";

export interface PrintLoomReadingOptions {
  date: string;
  shiftName: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  timeSlots?: string[];
  initialTimeSlot?: string;
  entries: LoomReadingEntryItem[];
  kpis?: {
    totalLooms: number;
    runningLoomsCount: number;
    idleLoomsCount: number;
    totalShiftMeters: number;
    totalShiftKg: number;
    totalWastageKg: number;
    averageEfficiency?: number;
    totalBreakdownMins?: number;
    intervalTotals: IntervalKpiSummary[];
  };
  filterActiveOnly?: boolean;
}

export function generateLoomReadingHtml(data: PrintLoomReadingOptions): string {
  const {
    date,
    shiftName,
    preparedBy = "",
    checkedBy = "",
    approvedBy = "",
    timeSlots = ["10:00", "12:00", "02:00", "04:00", "06:00", "08:00"],
    initialTimeSlot = "08:00",
    entries,
    kpis,
    filterActiveOnly = false,
  } = data;

  const activeEntries = filterActiveOnly
    ? entries.filter((e) => isLoomActive(e))
    : entries;

  const docDate = date.replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LM-2HR-${docDate}-${shiftName.replace(/\s+/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const slot1 = timeSlots[0] || "10:00";
  const slot2 = timeSlots[1] || "12:00";
  const slot3 = timeSlots[2] || "02:00";
  const slot4 = timeSlots[3] || "04:00";
  const slot5 = timeSlots[4] || "06:00";
  const slot6 = timeSlots[5] || "08:00";

  // Calculate Column Totals
  const totalR1Prod = activeEntries.reduce((s, e) => s + (e.r1Prod || 0), 0);
  const totalR2Prod = activeEntries.reduce((s, e) => s + (e.r2Prod || 0), 0);
  const totalR3Prod = activeEntries.reduce((s, e) => s + (e.r3Prod || 0), 0);
  const totalR4Prod = activeEntries.reduce((s, e) => s + (e.r4Prod || 0), 0);
  const totalR5Prod = activeEntries.reduce((s, e) => s + (e.r5Prod || 0), 0);
  const totalR6Prod = activeEntries.reduce((s, e) => s + (e.r6Prod || 0), 0);
  const totalMeters = activeEntries.reduce((s, e) => s + (e.totalProduction || 0), 0);
  const totalBreakdownMins = activeEntries.reduce((s, e) => s + (e.breakdownMinutes || 0), 0);
  const totalKg = Math.round(totalMeters * 0.16 * 100) / 100;

  const prog1 = totalR1Prod;
  const prog2 = prog1 + totalR2Prod;
  const prog3 = prog2 + totalR3Prod;
  const prog4 = prog3 + totalR4Prod;
  const prog5 = prog4 + totalR5Prod;
  const prog6 = prog5 + totalR6Prod;

  const rowsHtml = activeEntries.length > 0
    ? activeEntries.map((e) => {
        const isRunning = e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0);
        const effVal = typeof e.efficiencyPct === "number" && e.efficiencyPct > 0 ? e.efficiencyPct : null;
        let effBadgeColor = "#475569";
        let effBg = "#f1f5f9";
        if (effVal !== null) {
          if (effVal >= 85) {
            effBadgeColor = "#15803d";
            effBg = "#dcfce7";
          } else if (effVal >= 70) {
            effBadgeColor = "#b45309";
            effBg = "#fef3c7";
          } else {
            effBadgeColor = "#b91c1c";
            effBg = "#fee2e2";
          }
        }

        const bdText = e.breakdownReason
          ? `${e.breakdownReason}${e.breakdownMinutes ? ` (${e.breakdownMinutes}m)` : ""}`
          : e.breakdownMinutes
          ? `${e.breakdownMinutes}m`
          : "—";

        return `
          <tr style="${isRunning ? "background-color: #ffffff;" : "background-color: #f8fafc; color: #94a3b8;"}">
            <td style="text-align: center; font-weight: 800; font-family: monospace; font-size: 7.5pt; ${isRunning ? "color: #0f172a;" : "color: #94a3b8;"}">
              #${e.loomNumber}
            </td>
            <td style="font-size: 7pt; font-weight: 600; color: #334155; white-space: nowrap;">
              ${e.operatorName || "—"}
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 7pt;">
              ${e.size || "—"}
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 7pt;">
              ${e.denier || "—"}
            </td>
            <td style="font-size: 7pt; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 95px;">
              ${e.qualityType || "—"}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 7pt; font-weight: 600; color: #475569; background: #f8fafc;">
              ${e.initialReading !== null ? e.initialReading : "—"}
            </td>

            <!-- 10:00 -->
            <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #334155;">
              ${e.r1Reading !== null ? e.r1Reading : "—"}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 7pt; font-weight: 700; color: #166534; background: #f0fdf4;">
              ${e.r1Prod !== null && e.r1Prod > 0 ? e.r1Prod : e.r1Prod === 0 ? "0" : "—"}
            </td>

            <!-- 12:00 -->
            <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #334155;">
              ${e.r2Reading !== null ? e.r2Reading : "—"}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 7pt; font-weight: 700; color: #166534; background: #f0fdf4;">
              ${e.r2Prod !== null && e.r2Prod > 0 ? e.r2Prod : e.r2Prod === 0 ? "0" : "—"}
            </td>

            <!-- 02:00 -->
            <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #334155;">
              ${e.r3Reading !== null ? e.r3Reading : "—"}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 7pt; font-weight: 700; color: #166534; background: #f0fdf4;">
              ${e.r3Prod !== null && e.r3Prod > 0 ? e.r3Prod : e.r3Prod === 0 ? "0" : "—"}
            </td>

            <!-- 04:00 -->
            <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #334155;">
              ${e.r4Reading !== null ? e.r4Reading : "—"}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 7pt; font-weight: 700; color: #166534; background: #f0fdf4;">
              ${e.r4Prod !== null && e.r4Prod > 0 ? e.r4Prod : e.r4Prod === 0 ? "0" : "—"}
            </td>

            <!-- 06:00 -->
            <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #334155;">
              ${e.r5Reading !== null ? e.r5Reading : "—"}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 7pt; font-weight: 700; color: #166534; background: #f0fdf4;">
              ${e.r5Prod !== null && e.r5Prod > 0 ? e.r5Prod : e.r5Prod === 0 ? "0" : "—"}
            </td>

            <!-- 08:00 (Final) -->
            <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #334155;">
              ${e.r6Reading !== null ? e.r6Reading : "—"}
            </td>
            <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 800; color: #0f172a; background: #eff6ff;">
              ${e.totalProduction > 0 ? e.totalProduction.toLocaleString() : "—"}
            </td>
            <td style="font-size: 6.5pt; color: ${e.breakdownReason ? "#991b1b" : "#64748b"}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70px;">
              ${bdText}
            </td>
            <td style="font-size: 6.5pt; font-weight: 700; color: #b45309; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px;">
              ${e.changeoverTargetQuality || "—"}
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 7pt; font-weight: 700; color: ${effBadgeColor}; background: ${effBg};">
              ${effVal !== null ? `${effVal}%` : "—"}
            </td>
            <td style="font-size: 6.5pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65px;">
              ${e.status !== "RUNNING" ? `[${e.status}] ` : ""}${e.remarks || ""}
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="22" style="text-align: center; color: #64748b; font-style: italic; padding: 16px;">
          No loom readings recorded for this date and shift.
        </td>
      </tr>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>2 Hours Loom Production Report - ${docRef}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 4mm 5mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
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

    /* Header */
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
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 2.5px 2px;
      font-weight: 700;
      font-size: 6.5pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
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
      width: 33.33%;
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
      border-top: 1px dotted #64748b;
      padding-top: 1px;
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
    <!-- HEADER -->
    <div class="header-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1px;">
        <div style="width: 55px; text-align: left; display: flex; align-items: center;">
          <img src="/logo.png" alt="Flexicom" style="height: 38px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div class="company-title">Flexicom Industries Pvt. Limited</div>
          <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CIRCULAR WEAVING DIVISION</div>
          <div class="doc-main-heading">2 HOUR'S LOOM PRODUCTION REPORT</div>
        </div>
        <div style="width: 55px;" aria-hidden="true"></div>
      </div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>•</span>
        <span>Date: <strong>${date}</strong></span>
        <span>•</span>
        <span>Shift: <strong>${shiftName}</strong></span>
        <span>•</span>
        <span>Scope: <strong>${
          filterActiveOnly
            ? "Active Running Looms Only"
            : activeEntries.length < 91
            ? `Filtered Report (${activeEntries.length} of 91 Looms)`
            : "All Circular Looms (1-91)"
        }</strong></span>
        <span>•</span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>

    <!-- METRICS STRIP -->
    <table class="kpi-table">
      <tr>
        <td style="width: 16.6%;">
          <div class="kpi-label">Running Looms</div>
          <div class="kpi-val" style="color: #15803d;">${kpis?.runningLoomsCount ?? activeEntries.filter((e) => e.status === "RUNNING").length} <span style="font-size: 6.5pt; font-weight: normal;">/ 91</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Shift Production</div>
          <div class="kpi-val" style="color: #1e40af;">${totalMeters.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">M</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Output Weight (Est.)</div>
          <div class="kpi-val" style="color: #047857;">${totalKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Avg Efficiency</div>
          <div class="kpi-val" style="color: #0284c7;">${kpis?.averageEfficiency || 0}%</div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Total Breakdown</div>
          <div class="kpi-val" style="color: #ea580c;">${kpis?.totalBreakdownMins ?? totalBreakdownMins} <span style="font-size: 6.5pt; font-weight: normal;">Mins</span></div>
        </td>
        <td style="width: 16.6%;">
          <div class="kpi-label">Shift Wastage</div>
          <div class="kpi-val" style="color: #b91c1c;">${kpis?.totalWastageKg || 0} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
      </tr>
    </table>

    <!-- TABLE -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 28px;" rowspan="2">L/No.</th>
          <th style="width: 60px;" rowspan="2">Operator</th>
          <th style="width: 26px;" rowspan="2">Size</th>
          <th style="width: 26px;" rowspan="2">DNR</th>
          <th style="width: 78px;" rowspan="2">Type / Quality</th>
          <th style="width: 38px;" rowspan="2">I/R ${initialTimeSlot}</th>
          <th colspan="2">${slot1}</th>
          <th colspan="2">${slot2}</th>
          <th colspan="2">${slot3}</th>
          <th colspan="2">${slot4}</th>
          <th colspan="2">${slot5}</th>
          <th style="width: 38px;" rowspan="2">${slot6}</th>
          <th style="width: 44px;" rowspan="2">T PROD</th>
          <th style="width: 64px;" rowspan="2">Breakdown</th>
          <th style="width: 58px;" rowspan="2">Target (C/O)</th>
          <th style="width: 34px;" rowspan="2">Eff %</th>
          <th style="width: 58px;" rowspan="2">Remarks</th>
        </tr>
        <tr>
          <th style="width: 36px;">Read</th>
          <th style="width: 32px; background: #e2e8f0;">PROD</th>
          <th style="width: 36px;">Read</th>
          <th style="width: 32px; background: #e2e8f0;">PROD</th>
          <th style="width: 36px;">Read</th>
          <th style="width: 32px; background: #e2e8f0;">PROD</th>
          <th style="width: 36px;">Read</th>
          <th style="width: 32px; background: #e2e8f0;">PROD</th>
          <th style="width: 36px;">Read</th>
          <th style="width: 32px; background: #e2e8f0;">PROD</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <!-- Row 1: Interval Totals -->
        <tr style="background-color: #f1f5f9; font-weight: 800;">
          <td colspan="6" style="text-align: right; text-transform: uppercase; font-size: 6.5pt; color: #0f172a;">
            Total Interval Production (Meters):
          </td>
          <td style="background: #f1f5f9;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #15803d; background: #dcfce7;">
            ${totalR1Prod.toLocaleString()}
          </td>
          <td style="background: #f1f5f9;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #15803d; background: #dcfce7;">
            ${totalR2Prod.toLocaleString()}
          </td>
          <td style="background: #f1f5f9;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #15803d; background: #dcfce7;">
            ${totalR3Prod.toLocaleString()}
          </td>
          <td style="background: #f1f5f9;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #15803d; background: #dcfce7;">
            ${totalR4Prod.toLocaleString()}
          </td>
          <td style="background: #f1f5f9;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #15803d; background: #dcfce7;">
            ${totalR5Prod.toLocaleString()}
          </td>
          <td style="background: #f1f5f9;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #1e40af; background: #dbeafe;">
            ${totalMeters.toLocaleString()}
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 7pt; color: #9a3412;">
            ${totalBreakdownMins > 0 ? `${totalBreakdownMins}m` : "—"}
          </td>
          <td style="background: #f1f5f9;"></td>
          <td style="text-align: center; font-family: monospace; font-size: 7pt; color: #0369a1;">
            ${kpis?.averageEfficiency ? `${kpis.averageEfficiency}%` : "—"}
          </td>
          <td></td>
        </tr>

        <!-- Row 2: Progressive Cumulative Numbers -->
        <tr style="background-color: #f8fafc; font-weight: 700;">
          <td colspan="6" style="text-align: right; text-transform: uppercase; font-size: 6pt; color: #475569;">
            Progressive Cumulative Shift Meters:
          </td>
          <td style="background: #f8fafc;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #0369a1; background: #e0f2fe;">
            ${prog1.toLocaleString()}
          </td>
          <td style="background: #f8fafc;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #0369a1; background: #e0f2fe;">
            ${prog2.toLocaleString()}
          </td>
          <td style="background: #f8fafc;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #0369a1; background: #e0f2fe;">
            ${prog3.toLocaleString()}
          </td>
          <td style="background: #f8fafc;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #0369a1; background: #e0f2fe;">
            ${prog4.toLocaleString()}
          </td>
          <td style="background: #f8fafc;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 7pt; color: #0369a1; background: #e0f2fe;">
            ${prog5.toLocaleString()}
          </td>
          <td style="background: #f8fafc;"></td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; color: #0369a1; background: #e0f2fe;">
            ${totalMeters.toLocaleString()}
          </td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <!-- SIGN-OFF STRIP -->
    <div class="avoid-break">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">Prepared By (Loom Shed In-Charge)</div>
            <div style="font-size: 7pt; font-weight: 600; margin-bottom: 2px;">${preparedBy || "—"}</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Checked By (Shift Supervisor)</div>
            <div style="font-size: 7pt; font-weight: 600; margin-bottom: 2px;">${checkedBy || "—"}</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Approved By (Plant Manager)</div>
            <div style="font-size: 7pt; font-weight: 600; margin-bottom: 2px;">${approvedBy || "—"}</div>
            <div class="sign-line">Signature & Date</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        <span>Flexicom ERP • Loom Weaving Division</span>
        <span>Confidential & Proprietary • Flexicom Industries Pvt. Ltd.</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printLoomReadingSheet(options: PrintLoomReadingOptions): void {
  const html = generateLoomReadingHtml(options);

  // Use hidden iframe to trigger system print dialog on the current window without leaving blank tabs open
  const iframeId = "__loom_reading_print_frame__";
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

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print failed, falling back to window print", err);
        fallbackWindowPrint(html);
      }
    }, 250);
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
