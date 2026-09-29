export interface ProductionSummaryPrintData {
  overall: {
    totalShifts: number;
    totalRolls: number;
    totalRollMtrs: number;
    totalNetWtBefore: number;
    totalProductionMtrs: number;
    totalNetWtAfter: number;
    avgCoating: number;
  };
  contractorSummary: Array<{
    contractorName: string;
    shifts: number;
    rolls: number;
    totalProductionMtrs: number;
    totalNetWtAfter: number;
    avgCoating: number;
  }>;
  operatorSummary: Array<{
    operatorName: string;
    shifts: number;
    rolls: number;
    totalProductionMtrs: number;
    totalNetWtAfter: number;
    avgCoating: number;
  }>;
  qualitySummary: Array<{
    quality: string;
    rolls: number;
    totalRollMtrs: number;
    totalProductionMtrs: number;
    totalNetWtAfter: number;
    avgCoating: number;
  }>;
  filters: {
    dateFrom: string;
    dateTo: string;
    shiftFilter?: string;
    contractorFilter?: string;
  };
}

export function generateProductionSummaryHtml(data: ProductionSummaryPrintData): string {
  const { overall, contractorSummary, operatorSummary, qualitySummary, filters } = data;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const contractorRows = (contractorSummary || []).map((c, idx) => `
    <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
      <td style="font-weight: 700; color: #0f172a; padding-left: 8px;">${c.contractorName}</td>
      <td style="text-align: center; font-family: monospace;">${c.shifts}</td>
      <td style="text-align: center; font-family: monospace; font-weight: 700;">${c.rolls}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #0284c7;">${c.totalProductionMtrs.toLocaleString()}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700;">${c.totalNetWtAfter.toFixed(1)}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 800; color: #15803d; background: #f0fdf4;">${c.avgCoating.toFixed(1)}</td>
    </tr>
  `).join("");

  const operatorRows = (operatorSummary || []).map((o, idx) => `
    <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
      <td style="font-weight: 700; color: #0f172a; padding-left: 8px;">${o.operatorName}</td>
      <td style="text-align: center; font-family: monospace;">${o.shifts}</td>
      <td style="text-align: center; font-family: monospace; font-weight: 700;">${o.rolls}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #0284c7;">${o.totalProductionMtrs.toLocaleString()}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700;">${o.totalNetWtAfter.toFixed(1)}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 800; color: #15803d; background: #f0fdf4;">${o.avgCoating.toFixed(1)}</td>
    </tr>
  `).join("");

  const qualityRows = (qualitySummary || []).map((q, idx) => `
    <tr style="${idx % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
      <td style="font-weight: 700; color: #0f172a; padding-left: 8px;">${q.quality}</td>
      <td style="text-align: center; font-family: monospace; font-weight: 700;">${q.rolls}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace;">${q.totalRollMtrs.toLocaleString()}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700; color: #0284c7;">${q.totalProductionMtrs.toLocaleString()}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 700;">${q.totalNetWtAfter.toFixed(1)}</td>
      <td style="text-align: right; padding-right: 8px; font-family: monospace; font-weight: 800; color: #15803d; background: #f0fdf4;">${q.avgCoating.toFixed(1)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lamination Production Summary - ${filters.dateFrom} to ${filters.dateTo}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 8mm 8mm 8mm;
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
      line-height: 1.25;
    }

    /* Enterprise Standard Company Letterhead */
    .company-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 5px;
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
      margin-bottom: 8px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 4px 6px;
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
      font-size: 9pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 1px;
    }

    /* Section Headings */
    .section-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin-top: 8px;
      margin-bottom: 3px;
      border-left: 3px solid #0284c7;
      padding-left: 6px;
    }

    /* Fixed-Layout Main Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 7.5pt;
      table-layout: fixed;
    }
    .data-table th {
      background-color: #e2e8f0 !important;
      border: 1px solid #64748b !important;
      padding: 4px 4px;
      font-weight: 900;
      font-size: 7pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1 !important;
      padding: 3.5px 6px;
      vertical-align: middle;
    }
    tr.totals-row td {
      font-weight: 900 !important;
      font-size: 8pt !important;
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      padding: 4px 6px;
    }

    /* Signatures Strip */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      padding: 0 20px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 24px;
      padding-top: 3px;
      font-weight: 700;
      font-size: 7pt;
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
      <div class="doc-main-heading">LAMINATION PRODUCTION SUMMARY REPORT</div>
      <div class="doc-meta-strip">
        <span>Period: <strong>${filters.dateFrom}</strong> to <strong>${filters.dateTo}</strong></span>
        <span>Shift Filter: <strong>${filters.shiftFilter || "ALL"}</strong></span>
        <span>Contractor Filter: <strong>${filters.contractorFilter || "ALL"}</strong></span>
        <span>Total Shifts: <strong>${overall.totalShifts}</strong></span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>
    <div style="width: 70px; text-align: right;">
      <span style="font-size: 6.5pt; font-weight: 800; border: 1px solid #94a3b8; padding: 2px 4px; background: #f8fafc; border-radius: 2px;">
        A4 LANDSCAPE
      </span>
    </div>
  </div>

  <!-- Overall KPI Strip (6 Cards) -->
  <table class="kpi-table">
    <tr>
      <td style="width: 16%;">
        <div class="kpi-label">Total Shifts</div>
        <div class="kpi-val">${overall.totalShifts}</div>
      </td>
      <td style="width: 16%;">
        <div class="kpi-label">Rolls Processed</div>
        <div class="kpi-val">${overall.totalRolls}</div>
      </td>
      <td style="width: 17%;">
        <div class="kpi-label">Input Net Wt</div>
        <div class="kpi-val">${overall.totalNetWtBefore.toFixed(1)} Kg</div>
      </td>
      <td style="width: 17%; background: #f0f9ff;">
        <div class="kpi-label" style="color: #0369a1;">Output Production Mtrs</div>
        <div class="kpi-val" style="color: #0284c7;">${overall.totalProductionMtrs.toLocaleString()} M</div>
      </td>
      <td style="width: 17%; background: #f0f9ff;">
        <div class="kpi-label" style="color: #0369a1;">Output Net Wt</div>
        <div class="kpi-val" style="color: #0369a1;">${overall.totalNetWtAfter.toFixed(1)} Kg</div>
      </td>
      <td style="width: 17%; background: #f0fdf4;">
        <div class="kpi-label" style="color: #15803d;">Avg Coating</div>
        <div class="kpi-val" style="color: #15803d;">${overall.avgCoating.toFixed(1)} g/m</div>
      </td>
    </tr>
  </table>

  <!-- 1. Contractor Summary Breakdown -->
  <div class="section-title">1. Contractor Production Breakdown</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 32%; text-align: left; padding-left: 8px;">Contractor Name</th>
        <th style="width: 12%;">Shifts</th>
        <th style="width: 12%;">Rolls</th>
        <th style="width: 18%;">Production (Mtrs)</th>
        <th style="width: 14%;">Output Wt (kg)</th>
        <th style="width: 12%;">Avg Coating (g/m)</th>
      </tr>
    </thead>
    <tbody>
      ${contractorRows || `<tr><td colspan="6" style="text-align: center; padding: 12px; color: #64748b;">No contractor data recorded</td></tr>`}
      <tr class="totals-row">
        <td style="padding-left: 8px;">TOTAL CONTRACTOR OUTPUT:</td>
        <td style="text-align: center; font-family: monospace;">${overall.totalShifts}</td>
        <td style="text-align: center; font-family: monospace;">${overall.totalRolls}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #0284c7;">${overall.totalProductionMtrs.toLocaleString()}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace;">${overall.totalNetWtAfter.toFixed(1)}</td>
        <td style="text-align: right; padding-right: 8px; font-family: monospace; color: #15803d; background: #dcfce7;">${overall.avgCoating.toFixed(1)}</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. Quality Summary Breakdown -->
  <div class="section-title">2. Quality-Wise Production Summary</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 32%; text-align: left; padding-left: 8px;">Quality Name</th>
        <th style="width: 12%;">Rolls</th>
        <th style="width: 16%;">Input Roll (Mtrs)</th>
        <th style="width: 16%;">Output Prod (Mtrs)</th>
        <th style="width: 12%;">Output Wt (kg)</th>
        <th style="width: 12%;">Avg Coating (g/m)</th>
      </tr>
    </thead>
    <tbody>
      ${qualityRows || `<tr><td colspan="6" style="text-align: center; padding: 12px; color: #64748b;">No quality data recorded</td></tr>`}
    </tbody>
  </table>

  <!-- Official Signatures -->
  <div class="signatures-container">
    <div class="sig-box">
      <div class="sig-line">Prepared By</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Production Manager</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">General Manager / Plant Head</div>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Triggers native browser print via hidden iframe with robust fallback
 */
export function printProductionSummary(data: ProductionSummaryPrintData): void {
  const html = generateProductionSummaryHtml(data);
  let iframe = document.getElementById("lamination-summary-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "lamination-summary-print-iframe";
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
