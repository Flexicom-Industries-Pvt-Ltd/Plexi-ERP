/**
 * Minimalist Enterprise ERP Tape Plant Reports Print & PDF Engine
 * Generates high-contrast, crisp, professional A4 landscape printable documents
 * with exact tabular fitting and isolated iframe printing.
 */

import { TapePlantReportDataset } from "./reports-export";

export interface PrintReportOptions {
  data: TapePlantReportDataset;
  dateFrom: string;
  dateTo: string;
  mode?: "all" | "summary" | "shift" | "operator" | "waste" | "efficiency";
  filterShiftName?: string;
  filterOperatorName?: string;
  filterRecipeQuality?: string;
}

export function generateTapePlantReportHtml(options: PrintReportOptions): string {
  const {
    data,
    dateFrom,
    dateTo,
    mode = "all",
    filterShiftName,
    filterOperatorName,
    filterRecipeQuality,
  } = options;

  const dateRangeLabel = `${dateFrom} to ${dateTo}`;
  const docRef = `TP-RPT-${dateFrom.replace(/-/g, "")}-${dateTo.replace(/-/g, "")}-${mode.toUpperCase()}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const totals = data.totals;

  // Title based on mode
  let docTitle = "Comprehensive Production, Wastage & Efficiency Audit";
  if (mode === "shift") docTitle = "Tape Plant Production Shift-Wise Analysis";
  else if (mode === "operator") docTitle = "Tape Plant Production Operator-Wise Analysis";
  else if (mode === "waste") docTitle = "Tape Plant Wastage Breakdown & Benchmark Report";
  else if (mode === "efficiency") docTitle = "Tape Plant Efficiency & Productivity Benchmark";
  else if (mode === "summary") docTitle = "Tape Plant Detailed Production Log Register";

  // Section 1: Shift-Wise Table Rows
  const shiftRows = data.shiftWise.map((s, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 700; width: 26px;">${idx + 1}</td>
      <td style="font-weight: 700;">${s.shiftName}</td>
      <td style="text-align: center; font-family: monospace;">${s.recordCount}</td>
      <td style="text-align: right; font-family: monospace;">${s.plannedKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace; background-color: #f8fafc;">${s.actualKg.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace; color: ${s.gapKg > 0 ? '#b45309' : '#047857'};">${s.gapKg.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">${s.wasteKg.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace;">${s.wastePercent.toFixed(2)}%</td>
      <td style="text-align: right; font-weight: 700; font-family: monospace; color: #065f46;">${s.netKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace; color: #1d4ed8;">${s.efficiencyPercent.toFixed(1)}%</td>
      <td style="text-align: right; font-family: monospace; font-weight: 600;">${s.productionShare.toFixed(1)}%</td>
      <td style="font-size: 7pt; color: #475569;">${s.operators.join(", ") || "—"}</td>
    </tr>
  `).join("");

  // Section 2: Operator-Wise Table Rows
  const opRows = data.operatorWise.map((op, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 700; width: 26px;">${idx + 1}</td>
      <td style="font-weight: 700;">${op.operatorName}</td>
      <td style="text-align: center; font-family: monospace;">${op.shiftCount}</td>
      <td style="text-align: right; font-family: monospace;">${op.plannedKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace; background-color: #f8fafc;">${op.actualKg.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace; color: ${op.gapKg > 0 ? '#b45309' : '#047857'};">${op.gapKg.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace; color: #b91c1c; font-weight: 600;">${op.wasteKg.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace;">${op.wastePercent.toFixed(2)}%</td>
      <td style="text-align: right; font-weight: 700; font-family: monospace; color: #065f46;">${op.netKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace; color: #1d4ed8;">${op.efficiencyPercent.toFixed(1)}%</td>
      <td style="text-align: right; font-family: monospace; font-weight: 700; color: #4338ca;">${op.qualityScore}</td>
      <td style="text-align: right; font-family: monospace; font-weight: 600;">${op.productionShare.toFixed(1)}%</td>
    </tr>
  `).join("");

  // Section 3: Wastage Benchmark Rows
  const wasteShiftRows = data.wasteShiftWise.map((w, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 700; width: 26px;">${idx + 1}</td>
      <td style="font-weight: 600;">${w.shiftName}</td>
      <td style="text-align: right; font-family: monospace;">${w.actualKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 700; font-family: monospace; color: #b91c1c;">${w.wasteKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace;">${w.wastePercent.toFixed(2)}%</td>
      <td style="text-align: center; font-weight: 700; font-size: 6.5pt;">
        <span style="border: 1px solid ${w.statusBenchmark === 'OPTIMAL' ? '#059669' : w.statusBenchmark === 'ACCEPTABLE' ? '#d97706' : '#dc2626'}; padding: 1px 4px;">${w.statusBenchmark}</span>
      </td>
    </tr>
  `).join("");

  const wasteOpRows = data.wasteOperatorWise.map((w, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 700; width: 26px;">${idx + 1}</td>
      <td style="font-weight: 600;">${w.operatorName}</td>
      <td style="text-align: right; font-family: monospace;">${w.actualKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 700; font-family: monospace; color: #b91c1c;">${w.wasteKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace;">${w.wastePercent.toFixed(2)}%</td>
      <td style="text-align: center; font-weight: 700; font-size: 6.5pt;">
        <span style="border: 1px solid ${w.statusBenchmark === 'OPTIMAL' ? '#059669' : w.statusBenchmark === 'ACCEPTABLE' ? '#d97706' : '#dc2626'}; padding: 1px 4px;">${w.statusBenchmark}</span>
      </td>
    </tr>
  `).join("");

  // Section 4: Efficiency Benchmark Rows
  const effShiftRows = data.efficiencyShiftWise.map((e, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 700; width: 26px;">${idx + 1}</td>
      <td style="font-weight: 600;">${e.shiftName}</td>
      <td style="text-align: right; font-family: monospace;">${e.plannedKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 700; font-family: monospace;">${e.actualKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace; color: #1d4ed8;">${e.efficiencyPercent.toFixed(1)}%</td>
      <td style="text-align: right; font-family: monospace; color: #047857;">${(e.netEfficiencyPercent || 0).toFixed(1)}%</td>
      <td style="text-align: center; font-weight: 700; font-size: 6.5pt;">
        <span style="border: 1px solid ${e.performanceTier === 'TOP_TIER' ? '#059669' : e.performanceTier === 'ON_TARGET' ? '#2563eb' : '#dc2626'}; padding: 1px 4px;">${e.performanceTier.replace(/_/g, ' ')}</span>
      </td>
    </tr>
  `).join("");

  const effOpRows = data.efficiencyOperatorWise.map((e, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 700; width: 26px;">${idx + 1}</td>
      <td style="font-weight: 600;">${e.operatorName}</td>
      <td style="text-align: right; font-family: monospace;">${e.plannedKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 700; font-family: monospace;">${e.actualKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace; color: #1d4ed8;">${e.efficiencyPercent.toFixed(1)}%</td>
      <td style="text-align: right; font-family: monospace; font-weight: 700; color: #4338ca;">${e.qualityScore || "—"}</td>
      <td style="text-align: center; font-weight: 700; font-size: 6.5pt;">
        <span style="border: 1px solid ${e.performanceTier === 'TOP_TIER' ? '#059669' : e.performanceTier === 'ON_TARGET' ? '#2563eb' : '#dc2626'}; padding: 1px 4px;">${e.performanceTier.replace(/_/g, ' ')}</span>
      </td>
    </tr>
  `).join("");

  // Section 5: Granular Summary Rows (compact limit if in all mode or full in summary mode)
  const granularRows = data.summary.map((r, idx) => `
    <tr>
      <td style="text-align: center; font-weight: 700; width: 24px;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: 600;">${r.date}</td>
      <td>${r.shiftName}</td>
      <td style="font-weight: 600;">${r.operatorName}</td>
      <td style="font-family: monospace; font-weight: 700; font-size: 7.5pt;">${r.recipeQuality}</td>
      <td style="text-align: right; font-family: monospace;">${r.plannedKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace; background-color: #f8fafc;">${r.actualKg.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace; color: ${r.gapKg > 0 ? '#b45309' : '#047857'};">${r.gapKg.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace; color: #b91c1c;">${r.wasteKg.toLocaleString()}</td>
      <td style="text-align: right; font-family: monospace;">${r.wastePercent.toFixed(2)}%</td>
      <td style="text-align: right; font-weight: 700; font-family: monospace; color: #065f46;">${r.netKg.toLocaleString()}</td>
      <td style="text-align: right; font-weight: 800; font-family: monospace; color: #1d4ed8;">${r.efficiencyPercent.toFixed(1)}%</td>
      <td style="text-align: center; font-size: 6.5pt; font-weight: 700;">${r.status}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tape Plant Report - ${docRef}</title>
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
    .doc-meta-item strong {
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
      font-size: 7pt;
      text-transform: uppercase;
      text-align: left;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 2.5px 4px;
      font-size: 7.5pt;
      color: #0f172a;
    }
    .data-table tfoot td {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      font-weight: 700;
      padding: 3px 4px;
    }

    /* Two column grid for waste / efficiency */
    .grid-2col {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 4px;
    }
    .grid-col {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      padding-right: 4px;
    }
    .grid-col:last-child {
      padding-right: 0;
      padding-left: 4px;
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
          <div class="company-sub">Tape Plant Extrusion & Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)</div>
          <div class="doc-badge-title">${docTitle}</div>
        </td>
        <td class="doc-meta-box">
          <div class="doc-ref-no">${docRef}</div>
          <div class="doc-meta-item">Period: <strong>${dateRangeLabel}</strong> &nbsp;|&nbsp; Generated: <strong>${genTimestamp}</strong></div>
          ${filterShiftName || filterOperatorName || filterRecipeQuality ? `
            <div class="doc-meta-item">
              Filters: ${filterShiftName ? `Shift: <strong>${filterShiftName}</strong> ` : ''}${filterOperatorName ? `Operator: <strong>${filterOperatorName}</strong> ` : ''}${filterRecipeQuality ? `Recipe: <strong>${filterRecipeQuality}</strong>` : ''}
            </div>` : ''}
        </td>
      </tr>
    </table>

    <!-- KEY REPORT KPI BAR -->
    <table class="kpi-table">
      <tr>
        <td style="width: 16%;">
          <div class="kpi-label">Total Planned Target</div>
          <div class="kpi-val">${totals.totalPlannedKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 16%;">
          <div class="kpi-label">Total Actual Produced</div>
          <div class="kpi-val">${totals.totalActualKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 16%;">
          <div class="kpi-label">Variance / Gap</div>
          <div class="kpi-val" style="color: ${totals.totalGapKg > 0 ? '#b45309' : '#047857'};">${totals.totalGapKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 16%;">
          <div class="kpi-label">Total Factory Waste</div>
          <div class="kpi-val" style="color: #b91c1c;">${totals.totalWasteKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 16%;">
          <div class="kpi-label">Avg Waste Rate</div>
          <div class="kpi-val">${totals.avgWastePercent.toFixed(2)}%</div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Avg Plant Efficiency</div>
          <div class="kpi-val" style="color: #1d4ed8;">${totals.avgEfficiencyPercent.toFixed(1)}% <span style="font-size: 6.5pt; font-weight: normal;">(${totals.totalShiftsCount} Shifts • ${totals.totalOperatorsCount} Ops)</span></div>
        </td>
      </tr>
    </table>

    ${(mode === "all" || mode === "shift") ? `
      <!-- SHIFT-WISE PRODUCTION -->
      <div class="section-title">1. Production & Performance Breakdown (Shift-Wise)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align: center; width: 26px;">#</th>
            <th>Shift Name</th>
            <th style="text-align: center; width: 44px;">Batches</th>
            <th style="text-align: right; width: 68px;">Planned (KG)</th>
            <th style="text-align: right; width: 72px;">Actual (KG)</th>
            <th style="text-align: right; width: 62px;">Gap (KG)</th>
            <th style="text-align: right; width: 62px;">Waste (KG)</th>
            <th style="text-align: right; width: 50px;">Waste %</th>
            <th style="text-align: right; width: 72px;">Net Output</th>
            <th style="text-align: right; width: 62px;">Efficiency</th>
            <th style="text-align: right; width: 50px;">Share %</th>
            <th>Active Operators</th>
          </tr>
        </thead>
        <tbody>
          ${shiftRows || `<tr><td colspan="12" style="text-align: center; color: #64748b; padding: 6px;">No shift production records found.</td></tr>`}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="text-align: right; text-transform: uppercase; font-size: 7pt;">Total / Plant Avg:</td>
            <td style="text-align: center; font-family: monospace;">${totals.recordCount}</td>
            <td style="text-align: right; font-family: monospace;">${totals.totalPlannedKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 800; background-color: #f1f5f9;">${totals.totalActualKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${totals.totalGapKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${totals.totalWasteKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${totals.avgWastePercent.toFixed(2)}%</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700;">${totals.totalNetKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 800; color: #1d4ed8;">${totals.avgEfficiencyPercent.toFixed(1)}%</td>
            <td style="text-align: right; font-family: monospace;">100%</td>
            <td>—</td>
          </tr>
        </tfoot>
      </table>
    ` : ""}

    ${(mode === "all" || mode === "operator") ? `
      <!-- OPERATOR-WISE PRODUCTION -->
      <div class="section-title avoid-break">2. Production & Output Breakdown (Operator-Wise)</div>
      <table class="data-table avoid-break">
        <thead>
          <tr>
            <th style="text-align: center; width: 26px;">#</th>
            <th>Operator Name</th>
            <th style="text-align: center; width: 44px;">Shifts</th>
            <th style="text-align: right; width: 68px;">Planned (KG)</th>
            <th style="text-align: right; width: 72px;">Actual (KG)</th>
            <th style="text-align: right; width: 62px;">Gap (KG)</th>
            <th style="text-align: right; width: 62px;">Waste (KG)</th>
            <th style="text-align: right; width: 50px;">Waste %</th>
            <th style="text-align: right; width: 72px;">Net Output</th>
            <th style="text-align: right; width: 62px;">Efficiency</th>
            <th style="text-align: right; width: 55px;">Quality Score</th>
            <th style="text-align: right; width: 50px;">Share %</th>
          </tr>
        </thead>
        <tbody>
          ${opRows || `<tr><td colspan="12" style="text-align: center; color: #64748b; padding: 6px;">No operator production records found.</td></tr>`}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="text-align: right; text-transform: uppercase; font-size: 7pt;">Total / Avg:</td>
            <td style="text-align: center; font-family: monospace;">${totals.recordCount}</td>
            <td style="text-align: right; font-family: monospace;">${totals.totalPlannedKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 800; background-color: #f1f5f9;">${totals.totalActualKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${totals.totalGapKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${totals.totalWasteKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace;">${totals.avgWastePercent.toFixed(2)}%</td>
            <td style="text-align: right; font-family: monospace; font-weight: 700;">${totals.totalNetKg.toLocaleString()}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 800; color: #1d4ed8;">${totals.avgEfficiencyPercent.toFixed(1)}%</td>
            <td style="text-align: right; font-family: monospace;">—</td>
            <td style="text-align: right; font-family: monospace;">100%</td>
          </tr>
        </tfoot>
      </table>
    ` : ""}

    ${(mode === "all" || mode === "waste") ? `
      <!-- WASTAGE BREAKDOWN -->
      <div class="avoid-break">
        <div class="section-title">3. Wastage Breakdown & Benchmarks (Shift-Wise & Operator-Wise)</div>
        <div class="grid-2col">
          <div class="grid-col">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="text-align: center; width: 22px;">#</th>
                  <th>Shift Name</th>
                  <th style="text-align: right; width: 60px;">Output (KG)</th>
                  <th style="text-align: right; width: 55px;">Waste (KG)</th>
                  <th style="text-align: right; width: 50px;">Waste %</th>
                  <th style="text-align: center; width: 65px;">Status</th>
                </tr>
              </thead>
              <tbody>${wasteShiftRows}</tbody>
            </table>
          </div>
          <div class="grid-col">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="text-align: center; width: 22px;">#</th>
                  <th>Operator Name</th>
                  <th style="text-align: right; width: 60px;">Output (KG)</th>
                  <th style="text-align: right; width: 55px;">Waste (KG)</th>
                  <th style="text-align: right; width: 50px;">Waste %</th>
                  <th style="text-align: center; width: 65px;">Status</th>
                </tr>
              </thead>
              <tbody>${wasteOpRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    ` : ""}

    ${(mode === "all" || mode === "efficiency") ? `
      <!-- EFFICIENCY & PERFORMANCE BENCHMARK -->
      <div class="avoid-break">
        <div class="section-title">4. Efficiency & Performance Benchmarks (Shift-Wise & Operator-Wise)</div>
        <div class="grid-2col">
          <div class="grid-col">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="text-align: center; width: 22px;">#</th>
                  <th>Shift Name</th>
                  <th style="text-align: right; width: 55px;">Target (KG)</th>
                  <th style="text-align: right; width: 55px;">Actual (KG)</th>
                  <th style="text-align: right; width: 55px;">Eff %</th>
                  <th style="text-align: right; width: 55px;">Net Eff %</th>
                  <th style="text-align: center; width: 65px;">Tier</th>
                </tr>
              </thead>
              <tbody>${effShiftRows}</tbody>
            </table>
          </div>
          <div class="grid-col">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="text-align: center; width: 22px;">#</th>
                  <th>Operator Name</th>
                  <th style="text-align: right; width: 55px;">Target (KG)</th>
                  <th style="text-align: right; width: 55px;">Actual (KG)</th>
                  <th style="text-align: right; width: 55px;">Eff %</th>
                  <th style="text-align: right; width: 55px;">Score</th>
                  <th style="text-align: center; width: 65px;">Tier</th>
                </tr>
              </thead>
              <tbody>${effOpRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    ` : ""}

    ${(mode === "all" || mode === "summary") ? `
      <!-- GRANULAR LOG REGISTER -->
      <div class="avoid-break">
        <div class="section-title">5. Granular Production Log Register</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align: center; width: 24px;">#</th>
              <th style="width: 60px;">Date</th>
              <th style="width: 80px;">Shift</th>
              <th style="width: 80px;">Operator</th>
              <th>Recipe / Quality</th>
              <th style="text-align: right; width: 60px;">Planned</th>
              <th style="text-align: right; width: 60px;">Actual</th>
              <th style="text-align: right; width: 55px;">Gap</th>
              <th style="text-align: right; width: 55px;">Waste</th>
              <th style="text-align: right; width: 45px;">Waste %</th>
              <th style="text-align: right; width: 60px;">Net Output</th>
              <th style="text-align: right; width: 50px;">Eff %</th>
              <th style="text-align: center; width: 45px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${granularRows || `<tr><td colspan="13" style="text-align: center; color: #64748b; padding: 6px;">No production records found.</td></tr>`}
          </tbody>
        </table>
      </div>
    ` : ""}

    <!-- AUTHORIZATION SIGN-OFFS -->
    <div class="avoid-break">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">Prepared By (Production Data In-Charge)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Verified By (Plant QC & Quality Audit)</div>
            <div class="sign-line">Signature & Stamp</div>
          </td>
          <td>
            <div class="sign-title">Approved By (General Manager / Plant Head)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        <span>Flexicom ERP • Tape Plant Extrusion Production Systems • Document: ${docRef}</span>
        <span>Generated: ${genTimestamp} • Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Directly prints the Tape Plant Report in an isolated hidden iframe/window.
 * Completely immune to React component layout and modal overflows.
 */
export function printTapePlantReport(options: PrintReportOptions): void {
  const html = generateTapePlantReportHtml(options);

  // Hidden iframe
  let iframe = document.getElementById("tape-plant-report-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "tape-plant-report-print-iframe";
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
