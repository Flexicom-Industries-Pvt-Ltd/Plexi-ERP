/**
 * Flexicom Central ERP - Tape Plant Process Drive Parameters Sheet Print Engine
 * Produces crisp, professional, high-contrast A4 landscape printable documents
 * matching the exact standard format of the Tape Plant Production Plan & Process Temperature.
 */

export interface DriveParameterPrintReading {
  id?: string;
  time: string;
  photoUrl?: string;
  extruderRpm: number | string;
  meltPumpRpm: number | string;
  takeUpMpm: number | string;
  nipRollMpm: number | string;
  isuMpm: number | string;
  pauMpm: number | string;
  stretchingMpm: number | string;
  annealingMpm: number | string;
  stretchingRatio: number | string;
  meltPressureP1: number | string;
  meltPressureP2: number | string;
  meltPressureP3: number | string;
  waterBath: number | string;
  colour: string;
  denier: number | string;
  tapeWidth: number | string;
  strength: number | string;
  eloPercent: number | string;
  spacerWidth: number | string;
  numberOfTape: number | string;
}

export interface DriveParameterPrintData {
  date: string;
  shiftName: string;
  operatorName?: string;
  status?: string;
  records: DriveParameterPrintReading[];
}

function parseNum(val: number | string | undefined | null): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function calcAvg(arr: (number | string | undefined | null)[]): string {
  const nums = arr.map(parseNum).filter((n): n is number => n !== null);
  if (nums.length === 0) return "—";
  const sum = nums.reduce((a, b) => a + b, 0);
  return (sum / nums.length).toFixed(1);
}

