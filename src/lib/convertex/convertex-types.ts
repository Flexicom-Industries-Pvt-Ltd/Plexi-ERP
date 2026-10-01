export interface ConvertexReportItem {
  id?: string;
  sequence: number;
  companyName?: string;
  unitName?: string;
  grade?: string;
  targetProductionPcs?: number;
  quality?: string; // Quality Name (replaced Party Name)
  partyName?: string; // Kept for backward compatibility
  rollNumber: string;
  loomNumber?: string;
  rollMtr: number;
  netWeight: number;
  avgWeight: number; // in g/m: (netWeight / rollMtr) * 1000
  openingMeterReading: number;
  closingMeterReading: number;
  coverPatchOs: number; // Cover Patch OS
  coverPatchDs: number; // Cover Patch DS
  valvePatch: number; // Valve Patch
  productionPcs: number; // pieces produced
  productionKg: number; // production in kg (beside productionPcs)
  remarks?: string;
}

export interface ConvertexDailyReportData {
  id?: string;
  date: string;
  shiftName: string;
  machineNo: string;
  companyName?: string;
  unitName?: string;
  operatorName?: string;
  operatorId?: string;
  supervisorName?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  remarks?: string;
  totalRolls: number;
  totalRollMtr: number;
  totalNetWt: number;
  avgWeightGsm: number;
  totalCoverPatchOs: number;
  totalCoverPatchDs: number;
  totalValvePatch: number;
  totalProductionPcs: number;
  totalProductionKg: number;
  totalTargetPcs: number;
  entries: ConvertexReportItem[];
}

export interface ConvertexShiftTotals {
  totalRolls: number;
  totalRollMtr: number;
  totalNetWt: number;
  avgWeightGsm: number;
  totalCoverPatchOs: number;
  totalCoverPatchDs: number;
  totalValvePatch: number;
  totalProductionPcs: number;
  totalProductionKg: number;
  totalTargetPcs: number;
}

/**
 * Calculates derived metrics for an individual Convertex roll row.
 */
export function calculateConvertexRow(item: Partial<ConvertexReportItem>): ConvertexReportItem {
  const sequence = Number(item.sequence) || 1;
  const rollMtr = Math.max(0, Number(item.rollMtr) || 0);
  const netWeight = Math.max(0, Number(item.netWeight) || 0);
  const openingMeterReading = Math.max(0, Number(item.openingMeterReading) || 0);
  const closingMeterReading = Math.max(0, Number(item.closingMeterReading) || 0);

  // Average weight in g/m: (Net Weight in kg / Roll Metre) * 1000
  const avgWeight = rollMtr > 0 ? (netWeight / rollMtr) * 1000 : 0;

  // Production in Pcs: if explicitly provided (> 0), use it; otherwise compute closing - opening
  let productionPcs = Number(item.productionPcs);
  if (isNaN(productionPcs) || productionPcs <= 0) {
    productionPcs =
      closingMeterReading >= openingMeterReading && closingMeterReading > 0
        ? closingMeterReading - openingMeterReading
        : 0;
  }

  // Cover patch & Valve patch
  const coverPatchOs = Math.max(0, Number(item.coverPatchOs) || 0);
  const coverPatchDs = Math.max(0, Number(item.coverPatchDs) || 0);
  const valvePatch = Math.max(0, Number(item.valvePatch) || 0);

  // Production in Kg: if explicitly entered, use it; otherwise estimate from pcs * avgWeight
  let productionKg = Number(item.productionKg);
  if (isNaN(productionKg) || productionKg < 0) {
    productionKg = 0;
  }
  if (productionKg === 0 && productionPcs > 0 && avgWeight > 0) {
    productionKg = (productionPcs * avgWeight) / 1000;
  }

  const qualityVal = (item.quality || item.partyName || "").trim();

  return {
    id: item.id,
    sequence,
    companyName: item.companyName || "",
    unitName: item.unitName || "",
    grade: item.grade || "",
    targetProductionPcs: Number(item.targetProductionPcs) || 0,
    quality: qualityVal,
    partyName: qualityVal,
    rollNumber: String(item.rollNumber || "").trim(),
    loomNumber: String(item.loomNumber || "").trim(),
    rollMtr: Math.round(rollMtr * 100) / 100,
    netWeight: Math.round(netWeight * 100) / 100,
    avgWeight: Math.round(avgWeight * 100) / 100,
    openingMeterReading: Math.round(openingMeterReading * 100) / 100,
    closingMeterReading: Math.round(closingMeterReading * 100) / 100,
    coverPatchOs: Math.round(coverPatchOs * 100) / 100,
    coverPatchDs: Math.round(coverPatchDs * 100) / 100,
    valvePatch: Math.round(valvePatch * 100) / 100,
    productionPcs: Math.round(productionPcs),
    productionKg: Math.round(productionKg * 100) / 100,
    remarks: item.remarks || "",
  };
}

