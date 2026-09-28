/**
 * Flexicom Central ERP - Loom Roll Stock Data Types & Calculation Utilities
 */

export interface LoomRollStockItem {
  id: string;
  sequence?: number;
  rollNumber: string;
  loomNumber: number;
  size: string;
  qualityType: string;
  initialReading?: number;
  finalReading?: number;
  meter: number;
  grossWeightKg: number;
  tareWeightKg: number;
  nettWeightKg: number;
  avgWeightPerMeter: number;
  contractor: string;
  supervisorSign: string;
  remarks: string;
  date: string;
  shiftName: string;
  reportId?: string;
  status?: string;
  createdAt?: string;
}

export interface RollStockQualityBreakdown {
  qualityType: string;
  rollsCount: number;
  totalMeters: number;
  totalGrossWeightKg: number;
  totalNettWeightKg: number;
  avgWeightPerMeter: number;
  percentageByWeight: number;
  percentageByRolls: number;
}

export interface RollStockLoomBreakdown {
  loomNumber: number;
  rollsCount: number;
  totalMeters: number;
  totalNettWeightKg: number;
}

export interface LoomRollStockSummary {
  totalRolls: number;
  totalMeters: number;
  totalGrossWeightKg: number;
  totalTareWeightKg: number;
  totalNettWeightKg: number;
  averageWeightPerMeter: number;
  uniqueQualitiesCount: number;
  uniqueLoomsCount: number;
  qualityBreakdown: RollStockQualityBreakdown[];
  loomBreakdown: RollStockLoomBreakdown[];
}

export interface LoomRollStockApiResponse {
  success: boolean;
  rolls: LoomRollStockItem[];
  summary: LoomRollStockSummary;
  availableQualities: Array<{
    code: string;
    colorGroup?: string;
    colour?: string;
    denier?: number | null;
    size?: string;
  }>;
  availableShifts: Array<{ id: string; name: string }>;
  availableLooms: number[];
  availableContractors: string[];
}

export function computeRollStockSummary(rolls: LoomRollStockItem[]): LoomRollStockSummary {
  const totalRolls = rolls.length;
  const totalMeters = Math.round(rolls.reduce((sum, r) => sum + (Number(r.meter) || 0), 0) * 100) / 100;
  const totalGrossWeightKg = Math.round(rolls.reduce((sum, r) => sum + (Number(r.grossWeightKg) || 0), 0) * 100) / 100;
  const totalTareWeightKg = Math.round(rolls.reduce((sum, r) => sum + (Number(r.tareWeightKg) || 1.2), 0) * 100) / 100;
  const totalNettWeightKg = Math.round(rolls.reduce((sum, r) => sum + (Number(r.nettWeightKg) || 0), 0) * 100) / 100;

  const averageWeightPerMeter = totalMeters > 0 && totalNettWeightKg > 0
    ? Math.round(((totalNettWeightKg * 1000) / totalMeters) * 10) / 10
    : 0;

  // Quality Breakdown
  const qualityMap = new Map<string, {
    rollsCount: number;
    totalMeters: number;
    totalGrossWeightKg: number;
    totalNettWeightKg: number;
  }>();

  rolls.forEach((r) => {
    const q = (r.qualityType || "STANDARD").trim();
    const curr = qualityMap.get(q) || {
      rollsCount: 0,
      totalMeters: 0,
      totalGrossWeightKg: 0,
      totalNettWeightKg: 0,
    };

    curr.rollsCount += 1;
    curr.totalMeters += Number(r.meter) || 0;
    curr.totalGrossWeightKg += Number(r.grossWeightKg) || 0;
    curr.totalNettWeightKg += Number(r.nettWeightKg) || 0;

    qualityMap.set(q, curr);
  });

  const qualityBreakdown: RollStockQualityBreakdown[] = Array.from(qualityMap.entries())
    .map(([qualityType, stat]) => {
      const qMeters = Math.round(stat.totalMeters * 100) / 100;
      const qGross = Math.round(stat.totalGrossWeightKg * 100) / 100;
      const qNett = Math.round(stat.totalNettWeightKg * 100) / 100;
      const avg = qMeters > 0 && qNett > 0 ? Math.round(((qNett * 1000) / qMeters) * 10) / 10 : 0;
      const pctWeight = totalNettWeightKg > 0 ? Math.round((qNett / totalNettWeightKg) * 1000) / 10 : 0;
      const pctRolls = totalRolls > 0 ? Math.round((stat.rollsCount / totalRolls) * 1000) / 10 : 0;

      return {
        qualityType,
        rollsCount: stat.rollsCount,
        totalMeters: qMeters,
        totalGrossWeightKg: qGross,
        totalNettWeightKg: qNett,
        avgWeightPerMeter: avg,
        percentageByWeight: pctWeight,
        percentageByRolls: pctRolls,
      };
    })
    .sort((a, b) => b.totalNettWeightKg - a.totalNettWeightKg);

  // Loom Breakdown
  const loomMap = new Map<number, {
    rollsCount: number;
    totalMeters: number;
    totalNettWeightKg: number;
  }>();

  rolls.forEach((r) => {
    const l = Number(r.loomNumber) || 0;
    if (l > 0) {
      const curr = loomMap.get(l) || {
        rollsCount: 0,
        totalMeters: 0,
        totalNettWeightKg: 0,
      };
      curr.rollsCount += 1;
      curr.totalMeters += Number(r.meter) || 0;
      curr.totalNettWeightKg += Number(r.nettWeightKg) || 0;
      loomMap.set(l, curr);
    }
  });

  const loomBreakdown: RollStockLoomBreakdown[] = Array.from(loomMap.entries())
    .map(([loomNumber, stat]) => ({
      loomNumber,
      rollsCount: stat.rollsCount,
      totalMeters: Math.round(stat.totalMeters * 100) / 100,
      totalNettWeightKg: Math.round(stat.totalNettWeightKg * 100) / 100,
    }))
    .sort((a, b) => a.loomNumber - b.loomNumber);

  return {
    totalRolls,
    totalMeters,
    totalGrossWeightKg,
    totalTareWeightKg,
    totalNettWeightKg,
    averageWeightPerMeter,
    uniqueQualitiesCount: qualityMap.size,
    uniqueLoomsCount: loomMap.size,
    qualityBreakdown,
    loomBreakdown,
  };
}
