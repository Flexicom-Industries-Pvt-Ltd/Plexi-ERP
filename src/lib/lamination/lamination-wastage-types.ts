export interface LaminationWastageReportData {
  id?: string;
  date: string;
  shiftName: string;
  operatorName?: string | null;
  operatorId?: string | null;
  contractorName?: string | null;
  contractorId?: string | null;
  supervisorName?: string | null;
  rawMaterialUsedKg: number; // Base Qty for Lumps from Raw Material Manual Total
  lumpsWastageKg: number;    // Manual input
  lumpsWastagePct: number;   // Calculated %
  fabricNetWeightKg: number; // Base Qty for Fabric from Production Sheet
  fabricWastageKg: number;   // Manual input
  fabricWastagePct: number;  // Calculated %
  totalBaseKg: number;       // rawMaterialUsedKg + fabricNetWeightKg
  totalWastageKg: number;    // lumpsWastageKg + fabricWastageKg
  totalWastagePct: number;   // Calculated %
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculatedWastageResult {
  rawMaterialUsedKg: number;
  lumpsWastageKg: number;
  lumpsWastagePct: number;
  fabricNetWeightKg: number;
  fabricWastageKg: number;
  fabricWastagePct: number;
  totalBaseKg: number;
  totalWastageKg: number;
  totalWastagePct: number;
}

/**
 * Calculates wastage percentages and totals according to user formulas:
 * 1. Lumps % = (lumpsWastageKg / rawMaterialUsedKg) * 100
 * 2. Fabric % = (fabricWastageKg / fabricNetWeightKg) * 100
 * 3. Total % = (totalWastageKg / totalBaseKg) * 100
 */
export function calculateWastage(
  rawMaterialUsedKg: number,
  lumpsWastageKg: number,
  fabricNetWeightKg: number,
  fabricWastageKg: number
): CalculatedWastageResult {
  const rmUsed = Number((Number(rawMaterialUsedKg) || 0).toFixed(2));
  const lumps = Number((Number(lumpsWastageKg) || 0).toFixed(2));
  const fabricBase = Number((Number(fabricNetWeightKg) || 0).toFixed(2));
  const fabricWaste = Number((Number(fabricWastageKg) || 0).toFixed(2));

  const lumpsWastagePct = rmUsed > 0
    ? Number(((lumps / rmUsed) * 100).toFixed(2))
    : 0;

  const fabricWastagePct = fabricBase > 0
    ? Number(((fabricWaste / fabricBase) * 100).toFixed(2))
    : 0;

  const totalBaseKg = Number((rmUsed + fabricBase).toFixed(2));
  const totalWastageKg = Number((lumps + fabricWaste).toFixed(2));

  const totalWastagePct = totalBaseKg > 0
    ? Number(((totalWastageKg / totalBaseKg) * 100).toFixed(2))
    : 0;

  return {
    rawMaterialUsedKg: rmUsed,
    lumpsWastageKg: lumps,
    lumpsWastagePct,
    fabricNetWeightKg: fabricBase,
    fabricWastageKg: fabricWaste,
    fabricWastagePct,
    totalBaseKg,
    totalWastageKg,
    totalWastagePct,
  };
}
