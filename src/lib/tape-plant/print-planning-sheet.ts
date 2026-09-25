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

  const totalPlannedKg = plans.reduce(
    (acc, p) => acc + (Number(p.plannedQtyKg) || 0),
    0
  );

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

  // Table 2: Material Formulation Matrix Rows
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

        const formatMatCell = (item: { qty: number; pct: number }) => {
          if (!item.qty) return "—";
          return `<span style="font-weight: 600;">${item.qty.toLocaleString()}</span> <span style="color: #64748b; font-size: 7pt;">(${item.pct}%)</span>`;
        };

        return `
          <tr>
            <td style="text-align: center; font-weight: 700; width: 26px;">${idx + 1}</td>
            <td style="font-weight: 700; font-family: monospace; font-size: 8.5pt;">${p.recipeQuality || "—"}</td>
            <td style="text-align: right; font-family: monospace;">${formatMatCell(pp)}</td>
            <td style="text-align: right; font-family: monospace;">${formatMatCell(cc)}</td>
            <td style="text-align: right; font-family: monospace;">${formatMatCell(mb)}</td>
            <td style="text-align: right; font-family: monospace;">${formatMatCell(rp1)}</td>
            <td style="text-align: right; font-family: monospace;">${formatMatCell(rp2)}</td>
            <td style="text-align: right; font-family: monospace;">${formatMatCell(hdrp)}</td>
            <td style="text-align: right; font-family: monospace;">${formatMatCell(tpt)}</td>
            <td style="text-align: right; font-family: monospace;">${otherQty ? `${otherQty.toLocaleString()}` : "—"}</td>
            <td style="text-align: right; font-weight: 800; font-family: monospace; background-color: #f8fafc;">
              ${(runBatchQty || Number(p.plannedQtyKg) || 0).toLocaleString()}
            </td>
            <td style="text-align: right; font-family: monospace; font-weight: 600; width: 50px;">
              ${totalBlendPct > 0 ? `${totalBlendPct.toFixed(1)}%` : "100%"}
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="12" style="text-align: center; color: #64748b; font-style: italic; padding: 10px;">
          No formulation blend defined.
        </td>
      </tr>
    `;

  // Aggregate Material Demands Chips/Table
  const aggMaterialCells = Object.entries(materialTotals).map(([mat, data]) => {
    const pct = totalAllMaterialsKg > 0 ? ((data.qty / totalAllMaterialsKg) * 100).toFixed(1) : "0.0";
    return `
      <div class="agg-mat-box">
        <span class="agg-mat-label">${mat}</span>
        <span class="agg-mat-val">${data.qty.toLocaleString()} <span style="font-size: 7pt; font-weight: normal; color: #64748b;">KG</span></span>
        <span class="agg-mat-pct">${pct}%</span>
      </div>
    `;
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
  <title>Tape Plant Planning Sheet - ${docRef}</title>
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
      font-size: 8pt;
      line-height: 1.3;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
    }
    .sheet-container {
      width: 100%;
      max-width: 281mm;
      margin: 0 auto;
    }

    /* Minimalist Header */
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 6px;
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
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
    }
    .doc-meta-item {
      font-size: 7.5pt;
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
      padding: 3px 6px;
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
      font-size: 9pt;
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

    /* Material Aggregate Grid */
    .agg-mat-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 6px;
    }
    .agg-mat-box {
      flex: 1 1 calc(12.5% - 4px);
      min-width: 75px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 2.5px 5px;
      border-radius: 2px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .agg-mat-label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
    .agg-mat-val {
      font-size: 8pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
    }
    .agg-mat-pct {
      font-size: 6.5pt;
      font-weight: 700;
      color: #0f766e;
      text-align: right;
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
  <div class="sheet-container">
    <!-- HEADER -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
          <div class="company-sub">Tape Plant Extrusion & Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)</div>
          <div class="doc-badge-title">Shift Production & Material Formulation Plan</div>
        </td>
        <td class="doc-meta-box">
          <div class="doc-ref-no">${docRef}</div>
          <div class="doc-meta-item">Date: <strong>${date}</strong> &nbsp;|&nbsp; Shift: <strong>${shiftName}</strong></div>
          <div class="doc-meta-item">Status: <strong>${status}</strong> &nbsp;|&nbsp; Generated: <strong>${printTimestamp}</strong></div>
        </td>
      </tr>
    </table>

    <!-- KEY SHIFT METRICS -->
    <table class="kpi-table">
      <tr>
        <td style="width: 25%;">
          <div class="kpi-label">Total Planned Output</div>
          <div class="kpi-val">${totalPlannedKg.toLocaleString()} <span style="font-size: 7pt; font-weight: normal;">KG</span></div>
        </td>
        <td style="width: 25%;">
          <div class="kpi-label">Total Recipe Runs</div>
          <div class="kpi-val">${plans.length} <span style="font-size: 7pt; font-weight: normal;">Runs</span></div>
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

    <!-- 1. RECIPE SPECIFICATIONS & MACHINE PARAMETERS -->
    <div class="section-title">1. Recipe Run Specifications & Machine Parameters</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align: center; width: 26px;">#</th>
          <th>Recipe Quality Code</th>
          <th style="text-align: center; width: 38px;">Type</th>
          <th style="text-align: right; width: 44px;">Denier</th>
          <th style="text-align: right; width: 48px;">Width (mm)</th>
          <th style="text-align: right; width: 46px;">Strength</th>
          <th style="text-align: right; width: 42px;">ELO %</th>
          <th style="width: 80px;">Colour</th>
          <th style="width: 80px;">Bobbin Mark</th>
          <th style="width: 65px;">Spacer</th>
          <th style="text-align: right; width: 40px;">Ash %</th>
          <th style="width: 55px;">Omega</th>
          <th style="text-align: right; width: 70px;">Planned (KG)</th>
        </tr>
      </thead>
      <tbody>
        ${recipeParamRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="12" style="text-align: right; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.5px;">
            Total Shift Planned Output:
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; background-color: #f1f5f9;">
            ${totalPlannedKg.toLocaleString()} KG
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- 2. RAW MATERIAL FORMULATION MATRIX -->
    <div class="section-title avoid-break">2. Raw Material Blend & Composition Breakdown per Run</div>
    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th style="text-align: center; width: 26px;">#</th>
          <th>Recipe Quality</th>
          <th style="text-align: right; width: 70px;">PP (KG / %)</th>
          <th style="text-align: right; width: 70px;">CC (KG / %)</th>
          <th style="text-align: right; width: 68px;">MB (KG / %)</th>
          <th style="text-align: right; width: 70px;">RP1 (KG / %)</th>
          <th style="text-align: right; width: 70px;">RP2 (KG / %)</th>
          <th style="text-align: right; width: 75px;">HD RP (KG / %)</th>
          <th style="text-align: right; width: 70px;">TPT (KG / %)</th>
          <th style="text-align: right; width: 55px;">Other (KG)</th>
          <th style="text-align: right; width: 75px;">Batch Total</th>
          <th style="text-align: right; width: 45px;">Blend %</th>
        </tr>
      </thead>
      <tbody>
        ${formulationRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="text-align: right; text-transform: uppercase; font-size: 7pt; letter-spacing: 0.5px;">
            Total Formulations:
          </td>
          <td style="text-align: right; font-family: monospace;">${totalPPSum ? totalPPSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace;">${totalCCSum ? totalCCSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace;">${totalMBSum ? totalMBSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace;">${totalRP1Sum ? totalRP1Sum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace;">${totalRP2Sum ? totalRP2Sum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace;">${totalHDRPSum ? totalHDRPSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace;">${totalTPTSum ? totalTPTSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace;">${totalOtherSum ? totalOtherSum.toLocaleString() : "—"}</td>
          <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; background-color: #f1f5f9;">
            ${totalBatchSum.toLocaleString()} KG
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 7pt;">100%</td>
        </tr>
      </tfoot>
    </table>

    <!-- 3. SHIFT AGGREGATE MATERIAL DEMANDS -->
    <div class="avoid-break">
      <div class="section-title">3. Shift Aggregate Raw Material Demands & Store Requisitions</div>
      <div class="agg-mat-grid">
        ${aggMaterialCells || `<div style="color: #64748b; font-style: italic; font-size: 7.5pt; padding: 4px;">No material requisitions calculated.</div>`}
      </div>
    </div>

    <!-- 4. SIGN-OFF AUTHORIZATION -->
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
