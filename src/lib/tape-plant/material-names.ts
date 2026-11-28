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

export type RecipeRpMode = "WITH_RP" | "WITHOUT_RP";

export function normalizeRpMode(val: unknown): RecipeRpMode {
  if (typeof val === "string") {
    const clean = val.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (
      clean === "WITHOUT_RP" ||
      clean === "WITHOUTRP" ||
      clean === "NO_RP" ||
      clean === "NORP"
    ) {
      return "WITHOUT_RP";
    }
  }
  return "WITH_RP";
}

export function formatRpModeLabel(val: unknown): "With RP" | "Without RP" {
  return normalizeRpMode(val) === "WITHOUT_RP" ? "Without RP" : "With RP";
}

export function inferRpModeFromComposition(comp: {
  rp1Percent?: number | null;
  rp2Percent?: number | null;
  hdrpPercent?: number | null;
  tptPercent?: number | null;
}): RecipeRpMode {
  const sum =
    (Number(comp.rp1Percent) || 0) +
    (Number(comp.rp2Percent) || 0) +
    (Number(comp.hdrpPercent) || 0) +
    (Number(comp.tptPercent) || 0);
  return sum > 0 ? "WITH_RP" : "WITHOUT_RP";
}

