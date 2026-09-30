export interface PrintingReportItem {
  id?: string;
  sequence: number;
  quality: string;
  rollNumber: string;
  loomNumber: string;
  productionMeter: number | string;
  netWeight: number | string;
  avgWeight: number | string; // Avg. in g/m: (netWeight / productionMeter) * 1000
  printMeter: number | string; // Print in Metre
  remarks?: string;
}

export interface PrintingSummaryTotals {
  totalRolls: number;
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
  machineNo: string;
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
  let totalProductionMtrs = 0;
  let totalNetWt = 0;
  let totalPrintMtrs = 0;
  let totalRolls = 0;

  for (const entry of entries) {
    const prodMtr = Number(entry.productionMeter) || 0;
    const netWt = Number(entry.netWeight) || 0;
    const printMtr = Number(entry.printMeter) || 0;
    const hasData = Boolean(entry.rollNumber || prodMtr > 0 || netWt > 0 || printMtr > 0);

    if (hasData) {
      totalRolls += 1;
      totalProductionMtrs += prodMtr;
      totalNetWt += netWt;
      totalPrintMtrs += printMtr;
    }
  }

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
    totalProductionMtrs,
    totalNetWt,
    avgWeightGsm,
    totalPrintMtrs,
    varianceMtrs,
    efficiencyPercent,
  };
}
