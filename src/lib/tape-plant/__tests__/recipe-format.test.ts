import { describe, it, expect } from "vitest";
import {
  parseRecipeQuality,
  formatRecipeQuality,
  isStandardRecipeFormat,
  getColourName,
} from "../recipe-format";

describe("Tape Plant Recipe / Quality Format Utility", () => {
  it("should parse a full 6-segment recipe ID correctly", () => {
    const raw = "STYM/LPP/YL/500/64/HC";
    const parts = parseRecipeQuality(raw);

    expect(parts.company).toBe("STYM");
    expect(parts.tapeType).toBe("LPP");
    expect(parts.colour).toBe("YL");
    expect(parts.sizeMm).toBe("500");
    expect(parts.weightPerMetre).toBe("64");
    expect(parts.grade).toBe("HC");
  });

  it("should format structured parts back into a standardized 6-segment string", () => {
    const formatted = formatRecipeQuality({
      company: "STYM",
      tapeType: "PP",
      colour: "BL",
      sizeMm: "550",
      weightPerMetre: "70",
      grade: "S1",
    });

    expect(formatted).toBe("STYM/PP/BL/550/70/S1");
  });

  it("should validate standard 6-segment format", () => {
    expect(isStandardRecipeFormat("STYM/LPP/YL/500/64/HC")).toBe(true);
    expect(isStandardRecipeFormat("STYM/PP/NT/500/64/S1")).toBe(true);
    expect(isStandardRecipeFormat("S1")).toBe(false);
    expect(isStandardRecipeFormat("STYM/LPP")).toBe(false);
  });

  it("should retrieve friendly colour names", () => {
    expect(getColourName("YL")).toBe("Yellow");
    expect(getColourName("NT")).toBe("Natural");
    expect(getColourName("WH")).toBe("White");
    expect(getColourName("CUSTOM")).toBe("CUSTOM");
  });
});