/**
 * Computes aggregate summary totals across an entire shift's Convertex entries.
 */
export function computeConvertexTotals(entries: ConvertexReportItem[]): ConvertexShiftTotals {
  let totalRolls = 0;
  let totalRollMtr = 0;
  let totalNetWt = 0;
  let totalCoverPatchOs = 0;
  let totalCoverPatchDs = 0;
  let totalValvePatch = 0;
  let totalProductionPcs = 0;
  let totalProductionKg = 0;
  let totalTargetPcs = 0;

  for (const entry of entries) {
    if (entry.rollNumber && entry.rollNumber.trim() !== "") {
      totalRolls += 1;
    }
    totalRollMtr += Number(entry.rollMtr) || 0;
    totalNetWt += Number(entry.netWeight) || 0;
    totalCoverPatchOs += Number(entry.coverPatchOs) || 0;
    totalCoverPatchDs += Number(entry.coverPatchDs) || 0;
    totalValvePatch += Number(entry.valvePatch) || 0;
    totalProductionPcs += Number(entry.productionPcs) || 0;
    totalProductionKg += Number(entry.productionKg) || 0;
    totalTargetPcs += Number(entry.targetProductionPcs) || 0;
  }

  const avgWeightGsm = totalRollMtr > 0 ? (totalNetWt / totalRollMtr) * 1000 : 0;

  return {
    totalRolls,
    totalRollMtr: Math.round(totalRollMtr * 100) / 100,
    totalNetWt: Math.round(totalNetWt * 100) / 100,
    avgWeightGsm: Math.round(avgWeightGsm * 100) / 100,
    totalCoverPatchOs: Math.round(totalCoverPatchOs * 100) / 100,
    totalCoverPatchDs: Math.round(totalCoverPatchDs * 100) / 100,
    totalValvePatch: Math.round(totalValvePatch * 100) / 100,
    totalProductionPcs: Math.round(totalProductionPcs),
    totalProductionKg: Math.round(totalProductionKg * 100) / 100,
    totalTargetPcs: Math.round(totalTargetPcs),
  };
}

/* =========================================================================
   WASTAGE SUB-MODULE TYPES & CALCULATIONS
   ========================================================================= */

export interface ConvertexWastageEntryItem {
  id?: string;
  sequence: number;
  quality: string; // Quality Name
  rollNumber: string; // Roll Number
  productionKg: number; // Production in Kg
  loomWasteKg: number; // Loom Wastage (Kg)
  loomWastePct: number; // Loom Wastage (%)
  lamWasteKg: number; // Lam Wastage (Kg)
  lamWastePct: number; // Lam Wastage (%)
  printWasteKg: number; // Print Wastage (Kg)
  printWastePct: number; // Print Wastage (%)
  machineWasteKg: number; // Machine Wastage (Kg)
  machineWastePct: number; // Machine Wastage (%)
  coverPatchWasteKg: number; // Cover Patch Wastage (Kg)
  coverPatchWastePct: number; // Cover Patch Wastage (%)
  totalWasteKg: number; // Total Waste (Kg)
  totalWastePct: number; // Total Waste (%)
  netProductionKg: number; // Net Production (Kg) = productionKg - totalWasteKg
  remarks?: string;
}

