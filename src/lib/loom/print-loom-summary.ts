/**
 * Minimalist Enterprise ERP Loom Summary & Machine Allocations Print & PDF Engine
 * Formatted precisely as per Tape Planning standards with top-left Flexicom logo,
 * centered title, KPI summary cards, structured allocation tables, and official 3-column sign-offs.
 * 
 * Supports view-aware and filter-aware printing:
 * - Recipe-Wise View: Prints Recipe Formulation & Tape Dispense Schedule
 * - Loom-Wise View: Prints Circular Loom Machines 1-91 Matrix & Status (including Active-Only filter)
 */

import { LoomSummaryDataset } from "./loom-summary-export";
import { RecipeLoomSummaryItem, LoomMachineSummaryItem } from "@/app/api/production/loom/summary/route";

export interface PrintLoomSummaryOptions extends Partial<LoomSummaryDataset> {
  activeView?: "recipes" | "looms";
  selectedDate?: string;
  selectedShiftId?: string;
  selectedShiftName?: string;
  search?: string;
  selectedLoomFilter?: string;
  showActiveOnly?: boolean;
  recipeSummaries?: RecipeLoomSummaryItem[];
  loomSummaries?: LoomMachineSummaryItem[];
}

export function generateLoomSummaryHtml(data: PrintLoomSummaryOptions): string {
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const activeView = data.activeView || "recipes";
  const dateLabel = data.selectedDate && data.selectedDate !== "ALL" ? data.selectedDate : "All Dates (Till Date)";
  const shiftLabel = data.selectedShiftName || (data.selectedShiftId && data.selectedShiftId !== "ALL" ? data.selectedShiftId : "All Shifts");
  const docDate = (data.selectedDate && data.selectedDate !== "ALL" ? data.selectedDate : new Date().toISOString().slice(0, 10)).replace(/-/g, "");

  // Active filters label
  const filterParts: string[] = [];
  if (data.showActiveOnly) filterParts.push("Active Looms Only");
  if (data.selectedLoomFilter && data.selectedLoomFilter !== "ALL") filterParts.push(`Loom #${data.selectedLoomFilter}`);
  if (data.search && data.search.trim()) filterParts.push(`Search "${data.search.trim()}"`);
  const activeFiltersLabel = filterParts.length > 0 ? filterParts.join(" • ") : null;

  // -------------------------------------------------------------
  // VIEW 1: RECIPE-WISE PRINT GENERATION
  // -------------------------------------------------------------
  if (activeView === "recipes") {
    const docRef = `LM-REC-${docDate}`;
    const recipes: RecipeLoomSummaryItem[] = data.recipeSummaries && data.recipeSummaries.length > 0
      ? data.recipeSummaries
      : (data.qualities || []).map((q) => ({
          recipeQuality: q.qualityCode,
          totalLoomsCount: q.totalLooms,
          assignedLooms: q.loomNumbers,
          assignedLoomIdentifiers: q.loomNumbers.map((n) => `Loom #${n}`),
          totalCratesIssued: Number(((q.actualOutputKg || 0) / 12.8).toFixed(2)),
          totalBobbinsIssued: Number(((q.actualOutputKg || 0) / 1.6).toFixed(2)),
          totalWeightIssuedKg: q.actualOutputKg || 0,
          latestIssueDate: q.lastRunDate || "—",
          activeShifts: q.activeShifts || [],
          issuesCount: 1,
          issuers: q.latestOperator ? [q.latestOperator] : [],
          receivers: [],
          recentIssues: [],
        }));

    const allAssignedLoomsSet = new Set<number>();
    let sumCrates = 0;
    let sumBobbins = 0;
    let sumWeightKg = 0;

    recipes.forEach((r) => {
      r.assignedLooms.forEach((n) => allAssignedLoomsSet.add(n));
      sumCrates += r.totalCratesIssued;
      sumBobbins += r.totalBobbinsIssued;
      sumWeightKg += r.totalWeightIssuedKg;
    });

    const uniqueLoomsCount = allAssignedLoomsSet.size;

    const recipeRowsHtml = recipes.length > 0
      ? recipes.map((r, idx) => `
        <tr>
          <td style="text-align: center; font-weight: 700; width: 24px;">${idx + 1}</td>
          <td style="font-weight: 800; font-family: monospace; font-size: 8pt; color: #0f172a;">${r.recipeQuality}</td>
          <td style="text-align: center; font-weight: 800; font-family: monospace; background-color: #f8fafc; font-size: 8.5pt; width: 45px;">
            ${r.totalLoomsCount}
          </td>
          <td style="font-family: monospace; font-size: 7.5pt; color: #1e3a8a; font-weight: bold;">
            ${r.assignedLooms.length > 0 ? r.assignedLooms.map((n) => `#${n}`).join(", ") : (r.assignedLoomIdentifiers?.join(", ") || "—")}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #6b21a8; background: #faf5ff;">
            ${r.totalCratesIssued.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #1e40af; background: #eff6ff;">
            ${r.totalBobbinsIssued.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 800; color: #047857; background: #f0fdf4;">
            ${r.totalWeightIssuedKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 7pt;">${r.latestIssueDate}</td>
          <td style="font-size: 7pt; color: #475569;">${(r.activeShifts || []).join(", ") || "—"}</td>
        </tr>
      `).join("")
      : `
        <tr>
          <td colspan="9" style="text-align: center; color: #64748b; font-style: italic; padding: 16px;">
            No recipe allocations found for the selected filters.
          </td>
        </tr>
      `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Loom Recipe Summary - ${docRef}</title>
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
      box-sizing: border-box;
    }

    /* Minimalist Centered Header */
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
      padding: 4px 6px;
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
      font-size: 7.5pt;
      table-layout: auto;
    }
    .data-table th {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 3px 5px;
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 3px 5px;
      font-size: 7.5pt;
      color: #0f172a;
    }
    .data-table tfoot td {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      font-weight: 700;
      padding: 3.5px 5px;
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
      margin-bottom: 16px;
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
      padding-top: 3px;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- MAIN HEADER WITH TOP-LEFT VIVID FLEXICOM LOGO -->
    <div class="header-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
        <div style="width: 65px; text-align: left; display: flex; align-items: center;">
          <img src="/logo.png" alt="Flexicom Logo" style="height: 44px; width: auto; object-fit: contain; filter: contrast(1.25) saturate(1.25);" onerror="this.style.display='none'" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
          <div class="company-sub">Circular Loom Weaving & Fabric Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)</div>
          <div class="doc-main-heading">LOOM RECIPE FORMULATION & DISPENSE SCHEDULE</div>
        </div>
        <div style="width: 65px;" aria-hidden="true"></div>
      </div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>•</span>
        <span>Date: <strong>${dateLabel}</strong></span>
        <span>•</span>
        <span>Shift: <strong>${shiftLabel}</strong></span>
        ${activeFiltersLabel ? `<span>•</span><span>Filters: <strong>${activeFiltersLabel}</strong></span>` : ""}
        <span>•</span>
        <span>Printed: <strong>${genTimestamp}</strong></span>
      </div>
    </div>

    <!-- KEY RECIPE METRICS -->
    <table class="kpi-table">
      <tr>
        <td style="width: 20%;">
          <div class="kpi-label">Active Recipe Qualities</div>
          <div class="kpi-val">${recipes.length} <span style="font-size: 7pt; font-weight: normal;">Recipes</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Assigned Loom Machines</div>
          <div class="kpi-val" style="color: #15803d;">${uniqueLoomsCount} <span style="font-size: 7pt; font-weight: normal;">Looms</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Total Crates Issued</div>
          <div class="kpi-val" style="color: #6b21a8;">${sumCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span style="font-size: 7pt; font-weight: normal;">Crates</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Total Bobbins (@ 8)</div>
          <div class="kpi-val" style="color: #1e40af;">${sumBobbins.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} <span style="font-size: 7pt; font-weight: normal;">Pcs</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Total Dispatched Weight</div>
          <div class="kpi-val" style="color: #047857;">${sumWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 7pt; font-weight: normal;">KG</span></div>
        </td>
      </tr>
    </table>

    <!-- 1. RECIPE-WISE LOOM ALLOCATION SCHEDULE -->
    <div class="section-title">RECIPE-WISE CIRCULAR LOOM ALLOCATIONS (TAPE PLANT DISPENSE)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align: center; width: 24px;">#</th>
          <th style="text-align: left;">Recipe Quality Code</th>
          <th style="text-align: center; width: 50px;">Looms</th>
          <th style="text-align: left;">Assigned Loom Machines</th>
          <th style="text-align: right; width: 75px;">Crates</th>
          <th style="text-align: right; width: 75px;">Bobbins</th>
          <th style="text-align: right; width: 90px;">Net Weight</th>
          <th style="text-align: center; width: 80px;">Latest Date</th>
          <th style="text-align: left; width: 95px;">Active Shifts</th>
        </tr>
      </thead>
      <tbody>
        ${recipeRowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align: right; text-transform: uppercase; font-size: 7pt; font-weight: bold;">
            Grand Totals (${recipes.length} Qualities):
          </td>
          <td style="text-align: center; font-family: monospace; font-size: 8pt; font-weight: 800; background-color: #f1f5f9;">
            ${uniqueLoomsCount}
          </td>
          <td style="text-align: center; font-size: 7pt; color: #475569;">
            ${uniqueLoomsCount} Machines Running
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #6b21a8; background: #faf5ff;">
            ${sumCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #1e40af; background: #eff6ff;">
            ${sumBobbins.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #047857; background: #f0fdf4;">
            ${sumWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
          </td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>

    <!-- 3-COLUMN OFFICIAL SIGN-OFF STRIP -->
    <div class="avoid-break">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">Prepared By (Loom Shed In-Charge)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Verified By (Tape Plant Supervisor)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Approved By (Plant Manager)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
        </tr>
      </table>

      <!-- FOOTER NOTE -->
      <div class="footer-note">
        <span>Flexicom ERP • Tape Plant & Circular Loom Weaving Integration</span>
        <span>Confidential & Proprietary • Flexicom Industries Pvt. Ltd.</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  // -------------------------------------------------------------
  // VIEW 2: LOOM-WISE PRINT GENERATION (LOOMS 1 TO 91 OR ACTIVE ONLY)
  // -------------------------------------------------------------
  const docRef = `LM-MACH-${docDate}`;
  let looms: LoomMachineSummaryItem[] = data.loomSummaries && data.loomSummaries.length > 0
    ? data.loomSummaries
    : (data.loomMatrix || []).map((m) => ({
        loomNumber: m.loomNumber,
        loomIdentifier: `Loom #${m.loomNumber}`,
        isActive: m.isAllocated,
        activeRecipe: m.qualityCode,
        allRecipes: m.qualityCode ? [m.qualityCode] : [],
        totalCrates: 0,
        totalBobbins: 0,
        totalWeightKg: 0,
        latestDate: null,
        latestShiftName: m.activeShifts?.[0] || null,
        lastIssuedBy: m.latestOperator || null,
        lastReceivedBy: null,
        allocationsCount: m.isAllocated ? 1 : 0,
        recentIssues: [],
      }));

  if (data.showActiveOnly) {
    looms = looms.filter((l) => l.isActive);
  }

  const activeLoomsCount = looms.filter((l) => l.isActive).length;
  const idleLoomsCount = looms.filter((l) => !l.isActive).length;
  const totalCrates = looms.reduce((sum, l) => sum + (l.totalCrates || 0), 0);
  const totalBobbins = looms.reduce((sum, l) => sum + (l.totalBobbins || 0), 0);
  const totalWeightKg = looms.reduce((sum, l) => sum + (l.totalWeightKg || 0), 0);

  const loomRowsHtml = looms.length > 0
    ? looms.map((l) => `
      <tr style="${l.isActive ? 'background-color: #f0fdf4;' : 'background-color: #ffffff;'}">
        <td style="text-align: center; font-weight: 800; font-family: monospace; font-size: 8pt; ${l.isActive ? 'color: #15803d;' : 'color: #64748b;'}">
          #${l.loomNumber}
        </td>
        <td style="text-align: center; font-size: 7pt;">
          <span style="border: 1px solid ${l.isActive ? '#059669' : '#cbd5e1'}; padding: 1.5px 5px; border-radius: 3px; font-weight: 700; ${l.isActive ? 'background: #dcfce7; color: #166534;' : 'background: #f8fafc; color: #94a3b8;'}">
            ${l.isActive ? 'RUNNING' : 'IDLE'}
          </span>
        </td>
        <td style="font-family: monospace; font-size: 7.5pt; font-weight: ${l.isActive ? '800' : 'normal'}; color: ${l.isActive ? '#0f172a' : '#94a3b8'};">
          ${l.activeRecipe || '—'}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: ${l.isActive ? '#6b21a8' : '#94a3b8'};">
          ${l.totalCrates > 0 ? l.totalCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '—'}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: ${l.isActive ? '#1e40af' : '#94a3b8'};">
          ${l.totalBobbins > 0 ? l.totalBobbins.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 800; color: ${l.isActive ? '#047857' : '#94a3b8'};">
          ${l.totalWeightKg > 0 ? `${l.totalWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg` : '—'}
        </td>
        <td style="text-align: center; font-family: monospace; font-size: 7pt; color: #334155;">
          ${l.latestDate || '—'}
        </td>
        <td style="text-align: center; font-size: 7pt; color: #475569;">
          ${l.latestShiftName || '—'}
        </td>
        <td style="font-size: 7pt; color: #475569;">
          ${l.lastIssuedBy ? `${l.lastIssuedBy}${l.lastReceivedBy ? ` → ${l.lastReceivedBy}` : ''}` : '—'}
        </td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="9" style="text-align: center; color: #64748b; font-style: italic; padding: 16px;">
          No loom machines found matching the selected filters.
        </td>
      </tr>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Loom Machines Status - ${docRef}</title>
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
      box-sizing: border-box;
    }

    /* Minimalist Centered Header */
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
      padding: 4px 6px;
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
      font-size: 7.5pt;
      table-layout: auto;
    }
    .data-table th {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 3px 5px;
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 3px 5px;
      font-size: 7.5pt;
      color: #0f172a;
    }
    .data-table tfoot td {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      font-weight: 700;
      padding: 3.5px 5px;
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
      margin-bottom: 16px;
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
      padding-top: 3px;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- MAIN HEADER WITH TOP-LEFT VIVID FLEXICOM LOGO -->
    <div class="header-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
        <div style="width: 65px; text-align: left; display: flex; align-items: center;">
          <img src="/logo.png" alt="Flexicom Logo" style="height: 44px; width: auto; object-fit: contain; filter: contrast(1.25) saturate(1.25);" onerror="this.style.display='none'" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
          <div class="company-sub">Circular Loom Weaving & Fabric Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)</div>
          <div class="doc-main-heading">CIRCULAR LOOM MACHINES STATUS & ALLOCATIONS</div>
        </div>
        <div style="width: 65px;" aria-hidden="true"></div>
      </div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>•</span>
        <span>Scope: <strong>${data.showActiveOnly ? "Active Running Looms Only" : "Circular Loom Shed"}</strong></span>
        <span>•</span>
        <span>Date: <strong>${dateLabel}</strong></span>
        <span>•</span>
        <span>Shift: <strong>${shiftLabel}</strong></span>
        ${activeFiltersLabel ? `<span>•</span><span>Filters: <strong>${activeFiltersLabel}</strong></span>` : ""}
        <span>•</span>
        <span>Printed: <strong>${genTimestamp}</strong></span>
      </div>
    </div>

    <!-- KEY LOOM METRICS -->
    <table class="kpi-table">
      <tr>
        <td style="width: 20%;">
          <div class="kpi-label">Machines in Report</div>
          <div class="kpi-val">${looms.length} <span style="font-size: 7pt; font-weight: normal;">Looms</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Active Running Looms</div>
          <div class="kpi-val" style="color: #15803d;">${activeLoomsCount} <span style="font-size: 7pt; font-weight: normal;">Running</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Idle / Standby Looms</div>
          <div class="kpi-val" style="color: #64748b;">${idleLoomsCount} <span style="font-size: 7pt; font-weight: normal;">Idle</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Total Crates Dispatched</div>
          <div class="kpi-val" style="color: #6b21a8;">${totalCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span style="font-size: 7pt; font-weight: normal;">Crates</span></div>
        </td>
        <td style="width: 20%;">
          <div class="kpi-label">Total Dispatched Weight</div>
          <div class="kpi-val" style="color: #047857;">${totalWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 7pt; font-weight: normal;">KG</span></div>
        </td>
      </tr>
    </table>

    <!-- 2. LOOMS 1 TO 91 STATUS & ACTIVE RECIPES -->
    <div class="section-title">CIRCULAR LOOM MACHINES OPERATIONAL STATUS & ALLOCATED RECIPES</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align: center; width: 45px;">Loom #</th>
          <th style="text-align: center; width: 65px;">Status</th>
          <th style="text-align: left;">Active Running Recipe Quality</th>
          <th style="text-align: right; width: 70px;">Crates</th>
          <th style="text-align: right; width: 70px;">Bobbins</th>
          <th style="text-align: right; width: 85px;">Weight</th>
          <th style="text-align: center; width: 75px;">Latest Date</th>
          <th style="text-align: center; width: 75px;">Latest Shift</th>
          <th style="text-align: left; width: 110px;">Issuer / Receiver</th>
        </tr>
      </thead>
      <tbody>
        ${loomRowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 7pt; font-weight: bold;">
            Total Summary (${looms.length} Looms):
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #6b21a8; background: #faf5ff;">
            ${totalCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #1e40af; background: #eff6ff;">
            ${totalBobbins.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #047857; background: #f0fdf4;">
            ${totalWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
          </td>
          <td colspan="3"></td>
        </tr>
      </tfoot>
    </table>

    <!-- 3-COLUMN OFFICIAL SIGN-OFF STRIP -->
    <div class="avoid-break">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">Prepared By (Loom Shed In-Charge)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Verified By (Tape Plant Supervisor)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Approved By (Plant Manager)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
        </tr>
      </table>

      <!-- FOOTER NOTE -->
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

export function printLoomSummary(options: PrintLoomSummaryOptions): void {
  const html = generateLoomSummaryHtml(options);
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
