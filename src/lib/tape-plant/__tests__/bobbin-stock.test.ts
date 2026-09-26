import { describe, it, expect } from "vitest";
import {
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
  computeNetProductionKg,
  computeBobbinStockCount,
  computeCrateStockCount,
  computeBobbinStockTotals,
  generateBobbinStockSheetHtml,
  BobbinStockItem,
} from "../bobbin-stock";
import { generateBobbinIssueSlipHtml } from "../print-bobbin-issue-slip";
import { generateBobbinInwardSlipHtml } from "../print-bobbin-inward-slip";

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

  it("aggregates totals properly across multiple qualities without shift/remarks dependencies", () => {
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
      {
        slNo: 3,
        recipeQuality: "1000D White Standard", // Duplicate quality aggregated
        productionDoneKg: 320,
        wasteKg: 0,
        netProductionKg: 320,
        bobbinStock: 200,  // 320 / 1.6
        crateStock: 25,    // 320 / 12.8
      },
    ];

    const totals = computeBobbinStockTotals(items);
    expect(totals.totalGrossDoneKg).toBe(2570);
    expect(totals.totalWasteKg).toBe(10);
    expect(totals.totalNetProductionKg).toBe(2560);
    expect(totals.totalBobbinStock).toBe(1600);
    expect(totals.totalCrateStock).toBe(200);
    expect(totals.uniqueQualitiesCount).toBe(2);
  });

  it("calculates available stock correctly when bobbins are issued to looms", () => {
    const items: BobbinStockItem[] = [
      {
        slNo: 1,
        recipeQuality: "1000D White Standard",
        productionDoneKg: 1600,
        wasteKg: 0,
        netProductionKg: 1600,
        bobbinStock: 1000,
        crateStock: 125,
        issuedCrates: 25,
        issuedBobbins: 200,
        issuedKg: 320,
        availableKg: 1280,
        availableBobbins: 800,
        availableCrates: 100,
      },
      {
        slNo: 2,
        recipeQuality: "850D Milky White",
        productionDoneKg: 650,
        wasteKg: 10,
        netProductionKg: 640,
        bobbinStock: 400,
        crateStock: 50,
        issuedCrates: 10,
        issuedBobbins: 80,
        issuedKg: 128,
        availableKg: 512,
        availableBobbins: 320,
        availableCrates: 40,
      },
    ];

    const totals = computeBobbinStockTotals(items);
    expect(totals.totalNetProductionKg).toBe(2240);
    expect(totals.totalIssuedCrates).toBe(35);
    expect(totals.totalIssuedBobbins).toBe(280);
    expect(totals.totalIssuedKg).toBe(448);
    expect(totals.totalAvailableKg).toBe(1792);
    expect(totals.totalAvailableBobbinStock).toBe(1120);
    expect(totals.totalAvailableCrateStock).toBe(140);
  });

  it("generates Bobbin Issue Slip HTML with loom number, weight conversion and sign-offs", () => {
    const slipData = {
      slipNumber: "TP-ISS-20260926-0001",
      date: "2026-09-26",
      shiftName: "Day Shift (08:00 - 20:00)",
      recipeQuality: "1000D White Standard",
      loomNumber: 4,
      loomIdentifier: "Loom #04",
      crateCount: 5,
      bobbinCount: 40,
      weightKg: 64,
      issuedBy: "Rajesh Kumar",
      receivedBy: "Mahesh Loom Incharge",
      remarks: "Urgent issue for Circular Loom #04 run",
    };

    const html = generateBobbinIssueSlipHtml(slipData);
    expect(html).toContain("BOBBIN ISSUE SLIP");
    expect(html).toContain("TP-ISS-20260926-0001");
    expect(html).toContain("1000D White Standard");
    expect(html).toContain("Loom #04");
    expect(html).toContain("5.0");
    expect(html).toContain("40.0");
    expect(html).toContain("64.00");
    expect(html).toContain("Rajesh Kumar");
    expect(html).toContain("Mahesh Loom Incharge");
    expect(html).toContain("Issued By (Tape Plant)");
    expect(html).not.toContain("Standard Rules:");
  });

  it("generates Bobbin Inward Receipt Slip HTML with gross, waste, net output and packing", () => {
    const slipData = {
      referenceNo: "TP-INW-20260926-0012",
      date: "2026-09-26",
      shiftName: "Day Shift (08:00 - 20:00)",
      recipeQuality: "850D Milky White",
      grossKg: 650,
      wasteKg: 10,
      netKg: 640,
      crates: 50,
      bobbins: 400,
      operatorName: "Vikram Singh",
      remarks: "Passed 100% elongation and denier check",
    };

    const html = generateBobbinInwardSlipHtml(slipData);
    expect(html).toContain("INWARD PRODUCTION SLIP");
    expect(html).toContain("TP-INW-20260926-0012");
    expect(html).toContain("850D Milky White");
    expect(html).toContain("650.00");
    expect(html).toContain("10.00");
    expect(html).toContain("640.00 KG");
    expect(html).toContain("50.00 CRATES");
    expect(html).toContain("400.00 PCS");
    expect(html).toContain("Vikram Singh");
    expect(html).toContain("Plant Operator / In-Charge");
    expect(html).not.toContain("Inward Confirmation:");
  });

  it("generates Bobbin Stock printable HTML sheet with logo, KPI strip, table, and 3-column sign-offs", () => {
    const items: BobbinStockItem[] = [
      {
        slNo: 1,
        recipeQuality: "1000D White Standard",
        productionDoneKg: 1600,
        wasteKg: 0,
        netProductionKg: 1600,
        bobbinStock: 1000,
        crateStock: 125,
      },
    ];
    const totals = computeBobbinStockTotals(items);

    const html = generateBobbinStockSheetHtml({
      dateDescription: "All Time (Till 2026-09-26)",
      shiftDescription: "All Shifts",
      items,
      totals,
    });

    expect(html).toContain("Flexicom Industries Pvt. Ltd.");
    expect(html).toContain("BOBBIN & CRATE STOCK SUMMARY REPORT");
    expect(html).toContain("logo.png");
    expect(html).toContain("1000D White Standard");
    expect(html).toContain("Total Produced Net (KG)");
    expect(html).toContain("Prepared By (Shift Operator / In-Charge)");
    expect(html).toContain("Verified By (Quality Control / Lab)");
    expect(html).toContain("Approved By (Plant Supervisor / Manager)");
    expect(html).not.toContain("Stock Accounting:");
  });
});
