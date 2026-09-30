import { PrintingWastageReportData, calculatePrintingWastage } from "./printing-types";

export function generatePrintingWastageHtml(data: PrintingWastageReportData): string {
  const calc = calculatePrintingWastage(
    data.totalProductionKg,
    data.laminationFabricWasteKg,
    data.printFabricWasteKg
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
  const docRef = `PRN-WST-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  // Status color badge
  const statusColor =
    data.status === "APPROVED"
      ? "#15803d"
      : data.status === "SUBMITTED"
      ? "#0284c7"
      : "#b45309";

  // Wastage benchmark status
  let wasteAssessment = "OPTIMAL";
  let wasteColor = "#15803d";
  if (calc.totalWastagePct > 3.0) {
    wasteAssessment = "EXCEEDED LIMIT";
    wasteColor = "#b91c1c";
  } else if (calc.totalWastagePct > 1.8) {
    wasteAssessment = "ATTENTION REQUIRED";
    wasteColor = "#d97706";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Flexicom - Printing Wastage Report (${data.date} - ${data.shiftName})</title>
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
      font-size: 8.5pt;
      color: #0f172a;
      background: #ffffff;
      padding: 4px;
      line-height: 1.35;
    }
    .company-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .company-title {
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #000000;
      text-transform: uppercase;
    }
    .company-sub {
      font-size: 7pt;
      color: #475569;
      margin-top: 1px;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-type {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .doc-meta {
      font-size: 7pt;
      color: #64748b;
      margin-top: 2px;
      font-family: monospace;
    }

    /* Meta Grid */
    .meta-box {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 12px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 6.5pt;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-value {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 1px;
    }

    /* KPI Summary Cards */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 8px 10px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .kpi-title {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .kpi-num {
      font-size: 13pt;
      font-weight: 900;
      font-family: monospace;
      color: #0f172a;
    }
    .kpi-sub {
      font-size: 7pt;
      color: #475569;
      margin-top: 2px;
    }

    /* Data Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 6px 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #0f172a;
    }
    td {
      padding: 7px 8px;
      border: 1px solid #e2e8f0;
      font-size: 8pt;
    }

    .section-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 12px;
      background-color: #0f172a;
      border-radius: 1px;
    }

    /* Remarks & Assessment Box */
    .analysis-box {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 10px;
      background-color: #f8fafc;
      margin-bottom: 20px;
    }
    .analysis-text {
      font-size: 8pt;
      color: #334155;
      line-height: 1.4;
    }

    /* Signature Section */
    .sign-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 28px;
      page-break-inside: avoid;
    }
    .sign-card {
      border-top: 1.5px solid #0f172a;
      padding-top: 6px;
      text-align: center;
    }
    .sign-role {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
    }
    .sign-sub {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 2px;
    }
    .footer-note {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <!-- Letterhead -->
  <div class="company-header">
    <div style="display: flex; align-items: center; gap: 10px;">
      <img src="${origin}/flexicom-logo.png" alt="Flexicom" style="height: 38px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
      <div>
        <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
        <div class="company-sub">Printing & Conversion Division · Manufacturing ERP & Quality Control</div>
      </div>
    </div>
    <div class="doc-badge">
      <div class="doc-type">Printing Wastage Report</div>
      <div class="doc-meta">Doc Ref: ${docRef}</div>
      <div class="doc-meta">Status: <span style="font-weight: 800; color: ${statusColor};">${data.status}</span></div>
    </div>
  </div>

  <!-- Meta Info -->
  <div class="meta-box">
    <div class="meta-item">
      <span class="meta-label">Date of Production</span>
      <span class="meta-value">${data.date}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Shift & Timing</span>
      <span class="meta-value">${data.shiftName}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Machine Operator</span>
      <span class="meta-value">${data.operatorName || "—"}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Shift Supervisor</span>
      <span class="meta-value">${data.supervisorName || "—"}</span>
    </div>
  </div>

  <!-- Key Production & Waste Performance KPIs -->
  <div class="kpi-row">
    <div class="kpi-card" style="border-left: 4px solid #3b82f6;">
      <div class="kpi-title">Base Production Net Wt</div>
      <div class="kpi-num" style="color: #1d4ed8;">${(Number(data.totalProductionKg) || 0).toLocaleString()} <span style="font-size: 8pt;">kg</span></div>
      <div class="kpi-sub">${(Number(data.totalProductionMtrs) || 0).toLocaleString()} Mtrs produced</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid #f97316;">
      <div class="kpi-title">Lamination Fabric Waste</div>
      <div class="kpi-num" style="color: #c2410c;">${(Number(data.laminationFabricWasteKg) || 0).toFixed(2)} <span style="font-size: 8pt;">kg</span></div>
      <div class="kpi-sub">${calc.laminationFabricWastePct.toFixed(2)}% of production</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid #8b5cf6;">
      <div class="kpi-title">Print Fabric Waste</div>
      <div class="kpi-num" style="color: #6d28d9;">${(Number(data.printFabricWasteKg) || 0).toFixed(2)} <span style="font-size: 8pt;">kg</span></div>
      <div class="kpi-sub">${calc.printFabricWastePct.toFixed(2)}% of production</div>
    </div>
    <div class="kpi-card" style="border-left: 4px solid ${wasteColor}; background-color: #fafaf9;">
      <div class="kpi-title">Total Fabric Wastage</div>
      <div class="kpi-num" style="color: ${wasteColor};">${calc.totalWastageKg.toFixed(2)} <span style="font-size: 8pt;">kg</span></div>
      <div class="kpi-sub" style="font-weight: 700; color: ${wasteColor};">${calc.totalWastagePct.toFixed(2)}% (${wasteAssessment})</div>
    </div>
  </div>

  <!-- Detailed Wastage Breakdown Table -->
  <div class="section-title">Wastage Distribution Breakdown (Calculated from Total Production)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 6%; text-align: center;">#</th>
        <th style="width: 38%; text-align: left;">Wastage Category / Stream</th>
        <th style="width: 18%; text-align: right;">Quantity (Kg)</th>
        <th style="width: 18%; text-align: right;">Waste Ratio (%)</th>
        <th style="width: 20%; text-align: center;">Tolerance Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center; font-weight: 700;">1</td>
        <td style="font-weight: 700; color: #0f172a;">Lamination Fabric Waste</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: #c2410c;">
          ${(Number(data.laminationFabricWasteKg) || 0).toFixed(2)} kg
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: #c2410c;">
          ${calc.laminationFabricWastePct.toFixed(2)}%
        </td>
        <td style="text-align: center; font-size: 7.5pt; font-weight: 700; color: ${calc.laminationFabricWastePct <= 1.5 ? "#15803d" : "#b45309"};">
          ${calc.laminationFabricWastePct <= 1.5 ? "✓ WITHIN TOLERANCE" : "⚠ MONITOR"}
        </td>
      </tr>
      <tr style="background-color: #f8fafc;">
        <td style="text-align: center; font-weight: 700;">2</td>
        <td style="font-weight: 700; color: #0f172a;">Printing Fabric Waste</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: #6d28d9;">
          ${(Number(data.printFabricWasteKg) || 0).toFixed(2)} kg
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: #6d28d9;">
          ${calc.printFabricWastePct.toFixed(2)}%
        </td>
        <td style="text-align: center; font-size: 7.5pt; font-weight: 700; color: ${calc.printFabricWastePct <= 1.5 ? "#15803d" : "#b45309"};">
          ${calc.printFabricWastePct <= 1.5 ? "✓ WITHIN TOLERANCE" : "⚠ MONITOR"}
        </td>
      </tr>
      <!-- Total Row -->
      <tr style="background-color: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a;">
        <td colspan="2" style="text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">
          Total Wastage (Calculated from Total Production ${data.totalProductionKg.toLocaleString()} kg):
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 9pt; color: ${wasteColor}; font-weight: 900;">
          ${calc.totalWastageKg.toFixed(2)} kg
        </td>
        <td style="text-align: right; font-family: monospace; font-size: 9pt; color: ${wasteColor}; font-weight: 900;">
          ${calc.totalWastagePct.toFixed(2)}%
        </td>
        <td style="text-align: center; font-size: 8pt; font-weight: 900; color: ${wasteColor};">
          ${wasteAssessment}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Quality Observations and Remarks -->
  <div class="analysis-box">
    <div style="font-size: 7.5pt; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 4px;">
      Root Cause & Quality Supervisor Notes
    </div>
    <div class="analysis-text">
      ${data.remarks && data.remarks.trim() ? data.remarks : "No exceptional quality issues or machine breakdowns reported during this shift. Normal roll changeover and edge trim waste within acceptable factory limits."}
    </div>
  </div>

  <!-- Signatures -->
  <div class="sign-row">
    <div class="sign-card">
      <div class="sign-role">Operator</div>
      <div class="sign-sub">${data.operatorName || "Machine Operator"}</div>
    </div>
    <div class="sign-card">
      <div class="sign-role">Shift Supervisor</div>
      <div class="sign-sub">${data.supervisorName || "Shift In-Charge"}</div>
    </div>
    <div class="sign-card">
      <div class="sign-role">QC Inspector</div>
      <div class="sign-sub">Quality Assurance</div>
    </div>
    <div class="sign-card">
      <div class="sign-role">Plant Head</div>
      <div class="sign-sub">Factory Manager</div>
    </div>
  </div>

  <div class="footer-note">
    <span>Flexicom ERP v4.2 · Printing & Conversion Division</span>
    <span>Generated: ${genTimestamp}</span>
    <span>Authority: ISO 9001:2015 Manufacturing Quality Standards</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
}

export function printPrintingWastageReport(data: PrintingWastageReportData): void {
  const html = generatePrintingWastageHtml(data);
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

