/**
 * Canonical Tape Plant Raw Material / Formulation Blend Identifiers & Aliases.
 * Maps legacy identifiers (RP1, RP2, HD RP, TPT) cleanly to current names
 * (RP White, RP Yellow, Mixed RP, Natural RP) so historical records remain 100% compatible.
 */

export const TAPE_MATERIAL_RP_WHITE = "RP White";
export const TAPE_MATERIAL_RP_YELLOW = "RP Yellow";
export const TAPE_MATERIAL_MIXED_RP = "Mixed RP";
export const TAPE_MATERIAL_NATURAL_RP = "Natural RP";

export const STANDARD_TAPE_MATERIALS = [
  "PP",
  "CC",
  "MB",
  TAPE_MATERIAL_RP_WHITE,
  TAPE_MATERIAL_RP_YELLOW,
  TAPE_MATERIAL_MIXED_RP,
  TAPE_MATERIAL_NATURAL_RP,
] as const;

export function normalizeTapeMaterialName(mat: string): string {
  const raw = (mat || "").trim();
  if (!raw) return "";
  const clean = raw.toUpperCase().replace(/[\s\-_]/g, "");
  if (clean === "PP") return "PP";
  if (clean === "CC") return "CC";
  if (clean === "MB") return "MB";
  if (clean === "RP1" || clean === "RPWHITE") return TAPE_MATERIAL_RP_WHITE;
  if (clean === "RP2" || clean === "RPYELLOW") return TAPE_MATERIAL_RP_YELLOW;
  if (clean === "HDRP" || clean === "MIXEDRP") return TAPE_MATERIAL_MIXED_RP;
  if (clean === "TPT" || clean === "NATURALRP") return TAPE_MATERIAL_NATURAL_RP;
  return raw;
}

