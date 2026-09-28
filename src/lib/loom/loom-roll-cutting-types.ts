export interface LoomRollCuttingEntryItem {
  id?: string;
  sequence: number;          // 1, 2, 3... (S.No)
  rollNumber: string;        // e.g. "CT-14376", "DT-14377"
  loomNumber: number;        // e.g. 4, 2, 3, 68...
  size: string;              // Fabric width mm e.g. "490", "500"
  qualityType: string;       // e.g. "Mahal/LPP/W", "UTCL/LPP/Y/67"
  initialReading: number | string;    // Counter start
  finalReading: number | string;      // Counter cut point
  meter: number;             // Calculated: finalReading - initialReading
  grossWeightKg: number | string;     // Scale weight with core
  tareWeightKg: number | string;      // Core weight (default 1.2 kg)
  nettWeightKg: number;      // Gross - Tare
  avgWeightPerMeter: number; // (Nett * 1000) / Meter in g/m
  supervisorSign: string;    // Supervisor name/initials
  remarks: string;           // Notes / inspection remarks
  productionRollId?: string | null;
}

export interface LoomRollCuttingReportData {
  id?: string | null;
  date: string;
  shiftName: string;
  supervisorName: string;
  preparedBy: string;
  checkedBy?: string;
  approvedBy?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | string;
  remarks?: string;
  totalRollsCount: number;
  totalMeters: number;
  totalGrossWtKg: number;
  totalTareWtKg: number;
  totalNettWtKg: number;
  averageWeightPerMeter: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RollCuttingKpis {
  totalRollsCount: number;
  totalMeters: number;
  totalGrossWtKg: number;
  totalTareWtKg: number;
  totalNettWtKg: number;
  averageWeightPerMeter: number;
  activeLoomsCount: number;
}

/**
 * Calculates meter length from initial and final loom readings,
 * handling counter rollovers (e.g. 9950 -> 0120).
 */
export function computeRollMeters(
  initialReading: number | string | null | undefined,
  finalReading: number | string | null | undefined
): number {
  if (initialReading === "" || initialReading === null || initialReading === undefined) return 0;
  if (finalReading === "" || finalReading === null || finalReading === undefined) return 0;
  const init = typeof initialReading === "number" ? initialReading : parseFloat(String(initialReading));
  const final = typeof finalReading === "number" ? finalReading : parseFloat(String(finalReading));
  if (isNaN(init) || isNaN(final)) return 0;

  let diff = final - init;
  if (diff < 0) {
    // 4-digit or 5-digit mechanical counter rollover
    if (init > 8000 && final < 3000) {
      diff = (10000 - init) + final;
    } else if (init > 80000 && final < 30000) {
      diff = (100000 - init) + final;
    } else {
      diff = 0;
    }
  }
  return Math.round(diff * 100) / 100;
}

/**
 * Calculates nett weight and avg g/m (grams per meter).
 */
export function computeRollWeightsAndAvg(
  meter: number | string | null | undefined,
  grossWeightKg: number | string | null | undefined,
  tareWeightKg: number | string | null | undefined = 1.2
): {
  nettWeightKg: number;
  avgWeightPerMeter: number;
} {
  const m = typeof meter === "number" ? meter : (meter ? parseFloat(String(meter)) : 0) || 0;
  const gross = grossWeightKg !== "" && grossWeightKg !== null && grossWeightKg !== undefined
    ? (typeof grossWeightKg === "number" ? grossWeightKg : parseFloat(String(grossWeightKg)) || 0)
    : 0;
  const tare = tareWeightKg !== "" && tareWeightKg !== null && tareWeightKg !== undefined
    ? (typeof tareWeightKg === "number" ? tareWeightKg : parseFloat(String(tareWeightKg)) || 0)
    : 1.2;

  const nett = Math.max(0, Math.round((gross - tare) * 100) / 100);

  let avg = 0;
  if (m > 0 && nett > 0) {
    // (Nett kg * 1000 g/kg) / meters = grams per meter (g/m)
    avg = Math.round(((nett * 1000) / m) * 10) / 10;
  }

  return {
    nettWeightKg: nett,
    avgWeightPerMeter: avg,
  };
}

/**
 * Generates the next sequential roll number based on existing roll numbers or prefix.
 * Example: "CT-14376" -> "CT-14377"
 */
export function generateNextRollNumber(previousRollNumber?: string): string {
  if (!previousRollNumber || !previousRollNumber.trim()) {
    const today = new Date();
    const prefix = today.getMonth() % 2 === 0 ? "CT" : "DT";
    const randNum = 14000 + Math.floor(Math.random() * 900);
    return `${prefix}-${randNum}`;
  }

  const match = previousRollNumber.trim().match(/^([A-Za-z]+)-?(\d+)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10) + 1;
    return `${prefix}-${num}`;
  }

  return `${previousRollNumber}-1`;
}
