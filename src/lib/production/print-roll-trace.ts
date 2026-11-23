/**
 * Flexicom Central ERP - Roll Tracing & Production Traveler Print Engine
 * High-fidelity, enterprise standard output formatted for A4 portrait/landscape print.
 */

import { RollTraceResult } from "./roll-trace";

export function generateRollTraceHtml(data: RollTraceResult): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const rollNumber = data.rollNumber || "UNKNOWN";
  const docRef = `TRC-${rollNumber}`;
  const loom = data.stages.loom;
  const lam = data.stages.lamination;
  const print = data.stages.printing;
  const conv = data.stages.conversion;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Roll Traveler Passport - ${rollNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 8.5pt;
      line-height: 1.35;
    }
    .sheet {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .company-sub {
      font-size: 7.5pt;
      font-weight: 600;
      color: #475569;
      margin-top: 1px;
    }
    .doc-badge {
      display: inline-block;
      font-size: 9.5pt;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #0f172a;
      margin-top: 3px;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 1px;
    }
    .meta-strip {
      width: 100%;
      font-size: 7.5pt;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 5px 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
    }
    .meta-strip span {
      margin-right: 12px;
    }
    .section-title {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      border-left: 3px solid #0f172a;
      padding-left: 6px;
      margin: 8px 0 5px 0;
    }
    .specs-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .specs-grid td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
      vertical-align: top;
      font-size: 8pt;
    }
    .spec-label {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 1px;
    }
    .spec-val {
      font-weight: 800;
      color: #0f172a;
      font-size: 9pt;
    }
    .traveler-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 7.5pt;
    }
    .traveler-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 7pt;
      letter-spacing: 0.3px;
      padding: 5px 6px;
      border: 1px solid #0f172a;
      text-align: left;
    }
    .traveler-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      vertical-align: top;
    }
    .stage-name {
      font-weight: 800;
      color: #0f172a;
      font-size: 8pt;
    }
    .status-pill {
      display: inline-block;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      padding: 1px 4px;
      border-radius: 2px;
    }
    .status-completed {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .status-pending {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #cbd5e1;
    }
    .param-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .param-list li {
      margin-bottom: 2px;
    }
    .param-k {
      color: #64748b;
      font-weight: 600;
    }
    .param-v {
      color: #0f172a;
      font-weight: 700;
    }
    .photo-box {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px;
      margin-top: 6px;
      background: #f8fafc;
      text-align: center;
    }
    .photo-img {
      max-height: 120px;
      max-width: 220px;
      object-fit: contain;
      border: 1px solid #94a3b8;
      border-radius: 3px;
    }
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 7.5pt;
    }
    .sign-table td {
      border: 1px solid #94a3b8;
      padding: 8px 6px 4px 6px;
      width: 25%;
      vertical-align: top;
      height: 48px;
    }
    .sign-title {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #475569;
    }
    .sign-line {
      margin-top: 22px;
      border-top: 1px dashed #64748b;
      font-size: 6.5pt;
      color: #64748b;
      padding-top: 2px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- Header Block -->
    <table class="header-table">
      <tr>
        <td style="width: 55px; vertical-align: middle;">
          <img src="${origin}/logo.png" alt="Logo" style="height: 38px; width: auto;" onerror="this.style.display='none'" />
        </td>
        <td style="text-align: center; vertical-align: middle;">
          <div class="company-title">Flexicom Industries Pvt. Limited</div>
          <div class="company-sub">SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CIRCULAR WEAVING & CONVERSION DIVISION</div>
          <div class="doc-badge">OFFICIAL ROLL PROCESS TRAVELER & GENEALOGY PASSPORT</div>
        </td>
        <td style="width: 110px; text-align: right; vertical-align: middle; font-size: 7.5pt; color: #475569;">
          <div>Ref: <strong style="color: #0f172a; font-family: monospace;">${docRef}</strong></div>
          <div>Stage: <strong style="color: #0f172a;">${data.currentStage}</strong></div>
        </td>
      </tr>
    </table>

    <!-- Meta Strip -->
    <div class="meta-strip">
      <div><span>Roll Number: <strong style="font-family: monospace; font-size: 9pt; color: #0f172a;">${rollNumber}</strong></span></div>
      <div><span>Fabric Quality: <strong>${data.specs.qualityType || "—"}</strong></span></div>
      <div><span>Current Status: <strong>${data.currentStageLabel}</strong></span></div>
      <div><span>Printed: <strong>${genTimestamp}</strong></span></div>
    </div>

    <!-- Master Specifications Bento Grid -->
    <div class="section-title">1. Roll Identification & Master Specifications</div>
    <table class="specs-grid">
      <tr>
        <td style="width: 25%; background: #f8fafc;">
          <div class="spec-label">Roll Number</div>
          <div class="spec-val" style="font-family: monospace;">${rollNumber}</div>
        </td>
        <td style="width: 25%;">
          <div class="spec-label">Fabric Quality</div>
          <div class="spec-val">${data.specs.qualityType || "—"}</div>
        </td>
        <td style="width: 25%;">
          <div class="spec-label">Fabric Width</div>
          <div class="spec-val">${data.specs.widthMm ? `${data.specs.widthMm} mm` : "—"}</div>
        </td>
        <td style="width: 25%;">
          <div class="spec-label">Initial Length</div>
          <div class="spec-val">${data.specs.initialMeters ? `${data.specs.initialMeters.toLocaleString()} m` : "—"}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="spec-label">Initial Net Weight</div>
          <div class="spec-val">${data.specs.initialNettWeightKg ? `${data.specs.initialNettWeightKg.toFixed(2)} kg` : "—"}</div>
        </td>
        <td>
          <div class="spec-label">Average Fabric Density</div>
          <div class="spec-val">${data.specs.avgWeightPerMeter ? `${data.specs.avgWeightPerMeter.toFixed(2)} g/m` : "—"}</div>
        </td>
        <td>
          <div class="spec-label">Origin Loom #</div>
          <div class="spec-val">${loom ? `#${loom.loomNumber} (Seq ${loom.sequence})` : "—"}</div>
        </td>
        <td>
          <div class="spec-label">Gross / Tare Weight</div>
          <div class="spec-val">${loom ? `${loom.grossWeightKg} kg / ${loom.tareWeightKg} kg` : "—"}</div>
        </td>
      </tr>
    </table>

    <!-- End-to-End Traveler Table -->
    <div class="section-title">2. Process Traveler & Stage Genealogy</div>
    <table class="traveler-table">
      <thead>
        <tr>
          <th style="width: 22%;">Process Stage</th>
          <th style="width: 18%;">Date & Shift</th>
          <th style="width: 20%;">In-Charge / Operator</th>
          <th style="width: 28%;">Operational Parameters & Results</th>
          <th style="width: 12%; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        <!-- Stage 1: Loom -->
        <tr>
          <td>
            <div class="stage-name">1. Loom Section</div>
            <div style="color: #64748b; font-size: 6.5pt;">Circular Weaving & Roll Cutting</div>
          </td>
          <td>
            ${loom ? `<div><strong>${loom.date || "—"}</strong></div><div style="color: #64748b;">${loom.shiftName || "Shift"}</div>` : "<span style='color: #94a3b8;'>—</span>"}
          </td>
          <td>
            ${loom ? `<div><strong>${loom.supervisorSign || loom.supervisorName || "—"}</strong></div><div style="color: #64748b;">${loom.contractor || "In-House"}</div>` : "<span style='color: #94a3b8;'>—</span>"}
          </td>
          <td>
            ${loom ? `
              <ul class="param-list">
                <li><span class="param-k">Loom:</span> <span class="param-v">#${loom.loomNumber} (Seq: ${loom.sequence})</span></li>
                <li><span class="param-k">Length:</span> <span class="param-v">${loom.meter} m</span> (${loom.initialReading} &rarr; ${loom.finalReading})</li>
                <li><span class="param-k">Weight:</span> <span class="param-v">Gross ${loom.grossWeightKg} kg &bull; Net ${loom.nettWeightKg} kg</span></li>
                <li><span class="param-k">Avg Density:</span> <span class="param-v">${loom.avgWeightPerMeter ? `${loom.avgWeightPerMeter.toFixed(2)} g/m` : "—"}</span></li>
              </ul>
            ` : "<span style='color: #94a3b8;'>No cut entry recorded</span>"}
          </td>
          <td style="text-align: center;">
            <span class="status-pill ${loom ? "status-completed" : "status-pending"}">${loom ? "Completed" : "Pending"}</span>
          </td>
        </tr>

        <!-- Stage 2: Lamination -->
        <tr>
          <td>
            <div class="stage-name">2. Lamination</div>
            <div style="color: #64748b; font-size: 6.5pt;">PP Extrusion Coating</div>
          </td>
          <td>
            ${lam ? `<div><strong>${lam.date || "—"}</strong></div><div style="color: #64748b;">${lam.shiftName || "Shift"}</div>` : "<span style='color: #94a3b8;'>—</span>"}
          </td>
          <td>
            ${lam ? `<div><strong>${lam.supervisorName || "—"}</strong></div>` : "<span style='color: #94a3b8;'>—</span>"}
          </td>
          <td>
            ${lam ? `
              <ul class="param-list">
                <li><span class="param-k">Quality:</span> <span class="param-v">${lam.quality}</span></li>
                <li><span class="param-k">Coating:</span> <span class="param-v">${lam.coating} g/m</span></li>
                <li><span class="param-k">Prod Length:</span> <span class="param-v">${lam.productionMeter} m</span></li>
                <li><span class="param-k">Weight After:</span> <span class="param-v">${lam.netWeightAfter} kg</span> <span style="color: #059669; font-size: 7pt;">(+${(lam.netWeightAfter - lam.netWeightBefore).toFixed(2)} kg)</span></li>
              </ul>
            ` : "<span style='color: #94a3b8;'>Awaiting processing in Lamination</span>"}
          </td>
          <td style="text-align: center;">
            <span class="status-pill ${lam ? "status-completed" : "status-pending"}">${lam ? "Completed" : "Pending"}</span>
          </td>
        </tr>

        <!-- Stage 3: Printing -->
        <tr>
          <td>
            <div class="stage-name">3. Printing</div>
            <div style="color: #64748b; font-size: 6.5pt;">Rotary / Flexo Printing</div>
          </td>
          <td>
            ${print ? `<div><strong>${print.date || "—"}</strong></div><div style="color: #64748b;">${print.shiftName || "Shift"}</div>` : "<span style='color: #94a3b8;'>—</span>"}
          </td>
          <td>
            ${print ? `<div><strong>${print.supervisorName || "—"}</strong></div>` : "<span style='color: #94a3b8;'>—</span>"}
          </td>
          <td>
            ${print ? `
              <ul class="param-list">
                <li><span class="param-k">Brand / Party:</span> <span class="param-v">${print.companyName || "—"} (${print.unitName || "—"})</span></li>
                <li><span class="param-k">Grade:</span> <span class="param-v">${print.grade || "—"}</span> &bull; <span class="param-k">Drum:</span> <span class="param-v">${print.drumSize || "—"}</span></li>
                <li><span class="param-k">Printed Length:</span> <span class="param-v">${print.printMeter || print.productionMeter} m</span></li>
                <li><span class="param-k">Net Weight:</span> <span class="param-v">${print.netWeight} kg</span></li>
              </ul>
            ` : "<span style='color: #94a3b8;'>Awaiting processing in Printing</span>"}
          </td>
          <td style="text-align: center;">
            <span class="status-pill ${print ? "status-completed" : "status-pending"}">${print ? "Completed" : "Pending"}</span>
          </td>
        </tr>

        <!-- Stage 4: Convertex / Valvomatic -->
        <tr>
          <td>
            <div class="stage-name">4. Convertex / Valvomatic</div>
            <div style="color: #64748b; font-size: 6.5pt;">Bag Making & Conversion</div>
          </td>
          <td>
            ${conv ? `<div><strong>${conv.date || "—"}</strong></div><div style="color: #64748b;">${conv.shiftName || "Shift"}</div>` : "<span style='color: #94a3b8;'>—</span>"}
          </td>
          <td>
            ${conv ? `<div><strong>${conv.supervisorName || "—"}</strong></div>` : "<span style='color: #94a3b8;'>—</span>"}
          </td>
          <td>
            ${conv ? `
              <ul class="param-list">
                <li><span class="param-k">Machine:</span> <span class="param-v">${conv.type}</span> &bull; <span class="param-k">Bags:</span> <span class="param-v">${conv.productionPcs.toLocaleString()} pcs</span></li>
                <li><span class="param-k">Production Weight:</span> <span class="param-v">${conv.productionKg ? `${conv.productionKg} kg` : "—"}</span></li>
                <li><span class="param-k">Fabric Waste:</span> <span class="param-v">Loom ${conv.loomFabricWasteKg}kg &bull; Lam ${conv.lamFabricWasteKg}kg &bull; Print ${conv.printFabricWasteKg}kg</span></li>
                <li><span class="param-k">Total Waste:</span> <span class="param-v" style="color: #b91c1c;">${(conv.loomFabricWasteKg + conv.lamFabricWasteKg + conv.printFabricWasteKg).toFixed(2)} kg</span></li>
              </ul>
            ` : "<span style='color: #94a3b8;'>Roll has not reached Convertex / Valvomatic</span>"}
          </td>
          <td style="text-align: center;">
            <span class="status-pill ${conv ? "status-completed" : "status-pending"}">${conv ? "Completed" : "Pending"}</span>
          </td>
        </tr>
      </tbody>
    </table>

    ${loom?.photoUrl ? `
      <!-- Scale Photo Evidence Section -->
      <div class="section-title">3. Physical Scale & Calibration Verification</div>
      <div class="photo-box">
        <img src="${loom.photoUrl}" alt="Scale Evidence" class="photo-img" />
        <div style="font-size: 7pt; color: #475569; margin-top: 3px; font-weight: 600;">
          Physical Scale Reading Photo Evidence • Loom #${loom.loomNumber} • Cut Seq #${loom.sequence}
        </div>
      </div>
    ` : ""}

    <!-- Signatures and Authorizations -->
    <div class="section-title">${loom?.photoUrl ? "4" : "3"}. Process Authorizations & Quality Approvals</div>
    <table class="sign-table">
      <tr>
        <td>
          <div class="sign-title">Weaving Operator / Contractor</div>
          <div class="sign-line">${loom?.contractor || loom?.supervisorSign || "Operator Signature"}</div>
        </td>
        <td>
          <div class="sign-title">Production Supervisor</div>
          <div class="sign-line">${loom?.supervisorName || "Supervisor Signature"}</div>
        </td>
        <td>
          <div class="sign-title">Quality Assurance Inspector</div>
          <div class="sign-line">QA Inspector Signature</div>
        </td>
        <td>
          <div class="sign-title">Plant / Dispatch Manager</div>
          <div class="sign-line">Authorized Signatory</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

export function printRollTrace(data: RollTraceResult): void {
  const html = generateRollTraceHtml(data);

  const iframeId = "__roll_trace_print_frame__";
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = iframeId;
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

    const logoImg = doc.querySelector("img");
    const triggerPrint = () => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error("Iframe print failed, falling back to window.print", err);
        fallbackWindowPrint(html);
      }
    };

    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 100);
      logoImg.onerror = () => setTimeout(triggerPrint, 100);
      setTimeout(triggerPrint, 600);
    } else {
      setTimeout(triggerPrint, 250);
    }
  } else {
    fallbackWindowPrint(html);
  }
}

function fallbackWindowPrint(html: string): void {
  const win = window.open("", "_blank", "width=1000,height=800");
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
