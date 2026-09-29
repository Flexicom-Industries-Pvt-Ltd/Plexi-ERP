import { LaminationWastageReportData } from "./lamination-wastage-types";

export function generateWastageReportHtml(data: LaminationWastageReportData): string {
  const rmUsed = Number(data.rawMaterialUsedKg.toFixed(2));
  const lumpsKg = Number(data.lumpsWastageKg.toFixed(2));
  const lumpsPct = Number(data.lumpsWastagePct.toFixed(2));

  const fabricBase = Number(data.fabricNetWeightKg.toFixed(2));
  const fabricKg = Number(data.fabricWastageKg.toFixed(2));
  const fabricPct = Number(data.fabricWastagePct.toFixed(2));

  const totalBase = Number(data.totalBaseKg.toFixed(2));
  const totalWaste = Number(data.totalWastageKg.toFixed(2));
  const totalPct = Number(data.totalWastagePct.toFixed(2));

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
  const docRef = `LAM-WS-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lamination Wastage Report - ${data.date} (${data.shiftName})</title>
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
      line-height: 1.35;
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
      margin-bottom: 12px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 6px 8px;
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
      font-size: 11pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 2px;
    }

    /* Fixed-Layout Main Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 8.5pt;
      table-layout: fixed;
    }
    .data-table th {
      background-color: #e2e8f0 !important;
      border: 1px solid #64748b !important;
      padding: 6px 6px;
      font-weight: 900;
      font-size: 8pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1 !important;
      padding: 6px 8px;
      vertical-align: middle;
    }
    tr.totals-row td {
      font-weight: 900 !important;
      font-size: 9pt !important;
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      padding: 7px 8px;
    }

    /* Signatures Strip */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding: 0 20px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 36px;
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
      <div class="doc-main-heading">LAMINATION SHIFT WASTAGE & SCRAP REPORT</div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>Date: <strong>${data.date}</strong></span>
        <span>Shift: <strong>${data.shiftName}</strong></span>
        <span>Operator: <strong>${data.operatorName || "—"}</strong></span>
        <span>Contractor: <strong>${data.contractorName || "—"}</strong></span>
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
        <div class="kpi-label" style="color: #0369a1;">Raw Material Base</div>
        <div class="kpi-val" style="color: #0284c7;">${rmUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })} Kg</div>
      </td>
      <td style="width: 25%; background: #faf5ff;">
        <div class="kpi-label" style="color: #6b21a8;">Fabric Roll Base</div>
        <div class="kpi-val" style="color: #7e22ce;">${fabricBase.toLocaleString(undefined, { minimumFractionDigits: 2 })} Kg</div>
      </td>
      <td style="width: 25%; background: #fff7ed;">
        <div class="kpi-label" style="color: #c2410c;">Total Wastage (Kg)</div>
        <div class="kpi-val" style="color: #ea580c;">${totalWaste.toFixed(2)} Kg</div>
      </td>
      <td style="width: 25%; background: ${totalPct > 2 ? "#fef2f2" : "#f0fdf4"};">
        <div class="kpi-label" style="color: ${totalPct > 2 ? "#b91c1c" : "#15803d"};">Combined Wastage %</div>
        <div class="kpi-val" style="color: ${totalPct > 2 ? "#dc2626" : "#16a34a"};">${totalPct.toFixed(2)}%</div>
      </td>
    </tr>
  </table>

  <!-- Fixed-width Data Table (Strict 100% width budget) -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 26%; text-align: left; padding-left: 10px;">Wastage Type / Stream</th>
        <th style="width: 24%; text-align: left; padding-left: 10px;">Base Origin Module</th>
        <th style="width: 18%;">Base Quantity (kg)</th>
        <th style="width: 16%;">Wastage Qty (kg)</th>
        <th style="width: 16%;">Wastage Ratio %</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight: 700; color: #0f172a; padding-left: 10px;">
          Lumps Wastage
        </td>
        <td style="color: #475569; padding-left: 10px;">
          Raw Material Manual Target
        </td>
        <td style="text-align: right; padding-right: 10px; font-family: monospace;">
          ${rmUsed.toLocaleString(undefined, { minimumFractionDigits: 2 })} kg
        </td>
        <td style="text-align: right; padding-right: 10px; font-family: monospace; font-weight: 700; color: #b45309;">
          ${lumpsKg.toFixed(2)} kg
        </td>
        <td style="text-align: right; padding-right: 10px; font-family: monospace; font-weight: 800; color: ${lumpsPct > 2 ? "#dc2626" : "#15803d"}; background-color: ${lumpsPct > 2 ? "#fef2f2" : "#f0fdf4"};">
          ${Number(lumpsPct.toFixed(2))}%
        </td>
      </tr>
      <tr style="background-color: #f8fafc;">
        <td style="font-weight: 700; color: #0f172a; padding-left: 10px;">
          Fabric Wastage
        </td>
        <td style="color: #475569; padding-left: 10px;">
          Production Sheet Net Weight
        </td>
        <td style="text-align: right; padding-right: 10px; font-family: monospace;">
          ${fabricBase.toLocaleString(undefined, { minimumFractionDigits: 2 })} kg
        </td>
        <td style="text-align: right; padding-right: 10px; font-family: monospace; font-weight: 700; color: #b45309;">
          ${fabricKg.toFixed(2)} kg
        </td>
        <td style="text-align: right; padding-right: 10px; font-family: monospace; font-weight: 800; color: ${fabricPct > 2 ? "#dc2626" : "#15803d"}; background-color: ${fabricPct > 2 ? "#fef2f2" : "#f0fdf4"};">
          ${Number(fabricPct.toFixed(2))}%
        </td>
      </tr>
      <tr class="totals-row">
        <td colspan="2" style="text-align: right; padding-right: 10px;">COMBINED SHIFT TOTAL:</td>
        <td style="text-align: right; padding-right: 10px; font-family: monospace;">${totalBase.toLocaleString(undefined, { minimumFractionDigits: 2 })} kg</td>
        <td style="text-align: right; padding-right: 10px; font-family: monospace; color: #b45309;">${totalWaste.toFixed(2)} kg</td>
        <td style="text-align: right; padding-right: 10px; font-family: monospace; color: ${totalPct > 2 ? "#dc2626" : "#15803d"}; background-color: ${totalPct > 2 ? "#fee2e2" : "#dcfce7"};">${totalPct.toFixed(2)}%</td>
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
      <div class="sig-line">QC / Plant Head</div>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Triggers native browser print via hidden iframe with robust fallback
 */
export function printWastageReport(data: LaminationWastageReportData): void {
  const html = generateWastageReportHtml(data);
  let iframe = document.getElementById("lamination-ws-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "lamination-ws-print-iframe";
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
