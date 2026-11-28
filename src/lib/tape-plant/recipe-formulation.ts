/**
 * Dual-Formulation & Ash Compliance Engine for Tape Plant Master Recipes.
 *
 * Aligns 1:1 with the Tapeline Master workbook formulas:
 * - Permissible Ash in Tape = (Type === "PP") ? FabAsh : FabAsh / 0.75
 * - Actual Ash Content = SUMPRODUCT(material%, row4AshFactors)
 *   - CC: 0.8, MB: 0.4, TPT Filler: 0.8
 *   - RP White: 0.10 (WITHOUT RP) / 0.12 (WITH RP)
 *   - RP Yellow (Colour): 0.12, Mixed RP: 0.12
 *   - PP / LDPE 040 / Natural RP: 0
 */

import {
  normalizeRpMode,
  RecipeRpMode,
  TAPE_MATERIAL_LDPE_040,
  TAPE_MATERIAL_MIXED_RP,
  TAPE_MATERIAL_NATURAL_RP,
  TAPE_MATERIAL_RP_WHITE,
  TAPE_MATERIAL_RP_YELLOW,
  TAPE_MATERIAL_TPT_FILLER,
} from "./material-names";

export interface RecipeBlendProfile {
  ppPercent: number | null;
  ccPercent: number | null;
  ldpePercent: number | null;
  mbPercent: number | null;
  rp1Percent: number | null; // RP White
  rp2Percent: number | null; // RP Yellow / RP Colour
  hdrpPercent: number | null; // Mixed RP / RP Mix
  tptPercent: number | null; // Natural RP / RP Natural
  tptFillerPercent?: number | null; // TPT Filler
  totalPercent?: number | null;
  actualAshPercent?: number | null;
}

export interface RecipeLikeRecord {
  code?: string;
  tapeType?: string | null;
  rpMode?: string | null;
  permissibleFabAsh?: number | null;
  permissibleTapeAsh?: number | null;
  requiredAsh?: number | null;
  ashPercent?: number | null;
  ppPercent?: number | null;
  ccPercent?: number | null;
  ldpePercent?: number | null;
  mbPercent?: number | null;
  rp1Percent?: number | null;
  rp2Percent?: number | null;
  hdrpPercent?: number | null;
  tptPercent?: number | null;
  tptFillerPercent?: number | null;
  totalPercent?: number | null;
  withRpComposition?: unknown;
  withoutRpComposition?: unknown;
}

export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function cleanNullablePct(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return round2(num);
}

/** Computes Permissible Ash in Tape (%) from Permissible Ash in Fab (%) and Tape Type. */
export function calculatePermissibleTapeAsh(
  tapeType: string | null | undefined,
  permissibleFabAsh: number | null | undefined
): number | null {
  if (permissibleFabAsh === undefined || permissibleFabAsh === null) return null;
  const fab = Number(permissibleFabAsh);
  if (!Number.isFinite(fab)) return null;
  const isPP = (tapeType || "").trim().toUpperCase() === "PP";
  return isPP ? round2(fab) : round2(fab / 0.75);
}

/** Sums all ingredient percentages in a blend profile cleanly. */
export function calculateProfileTotal(profile: Partial<RecipeBlendProfile>): number {
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return round2(
    num(profile.ppPercent) +
      num(profile.ccPercent) +
      num(profile.ldpePercent) +
      num(profile.mbPercent) +
      num(profile.rp1Percent) +
      num(profile.rp2Percent) +
      num(profile.hdrpPercent) +
      num(profile.tptPercent) +
      num(profile.tptFillerPercent)
  );
}

/** Calculates weighted Actual Ash Content (%) using Tapeline Master Row-4 coefficients. */
export function calculateActualAshContent(
  profile: Partial<RecipeBlendProfile>,
  mode: RecipeRpMode | string = "WITH_RP"
): number {
  const resolvedMode = normalizeRpMode(mode);
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const rpWhiteFactor = resolvedMode === "WITHOUT_RP" ? 0.1 : 0.12;
  const ash =
    num(profile.ccPercent) * 0.8 +
    num(profile.mbPercent) * 0.4 +
    num(profile.rp1Percent) * rpWhiteFactor +
    num(profile.rp2Percent) * 0.12 +
    num(profile.hdrpPercent) * 0.12 +
    num(profile.tptFillerPercent) * 0.8;
  return round2(ash);
}

/** Normalizes any raw blend JSON/object into a strict RecipeBlendProfile with totals and ash computed. */
export function normalizeBlendProfile(
  raw: unknown,
  mode: RecipeRpMode | string = "WITH_RP"
): RecipeBlendProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const pp = cleanNullablePct(obj.ppPercent);
  const cc = cleanNullablePct(obj.ccPercent);
  const ldpe = cleanNullablePct(obj.ldpePercent);
  const mb = cleanNullablePct(obj.mbPercent);
  const rp1 = cleanNullablePct(obj.rp1Percent ?? obj.rpWhitePercent);
  const rp2 = cleanNullablePct(obj.rp2Percent ?? obj.rpYellowPercent ?? obj.rpColourPercent);
  const hdrp = cleanNullablePct(obj.hdrpPercent ?? obj.rpMixPercent);
  const tpt = cleanNullablePct(obj.tptPercent ?? obj.rpNaturalPercent);
  const tptFiller = cleanNullablePct(obj.tptFillerPercent);

  const hasAny = [pp, cc, ldpe, mb, rp1, rp2, hdrp, tpt, tptFiller].some(
    (v) => v !== null && v !== undefined
  );
  if (!hasAny) return null;

  const base: RecipeBlendProfile = {
    ppPercent: pp ?? 0,
    ccPercent: cc ?? 0,
    ldpePercent: ldpe ?? 0,
    mbPercent: mb ?? 0,
    rp1Percent: rp1 ?? 0,
    rp2Percent: rp2 ?? 0,
    hdrpPercent: hdrp ?? 0,
    tptPercent: tpt ?? 0,
    tptFillerPercent: tptFiller ?? 0,
  };
  base.totalPercent = calculateProfileTotal(base);
  base.actualAshPercent = calculateActualAshContent(base, mode);
  return base;
}

