import { ConvertexDailyReportData, computeConvertexTotals } from "./convertex-types";

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateConvertexReportHtml(data: ConvertexDailyReportData): string {
  const totals = computeConvertexTotals(data.entries);
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
  const docRef = `CVX-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}-${(data.machineNo || "M1").replace(/[^a-zA-Z0-9]/g, "")}`;

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
              <td style="text-align: center; font-weight: 700; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px;">
                ${escapeHtml(entry.companyName || "—")}
              </td>
              <td style="color: #334155; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px;">
                ${escapeHtml(entry.unitName || "—")}
              </td>
              <td style="color: #334155; text-align: center;">
                ${escapeHtml(entry.grade || "—")}
              </td>
              <td style="text-align: right; font-family: monospace; color: #1e40af;">
                ${targetPcs > 0 ? targetPcs.toLocaleString() : "—"}
              </td>
              <td style="color: #0f172a; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; background-color: #fffbeb;">
                ${escapeHtml(entry.quality || entry.partyName || "—")}
              </td>
              <td style="text-align: center; font-family: monospace; font-weight: 800; color: #0f172a; background: #f8fafc;">
                ${escapeHtml(entry.rollNumber || "—")}
              </td>
              <td style="text-align: center; font-family: monospace; font-weight: 700; color: #0284c7;">
                ${entry.loomNumber ? `#${escapeHtml(entry.loomNumber)}` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; color: #334155;">
                ${rollMtr > 0 ? rollMtr.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #334155;">
                ${netWt > 0 ? netWt.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; color: #0369a1; background-color: #f0f9ff;">
                ${avg > 0 ? avg.toFixed(1) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #64748b;">
                ${openReading > 0 ? openReading.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #64748b;">
                ${closeReading > 0 ? closeReading.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #4338ca; background-color: #eef2ff;">
                ${coverOs > 0 ? coverOs.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #4338ca; background-color: #eef2ff;">
                ${coverDs > 0 ? coverDs.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #3730a3; background-color: #e0e7ff; font-weight: 600;">
                ${valve > 0 ? valve.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${prodPcs > 0 ? prodPcs.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: #0f766e; background-color: #f0fdfa;">
                ${prodKg > 0 ? prodKg.toFixed(1) : "—"}
              </td>
              <td style="font-size: 7pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;">
                ${escapeHtml(entry.remarks || "")}
              </td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td colspan="19" style="text-align: center; padding: 14px; color: #64748b; font-style: italic;">No production rolls recorded for this shift.</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Convertex Daily Production Report — ${escapeHtml(data.date)} (${escapeHtml(data.shiftName)})</title>
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
          ${escapeHtml(data.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA")}
        </div>
        <div style="font-size: 9pt; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 1px;">
          CONVERTEX MACHINE - DAILY PRODUCTION REPORT
        </div>
        <div style="font-size: 6.5pt; color: #475569; margin-top: 1px;">
          Unit: ${escapeHtml(data.unitName || "Unit-1")} | Cutting & Bag Making Operations
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
      <td class="kpi-cell" style="border-left: 2.5px solid #0284c7;">
        <div class="kpi-label">Total Rolls</div>
        <div class="kpi-value" style="color: #0284c7;">${totals.totalRolls}</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #0369a1;">
        <div class="kpi-label">Roll Metres</div>
        <div class="kpi-value" style="color: #0369a1;">${totals.totalRollMtr.toLocaleString()} m</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #7c3aed;">
        <div class="kpi-label">Net Fabric Wt</div>
        <div class="kpi-value" style="color: #7c3aed;">${totals.totalNetWt.toFixed(1)} kg</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #0891b2;">
        <div class="kpi-label">Avg Weight</div>
        <div class="kpi-value" style="color: #0891b2;">${totals.avgWeightGsm.toFixed(1)} g/m</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #4338ca;">
        <div class="kpi-label">Cover Patch (OS / DS)</div>
        <div class="kpi-value" style="color: #4338ca; font-size: 8pt;">
          OS: ${totals.totalCoverPatchOs} | DS: ${totals.totalCoverPatchDs}
        </div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #16a34a; background-color: #f0fdf4;">
        <div class="kpi-label" style="color: #166534;">Production (Pcs)</div>
        <div class="kpi-value" style="color: #166534;">${totals.totalProductionPcs.toLocaleString()}</div>
      </td>
      <td class="kpi-cell" style="border-left: 2.5px solid #0f766e; background-color: #f0fdfa;">
        <div class="kpi-label" style="color: #115e59;">Production (Kg)</div>
        <div class="kpi-value" style="color: #115e59;">${totals.totalProductionKg.toFixed(1)} kg</div>
      </td>
    </tr>
  </table>

  <!-- MAIN PRODUCTION TABLE -->
  <table class="data-table">
    <thead>
      <tr>
        <th rowspan="2" style="width: 20px; text-align: center;">Sl.</th>
        <th rowspan="2" style="width: 80px; text-align: left;">Company</th>
        <th rowspan="2" style="width: 45px; text-align: center;">Unit</th>
        <th rowspan="2" style="width: 32px; text-align: center;">Grade</th>
        <th rowspan="2" style="width: 45px; text-align: right;">Target</th>
        <th rowspan="2" style="width: 85px; text-align: left; background-color: #1e293b; color: #fde047;">Quality</th>
        <th rowspan="2" style="width: 55px; text-align: center;">Roll No.</th>
        <th rowspan="2" style="width: 35px; text-align: center;">Loom</th>
        <th rowspan="2" style="width: 45px; text-align: right;">Roll Mtr</th>
        <th rowspan="2" style="width: 42px; text-align: right;">Net Wt</th>
        <th rowspan="2" style="width: 38px; text-align: right;">Avg.</th>
        <th rowspan="2" style="width: 45px; text-align: right;">Opening</th>
        <th rowspan="2" style="width: 45px; text-align: right;">Closing</th>
        <th colspan="2" style="text-align: center; background-color: #312e81;">Cover Patch</th>
        <th rowspan="2" style="width: 38px; text-align: right; background-color: #1e1b4b;">Valve</th>
        <th rowspan="2" style="width: 55px; text-align: right; background-color: #14532d; color: #86efac;">Prod (Pcs)</th>
        <th rowspan="2" style="width: 50px; text-align: right; background-color: #134e4a; color: #5eead4;">Prod (Kg)</th>
        <th rowspan="2" style="width: 60px; text-align: left;">Remarks</th>
      </tr>
      <tr>
        <th class="sub-head" style="width: 32px; text-align: right; background-color: #3730a3;">OS</th>
        <th class="sub-head" style="width: 32px; text-align: right; background-color: #3730a3;">DS</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 1.5pt solid #0f172a;">
        <td colspan="4" style="text-align: right; text-transform: uppercase;">SHIFT TOTALS:</td>
        <td style="text-align: right; font-family: monospace; color: #1e40af;">
          ${totals.totalTargetPcs > 0 ? totals.totalTargetPcs.toLocaleString() : "—"}
        </td>
        <td colspan="3" style="text-align: center; color: #475569;">
          ${totals.totalRolls} ROLLS
        </td>
        <td style="text-align: right; font-family: monospace;">
          ${totals.totalRollMtr > 0 ? totals.totalRollMtr.toLocaleString() : "—"}
        </td>
        <td style="text-align: right; font-family: monospace;">
          ${totals.totalNetWt > 0 ? totals.totalNetWt.toFixed(1) : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; color: #0369a1; background-color: #e0f2fe;">
          ${totals.avgWeightGsm > 0 ? totals.avgWeightGsm.toFixed(1) : "—"}
        </td>
        <td colspan="2" style="text-align: center; color: #94a3b8;">—</td>
        <td style="text-align: right; font-family: monospace; color: #3730a3; background-color: #eef2ff;">
          ${totals.totalCoverPatchOs > 0 ? totals.totalCoverPatchOs.toLocaleString() : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; color: #3730a3; background-color: #eef2ff;">
          ${totals.totalCoverPatchDs > 0 ? totals.totalCoverPatchDs.toLocaleString() : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; color: #312e81; background-color: #e0e7ff;">
          ${totals.totalValvePatch > 0 ? totals.totalValvePatch.toLocaleString() : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 900; color: #14532d; background-color: #dcfce7;">
          ${totals.totalProductionPcs > 0 ? totals.totalProductionPcs.toLocaleString() : "—"}
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 7.5pt; font-weight: 900; color: #115e59; background-color: #ccfbf1;">
          ${totals.totalProductionKg > 0 ? totals.totalProductionKg.toFixed(1) : "—"}
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

export function printConvertexReport(data: ConvertexDailyReportData): void {
  const html = generateConvertexReportHtml(data);
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
