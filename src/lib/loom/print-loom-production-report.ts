/**
 * Flexicom Central ERP - Loom Production Report Print Engine
 * High-fidelity, enterprise standard output formatted for A4 landscape print.
 */

export interface LoomWiseRow {
  loomNumber: number;
  qualities: string;
  totalRolls: number;
  cutMeters: number;
  readingMeters: number;
  grossWeightKg: number;
  tareWeightKg: number;
  nettWeightKg: number;
  avgWeightPerMeter: number;
  avgEfficiency: number;
  breakdownMinutes: number;
  primaryBreakdownReason: string;
}

export interface SupervisorWiseRow {
  supervisorName: string;
  shiftsSupervised: number;
  daysActive: number;
  totalRolls: number;
  cutMeters: number;
  grossWeightKg: number;
  tareWeightKg: number;
  nettWeightKg: number;
  avgWeightPerMeter: number;
  sharePct: number;
  loomsCoveredCount: number;
}

export interface OperatorWiseRow {
  operatorName: string;
  shiftLogsCount: number;
  daysActive: number;
  loomsHandledCount: number;
  loomsList: string;
  totalProductionMeters: number;
  avgEfficiency: number;
  breakdownMinutes: number;
}

export interface ReportKpis {
  totalRollsCut: number;
  totalCutMeters: number;
  totalReadingMeters: number;
  totalGrossKg: number;
  totalTareKg: number;
  totalNettKg: number;
  totalNettMT: number;
  avgWeightPerMeter: number;
  avgEfficiency: number;
  totalBreakdownMinutes: number;
  activeLoomsCount: number;
  activeSupervisorsCount: number;
  activeOperatorsCount: number;
}

export interface ReportPeriod {
  startDate: string;
  endDate: string;
  shiftName: string;
  targetLoomNumber?: number | null;
  targetSupervisor?: string | null;
  targetOperator?: string | null;
}

export interface PrintLoomProductionReportOptions {
  criteria: "LOOM" | "SUPERVISOR" | "OPERATOR" | "CONSOLIDATED";
  period: ReportPeriod;
  kpis: ReportKpis;
  loomWise: LoomWiseRow[];
  supervisorWise: SupervisorWiseRow[];
  operatorWise: OperatorWiseRow[];
}

