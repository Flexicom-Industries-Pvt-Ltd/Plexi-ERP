/**
 * Bobbin Issue Slip Print Engine for Flexicom ERP
 * Generates an official, high-contrast A5/A4 printable dispatch slip
 * when bobbins/crates are issued to circular looms.
 */

import { BOBBIN_WEIGHT_KG, CRATE_WEIGHT_KG, BOBBINS_PER_CRATE } from "./bobbin-stock";

export interface BobbinIssueSlipData {
  slipNumber: string;
  date: string;
  shiftName: string;
  recipeQuality: string;
  loomNumber?: number | null;
  loomIdentifier?: string | null;
  crateCount: number;
  bobbinCount: number;
  weightKg: number;
  issuedBy?: string | null;
  receivedBy?: string | null;
  remarks?: string | null;
  availableStockBefore?: number;
}

export function generateBobbinIssueSlipHtml(data: BobbinIssueSlipData): string {
  const {
    slipNumber,
    date,
    shiftName,
    recipeQuality,
    loomNumber,
    loomIdentifier,
    crateCount,
    bobbinCount,
    weightKg,
    issuedBy,
    receivedBy,
    remarks,
  } = data;

  const targetLoom = loomIdentifier || (loomNumber ? `Loom #${loomNumber}` : "Loom Shed");
  const printTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bobbin Issue Slip - ${slipNumber}</title>
  <style>
    @page {
      size: A5 landscape;
      margin: 6mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
    }
    .slip-container {
      width: 100%;
      border: 2px solid #0f172a;
      padding: 8px 12px;
      border-radius: 4px;
    }
    /* Header */
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .logo-box {
      width: 65px;
      display: flex;
      align-items: center;
    }
    .logo-box img {
      height: 42px;
      width: auto;
      object-fit: contain;
    }
    .header-center {
      flex: 1;
      text-align: center;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000;
    }
    .company-sub {
      font-size: 7pt;
      color: #475569;
    }
    .slip-badge {
      display: inline-block;
      margin-top: 3px;
      padding: 2px 10px;
      background: #0f172a;
      color: #ffffff;
      font-weight: 900;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-radius: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 7.5pt;
      color: #334155;
    }
    .meta-box strong {
      color: #000;
      font-family: monospace;
      font-size: 8.5pt;
    }

    /* Target & Quality Banner */
    .banner-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 8px;
    }
    .banner-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      border-radius: 4px;
    }
    .banner-label {
      font-size: 6.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .banner-val {
      font-size: 11pt;
      font-weight: 900;
      color: #0f172a;
      margin-top: 1px;
    }

    /* Metrics Table */
    .metric-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      border: 1.5px solid #0f172a;
    }
    .metric-table th {
      background: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 5px 8px;
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      text-align: center;
      color: #0f172a;
    }
    .metric-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: center;
      font-size: 11pt;
      font-weight: 900;
      font-family: monospace;
    }

    /* Note & Signatures */
    .formula-note {
      font-size: 6.5pt;
      color: #475569;
      background: #f8fafc;
      padding: 4px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 3px;
      margin-bottom: 12px;
    }
    .sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      text-align: center;
      margin-top: 6px;
    }
    .sign-box {
      border-top: 1px dotted #64748b;
      padding-top: 4px;
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #334155;
    }
    .sign-name {
      font-size: 7.5pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 14px;
    }
    .footer-bar {
      margin-top: 6px;
      border-top: 1px solid #e2e8f0;
      padding-top: 3px;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <!-- Header -->
    <div class="header-top">
      <div class="logo-box">
        <img src="${typeof window !== "undefined" ? window.location.origin : ""}/logo.png" alt="Flexicom Logo" onerror="this.style.display='none'" />
      </div>
      <div class="header-center">
        <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
        <div class="company-sub">Tape Plant to Circular Loom Section • Kathua Complex, Phase-II (J&K)</div>
        <div class="slip-badge">BOBBIN ISSUE SLIP</div>
      </div>
      <div class="meta-box">
        <div>SLIP NO: <strong>${slipNumber}</strong></div>
        <div>DATE: <strong>${date}</strong></div>
        <div>SHIFT: <strong>${shiftName}</strong></div>
      </div>
    </div>

    <!-- Target Loom & Recipe Quality -->
    <div class="banner-grid">
      <div class="banner-card" style="border-left: 4px solid #2563eb;">
        <div class="banner-label">Target Destination / Loom</div>
        <div class="banner-val" style="color: #1e40af;">${targetLoom}</div>
      </div>
      <div class="banner-card" style="border-left: 4px solid #059669;">
        <div class="banner-label">Recipe Quality / Tape Code</div>
        <div class="banner-val" style="font-family: monospace; font-size: 10pt; color: #065f46;">${recipeQuality}</div>
      </div>
    </div>

    <!-- Issue Metrics Table -->
    <table class="metric-table">
      <thead>
        <tr>
          <th style="width: 33.33%;">Crates Issued</th>
          <th style="width: 33.33%;">Calculated Bobbins (@ 8/crate)</th>
          <th style="width: 33.33%;">Calculated Weight (@ 12.8 kg/crate)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="color: #6b21a8; background: #faf5ff;">
            ${crateCount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span style="font-size: 8pt; font-weight: normal;">CRATES</span>
          </td>
          <td style="color: #1e40af; background: #eff6ff;">
            ${bobbinCount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} <span style="font-size: 8pt; font-weight: normal;">PCS</span>
          </td>
          <td style="color: #047857; background: #f0fdf4;">
            ${weightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 8pt; font-weight: normal;">KG</span>
          </td>
        </tr>
      </tbody>
    </table>

    ${remarks ? `<div style="font-size: 7pt; color: #475569; margin-bottom: 6px;"><strong>Remarks / Notes:</strong> ${remarks}</div>` : ""}

    <!-- Conversion note -->
    <div class="formula-note">
      <strong>Standard Rules:</strong> 1 Crate = 8 Bobbins = 12.8 KG • Standard Bobbin = 1.6 KG. Stock deducted from Tape Plant Bobbin Inventory.
    </div>

    <!-- Sign-offs -->
    <div class="sign-grid">
      <div>
        <div class="sign-name">${issuedBy || "________________"}</div>
        <div class="sign-box">Issued By (Tape Plant)</div>
      </div>
      <div>
        <div class="sign-name">${receivedBy || "________________"}</div>
        <div class="sign-box">Received By (Loom Operator)</div>
      </div>
      <div>
        <div class="sign-name">________________</div>
        <div class="sign-box">Verified By (Shift Supervisor)</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-bar">
      <span>Flexicom ERP • Bobbin Dispense & Loom Sync</span>
      <span>Slip Ref: ${slipNumber} • Printed: ${printTimestamp}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Print Bobbin Issue Slip directly in an isolated iframe.
 */
export function printBobbinIssueSlip(data: BobbinIssueSlipData): void {
  const html = generateBobbinIssueSlipHtml(data);

  let iframe = document.getElementById("tape-plant-bobbin-issue-slip-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "tape-plant-bobbin-issue-slip-iframe";
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
        console.error("Iframe print failed, falling back to window.open", err);
        fallbackWindowPrint(html);
      }
    };

    const logoImg = doc.querySelector("img");
    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 100);
      logoImg.onerror = () => setTimeout(triggerPrint, 100);
      setTimeout(triggerPrint, 400);
    } else {
      setTimeout(triggerPrint, 200);
    }
  } else {
    fallbackWindowPrint(html);
  }
}

function fallbackWindowPrint(html: string): void {
  const win = window.open("", "_blank", "width=850,height=600");
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
