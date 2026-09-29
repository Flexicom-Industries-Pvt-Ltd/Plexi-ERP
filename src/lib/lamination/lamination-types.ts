/**
 * Flexicom Central ERP - Lamination Module Data Types & Calculation Utilities
 */

export interface LaminationProductionEntryData {
  id?: string;
  sequence: number;
  quality: string;
  size?: string;
  loomNumber: number;
  rollNumber: string;
  rollMeter: number;
  netWeightBefore: number;
  avgWeightBefore: number; // (netWeightBefore / rollMeter) * 1000 in g/m
  productionMeter: number;
  netWeightAfter: number;
  avgWeightAfter: number; // (netWeightAfter / productionMeter) * 1000 in g/m
  coating: number; // ((netWeightAfter - netWeightBefore) / productionMeter) * 1000 in g/m
  remarks?: string;
  loomRollCuttingEntryId?: string;
}

export interface LaminationProductionReportData {
  id?: string;
  date: string; // YYYY-MM-DD
  shiftName: string; // "Day", "Night", "Shift A", etc.
  operatorName?: string;
  operatorId?: string;
  helperCount: number; // e.g. 3
  supervisorName?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  remarks?: string;
  totalRollMtrs: number;
  totalNetWtBefore: number;
  avgWtBefore: number;
  totalProductionMtrs: number;
  totalNetWtAfter: number;
  avgWtAfter: number;
  avgCoating: number;
  entries: LaminationProductionEntryData[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailableLaminationRoll {
  id: string;
  rollNumber: string;
  loomNumber: number;
  size: string;
  qualityType: string;
  meter: number;
  nettWeightKg: number;
  avgWeightPerMeter: number;
  date: string;
  shiftName: string;
  contractor?: string;
}

export interface GroupedQualityRolls {
  quality: string;
  rolls: AvailableLaminationRoll[];
  totalMeters: number;
  totalNettWeightKg: number;
}

/**
 * Calculates derived entry values:
 * - avgWeightBefore: (netWeightBefore ÷ rollMeter) × 1000
 * - avgWeightAfter: (netWeightAfter ÷ productionMeter) × 1000
 * - coating: ((netWeightAfter - netWeightBefore) ÷ productionMeter) × 1000
 */
export function calculateLaminationEntry(
  entry: Partial<LaminationProductionEntryData>
): LaminationProductionEntryData {
  const rollMeter = Number(entry.rollMeter) || 0;
  const netWeightBefore = Number(entry.netWeightBefore) || 0;
  const productionMeter = Number(entry.productionMeter) || 0;
  const netWeightAfter = Number(entry.netWeightAfter) || 0;

  const avgWeightBefore =
    rollMeter > 0 && netWeightBefore > 0
      ? Math.round(((netWeightBefore / rollMeter) * 1000) * 10) / 10
      : 0;

  const avgWeightAfter =
    productionMeter > 0 && netWeightAfter > 0
      ? Math.round(((netWeightAfter / productionMeter) * 1000) * 10) / 10
      : 0;

  const coating =
    productionMeter > 0
      ? Math.round((((netWeightAfter - netWeightBefore) / productionMeter) * 1000) * 10) / 10
      : 0;

  return {
    id: entry.id,
    sequence: Number(entry.sequence) || 1,
    quality: (entry.quality || "").trim(),
    size: entry.size || "",
    loomNumber: Number(entry.loomNumber) || 0,
    rollNumber: (entry.rollNumber || "").trim(),
    rollMeter,
    netWeightBefore,
    avgWeightBefore,
    productionMeter,
    netWeightAfter,
    avgWeightAfter,
    coating,
    remarks: entry.remarks || "",
    loomRollCuttingEntryId: entry.loomRollCuttingEntryId,
  };
}

/**
 * Computes aggregated column totals for a report
 */
export function computeLaminationReportTotals(entries: LaminationProductionEntryData[]) {
  const totalRollMtrs = Math.round(entries.reduce((sum, r) => sum + (Number(r.rollMeter) || 0), 0) * 100) / 100;
  const totalNetWtBefore = Math.round(entries.reduce((sum, r) => sum + (Number(r.netWeightBefore) || 0), 0) * 100) / 100;
  const totalProductionMtrs = Math.round(entries.reduce((sum, r) => sum + (Number(r.productionMeter) || 0), 0) * 100) / 100;
  const totalNetWtAfter = Math.round(entries.reduce((sum, r) => sum + (Number(r.netWeightAfter) || 0), 0) * 100) / 100;

  const avgWtBefore =
    totalRollMtrs > 0 && totalNetWtBefore > 0
      ? Math.round(((totalNetWtBefore / totalRollMtrs) * 1000) * 10) / 10
      : 0;

  const avgWtAfter =
    totalProductionMtrs > 0 && totalNetWtAfter > 0
      ? Math.round(((totalNetWtAfter / totalProductionMtrs) * 1000) * 10) / 10
      : 0;

  const avgCoating =
    totalProductionMtrs > 0
      ? Math.round((((totalNetWtAfter - totalNetWtBefore) / totalProductionMtrs) * 1000) * 10) / 10
      : 0;

  return {
    totalRollMtrs,
    totalNetWtBefore,
    avgWtBefore,
    totalProductionMtrs,
    totalNetWtAfter,
    avgWtAfter,
    avgCoating,
  };
}