export function createEmptyBlendProfile(): RecipeBlendProfile {
  return {
    ppPercent: null,
    ccPercent: null,
    ldpePercent: null,
    mbPercent: null,
    rp1Percent: null,
    rp2Percent: null,
    hdrpPercent: null,
    tptPercent: null,
    tptFillerPercent: null,
    totalPercent: 0,
    actualAshPercent: 0,
  };
}

/**
 * Resolves the active blend formulation for a given recipe & RP Mode ("WITH_RP" vs "WITHOUT_RP").
 * Prefers the mode-specific dual composition (`withRpComposition` / `withoutRpComposition`),
 * and cleanly falls back to flat legacy columns or the other profile if only one exists.
 */
export function resolveRecipeProfileForMode(
  recipe: RecipeLikeRecord | null | undefined,
  mode: RecipeRpMode | string = "WITH_RP"
): RecipeBlendProfile {
  if (!recipe) return createEmptyBlendProfile();
  const resolvedMode = normalizeRpMode(mode);

  const withRp = normalizeBlendProfile(recipe.withRpComposition, "WITH_RP");
  const withoutRp = normalizeBlendProfile(recipe.withoutRpComposition, "WITHOUT_RP");

  if (resolvedMode === "WITHOUT_RP" && withoutRp) return withoutRp;
  if (resolvedMode === "WITH_RP" && withRp) return withRp;

  // Fallback to legacy flat columns if present
  const flatProfile = normalizeBlendProfile(
    {
      ppPercent: recipe.ppPercent,
      ccPercent: recipe.ccPercent,
      ldpePercent: recipe.ldpePercent,
      mbPercent: recipe.mbPercent,
      rp1Percent: recipe.rp1Percent,
      rp2Percent: recipe.rp2Percent,
      hdrpPercent: recipe.hdrpPercent,
      tptPercent: recipe.tptPercent,
      tptFillerPercent: recipe.tptFillerPercent,
    },
    resolvedMode
  );

  if (flatProfile) return flatProfile;
  return withRp || withoutRp || createEmptyBlendProfile();
}

/** Builds standardized Planning MaterialRow entries for a recipe under the requested RP mode. */
export function buildMaterialsForRecipeMode(
  recipe: RecipeLikeRecord | null | undefined,
  mode: RecipeRpMode | string,
  plannedQtyKg: number | string
): { material: string; percentage: number | ""; quantity: number | "" }[] {
  const profile = resolveRecipeProfileForMode(recipe, mode);
  const qty = Number(plannedQtyKg);

  const pctOrEmpty = (v: number | null | undefined): number | "" => {
    if (v === undefined || v === null || v === 0) return "";
    return round2(v);
  };

  const computeQty = (v: number | null | undefined): number | "" => {
    if (!v || !Number.isFinite(qty) || qty <= 0) return "";
    return round2((qty * Number(v)) / 100);
  };

  const rows: { material: string; percentage: number | ""; quantity: number | "" }[] = [
    { material: "PP", percentage: pctOrEmpty(profile.ppPercent), quantity: computeQty(profile.ppPercent) },
    { material: "CC", percentage: pctOrEmpty(profile.ccPercent), quantity: computeQty(profile.ccPercent) },
    { material: TAPE_MATERIAL_LDPE_040, percentage: pctOrEmpty(profile.ldpePercent), quantity: computeQty(profile.ldpePercent) },
    { material: "MB", percentage: pctOrEmpty(profile.mbPercent), quantity: computeQty(profile.mbPercent) },
    { material: TAPE_MATERIAL_RP_WHITE, percentage: pctOrEmpty(profile.rp1Percent), quantity: computeQty(profile.rp1Percent) },
    { material: TAPE_MATERIAL_RP_YELLOW, percentage: pctOrEmpty(profile.rp2Percent), quantity: computeQty(profile.rp2Percent) },
    { material: TAPE_MATERIAL_MIXED_RP, percentage: pctOrEmpty(profile.hdrpPercent), quantity: computeQty(profile.hdrpPercent) },
    { material: TAPE_MATERIAL_NATURAL_RP, percentage: pctOrEmpty(profile.tptPercent), quantity: computeQty(profile.tptPercent) },
  ];

  if (profile.tptFillerPercent && profile.tptFillerPercent > 0) {
    rows.push({
      material: TAPE_MATERIAL_TPT_FILLER,
      percentage: pctOrEmpty(profile.tptFillerPercent),
      quantity: computeQty(profile.tptFillerPercent),
    });
  }

  return rows;
}
