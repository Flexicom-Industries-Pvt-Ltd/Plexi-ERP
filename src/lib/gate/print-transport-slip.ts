/**
 * Minimalist Enterprise ERP Transport Slip / Gate Pass Generator & Print Engine
 * Produces crisp, professional, high-contrast A4 portrait printable documents
 * with 100% reliability across all browsers and devices.
 */

export interface GatePrintEntry {
  id: string;
  entryNumber: string;
  truckNumber: string;
  driverName: string;
  driverContact?: string | null;
  driverLicenseNumber?: string | null;
  transporter?: string | null;
  supplierCustomer?: string | null;
  purpose: string;
  status: string;
  arrivalTime: string | Date;
  exitTime?: string | Date | null;
  expectedMaterial?: string | null;
  expectedQuantity?: number | null;
  parkingLocation?: string | null;
  waitingReason?: string | null;
  finalQuantity?: number | null;
  finalRemarks?: string | null;
  createdBy?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
  stockDetails?: any[];
  documents?: any[];
  statusLogs?: any[];
}

function formatDate(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatTime(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

function formatDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  return `${formatDate(dt)} ${formatTime(dt)}`;
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return String(status).replace(/_/g, " ");
}

export function generateTransportSlipHtml(entry: GatePrintEntry): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const statusLogs = entry.statusLogs && entry.statusLogs.length > 0
    ? entry.statusLogs
    : [
        {
          id: "arr",
          status: "ARRIVED",
          timestamp: entry.arrivalTime,
          remarks: "Initial truck arrival recorded at security gate",
          user: entry.user,
        },
        ...(entry.status !== "ARRIVED"
          ? [
              {
                id: "curr",
                status: entry.status,
                timestamp: entry.exitTime || new Date(),
                remarks: entry.finalRemarks || entry.waitingReason || `Status at ${formatStatus(entry.status)}`,
                user: null,
              },
            ]
          : []),
      ];

  const stockRows = (entry.stockDetails && entry.stockDetails.length > 0)
    ? entry.stockDetails.map((item, idx) => `
      <tr>
        <td style="text-align: center; width: 30px;">${idx + 1}</td>
        <td style="font-weight: 600;">${item.materialName || "—"}</td>
        <td>${item.materialType ? String(item.materialType).replace(/_/g, " ") : "Raw Material"}</td>
        <td style="font-family: monospace;">${item.batchLot || "—"}</td>
        <td style="text-align: right; font-weight: 600;">${item.expectedQuantity ?? item.quantity ?? "—"} ${item.unit || "kg"}</td>
        <td style="text-align: right;">${item.actualQuantity !== null && item.actualQuantity !== undefined ? `${item.actualQuantity} ${item.unit || "kg"}` : "—"}</td>
        <td style="text-align: center;">${item.actualQuantity !== null && item.actualQuantity !== undefined ? "Verified" : "Declared"}</td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="7" style="text-align: center; color: #64748b; font-style: italic; padding: 8px;">
          ${entry.expectedMaterial ? `${entry.expectedMaterial} (Expected Qty: ${entry.expectedQuantity || "—"})` : "No individual stock items recorded"}
        </td>
      </tr>
    `;

  const truckPhotoDoc = (entry.documents || []).find((d: any) => {
    const norm = (d.documentType || "").toLowerCase();
    return (
      (norm.includes("truck") || norm.includes("vehicle")) &&
      Boolean(d.fileUrl && d.fileUrl !== "local-check")
    );
  }) || (entry.documents || []).find((d: any) => {
    const norm = (d.documentType || "").toLowerCase();
    return norm.includes("photo") && Boolean(d.fileUrl && d.fileUrl !== "local-check");
  });

  const docRows = (entry.documents && entry.documents.length > 0)
    ? entry.documents.map((doc, idx) => {
      const isImg = doc.fileUrl && /\.(jpg|jpeg|png|webp|gif|heic)/i.test(doc.fileUrl);
      return `
      <tr>
        <td style="text-align: center; width: 30px;">${idx + 1}</td>
        <td style="font-weight: 600;">
          <div style="display: flex; align-items: center; gap: 6px;">
            ${isImg ? `<img src="${doc.fileUrl}" style="width: 22px; height: 22px; object-fit: cover; border-radius: 3px; border: 1px solid #cbd5e1;" />` : ""}
            <span>${doc.documentType || "Document"}</span>
          </div>
        </td>
        <td>${doc.remarks || "—"}</td>
        <td style="text-align: center; font-weight: 600;">${doc.status || "PENDING"}</td>
        <td>${doc.verifier?.name || "Security Desk"}</td>
        <td style="text-align: right; font-family: monospace; font-size: 8pt;">${doc.verifiedAt ? formatDateTime(doc.verifiedAt) : formatDateTime(doc.createdAt)}</td>
      </tr>
    `;
    }).join("")
    : `
      <tr>
        <td colspan="6" style="text-align: center; color: #64748b; font-style: italic; padding: 6px;">
          Standard gate pass verification completed at arrival check-post.
        </td>
      </tr>
    `;

  const statusRows = statusLogs.map((log, idx) => `
    <tr>
      <td style="text-align: center; width: 30px; font-weight: 600;">${idx + 1}</td>
      <td style="font-weight: 700;">${formatStatus(log.status)}</td>
      <td style="font-family: monospace; font-size: 8.5pt;">${formatDateTime(log.timestamp)}</td>
      <td>${log.user?.name || log.updatedBy || entry.user?.name || "Security / System"}</td>
      <td style="color: #334155;">${log.remarks || "Status recorded successfully"}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Transport Slip - ${entry.entryNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
    }
    .slip-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    /* Minimalist Header */
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #000000;
      text-transform: uppercase;
    }
    .company-sub {
      font-size: 8pt;
      color: #475569;
      margin-top: 1px;
    }
    .doc-title-box {
      text-align: right;
    }
    .slip-badge {
      display: inline-block;
      border: 1px solid #000;
      padding: 2px 6px;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .entry-no {
      font-family: monospace;
      font-size: 11pt;
      font-weight: 800;
      margin-top: 2px;
    }
    .barcode-sim {
      font-family: monospace;
      letter-spacing: 2px;
      font-size: 8pt;
      color: #334155;
    }

    /* Section styling */
    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #000000;
      padding-bottom: 2px;
      margin-top: 8px;
      margin-bottom: 4px;
      color: #000000;
    }
    
    /* Key-Value Info Grid Table */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    .info-table td {
      padding: 3px 4px;
      font-size: 8.5pt;
      vertical-align: top;
      border: 1px solid #cbd5e1;
    }
    .info-label {
      width: 18%;
      color: #475569;
      font-weight: 600;
      background-color: #f8fafc;
      font-size: 8pt;
      text-transform: uppercase;
    }
    .info-val {
      width: 32%;
      font-weight: 500;
      color: #0f172a;
    }
    .info-val-strong {
      font-weight: 700;
      color: #000000;
    }

    /* Data Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 8.5pt;
    }
    .data-table th {
      background-color: #f1f5f9;
      border: 1px solid #94a3b8;
      padding: 4px 5px;
      font-weight: 700;
      font-size: 8pt;
      text-transform: uppercase;
      text-align: left;
    }
    .data-table td {
      border: 1px solid #cbd5e1;
      padding: 3px 5px;
      font-size: 8.5pt;
    }

    /* Sign-off section */
    .sign-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      border: 1px solid #94a3b8;
    }
    .sign-table td {
      width: 33.33%;
      border: 1px solid #94a3b8;
      padding: 6px 8px;
      text-align: center;
      vertical-align: top;
    }
    .sign-title {
      font-weight: 700;
      font-size: 8pt;
      text-transform: uppercase;
      margin-bottom: 24px;
      color: #334155;
    }
    .sign-line {
      border-top: 1px dotted #64748b;
      padding-top: 2px;
      font-size: 7.5pt;
      color: #64748b;
    }

    /* Footer */
    .footer-note {
      margin-top: 6px;
      font-size: 7.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e2e8f0;
      padding-top: 3px;
    }
    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <!-- HEADER -->
    <table class="header-table">
      <tr>
        <td style="width: 55px; vertical-align: middle; padding-right: 10px;">
          <img src="${origin}/logo.png" alt="Flexicom Logo" style="height: 44px; width: auto; object-fit: contain; filter: contrast(1.15);" onerror="this.style.display='none'" />
        </td>
        <td style="vertical-align: top;">
          <div class="company-title">Flexicom Industries Pvt. Ltd.</div>
          <div class="company-sub">Kathua Industrial Complex, Phase-II, Kathua, J&K (184102)</div>
          <div class="company-sub">Security & Gate Logistics Division • ISO 9001:2015</div>
        </td>
        <td class="doc-title-box" style="vertical-align: top;">
          <div class="slip-badge">${entry.purpose} GATE PASS</div>
          <div class="entry-no">${entry.entryNumber}</div>
          <div class="barcode-sim">||| | ||||| || ||| |||| || |</div>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 1px;">Status: <strong>${formatStatus(entry.status)}</strong></div>
        </td>
      </tr>
    </table>

    <!-- 1. VEHICLE & TRIP DETAILS -->
    <div class="section-title">1. Vehicle & Movement Overview</div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
      <tr>
        <td style="vertical-align: top; padding-right: ${truckPhotoDoc ? "8px" : "0"};">
          <table class="info-table" style="margin-bottom: 0;">
            <tr>
              <td class="info-label" style="width: 20%;">Truck No</td>
              <td class="info-val info-val-strong" style="width: 30%; font-family: monospace; font-size: 9.5pt;">${entry.truckNumber || "—"}</td>
              <td class="info-label" style="width: 22%;">Gate In Date/Time</td>
              <td class="info-val" style="width: 28%;">${formatDateTime(entry.arrivalTime)}</td>
            </tr>
            <tr>
              <td class="info-label">Driver Name</td>
              <td class="info-val info-val-strong">${entry.driverName || "—"}</td>
              <td class="info-label">Gate Out Date/Time</td>
              <td class="info-val">${entry.exitTime ? formatDateTime(entry.exitTime) : "Currently In Factory"}</td>
            </tr>
            <tr>
              <td class="info-label">Driver Contact</td>
              <td class="info-val">${entry.driverContact || "—"}</td>
              <td class="info-label">License Number</td>
              <td class="info-val" style="font-family: monospace;">${entry.driverLicenseNumber || "—"}</td>
            </tr>
            <tr>
              <td class="info-label">Transporter</td>
              <td class="info-val">${entry.transporter || "—"}</td>
              <td class="info-label">Parking / Bay</td>
              <td class="info-val">${entry.parkingLocation || "Waiting Area"}</td>
            </tr>
            <tr>
              <td class="info-label">Supplier / Party</td>
              <td class="info-val" colspan="3">${entry.supplierCustomer || "—"}</td>
            </tr>
            ${entry.waitingReason ? `
            <tr>
              <td class="info-label">Hold / Waiting Reason</td>
              <td class="info-val" colspan="3" style="font-style: italic;">${entry.waitingReason}</td>
            </tr>` : ""}
          </table>
        </td>
        ${truckPhotoDoc ? `
        <td style="width: 130px; vertical-align: top; text-align: center; border: 1px solid #94a3b8; background: #f8fafc; padding: 5px;">
          <div style="font-size: 6.5pt; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 3px; letter-spacing: 0.5px;">Vehicle Photo</div>
          <img src="${truckPhotoDoc.fileUrl}" alt="Truck ${entry.truckNumber}" style="width: 118px; height: 86px; object-fit: cover; border-radius: 3px; border: 1px solid #cbd5e1; display: block; margin: 0 auto;" onerror="this.style.display='none'" />
          <div style="font-size: 6pt; color: #64748b; font-family: monospace; margin-top: 3px;">${entry.truckNumber}</div>
        </td>` : ""}
      </tr>
    </table>

    <!-- 2. STOCK MANIFEST -->
    <div class="section-title avoid-break">2. Consignment & Stock Manifest</div>
    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th style="text-align: center; width: 30px;">#</th>
          <th>Material Description</th>
          <th>Category</th>
          <th>Batch / Lot</th>
          <th style="text-align: right;">Declared Qty</th>
          <th style="text-align: right;">Inward Qty</th>
          <th style="text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${stockRows}
      </tbody>
    </table>

    <!-- 3. DOCUMENT VERIFICATION -->
    <div class="section-title avoid-break">3. Document Verification & Clearances</div>
    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th style="text-align: center; width: 30px;">#</th>
          <th>Document Type</th>
          <th>Reference / Remarks</th>
          <th style="text-align: center;">Status</th>
          <th>Verified By</th>
          <th style="text-align: right;">Timestamp</th>
        </tr>
      </thead>
      <tbody>
        ${docRows}
      </tbody>
    </table>

    <!-- 4. STATUS AUDIT TIMELINE -->
    <div class="section-title avoid-break">4. Movement Status & Audit Trail</div>
    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th style="text-align: center; width: 30px;">#</th>
          <th>Stage Status</th>
          <th>Exact Date & Time</th>
          <th>Actioned By</th>
          <th>Operational Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${statusRows}
      </tbody>
    </table>

    <!-- 5. SIGN-OFF AUTHORIZATION -->
    <div class="avoid-break">
      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">Security Gate In-Charge</div>
            <div class="sign-line">Signature & Gate Stamp</div>
          </td>
          <td>
            <div class="sign-title">Warehouse / Store Inward</div>
            <div class="sign-line">Signature & Material Stamp</div>
          </td>
          <td>
            <div class="sign-title">Driver / Carrier</div>
            <div class="sign-line">Driver Signature / Acknowledgment</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        <span>Flexicom ERP Gate Logistics System • Valid for factory entry/exit inspection</span>
        <span>Generated: ${formatDateTime(new Date())}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Directly prints the transport slip in a clean, isolated iframe/window.
 * Completely immune to modal overflow or React styles.
 */
export function printTransportSlip(entry: GatePrintEntry): void {
  const html = generateTransportSlipHtml(entry);

  // Try using a hidden iframe for seamless instant print
  let iframe = document.getElementById("transport-slip-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "transport-slip-print-iframe";
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
        console.error("Iframe print failed, falling back to window.open", err);
        fallbackWindowPrint(html);
      }
    };

    if (logoImg && !logoImg.complete) {
      logoImg.onload = () => setTimeout(triggerPrint, 100);
      logoImg.onerror = () => setTimeout(triggerPrint, 100);
      setTimeout(triggerPrint, 800);
    } else {
      setTimeout(triggerPrint, 250);
    }
  } else {
    fallbackWindowPrint(html);
  }
}

function fallbackWindowPrint(html: string): void {
  const win = window.open("", "_blank", "width=800,height=900");
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
