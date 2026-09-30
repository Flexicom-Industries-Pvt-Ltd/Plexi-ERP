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

/**
 * Calculates row-level average GSM / weight ratio:
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
