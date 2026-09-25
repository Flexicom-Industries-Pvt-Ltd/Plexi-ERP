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

function normalizeMaterialKey(mat: string): string {
  const clean = (mat || "").trim().toUpperCase().replace(/[\s\-_]/g, "");
  if (clean === "PP") return "PP";
  if (clean === "CC") return "CC";
  if (clean === "MB") return "MB";
  if (clean === "RP1") return "RP1";
  if (clean === "RP2") return "RP2";
  if (clean === "HDRP") return "HD RP";
  if (clean === "TPT") return "TPT";
  return (mat || "").trim().toUpperCase();
}

function formatKg(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "" || val === 0) return "—";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return Number.isInteger(num)
    ? num.toLocaleString()
    : num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}
function formatPct(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "" || val === 0) return "—";
  const num = Number(val);
  if (isNaN(num)) return `${val}%`;
  return Number.isInteger(num) ? `${num}%` : `${num.toFixed(1)}%`;
}

function getShiftLabel(p: RecipePlanItem, defaultShiftName?: string): string {
  if (p.isDayNight) return "DAY+NIGHT";
  if (p.shiftName) {
    const s = p.shiftName.toUpperCase();
    if (s.includes("NIGHT")) return "NIGHT";
    if (s.includes("DAY")) return "DAY";
    return p.shiftName.replace(/Shift/i, "").trim().toUpperCase();
  }
  if (p.shiftId) {
    if (p.shiftId.toLowerCase().includes("night")) return "NIGHT";
    if (p.shiftId.toLowerCase().includes("day")) return "DAY";
    return p.shiftId.toUpperCase();
  }
  if (defaultShiftName && defaultShiftName.toUpperCase() !== "ALL" && !defaultShiftName.toUpperCase().includes("ALL")) {
    if (defaultShiftName.toUpperCase().includes("NIGHT")) return "NIGHT";
    if (defaultShiftName.toUpperCase().includes("DAY")) return "DAY";
    return defaultShiftName.replace(/Shift/i, "").trim().toUpperCase();
  }
  return "DAY";
}

