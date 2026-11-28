import { describe, it, expect } from "vitest";
import {
  normalizeTapeMaterialName,
  TAPE_MATERIAL_MIXED_RP,
  TAPE_MATERIAL_NATURAL_RP,
  TAPE_MATERIAL_RP_WHITE,
  TAPE_MATERIAL_RP_YELLOW,
} from "../material-names";

describe("normalizeTapeMaterialName", () => {
  it("maps legacy RP1, RP2, HD RP, TPT keys to new canonical names", () => {
    expect(normalizeTapeMaterialName("RP1")).toBe(TAPE_MATERIAL_RP_WHITE);
    expect(normalizeTapeMaterialName("rp 1")).toBe(TAPE_MATERIAL_RP_WHITE);
    expect(normalizeTapeMaterialName("RP-2")).toBe(TAPE_MATERIAL_RP_YELLOW);
    expect(normalizeTapeMaterialName("HD RP")).toBe(TAPE_MATERIAL_MIXED_RP);
    expect(normalizeTapeMaterialName("hdrp")).toBe(TAPE_MATERIAL_MIXED_RP);
    expect(normalizeTapeMaterialName("TPT")).toBe(TAPE_MATERIAL_NATURAL_RP);
  });

  it("preserves canonical new names regardless of casing or spacing", () => {
    expect(normalizeTapeMaterialName("RP White")).toBe("RP White");
    expect(normalizeTapeMaterialName("rp white")).toBe("RP White");
    expect(normalizeTapeMaterialName("RP Yellow")).toBe("RP Yellow");
    expect(normalizeTapeMaterialName("mixed rp")).toBe("Mixed RP");
    expect(normalizeTapeMaterialName("natural rp")).toBe("Natural RP");
    expect(normalizeTapeMaterialName("pp")).toBe("PP");
    expect(normalizeTapeMaterialName("cc")).toBe("CC");
    expect(normalizeTapeMaterialName("mb")).toBe("MB");
  });

  it("preserves custom non-standard material names", () => {
    expect(normalizeTapeMaterialName("Vistamaxx 6102")).toBe("Vistamaxx 6102");
    expect(normalizeTapeMaterialName("  ")).toBe("");
  });
});

