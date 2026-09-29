import { describe, it, expect } from "vitest";
import { filterQualities, normalizeQualityName } from "../quality-filter";

describe("Lamination Quality Utilities", () => {
  const sampleQualities = [
    "NUVOCO SI",
    "UTCL YL SI",
    "White VIP",
    "Mahal/LPP/W",
    "STAR CEMENT",
    "DALMIA",
    "ULTRATECH",
    "AMBUJA",
    "STANDARD",
  ];

  it("returns all normalized qualities when query is empty", () => {
    const results = filterQualities(sampleQualities, "");
    expect(results).toHaveLength(sampleQualities.length);
    expect(results).toContain("NUVOCO SI");
    expect(results).toContain("White VIP");
  });

  it("filters case-insensitively and prioritizes starts-with matches", () => {
    const results = filterQualities(sampleQualities, "u");
    // "UTCL YL SI" and "ULTRATECH" start with 'u', while "NUVOCO SI" and "AMBUJA" contain 'u'
    expect(results.slice(0, 2)).toEqual(["UTCL YL SI", "ULTRATECH"]);
    expect(results).toHaveLength(4);
  });

  it("finds substring matches across words", () => {
    const results = filterQualities(sampleQualities, "si");
    expect(results).toContain("NUVOCO SI");
    expect(results).toContain("UTCL YL SI");
  });

  it("returns exact match first if present", () => {
    const results = filterQualities(sampleQualities, "dalmia");
    expect(results[0]).toBe("DALMIA");
  });

  it("returns empty array when no qualities match", () => {
    const results = filterQualities(sampleQualities, "XYZ_NON_EXISTENT");
    expect(results).toEqual([]);
  });

  it("normalizes quality names correctly", () => {
    expect(normalizeQualityName("  NUVOCO SI  ")).toBe("NUVOCO SI");
    expect(normalizeQualityName("")).toBe("");
  });
});
