import { ValvomaticDailyReportData, computeValvomaticTotals } from "./valvomatic-types";

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateValvomaticReportHtml(data: ValvomaticDailyReportData): string {
  const totals = computeValvomaticTotals(data.entries);
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
  const docRef = `VLV-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}-${(data.machineNo || "M1").replace(/[^a-zA-Z0-9]/g, "")}`;

  const rowsHtml =
    data.entries.length > 0
      ? data.entries
          .map((entry, index) => {
            const targetPcs = Number(entry.targetProductionPcs) || 0;
            const rollMtr = Number(entry.rollMtr) || 0;
            const netWt = Number(entry.netWeight) || 0;
            const avg = Number(entry.avgWeight) || 0;
            const openReading = Number(entry.openingMeterReading) || 0;
            const closeReading = Number(entry.closingMeterReading) || 0;
            const coverOs = Number(entry.coverPatchOs) || 0;
            const coverDs = Number(entry.coverPatchDs) || 0;
            const valve = Number(entry.valvePatch) || 0;
            const prodPcs = Number(entry.productionPcs) || 0;
            const prodKg = Number(entry.productionKg) || 0;

            return `
            <tr style="${index % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="font-weight: 700; font-size: 7.5pt; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(entry.companyName || "—")}
              </td>
              <td style="font-size: 7.5pt; color: #334155; text-align: center;">
                ${escapeHtml(entry.unitName || "—")}
              </td>
              <td style="font-size: 7.5pt; color: #334155; text-align: center;">
                ${escapeHtml(entry.grade || "—")}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #1e40af;">
                ${targetPcs > 0 ? targetPcs.toLocaleString() : "—"}
              </td>
              <td style="font-weight: 700; font-size: 7.5pt; color: #0f172a; background-color: #fffbeb;">
                ${escapeHtml(entry.quality || entry.partyName || "—")}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 800; color: #0f172a; background: #f8fafc;">
                ${escapeHtml(entry.rollNumber || "—")}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #0284c7;">
                ${entry.loomNumber ? `#${escapeHtml(entry.loomNumber)}` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #334155;">
                ${rollMtr > 0 ? rollMtr.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">
                ${netWt > 0 ? netWt.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #0369a1; background-color: #f0f9ff;">
                ${avg > 0 ? avg.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #64748b;">
                ${openReading > 0 ? openReading.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #64748b;">
                ${closeReading > 0 ? closeReading.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #4338ca; background-color: #eef2ff;">
                ${coverOs > 0 ? coverOs.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #4338ca; background-color: #eef2ff;">
                ${coverDs > 0 ? coverDs.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #3730a3; background-color: #e0e7ff; font-weight: 700;">
                ${valve > 0 ? valve.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${prodPcs > 0 ? prodPcs.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #0f766e; background-color: #f0fdfa;">
                ${prodKg > 0 ? prodKg.toFixed(1) : "—"}
              </td>
              <td style="font-size: 7pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(entry.remarks || "")}
              </td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td colspan="19" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No production rolls recorded for this shift.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flexicom - Valvomatic Daily Production Report (${escapeHtml(data.date)} - ${escapeHtml(data.shiftName)})</title>
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
      font-size: 7.5pt;
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
      margin-bottom: 5px;
      background-color: #f8fafc;
      border: 1px solid #94a3b8;
    }
    .kpi-table td {
      padding: 3px 5px;
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
      font-size: 8.5pt;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
      margin-top: 1px;
    }

    /* Fixed-Layout Main Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 7pt;
      table-layout: fixed;
    }
    .data-table th {
      background-color: #e2e8f0 !important;
      border: 1px solid #64748b !important;
      padding: 3px 2px;
      font-weight: 900;
      font-size: 6.5pt;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .data-table td {
      border: 1px solid #cbd5e1 !important;
      padding: 3px 3px;
      vertical-align: middle;
    }
    tr.totals-row td {
      font-weight: 900 !important;
      font-size: 7.5pt !important;
      background-color: #f1f5f9 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      padding: 4px 3px;
    }

    /* Signatures Strip */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      padding: 0 16px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 160px;
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
      <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • VALVOMATIC DIVISION</div>
      <div class="doc-main-heading">VALVOMATIC MACHINE DAILY PRODUCTION REPORT</div>
      <div class="doc-meta-strip">
        <span>Doc Ref: <strong>${docRef}</strong></span>
        <span>Date: <strong>${escapeHtml(data.date)}</strong></span>
        <span>Shift: <strong>${escapeHtml(data.shiftName)}</strong></span>
        <span>Machine: <strong>${escapeHtml(data.machineNo || "Valvomatic-1")}</strong></span>
        <span>Supervisor: <strong>${escapeHtml(data.supervisorName || "—")}</strong></span>
        <span>Operator: <strong>${escapeHtml(data.operatorName || "—")}</strong></span>
        <span>Status: <strong>${escapeHtml(data.status)}</strong></span>
        <span>Generated: <strong>${genTimestamp}</strong></span>
      </div>
    </div>
    <div style="width: 70px; text-align: right;">
      <span style="font-size: 6.5pt; font-weight: 800; border: 1px solid #94a3b8; padding: 2px 4px; background: #f8fafc; border-radius: 2px;">
        A4 LANDSCAPE
      </span>
    </div>
  </div>

  <!-- Standard KPI Table Strip -->
  <table class="kpi-table">
    <tr>
      <td>
        <div class="kpi-label">Total Rolls</div>
        <div class="kpi-val">${totals.totalRolls}</div>
      </td>
      <td>
        <div class="kpi-label">Target Prod (pcs)</div>
        <div class="kpi-val" style="color: #1e40af;">${totals.totalTargetPcs.toLocaleString()}</div>
      </td>
      <td>
        <div class="kpi-label">Roll Metres (m)</div>
        <div class="kpi-val" style="color: #0284c7;">${totals.totalRollMtr.toLocaleString()}</div>
      </td>
      <td>
        <div class="kpi-label">Net Fabric Wt (kg)</div>
        <div class="kpi-val">${totals.totalNetWt.toFixed(1)}</div>
      </td>
      <td>
        <div class="kpi-label">Avg Weight (g/m)</div>
        <div class="kpi-val" style="color: #0369a1;">${totals.avgWeightGsm.toFixed(1)}</div>
      </td>
      <td>
        <div class="kpi-label">Cover Patch (OS / DS)</div>
        <div class="kpi-val" style="color: #4338ca; font-size: 7.5pt;">
          OS: ${totals.totalCoverPatchOs} | DS: ${totals.totalCoverPatchDs}
        </div>
      </td>
      <td>
        <div class="kpi-label">Valve Patch</div>
        <div class="kpi-val" style="color: #3730a3;">${totals.totalValvePatch}</div>
      </td>
      <td style="background-color: #f0fdf4;">
        <div class="kpi-label" style="color: #166534;">Production (Pcs)</div>
        <div class="kpi-val" style="color: #15803d;">${totals.totalProductionPcs.toLocaleString()}</div>
      </td>
      <td style="background-color: #f0fdfa;">
        <div class="kpi-label" style="color: #115e59;">Production (Kg)</div>
        <div class="kpi-val" style="color: #0f766e;">${totals.totalProductionKg.toFixed(1)} kg</div>
      </td>
    </tr>
  </table>

  <!-- Main Fixed-Layout Data Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th rowspan="2" style="width: 2.5%;">Sl.</th>
        <th rowspan="2" style="width: 9%;">Company Name</th>
        <th rowspan="2" style="width: 5%;">Unit</th>
        <th rowspan="2" style="width: 4%;">Grade</th>
        <th rowspan="2" style="width: 6%;">Target (Pcs)</th>
        <th rowspan="2" style="width: 9%;">Quality</th>
        <th rowspan="2" style="width: 6%;">Roll No.</th>
        <th rowspan="2" style="width: 4.5%;">Loom</th>
        <th rowspan="2" style="width: 6%;">Roll Mtr</th>
        <th rowspan="2" style="width: 5%;">Net Wt</th>
        <th rowspan="2" style="width: 5%;">Avg</th>
        <th rowspan="2" style="width: 5.5%;">Opening</th>
        <th rowspan="2" style="width: 5.5%;">Closing</th>
        <th colspan="2" style="width: 9%; background-color: #cbd5e1 !important;">Cover Patch</th>
        <th rowspan="2" style="width: 5%;">Valve</th>
        <th rowspan="2" style="width: 7%; background-color: #dcfce7 !important; color: #166534;">Prod (Pcs)</th>
        <th rowspan="2" style="width: 6.5%; background-color: #ccfbf1 !important; color: #115e59;">Prod (Kg)</th>
        <th rowspan="2" style="width: 8.5%;">Remarks</th>
      </tr>
      <tr>
        <th style="width: 4.5%;">OS</th>
        <th style="width: 4.5%;">DS</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="totals-row">
        <td style="text-align: center;">Σ</td>
        <td colspan="3" style="font-weight: 800; text-transform: uppercase;">Totals / Shift Overall</td>
        <td style="text-align: right; font-family: monospace; color: #1e40af;">${totals.totalTargetPcs.toLocaleString()}</td>
        <td colspan="3"></td>
        <td style="text-align: right; font-family: monospace; color: #0284c7;">${totals.totalRollMtr.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace;">${totals.totalNetWt.toFixed(1)}</td>
        <td style="text-align: right; font-family: monospace; color: #0369a1;">${totals.avgWeightGsm.toFixed(1)}</td>
        <td colspan="2"></td>
        <td style="text-align: right; font-family: monospace; color: #4338ca;">${totals.totalCoverPatchOs}</td>
        <td style="text-align: right; font-family: monospace; color: #4338ca;">${totals.totalCoverPatchDs}</td>
        <td style="text-align: right; font-family: monospace; color: #3730a3;">${totals.totalValvePatch}</td>
        <td style="text-align: right; font-family: monospace; color: #15803d;">${totals.totalProductionPcs.toLocaleString()}</td>
        <td style="text-align: right; font-family: monospace; color: #0f766e;">${totals.totalProductionKg.toFixed(1)} kg</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  ${data.remarks ? `
    <div style="margin-top: 4px; padding: 4px 6px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 7pt; color: #334155;">
      <strong>Shift Remarks / Observations:</strong> ${escapeHtml(data.remarks)}
    </div>
  ` : ""}

  <!-- Standard 4-Block Signatures Strip -->
  <div class="signatures-container">
    <div class="sig-box">
      <div class="sig-line">Operator Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Supervisor Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Quality In-Charge</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Plant Head / Manager</div>
    </div>
  </div>
</body>
</html>`;
}

export function printValvomaticReport(data: ValvomaticDailyReportData): void {
  const html = generateValvomaticReportHtml(data);
  let iframe = document.getElementById("valvomatic-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "valvomatic-print-iframe";
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
    win.onload = () => {
      win.focus();
      win.print();
    };
  }
}
