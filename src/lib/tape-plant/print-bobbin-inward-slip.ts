/**
 * Bobbin Inward Production Receipt Slip Generator & Print Engine
 * Flexicom ERP - Tape Plant Production Division
 */

import { BOBBIN_WEIGHT_KG, CRATE_WEIGHT_KG } from "./bobbin-stock";

export interface BobbinInwardSlipData {
  referenceNo: string;
  date: string;
  shiftName: string;
  recipeQuality: string;
  grossKg: number;
  wasteKg: number;
  netKg: number;
  bobbins: number;
  crates: number;
  operatorName?: string;
  remarks?: string;
}

export function generateBobbinInwardSlipHtml(data: BobbinInwardSlipData): string {
  const {
    referenceNo,
    date,
    shiftName,
    recipeQuality,
    grossKg,
    wasteKg,
    netKg,
    bobbins,
    crates,
    operatorName,
    remarks,
  } = data;

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
  <title>Inward Production Receipt - ${referenceNo}</title>
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
      border: 2px solid #047857;
      padding: 8px 12px;
      border-radius: 4px;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #047857;
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
      background: #047857;
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

    .banner-card {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #059669;
      padding: 6px 10px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .banner-label {
      font-size: 6.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #047857;
      letter-spacing: 0.5px;
    }
    .banner-val {
      font-size: 11pt;
      font-weight: 900;
      font-family: monospace;
      color: #064e3b;
      margin-top: 1px;
    }

    .metric-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      border: 1.5px solid #047857;
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
      font-size: 10.5pt;
      font-weight: 900;
      font-family: monospace;
    }

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
    <div class="header-top">
      <div class="logo-box">
        <img src="${typeof window !== "undefined" ? window.location.origin : ""}/logo.png" alt="Flexicom Logo" onerror="this.style.display='none'" />
      </div>
      <div class="header-center">
        <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
        <div class="company-sub">Tape Plant Extrusion & Winding • Finished Bobbin Inward Receipt</div>
        <div class="slip-badge">INWARD PRODUCTION SLIP</div>
      </div>
      <div class="meta-box">
        <div>INWARD REF: <strong>${referenceNo}</strong></div>
        <div>DATE: <strong>${date}</strong></div>
        <div>SHIFT: <strong>${shiftName}</strong></div>
      </div>
    </div>

    <div class="banner-card">
      <div class="banner-label">Produced Quality / Recipe Code</div>
      <div class="banner-val">${recipeQuality}</div>
    </div>

    <table class="metric-table">
      <thead>
        <tr>
          <th>Gross Prod (KG)</th>
          <th>Wastage (KG)</th>
          <th style="background: #dcfce7; color: #065f46;">Net Inward (KG)</th>
          <th style="background: #dbeafe; color: #1e40af;">Bobbins (@ 1.6 KG)</th>
          <th style="background: #f3e8ff; color: #6b21a8;">Crates (@ 12.8 KG)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="color: #475569;">${grossKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="color: #dc2626;">${wasteKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="color: #047857; background: #f0fdf4;">${netKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KG</td>
          <td style="color: #1e40af; background: #eff6ff;">${bobbins.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PCS</td>
          <td style="color: #6b21a8; background: #faf5ff;">${crates.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CRATES</td>
        </tr>
      </tbody>
    </table>

    ${remarks ? `<div style="font-size: 7pt; color: #475569; margin-bottom: 6px;"><strong>Batch Remarks:</strong> ${remarks}</div>` : ""}

    <div class="formula-note">
      <strong>Inward Confirmation:</strong> Net Output = Gross Production − Wastage. Bobbins = Net KG ÷ ${BOBBIN_WEIGHT_KG} kg. Crates = Net KG ÷ ${CRATE_WEIGHT_KG} kg. Credited directly to Bobbin Stock.
    </div>

    <div class="sign-grid">
      <div>
        <div class="sign-name">${operatorName || "________________"}</div>
        <div class="sign-box">Plant Operator / In-Charge</div>
      </div>
      <div>
        <div class="sign-name">________________</div>
        <div class="sign-box">Quality Control Inspector</div>
      </div>
      <div>
        <div class="sign-name">________________</div>
        <div class="sign-box">Inventory Store In-Charge</div>
      </div>
    </div>

    <div class="footer-bar">
      <span>Flexicom ERP • Tape Plant Finished Goods Receiving</span>
      <span>Printed: ${printTimestamp}</span>
    </div>
  </div>
</body>
</html>`;
}

export function printBobbinInwardSlip(data: BobbinInwardSlipData): void {
  const html = generateBobbinInwardSlipHtml(data);

  let iframe = document.getElementById("tape-plant-bobbin-inward-slip-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "tape-plant-bobbin-inward-slip-iframe";
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
        console.error("Iframe print failed", err);
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
  }
}
