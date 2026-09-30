export interface PrintingReportItem {
  id?: string;
  sequence: number;
  companyName?: string;
  unitName?: string;
  grade?: string;
  targetProductionMtrs?: number | string;
  drumSize?: string;
  quality: string;
  rollNumber: string;
  loomNumber: string;
  productionMeter: number | string;
  netWeight: number | string;
  avgWeight: number | string; // Avg. in g/m: (netWeight / productionMeter) * 1000
  printMeter: number | string; // Print in Metre
  remarks?: string;
}

export interface PartyPrintingDetailItem {
  id: string;
  companyName: string;
  unitName?: string | null;
  grade?: string | null;
  drumSize?: string | null;
  targetProductionMtrs?: number | null;
  quality?: string | null;
  remarks?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrintingSummaryTotals {
  totalRolls: number;
  totalTargetMtrs: number;
  totalProductionMtrs: number;
  totalNetWt: number;
  avgWeightGsm: number;
  totalPrintMtrs: number;
  varianceMtrs: number;
  efficiencyPercent: number;
}

export interface PrintingDailyReportData {
  id?: string;
  date: string;
  shiftName: string;
  machineNo?: string;
  companyName?: string;
  unitName?: string;
  operatorName?: string;
  operatorId?: string;
  supervisorName?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  remarks?: string;
  totals: PrintingSummaryTotals;
  entries: PrintingReportItem[];
}

export interface AvailablePrintingRoll {
  id: string;
  rollNumber: string;
  loomNumber: number | string;
  qualityType: string;
  meter: number;
  nettWeightKg: number;
  avgWeightPerMeter: number;
  date?: string;
  shiftName?: string;
}

// ─── Raw Material Types & Calculations ──────────────────────────────────────────

export interface PrintingRawMaterialMasterItem {
  id: string;
  name: string;
  code?: string | null;
  category: string; // "INK" | "SOLVENT" | "ADDITIVE"
  unit: string; // "LITRE" | "KG"
  conversionFactor: number; // default 0.82
  defaultRatio?: number | null;
  targetMileage?: number | null;
  remarks?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrintingRawMaterialEntryItem {
  id?: string;
  sequence: number;
  rawMaterialId?: string | null;
  materialName: string;
  unit: string; // "LITRE" or "KG"
  consumedLitre: number | string;
  conversionFactor: number; // default 0.82
  consumedKg: number | string; // Litre * conversionFactor (or direct Kg)
  ratioPercent: number | string; // % share of total consumption
  mileage: number | string; // totalPrintMtrs / consumedKg
  remarks?: string;
}

export interface PrintingRawMaterialTotals {
  totalConsumedLitre: number;
  totalConsumedKg: number;
  totalPrintMtrs: number;
  overallMileage: number; // totalPrintMtrs / totalConsumedKg
}

export interface PrintingRawMaterialReportData {
  id?: string;
  date: string;
  shiftName: string;
  operatorName?: string;
  operatorId?: string;
  supervisorName?: string;
  totalPrintMtrs: number;
  totalConsumedLitre: number;
  totalConsumedKg: number;
  overallMileage: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  remarks?: string;
  entries: PrintingRawMaterialEntryItem[];
}

/**
 * Calculates raw material row consumption in Kg, Ratio, and Mileage
 */
export function calculatePrintingRawMaterialRow(
  item: PrintingRawMaterialEntryItem,
  totalPrintMtrs: number = 0,
  totalMixKg: number = 0
): PrintingRawMaterialEntryItem {
  const factor = Number(item.conversionFactor) || 0.82;
  const isLitre = (item.unit || "LITRE").toUpperCase() === "LITRE";
  let kg = 0;

  if (isLitre) {
    const litres = Number(item.consumedLitre) || 0;
    kg = Math.round(litres * factor * 100) / 100;
  } else {
    kg = Number(item.consumedKg) || 0;
  }

  // Mileage = Total printed metres / consumed kg of this ink/solvent
  let mileage = 0;
  if (totalPrintMtrs > 0 && kg > 0) {
    mileage = Math.round((totalPrintMtrs / kg) * 10) / 10;
  }

  // Ratio = (kg / totalMixKg) * 100
  let ratio = 0;
  if (totalMixKg > 0 && kg > 0) {
    ratio = Math.round(((kg / totalMixKg) * 100) * 10) / 10;
  }

  return {
    ...item,
    conversionFactor: factor,
    consumedKg: kg,
    mileage,
    ratioPercent: ratio,
  };
}

/**
 * Computes aggregate summary totals for printing raw material report
 */
export function computePrintingRawMaterialTotals(
  entries: PrintingRawMaterialEntryItem[],
  totalPrintMtrs: number = 0
): {
  totals: PrintingRawMaterialTotals;
  calculatedEntries: PrintingRawMaterialEntryItem[];
} {
  let totalLitre = 0;
  let totalKg = 0;

  // First pass: compute total kg and total litres
  const firstPass = entries.map((entry, idx) => {
    const factor = Number(entry.conversionFactor) || 0.82;
    const isLitre = (entry.unit || "LITRE").toUpperCase() === "LITRE";
    let kg = 0;
    let lit = 0;

    if (isLitre) {
      lit = Number(entry.consumedLitre) || 0;
      kg = Math.round(lit * factor * 100) / 100;
    } else {
      kg = Number(entry.consumedKg) || 0;
    }

    if (lit > 0 || kg > 0 || entry.materialName) {
      totalLitre += lit;
      totalKg += kg;
    }

    return {
      ...entry,
      sequence: idx + 1,
      conversionFactor: factor,
      consumedKg: kg,
    };
  });

  totalLitre = Math.round(totalLitre * 100) / 100;
  totalKg = Math.round(totalKg * 100) / 100;

  // Second pass: compute ratio and mileage for each entry
  const calculatedEntries = firstPass.map((entry) => {
    const kg = Number(entry.consumedKg) || 0;
    const ratio = totalKg > 0 ? Math.round(((kg / totalKg) * 100) * 10) / 10 : 0;
    const mileage = totalPrintMtrs > 0 && kg > 0 ? Math.round((totalPrintMtrs / kg) * 10) / 10 : 0;
    return {
      ...entry,
      ratioPercent: ratio,
      mileage,
    };
  });

  const overallMileage =
    totalPrintMtrs > 0 && totalKg > 0 ? Math.round((totalPrintMtrs / totalKg) * 10) / 10 : 0;

  return {
    totals: {
      totalConsumedLitre: totalLitre,
      totalConsumedKg: totalKg,
      totalPrintMtrs,
      overallMileage,
    },
    calculatedEntries,
  };
}

// ─── Wastage Report Types & Calculations ────────────────────────────────────────

export interface PrintingWastageReportData {
  id?: string;
  date: string;
  shiftName: string;
  operatorName?: string;
  operatorId?: string;
  supervisorName?: string;
  totalProductionMtrs: number;
  totalProductionKg: number; // Base net weight from daily production
  laminationFabricWasteKg: number;
  laminationFabricWastePct: number;
  printFabricWasteKg: number;
  printFabricWastePct: number;
  totalWastageKg: number;
  totalWastagePct: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  remarks?: string;
}

/**
 * Calculates lamination waste %, print waste %, and overall total wastage %
 */
export function calculatePrintingWastage(
  baseKg: number,
  laminationKg: number,
  printKg: number
): {
  laminationFabricWastePct: number;
  printFabricWastePct: number;
  totalWastageKg: number;
  totalWastagePct: number;
} {
  const safeBase = Number(baseKg) || 0;
  const safeLam = Number(laminationKg) || 0;
  const safePrint = Number(printKg) || 0;

  const totalWasteKg = Math.round((safeLam + safePrint) * 100) / 100;

  const laminationPct =
    safeBase > 0 ? Math.round(((safeLam / safeBase) * 100) * 100) / 100 : 0;

  const printPct =
    safeBase > 0 ? Math.round(((safePrint / safeBase) * 100) * 100) / 100 : 0;

  const totalPct =
    safeBase > 0 ? Math.round(((totalWasteKg / safeBase) * 100) * 100) / 100 : 0;

  return {
    laminationFabricWastePct: laminationPct,
    printFabricWastePct: printPct,
    totalWastageKg: totalWasteKg,
    totalWastagePct: totalPct,
  };
}

// ─── Production Summary / Analytics Types ──────────────────────────────────────

export interface CustomerPrintingSummaryItem {
  companyName: string;
  unitName: string;
  totalRolls: number;
  targetMtrs: number;
  printMtrs: number;
  productionMtrs: number;
  netWeightKg: number;
  avgGsm: number;
  sharePercent: number;
}

export interface QualityPrintingSummaryItem {
  quality: string;
  totalRolls: number;
  printMtrs: number;
  productionMtrs: number;
  netWeightKg: number;
  avgGsm: number;
  sharePercent: number;
}

export interface ShiftPrintingHistoryItem {
  id: string;
  date: string;
  shiftName: string;
  operatorName?: string;
  supervisorName?: string;
  totalRolls: number;
  productionMtrs: number;
  printMtrs: number;
  varianceMtrs: number;
  efficiencyPercent: number;
  status: string;
}

export interface PrintingProductionSummaryResult {
  startDate: string;
  endDate: string;
  overall: {
    totalReports: number;
    totalRolls: number;
    totalTargetMtrs: number;
    totalProductionMtrs: number;
    totalNetWeightKg: number;
    avgGsm: number;
    totalPrintMtrs: number;
    varianceMtrs: number;
    overallEfficiency: number;
  };
  customers: CustomerPrintingSummaryItem[];
  qualities: QualityPrintingSummaryItem[];
  history: ShiftPrintingHistoryItem[];
}

/**
 * Calculates row-level average GSM / weight ratio for daily report:
 * Avg. (g/m) = (Net Wt (kg) / Production in Metre) * 1000
 */
export function calculatePrintingRow(item: PrintingReportItem): PrintingReportItem {
  const prodMtr = Number(item.productionMeter) || 0;
  const netWt = Number(item.netWeight) || 0;
  let avg = 0;
  if (prodMtr > 0 && netWt > 0) {
    avg = Math.round(((netWt * 1000) / prodMtr) * 10) / 10;
  }

  return {
    ...item,
    avgWeight: avg,
  };
}

/**
 * Computes aggregate summary totals across all rows in a printing report
 */
export function computePrintingTotals(entries: PrintingReportItem[]): PrintingSummaryTotals {
  let totalTargetMtrs = 0;
  let totalProductionMtrs = 0;
  let totalNetWt = 0;
  let totalPrintMtrs = 0;
  let totalRolls = 0;

  for (const entry of entries) {
    const targetMtr = Number(entry.targetProductionMtrs) || 0;
    const prodMtr = Number(entry.productionMeter) || 0;
    const netWt = Number(entry.netWeight) || 0;
    const printMtr = Number(entry.printMeter) || 0;
    const hasData = Boolean(
      entry.companyName ||
      entry.rollNumber ||
      entry.quality ||
      targetMtr > 0 ||
      prodMtr > 0 ||
      netWt > 0 ||
      printMtr > 0
    );

    if (hasData) {
      totalRolls += 1;
      totalTargetMtrs += targetMtr;
      totalProductionMtrs += prodMtr;
      totalNetWt += netWt;
      totalPrintMtrs += printMtr;
    }
  }

  totalTargetMtrs = Math.round(totalTargetMtrs * 100) / 100;
  totalProductionMtrs = Math.round(totalProductionMtrs * 100) / 100;
  totalNetWt = Math.round(totalNetWt * 100) / 100;
  totalPrintMtrs = Math.round(totalPrintMtrs * 100) / 100;

  const avgWeightGsm =
    totalProductionMtrs > 0
      ? Math.round(((totalNetWt * 1000) / totalProductionMtrs) * 10) / 10
      : 0;

  const varianceMtrs = Math.round((totalPrintMtrs - totalProductionMtrs) * 100) / 100;

  const efficiencyPercent =
    totalProductionMtrs > 0
      ? Math.round(((totalPrintMtrs / totalProductionMtrs) * 100) * 10) / 10
      : 0;

  return {
    totalRolls,
    totalTargetMtrs,
    totalProductionMtrs,
    totalNetWt,
    avgWeightGsm,
    totalPrintMtrs,
    varianceMtrs,
    efficiencyPercent,
  };
}
