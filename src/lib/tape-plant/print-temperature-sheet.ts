/**
 * Flexicom Central ERP - Tape Plant Process Temperature Sheet Print Engine
 * Produces crisp, professional, high-contrast A4 landscape printable documents
 * matching the exact standard format of the Tape Plant Production Plan.
 */

export interface TemperaturePrintReading {
  id?: string;
  time: string;
  photoUrl?: string;
  b1: number | string;
  b2: number | string;
  b3: number | string;
  b4: number | string;
  b5: number | string;
  b6: number | string;
  b7: number | string;
  screenChanger: number | string;
  ad1: number | string;
  ad2: number | string;
  meltPump: number | string;
  d1: number | string;
  d2: number | string;
  d3: number | string;
  d4: number | string;
  d5: number | string;
  d6: number | string;
  d7: number | string;
  meltTemp: number | string;
  h1: number | string;
  h2: number | string;
  hotAirTemp: number | string;
}

export interface TemperaturePrintData {
  date: string;
  shiftName: string;
  operatorName?: string;
  status?: string;
  readings: TemperaturePrintReading[];
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

export function generateTemperatureSheetHtml(data: TemperaturePrintData): string {
  const { date, shiftName, operatorName, status = "SAVED", readings } = data;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const docDate = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const docRef = `TP-TEMP-${docDate}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  const allBarrelTemps: (number | string)[] = [];
  const allDieTemps: (number | string)[] = [];
  const allMeltTemps: (number | string)[] = [];

  readings.forEach((r) => {
    ["b1", "b2", "b3", "b4", "b5", "b6", "b7"].forEach((k) => {
      const v = (r as any)[k];
      if (v !== "" && v !== undefined && v !== null) allBarrelTemps.push(v);
    });
    ["d1", "d2", "d3", "d4", "d5", "d6", "d7"].forEach((k) => {
      const v = (r as any)[k];
      if (v !== "" && v !== undefined && v !== null) allDieTemps.push(v);
    });
    if (r.meltTemp !== "" && r.meltTemp !== undefined && r.meltTemp !== null) {
      allMeltTemps.push(r.meltTemp);
    }
  });

  const avgBarrel = calcAvg(allBarrelTemps);
  const avgDie = calcAvg(allDieTemps);
  const avgMelt = calcAvg(allMeltTemps);

  // Column Averages
  const avgB1 = calcAvg(readings.map((r) => r.b1));
  const avgB2 = calcAvg(readings.map((r) => r.b2));
  const avgB3 = calcAvg(readings.map((r) => r.b3));
  const avgB4 = calcAvg(readings.map((r) => r.b4));
  const avgB5 = calcAvg(readings.map((r) => r.b5));
  const avgB6 = calcAvg(readings.map((r) => r.b6));
  const avgB7 = calcAvg(readings.map((r) => r.b7));

  const avgScreen = calcAvg(readings.map((r) => r.screenChanger));
  const avgAd1 = calcAvg(readings.map((r) => r.ad1));
  const avgAd2 = calcAvg(readings.map((r) => r.ad2));
  const avgMeltPump = calcAvg(readings.map((r) => r.meltPump));

  const avgD1 = calcAvg(readings.map((r) => r.d1));
  const avgD2 = calcAvg(readings.map((r) => r.d2));
  const avgD3 = calcAvg(readings.map((r) => r.d3));
  const avgD4 = calcAvg(readings.map((r) => r.d4));
  const avgD5 = calcAvg(readings.map((r) => r.d5));
  const avgD6 = calcAvg(readings.map((r) => r.d6));
  const avgD7 = calcAvg(readings.map((r) => r.d7));

  const avgH1 = calcAvg(readings.map((r) => r.h1));
  const avgH2 = calcAvg(readings.map((r) => r.h2));
  const avgHotAir = calcAvg(readings.map((r) => r.hotAirTemp));

  const rowsHtml = readings
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
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.b1 !== "" ? r.b1 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.b2 !== "" ? r.b2 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.b3 !== "" ? r.b3 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.b4 !== "" ? r.b4 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.b5 !== "" ? r.b5 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.b6 !== "" ? r.b6 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.b7 !== "" ? r.b7 : "—"}</td>

        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.screenChanger !== "" ? r.screenChanger : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.ad1 !== "" ? r.ad1 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.ad2 !== "" ? r.ad2 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.meltPump !== "" ? r.meltPump : "—"}</td>

        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.d1 !== "" ? r.d1 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.d2 !== "" ? r.d2 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.d3 !== "" ? r.d3 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.d4 !== "" ? r.d4 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.d5 !== "" ? r.d5 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.d6 !== "" ? r.d6 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.d7 !== "" ? r.d7 : "—"}</td>

        <td style="text-align: right; font-family: monospace; font-weight: 700; border: 1px solid #cbd5e1; padding: 2.5px 2px; background: #f8fafc;">${r.meltTemp !== "" ? r.meltTemp : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.h1 !== "" ? r.h1 : "—"}</td>
        <td style="text-align: right; font-family: monospace; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.h2 !== "" ? r.h2 : "—"}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; border: 1px solid #cbd5e1; padding: 2.5px 2px;">${r.hotAirTemp !== "" ? r.hotAirTemp : "—"}</td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tape Plant Process Temperature - ${docRef}</title>
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
    .logo-img {
      height: 48px;
      width: auto;
      object-fit: contain;
    }
    .title-box {
      flex: 1;
      text-align: center;
    }
    .company-title {
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #000000;
      text-transform: uppercase;
    }
    .company-sub {
      font-size: 7.5pt;
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
      margin-top: 3px;
      margin-bottom: 2px;
    }
    .doc-meta-strip {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 12px;
      font-size: 7.5pt;
      color: #334155;
      margin-top: 3px;
    }
    .doc-meta-strip strong {
      color: #000000;
    }

    /* KPI Summary Row */
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 3px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      text-align: center;
      width: 25%;
    }
    .kpi-label {
      font-size: 6.5pt;
      color: #475569;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.4px;
      display: block;
    }
    .kpi-value {
      font-size: 9.5pt;
      font-weight: 900;
      color: #0f172a;
      font-family: monospace;
      margin-top: 1px;
      display: block;
    }

    /* Section Banner */
    .section-banner {
      background-color: #e2e8f0;
      border: 1px solid #94a3b8;
      border-bottom: 0;
      font-size: 7.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      text-align: center;
      padding: 3px;
      color: #0f172a;
    }

    /* Telemetry Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7pt;
      border: 1px solid #94a3b8;
      margin-bottom: 8px;
    }
    .data-table th {
      border: 1px solid #cbd5e1;
      padding: 2.5px 2px;
      background-color: #f1f5f9;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 2.5px 2px;
    }
    .total-row {
      background-color: #f1f5f9;
      font-weight: 800;
      border-top: 2px solid #94a3b8;
    }

    /* Sign-off Footer */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      page-break-inside: avoid;
    }
    .sign-table td {
      width: 33.33%;
      padding: 0 10px;
      text-align: center;
      vertical-align: top;
    }
    .sign-line {
      border-bottom: 1px solid #475569;
      height: 24px;
      margin-bottom: 4px;
    }
    .sign-label {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- Header -->
    <div class="header-container">
      <div class="brand-row">
        <div class="logo-box">
          <img src="${origin}/logo.png" class="logo-img" alt="Logo" onerror="this.style.display='none'" />
        </div>
        <div class="title-box">
          <h1 class="company-title">Flexicom Industries Pvt. Ltd.</h1>
          <p class="company-sub">Tape Plant Extrusion &amp; Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&amp;K)</p>
          <div>
            <div class="doc-main-heading">Tape Plant Process Temperature Log</div>
          </div>
        </div>
        <div class="logo-box" aria-hidden="true"></div>
      </div>

      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>•</span>
        <span>Date: <strong>${date}</strong></span>
        <span>•</span>
        <span>Shift: <strong>${shiftName}</strong></span>
        <span>•</span>
        <span>Operator: <strong>${operatorName || "Unassigned"}</strong></span>
        <span>•</span>
        <span>Status: <strong>${status}</strong></span>
      </div>
    </div>

    <!-- Key Metrics Strip -->
    <table class="kpi-table">
      <tr>
        <td>
          <span class="kpi-label">Total Time Slots</span>
          <span class="kpi-value">${readings.length} Slots</span>
        </td>
        <td>
          <span class="kpi-label">Avg Barrel Temp (B1-B7)</span>
          <span class="kpi-value">${avgBarrel !== "—" ? `${avgBarrel} °C` : "—"}</span>
        </td>
        <td>
          <span class="kpi-label">Avg Die Temp (D1-D7)</span>
          <span class="kpi-value">${avgDie !== "—" ? `${avgDie} °C` : "—"}</span>
        </td>
        <td>
          <span class="kpi-label">Approval Status</span>
          <span class="kpi-value" style="font-size: 8.5pt;">${status}</span>
        </td>
      </tr>
    </table>

    <!-- Section Banner -->
    <div class="section-banner">1. EXTRUDER &amp; DIE ZONE TEMPERATURE TELEMETRY</div>

    <!-- Telemetry Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th rowspan="2" style="width: 22px;">#</th>
          <th rowspan="2" style="width: 44px;">Time</th>
          <th rowspan="2" style="width: 32px;">Photo</th>
          <th colspan="7">Barrel Zone (°C)</th>
          <th colspan="4">Adaptor (°C)</th>
          <th colspan="7">Die Zone (°C)</th>
          <th rowspan="2" style="width: 44px;">Melt T.</th>
          <th colspan="2">Cooling (°C)</th>
          <th rowspan="2" style="width: 48px;">Hot Air</th>
        </tr>
        <tr style="font-size: 6.5pt; background-color: #f8fafc;">
          <th>B1</th>
          <th>B2</th>
          <th>B3</th>
          <th>B4</th>
          <th>B5</th>
          <th>B6</th>
          <th>B7</th>

          <th>Scr.Chg</th>
          <th>AD-1</th>
          <th>AD-2</th>
          <th>Melt.P</th>

          <th>D-1</th>
          <th>D-2</th>
          <th>D-3</th>
          <th>D-4</th>
          <th>D-5</th>
          <th>D-6</th>
          <th>D-7</th>

          <th>H1</th>
          <th>H2</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="total-row">
          <td colspan="3" style="text-align: right; font-weight: 900; text-transform: uppercase;">Average Telemetry (°C):</td>
          <td style="text-align: right; font-family: monospace;">${avgB1}</td>
          <td style="text-align: right; font-family: monospace;">${avgB2}</td>
          <td style="text-align: right; font-family: monospace;">${avgB3}</td>
          <td style="text-align: right; font-family: monospace;">${avgB4}</td>
          <td style="text-align: right; font-family: monospace;">${avgB5}</td>
          <td style="text-align: right; font-family: monospace;">${avgB6}</td>
          <td style="text-align: right; font-family: monospace;">${avgB7}</td>

          <td style="text-align: right; font-family: monospace;">${avgScreen}</td>
          <td style="text-align: right; font-family: monospace;">${avgAd1}</td>
          <td style="text-align: right; font-family: monospace;">${avgAd2}</td>
          <td style="text-align: right; font-family: monospace;">${avgMeltPump}</td>

          <td style="text-align: right; font-family: monospace;">${avgD1}</td>
          <td style="text-align: right; font-family: monospace;">${avgD2}</td>
          <td style="text-align: right; font-family: monospace;">${avgD3}</td>
          <td style="text-align: right; font-family: monospace;">${avgD4}</td>
          <td style="text-align: right; font-family: monospace;">${avgD5}</td>
          <td style="text-align: right; font-family: monospace;">${avgD6}</td>
          <td style="text-align: right; font-family: monospace;">${avgD7}</td>

          <td style="text-align: right; font-family: monospace; font-weight: 900;">${avgMelt}</td>
          <td style="text-align: right; font-family: monospace;">${avgH1}</td>
          <td style="text-align: right; font-family: monospace;">${avgH2}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 900;">${avgHotAir}</td>
        </tr>
      </tbody>
    </table>

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

export function printTapePlantTemperatureSheet(data: TemperaturePrintData): void {
  const html = generateTemperatureSheetHtml(data);

  let iframe = document.getElementById("tape-plant-temp-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "tape-plant-temp-print-iframe";
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
