/**
 * Enterprise Industrial Barcode & Label Generation Engine for Plexi-ERP
 *
 * Produces high-resolution printable SVG layouts and raw ZPL-II (Zebra Programming Language)
 * command streams for direct thermal label printers (Zebra, Citizen, TSC, Honeywell).
 */

export interface BobbinLabelData {
  lotNumber: string;
  extruderLine: string;
  denier: number | string;
  color: string;
  netWeightKg: number;
  operatorName?: string;
  createdAt?: string;
}

export interface RollLabelData {
  rollNumber: string;
  rollType: "PP" | "LPP" | string;
  widthMm: number;
  mesh?: string;
  grade?: string;
  loomId?: string;
  lengthMeters?: number;
  weightKg?: number;
  operatorName?: string;
  createdAt?: string;
}

export interface BaleLabelData {
  baleId: string;
  bagCount: number;
  productName: string;
  customerOrder?: string;
  shift?: string;
  qualityStatus: "PASSED" | "APPROVED" | string;
  createdAt?: string;
}

export interface GeneratedLabel {
  labelType: "BOBBIN" | "ROLL" | "BALE";
  identifier: string;
  svg: string;
  zpl: string;
  textPayload: string;
}

/**
 * Generate Bobbin Thermal Label (2" x 1" or 4" x 2")
 */
export function generateBobbinLabel(data: BobbinLabelData): GeneratedLabel {
  const dateStr = data.createdAt || new Date().toISOString().split("T")[0];

  const zpl = [
    "^XA",
    "^PW800^LL400", // 4x2 inch at 203 DPI
    "^FO40,30^A0N,32,32^FDPLASCOM MANUFACTURING ERP^FS",
    "^FO40,70^A0N,24,24^FDBOBBIN LOT: " + data.lotNumber + "^FS",
    "^FO40,105^A0N,20,20^FDLINE: " + data.extruderLine + " | DENIER: " + data.denier + "D^FS",
    "^FO40,135^A0N,20,20^FDCOLOR: " + data.color + " | NET WT: " + data.netWeightKg + " KG^FS",
    "^FO40,165^A0N,18,18^FDOP: " + (data.operatorName || "N/A") + " | DATE: " + dateStr + "^FS",
    "^FO40,210^BCN,90,Y,N,N^FD" + data.lotNumber + "^FS",
    "^XZ",
  ].join("\n");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200" style="background:#fff; font-family:sans-serif; border:1px solid #ddd; border-radius:4px;">
  <text x="20" y="25" font-size="14" font-weight="bold" fill="#111">PLASCOM MANUFACTURING ERP</text>
  <text x="20" y="48" font-size="12" font-weight="600" fill="#333">BOBBIN LOT: ${data.lotNumber}</text>
  <text x="20" y="68" font-size="11" fill="#555">Line: ${data.extruderLine} | Denier: ${data.denier}D | Color: ${data.color}</text>
  <text x="20" y="88" font-size="11" fill="#555">Net Weight: ${data.netWeightKg} KG | Date: ${dateStr}</text>
  <rect x="20" y="105" width="360" height="50" fill="#f4f4f5" rx="4" />
  <text x="200" y="135" font-size="16" font-family="monospace" font-weight="bold" text-anchor="middle" fill="#111">||| ${data.lotNumber} |||</text>
  <text x="200" y="180" font-size="10" text-anchor="middle" fill="#888">ISO 9001:2015 CERTIFIED PLANT</text>
</svg>`.trim();

  return {
    labelType: "BOBBIN",
    identifier: data.lotNumber,
    zpl,
    svg,
    textPayload: `BOBBIN:${data.lotNumber}|LINE:${data.extruderLine}|DENIER:${data.denier}|WT:${data.netWeightKg}`,
  };
}

/**
 * Generate PP/LPP Loom Roll Thermal Label (4" x 3")
 */
export function generateRollLabel(data: RollLabelData): GeneratedLabel {
  const dateStr = data.createdAt || new Date().toISOString().split("T")[0];

  const zpl = [
    "^XA",
    "^PW800^LL600",
    "^FO40,30^A0N,34,34^FDPLASCOM - WEAVING DIVISION^FS",
    "^FO40,75^A0N,26,26^FDROLL NO: " + data.rollNumber + " (" + data.rollType + ")^FS",
    "^FO40,115^A0N,22,22^FDWIDTH: " + data.widthMm + " MM | MESH: " + (data.mesh || "STANDARD") + "^FS",
    "^FO40,150^A0N,22,22^FDLOOM: " + (data.loomId || "L-01") + " | GRADE: " + (data.grade || "A") + "^FS",
    "^FO40,185^A0N,20,20^FDLENGTH: " + (data.lengthMeters || 0) + " M | WT: " + (data.weightKg || 0) + " KG^FS",
    "^FO40,225^A0N,18,18^FDOP: " + (data.operatorName || "N/A") + " | DATE: " + dateStr + "^FS",
    "^FO40,280^BCN,120,Y,N,N^FD" + data.rollNumber + "^FS",
    "^XZ",
  ].join("\n");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 280" width="450" height="280" style="background:#fff; font-family:sans-serif; border:1px solid #ddd; border-radius:6px;">
  <text x="25" y="30" font-size="16" font-weight="bold" fill="#0f172a">PLASCOM - WEAVING DIVISION</text>
  <text x="25" y="60" font-size="14" font-weight="700" fill="#2563eb">ROLL NO: ${data.rollNumber} (${data.rollType})</text>
  <text x="25" y="88" font-size="12" fill="#334155">Width: ${data.widthMm} mm | Mesh: ${data.mesh || "Standard"} | Grade: ${data.grade || "A"}</text>
  <text x="25" y="112" font-size="12" fill="#334155">Loom ID: ${data.loomId || "Loom-01"} | Weight: ${data.weightKg || 0} kg | Length: ${data.lengthMeters || 0} m</text>
  <text x="25" y="136" font-size="11" fill="#64748b">Operator: ${data.operatorName || "Shift Lead"} | Produced: ${dateStr}</text>
  <rect x="25" y="155" width="400" height="70" fill="#f8fafc" stroke="#e2e8f0" rx="4" />
  <text x="225" y="195" font-size="18" font-family="monospace" font-weight="bold" text-anchor="middle" fill="#0f172a">|||||| ${data.rollNumber} ||||||</text>
  <text x="225" y="255" font-size="10" text-anchor="middle" fill="#94a3b8">AUTHORIZED FABRIC STOCK ITEM</text>
</svg>`.trim();

  return {
    labelType: "ROLL",
    identifier: data.rollNumber,
    zpl,
    svg,
    textPayload: `ROLL:${data.rollNumber}|TYPE:${data.rollType}|WIDTH:${data.widthMm}|WT:${data.weightKg}`,
  };
}