export function generatePlanningSheetHtml(data: TapePlanningPrintData): string {
  const { date, shiftName, status, plans } = data;

  const totalShiftPlannedKg = plans
    .filter((p) => !p.isDayNight)
    .reduce((acc, p) => acc + (Number(p.plannedQtyKg) || 0), 0);

  const totalDayNightPlannedKg = plans
    .filter((p) => p.isDayNight)
    .reduce((acc, p) => acc + (Number(p.plannedQtyKg) || 0), 0);

  // Pre-calculate aggregate raw material sums across all recipe runs
  let totalPPSum = 0;
  let totalCCSum = 0;
  let totalMBSum = 0;
  let totalRP1Sum = 0;
  let totalRP2Sum = 0;
  let totalHDRPSum = 0;
  let totalTPTSum = 0;
  let totalOtherSum = 0;
  let totalBatchSum = 0;

  plans.forEach((p) => {
    let runMatQty = 0;
    (p.materials || []).forEach((m) => {
      const key = normalizeMaterialKey(m.material);
      const q = Number(m.quantity) || 0;
      runMatQty += q;
      if (key === "PP") totalPPSum += q;
      else if (key === "CC") totalCCSum += q;
      else if (key === "MB") totalMBSum += q;
      else if (key === "RP1") totalRP1Sum += q;
      else if (key === "RP2") totalRP2Sum += q;
      else if (key === "HD RP") totalHDRPSum += q;
      else if (key === "TPT") totalTPTSum += q;
      else totalOtherSum += q;
    });
    totalBatchSum += (runMatQty || Number(p.plannedQtyKg) || 0);
  });

  const totalAllMaterialsKg = totalBatchSum;

  // Table 1: Recipe Machine Parameters Rows
  const recipeParamRows = plans.length > 0
    ? plans.map((p, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 700; width: 22px;">${idx + 1}</td>
        <td style="font-weight: 700; font-family: monospace; font-size: 7.5pt;">
          ${p.recipeQuality || "—"}
          ${p.isDayNight ? `<span style="border: 1px solid #d97706; background: #fef3c7; color: #92400e; font-size: 6pt; padding: 1px 3px; border-radius: 2px; margin-left: 3px; display: inline-block;">Day+Night (24h)</span>` : ""}
        </td>
        <td style="text-align: center; font-weight: 700; font-family: monospace; font-size: 6.5pt; text-transform: uppercase;">
          ${getShiftLabel(p, shiftName)}
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
          ${formatKg(p.plannedQtyKg)}
        </td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="14" style="text-align: center; color: #64748b; font-style: italic; padding: 8px;">
          No recipe plan runs defined for this shift.
        </td>
      </tr>
    `;

  // Table 2: Material Formulation Matrix Rows with separate KG and % columns
  const formulationRows = plans.length > 0
    ? plans.map((p, idx) => {
        const getMat = (name: string): { qty: number; pct: number } => {
          const match = (p.materials || []).find(
            (m) => normalizeMaterialKey(m.material) === name
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
          const key = normalizeMaterialKey(m.material);
          if (!["PP", "CC", "MB", "RP1", "RP2", "HD RP", "TPT"].includes(key)) {
            otherQty += q;
          }
        });

        const rowBatchTotal = runBatchQty || Number(p.plannedQtyKg) || 0;

        return `
          <tr>
            <td style="text-align: center; font-weight: 700; width: 20px;">${idx + 1}</td>
            <td style="font-weight: 700; font-family: monospace; font-size: 7.5pt; white-space: nowrap;">${p.recipeQuality || "—"}</td>
            <td style="text-align: center; font-weight: 700; font-family: monospace; font-size: 6.5pt; text-transform: uppercase;">${getShiftLabel(p, shiftName)}</td>
            <!-- PP -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatKg(pp.qty)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 6.5pt; background-color: #f8fafc;">${formatPct(pp.pct)}</td>
            <!-- CC -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatKg(cc.qty)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 6.5pt; background-color: #f8fafc;">${formatPct(cc.pct)}</td>
            <!-- MB -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatKg(mb.qty)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 6.5pt; background-color: #f8fafc;">${formatPct(mb.pct)}</td>
            <!-- RP1 -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatKg(rp1.qty)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 6.5pt; background-color: #f8fafc;">${formatPct(rp1.pct)}</td>
            <!-- RP2 -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatKg(rp2.qty)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 6.5pt; background-color: #f8fafc;">${formatPct(rp2.pct)}</td>
            <!-- HD RP -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatKg(hdrp.qty)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 6.5pt; background-color: #f8fafc;">${formatPct(hdrp.pct)}</td>
            <!-- TPT -->
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatKg(tpt.qty)}</td>
            <td style="text-align: right; font-family: monospace; color: #475569; font-size: 6.5pt; background-color: #f8fafc;">${formatPct(tpt.pct)}</td>
            <!-- Other -->
            <td style="text-align: right; font-family: monospace;">${formatKg(otherQty)}</td>
            <!-- Total Batch -->
            <td style="text-align: right; font-weight: 800; font-family: monospace; background-color: #f1f5f9;">
              ${formatKg(rowBatchTotal)}
            </td>
            <!-- Blend % -->
            <td style="text-align: right; font-family: monospace; font-weight: 700; width: 36px;">
              ${totalBlendPct > 0 ? `${totalBlendPct.toFixed(1)}%` : "100%"}
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="20" style="text-align: center; color: #64748b; font-style: italic; padding: 8px;">
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

  const summaryHeadersHtml = summaryMats.map((m) => `<th style="text-align: center; border: 1px solid #94a3b8; padding: 3px 5px; font-weight: 700; font-size: 7pt;">${m.name}</th>`).join("");
  const summaryQtyRowHtml = summaryMats.map((m) => `<td style="text-align: center; font-family: monospace; font-weight: 800; padding: 3px 5px; border: 1px solid #cbd5e1; font-size: 8pt;">${m.qty ? `${formatKg(m.qty)} KG` : "—"}</td>`).join("");
  const summaryPctRowHtml = summaryMats.map((m) => {
    const pct = totalBatchSum > 0 ? ((m.qty / totalBatchSum) * 100).toFixed(1) : "0.0";
    return `<td style="text-align: center; font-family: monospace; color: #0f766e; font-weight: 700; padding: 2.5px 5px; border: 1px solid #cbd5e1; font-size: 7pt; background-color: #f8fafc;">${m.qty ? `${pct}%` : "—"}</td>`;
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
      box-sizing: border-box;
    }

    /* Minimalist Centered Header */
    .header-container {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .company-title {
      font-size: 13pt;
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
      padding: 2px 12px;
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
      margin-bottom: 4px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 2.5px 5px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      text-align: center;
    }
    .kpi-label {
      font-size: 6pt;
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

    /* Centered Section Titles */
    .section-title {
      font-size: 7.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      text-align: center;
      background-color: #e2e8f0;
      border: 1px solid #94a3b8;
      border-bottom: none;
      padding: 2.5px 5px;
      margin-top: 4px;
      color: #0f172a;
    }

    /* Data Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
      font-size: 7pt;
      table-layout: auto;
    }
    .data-table th {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 2px 3px;
      font-weight: 700;
      font-size: 6.5pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 2px 3px;
      font-size: 7pt;
      color: #0f172a;
    }
    .data-table tfoot td {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      font-weight: 700;
      padding: 2.5px 3.5px;
    }

    /* Sign-off section */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
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
      margin-top: 2px;
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
    <!-- MAIN HEADER WITH TOP-LEFT VIVID FLEXICOM LOGO -->
    <div class="header-container">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
        <div style="width: 60px; text-align: left; display: flex; align-items: center;">
          <img src="/logo.png" alt="Flexicom Logo" style="height: 44px; width: auto; object-fit: contain; filter: contrast(1.25) saturate(1.25);" onerror="this.style.display='none'" />
        </div>
        <div style="flex: 1; text-align: center;">
          <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
          <div class="company-sub">Tape Plant Extrusion & Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)</div>
          <div class="doc-main-heading">TAPE PLANT PRODUCTION PLAN</div>
        </div>
        <div style="width: 60px;" aria-hidden="true"></div>
      </div>
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
          <div class="kpi-val">${totalShiftPlannedKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
          ${totalDayNightPlannedKg > 0 ? `<div style="font-size: 6pt; color: #b45309; font-weight: 700; margin-top: 1px;">+ ${totalDayNightPlannedKg.toLocaleString()} KG (24h Batch)</div>` : ""}
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Total Qualities / Runs</div>
          <div class="kpi-val">${plans.length} <span style="font-size: 6.5pt; font-weight: normal;">Qualities</span></div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Total Raw Material Demand</div>
          <div class="kpi-val">${totalAllMaterialsKg.toLocaleString()} <span style="font-size: 6.5pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Approval State</div>
          <div class="kpi-val" style="font-size: 7.5pt;">${status}</div>
        </td>
      </tr>
    </table>

    <!-- 1. QUALITY NAME AND SPECIFICATION -->
    <div class="section-title">1. QUALITY NAME AND SPECIFICATION</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align: center; width: 22px;">#</th>
          <th style="text-align: left;">Quality Name / Recipe Code</th>
          <th style="text-align: center; width: 36px;">Shift</th>
          <th style="text-align: center; width: 32px;">Type</th>
          <th style="text-align: right; width: 38px;">Denier</th>
          <th style="text-align: right; width: 42px;">Width (mm)</th>
          <th style="text-align: right; width: 40px;">Strength</th>
          <th style="text-align: right; width: 36px;">ELO %</th>
          <th style="text-align: left; width: 65px;">Colour</th>
          <th style="text-align: left; width: 65px;">Bobbin Mark</th>
          <th style="text-align: left; width: 55px;">Spacer</th>
          <th style="text-align: right; width: 36px;">Ash %</th>
          <th style="text-align: left; width: 45px;">Omega</th>
          <th style="text-align: right; width: 65px;">Planned (KG)</th>
        </tr>
      </thead>
      <tbody>
        ${recipeParamRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="13" style="text-align: right; text-transform: uppercase; font-size: 6.5pt; letter-spacing: 0.5px;">
            Total Shift Planned Output${totalDayNightPlannedKg > 0 ? " (Single-Shift Runs)" : ""}:
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 800; background-color: #f1f5f9;">
            ${totalShiftPlannedKg.toLocaleString()} KG
          </td>
        </tr>
        ${totalDayNightPlannedKg > 0 ? `
        <tr>
          <td colspan="13" style="text-align: right; text-transform: uppercase; font-size: 6.5pt; letter-spacing: 0.5px; color: #92400e; background-color: #fef3c7; font-weight: 700;">
            + Day+Night 24-Hour Continuous Batch (Running across 2 shifts):
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 800; background-color: #fde68a; color: #78350f;">
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
          <th rowspan="2" style="text-align: center; width: 20px;">#</th>
          <th rowspan="2" style="text-align: left; min-width: 100px;">Quality Name</th>
          <th rowspan="2" style="text-align: center; width: 36px;">Shift</th>
          <th colspan="2" style="text-align: center;">PP</th>
          <th colspan="2" style="text-align: center;">CC</th>
          <th colspan="2" style="text-align: center;">MB</th>
          <th colspan="2" style="text-align: center;">RP1</th>
          <th colspan="2" style="text-align: center;">RP2</th>
          <th colspan="2" style="text-align: center;">HD RP</th>
          <th colspan="2" style="text-align: center;">TPT</th>
          <th rowspan="2" style="text-align: right; width: 40px;">Other (KG)</th>
          <th rowspan="2" style="text-align: right; width: 62px;">Batch Total</th>
          <th rowspan="2" style="text-align: right; width: 36px;">Total %</th>
        </tr>
        <tr>
          <th style="text-align: right; width: 34px; font-size: 6pt;">KG</th>
          <th style="text-align: right; width: 24px; font-size: 6pt; color: #475569;">%</th>
          <th style="text-align: right; width: 34px; font-size: 6pt;">KG</th>
          <th style="text-align: right; width: 24px; font-size: 6pt; color: #475569;">%</th>
          <th style="text-align: right; width: 34px; font-size: 6pt;">KG</th>
          <th style="text-align: right; width: 24px; font-size: 6pt; color: #475569;">%</th>
          <th style="text-align: right; width: 34px; font-size: 6pt;">KG</th>
          <th style="text-align: right; width: 24px; font-size: 6pt; color: #475569;">%</th>
          <th style="text-align: right; width: 34px; font-size: 6pt;">KG</th>
          <th style="text-align: right; width: 24px; font-size: 6pt; color: #475569;">%</th>
          <th style="text-align: right; width: 34px; font-size: 6pt;">KG</th>
          <th style="text-align: right; width: 24px; font-size: 6pt; color: #475569;">%</th>
          <th style="text-align: right; width: 34px; font-size: 6pt;">KG</th>
          <th style="text-align: right; width: 24px; font-size: 6pt; color: #475569;">%</th>
        </tr>
      </thead>
      <tbody>
        ${formulationRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 6.5pt; letter-spacing: 0.5px; font-weight: 800;">
            Total Formulations:
          </td>
          <!-- PP -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${formatKg(totalPPSum)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6pt; color: #64748b;">${totalBatchSum > 0 && totalPPSum > 0 ? `${((totalPPSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- CC -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${formatKg(totalCCSum)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6pt; color: #64748b;">${totalBatchSum > 0 && totalCCSum > 0 ? `${((totalCCSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- MB -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${formatKg(totalMBSum)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6pt; color: #64748b;">${totalBatchSum > 0 && totalMBSum > 0 ? `${((totalMBSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- RP1 -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${formatKg(totalRP1Sum)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6pt; color: #64748b;">${totalBatchSum > 0 && totalRP1Sum > 0 ? `${((totalRP1Sum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- RP2 -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${formatKg(totalRP2Sum)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6pt; color: #64748b;">${totalBatchSum > 0 && totalRP2Sum > 0 ? `${((totalRP2Sum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- HD RP -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${formatKg(totalHDRPSum)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6pt; color: #64748b;">${totalBatchSum > 0 && totalHDRPSum > 0 ? `${((totalHDRPSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- TPT -->
          <td style="text-align: right; font-family: monospace; font-weight: 800;">${formatKg(totalTPTSum)}</td>
          <td style="text-align: right; font-family: monospace; font-size: 6pt; color: #64748b;">${totalBatchSum > 0 && totalTPTSum > 0 ? `${((totalTPTSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
          <!-- Other -->
          <td style="text-align: right; font-family: monospace;">${formatKg(totalOtherSum)}</td>
          <!-- Batch Total -->
          <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 800; background-color: #f1f5f9;">
            ${formatKg(totalBatchSum)} KG
          </td>
          <!-- 100% -->
          <td style="text-align: right; font-family: monospace; font-size: 6.5pt; font-weight: 700;">100%</td>
        </tr>
      </tfoot>
    </table>

    <!-- 3. RAW MATERIAL SUMMARY -->
    <div class="avoid-break">
      <div class="section-title">3. RAW MATERIAL SUMMARY</div>
      <table class="data-table" style="margin-bottom: 4px;">
        <thead>
          <tr>
            <th style="text-align: left; width: 130px;">Raw Material / Metric</th>
            ${summaryHeadersHtml}
            <th style="text-align: center; border: 1px solid #94a3b8; padding: 3px 5px; font-weight: 800; background-color: #e2e8f0;">TOTAL BATCH</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 700; text-transform: uppercase; font-size: 6.5pt; background-color: #f8fafc;">Total Planned Qty (KG)</td>
            ${summaryQtyRowHtml}
            <td style="text-align: center; font-family: monospace; font-weight: 900; font-size: 8.5pt; background-color: #f1f5f9;">${totalBatchSum.toLocaleString()} KG</td>
          </tr>
          <tr>
            <td style="font-weight: 700; text-transform: uppercase; font-size: 6.5pt; background-color: #f8fafc;">Overall Composition (%)</td>
            ${summaryPctRowHtml}
            <td style="text-align: center; font-family: monospace; font-weight: 800; font-size: 7.5pt; background-color: #f1f5f9; color: #0f766e;">100.0%</td>
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