export interface ConvertexWastageTotals {
  totalProductionKg: number;
  totalLoomWasteKg: number;
  totalLoomWastePct: number;
  totalLamWasteKg: number;
  totalLamWastePct: number;
  totalPrintWasteKg: number;
  totalPrintWastePct: number;
  totalMachineWasteKg: number;
  totalMachineWastePct: number;
  totalCoverPatchWasteKg: number;
  totalCoverPatchWastePct: number;
  totalWastageKg: number;
  totalWastagePct: number;
  totalNetProductionKg: number;
}

export interface ConvertexWastageReportData extends ConvertexWastageTotals {
  id?: string;
  date: string;
  shiftName: string;
  machineNo: string;
  operatorName?: string;
  operatorId?: string;
  supervisorName?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  remarks?: string;
  entries: ConvertexWastageEntryItem[];
}

export function calculateConvertexWastageRow(
  item: Partial<ConvertexWastageEntryItem>
): ConvertexWastageEntryItem {
  const sequence = Number(item.sequence) || 1;
  const quality = String(item.quality || "").trim();
  const rollNumber = String(item.rollNumber || "").trim();
  const productionKg = Math.max(0, Number(item.productionKg) || 0);

  const loomWasteKg = Math.max(0, Number(item.loomWasteKg) || 0);
  const lamWasteKg = Math.max(0, Number(item.lamWasteKg) || 0);
  const printWasteKg = Math.max(0, Number(item.printWasteKg) || 0);
  const machineWasteKg = Math.max(0, Number(item.machineWasteKg) || 0);
  const coverPatchWasteKg = Math.max(0, Number(item.coverPatchWasteKg) || 0);

  const totalWasteKg =
    loomWasteKg + lamWasteKg + printWasteKg + machineWasteKg + coverPatchWasteKg;

  const baseForPct = productionKg > 0 ? productionKg : 0;
  const loomWastePct = baseForPct > 0 ? (loomWasteKg / baseForPct) * 100 : 0;
  const lamWastePct = baseForPct > 0 ? (lamWasteKg / baseForPct) * 100 : 0;
  const printWastePct = baseForPct > 0 ? (printWasteKg / baseForPct) * 100 : 0;
  const machineWastePct = baseForPct > 0 ? (machineWasteKg / baseForPct) * 100 : 0;
  const coverPatchWastePct = baseForPct > 0 ? (coverPatchWasteKg / baseForPct) * 100 : 0;
  const totalWastePct = baseForPct > 0 ? (totalWasteKg / baseForPct) * 100 : 0;

  const netProductionKg = Math.max(0, productionKg - totalWasteKg);

  return {
    id: item.id,
    sequence,
    quality,
    rollNumber,
    productionKg: Math.round(productionKg * 100) / 100,
    loomWasteKg: Math.round(loomWasteKg * 100) / 100,
    loomWastePct: Math.round(loomWastePct * 100) / 100,
    lamWasteKg: Math.round(lamWasteKg * 100) / 100,
    lamWastePct: Math.round(lamWastePct * 100) / 100,
    printWasteKg: Math.round(printWasteKg * 100) / 100,
    printWastePct: Math.round(printWastePct * 100) / 100,
    machineWasteKg: Math.round(machineWasteKg * 100) / 100,
    machineWastePct: Math.round(machineWastePct * 100) / 100,
    coverPatchWasteKg: Math.round(coverPatchWasteKg * 100) / 100,
    coverPatchWastePct: Math.round(coverPatchWastePct * 100) / 100,
    totalWasteKg: Math.round(totalWasteKg * 100) / 100,
    totalWastePct: Math.round(totalWastePct * 100) / 100,
    netProductionKg: Math.round(netProductionKg * 100) / 100,
    remarks: item.remarks || "",
  };
}

