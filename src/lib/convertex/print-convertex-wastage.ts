import {
  ConvertexWastageReportData,
  computeConvertexWastageTotals,
} from "./convertex-types";

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateConvertexWastageReportHtml(
  data: ConvertexWastageReportData
): string {
  const totals = computeConvertexWastageTotals(data.entries);
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
  const docRef = `CVX-WST-${docDate}-${(data.shiftName || "SHIFT")
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
              <td style="text-align: center; font-weight: 700; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="color: #0f172a; font-weight: 700; background-color: #fffbeb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">
                ${escapeHtml(entry.quality || "—")}
              </td>
              <td style="text-align: center; font-family: monospace; font-weight: 800; color: #0f172a; background: #f8fafc;">
                ${escapeHtml(entry.rollNumber || "—")}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; color: #0f766e; background-color: #f0fdfa;">
                ${prodKg > 0 ? prodKg.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #334155;">
                ${loomWaste > 0 ? loomWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #64748b; font-size: 6pt;">
                ${entry.loomWastePct > 0 ? `${entry.loomWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #334155;">
                ${lamWaste > 0 ? lamWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #64748b; font-size: 6pt;">
                ${entry.lamWastePct > 0 ? `${entry.lamWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #334155;">
                ${printWaste > 0 ? printWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #64748b; font-size: 6pt;">
                ${entry.printWastePct > 0 ? `${entry.printWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #334155;">
                ${machWaste > 0 ? machWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #64748b; font-size: 6pt;">
                ${entry.machineWastePct > 0 ? `${entry.machineWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #4338ca;">
                ${coverWaste > 0 ? coverWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #6366f1; font-size: 6pt;">
                ${entry.coverPatchWastePct > 0 ? `${entry.coverPatchWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: #b91c1c; background-color: #fef2f2;">
                ${totalWaste > 0 ? totalWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; color: #c2410c; background-color: #fff7ed;">
                ${entry.totalWastePct > 0 ? `${entry.totalWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${netProd > 0 ? netProd.toFixed(1) : "—"}
              </td>
              <td style="font-size: 6.5pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;">
                ${escapeHtml(entry.remarks || "")}
              </td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td colspan="18" style="text-align: center; padding: 14px; color: #64748b; font-style: italic;">No wastage records logged for this shift.</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Convertex Wastage Report — ${escapeHtml(data.date)} (${escapeHtml(data.shiftName)})</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 7mm 8mm 7mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 7.5pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 4px;
    }
    .meta-strip {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
    }
    .meta-strip td {
      padding: 4px 6px;
      font-size: 7pt;
      vertical-align: middle;
    }
    .kpi-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 4px;
      margin-bottom: 6px;
    }
    .kpi-cell {
      padding: 4px 6px;
      border-radius: 4px;
      text-align: center;
      border: 1px solid #cbd5e1;
      background: #ffffff;
    }
    .kpi-label {
      font-size: 5.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 1px;
    }
    .kpi-value {
      font-size: 9.5pt;
      font-weight: 800;
      font-family: monospace;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.8pt;
      table-layout: fixed;
    }
    .data-table th, .data-table td {
      border: 0.5pt solid #cbd5e1;
      padding: 2.5px 3px;
    }
    .data-table th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      font-size: 6pt;
    }
    .sub-head {
      background-color: #1e293b !important;
      font-size: 5.5pt !important;
    }
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    .sign-box {
      border: 0.5pt solid #cbd5e1;
      height: 38px;
      vertical-align: bottom;
      padding: 3px 6px;
      font-size: 6.5pt;
      color: #475569;
      background: #fafafa;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <table class="header-table">
    <tr>
      <td style="width: 20%; vertical-align: middle;">
        <img src="${origin}/flexicom-logo.png" alt="Flexicom" style="height: 32px; object-fit: contain;" onerror="this.style.display='none'" />
        <div style="font-size: 6.5pt; color: #64748b; font-weight: 600; margin-top: 2px;">Doc Ref: ${escapeHtml(docRef)}</div>
      </td>
      <td style="text-align: center; vertical-align: middle;">
        <div style="font-size: 13pt; font-weight: 900; letter-spacing: 0.5px; color: #0f172a;">
          FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA
        </div>
        <div style="font-size: 9pt; font-weight: 800; color: #e11d48; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 1px;">
          CONVERTEX MACHINE - SHIFT WASTAGE REPORT
        </div>
        <div style="font-size: 6.5pt; color: #475569; margin-top: 1px;">
          Wastage Categorisation & Net Conversion Tracking
        </div>
      </td>
      <td style="width: 22%; text-align: right; vertical-align: middle; font-size: 6.5pt; color: #475569;">
        <div><strong>Status:</strong> <span style="font-weight: 800; color: ${data.status === "APPROVED" ? "#16a34a" : data.status === "SUBMITTED" ? "#2563eb" : "#d97706"};">${escapeHtml(data.status)}</span></div>
        <div><strong>Printed:</strong> ${escapeHtml(genTimestamp)}</div>
      </td>
    </tr>
  </table>

  <!-- METADATA STRIP -->
  <table class="meta-strip">
    <tr>
      <td><strong>Date:</strong> ${escapeHtml(data.date)}</td>
      <td><strong>Shift:</strong> ${escapeHtml(data.shiftName)}</td>
      <td><strong>Machine No.:</strong> ${escapeHtml(data.machineNo || "Convertex-1")}</td>
      <td><strong>Operator:</strong> ${escapeHtml(data.operatorName || "—")}</td>
      <td><strong>Supervisor:</strong> ${escapeHtml(data.supervisorName || "—")}</td>
    </tr>
  </table>

  <!-- KPI SUMMARY CARDS -->
  <table class="kpi-table">
    <tr>
      <td class="kpi-cell" style="border-left: 2.5px solid #0f766e; background-color: #f0fdfa;">
        <div class="kpi-label" style="color: #115e59;">Production (Kg)</div>
        <div class="kpi-value" style="color: #115e59;">${totals.totalProductionKg.toFixed(1)} kg</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #0284c7;">
        <div class="kpi-label">Loom Waste</div>
        <div class="kpi-value" style="color: #0284c7;">${totals.totalLoomWasteKg.toFixed(2)} kg</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #0369a1;">
        <div class="kpi-label">Lam Waste</div>
        <div class="kpi-value" style="color: #0369a1;">${totals.totalLamWasteKg.toFixed(2)} kg</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #7c3aed;">
        <div class="kpi-label">Print Waste</div>
        <div class="kpi-value" style="color: #7c3aed;">${totals.totalPrintWasteKg.toFixed(2)} kg</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #d97706;">
        <div class="kpi-label">Machine Waste</div>
        <div class="kpi-value" style="color: #d97706;">${totals.totalMachineWasteKg.toFixed(2)} kg</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #4338ca;">
        <div class="kpi-label">Cover Patch Waste</div>
        <div class="kpi-value" style="color: #4338ca;">${totals.totalCoverPatchWasteKg.toFixed(2)} kg</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #e11d48; background-color: #fff1f2;">
        <div class="kpi-label" style="color: #9f1239;">Total Waste</div>
        <div class="kpi-value" style="color: #9f1239;">
          ${totals.totalWastageKg.toFixed(2)} kg (${totals.totalWastagePct.toFixed(2)}%)
        </div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #16a34a; background-color: #f0fdf4;">
        <div class="kpi-label" style="color: #166534;">Net Production</div>
        <div class="kpi-value" style="color: #166534;">${totals.totalNetProductionKg.toFixed(1)} kg</div>
      </td>
    </tr>
  </table>

  <!-- MAIN WASTAGE TABLE -->
  <table class="data-table">
    <thead>
      <tr>
        <th rowspan="2" style="width: 20px; text-align: center;">Sl.</th>
        <th rowspan="2" style="width: 100px; text-align: left; background-color: #1e293b; color: #fde047;">Quality</th>
        <th rowspan="2" style="width: 60px; text-align: center;">Roll No.</th>
        <th rowspan="2" style="width: 55px; text-align: right; background-color: #134e4a; color: #5eead4;">Prod (Kg)</th>
        <th colspan="2" style="text-align: center; background-color: #0369a1;">Loom Waste</th>
        <th colspan="2" style="text-align: center; background-color: #0284c7;">Lam Waste</th>
        <th colspan="2" style="text-align: center; background-color: #6366f1;">Print Waste</th>
        <th colspan="2" style="text-align: center; background-color: #b45309;">Machine Waste</th>
        <th colspan="2" style="text-align: center; background-color: #4338ca;">Cover Patch Waste</th>
        <th colspan="2" style="text-align: center; background-color: #991b1b; color: #fca5a5;">Total Waste</th>
        <th rowspan="2" style="width: 55px; text-align: right; background-color: #14532d; color: #86efac;">Net Prod (Kg)</th>
        <th rowspan="2" style="width: 70px; text-align: left;">Remarks</th>
      </tr>
      <tr>
        <th class="sub-head" style="width: 32px; text-align: right;">Kg</th>
        <th class="sub-head" style="width: 28px; text-align: right;">%</th>
        <th class="sub-head" style="width: 32px; text-align: right;">Kg</th>
        <th class="sub-head" style="width: 28px; text-align: right;">%</th>
        <th class="sub-head" style="width: 32px; text-align: right;">Kg</th>
        <th class="sub-head" style="width: 28px; text-align: right;">%</th>
        <th class="sub-head" style="width: 32px; text-align: right;">Kg</th>
        <th class="sub-head" style="width: 28px; text-align: right;">%</th>
        <th class="sub-head" style="width: 32px; text-align: right;">Kg</th>
        <th class="sub-head" style="width: 28px; text-align: right;">%</th>
        <th class="sub-head" style="width: 36px; text-align: right; background-color: #7f1d1d;">Kg</th>
        <th class="sub-head" style="width: 30px; text-align: right; background-color: #7f1d1d;">%</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 1.5pt solid #0f172a;">
        <td colspan="3" style="text-align: right; text-transform: uppercase;">TOTALS (${data.entries.length} ROLLS):</td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; color: #0f766e; background-color: #ccfbf1;">
          ${totals.totalProductionKg > 0 ? totals.totalProductionKg.toFixed(1) : "—"}
        </td>
        <td style="text-align: right; font-family: monospace;">
          ${totals.totalLoomWasteKg > 0 ? totals.totalLoomWasteKg.toFixed(2) : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; color: #64748b; font-size: 6pt;">
          ${totals.totalLoomWastePct > 0 ? `${totals.totalLoomWastePct.toFixed(2)}%` : "—"}
        </td>
        <td style="text-align: right; font-family: monospace;">
          ${totals.totalLamWasteKg > 0 ? totals.totalLamWasteKg.toFixed(2) : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; color: #64748b; font-size: 6pt;">
          ${totals.totalLamWastePct > 0 ? `${totals.totalLamWastePct.toFixed(2)}%` : "—"}
        </td>
        <td style="text-align: right; font-family: monospace;">
          ${totals.totalPrintWasteKg > 0 ? totals.totalPrintWasteKg.toFixed(2) : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; color: #64748b; font-size: 6pt;">
          ${totals.totalPrintWastePct > 0 ? `${totals.totalPrintWastePct.toFixed(2)}%` : "—"}
        </td>
        <td style="text-align: right; font-family: monospace;">
          ${totals.totalMachineWasteKg > 0 ? totals.totalMachineWasteKg.toFixed(2) : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; color: #64748b; font-size: 6pt;">
          ${totals.totalMachineWastePct > 0 ? `${totals.totalMachineWastePct.toFixed(2)}%` : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; color: #4338ca;">
          ${totals.totalCoverPatchWasteKg > 0 ? totals.totalCoverPatchWasteKg.toFixed(2) : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; color: #6366f1; font-size: 6pt;">
          ${totals.totalCoverPatchWastePct > 0 ? `${totals.totalCoverPatchWastePct.toFixed(2)}%` : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 900; color: #991b1b; background-color: #fee2e2;">
          ${totals.totalWastageKg > 0 ? totals.totalWastageKg.toFixed(2) : "0.00"}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 7pt; font-weight: 800; color: #c2410c; background-color: #ffedd5;">
          ${totals.totalWastagePct > 0 ? `${totals.totalWastagePct.toFixed(2)}%` : "0.00%"}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 900; color: #14532d; background-color: #dcfce7;">
          ${totals.totalNetProductionKg > 0 ? totals.totalNetProductionKg.toFixed(1) : "—"}
        </td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <!-- REMARKS IF ANY -->
  ${
    data.remarks
      ? `
    <div style="margin-top: 6px; padding: 4px 6px; border: 0.5pt solid #cbd5e1; border-radius: 3px; background: #fffbeb; font-size: 6.5pt; color: #78350f;">
      <strong>Remarks & Observations:</strong> ${escapeHtml(data.remarks)}
    </div>
  `
      : ""
  }

  <!-- SIGNATURES -->
  <table class="sign-table">
    <tr>
      <td class="sign-box" style="width: 25%;">
        Operator Signature<br>
        <strong style="color: #0f172a;">${escapeHtml(data.operatorName || "_______________")}</strong>
      </td>
      <td class="sign-box" style="width: 25%;">
        Shift Supervisor<br>
        <strong style="color: #0f172a;">${escapeHtml(data.supervisorName || "_______________")}</strong>
      </td>
      <td class="sign-box" style="width: 25%;">
        Quality Control Inspector<br>
        <strong style="color: #0f172a;">_______________</strong>
      </td>
      <td class="sign-box" style="width: 25%;">
        Production Manager / Factory Head<br>
        <strong style="color: #0f172a;">_______________</strong>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function printConvertexWastageReport(
  data: ConvertexWastageReportData
): void {
  const html = generateConvertexWastageReportHtml(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print the report.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
