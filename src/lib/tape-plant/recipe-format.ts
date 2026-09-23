export interface RecipeQualityParts {
  company: string;
  tapeType: "PP" | "LPP" | string;
  colour: string;
  sizeMm: string;
  weightPerMetre: string;
  grade: "HC" | "S1" | string;
}

export const DEFAULT_RECIPE_PARTS: RecipeQualityParts = {
  company: "STYM",
  tapeType: "LPP",
  colour: "YL",
  sizeMm: "500",
  weightPerMetre: "64",
  grade: "HC",
};

export const DEFAULT_RECIPE_STRING = "STYM/LPP/YL/500/64/HC";

export interface ColourOption {
  code: string;
  name: string;
  dotColor: string;
}

export const STANDARD_COLOURS: ColourOption[] = [
  { code: "YL", name: "Yellow", dotColor: "bg-amber-400 border-amber-500" },
  { code: "NT", name: "Natural", dotColor: "bg-slate-200 border-slate-300" },
  { code: "WH", name: "White", dotColor: "bg-white border-slate-300" },
  { code: "BL", name: "Blue", dotColor: "bg-blue-500 border-blue-600" },
  { code: "RD", name: "Red", dotColor: "bg-red-500 border-red-600" },
  { code: "GN", name: "Green", dotColor: "bg-emerald-500 border-emerald-600" },
  { code: "BK", name: "Black", dotColor: "bg-slate-900 border-black" },
  { code: "OR", name: "Orange", dotColor: "bg-orange-500 border-orange-600" },
];

export const STANDARD_GRADES = [
  { code: "HC", name: "High Corona (HC)", hint: "Corona treated for printing/lamination" },
  { code: "S1", name: "Standard 1 (S1)", hint: "Standard untreated surface grade" },
];

export const COMMON_RECIPE_PRESETS = [
  { code: "STYM/LPP/YL/500/64/HC", label: "STYM · LPP · Yellow · 500mm · 64g/m · HC" },
  { code: "STYM/PP/NT/500/64/S1", label: "STYM · PP · Natural · 500mm · 64g/m · S1" },
  { code: "STYM/LPP/WH/450/60/HC", label: "STYM · LPP · White · 450mm · 60g/m · HC" },
  { code: "STYM/PP/BL/550/70/S1", label: "STYM · PP · Blue · 550mm · 70g/m · S1" },
  { code: "STYM/LPP/RD/500/64/HC", label: "STYM · LPP · Red · 500mm · 64g/m · HC" },
  { code: "STYM/PP/GN/500/64/S1", label: "STYM · PP · Green · 500mm · 64g/m · S1" },
];

/**
 * Parses a raw recipe string (e.g. "STYM/LPP/YL/500/64/HC" or legacy "S1") into structured parts.
 */
export function parseRecipeQuality(raw?: string | null): RecipeQualityParts {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { ...DEFAULT_RECIPE_PARTS };
  }

  const parts = raw.split("/").map((p) => p.trim().toUpperCase());

  if (parts.length >= 6) {
    return {
      company: parts[0] || "STYM",
      tapeType: parts[1] || "LPP",
      colour: parts[2] || "YL",
      sizeMm: parts[3] || "500",
      weightPerMetre: parts[4] || "64",
      grade: parts[5] || "HC",
    };
  }

  // Handle fallback or partial formats (e.g. legacy "S1" or "HC")
  if (parts.length === 1 && (parts[0] === "S1" || parts[0] === "HC")) {
    return {
      ...DEFAULT_RECIPE_PARTS,
      grade: parts[0],
    };
  }

  return {
    company: parts[0] || "STYM",
    tapeType: parts[1] || "LPP",
    colour: parts[2] || "YL",
    sizeMm: parts[3] || "500",
    weightPerMetre: parts[4] || "64",
    grade: parts[5] || "HC",
  };
}

/**
 * Formats structured parts into a standardized Recipe Quality ID string:
 * [COMPANY]/[TYPE]/[COLOUR]/[SIZE]/[WEIGHT]/[GRADE]
 */
export function formatRecipeQuality(parts: Partial<RecipeQualityParts>): string {
  const company = (parts.company || "STYM").trim().toUpperCase();
  const tapeType = (parts.tapeType || "LPP").trim().toUpperCase();
  const colour = (parts.colour || "YL").trim().toUpperCase();
  const sizeMm = (parts.sizeMm !== undefined && parts.sizeMm !== "" ? String(parts.sizeMm) : "500").trim();
  const weight = (parts.weightPerMetre !== undefined && parts.weightPerMetre !== "" ? String(parts.weightPerMetre) : "64").trim();
  const grade = (parts.grade || "HC").trim().toUpperCase();

  return `${company}/${tapeType}/${colour}/${sizeMm}/${weight}/${grade}`;
}

/**
 * Validates whether a recipe string conforms to standard 6-segment format.
 */
export function isStandardRecipeFormat(str?: string | null): boolean {
  if (!str) return false;
  const parts = str.split("/").map((s) => s.trim());
  return parts.length === 6 && parts.every((p) => p.length > 0);
}

/**
 * Get human-friendly colour name from code
 */
export function getColourName(code?: string | null): string {
  if (!code) return "—";
  const found = STANDARD_COLOURS.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found ? found.name : code;
}
