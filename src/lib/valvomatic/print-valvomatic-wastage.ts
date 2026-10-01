import {
  ValvomaticWastageReportData,
  computeValvomaticWastageTotals,
} from "./valvomatic-types";

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateValvomaticWastageReportHtml(
  data: ValvomaticWastageReportData
): string {
  const totals = computeValvomaticWastageTotals(data.entries);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(
    /[^a-zA-Z0-9]/g,
    ""
  );
  const docRef = `VLV-WS-${docDate}-${(data.shiftName || "SHIFT")
    .toUpperCase()
    .replace(/\s+/g, "")}-${(data.machineNo || "M1").replace(/[^a-zA-Z0-9]/g, "")}`;

  const rowsHtml =
    data.entries.length > 0
      ? data.entries
          .map((entry, index) => {
            const prodKg = Number(entry.productionKg) || 0;
            const loomWaste = Number(entry.loomWasteKg) || 0;
            const lamWaste = Number(entry.lamWasteKg) || 0;
            const printWaste = Number(entry.printWasteKg) || 0;
            const machWaste = Number(entry.machineWasteKg) || 0;
            const coverWaste = Number(entry.coverPatchWasteKg) || 0;
            const totalWaste = Number(entry.totalWasteKg) || 0;
            const netProd = Number(entry.netProductionKg) || 0;

            return `
            <tr style="${index % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; font-size: 7.5pt; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="font-weight: 700; font-size: 7.5pt; color: #0f172a; background-color: #fffbeb;">
                ${escapeHtml(entry.quality || "—")}
              </td>
              <td style="text-align: center; font-family: monospace; font-size: 7.5pt; font-weight: 800; color: #0f172a; background: #f8fafc;">
                ${escapeHtml(entry.rollNumber || "—")}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #0f766e; background-color: #f0fdfa;">
                ${prodKg > 0 ? prodKg.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">
                ${loomWaste > 0 ? loomWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">
                ${entry.loomWastePct > 0 ? `${entry.loomWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">
                ${lamWaste > 0 ? lamWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">
                ${entry.lamWastePct > 0 ? `${entry.lamWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">
                ${printWaste > 0 ? printWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">
                ${entry.printWastePct > 0 ? `${entry.printWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #334155;">
                ${machWaste > 0 ? machWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">
                ${entry.machineWastePct > 0 ? `${entry.machineWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #4338ca;">
                ${coverWaste > 0 ? coverWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #6366f1;">
                ${entry.coverPatchWastePct > 0 ? `${entry.coverPatchWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 800; color: #b91c1c; background-color: #fef2f2;">
                ${totalWaste > 0 ? totalWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 700; color: #c2410c; background-color: #fff7ed;">
                ${entry.totalWastePct > 0 ? `${entry.totalWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${netProd > 0 ? netProd.toFixed(1) : "—"}
              </td>
              <td style="font-size: 7pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(entry.remarks || "")}
              </td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td colspan="18" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No wastage records entered for this shift.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flexicom - Valvomatic Wastage Report (${escapeHtml(data.date)} - ${escapeHtml(data.shiftName)})</title>
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
      <div class="doc-main-heading">VALVOMATIC WASTAGE & SCRAP ACCOUNTING REPORT</div>
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
        <div class="kpi-val">${data.entries.length}</div>
      </td>
      <td style="background-color: #f0fdfa;">
        <div class="kpi-label" style="color: #115e59;">Gross Prod (Kg)</div>
        <div class="kpi-val" style="color: #0f766e;">${totals.totalProductionKg.toFixed(1)} kg</div>
      </td>
      <td>
        <div class="kpi-label">Loom Waste</div>
        <div class="kpi-val">${totals.totalLoomWasteKg.toFixed(1)} kg</div>
      </td>
      <td>
        <div class="kpi-label">Lam Waste</div>
        <div class="kpi-val">${totals.totalLamWasteKg.toFixed(1)} kg</div>
      </td>
      <td>
        <div class="kpi-label">Print Waste</div>
        <div class="kpi-val">${totals.totalPrintWasteKg.toFixed(1)} kg</div>
      </td>
      <td>
        <div class="kpi-label">Machine Waste</div>
        <div class="kpi-val">${totals.totalMachineWasteKg.toFixed(1)} kg</div>
      </td>
      <td>
        <div class="kpi-label">Cover Patch Waste</div>
        <div class="kpi-val" style="color: #4338ca;">${totals.totalCoverPatchWasteKg.toFixed(1)} kg</div>
      </td>
      <td style="background-color: #fef2f2;">
        <div class="kpi-label" style="color: #991b1b;">Total Waste (Kg)</div>
        <div class="kpi-val" style="color: #b91c1c;">${totals.totalWastageKg.toFixed(1)} kg</div>
      </td>
      <td style="background-color: #fff7ed;">
        <div class="kpi-label" style="color: #9a3412;">Waste %</div>
        <div class="kpi-val" style="color: #c2410c;">${totals.totalWastagePct.toFixed(2)}%</div>
      </td>
      <td style="background-color: #f0fdf4;">
        <div class="kpi-label" style="color: #166534;">Net Prod (Kg)</div>
        <div class="kpi-val" style="color: #15803d;">${totals.totalNetProductionKg.toFixed(1)} kg</div>
      </td>
    </tr>
  </table>

  <!-- Main Fixed-Layout Data Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th rowspan="2" style="width: 2.5%;">Sl.</th>
        <th rowspan="2" style="width: 14%;">Quality</th>
        <th rowspan="2" style="width: 8%;">Roll No.</th>
        <th rowspan="2" style="width: 8%; background-color: #ccfbf1 !important; color: #115e59;">Prod (Kg)</th>
        <th colspan="2" style="width: 9%;">Loom Waste</th>
        <th colspan="2" style="width: 9%;">Lam Waste</th>
        <th colspan="2" style="width: 9%;">Print Waste</th>
        <th colspan="2" style="width: 9%;">Machine Waste</th>
        <th colspan="2" style="width: 9%;">Cover Patch Waste</th>
        <th colspan="2" style="width: 11%; background-color: #fee2e2 !important; color: #991b1b;">Total Waste</th>
        <th rowspan="2" style="width: 8.5%; background-color: #dcfce7 !important; color: #166534;">Net Prod (Kg)</th>
        <th rowspan="2" style="width: 10%;">Remarks</th>
      </tr>
      <tr>
        <th style="width: 5%;">Kg</th>
        <th style="width: 4%;">%</th>
        <th style="width: 5%;">Kg</th>
        <th style="width: 4%;">%</th>
        <th style="width: 5%;">Kg</th>
        <th style="width: 4%;">%</th>
        <th style="width: 5%;">Kg</th>
        <th style="width: 4%;">%</th>
        <th style="width: 5%;">Kg</th>
        <th style="width: 4%;">%</th>
        <th style="width: 6%; background-color: #fee2e2 !important; color: #991b1b;">Kg</th>
        <th style="width: 5%; background-color: #fee2e2 !important; color: #991b1b;">%</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="totals-row">
        <td style="text-align: center;">Σ</td>
        <td colspan="2" style="font-weight: 800; text-transform: uppercase;">Totals / Overall Wastage</td>
        <td style="text-align: right; font-family: monospace; color: #0f766e;">${totals.totalProductionKg.toFixed(1)} kg</td>
        <td style="text-align: right; font-family: monospace;">${totals.totalLoomWasteKg.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totals.totalLoomWastePct.toFixed(2)}%</td>
        <td style="text-align: right; font-family: monospace;">${totals.totalLamWasteKg.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totals.totalLamWastePct.toFixed(2)}%</td>
        <td style="text-align: right; font-family: monospace;">${totals.totalPrintWasteKg.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totals.totalPrintWastePct.toFixed(2)}%</td>
        <td style="text-align: right; font-family: monospace;">${totals.totalMachineWasteKg.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">${totals.totalMachineWastePct.toFixed(2)}%</td>
        <td style="text-align: right; font-family: monospace; color: #4338ca;">${totals.totalCoverPatchWasteKg.toFixed(2)}</td>
        <td style="text-align: right; font-family: monospace; font-size: 6.5pt; color: #6366f1;">${totals.totalCoverPatchWastePct.toFixed(2)}%</td>
        <td style="text-align: right; font-family: monospace; color: #b91c1c;">${totals.totalWastageKg.toFixed(2)} kg</td>
        <td style="text-align: right; font-family: monospace; color: #c2410c;">${totals.totalWastagePct.toFixed(2)}%</td>
        <td style="text-align: right; font-family: monospace; color: #15803d;">${totals.totalNetProductionKg.toFixed(1)} kg</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  ${data.remarks ? `
    <div style="margin-top: 4px; padding: 4px 6px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 7pt; color: #334155;">
      <strong>Wastage Notes / Observations:</strong> ${escapeHtml(data.remarks)}
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

export function printValvomaticWastageReport(data: ValvomaticWastageReportData): void {
  const html = generateValvomaticWastageReportHtml(data);
  let iframe = document.getElementById("valvomatic-wastage-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "valvomatic-wastage-print-iframe";
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
