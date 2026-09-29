import { LaminationRawMaterialReportData } from "./lamination-raw-material-types";

export function generateRawMaterialReportHtml(data: LaminationRawMaterialReportData): string {
  const manualTotal = Number(data.manualTotalKg.toFixed(2));
  const machineTotal = Number(data.machineTotalKg.toFixed(2));
  const diffTotal = Number(data.diffTotalKg.toFixed(2));
  const totalPercentage = Number(
    data.entries.reduce((sum, e) => sum + (Number(e.percentage) || 0), 0).toFixed(1)
  );
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LAM-RM-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  const rowsHtml = (data.entries || []).length > 0
    ? data.entries
        .map((e, idx) => {
          const diffVal = Number(e.diffKg.toFixed(2));
          const diffColor = diffVal > 0 ? "#15803d" : diffVal < 0 ? "#b45309" : "#334155";
          const diffSign = diffVal > 0 ? `+${diffVal}` : `${diffVal}`;

          return `
            <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; color: #475569;">${idx + 1}</td>
              <td style="font-weight: 700; text-align: left; padding-left: 8px; color: #0f172a;">${e.materialName}</td>
              <td style="text-align: right; padding-right: 8px; font-weight: 700; color: #0284c7; background-color: #f0f9ff;">${Number(e.percentage).toFixed(1)}%</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700;">${Number(e.manualKg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700;">${Number(e.machineKg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 800; color: ${diffColor}; background-color: ${diffVal > 0 ? "#f0fdf4" : diffVal < 0 ? "#fffbeb" : "#f8fafc"};">${diffSign}</td>
              <td style="text-align: left; padding-left: 6px; font-size: 7.5pt; color: #64748b;">${e.remarks || "—"}</td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">No raw material consumption entries recorded.</td></tr>`;

  const netDiffSign = diffTotal > 0 ? `+${diffTotal}` : `${diffTotal}`;
  const netDiffColor = diffTotal > 0 ? "#15803d" : diffTotal < 0 ? "#b45309" : "#0f172a";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lamination Raw Material Consumption - ${data.date} (${data.shiftName})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 10mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 8pt;
      color: #0f172a;
      background: #ffffff;
      padding: 4px;
      line-height: 1.3;
    }

    /* Enterprise Standard Company Letterhead */
    .company-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 8px;
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
      font-size: 6.5pt;
      color: #334155;
      margin-top: 2px;
    }
    .doc-meta-strip strong {
      color: #000000;
    }

    /* KPI Summary Row */
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      text-align: center;
    }
    .kpi-label {
      font-size: 6pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
    .kpi-val {
      font-size: 10pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 1px;
    }

    /* Fixed-Layout Main Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8pt;
      table-layout: fixed;
    }
    .data-table th {
      background-color: #e2e8f0 !important;
      border: 1px solid #64748b !important;
      padding: 5px 4px;
      font-weight: 900;
      font-size: 7.5pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1 !important;
      padding: 5px 6px;
      vertical-align: middle;
    }
    tr.totals-row td {
      font-weight: 900 !important;
      font-size: 8.5pt !important;
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      padding: 6px 6px;
    }

    /* Signatures Strip */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding: 0 20px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 32px;
      padding-top: 4px;
      font-weight: 700;
      font-size: 7.5pt;
      text-transform: uppercase;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <!-- Standardized Letterhead Strip -->
  <div class="company-header">
    <div style="width: 70px;">
      <img src="${origin}/logo.png" style="height: 38px; width: auto;" onerror="this.style.display='none'" />
    </div>
    <div style="flex: 1; text-align: center;">
      <div class="company-title">FLEXICOM INDUSTRIES PVT. LIMITED</div>
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • LAMINATION DIVISION</div>
      <div class="doc-main-heading">LAMINATION RAW MATERIAL CONSUMPTION & VARIANCE REPORT</div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>Date: <strong>${data.date}</strong></span>
        <span>Shift: <strong>${data.shiftName}</strong></span>
        <span>Operator: <strong>${data.operatorName || "—"}</strong></span>
        <span>Status: <strong>${data.status || "DRAFT"}</strong></span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>
    <div style="width: 70px; text-align: right;">
      <span style="font-size: 6.5pt; font-weight: 800; border: 1px solid #94a3b8; padding: 2px 4px; background: #f8fafc; border-radius: 2px;">
        A4 PORTRAIT
      </span>
    </div>
  </div>

  <!-- KPI Strip (4 Cards) -->
  <table class="kpi-table">
    <tr>
      <td style="width: 25%; background: #f0f9ff;">
        <div class="kpi-label" style="color: #0369a1;">Manual Target (kg)</div>
        <div class="kpi-val" style="color: #0284c7;">${manualTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} Kg</div>
      </td>
      <td style="width: 25%; background: #faf5ff;">
        <div class="kpi-label" style="color: #6b21a8;">Machine Actual (kg)</div>
        <div class="kpi-val" style="color: #7e22ce;">${machineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} Kg</div>
      </td>
      <td style="width: 25%; background: ${diffTotal > 0 ? "#f0fdf4" : diffTotal < 0 ? "#fffbeb" : "#f8fafc"};">
        <div class="kpi-label" style="color: ${netDiffColor};">Net Variance (Diff)</div>
        <div class="kpi-val" style="color: ${netDiffColor};">${netDiffSign} Kg</div>
      </td>
      <td style="width: 25%;">
        <div class="kpi-label">Recipe Target Sum</div>
        <div class="kpi-val">${totalPercentage}%</div>
      </td>
    </tr>
  </table>

  <!-- Fixed-width Data Table (Strict 100% width budget) -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 6%;">Sr</th>
        <th style="width: 28%; text-align: left; padding-left: 8px;">Raw Material Name</th>
        <th style="width: 12%;">Recipe %</th>
        <th style="width: 16%;">Manual Target (kg)</th>
        <th style="width: 16%;">Machine Actual (kg)</th>
        <th style="width: 12%;">Diff (kg)</th>
        <th style="width: 10%;">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="totals-row">
        <td colspan="2" style="text-align: right; padding-right: 8px;">SHIFT TOTAL:</td>
        <td style="text-align: right; padding-right: 8px; color: #0284c7;">${totalPercentage}%</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace;">${manualTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace;">${machineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: ${netDiffColor};">${netDiffSign}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <!-- Official Signatures -->
  <div class="signatures-container">
    <div class="sig-box">
      <div class="sig-line">Operator / Technician</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Shift Incharge</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Plant Head / QA</div>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Triggers native browser print via hidden iframe with robust fallback
 */
export function printRawMaterialReport(data: LaminationRawMaterialReportData): void {
  const html = generateRawMaterialReportHtml(data);
  let iframe = document.getElementById("lamination-rm-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "lamination-rm-print-iframe";
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

    const triggerPrint = () => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print failed, falling back to window print", err);
        fallbackWindowPrint(html);
      }
    };

    setTimeout(triggerPrint, 250);
  } else {
    fallbackWindowPrint(html);
  }
}

function fallbackWindowPrint(html: string): void {
  const win = window.open("", "_blank", "width=1100,height=800");
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