export function generateDriveSheetHtml(data: DriveParameterPrintData): string {
  const { date, shiftName, operatorName, status = "SAVED", records } = data;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const docDate = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const docRef = `TP-DRIVE-${docDate}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  // Summary Metrics
  const avgExtruderRpm = calcAvg(records.map((r) => r.extruderRpm));
  const avgMeltPumpRpm = calcAvg(records.map((r) => r.meltPumpRpm));
  const avgNipRollMpm = calcAvg(records.map((r) => r.nipRollMpm));
  const avgStretchRatio = calcAvg(records.map((r) => r.stretchingRatio));
  const avgWaterBath = calcAvg(records.map((r) => r.waterBath));
  const avgDenier = calcAvg(records.map((r) => r.denier));
  const avgStrength = calcAvg(records.map((r) => r.strength));

  // Column Averages for footer
  const avgTakeUp = calcAvg(records.map((r) => r.takeUpMpm));
  const avgIsu = calcAvg(records.map((r) => r.isuMpm));
  const avgPau = calcAvg(records.map((r) => r.pauMpm));
  const avgStretching = calcAvg(records.map((r) => r.stretchingMpm));
  const avgAnnealing = calcAvg(records.map((r) => r.annealingMpm));
  const avgP1 = calcAvg(records.map((r) => r.meltPressureP1));
  const avgP2 = calcAvg(records.map((r) => r.meltPressureP2));
  const avgP3 = calcAvg(records.map((r) => r.meltPressureP3));
  const avgTapeWidth = calcAvg(records.map((r) => r.tapeWidth));
  const avgElo = calcAvg(records.map((r) => r.eloPercent));
  const avgSpacer = calcAvg(records.map((r) => r.spacerWidth));
  const avgTapeCount = calcAvg(records.map((r) => r.numberOfTape));

  const rowsHtml = records
    .map((r, index) => {
      const isEven = index % 2 === 1;
      const rowBg = isEven ? "background-color: #f8fafc;" : "background-color: #ffffff;";
      const hasPhoto = Boolean(r.photoUrl);

      return `
      <tr style="${rowBg}">
        <td style="text-align: center; font-weight: 700; width: 22px; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${index + 1}</td>
        <td style="font-family: monospace; font-weight: 800; font-size: 7.5pt; text-align: center; border: 1px solid #cbd5e1; padding: 2.5px 2px;">
          ${r.time || "—"}
        </td>
        <td style="text-align: center; font-size: 6.5pt; border: 1px solid #cbd5e1; padding: 2.5px 2px;">
          ${hasPhoto ? `<span style="background: #dcfce7; color: #166534; padding: 1px 3px; border-radius: 2px; font-weight: 700;">YES</span>` : `<span style="color: #94a3b8;">—</span>`}
        </td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.extruderRpm !== "" ? r.extruderRpm : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.meltPumpRpm !== "" ? r.meltPumpRpm : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.takeUpMpm !== "" ? r.takeUpMpm : "—"}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.nipRollMpm !== "" ? r.nipRollMpm : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.isuMpm !== "" ? r.isuMpm : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.pauMpm !== "" ? r.pauMpm : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.stretchingMpm !== "" ? r.stretchingMpm : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.annealingMpm !== "" ? r.annealingMpm : "—"}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; border: 1px solid #cbd5e1; padding: 2.5px 2px; background: #f1f5f9;">${r.stretchingRatio !== "" ? r.stretchingRatio : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.meltPressureP1 !== "" ? r.meltPressureP1 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.meltPressureP2 !== "" ? r.meltPressureP2 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.meltPressureP3 !== "" ? r.meltPressureP3 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.waterBath !== "" ? r.waterBath : "—"}</td>
        <td style="text-align: center; border: 1px solid #cbd5e1; padding: 2.5px 2px; font-weight: 600;">${r.colour || "—"}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.denier !== "" ? r.denier : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.tapeWidth !== "" ? r.tapeWidth : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.strength !== "" ? r.strength : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.eloPercent !== "" ? r.eloPercent : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.spacerWidth !== "" ? r.spacerWidth : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.numberOfTape !== "" ? r.numberOfTape : "—"}</td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tape Plant Process Drive Parameters - ${docRef}</title>
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
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 5px;
      text-align: center;
    }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .logo-box {
      width: 80px;
      text-align: left;
    }
    .logo-box img {
      height: 38px;
      object-fit: contain;
    }
    .company-info {
      flex: 1;
      text-align: center;
    }
    .company-name {
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .unit-name {
      font-size: 7.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 1px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .doc-badge-wrapper {
      margin-top: 3px;
    }
    .doc-badge {
      display: inline-block;
      border: 1px solid #0f172a;
      padding: 1.5px 10px;
      font-size: 8.5pt;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      background: #ffffff;
    }
    .meta-line {
      font-size: 7pt;
      color: #475569;
      margin-top: 3px;
      display: flex;
      justify-content: center;
      gap: 12px;
      font-weight: 500;
    }
    .meta-line strong {
      color: #0f172a;
      font-weight: 700;
    }
    .status-badge {
      display: inline-block;
      padding: 0.5px 4px;
      border-radius: 2px;
      font-size: 6.5pt;
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
      gap: 5px;
      margin-bottom: 5px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      padding: 3px 6px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-title {
      font-size: 6pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.4px;
    }
    .kpi-value {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 1px;
    }
    .kpi-sub {
      font-size: 5.5pt;
      color: #94a3b8;
    }

    /* Telemetry Table */
    .table-section {
      margin-bottom: 5px;
    }
    .telemetry-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.8pt;
    }
    .telemetry-table th {
      border: 1px solid #94a3b8;
      padding: 2.5px 2px;
      text-align: center;
      font-weight: 700;
      font-size: 6.5pt;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .super-th {
      font-size: 6.8pt;
      letter-spacing: 0.5px;
      font-weight: 800;
      padding: 3px 2px !important;
    }
    .th-rpm {
      background: #dbeafe;
      color: #1e40af;
    }
    .th-mpm {
      background: #e0e7ff;
      color: #3730a3;
    }
    .th-pressure {
      background: #fef3c7;
      color: #92400e;
    }
    .th-spec {
      background: #f1f5f9;
      color: #334155;
    }
    .telemetry-table td {
      border: 1px solid #cbd5e1;
      padding: 2.5px 2px;
    }
    .footer-avg-row td {
      border: 1.5px solid #0f172a !important;
      font-weight: 800;
      background: #f8fafc;
      font-size: 6.8pt;
      padding: 3px 2px;
    }

    /* Sign-off Strip */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 6.8pt;
    }
    .sign-table td {
      width: 33.33%;
      border: none;
      padding: 0 10px;
      text-align: center;
      vertical-align: bottom;
    }
    .sign-line {
      border-bottom: 1px solid #0f172a;
      height: 20px;
      margin-bottom: 3px;
    }
    .sign-label {
      font-size: 6.5pt;
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
          <div class="unit-name">Tape Plant Extrusion &amp; Winding Division &bull; Kathua Industrial Complex, Phase-II, Kathua (J&amp;K)</div>
          <div class="doc-badge-wrapper">
            <span class="doc-badge">TAPE PLANT PROCESS DRIVE PARAMETERS SHEET</span>
          </div>
        </div>
        <div class="logo-box" style="text-align: right;">
          <!-- Balanced Spacer -->
        </div>
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
        <div class="kpi-title">Time Slots Recorded</div>
        <div class="kpi-value">${records.length} Slots</div>
        <div class="kpi-sub">${shiftName} Shift Coverage</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Avg Extruder Speed</div>
        <div class="kpi-value">${avgExtruderRpm !== "—" ? `${avgExtruderRpm} RPM` : "—"}</div>
        <div class="kpi-sub">Melt Pump: ${avgMeltPumpRpm !== "—" ? `${avgMeltPumpRpm} RPM` : "—"}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Avg Nip Roll Speed</div>
        <div class="kpi-value">${avgNipRollMpm !== "—" ? `${avgNipRollMpm} MPM` : "—"}</div>
        <div class="kpi-sub">Stretch Ratio: ${avgStretchRatio}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Avg Tape Denier &amp; Strength</div>
        <div class="kpi-value">${avgDenier !== "—" ? `${avgDenier} D` : "—"}</div>
        <div class="kpi-sub">Strength: ${avgStrength !== "—" ? `${avgStrength} gpd` : "—"} | Bath: ${avgWaterBath !== "—" ? `${avgWaterBath}°C` : "—"}</div>
      </div>
    </div>

    <!-- Telemetry Table -->
    <div class="table-section">
      <table class="telemetry-table">
        <thead>
          <!-- Super Header Row -->
          <tr>
            <th rowspan="2" style="width: 20px; background: #f8fafc;">#</th>
            <th rowspan="2" style="width: 42px; background: #f8fafc;">Time</th>
            <th rowspan="2" style="width: 30px; background: #f8fafc;">Photo</th>
            <th colspan="2" class="super-th th-rpm">Extruder &amp; Pump (RPM)</th>
            <th colspan="7" class="super-th th-mpm">Line Speeds (MPM) &amp; Stretch Ratio</th>
            <th colspan="4" class="super-th th-pressure">Melt Pressures (bar) &amp; Bath</th>
            <th colspan="7" class="super-th th-spec">Tape Quality &amp; Specifications</th>
          </tr>
          <!-- Sub Header Row -->
          <tr>
            <!-- Extruder & Pump -->
            <th class="th-rpm" style="width: 44px;">Extruder</th>
            <th class="th-rpm" style="width: 44px;">Melt Pump</th>

            <!-- Line Speeds -->
            <th class="th-mpm" style="width: 42px;">Take-Up</th>
            <th class="th-mpm" style="width: 42px;">Nip Roll</th>
            <th class="th-mpm" style="width: 38px;">ISU</th>
            <th class="th-mpm" style="width: 38px;">PAU</th>
            <th class="th-mpm" style="width: 44px;">Stretch</th>
            <th class="th-mpm" style="width: 44px;">Anneal</th>
            <th class="th-mpm" style="width: 42px; background: #e2e8f0; color: #0f172a;">Ratio</th>

            <!-- Melt Pressures & Bath -->
            <th class="th-pressure" style="width: 38px;">P1</th>
            <th class="th-pressure" style="width: 38px;">P2</th>
            <th class="th-pressure" style="width: 38px;">P3</th>
            <th class="th-pressure" style="width: 42px;">Bath °C</th>

            <!-- Tape Specifications -->
            <th class="th-spec" style="width: 44px;">Colour</th>
            <th class="th-spec" style="width: 38px;">Denier</th>
            <th class="th-spec" style="width: 38px;">Width</th>
            <th class="th-spec" style="width: 38px;">Strength</th>
            <th class="th-spec" style="width: 34px;">ELO %</th>
            <th class="th-spec" style="width: 38px;">Spacer</th>
            <th class="th-spec" style="width: 38px;">Tapes</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="23" style="text-align: center; padding: 12px; color: #94a3b8;">No drive parameter readings recorded for this shift.</td></tr>`}

          <!-- Summary Averages Row -->
          <tr class="footer-avg-row">
            <td colspan="3" style="text-align: center; font-weight: 900; background: #e2e8f0; color: #0f172a;">AVERAGE</td>
            <td style="text-align: right; font-family: monospace;">${avgExtruderRpm}</td>
            <td style="text-align: right; font-family: monospace;">${avgMeltPumpRpm}</td>
            <td style="text-align: right; font-family: monospace;">${avgTakeUp}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 900;">${avgNipRollMpm}</td>
            <td style="text-align: right; font-family: monospace;">${avgIsu}</td>
            <td style="text-align: right; font-family: monospace;">${avgPau}</td>
            <td style="text-align: right; font-family: monospace;">${avgStretching}</td>
            <td style="text-align: right; font-family: monospace;">${avgAnnealing}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 900; background: #e2e8f0;">${avgStretchRatio}</td>
            <td style="text-align: right; font-family: monospace;">${avgP1}</td>
            <td style="text-align: right; font-family: monospace;">${avgP2}</td>
            <td style="text-align: right; font-family: monospace;">${avgP3}</td>
            <td style="text-align: right; font-family: monospace;">${avgWaterBath}</td>
            <td style="text-align: center;">—</td>
            <td style="text-align: right; font-family: monospace; font-weight: 900;">${avgDenier}</td>
            <td style="text-align: right; font-family: monospace;">${avgTapeWidth}</td>
            <td style="text-align: right; font-family: monospace;">${avgStrength}</td>
            <td style="text-align: right; font-family: monospace;">${avgElo}</td>
            <td style="text-align: right; font-family: monospace;">${avgSpacer}</td>
            <td style="text-align: right; font-family: monospace;">${avgTapeCount}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Sign-off Strip -->
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-line"></div>
          <span class="sign-label">Prepared By (Operator / In-Charge)</span>
        </td>
        <td>
          <div class="sign-line"></div>
          <span class="sign-label">Verified By (Quality Control / Lab)</span>
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

export function printTapePlantDriveSheet(data: DriveParameterPrintData): void {
  const html = generateDriveSheetHtml(data);

  let iframe = document.getElementById("tape-plant-drive-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "tape-plant-drive-print-iframe";
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
