export interface LaminationRawMaterialItem {
  id: string;
  name: string;
  code?: string | null;
  percentage: number;
  unit: string;
  sequence: number;
  isActive: boolean;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RawMaterialEntryItem {
  id?: string;
  rawMaterialId?: string | null;
  materialName: string;
  percentage: number;
  manualKg: number;
  machineKg: number;
  diffKg: number;
  sequence: number;
  remarks?: string | null;
}

export interface LaminationRawMaterialReportData {
  id?: string;
  date: string;
  shiftName: string;
  operatorName?: string | null;
  supervisorName?: string | null;
  manualTotalKg: number;
  machineTotalKg: number;
  diffTotalKg: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  remarks?: string | null;
  entries: RawMaterialEntryItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LaminationRawMaterialTotals {
  manualTotalKg: number;
  machineTotalKg: number;
  diffTotalKg: number;
  totalPercentage: number;
  variancePercentage: number;
}

/**
 * Calculates row quantities for raw material entry.
 * Manual Qty is derived from: (manualTotal * percentage) / 100
 * Diff is derived from: Manual Qty - Machine Qty (Machine subtracted from Manual)
 */
export function calculateRawMaterialRow(
  manualTotal: number,
  machineKg: number,
  percentage: number
): { manualKg: number; machineKg: number; diffKg: number } {
  const manual = Number(((manualTotal * (percentage || 0)) / 100).toFixed(2));
  const machine = Number((Number(machineKg) || 0).toFixed(2));
  // User mandate: "the machine inoput have to be subscrated from the manual inoput"
  const diff = Number((manual - machine).toFixed(2));

  return {
    manualKg: manual,
    machineKg: machine,
    diffKg: diff,
  };
}

/**
 * Computes all column totals and net summary variance for the report.
 */
export function computeRawMaterialTotals(
  entries: RawMaterialEntryItem[],
  manualTotalInput: number
): LaminationRawMaterialTotals {
  const manualTotalKg = Number(manualTotalInput.toFixed(2));
  const machineTotalKg = Number(
    entries.reduce((acc, curr) => acc + (Number(curr.machineKg) || 0), 0).toFixed(2)
  );
  // Net difference: Manual Total - Machine Total
  const diffTotalKg = Number((manualTotalKg - machineTotalKg).toFixed(2));
  const totalPercentage = Number(
    entries.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0).toFixed(2)
  );
  const variancePercentage = manualTotalKg > 0
    ? Number(((diffTotalKg / manualTotalKg) * 100).toFixed(2))
    : 0;

  return {
    manualTotalKg,
    machineTotalKg,
    diffTotalKg,
    totalPercentage,
    variancePercentage,
  };
}
