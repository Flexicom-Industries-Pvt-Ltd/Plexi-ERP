/**
 * Flexicom Central ERP - Tape Plant Raw Material Movement Sheet Print Engine
 * Produces crisp, professional, high-contrast A4 landscape printable documents
 * matching the exact standard format of the Tape Plant ERP sheets.
 */

export interface RawMaterialPrintRow {
  id?: string;
  material: string;
  grade: string;
  photoUrl?: string;
  openingStock: number | string;
  received: number | string;
  consumption: number | string;
  settingPercent: number | string;
  actualPercent: number | string;
  wastage: number | string;
}

export interface RawMaterialPrintData {
  date: string;
  shiftName: string;
  operatorName?: string;
  status?: string;
  records: RawMaterialPrintRow[];
}

function parseNum(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export function generateRawMaterialSheetHtml(data: RawMaterialPrintData): string {
  const { date, shiftName, operatorName, status = "SAVED", records } = data;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const docDate = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const docRef = `TP-RM-${docDate}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  // Totals calculations
  let totOpening = 0;
  let totReceived = 0;
  let totAvailable = 0;
  let totConsumption = 0;
  let totClosing = 0;
  let totSettingPercent = 0;
  let totActualPercent = 0;
  let totWastage = 0;

  const rowsHtml = records
    .map((r, index) => {
      const isEven = index % 2 === 1;
      const rowBg = isEven ? "background-color: #f8fafc;" : "background-color: #ffffff;";
      const hasPhoto = Boolean(r.photoUrl);

      const open = parseNum(r.openingStock);
      const rec = parseNum(r.received);
      const avail = open + rec;
      const cons = parseNum(r.consumption);
      const close = avail - cons;
      const setP = parseNum(r.settingPercent);
      const actP = parseNum(r.actualPercent);
      const wst = parseNum(r.wastage);

      totOpening += open;
      totReceived += rec;
      totAvailable += avail;
      totConsumption += cons;
      totClosing += close;
      totSettingPercent += setP;
      totActualPercent += actP;
      totWastage += wst;

      return `
      <tr style="${rowBg}">
        <td style="text-align: center; font-weight: 700; width: 25px; border: 1px solid #cbd5e1; padding: 4px 3px;">${index + 1}</td>
        <td style="font-weight: 800; font-size: 8.5pt; border: 1px solid #cbd5e1; padding: 4px 5px; color: #0f172a;">
          ${r.material || "—"}
        </td>
        <td style="font-size: 8pt; border: 1px solid #cbd5e1; padding: 4px 5px; color: #475569;">
          ${r.grade || "—"}
        </td>
        <td style="text-align: center; font-size: 7pt; border: 1px solid #cbd5e1; padding: 4px 3px;">
          ${hasPhoto ? `<span style="background: #dcfce7; color: #166534; padding: 1.5px 4px; border-radius: 2px; font-weight: 700;">YES</span>` : `<span style="color: #94a3b8;">—</span>`}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt; border: 1px solid #cbd5e1; padding: 4px 5px;">${r.openingStock !== "" ? open.toFixed(1) : "—"}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt; border: 1px solid #cbd5e1; padding: 4px 5px;">${r.received !== "" ? rec.toFixed(1) : "—"}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; border: 1px solid #cbd5e1; padding: 4px 5px; background: #f1f5f9;">${avail.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8.5pt; font-weight: 800; border: 1px solid #cbd5e1; padding: 4px 5px; color: #15803d; background: #f0fdf4;">${r.consumption !== "" ? cons.toFixed(1) : "—"}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; border: 1px solid #cbd5e1; padding: 4px 5px;">${close.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt; border: 1px solid #cbd5e1; padding: 4px 5px;">${r.settingPercent !== "" ? `${setP}%` : "—"}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt; border: 1px solid #cbd5e1; padding: 4px 5px;">${r.actualPercent !== "" ? `${actP}%` : "—"}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; border: 1px solid #cbd5e1; padding: 4px 5px; color: #b91c1c;">${r.wastage !== "" ? wst.toFixed(1) : "—"}</td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tape Plant Raw Material Movement - ${docRef}</title>
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
      border-bottom: 2px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 8px;
      text-align: center;
    }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo-box {
      width: 90px;
      text-align: left;
    }
    .logo-box img {
      height: 42px;
      object-fit: contain;
    }
    .company-info {
      flex: 1;
      text-align: center;
    }
    .company-name {
      font-size: 15pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .unit-name {
      font-size: 8pt;
      font-weight: 700;
      color: #334155;
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .doc-badge-wrapper {
      margin-top: 4px;
    }
    .doc-badge {
      display: inline-block;
      border: 1px solid #0f172a;
      padding: 2px 12px;
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      background: #ffffff;
    }
    .meta-line {
      font-size: 7.5pt;
      color: #475569;
      margin-top: 4px;
      display: flex;
      justify-content: center;
      gap: 14px;
      font-weight: 500;
    }
    .meta-line strong {
      color: #0f172a;
      font-weight: 700;
    }
    .status-badge {
      display: inline-block;
      padding: 1px 5px;
      border-radius: 2px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
    }
    .status-badge.saved {
      background: #dcfce7;
      color: #166534;
      border-color: #86efac;
    }

    /* KPI Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 5px 8px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-title {
      font-size: 6.5pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .kpi-value {
      font-size: 11pt;
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
    }
    .kpi-sub {
      font-size: 6pt;
      color: #94a3b8;
    }

    /* Table Section */
    .table-section {
      margin-bottom: 8px;
    }
    .material-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5pt;
    }
    .material-table th {
      border: 1px solid #94a3b8;
      padding: 5px 4px;
      text-align: center;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
      line-height: 1.1;
      background: #f1f5f9;
      color: #334155;
    }
    .th-stock {
      background: #e2e8f0;
      color: #1e293b;
    }
    .th-consumption {
      background: #dcfce7;
      color: #166534;
    }
    .th-batch {
      background: #fef3c7;
      color: #92400e;
    }
    .material-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 5px;
    }
    .footer-total-row td {
      border: 2px solid #0f172a !important;
      font-weight: 900;
      background: #f1f5f9;
      font-size: 8pt;
      padding: 5px 4px;
    }

    /* Sign-off Strip */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 7.5pt;
    }
    .sign-table td {
      width: 33.33%;
      border: none;
      padding: 0 14px;
      text-align: center;
      vertical-align: bottom;
    }
    .sign-line {
      border-bottom: 1.5px solid #0f172a;
      height: 24px;
      margin-bottom: 4px;
    }
    .sign-label {
      font-size: 7pt;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- Header -->
    <div class="header-container">
      <div class="brand-row">
        <div class="logo-box">
          <img src="${origin}/logo.png" alt="Flexicom Logo" onerror="this.style.display='none'" />
        </div>
        <div class="company-info">
          <div class="company-name">FLEXICOM INDUSTRIES PVT. LTD.</div>
          <div class="unit-name">Tape Plant Extrusion &bull; Kathua Industrial Complex, Phase-II, Kathua (J&amp;K)</div>
          <div class="doc-badge-wrapper">
            <span class="doc-badge">TAPE PLANT RAW MATERIAL MOVEMENT SHEET</span>
          </div>
        </div>
        <div class="logo-box" style="text-align: right;"></div>
      </div>
      <div class="meta-line">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>&bull;</span>
        <span>Date: <strong>${date}</strong></span>
        <span>&bull;</span>
        <span>Shift: <strong>${shiftName}</strong></span>
        <span>&bull;</span>
        <span>Operator: <strong>${operatorName || "Unassigned"}</strong></span>
        <span>&bull;</span>
        <span>Status: <span class="status-badge ${status.toLowerCase() === "saved" ? "saved" : ""}">${status}</span></span>
      </div>
    </div>

    <!-- Summary KPI Cards -->
    <div class="summary-grid">
      <div class="kpi-card">
        <div class="kpi-title">Total Consumption</div>
        <div class="kpi-value" style="color: #15803d;">${totConsumption.toLocaleString()} KG</div>
        <div class="kpi-sub">Shift Net Extruder Feed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Total Received</div>
        <div class="kpi-value">${totReceived.toLocaleString()} KG</div>
        <div class="kpi-sub">Store Inward Issue</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Total Wastage</div>
        <div class="kpi-value" style="color: #b91c1c;">${totWastage.toLocaleString()} KG</div>
        <div class="kpi-sub">Floor &amp; Plant Scrap</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Closing Stock Position</div>
        <div class="kpi-value">${totClosing.toLocaleString()} KG</div>
        <div class="kpi-sub">${records.length} Formulations Tracked</div>
      </div>
    </div>

    <!-- Raw Material Table -->
    <div class="table-section">
      <table class="material-table">
        <thead>
          <tr>
            <th style="width: 25px;">#</th>
            <th style="width: 140px; text-align: left;">Raw Material</th>
            <th style="width: 110px; text-align: left;">Grade</th>
            <th style="width: 45px;">Photo</th>
            <th class="th-stock" style="width: 90px; text-align: right;">Opening (KG)</th>
            <th class="th-stock" style="width: 90px; text-align: right;">Received (KG)</th>
            <th class="th-stock" style="width: 95px; text-align: right;">Total (KG)</th>
            <th class="th-consumption" style="width: 115px; text-align: right;">Consumption (KG)</th>
            <th class="th-stock" style="width: 95px; text-align: right;">Closing (KG)</th>
            <th class="th-batch" style="width: 75px; text-align: right;">Setting %</th>
            <th class="th-batch" style="width: 75px; text-align: right;">Actual %</th>
            <th class="th-batch" style="width: 85px; text-align: right;">Wastage (KG)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="12" style="text-align: center; padding: 12px; color: #94a3b8;">No raw material records found.</td></tr>`}

          <!-- Totals Row -->
          <tr class="footer-total-row">
            <td colspan="4" style="text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL</td>
            <td style="text-align: right; font-family: monospace;">${totOpening.toFixed(1)}</td>
            <td style="text-align: right; font-family: monospace;">${totReceived.toFixed(1)}</td>
            <td style="text-align: right; font-family: monospace; background: #e2e8f0;">${totAvailable.toFixed(1)}</td>
            <td style="text-align: right; font-family: monospace; font-size: 9pt; color: #15803d; background: #dcfce7;">${totConsumption.toFixed(1)}</td>
            <td style="text-align: right; font-family: monospace;">${totClosing.toFixed(1)}</td>
            <td style="text-align: right; font-family: monospace;">${totSettingPercent.toFixed(1)}%</td>
            <td style="text-align: right; font-family: monospace;">${totActualPercent.toFixed(1)}%</td>
            <td style="text-align: right; font-family: monospace; color: #b91c1c;">${totWastage.toFixed(1)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sign-off Strip -->
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-line"></div>
          <span class="sign-label">Prepared By (Operator / Shift In-Charge)</span>
        </td>
        <td>
          <div class="sign-line"></div>
          <span class="sign-label">Verified By (Store &amp; Inventory Head)</span>
        </td>
        <td>
          <div class="sign-line"></div>
          <span class="sign-label">Approved By (Plant Supervisor / Manager)</span>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

export function printTapePlantRawMaterialSheet(data: RawMaterialPrintData): void {
  const html = generateRawMaterialSheetHtml(data);

  let iframe = document.getElementById("tape-plant-rm-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "tape-plant-rm-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc && iframe.contentWindow) {
    doc.open();
    doc.write(html);
    doc.close();

    const logoImg = doc.querySelector("img");
    const triggerPrint = () => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print failed, falling back to window print", err);
        fallbackWindowPrint(html);
      }
    };

    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 100);
      logoImg.onerror = () => setTimeout(triggerPrint, 100);
      setTimeout(triggerPrint, 800);
    } else {
      setTimeout(triggerPrint, 250);
    }
  } else {
    fallbackWindowPrint(html);
  }
}

function fallbackWindowPrint(html: string): void {
  const win = window.open("", "_blank", "width=1200,height=800");
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
