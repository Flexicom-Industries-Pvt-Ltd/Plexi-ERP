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

const STANDARD_LETTERHEAD_CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 7.5pt;
    color: #0f172a;
    background: #ffffff;
    padding: 4px;
    line-height: 1.35;
  }
  .company-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 5px;
    margin-bottom: 8px;
  }
  .company-logo {
    width: 60px;
  }
  .company-logo img {
    height: 36px;
    width: auto;
    object-fit: contain;
  }
  .company-center {
    flex: 1;
    text-align: center;
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
    font-weight: 600;
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
    margin-top: 4px;
  }
  .company-right {
    width: 64px;
    text-align: right;
  }
  .page-badge {
    display: inline-block;
    border: 1px solid #cbd5e1;
    background: #f1f5f9;
    color: #334155;
    font-size: 6pt;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 3px;
  }
  .doc-meta-strip {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    font-size: 7pt;
    color: #334155;
    padding: 4px 8px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    margin-bottom: 8px;
  }
  .doc-meta-strip strong {
    color: #0f172a;
  }
  .sl-red {
    color: #dc2626 !important;
    font-weight: 800;
  }
  .kpi-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    background-color: #f8fafc;
    border: 1px solid #94a3b8;
  }
  .kpi-table td {
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
    text-align: center;
    width: 25%;
  }
  .kpi-label {
    font-size: 6pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #475569;
  }
  .kpi-val {
    font-size: 9.5pt;
    font-weight: 800;
    font-family: monospace;
    color: #0284c7;
    margin-top: 1px;
  }
  .signatures-container {
    display: flex;
    justify-content: space-between;
    margin-top: 18px;
    padding: 0 20px;
    page-break-inside: avoid;
  }
  .sig-box {
    text-align: center;
    width: 170px;
  }
  .sig-line {
    border-top: 1.5px solid #0f172a;
    margin-top: 28px;
    padding-top: 4px;
    font-weight: 700;
    font-size: 7pt;
    text-transform: uppercase;
    color: #1e293b;
  }
`;

export function generateWastageCollectionHtml(data: RpWastageCollectionData): string {
  const shifts = data.shiftNames.length > 0 ? data.shiftNames : ["Day Shift", "Night Shift"];
  const serial = String(data.serialNo || 1).padStart(3, "0");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `RP-WC-${docDate}-${serial}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const sectionHtml = data.sections
    .map(
      (sec) => `
      <table class="grid-table">
        <thead>
          <tr class="section-banner">
            <th colspan="${2 + shifts.length * 2}">${escapeHtml(sec.title)}</th>
          </tr>
          <tr class="col-header">
            <th style="width: 115px; text-align:left;">COLOUR / TYPE</th>
            ${shifts
              .map(
                (s) =>
                  `<th>${escapeHtml(s.toUpperCase())}</th><th style="width:48px;">MTD</th>`
              )
              .join("")}
            <th style="width: 60px;">TOTAL</th>
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
    @page { size: A4 portrait; margin: 5mm 6mm; }
    ${STANDARD_LETTERHEAD_CSS}
    body { font-size: 6.5pt; padding: 2px; line-height: 1.15; }
    .company-header { padding-bottom: 3px; margin-bottom: 4px; }
    .company-logo img { height: 28px; }
    .company-title { font-size: 11.5pt; }
    .company-sub { font-size: 6pt; }
    .doc-main-heading { padding: 1.5px 10px; font-size: 7.5pt; margin-top: 2px; }
    .doc-meta-strip { padding: 2.5px 6px; margin-bottom: 4px; font-size: 6.4pt; }
    .kpi-table { margin-bottom: 4px; }
    .kpi-table td { padding: 2.5px 4px; }
    .kpi-val { font-size: 8.5pt; }
    .layout { display: flex; gap: 6px; align-items: flex-start; page-break-inside: avoid; }
    .left-col { flex: 1; }
    .right-col { width: 180px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 2.5px; page-break-inside: avoid; }
    .grid-table th, .grid-table td { border: 1px solid #64748b; padding: 1.2px 3.5px; }
    .section-banner th { background: #e2e8f0; font-size: 6.4pt; font-weight: 800; text-align: center; letter-spacing: 0.2px; padding: 1.5px 3px; }
    .col-header th { background: #f8fafc; font-size: 5.8pt; font-weight: 700; text-align: center; padding: 1px 3px; }
    .label-cell { font-weight: 600; text-align: left; }
    .num-cell { text-align: right; font-variant-numeric: tabular-nums; }
    .num-cell.muted { color: #64748b; }
    .bold { font-weight: 700; }
    .total-row td { background: #f1f5f9; font-weight: 800; }
    .side-card { border: 1px solid #64748b; margin-bottom: 4px; page-break-inside: avoid; }
    .side-title { background: #e2e8f0; font-weight: 800; font-size: 6.4pt; text-align: center; padding: 2px; border-bottom: 1px solid #64748b; }
    .side-table { width: 100%; border-collapse: collapse; }
    .side-table td, .side-table th { border-bottom: 1px solid #cbd5e1; padding: 1.5px 4px; font-size: 6.2pt; }
    .side-table tr:last-child td { border-bottom: none; }
    .signatures-container { margin-top: 8px; padding: 0 16px; }
    .sig-line { margin-top: 18px; padding-top: 3px; font-size: 6.5pt; }
  </style>
</head>
<body>
  <div class="company-header">
    <div class="company-logo">
      ${origin ? `<img src="${origin}/logo.png" alt="Flexicom Logo" onerror="this.style.display='none'" />` : ""}
    </div>
    <div class="company-center">
      <div class="company-title">Flexicom Industries Pvt. Limited</div>
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, GHATTI, KATHUA (J&amp;K) 184143 • RECYCLING PLANT DIVISION</div>
      <div class="doc-main-heading">Wastage Collection Report</div>
    </div>
    <div class="company-right">
      <span class="page-badge">A4 PORTRAIT</span>
    </div>
  </div>

  <div class="doc-meta-strip">
    <div>Doc Ref: <strong>${escapeHtml(docRef)}</strong></div>
    <div>Sl. No.: <strong class="sl-red">${serial}</strong></div>
    <div>Date: <strong>${escapeHtml(data.date)}</strong></div>
    <div>Shifts: <strong>${escapeHtml(shifts.join(" + "))}</strong></div>
    <div>Operator: <strong>${escapeHtml(data.operatorName || "—")}</strong></div>
    <div>Generated: <strong>${escapeHtml(genTimestamp)}</strong></div>
  </div>

  <table class="kpi-table">
    <tr>
      <td>
        <div class="kpi-label">Sections Summary</div>
        <div class="kpi-val">${data.summaryTotalKg.toFixed(1)} Kg</div>
      </td>
      <td>
        <div class="kpi-label">Bobbin Cleaning</div>
        <div class="kpi-val">${data.marginBlocks.bobbinCleaning.totalDay.toFixed(1)} Kg</div>
      </td>
      <td>
        <div class="kpi-label">Segregation</div>
        <div class="kpi-val">${data.marginBlocks.segregation.total.toFixed(1)} Kg</div>
      </td>
      <td>
        <div class="kpi-label">Grand Reconciled</div>
        <div class="kpi-val" style="color:#059669;">${data.grandTotalKg.toFixed(1)} Kg</div>
      </td>
    </tr>
  </table>

  <div class="layout">
    <div class="left-col">${sectionHtml}</div>

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

  <div class="signatures-container">
    <div class="sig-box"><div class="sig-line">Operator / Technician</div></div>
    <div class="sig-box"><div class="sig-line">Shift Incharge</div></div>
    <div class="sig-box"><div class="sig-line">QC / Plant Head</div></div>
  </div>
</body>
</html>`;
}