/**
 * Generate Finished Goods Bale Barcode Label (4" x 6")
 */
export function generateBaleLabel(data: BaleLabelData): GeneratedLabel {
  const dateStr = data.createdAt || new Date().toISOString().split("T")[0];

  const zpl = [
    "^XA",
    "^PW800^LL1200",
    "^FO40,40^A0N,40,40^FDFLEXICOM / PLASCOM ERP^FS",
    "^FO40,95^A0N,30,30^FDFINISHED GOODS BALE LABEL^FS",
    "^FO40,150^A0N,28,28^FDBALE ID: " + data.baleId + "^FS",
    "^FO40,195^A0N,24,24^FDPRODUCT: " + data.productName + "^FS",
    "^FO40,235^A0N,24,24^FDBAG COUNT: " + data.bagCount + " PCS^FS",
    "^FO40,275^A0N,22,22^FDORDER REF: " + (data.customerOrder || "STOCK") + "^FS",
    "^FO40,315^A0N,22,22^FDQC STATUS: " + data.qualityStatus + " [VERIFIED]^FS",
    "^FO40,355^A0N,20,20^FDSHIFT: " + (data.shift || "A") + " | PACK DATE: " + dateStr + "^FS",
    "^FO40,420^BCN,180,Y,N,N^FD" + data.baleId + "^FS",
    "^XZ",
  ].join("\n");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="500" height="400" style="background:#fff; font-family:sans-serif; border:2px solid #0f172a; border-radius:8px;">
  <rect x="0" y="0" width="500" height="50" fill="#0f172a" />
  <text x="25" y="32" font-size="18" font-weight="bold" fill="#ffffff">PLASCOM FINISHED GOODS BALE</text>
  <text x="25" y="80" font-size="16" font-weight="700" fill="#0f172a">BALE NO: ${data.baleId}</text>
  <text x="25" y="110" font-size="13" font-weight="600" fill="#334155">Product: ${data.productName}</text>
  <text x="25" y="135" font-size="13" fill="#334155">Quantity: <tspan font-weight="bold" fill="#16a34a">${data.bagCount} BAGS</tspan></text>
  <text x="25" y="160" font-size="12" fill="#334155">Customer / Order: ${data.customerOrder || "WAREHOUSE STOCK"}</text>
  <text x="25" y="185" font-size="12" fill="#334155">Shift: ${data.shift || "A"} | Pack Date: ${dateStr}</text>
  <rect x="25" y="210" width="450" height="110" fill="#f8fafc" stroke="#cbd5e1" rx="4" />
  <text x="250" y="270" font-size="22" font-family="monospace" font-weight="bold" text-anchor="middle" fill="#0f172a">|||||| ${data.baleId} ||||||</text>
  <rect x="25" y="340" width="130" height="30" fill="#16a34a" rx="4" />
  <text x="90" y="360" font-size="12" font-weight="bold" text-anchor="middle" fill="#ffffff">QC: ${data.qualityStatus}</text>
  <text x="250" y="360" font-size="11" text-anchor="middle" fill="#64748b">SCAN TO VERIFY FOR TRUCK LOADING</text>
</svg>`.trim();

  return {
    labelType: "BALE",
    identifier: data.baleId,
    zpl,
    svg,
    textPayload: `BALE:${data.baleId}|QTY:${data.bagCount}|PROD:${data.productName}|QC:${data.qualityStatus}`,
  };
}
