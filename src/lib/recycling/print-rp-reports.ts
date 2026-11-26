import {
  RpProductionReportData,
  RpWastageCollectionData,
} from "./rp-types";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtNum(val: number | undefined | null): string {
  if (!val || val === 0) return "—";
  return Number.isInteger(val) ? String(val) : Number(val).toFixed(1);
}

export function generateWastageCollectionHtml(data: RpWastageCollectionData): string {
  const shifts = data.shiftNames.length > 0 ? data.shiftNames : ["Day Shift", "Night Shift"];
  const serial = String(data.serialNo || 1).padStart(3, "0");

  const sectionHtml = data.sections
    .map(
      (sec) => `
      <table class="grid-table">
        <thead>
          <tr class="section-banner">
            <th colspan="${2 + shifts.length * 2}">${escapeHtml(sec.title)}</th>
          </tr>
          <tr class="col-header">
            <th style="width: 110px; text-align:left;">COLOUR / TYPE</th>
            ${shifts
              .map(
                (s) =>
                  `<th>${escapeHtml(s.toUpperCase())}</th><th style="width:48px;">MTD</th>`
              )
              .join("")}
            <th style="width: 64px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${sec.rows
            .map(
              (r) => `
            <tr>
              <td class="label-cell">${escapeHtml(r.label)}</td>
              ${shifts
                .map(
                  (s) => `
                <td class="num-cell">${fmtNum(r.shifts[s])}</td>
                <td class="num-cell muted">${fmtNum(r.mtdShifts[s])}</td>
              `
                )
                .join("")}
              <td class="num-cell bold">${fmtNum(r.total)}</td>
            </tr>
          `
            )
            .join("")}
          <tr class="total-row">
            <td>TOTAL</td>
            ${shifts
              .map(
                (s) => `
              <td class="num-cell">${fmtNum(sec.sectionShiftTotals[s])}</td>
              <td class="num-cell muted">${fmtNum(sec.sectionMtdShiftTotals[s])}</td>
            `
              )
              .join("")}
            <td class="num-cell">${fmtNum(sec.sectionTotal)}</td>
          </tr>
        </tbody>
      </table>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Wastage Collection Report - ${escapeHtml(data.date)} (Sl. ${serial})</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, sans-serif; font-size: 7.5pt; color: #0f172a; background: #fff; }
    .header-box { display: flex; justify-content: space-between; align-items: center; border: 1.5px solid #0f172a; padding: 6px 10px; margin-bottom: 6px; }
    .company { font-size: 11pt; font-weight: 800; letter-spacing: 0.3px; }
    .sub-title { font-size: 9pt; font-weight: 700; margin-top: 2px; }
    .meta { text-align: right; font-size: 8pt; line-height: 1.4; }
    .sl { color: #dc2626; font-weight: 800; font-size: 9.5pt; }
    .layout { display: flex; gap: 8px; align-items: flex-start; }
    .left-col { flex: 1; }
    .right-col { width: 195px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    .grid-table th, .grid-table td { border: 1px solid #334155; padding: 2px 4px; }
    .section-banner th { background: #e2e8f0; font-size: 7.5pt; font-weight: 800; text-align: center; letter-spacing: 0.3px; }
    .col-header th { background: #f8fafc; font-size: 6.5pt; font-weight: 700; text-align: center; }
    .label-cell { font-weight: 600; text-align: left; }
    .num-cell { text-align: right; font-variant-numeric: tabular-nums; }
    .num-cell.muted { color: #64748b; }
    .bold { font-weight: 700; }
    .total-row td { background: #f1f5f9; font-weight: 800; }
    .side-card { border: 1px solid #334155; margin-bottom: 6px; }
    .side-title { background: #e2e8f0; font-weight: 800; font-size: 7.5pt; text-align: center; padding: 3px; border-bottom: 1px solid #334155; }
    .side-table { width: 100%; border-collapse: collapse; }
    .side-table td, .side-table th { border-bottom: 1px solid #cbd5e1; padding: 2.5px 5px; font-size: 7pt; }
    .side-table tr:last-child td { border-bottom: none; }
    .footer-sign { display: flex; justify-content: space-between; margin-top: 10px; font-size: 7.5pt; font-weight: 600; padding-top: 16px; border-top: 1px dashed #94a3b8; }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="company">FLEXICOM INDUSTRIES PVT. LIMITED</div>
      <div class="sub-title">WASTAGE COLLECTION REPORT</div>
    </div>
    <div class="meta">
      <div>Date: <strong>${escapeHtml(data.date)}</strong> &nbsp;|&nbsp; Sl. No.: <span class="sl">${serial}</span></div>
      <div>Shifts: <strong>${escapeHtml(shifts.join(" + "))}</strong> &nbsp;|&nbsp; Operator: <strong>${escapeHtml(data.operatorName || "—")}</strong></div>
    </div>
  </div>

  <div class="layout">
    <div class="left-col">
      ${sectionHtml}
    </div>

    <div class="right-col">
      <div class="side-card">
        <div class="side-title">BOBBIN CLEANING</div>
        <table class="side-table">
          <thead><tr><th style="text-align:left">Colour</th><th style="text-align:right">Day</th><th style="text-align:right">MTD</th></tr></thead>
          <tbody>
            ${data.marginBlocks.bobbinCleaning.rows
              .map(
                (r) =>
                  `<tr><td>${escapeHtml(r.label)}</td><td class="num-cell">${fmtNum(r.day)}</td><td class="num-cell muted">${fmtNum(r.mtd)}</td></tr>`
              )
              .join("")}
            <tr class="total-row"><td>Total</td><td class="num-cell">${fmtNum(data.marginBlocks.bobbinCleaning.totalDay)}</td><td class="num-cell">${fmtNum(data.marginBlocks.bobbinCleaning.totalMtd)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="side-card">
        <div class="side-title">NOTE (RECONCILIATION)</div>
        <table class="side-table">
          <tbody>
            <tr><td>B. Cleaning</td><td class="num-cell">${fmtNum(data.marginBlocks.noteBox.bCleaning)}</td></tr>
            <tr><td>RP Lums</td><td class="num-cell">${fmtNum(data.marginBlocks.noteBox.rpLums)}</td></tr>
            <tr><td>Summary</td><td class="num-cell">${fmtNum(data.marginBlocks.noteBox.summary)}</td></tr>
            <tr class="total-row"><td>TOTAL</td><td class="num-cell">${fmtNum(data.marginBlocks.noteBox.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="side-card">
        <div class="side-title">SEGREGATION</div>
        <table class="side-table">
          <tbody>
            ${data.marginBlocks.segregation.rows
              .map(
                (r) =>
                  `<tr><td>${escapeHtml(r.label)}</td><td class="num-cell">${fmtNum(r.qty)}</td></tr>`
              )
              .join("")}
            <tr class="total-row"><td>Total</td><td class="num-cell">${fmtNum(data.marginBlocks.segregation.total)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="side-card">
        <div class="side-title">OLD BOBBIN CUTTING</div>
        <table class="side-table">
          <thead><tr><th style="text-align:left">Colour</th><th style="text-align:right">Day</th><th style="text-align:right">MTD</th></tr></thead>
          <tbody>
            ${data.marginBlocks.oldBobbinCutting.rows
              .map(
                (r) =>
                  `<tr><td>${escapeHtml(r.label)}</td><td class="num-cell">${fmtNum(r.day)}</td><td class="num-cell muted">${fmtNum(r.mtd)}</td></tr>`
              )
              .join("")}
            <tr class="total-row"><td>Total</td><td class="num-cell">${fmtNum(data.marginBlocks.oldBobbinCutting.totalDay)}</td><td class="num-cell">${fmtNum(data.marginBlocks.oldBobbinCutting.totalMtd)}</td></tr>
            <tr><td>Cuttex Small Roll</td><td class="num-cell" colspan="2">${fmtNum(data.marginBlocks.oldBobbinCutting.cuttexSmallRollWastage)}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="side-card">
        <div class="side-title">SUMMARY</div>
        <table class="side-table">
          <tbody>
            ${data.sections
              .map(
                (s) =>
                  `<tr><td>${escapeHtml(s.title.replace(" SECTION", ""))}</td><td class="num-cell bold">${fmtNum(s.sectionTotal)}</td></tr>`
              )
              .join("")}
            <tr class="total-row"><td>TOTAL (KG)</td><td class="num-cell">${fmtNum(data.summaryTotalKg)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="footer-sign">
    <div>Operator: ${escapeHtml(data.operatorName || "________________")}</div>
    <div>Supervisor: ${escapeHtml(data.supervisorName || "________________")}</div>
    <div>Status: ${escapeHtml(data.status)}</div>
  </div>
</body>
</html>`;
}

export function generateRpProductionHtml(data: RpProductionReportData): string {
  const shifts = data.shiftNames.length > 0 ? data.shiftNames : ["Day Shift", "Night Shift"];
  const serial = String(data.serialNo || 1).padStart(3, "0");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>R.P. Plant Production Report - ${escapeHtml(data.date)} (Sr. ${serial})</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, sans-serif; font-size: 7.5pt; color: #0f172a; background: #fff; }
    .header-box { display: flex; justify-content: space-between; align-items: center; border: 1.5px solid #0f172a; padding: 6px 10px; margin-bottom: 6px; }
    .company { font-size: 11pt; font-weight: 800; }
    .sub-title { font-size: 9pt; font-weight: 700; margin-top: 2px; }
    .meta { text-align: right; font-size: 8pt; line-height: 1.4; }
    .sr { color: #dc2626; font-weight: 800; font-size: 9.5pt; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #334155; padding: 3px 4px; }
    thead th { background: #e2e8f0; font-size: 7pt; font-weight: 800; text-align: center; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .bold { font-weight: 700; }
    .muted { color: #64748b; }
    .total-row td { background: #f1f5f9; font-weight: 800; }
    .footer-sign { display: flex; justify-content: space-between; margin-top: 10px; font-size: 7.5pt; font-weight: 600; padding-top: 14px; border-top: 1px dashed #94a3b8; }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="company">FLEXICOM INDUSTRIES PVT. LIMITED, GHATTI (KATHUA)</div>
      <div class="sub-title">R.P. PLANT PRODUCTION REPORT</div>
    </div>
    <div class="meta">
      <div>DATE: <strong>${escapeHtml(data.date)}</strong> &nbsp;|&nbsp; Sr. No.: <span class="sr">${serial}</span></div>
      <div>SHIFT: <strong>${escapeHtml(shifts.join(" + "))}</strong> &nbsp;|&nbsp; OPERATOR: <strong>${escapeHtml(data.operatorName || "—")}</strong></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="2" style="width:24px;">No.</th>
        <th rowspan="2" style="text-align:left;">Particulars</th>
        <th rowspan="2" style="text-align:left;">Colors</th>
        <th rowspan="2">Opening Stock</th>
        <th colspan="${shifts.length + 1}">Production on Date</th>
        <th rowspan="2">Production MTD</th>
        <th rowspan="2">Issued to Tape Plant</th>
        <th rowspan="2">Issued MTD</th>
        <th rowspan="2">Lumps on Date</th>
        <th rowspan="2">Lumps MTD</th>
        <th rowspan="2">Dispatch on Date</th>
        <th rowspan="2">Dispatch MTD</th>
        <th rowspan="2">Closing Stock</th>
        <th rowspan="2" style="text-align:left;">Remarks</th>
      </tr>
      <tr>
        ${shifts.map((s) => `<th>${escapeHtml(s)}</th>`).join("")}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${data.rows
        .map(
          (r) => `
        <tr>
          <td style="text-align:center;">${r.seq}</td>
          <td class="bold">${escapeHtml(r.particular)}</td>
          <td>${escapeHtml(r.color || "—")}</td>
          <td class="num">${r.isLumpsOnly ? "—" : fmtNum(r.openingStock)}</td>
          ${shifts.map((s) => `<td class="num">${fmtNum(r.productionShifts[s])}</td>`).join("")}
          <td class="num bold">${fmtNum(r.productionTotal)}</td>
          <td class="num muted">${fmtNum(r.productionMtd)}</td>
          <td class="num">${fmtNum(r.issuedToTapePlant)}</td>
          <td class="num muted">${fmtNum(r.issuedToTapePlantMtd)}</td>
          <td class="num">${fmtNum(r.lumpsOnDate)}</td>
          <td class="num muted">${fmtNum(r.lumpsMtd)}</td>
          <td class="num">${fmtNum(r.dispatchOnDate)}</td>
          <td class="num muted">${fmtNum(r.dispatchMtd)}</td>
          <td class="num bold">${r.isLumpsOnly ? "—" : fmtNum(r.closingStock)}</td>
          <td>${escapeHtml(r.remarks || "")}</td>
        </tr>
      `
        )
        .join("")}
      <tr class="total-row">
        <td colspan="3" style="text-align:center;">TOTAL (KG)</td>
        <td class="num">${fmtNum(data.totalOpeningStock)}</td>
        ${shifts
          .map((s) => `<td class="num">${fmtNum(data.shiftProductionTotals?.[s])}</td>`)
          .join("")}
        <td class="num">${fmtNum(data.totalProductionOnDate)}</td>
        <td class="num">${fmtNum(data.totalProductionMtd)}</td>
        <td class="num">${fmtNum(data.totalIssuedToTapePlant)}</td>
        <td class="num">${fmtNum(data.totalIssuedToTapePlantMtd)}</td>
        <td class="num">${fmtNum(data.totalLumpsOnDate)}</td>
        <td class="num">${fmtNum(data.totalLumpsMtd)}</td>
        <td class="num">${fmtNum(data.totalDispatchOnDate)}</td>
        <td class="num">${fmtNum(data.totalDispatchMtd)}</td>
        <td class="num">${fmtNum(data.totalClosingStock)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer-sign">
    <div>Operator: ${escapeHtml(data.operatorName || "________________")}</div>
    <div>Supervisor: ${escapeHtml(data.supervisorName || "________________")}</div>
    <div>Status: ${escapeHtml(data.status)}</div>
  </div>
</body>
</html>`;
}

export function openPrintWindow(html: string): void {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 250);
}