export function generateLoomProductionReportHtml(options: PrintLoomProductionReportOptions): string {
  const { criteria, period, kpis, loomWise, supervisorWise, operatorWise } = options;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const periodLabel = period.startDate === period.endDate
    ? period.startDate
    : `${period.startDate} to ${period.endDate}`;

  const criteriaTitle = criteria === "LOOM"
    ? "LOOM-WISE PRODUCTION REPORT"
    : criteria === "SUPERVISOR"
    ? "SUPERVISOR-WISE PRODUCTION REPORT"
    : criteria === "OPERATOR"
    ? "OPERATOR-WISE PRODUCTION REPORT"
    : "CONSOLIDATED LOOM PRODUCTION REPORT";

  // Section 1: Loom-Wise Rows
  const loomRowsHtml = loomWise.length > 0
    ? loomWise.map((r, idx) => `
        <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
          <td style="text-align: center; font-weight: 800; font-family: monospace; font-size: 8pt; color: #0284c7;">#${r.loomNumber}</td>
          <td style="font-size: 7.5pt; font-weight: 700; color: #0f172a; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.qualities}</td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 700; color: #0f172a;">${r.totalRolls}</td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0284c7; background: #f0f9ff;">${r.cutMeters.toLocaleString()}</td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #475569;">${r.readingMeters.toLocaleString()}</td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #475569;">${r.grossWeightKg.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background: #ecfdf5;">${r.nettWeightKg.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #7c3aed;">${r.avgWeightPerMeter.toFixed(1)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; color: ${r.avgEfficiency >= 80 ? "#15803d" : r.avgEfficiency >= 65 ? "#b45309" : "#dc2626"};">
            ${r.avgEfficiency.toFixed(1)}%
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #dc2626;">${r.breakdownMinutes > 0 ? `${r.breakdownMinutes}m` : "0m"}</td>
          <td style="font-size: 7pt; color: #64748b; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.primaryBreakdownReason}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="11" style="text-align: center; padding: 18px; color: #64748b; font-style: italic;">No loom records found.</td></tr>`;

  // Section 2: Supervisor-Wise Rows
  const supervisorRowsHtml = supervisorWise.length > 0
    ? supervisorWise.map((r, idx) => `
        <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
          <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${idx + 1}</td>
          <td style="font-size: 8pt; font-weight: 800; color: #0f172a;">${r.supervisorName}</td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #334155;">${r.shiftsSupervised}</td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #334155;">${r.loomsCoveredCount}</td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 700; color: #0f172a;">${r.totalRolls}</td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0284c7; background: #f0f9ff;">${r.cutMeters.toLocaleString()}</td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #475569;">${r.grossWeightKg.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background: #ecfdf5;">${r.nettWeightKg.toFixed(2)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #7c3aed;">${r.avgWeightPerMeter.toFixed(1)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f172a; background: #fef3c7;">${r.sharePct.toFixed(1)}%</td>
        </tr>
      `).join("")
    : `<tr><td colspan="10" style="text-align: center; padding: 18px; color: #64748b; font-style: italic;">No supervisor records found.</td></tr>`;

  // Section 3: Operator-Wise Rows
  const operatorRowsHtml = operatorWise.length > 0
    ? operatorWise.map((r, idx) => `
        <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
          <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${idx + 1}</td>
          <td style="font-size: 8pt; font-weight: 800; color: #0f172a;">${r.operatorName}</td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #334155;">${r.shiftLogsCount}</td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #334155;">${r.loomsHandledCount}</td>
          <td style="font-size: 7pt; color: #64748b; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.loomsList || "—"}</td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0284c7; background: #f0f9ff;">${r.totalProductionMeters.toLocaleString()}</td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; color: ${r.avgEfficiency >= 80 ? "#15803d" : r.avgEfficiency >= 65 ? "#b45309" : "#dc2626"};">
            ${r.avgEfficiency.toFixed(1)}%
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #dc2626;">${r.breakdownMinutes > 0 ? `${r.breakdownMinutes}m` : "0m"}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="8" style="text-align: center; padding: 18px; color: #64748b; font-style: italic;">No operator records found.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${criteriaTitle} - Flexicom ERP</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 7mm 8mm 7mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-container {
      width: 100%;
      max-width: 1100px;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
    }
    .header-table td {
      vertical-align: middle;
      padding: 2px 4px;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    .report-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0284c7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    .kpi-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      text-align: center;
      background: #f8fafc;
    }
    .kpi-label {
      font-size: 6.5pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.4px;
    }
    .kpi-val {
      font-size: 10pt;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 7.5pt;
    }
    .data-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7pt;
      padding: 5px 4px;
      border: 1px solid #0f172a;
      letter-spacing: 0.3px;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 3.5px 4px;
    }
    .section-heading {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      margin: 8px 0 4px 0;
      padding-bottom: 2px;
      border-bottom: 1.5px solid #0284c7;
      display: flex;
      justify-content: space-between;
    }
    .totals-row td {
      background: #f1f5f9 !important;
      font-weight: 800 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
    }
    .signature-grid {
      width: 100%;
      margin-top: 14px;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    .signature-grid td {
      width: 33.33%;
      text-align: center;
      padding: 4px;
      vertical-align: bottom;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      margin: 25px 20px 4px 20px;
    }
    .sig-label {
      font-size: 7pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 55%;">
          <div class="company-title">FLEXICOM INDUSTRIES PVT. LTD.</div>
          <div style="font-size: 7pt; color: #475569;">Plexi ERP • Loom Weaving & Circular Looms Division • Kathua Plant</div>
          <div class="report-title">${criteriaTitle}</div>
        </td>
        <td style="width: 45%; text-align: right; font-size: 7.5pt; color: #334155;">
          <div><strong>Period:</strong> ${periodLabel}</div>
          <div><strong>Shift Filter:</strong> ${period.shiftName} | <strong>Looms:</strong> ${period.targetLoomNumber ? `#${period.targetLoomNumber}` : "All (1-91)"}</div>
          <div><strong>Supervisor:</strong> ${period.targetSupervisor || "All"} | <strong>Operator:</strong> ${period.targetOperator || "All"}</div>
          <div style="font-size: 6.5pt; color: #64748b; margin-top: 2px;">Generated: ${genTimestamp}</div>
        </td>
      </tr>
    </table>

    <!-- Key Metrics Highlight Bento -->
    <table class="kpi-table">
      <tr>
        <td>
          <div class="kpi-label">Total Rolls Cut</div>
          <div class="kpi-val">${kpis.totalRollsCut}</div>
        </td>
        <td>
          <div class="kpi-label">Total Cut Length</div>
          <div class="kpi-val" style="color: #0284c7;">${kpis.totalCutMeters.toLocaleString()} <span style="font-size: 7pt;">m</span></div>
        </td>
        <td>
          <div class="kpi-label">Meter Reading Output</div>
          <div class="kpi-val">${kpis.totalReadingMeters.toLocaleString()} <span style="font-size: 7pt;">m</span></div>
        </td>
        <td>
          <div class="kpi-label">Total Nett Weight</div>
          <div class="kpi-val" style="color: #15803d;">${kpis.totalNettKg.toLocaleString()} <span style="font-size: 7pt;">kg (${kpis.totalNettMT} MT)</span></div>
        </td>
        <td>
          <div class="kpi-label">Avg Fabric g/m</div>
          <div class="kpi-val" style="color: #7c3aed;">${kpis.avgWeightPerMeter.toFixed(1)} <span style="font-size: 7pt;">g/m</span></div>
        </td>
        <td>
          <div class="kpi-label">Plant Efficiency</div>
          <div class="kpi-val" style="color: ${kpis.avgEfficiency >= 80 ? "#15803d" : "#b45309"};">${kpis.avgEfficiency.toFixed(1)}%</div>
        </td>
        <td>
          <div class="kpi-label">Total Downtime</div>
          <div class="kpi-val" style="color: #dc2626;">${Math.round(kpis.totalBreakdownMinutes / 60)}h ${kpis.totalBreakdownMinutes % 60}m</div>
        </td>
      </tr>
    </table>

    <!-- Criteria Breakdown Tables -->
    ${criteria === "LOOM" || criteria === "CONSOLIDATED" ? `
      <div class="section-heading">
        <span>Loom-Wise Production Performance (${loomWise.length} Active Looms)</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 38px; text-align: center;">Loom</th>
            <th>Qualities Produced</th>
            <th style="width: 48px; text-align: center;">Rolls</th>
            <th style="width: 70px; text-align: right;">Cut Mtrs</th>
            <th style="width: 65px; text-align: right;">Reading M</th>
            <th style="width: 65px; text-align: right;">Gross Wt</th>
            <th style="width: 70px; text-align: right;">Nett Wt (kg)</th>
            <th style="width: 55px; text-align: right;">Avg g/m</th>
            <th style="width: 55px; text-align: right;">Eff %</th>
            <th style="width: 55px; text-align: right;">Downtime</th>
            <th style="width: 130px;">Primary Reason</th>
          </tr>
        </thead>
        <tbody>
          ${loomRowsHtml}
        </tbody>
        <tfoot>
          <tr class="totals-row">
            <td colspan="2" style="text-align: right; font-weight: 800;">LOOM TOTALS:</td>
            <td style="text-align: center; font-family: monospace;">${kpis.totalRollsCut}</td>
            <td style="text-align: right; font-family: monospace; color: #0284c7;">${kpis.totalCutMeters.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${kpis.totalReadingMeters.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${kpis.totalGrossKg.toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #15803d;">${kpis.totalNettKg.toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #7c3aed;">${kpis.avgWeightPerMeter.toFixed(1)}</td>
            <td style="text-align: right; font-family: monospace;">${kpis.avgEfficiency.toFixed(1)}%</td>
            <td style="text-align: right; font-family: monospace; color: #dc2626;">${kpis.totalBreakdownMinutes}m</td>
            <td>—</td>
          </tr>
        </tfoot>
      </table>
    ` : ""}

    ${criteria === "SUPERVISOR" || criteria === "CONSOLIDATED" ? `
      <div class="section-heading" style="${criteria === "CONSOLIDATED" ? "page-break-before: auto;" : ""}">
        <span>Supervisor-Wise Production Performance (${supervisorWise.length} Supervisors)</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">S.N</th>
            <th>Supervisor In-Charge</th>
            <th style="width: 50px; text-align: center;">Shifts</th>
            <th style="width: 50px; text-align: center;">Looms</th>
            <th style="width: 50px; text-align: center;">Rolls Cut</th>
            <th style="width: 75px; text-align: right;">Cut Length (m)</th>
            <th style="width: 70px; text-align: right;">Gross Wt (kg)</th>
            <th style="width: 75px; text-align: right;">Nett Wt (kg)</th>
            <th style="width: 60px; text-align: right;">Avg g/m</th>
            <th style="width: 60px; text-align: right;">Share %</th>
          </tr>
        </thead>
        <tbody>
          ${supervisorRowsHtml}
        </tbody>
        <tfoot>
          <tr class="totals-row">
            <td colspan="4" style="text-align: right; font-weight: 800;">SUPERVISOR TOTALS:</td>
            <td style="text-align: center; font-family: monospace;">${kpis.totalRollsCut}</td>
            <td style="text-align: right; font-family: monospace; color: #0284c7;">${kpis.totalCutMeters.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${kpis.totalGrossKg.toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #15803d;">${kpis.totalNettKg.toFixed(2)}</td>
            <td style="text-align: right; font-family: monospace; color: #7c3aed;">${kpis.avgWeightPerMeter.toFixed(1)}</td>
            <td style="text-align: right; font-family: monospace;">100.0%</td>
          </tr>
        </tfoot>
      </table>
    ` : ""}

    ${criteria === "OPERATOR" || criteria === "CONSOLIDATED" ? `
      <div class="section-heading">
        <span>Operator-Wise Production Performance (${operatorWise.length} Floor Operators)</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">S.N</th>
            <th>Operator Name</th>
            <th style="width: 55px; text-align: center;">Shift Logs</th>
            <th style="width: 55px; text-align: center;">Looms Count</th>
            <th>Looms Assigned</th>
            <th style="width: 85px; text-align: right;">Total Mtrs Produced</th>
            <th style="width: 65px; text-align: right;">Avg Efficiency</th>
            <th style="width: 65px; text-align: right;">Downtime (m)</th>
          </tr>
        </thead>
        <tbody>
          ${operatorRowsHtml}
        </tbody>
        <tfoot>
          <tr class="totals-row">
            <td colspan="5" style="text-align: right; font-weight: 800;">OPERATOR TOTALS:</td>
            <td style="text-align: right; font-family: monospace; color: #0284c7;">${kpis.totalReadingMeters.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${kpis.avgEfficiency.toFixed(1)}%</td>
            <td style="text-align: right; font-family: monospace; color: #dc2626;">${kpis.totalBreakdownMinutes}m</td>
          </tr>
        </tfoot>
      </table>
    ` : ""}

    <!-- Sign-off Blocks -->
    <table class="signature-grid">
      <tr>
        <td>
          <div class="sig-line"></div>
          <div class="sig-label">Prepared By (Data Entry)</div>
        </td>
        <td>
          <div class="sig-line"></div>
          <div class="sig-label">Shift Supervisor / In-Charge</div>
        </td>
        <td>
          <div class="sig-line"></div>
          <div class="sig-label">Production Manager / Authorized Signatory</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

export function printLoomProductionReport(options: PrintLoomProductionReportOptions): void {
  const html = generateLoomProductionReportHtml(options);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print the production report.");
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