export function computeConvertexWastageTotals(
  entries: ConvertexWastageEntryItem[]
): ConvertexWastageTotals {
  let totalProductionKg = 0;
  let totalLoomWasteKg = 0;
  let totalLamWasteKg = 0;
  let totalPrintWasteKg = 0;
  let totalMachineWasteKg = 0;
  let totalCoverPatchWasteKg = 0;
  let totalWastageKg = 0;
  let totalNetProductionKg = 0;

  for (const entry of entries) {
    totalProductionKg += Number(entry.productionKg) || 0;
    totalLoomWasteKg += Number(entry.loomWasteKg) || 0;
    totalLamWasteKg += Number(entry.lamWasteKg) || 0;
    totalPrintWasteKg += Number(entry.printWasteKg) || 0;
    totalMachineWasteKg += Number(entry.machineWasteKg) || 0;
    totalCoverPatchWasteKg += Number(entry.coverPatchWasteKg) || 0;
    totalWastageKg += Number(entry.totalWasteKg) || 0;
    totalNetProductionKg += Number(entry.netProductionKg) || 0;
  }

  const baseForPct = totalProductionKg > 0 ? totalProductionKg : 0;
  const totalLoomWastePct = baseForPct > 0 ? (totalLoomWasteKg / baseForPct) * 100 : 0;
  const totalLamWastePct = baseForPct > 0 ? (totalLamWasteKg / baseForPct) * 100 : 0;
  const totalPrintWastePct = baseForPct > 0 ? (totalPrintWasteKg / baseForPct) * 100 : 0;
  const totalMachineWastePct = baseForPct > 0 ? (totalMachineWasteKg / baseForPct) * 100 : 0;
  const totalCoverPatchWastePct =
    baseForPct > 0 ? (totalCoverPatchWasteKg / baseForPct) * 100 : 0;
  const totalWastagePct = baseForPct > 0 ? (totalWastageKg / baseForPct) * 100 : 0;

  return {
    totalProductionKg: Math.round(totalProductionKg * 100) / 100,
    totalLoomWasteKg: Math.round(totalLoomWasteKg * 100) / 100,
    totalLoomWastePct: Math.round(totalLoomWastePct * 100) / 100,
    totalLamWasteKg: Math.round(totalLamWasteKg * 100) / 100,
    totalLamWastePct: Math.round(totalLamWastePct * 100) / 100,
    totalPrintWasteKg: Math.round(totalPrintWasteKg * 100) / 100,
    totalPrintWastePct: Math.round(totalPrintWastePct * 100) / 100,
    totalMachineWasteKg: Math.round(totalMachineWasteKg * 100) / 100,
    totalMachineWastePct: Math.round(totalMachineWastePct * 100) / 100,
    totalCoverPatchWasteKg: Math.round(totalCoverPatchWasteKg * 100) / 100,
    totalCoverPatchWastePct: Math.round(totalCoverPatchWastePct * 100) / 100,
    totalWastageKg: Math.round(totalWastageKg * 100) / 100,
    totalWastagePct: Math.round(totalWastagePct * 100) / 100,
    totalNetProductionKg: Math.round(totalNetProductionKg * 100) / 100,
  };
}

/* =========================================================================
   SUMMARY & REPORTS TYPES
   ========================================================================= */

export interface ConvertexQualitySummaryItem {
  quality: string;
  rollsCount: number;
  totalRollMtr: number;
  totalNetWt: number;
  avgGsm: number;
  productionPcs: number;
  productionKg: number;
  coverPatchOs: number;
  coverPatchDs: number;
  valvePatch: number;
  totalWasteKg: number;
  totalWastePct: number;
  netProductionKg: number;
}

export interface ConvertexWastageBreakdown {
  loomWasteKg: number;
  loomWastePct: number;
  lamWasteKg: number;
  lamWastePct: number;
  printWasteKg: number;
  printWastePct: number;
  machineWasteKg: number;
  machineWastePct: number;
  coverPatchWasteKg: number;
  coverPatchWastePct: number;
  totalWasteKg: number;
  totalWastePct: number;
}

export interface ConvertexSummaryResult {
  qualities: ConvertexQualitySummaryItem[];
  wastage: ConvertexWastageBreakdown;
  overall: {
    totalReports: number;
    totalRolls: number;
    totalRollMtr: number;
    totalNetWt: number;
    avgGsm: number;
    totalProductionPcs: number;
    totalProductionKg: number;
    totalCoverPatchOs: number;
    totalCoverPatchDs: number;
    totalValvePatch: number;
    totalWastageKg: number;
    totalWastagePct: number;
    totalNetProductionKg: number;
  };
}
