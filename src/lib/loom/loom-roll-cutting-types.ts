export interface LoomRollCuttingEntryItem {
  id?: string;
  sequence: number;          // 1, 2, 3... (S.No)
  rollNumber: string;        // e.g. "CT-14376", "DT-14377"
  loomNumber: number;        // e.g. 4, 2, 3, 68...
  size: string;              // Fabric width mm e.g. "490", "500"
  qualityType: string;       // e.g. "Mahal/LPP/W", "UTCL/LPP/Y/67"
  initialReading: number;    // Counter start
  finalReading: number;      // Counter cut point
  meter: number;             // Calculated: finalReading - initialReading
  grossWeightKg: number;     // Scale weight with core
  tareWeightKg: number;      // Core weight (default 1.2 kg)
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
export function computeRollMeters(initialReading: number, finalReading: number): number {
  if (typeof initialReading !== "number" || typeof finalReading !== "number") return 0;
  if (isNaN(initialReading) || isNaN(finalReading)) return 0;

  let diff = finalReading - initialReading;
  if (diff < 0) {
    // 4-digit or 5-digit mechanical counter rollover
    if (initialReading > 8000 && finalReading < 3000) {
      diff = (10000 - initialReading) + finalReading;
    } else if (initialReading > 80000 && finalReading < 30000) {
      diff = (100000 - initialReading) + finalReading;
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
  meter: number,
  grossWeightKg: number,
  tareWeightKg: number = 1.2
): {
  nettWeightKg: number;
  avgWeightPerMeter: number;
} {
  const gross = Number(grossWeightKg) || 0;
  const tare = Number(tareWeightKg) || 0;
  const nett = Math.max(0, Math.round((gross - tare) * 100) / 100);

  let avg = 0;
  if (meter > 0 && nett > 0) {
    // (Nett kg * 1000 g/kg) / meters = grams per meter (g/m)
    avg = Math.round(((nett * 1000) / meter) * 10) / 10;
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