export function generateRpProductionHtml(data: RpProductionReportData): string {
  const shifts = data.shiftNames.length > 0 ? data.shiftNames : ["Day Shift", "Night Shift"];
  const serial = String(data.serialNo || 1).padStart(3, "0");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `RP-PR-${docDate}-${serial}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
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
  <title>R.P. Plant Production Report - ${escapeHtml(data.date)} (Sr. ${serial})</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    ${STANDARD_LETTERHEAD_CSS}
    table.prod-table { width: 100%; border-collapse: collapse; }
    table.prod-table th, table.prod-table td { border: 1px solid #64748b; padding: 3px 4px; }
    table.prod-table thead th { background: #e2e8f0; font-size: 6.8pt; font-weight: 800; text-align: center; text-transform: uppercase; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .bold { font-weight: 700; }
    .muted { color: #64748b; }
    .total-row td { background: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
  </style>
</head>
<body>
  <div class="company-header">
    <div class="company-logo">
      ${origin ? `<img src="${origin}/logo.png" alt="Flexicom Logo" onerror="this.style.display='none'" />` : ""}
    </div>
    <div class="company-center">
      <div class="company-title">Flexicom Industries Pvt. Limited</div>
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, GHATTI, KATHUA (J&amp;K) 184143 • RECYCLING PLANT DIVISION</div>
      <div class="doc-main-heading">R.P. Plant Production Report</div>
    </div>
    <div class="company-right">
      <span class="page-badge">A4 LANDSCAPE</span>
    </div>
  </div>

  <div class="doc-meta-strip">
    <div>Doc Ref: <strong>${escapeHtml(docRef)}</strong></div>
    <div>Sr. No.: <strong class="sl-red">${serial}</strong></div>
    <div>Date: <strong>${escapeHtml(data.date)}</strong></div>
    <div>Shifts: <strong>${escapeHtml(shifts.join(" + "))}</strong></div>
    <div>Operator: <strong>${escapeHtml(data.operatorName || "—")}</strong></div>
    <div>Generated: <strong>${escapeHtml(genTimestamp)}</strong></div>
  </div>

  <table class="kpi-table">
    <tr>
      <td>
        <div class="kpi-label">Opening Stock</div>
        <div class="kpi-val">${data.totalOpeningStock.toLocaleString()} Kg</div>
      </td>
      <td>
        <div class="kpi-label">Production on Date</div>
        <div class="kpi-val" style="color:#059669;">+${data.totalProductionOnDate.toLocaleString()} Kg</div>
      </td>
      <td>
        <div class="kpi-label">Issued to Tape Plant</div>
        <div class="kpi-val" style="color:#0284c7;">-${data.totalIssuedToTapePlant.toLocaleString()} Kg</div>
      </td>
      <td>
        <div class="kpi-label">Closing Stock</div>
        <div class="kpi-val" style="color:#0f172a;">${data.totalClosingStock.toLocaleString()} Kg</div>
      </td>
    </tr>
  </table>

  <table class="prod-table">
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
        ${shifts.map((s) => `<th>${escapeHtml(s.replace(" Shift", ""))}</th>`).join("")}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${data.rows
        .map(
          (r) => `
        <tr>
          <td style="text-align:center;">${r.seq}</td>
          <td class="bold">${escapeHtml(r.particular || "—")}</td>
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

  <div class="signatures-container">
    <div class="sig-box"><div class="sig-line">Operator / Technician</div></div>
    <div class="sig-box"><div class="sig-line">Shift Incharge</div></div>
    <div class="sig-box"><div class="sig-line">QC / Plant Head</div></div>
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
