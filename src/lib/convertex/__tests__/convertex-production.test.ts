import { describe, it, expect } from "vitest";
import {
  calculateConvertexRow,
  computeConvertexTotals,
  calculateConvertexWastageRow,
  computeConvertexWastageTotals,
  ConvertexReportItem,
  ConvertexWastageEntryItem,
} from "../convertex-types";

describe("Convertex Production Calculations", () => {
  it("calculates avgWeight correctly in g/m and derives productionPcs", () => {
    // 500m roll with 50kg net weight => (50 / 500) * 1000 = 100 g/m
    const row = calculateConvertexRow({
      sequence: 1,
      quality: "50kg Cement Bag",
      rollNumber: "ROLL-001",
      rollMtr: 500,
      netWeight: 50,
      openingMeterReading: 1000,
      closingMeterReading: 1500,
      coverPatchOs: 25,
      coverPatchDs: 25,
      valvePatch: 50,
    });

    expect(row.quality).toBe("50kg Cement Bag");
    expect(row.avgWeight).toBe(100);
    expect(row.productionPcs).toBe(500);
    expect(row.coverPatchOs).toBe(25);
    expect(row.coverPatchDs).toBe(25);
    expect(row.valvePatch).toBe(50);
    // Estimated productionKg = (500 * 100) / 1000 = 50kg
    expect(row.productionKg).toBe(50);
  });

  it("handles zero rollMtr without division by zero", () => {
    const row = calculateConvertexRow({
      sequence: 1,
      rollNumber: "ROLL-002",
      rollMtr: 0,
      netWeight: 20,
    });

    expect(row.avgWeight).toBe(0);
  });

  it("preserves explicit productionKg if entered", () => {
    const row = calculateConvertexRow({
      sequence: 1,
      rollNumber: "ROLL-003",
      rollMtr: 1000,
      netWeight: 80,
      openingMeterReading: 100,
      closingMeterReading: 1100,
      productionKg: 78.5,
    });

    expect(row.productionPcs).toBe(1000);
    expect(row.productionKg).toBe(78.5);
  });

  it("computes shift totals accurately across multiple rows", () => {
    const entries: ConvertexReportItem[] = [
      calculateConvertexRow({
        sequence: 1,
        quality: "UltraTech Cement",
        rollNumber: "R1",
        rollMtr: 1000,
        netWeight: 100,
        productionPcs: 1200,
        productionKg: 95.5,
        targetProductionPcs: 1200,
        coverPatchOs: 600,
        coverPatchDs: 600,
        valvePatch: 1200,
      }),
      calculateConvertexRow({
        sequence: 2,
        quality: "ACC Concrete",
        rollNumber: "R2",
        rollMtr: 2000,
        netWeight: 200,
        productionPcs: 2400,
        productionKg: 192.0,
        targetProductionPcs: 2400,
        coverPatchOs: 1200,
        coverPatchDs: 1200,
        valvePatch: 2400,
      }),
    ];

    const totals = computeConvertexTotals(entries);

    expect(totals.totalRolls).toBe(2);
    expect(totals.totalRollMtr).toBe(3000);
    expect(totals.totalNetWt).toBe(300);
    expect(totals.totalProductionPcs).toBe(3600);
    expect(totals.totalProductionKg).toBe(287.5);
    expect(totals.totalTargetPcs).toBe(3600);
    expect(totals.totalCoverPatchOs).toBe(1800);
    expect(totals.totalCoverPatchDs).toBe(1800);
    expect(totals.totalValvePatch).toBe(3600);
    expect(totals.avgWeightGsm).toBe(100);
  });
});

describe("Convertex Wastage Sub-Module Calculations", () => {
  it("calculates individual scrap percentages and net production correctly", () => {
    const row = calculateConvertexWastageRow({
      sequence: 1,
      quality: "50kg Fertilizer Bag",
      rollNumber: "W-ROLL-101",
      productionKg: 100,
      loomWasteKg: 2,
      lamWasteKg: 1,
      printWasteKg: 0.5,
      machineWasteKg: 1,
      coverPatchWasteKg: 0.5,
    });

    // Total Waste = 2 + 1 + 0.5 + 1 + 0.5 = 5.0 kg
    expect(row.totalWasteKg).toBe(5);
    // Total Waste % = (5 / 100) * 100 = 5%
    expect(row.totalWastePct).toBe(5);
    // Net Production = 100 - 5 = 95 kg
    expect(row.netProductionKg).toBe(95);

    expect(row.loomWastePct).toBe(2);
    expect(row.lamWastePct).toBe(1);
    expect(row.printWastePct).toBe(0.5);
    expect(row.machineWastePct).toBe(1);
    expect(row.coverPatchWastePct).toBe(0.5);
  });

  it("computes wastage shift totals across multiple entries", () => {
    const entries: ConvertexWastageEntryItem[] = [
      calculateConvertexWastageRow({
        sequence: 1,
        quality: "Quality A",
        rollNumber: "R1",
        productionKg: 200,
        loomWasteKg: 4,
        lamWasteKg: 2,
        printWasteKg: 1,
        machineWasteKg: 2,
        coverPatchWasteKg: 1,
      }),
      calculateConvertexWastageRow({
        sequence: 2,
        quality: "Quality B",
        rollNumber: "R2",
        productionKg: 300,
        loomWasteKg: 6,
        lamWasteKg: 3,
        printWasteKg: 1.5,
        machineWasteKg: 3,
        coverPatchWasteKg: 1.5,
      }),
    ];

    const totals = computeConvertexWastageTotals(entries);

    // Total Production = 500 kg
    expect(totals.totalProductionKg).toBe(500);
    // Loom = 10 kg => (10 / 500) * 100 = 2%
    expect(totals.totalLoomWasteKg).toBe(10);
    expect(totals.totalLoomWastePct).toBe(2);
    // Lam = 5 kg => 1%
    expect(totals.totalLamWasteKg).toBe(5);
    expect(totals.totalLamWastePct).toBe(1);
    // Total Waste = 10 + 5 + 2.5 + 5 + 2.5 = 25 kg => 5%
    expect(totals.totalWastageKg).toBe(25);
    expect(totals.totalWastagePct).toBe(5);
    // Net Production = 500 - 25 = 475 kg
    expect(totals.totalNetProductionKg).toBe(475);
  });
});
