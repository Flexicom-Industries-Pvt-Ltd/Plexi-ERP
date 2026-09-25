/**
 * Minimalist Enterprise ERP Tape Plant Planning Sheet Generator & Print Engine
 * Produces crisp, professional, high-contrast A4 landscape printable documents
 * with exact tabular fitting and 100% browser print reliability.
 */

import { RecipePlanItem } from "@/components/tape-plant/TapePlantPlanningSection";

export interface TapePlanningPrintData {
  date: string;
  shiftName: string;
  status: string;
  plans: RecipePlanItem[];
}

function formatNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "—";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString();
}

export function generatePlanningSheetHtml(data: TapePlanningPrintData): string {
  const { date, shiftName, status, plans } = data;

  const totalShiftPlannedKg = plans
    .filter((p) => !p.isDayNight)
    .reduce((acc, p) => acc + (Number(p.plannedQtyKg) || 0), 0);

  const totalDayNightPlannedKg = plans
    .filter((p) => p.isDayNight)
    .reduce((acc, p) => acc + (Number(p.plannedQtyKg) || 0), 0);

  // Material aggregates across all recipe runs
  const materialTotals: Record<string, { qty: number; count: number }> = {};
  plans.forEach((p) => {
    (p.materials || []).forEach((m) => {
      const name = m.material.trim().toUpperCase() || "UNKNOWN";
      const q = Number(m.quantity) || 0;
      if (!materialTotals[name]) {
        materialTotals[name] = { qty: 0, count: 0 };
      }
      materialTotals[name].qty += q;
      materialTotals[name].count += 1;
    });
  });

  const totalAllMaterialsKg = Object.values(materialTotals).reduce(
    (a, b) => a + b.qty,
    0
  );

  // Table 1: Recipe Machine Parameters Rows
  const recipeParamRows = plans.length > 0
    ? plans.map((p, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 700; width: 26px;">${idx + 1}</td>
        <td style="font-weight: 700; font-family: monospace; font-size: 8.5pt;">
          ${p.recipeQuality || "—"}
          ${p.isDayNight ? `<span style="border: 1px solid #d97706; background: #fef3c7; color: #92400e; font-size: 6.5pt; padding: 1px 4px; border-radius: 3px; margin-left: 4px; display: inline-block;">Day+Night (24h)</span>` : ""}
        </td>
        <td style="text-align: center; font-weight: 600;">${p.tapeType || "LPP"}</td>
        <td style="text-align: right; font-family: monospace;">${p.denier !== "" && p.denier !== undefined ? p.denier : "—"}</td>
        <td style="text-align: right; font-family: monospace;">${p.tapeWidth !== "" && p.tapeWidth !== undefined ? p.tapeWidth : "—"}</td>
        <td style="text-align: right; font-family: monospace;">${p.strength !== "" && p.strength !== undefined ? p.strength : "—"}</td>
        <td style="text-align: right; font-family: monospace;">${p.eloPercent !== "" && p.eloPercent !== undefined ? `${p.eloPercent}%` : "—"}</td>
        <td>${p.colour || "—"}</td>
        <td>${p.bobbinMarking || "—"}</td>
        <td>${p.spacerSize || "—"}</td>
        <td style="text-align: right; font-family: monospace;">${p.ashPercent !== "" && p.ashPercent !== undefined ? `${p.ashPercent}%` : "—"}</td>
        <td style="font-family: monospace;">${p.omega || "—"}</td>
        <td style="text-align: right; font-weight: 800; font-family: monospace; background-color: #f8fafc;">
          ${Number(p.plannedQtyKg) ? Number(p.plannedQtyKg).toLocaleString() : "0"}
        </td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="13" style="text-align: center; color: #64748b; font-style: italic; padding: 10px;">
          No recipe plan runs defined for this shift.
        </td>
      </tr>
    `;

  // Standard material columns for formulation matrix
  const KNOWN_MATS = ["PP", "CC", "MB", "RP1", "RP2", "HD RP", "TPT"];

  // Table 2: Material Formulation Matrix Rows with separate KG and % columns
  let totalPPSum = 0;
  let totalCCSum = 0;
  let totalMBSum = 0;
  let totalRP1Sum = 0;
  let totalRP2Sum = 0;
  let totalHDRPSum = 0;
  let totalTPTSum = 0;
  let totalOtherSum = 0;
  let totalBatchSum = 0;

  const formulationRows = plans.length > 0
    ? plans.map((p, idx) => {
        const getMat = (name: string): { qty: number; pct: number } => {
          const match = (p.materials || []).find(
            (m) => m.material.trim().toUpperCase() === name.toUpperCase()
          );
          return {
            qty: match && Number(match.quantity) ? Number(match.quantity) : 0,
            pct: match && Number(match.percentage) ? Number(match.percentage) : 0,
          };
        };

        const pp = getMat("PP");
        const cc = getMat("CC");
        const mb = getMat("MB");
        const rp1 = getMat("RP1");
        const rp2 = getMat("RP2");
        const hdrp = getMat("HD RP");
        const tpt = getMat("TPT");

        let otherQty = 0;
        let totalBlendPct = 0;
        let runBatchQty = 0;

        (p.materials || []).forEach((m) => {
          const q = Number(m.quantity) || 0;
          const pct = Number(m.percentage) || 0;
          runBatchQty += q;
          totalBlendPct += pct;
          if (!KNOWN_MATS.includes(m.material.trim().toUpperCase())) {
            otherQty += q;
          }
        });

        totalPPSum += pp.qty;
        totalCCSum += cc.qty;
        totalMBSum += mb.qty;
        totalRP1Sum += rp1.qty;
        totalRP2Sum += rp2.qty;
        totalHDRPSum += hdrp.qty;
        totalTPTSum += tpt.qty;
        totalOtherSum += otherQty;
        totalBatchSum += (runBatchQty || Number(p.plannedQtyKg) || 0);

        const formatQty = (item: { qty: number; pct: number }) => {
          return item.qty ? item.qty.toLocaleString() : "—";
        };
        const formatPct = (item: { qty: number; pct: number }) => {
          return item.pct ? `${item.pct}%` : "—";
        };

        return `
          <tr>
            <td style="text-align: center; font-weight: 700; width: 24px;">${idx + 1}</td>
            <td style="font-weight: 700; font-family: monospace; font-size: 8pt; white-space: nowrap;">${p.recipeQuality || "—"}</td>
            <!-- PP -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatQty(pp)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 7pt; background-color: #f8fafc;">${formatPct(pp)}</td>
            <!-- CC -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatQty(cc)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 7pt; background-color: #f8fafc;">${formatPct(cc)}</td>
            <!-- MB -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatQty(mb)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 7pt; background-color: #f8fafc;">${formatPct(mb)}</td>
            <!-- RP1 -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatQty(rp1)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 7pt; background-color: #f8fafc;">${formatPct(rp1)}</td>
            <!-- RP2 -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatQty(rp2)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 7pt; background-color: #f8fafc;">${formatPct(rp2)}</td>
            <!-- HD RP -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatQty(hdrp)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 7pt; background-color: #f8fafc;">${formatPct(hdrp)}</td>
            <!-- TPT -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatQty(tpt)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 7pt; background-color: #f8fafc;">${formatPct(tpt)}</td>
            <!-- Other -->
            <td style="text-align: right; font-family: monospace;">${otherQty ? otherQty.toLocaleString() : "—"}</td>
            <!-- Total Batch -->
            <td style="text-align: right; font-weight: 800; font-family: monospace; background-color: #f1f5f9;">
              ${(runBatchQty || Number(p.plannedQtyKg) || 0).toLocaleString()}
            </td>
            <!-- Blend % -->
            <td style="text-align: right; font-family: monospace; font-weight: 700; width: 42px;">
              ${totalBlendPct > 0 ? `${totalBlendPct.toFixed(1)}%` : "100%"}
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="19" style="text-align: center; color: #64748b; font-style: italic; padding: 10px;">
          No formulation blend defined.
        </td>
      </tr>
    `;

  // Summary Table: Consolidated columns for Raw Material Summary
  const summaryMats = [
    { name: "PP", qty: totalPPSum },
    { name: "CC", qty: totalCCSum },
    { name: "MB", qty: totalMBSum },
    { name: "RP1", qty: totalRP1Sum },
    { name: "RP2", qty: totalRP2Sum },
    { name: "HD RP", qty: totalHDRPSum },
    { name: "TPT", qty: totalTPTSum },
  ];
  if (totalOtherSum > 0) {
    summaryMats.push({ name: "OTHER", qty: totalOtherSum });
  }

  const summaryHeadersHtml = summaryMats.map((m) => `<th style="text-align: center; border: 1px solid #94a3b8; padding: 4px 6px; font-weight: 700; font-size: 7.5pt;">${m.name}</th>`).join("");
  const summaryQtyRowHtml = summaryMats.map((m) => `<td style="text-align: center; font-family: monospace; font-weight: 800; padding: 4px 6px; border: 1px solid #cbd5e1; font-size: 8.5pt;">${m.qty ? `${m.qty.toLocaleString()} KG` : "—"}</td>`).join("");
  const summaryPctRowHtml = summaryMats.map((m) => {
    const pct = totalBatchSum > 0 ? ((m.qty / totalBatchSum) * 100).toFixed(1) : "0.0";
    return `<td style="text-align: center; font-family: monospace; color: #0f766e; font-weight: 700; padding: 3px 6px; border: 1px solid #cbd5e1; font-size: 7.5pt; background-color: #f8fafc;">${m.qty ? `${pct}%` : "—"}</td>`;
  }).join("");

  const docDate = date || new Date().toISOString().split("T")[0];
  const docRef = `TP-PLN-${docDate.replace(/-/g, "")}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
  const printTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tape Plant Production Plan - ${docRef}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 8mm;
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
    }
    .sheet-container {
      width: 100%;
      max-width: 285mm;
      margin: 0 auto;
    }

    /* Minimalist Centered Header */
    .header-container {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 6px;
    }
    .company-title {
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #000000;
      text-transform: uppercase;
      text-align: center;
    }
    .company-sub {
      font-size: 7.5pt;
      color: #475569;
      margin-top: 1px;
      text-align: center;
    }
    .doc-main-heading {
      display: inline-block;
      border: 1.5px solid #0f172a;
      background: #f8fafc;
      padding: 3px 14px;
      font-size: 9pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
      margin-bottom: 3px;
      text-align: center;
    }
    .doc-meta-strip {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 12px;
      font-size: 7.5pt;
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
      padding: 3px 6px;
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
      font-size: 9pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
    }

    /* Centered Section Titles */
    .section-title {
      font-size: 8pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      text-align: center;
      background-color: #e2e8f0;
      border: 1px solid #94a3b8;
      border-bottom: none;
      padding: 3px 6px;
      margin-top: 6px;
      color: #0f172a;
    }

    /* Data Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 7.5pt;
    }
    .data-table th {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 2.5px 3.5px;
      font-weight: 700;
      font-size: 7pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 2.5px 3.5px;
      font-size: 7.5pt;
      color: #0f172a;
    }
    .data-table tfoot td {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      font-weight: 700;
      padding: 3px 4px;
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
      margin-top: 3px;
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
  <div class="sheet-container">
    <!-- CENTERED MAIN HEADER -->
    <div class="header-container">
      <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
      <div class="company-sub">Tape Plant Extrusion & Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)</div>
      <div class="doc-main-heading">TAPE PLANT PRODUCTION PLAN</div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>•</span>
        <span>Date: <strong>${date}</strong></span>
        <span>•</span>
        <span>Shift: <strong>${shiftName}</strong></span>
        <span>•</span>
        <span>Status: <strong>${status}</strong></span>
        <span>•</span>
        <span>Printed: <strong>${printTimestamp}</strong></span>
      </div>
    </div>

    <!-- KEY SHIFT METRICS -->
    <table class="kpi-table">
      <tr>
        <td style="width: 25%;">
          <div class="kpi-label">Shift Planned Output</div>
          <div class="kpi-val">${totalShiftPlannedKg.toLocaleString()} <span style="font-size: 7pt; font-weight: normal;">KG</span></div>
          ${totalDayNightPlannedKg > 0 ? `<div style="font-size: 6.5pt; color: #b45309; font-weight: 700; margin-top: 2px;">+ ${totalDayNightPlannedKg.toLocaleString()} KG (24h Batch)</div>` : ""}
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Total Qualities / Runs</div>
          <div class="kpi-val">${plans.length} <span style="font-size: 7pt; font-weight: normal;">Qualities</span></div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Total Raw Material Demand</div>
          <div class="kpi-val">${totalAllMaterialsKg.toLocaleString()} <span style="font-size: 7pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Approval State</div>
          <div class="kpi-val" style="font-size: 8pt;">${status}</div>
        </td>
      </tr>
    </table>

    <!-- 1. QUALITY NAME AND SPECIFICATION -->
    <div class="section-title">1. QUALITY NAME AND SPECIFICATION</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align: center; width: 26px;">#</th>
          <th style="text-align: left;">Quality Name / Recipe Code</th>
          <th style="text-align: center; width: 38px;">Type</th>
          <th style="text-align: right; width: 44px;">Denier</th>
          <th style="text-align: right; width: 48px;">Width (mm)</th>
          <th style="text-align: right; width: 46px;">Strength</th>
          <th style="text-align: right; width: 42px;">ELO %</th>
          <th style="text-align: left; width: 80px;">Colour</th>
          <th style="text-align: left; width: 80px;">Bobbin Mark</th>
          <th style="text-align: left; width: 65px;">Spacer</th>
          <th style="text-align: right; width: 40px;">Ash %</th>
          <th style="text-align: left; width: 55px;">Omega</th>
          <th style="text-align: right; width: 75px;">Planned (KG)</th>
        </tr>
      </thead>
      <tbody>
        ${recipeParamRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="12" style="text-align: right; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.5px;">
            Total Shift Planned Output${totalDayNightPlannedKg > 0 ? " (Single-Shift Runs)" : ""}:
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; background-color: #f1f5f9;">
            ${totalShiftPlannedKg.toLocaleString()} KG
          </td>
        </tr>
        ${totalDayNightPlannedKg > 0 ? `
        <tr>
          <td colspan="12" style="text-align: right; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.5px; color: #92400e; background-color: #fef3c7; font-weight: 700;">
            + Day+Night 24-Hour Continuous Batch (Running across 2 shifts):
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; background-color: #fde68a; color: #78350f;">
            ${totalDayNightPlannedKg.toLocaleString()} KG
          </td>
        </tr>
        ` : ""}
      </tfoot>
    </table>

    <!-- 2. RAW MATERIAL RECIPE AND QUANTITY -->
    <div class="section-title avoid-break">2. RAW MATERIAL RECIPE AND QUANTITY</div>
    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th rowspan="2" style="text-align: center; width: 24px;">#</th>
          <th rowspan="2" style="text-align: left; min-width: 130px;">Quality Name</th>
          <th colspan="2" style="text-align: center;">PP</th>
          <th colspan="2" style="text-align: center;">CC</th>
          <th colspan="2" style="text-align: center;">MB</th>
          <th colspan="2" style="text-align: center;">RP1</th>
          <th colspan="2" style="text-align: center;">RP2</th>
          <th colspan="2" style="text-align: center;">HD RP</th>
          <th colspan="2" style="text-align: center;">TPT</th>
          <th rowspan="2" style="text-align: right; width: 50px;">Other (KG)</th>
          <th rowspan="2" style="text-align: right; width: 75px;">Batch Total</th>
          <th rowspan="2" style="text-align: right; width: 42px;">Total %</th>
        </tr>
        <tr>
          <th style="text-align: right; width: 42px; font-size: 6.5pt;">KG</th>
          <th style="text-align: right; width: 28px; font-size: 6.5pt; color: #475569;">%</th>
          <th style="text-align: right; width: 40px; font-size: 6.5pt;">KG</th>
          <th style="text-align: right; width: 28px; font-size: 6.5pt; color: #475569;">%</th>
          <th style="text-align: right; width: 38px; font-size: 6.5pt;">KG</th>
          <th style="text-align: right; width: 28px; font-size: 6.5pt; color: #475569;">%</th>
          <th style="text-align: right; width: 40px; font-size: 6.5pt;">KG</th>
          <th style="text-align: right; width: 28px; font-size: 6.5pt; color: #475569;">%</th>
          <th style="text-align: right; width: 40px; font-size: 6.5pt;">KG</th>
          <th style="text-align: right; width: 28px; font-size: 6.5pt; color: #475569;">%</th>
          <th style="text-align: right; width: 42px; font-size: 6.5pt;">KG</th>
          <th style="text-align: right; width: 28px; font-size: 6.5pt; color: #475569;">%</th>
          <th style="text-align: right; width: 40px; font-size: 6.5pt;">KG</th>
          <th style="text-align: right; width: 28px; font-size: 6.5pt; color: #475569;">%</th>
        </tr>
      </thead>
      <tbody>
        ${formulationRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align: right; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.5px; font-weight: 800;">
            Total Formulations:
          </td>
          <!-- PP -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${totalPPSum ? totalPPSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totalBatchSum > 0 && totalPPSum > 0 ? `${((totalPPSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- CC -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${totalCCSum ? totalCCSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totalBatchSum > 0 && totalCCSum > 0 ? `${((totalCCSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- MB -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${totalMBSum ? totalMBSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totalBatchSum > 0 && totalMBSum > 0 ? `${((totalMBSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- RP1 -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${totalRP1Sum ? totalRP1Sum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totalBatchSum > 0 && totalRP1Sum > 0 ? `${((totalRP1Sum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- RP2 -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${totalRP2Sum ? totalRP2Sum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totalBatchSum > 0 && totalRP2Sum > 0 ? `${((totalRP2Sum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- HD RP -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${totalHDRPSum ? totalHDRPSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totalBatchSum > 0 && totalHDRPSum > 0 ? `${((totalHDRPSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- TPT -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${totalTPTSum ? totalTPTSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totalBatchSum > 0 && totalTPTSum > 0 ? `${((totalTPTSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- Other -->
          <td style="text-align: right; font-family: monospace;">${totalOtherSum ? totalOtherSum.toLocaleString() : "—"}</td>
          <!-- Batch Total -->
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; background-color: #f1f5f9;">
            ${totalBatchSum.toLocaleString()} KG
          </td>
          <!-- 100% -->
          <td style="text-align: right; font-family: monospace; font-size: 7pt; font-weight: 700;">100%</td>
        </tr>
      </tfoot>
    </table>

    <!-- 3. RAW MATERIAL SUMMARY -->
    <div class="avoid-break">
      <div class="section-title">3. RAW MATERIAL SUMMARY</div>
      <table class="data-table" style="margin-bottom: 6px;">
        <thead>
          <tr>
            <th style="text-align: left; width: 140px;">Raw Material / Metric</th>
            ${summaryHeadersHtml}
            <th style="text-align: center; border: 1px solid #94a3b8; padding: 4px 6px; font-weight: 800; background-color: #e2e8f0;">TOTAL BATCH</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 700; text-transform: uppercase; font-size: 7pt; background-color: #f8fafc;">Total Planned Qty (KG)</td>
            ${summaryQtyRowHtml}
            <td style="text-align: center; font-family: monospace; font-weight: 900; font-size: 9pt; background-color: #f1f5f9;">${totalBatchSum.toLocaleString()} KG</td>
          </tr>
          <tr>
            <td style="font-weight: 700; text-transform: uppercase; font-size: 7pt; background-color: #f8fafc;">Overall Composition (%)</td>
            ${summaryPctRowHtml}
            <td style="text-align: center; font-family: monospace; font-weight: 800; font-size: 8pt; background-color: #f1f5f9; color: #0f766e;">100.0%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SIGN-OFF AUTHORIZATION -->
    <div class="avoid-break">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">Prepared By (Shift Operator / In-Charge)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
          <td>
            <div class="sign-title">Verified By (Quality Control / Lab)</div>
            <div class="sign-line">Signature & Stamp</div>
          </td>
          <td>
            <div class="sign-title">Approved By (Plant Supervisor / Manager)</div>
            <div class="sign-line">Signature & Date</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        <span>Flexicom ERP • Tape Plant Extrusion Planning System • Document: ${docRef}</span>
        <span>Printed: ${printTimestamp} • Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Directly prints the tape plant planning sheet in a clean, isolated iframe/window.
 * Completely immune to modal overflow or React styles.
 */
export function printTapePlantPlanningSheet(data: TapePlanningPrintData): void {
  const html = generatePlanningSheetHtml(data);

  // Use a hidden iframe for seamless instant print
  let iframe = document.getElementById("tape-plant-planning-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "tape-plant-planning-print-iframe";
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
  const win = window.open("", "_blank", "width=1000,height=750");
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
