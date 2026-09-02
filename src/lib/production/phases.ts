export const PRODUCTION_PHASES = [
  { value: "BOBBIN", label: "Bobbin" },
  { value: "LOOM", label: "Loom" },
  { value: "LAMINATION", label: "Lamination" },
  { value: "PRINTING", label: "Printing" },
  { value: "CUTTING", label: "Cutting" },
  { value: "CONVERTEX", label: "Convertex" },
  { value: "VALVOMATIC", label: "Valvomatic" },
  { value: "BCS", label: "BCS" },
  { value: "MANUAL_STITCH", label: "Manual Stitch" },
  { value: "BALING", label: "Baling" },
] as const;

export type ProductionPhaseValue = (typeof PRODUCTION_PHASES)[number]["value"];

export const PRODUCTION_PLAN_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export const CHARACTERISTIC_FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "SELECT", label: "Select" },
  { value: "BOOLEAN", label: "Boolean" },
  { value: "DATE", label: "Date" },
] as const;

export function phaseLabel(phase: string): string {
  return PRODUCTION_PHASES.find((p) => p.value === phase)?.label ?? phase;
}

export function statusLabel(status: string): string {
  return PRODUCTION_PLAN_STATUSES.find((s) => s.value === status)?.label ?? status;
}
