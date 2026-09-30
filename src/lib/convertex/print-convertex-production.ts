import { ConvertexDailyReportData, computeConvertexTotals } from "./convertex-types";

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
            const prodPcs = Number(entry.productionPcs) || 0;
            const loomWaste = Number(entry.loomFabricWasteKg) || 0;
            const lamWaste = Number(entry.lamFabricWasteKg) || 0;
            const printWaste = Number(entry.printFabricWasteKg) || 0;
            const machWaste = Number(entry.machineWasteKg) || 0;
            const totalWasteKg = Number(entry.totalWastageKg) || 0;
            const totalWastePct = Number(entry.totalWastagePct) || 0;
            const totalWasteMtd = Number(entry.totalWastageMtdKg) || 0;

            return `
            <tr style="${index % 2 === 1 ? "background-color: #f8fafc;" : "background-color: #ffffff;"}">
              <td style="text-align: center; font-weight: 700; color: #475569;">${entry.sequence || index + 1}</td>
              <td style="font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85px;">
                ${entry.companyName || "—"}
              </td>
              <td style="color: #334155; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65px;">
                ${entry.unitName || "—"}
              </td>
              <td style="color: #334155; text-align: center;">
                ${entry.grade || "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #1e40af;">
                ${targetPcs > 0 ? targetPcs.toLocaleString() : "—"}
              </td>
              <td style="color: #0f172a; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 85px;">
                ${entry.partyName || "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-weight: 800; color: #0f172a; background: #f8fafc;">
                ${entry.rollNumber || "—"}
              </td>
              <td style="text-align: center; font-family: monospace; font-weight: 700; color: #0284c7;">
                ${entry.loomNumber ? `#${entry.loomNumber}` : "—"}
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
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: #15803d; background-color: #f0fdf4;">
                ${prodPcs > 0 ? prodPcs.toLocaleString() : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #475569;">
                ${loomWaste > 0 ? loomWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #475569;">
                ${lamWaste > 0 ? lamWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #475569;">
                ${printWaste > 0 ? printWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #475569;">
                ${machWaste > 0 ? machWaste.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 800; color: #b91c1c; background-color: #fef2f2;">
                ${totalWasteKg > 0 ? totalWasteKg.toFixed(2) : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 700; color: #c2410c; background-color: #fff7ed;">
                ${totalWastePct > 0 ? `${totalWastePct.toFixed(2)}%` : "—"}
              </td>
              <td style="text-align: right; font-family: monospace; color: #6b21a8; background-color: #faf5ff;">
                ${totalWasteMtd > 0 ? totalWasteMtd.toFixed(2) : "—"}
              </td>
              <td style="font-size: 6.5pt; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 75px;">
                ${entry.remarks || ""}
              </td>
            </tr>
          `;
          })
          .join("")
      : `<tr><td colspan="22" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No Convertex production entries logged for this shift.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flexicom - Convertex Daily Production Report (${data.date} - ${data.shiftName})</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 6mm 6mm 6mm;
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
      font-size: 7pt;
      color: #0f172a;
      background: #ffffff;
      padding: 2px;
      line-height: 1.2;
    }

    .report-card {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      background: #ffffff;
      padding: 8px 10px;
    }

    /* Header block */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    .header-table td {
      vertical-align: middle;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      text-align: center;
    }
    .report-subtitle {
      font-size: 10pt;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: 1px;
      text-align: center;
    }

    /* Meta Info bar */
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px 10px;
      margin-bottom: 6px;
      font-size: 7.5pt;
    }
    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .meta-label {
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      font-size: 6.5pt;
    }
    .meta-value {
      font-weight: 700;
      color: #0f172a;
    }

    .status-badge {
      font-size: 7pt;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      border: 1px solid;
    }
    .status-draft { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .status-submitted { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .status-approved { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }

    /* KPI Summary Strip */
    .kpi-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 4px;
      margin-bottom: 6px;
    }
    .kpi-cell {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px 8px;
      text-align: center;
    }
    .kpi-title {
      font-size: 6pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .kpi-num {
      font-size: 9.5pt;
      font-weight: 900;
      font-family: monospace;
      margin-top: 1px;
    }

    /* Main Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.5pt;
      table-layout: fixed;
    }
    .data-table th, .data-table td {
      border: 1px solid #cbd5e1;
      padding: 3px 2px;
      line-height: 1.15;
    }
    .data-table th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      font-size: 6pt;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .data-table tr.totals-row td {
      background-color: #f1f5f9;
      font-weight: 900;
      font-family: monospace;
      font-size: 6.5pt;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
    }

    /* Signature Section */
    .signature-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 6px;
    }
    .signature-box {
      width: 22%;
      text-align: center;
      border-top: 1px dashed #94a3b8;
      padding-top: 3px;
    }
    .sig-role {
      font-size: 6.5pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }
    .sig-name {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 1px;
    }

    .footer-bar {
      margin-top: 6px;
      border-top: 1px solid #e2e8f0;
      padding-top: 3px;
      display: flex;
      justify-content: space-between;
      font-size: 6pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="report-card">
    <!-- Header Titles -->
    <table class="header-table">
      <tr>
        <td style="width: 15%; text-align: left;">
          ${
            origin
              ? `<img src="${origin}/flexicom-logo.png" alt="Logo" style="height: 26px; object-fit: contain;" onerror="this.style.display='none'" />`
              : ""
          }
        </td>
        <td style="width: 70%; text-align: center;">
          <div class="company-title">${data.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA"}</div>
          <div class="report-subtitle">CONVERTEX MACHINE - DAILY PRODUCTION REPORT</div>
        </td>
        <td style="width: 15%; text-align: right; font-family: monospace; font-size: 6.5pt; color: #64748b;">
          <div>REF: ${docRef}</div>
          <div>DATE: ${data.date}</div>
        </td>
      </tr>
    </table>

    <!-- Meta Information Strip -->
    <div class="meta-bar">
      <div class="meta-item">
        <span class="meta-label">Date:</span>
        <span class="meta-value">${data.date}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Shift:</span>
        <span class="meta-value">${data.shiftName}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Machine:</span>
        <span class="meta-value">${data.machineNo || "Convertex-1"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Operator:</span>
        <span class="meta-value">${data.operatorName || "—"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Supervisor:</span>
        <span class="meta-value">${data.supervisorName || "—"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Status:</span>
        <span class="status-badge ${
          data.status === "APPROVED"
            ? "status-approved"
            : data.status === "SUBMITTED"
            ? "status-submitted"
            : "status-draft"
        }">
          ${data.status}
        </span>
      </div>
    </div>

    <!-- KPI Summary Strip -->
    <table class="kpi-table">
      <tr>
        <td class="kpi-cell" style="background-color: #f8fafc;">
          <div class="kpi-title" style="color: #475569;">Total Rolls</div>
          <div class="kpi-num" style="color: #0f172a;">${totals.totalRolls}</div>
        </td>
        <td class="kpi-cell" style="background-color: #f0f9ff;">
          <div class="kpi-title" style="color: #0369a1;">Total Roll Metres</div>
          <div class="kpi-num" style="color: #0284c7;">${totals.totalRollMtr.toLocaleString()} m</div>
        </td>
        <td class="kpi-cell" style="background-color: #faf5ff;">
          <div class="kpi-title" style="color: #7e22ce;">Total Net Weight</div>
          <div class="kpi-num" style="color: #6b21a8;">${totals.totalNetWt.toFixed(1)} kg</div>
        </td>
        <td class="kpi-cell" style="background-color: #f0fdf4;">
          <div class="kpi-title" style="color: #15803d;">Production Bags / Pcs</div>
          <div class="kpi-num" style="color: #16a34a;">${totals.totalProductionPcs.toLocaleString()}</div>
        </td>
        <td class="kpi-cell" style="background-color: #fef2f2;">
          <div class="kpi-title" style="color: #b91c1c;">Total Wastage (Kg)</div>
          <div class="kpi-num" style="color: #dc2626;">${totals.totalWastageKg.toFixed(2)} kg</div>
        </td>
        <td class="kpi-cell" style="background-color: #fff7ed;">
          <div class="kpi-title" style="color: #c2410c;">Overall Wastage %</div>
          <div class="kpi-num" style="color: #ea580c;">${totals.totalWastagePct.toFixed(2)}%</div>
        </td>
      </tr>
    </table>

    <!-- Main Fixed-Layout Data Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 2%;">Sl.</th>
          <th style="width: 6.5%;">Company</th>
          <th style="width: 5%;">Unit</th>
          <th style="width: 4%;">Grade</th>
          <th style="width: 4.5%;">Target (Pcs)</th>
          <th style="width: 6.5%;">Party Name</th>
          <th style="width: 4.5%;">Roll No.</th>
          <th style="width: 4%;">Loom</th>
          <th style="width: 4.5%;">Roll Mtr</th>
          <th style="width: 4%;">Net Wt</th>
          <th style="width: 4%;">Avg (g/m)</th>
          <th style="width: 4.5%;">Open Read</th>
          <th style="width: 4.5%;">Close Read</th>
          <th style="width: 5.5%;">Prod (Pcs)</th>
          <th style="width: 4%;">Loom Wst</th>
          <th style="width: 4%;">Lam Wst</th>
          <th style="width: 4%;">Print Wst</th>
          <th style="width: 4%;">Mach Wst</th>
          <th style="width: 4.5%;">Tot Wst (Kg)</th>
          <th style="width: 4%;">Tot Wst (%)</th>
          <th style="width: 4.5%;">MTD Wst (Kg)</th>
          <th style="width: 6%;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <!-- Totals Summary Row -->
        <tr class="totals-row">
          <td colspan="4" style="text-align: right; text-transform: uppercase;">SHIFT TOTALS:</td>
          <td style="text-align: right; color: #1e40af;">
            ${totals.totalTargetPcs > 0 ? totals.totalTargetPcs.toLocaleString() : "—"}
          </td>
          <td colspan="3" style="text-align: center; color: #475569;">
            ${totals.totalRolls} ROLLS
          </td>
          <td style="text-align: right; color: #0f172a;">
            ${totals.totalRollMtr > 0 ? totals.totalRollMtr.toLocaleString() : "—"}
          </td>
          <td style="text-align: right; color: #0f172a;">
            ${totals.totalNetWt > 0 ? totals.totalNetWt.toFixed(1) : "—"}
          </td>
          <td style="text-align: right; color: #0369a1; background: #f0f9ff;">
            ${totals.avgWeightGsm > 0 ? totals.avgWeightGsm.toFixed(1) : "—"}
          </td>
          <td colspan="2" style="text-align: center; color: #64748b;">—</td>
          <td style="text-align: right; color: #15803d; background: #f0fdf4;">
            ${totals.totalProductionPcs > 0 ? totals.totalProductionPcs.toLocaleString() : "—"}
          </td>
          <td style="text-align: right; color: #475569;">
            ${totals.totalLoomWasteKg > 0 ? totals.totalLoomWasteKg.toFixed(2) : "—"}
          </td>
          <td style="text-align: right; color: #475569;">
            ${totals.totalLamWasteKg > 0 ? totals.totalLamWasteKg.toFixed(2) : "—"}
          </td>
          <td style="text-align: right; color: #475569;">
            ${totals.totalPrintWasteKg > 0 ? totals.totalPrintWasteKg.toFixed(2) : "—"}
          </td>
          <td style="text-align: right; color: #475569;">
            ${totals.totalMachineWasteKg > 0 ? totals.totalMachineWasteKg.toFixed(2) : "—"}
          </td>
          <td style="text-align: right; color: #b91c1c; background: #fef2f2;">
            ${totals.totalWastageKg > 0 ? totals.totalWastageKg.toFixed(2) : "—"}
          </td>
          <td style="text-align: right; color: #c2410c; background: #fff7ed;">
            ${totals.totalWastagePct > 0 ? `${totals.totalWastagePct.toFixed(2)}%` : "—"}
          </td>
          <td style="text-align: right; color: #6b21a8; background: #faf5ff;">
            ${totals.totalWastageMtdKg > 0 ? totals.totalWastageMtdKg.toFixed(2) : "—"}
          </td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <!-- Remarks if any -->
    ${
      data.remarks
        ? `<div style="margin-top: 4px; font-size: 6.5pt; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; padding: 3px 6px; border-radius: 3px;">
            <strong>Shift Remarks:</strong> ${data.remarks}
           </div>`
        : ""
    }

    <!-- Signatures Grid -->
    <div class="signature-grid">
      <div class="signature-box">
        <div class="sig-name">${data.operatorName || "_______________"}</div>
        <div class="sig-role">Operator Signature</div>
      </div>
      <div class="signature-box">
        <div class="sig-name">${data.supervisorName || "_______________"}</div>
        <div class="sig-role">Supervisor Signature</div>
      </div>
      <div class="signature-box">
        <div class="sig-name">Quality Inspector</div>
        <div class="sig-role">QC Verification</div>
      </div>
      <div class="signature-box">
        <div class="sig-name">Plant Manager / HOD</div>
        <div class="sig-role">Authorized Approval</div>
      </div>
    </div>

    <!-- Footer Bar -->
    <div class="footer-bar">
      <div>Flexicom ERP System | Convertex Daily Production Module</div>
      <div>Generated: ${genTimestamp}</div>
      <div>Confidential - Factory Internal Operations Document</div>
    </div>
  </div>
</body>
</html>`;
}

export function printConvertexReport(data: ConvertexDailyReportData): void {
  const html = generateConvertexReportHtml(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print the Convertex daily production report.");
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
