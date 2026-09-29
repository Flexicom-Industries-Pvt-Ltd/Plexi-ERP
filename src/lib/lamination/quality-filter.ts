/**
 * Quality filtering and normalization utilities for Lamination module.
 */

export function normalizeQualityName(name: string): string {
  if (!name) return "";
  return name.trim();
}

/**
 * Filter qualities case-insensitively based on search query.
 * Prioritizes:
 * 1. Exact match
 * 2. Starts with query
 * 3. Contains query
 */
export function filterQualities(qualities: string[], query: string): string[] {
  if (!qualities || !Array.isArray(qualities)) return [];
  const trimmed = (query || "").trim().toLowerCase();
  if (!trimmed) {
    return qualities.map(normalizeQualityName).filter(Boolean);
  }

  const normalized = qualities.map(normalizeQualityName).filter(Boolean);
  const exact: string[] = [];
  const startsWith: string[] = [];
  const contains: string[] = [];

  for (const q of normalized) {
    const lower = q.toLowerCase();
    if (lower === trimmed) {
      exact.push(q);
    } else if (lower.startsWith(trimmed)) {
      startsWith.push(q);
    } else if (lower.includes(trimmed)) {
      contains.push(q);
    }
  }

  return [...exact, ...startsWith, ...contains];
}
