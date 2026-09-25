import { describe, it, expect } from "vitest";
import {
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
  computeNetProductionKg,
  computeBobbinStockCount,
  computeCrateStockCount,
  computeBobbinStockTotals,
  BobbinStockItem,
} from "../bobbin-stock";

describe("Bobbin Stock Summary calculations", () => {
  it("verifies standard packing constants", () => {
    expect(BOBBIN_WEIGHT_KG).toBe(1.6);
    expect(CRATE_WEIGHT_KG).toBe(12.8);
    expect(BOBBINS_PER_CRATE).toBe(8);
    expect(BOBBIN_WEIGHT_KG * BOBBINS_PER_CRATE).toBe(CRATE_WEIGHT_KG);
  });

  it("calculates net production correctly (Done - Waste)", () => {
    expect(computeNetProductionKg(1000, 20)).toBe(980);
    expect(computeNetProductionKg("1250.50", "25.25")).toBe(1225.25);
    expect(computeNetProductionKg(0, 0)).toBe(0);
    expect(computeNetProductionKg(10, 50)).toBe(0); // Cannot be negative
    expect(computeNetProductionKg(null, undefined)).toBe(0);
  });

  it("calculates bobbin stock (Net Kg / 1.6)", () => {
    // 160 kg / 1.6 = 100 bobbins
    expect(computeBobbinStockCount(160)).toBe(100);
    // 16 kg / 1.6 = 10 bobbins
    expect(computeBobbinStockCount(16)).toBe(10);
    // 12.8 kg / 1.6 = 8 bobbins
    expect(computeBobbinStockCount(12.8)).toBe(8);
    // 1000 kg / 1.6 = 625 bobbins
    expect(computeBobbinStockCount(1000)).toBe(625);
    // 0 kg
    expect(computeBobbinStockCount(0)).toBe(0);
  });

  it("calculates crate stock (Net Kg / 12.8)", () => {
    // 128 kg / 12.8 = 10 crates
    expect(computeCrateStockCount(128)).toBe(10);
    // 12.8 kg / 12.8 = 1 crate
    expect(computeCrateStockCount(12.8)).toBe(1);
    // 1280 kg / 12.8 = 100 crates
    expect(computeCrateStockCount(1280)).toBe(100);
    // 0 kg
    expect(computeCrateStockCount(0)).toBe(0);
  });

  it("aggregates totals properly across multiple qualities", () => {
    const items: BobbinStockItem[] = [
      {
        slNo: 1,
        recipeQuality: "1000D White Standard",
        productionDoneKg: 1600,
        wasteKg: 0,
        netProductionKg: 1600,
        bobbinStock: 1000, // 1600 / 1.6
        crateStock: 125,   // 1600 / 12.8
      },
      {
        slNo: 2,
        recipeQuality: "850D Milky White",
        productionDoneKg: 650,
        wasteKg: 10,
        netProductionKg: 640,
        bobbinStock: 400,  // 640 / 1.6
        crateStock: 50,    // 640 / 12.8
      },
    ];

    const totals = computeBobbinStockTotals(items);
    expect(totals.totalGrossDoneKg).toBe(2250);
    expect(totals.totalWasteKg).toBe(10);
    expect(totals.totalNetProductionKg).toBe(2240);
    expect(totals.totalBobbinStock).toBe(1400);
    expect(totals.totalCrateStock).toBe(175);
    expect(totals.uniqueQualitiesCount).toBe(2);
  });
});
