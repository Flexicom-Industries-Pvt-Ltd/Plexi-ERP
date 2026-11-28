import { describe, it, expect } from "vitest";
import {
  calculateActualAshContent,
  calculatePermissibleTapeAsh,
  calculateProfileTotal,
  buildMaterialsForRecipeMode,
  resolveRecipeProfileForMode,
} from "../recipe-formulation";
import { TAPELINE_MASTER_RECIPES } from "../tapeline-master-data";
import {
  TAPE_MATERIAL_LDPE_040,
  TAPE_MATERIAL_MIXED_RP,
  TAPE_MATERIAL_RP_WHITE,
  TAPE_MATERIAL_RP_YELLOW,
} from "../material-names";

describe("Tapeline Master Dual Formulation & Ash Engine", () => {
  it("computes Permissible Ash in Tape accurately for PP and LPP", () => {
    expect(calculatePermissibleTapeAsh("PP", 6)).toBe(6);
    expect(calculatePermissibleTapeAsh("PP", 5.5)).toBe(5.5);
    expect(calculatePermissibleTapeAsh("LPP", 4)).toBe(5.33);
    expect(calculatePermissibleTapeAsh("LPP", 18)).toBe(24);
    expect(calculatePermissibleTapeAsh("LPP", 3.75)).toBe(5);
    expect(calculatePermissibleTapeAsh("LPP", null)).toBeNull();
  });

  it("matches exact Tapeline Master ash factors across WITHOUT RP and WITH RP", () => {
    const adaniLpp = TAPELINE_MASTER_RECIPES.find(
      (r) => r.code === "AMB-NVCO/LPP/WHT/500/64/S1"
    )!;
    expect(
      calculateActualAshContent(adaniLpp.withoutRpComposition, "WITHOUT_RP")
    ).toBe(5.28);
    expect(
      calculateActualAshContent(adaniLpp.withRpComposition, "WITH_RP")
    ).toBe(5.28);

    // RP White shifts ash factor from 0.10 (Without RP) to 0.12 (With RP)
    const topPpWht = TAPELINE_MASTER_RECIPES.find(
      (r) => r.code === "TOP/PP/WHT/500/76/HC"
    )!;
    expect(calculateActualAshContent(topPpWht.withoutRpComposition, "WITHOUT_RP")).toBe(20);
    expect(calculateActualAshContent(topPpWht.withRpComposition, "WITH_RP")).toBe(20.2);

    const sterlingWht = TAPELINE_MASTER_RECIPES.find(
      (r) => r.code === "STRL/LPP/WHT/550/72/HC"
    )!;
    expect(calculateActualAshContent(sterlingWht.withoutRpComposition, "WITHOUT_RP")).toBe(40);
    expect(calculateActualAshContent(sterlingWht.withRpComposition, "WITH_RP")).toBe(40.4);
  });

  it("validates all 27 Tapeline Master seed recipes sum cleanly to 100%", () => {
    expect(TAPELINE_MASTER_RECIPES).toHaveLength(27);
    const codes = new Set(TAPELINE_MASTER_RECIPES.map((r) => r.code));
    expect(codes.size).toBe(27);

    for (const r of TAPELINE_MASTER_RECIPES) {
      expect(calculateProfileTotal(r.withoutRpComposition)).toBe(100);
      expect(calculateProfileTotal(r.withRpComposition)).toBe(100);
    }
  });

  it("swaps blend percentages and batch KG when switching between With RP and Without RP", () => {
    const yellowAdani = TAPELINE_MASTER_RECIPES.find(
      (r) => r.code === "AMB/PP/Y/500/76/S1"
    )!;

    const withoutMats = buildMaterialsForRecipeMode(yellowAdani, "WITHOUT_RP", 2000);
    const withMats = buildMaterialsForRecipeMode(yellowAdani, "WITH_RP", 2000);

    const getPct = (mats: typeof withoutMats, name: string) =>
      mats.find((m) => m.material === name)?.percentage;
    const getQty = (mats: typeof withoutMats, name: string) =>
      mats.find((m) => m.material === name)?.quantity;

    // Without RP has 89.75% PP, 3% Mixed RP, no RP Yellow
    expect(getPct(withoutMats, "PP")).toBe(89.75);
    expect(getQty(withoutMats, "PP")).toBe(1795);
    expect(getPct(withoutMats, TAPE_MATERIAL_MIXED_RP)).toBe(3);
    expect(getPct(withoutMats, TAPE_MATERIAL_RP_YELLOW)).toBe("");

    // With RP switches to 81.25% PP and 10% RP Yellow
    expect(getPct(withMats, "PP")).toBe(81.25);
    expect(getQty(withMats, "PP")).toBe(1625);
    expect(getPct(withMats, TAPE_MATERIAL_RP_YELLOW)).toBe(10);
    expect(getQty(withMats, TAPE_MATERIAL_RP_YELLOW)).toBe(200);

    // White quality includes LDPE 040 (1%) and swaps RP White between 0% and 20%
    const whiteAdani = TAPELINE_MASTER_RECIPES.find(
      (r) => r.code === "AMB-NVCO/LPP/WHT/500/64/S1"
    )!;
    const whiteWithRp = buildMaterialsForRecipeMode(whiteAdani, "WITH_RP", 1000);
    expect(getPct(whiteWithRp, TAPE_MATERIAL_LDPE_040)).toBe(1);
    expect(getQty(whiteWithRp, TAPE_MATERIAL_LDPE_040)).toBe(10);
    expect(getPct(whiteWithRp, TAPE_MATERIAL_RP_WHITE)).toBe(20);
    expect(getQty(whiteWithRp, TAPE_MATERIAL_RP_WHITE)).toBe(200);

    const whiteWithoutProfile = resolveRecipeProfileForMode(whiteAdani, "WITHOUT_RP");
    expect(whiteWithoutProfile.rp1Percent).toBe(0);
    expect(whiteWithoutProfile.ppPercent).toBe(92.4);
  });
});
