import { describe, it, expect } from "vitest";
import {
  calculateValvomaticRow,
  computeValvomaticTotals,
  calculateValvomaticWastageRow,
  computeValvomaticWastageTotals,
  ValvomaticReportItem,
  ValvomaticWastageEntryItem,
} from "../valvomatic-types";

describe("Valvomatic Production Calculations", () => {
  it("calculates avgWeight correctly in g/m and derives productionPcs", () => {
    // 500m roll with 50kg net weight => (50 / 500) * 1000 = 100 g/m
    const row = calculateValvomaticRow({
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
    const row = calculateValvomaticRow({
      sequence: 1,
      rollNumber: "ROLL-002",
      rollMtr: 0,
      netWeight: 20,
    });

    expect(row.avgWeight).toBe(0);
  });

  it("preserves explicit productionKg if entered", () => {
    const row = calculateValvomaticRow({
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
    const entries: ValvomaticReportItem[] = [
      calculateValvomaticRow({
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
      calculateValvomaticRow({
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

    const totals = computeValvomaticTotals(entries);

    expect(totals.totalRolls).toBe(2);
    expect(totals.totalRollMtr).toBe(3000);
    expect(totals.totalNetWt).toBe(300);
    expect(totals.totalProductionPcs).toBe(3600);
    expect(totals.totalProductionKg).toBe(287.5);
    expect(totals.totalTargetPcs).toBe(3600);
    expect(totals.totalCoverPatchOs).toBe(1800);
    expect(totals.totalCoverPatchDs).toBe(1800);
    expect(totals.totalValvePatch).toBe(3600);
    // Avg weight gsm across all = (300 / 3000) * 1000 = 100
    expect(totals.avgWeightGsm).toBe(100);
  });
});

describe("Valvomatic Wastage Calculations", () => {
  it("calculates individual wastage row metrics, percentages, and net production", () => {
    const row = calculateValvomaticWastageRow({
      sequence: 1,
      quality: "50kg Cement Bag",
      rollNumber: "R-100",
      productionKg: 100,
      loomWasteKg: 1,
      lamWasteKg: 1,
      printWasteKg: 0.5,
      machineWasteKg: 0.5,
      coverPatchWasteKg: 1,
    });

    expect(row.productionKg).toBe(100);
    expect(row.loomWasteKg).toBe(1);
    expect(row.loomWastePct).toBe(1);
    expect(row.lamWasteKg).toBe(1);
    expect(row.lamWastePct).toBe(1);
    expect(row.printWasteKg).toBe(0.5);
    expect(row.printWastePct).toBe(0.5);
    expect(row.machineWasteKg).toBe(0.5);
    expect(row.machineWastePct).toBe(0.5);
    expect(row.coverPatchWasteKg).toBe(1);
    expect(row.coverPatchWastePct).toBe(1);
    // Total waste: 1 + 1 + 0.5 + 0.5 + 1 = 4kg
    expect(row.totalWasteKg).toBe(4);
    expect(row.totalWastePct).toBe(4);
    // Net production: 100 - 4 = 96kg
    expect(row.netProductionKg).toBe(96);
  });

  it("handles zero productionKg gracefully in percentages", () => {
    const row = calculateValvomaticWastageRow({
      sequence: 1,
      quality: "Test",
      rollNumber: "R-0",
      productionKg: 0,
      loomWasteKg: 2,
    });

    expect(row.loomWastePct).toBe(0);
    expect(row.totalWastePct).toBe(0);
    expect(row.netProductionKg).toBe(0);
  });

  it("computes overall wastage totals across multiple rows", () => {
    const entries: ValvomaticWastageEntryItem[] = [
      calculateValvomaticWastageRow({
        sequence: 1,
        productionKg: 100,
        loomWasteKg: 2,
        lamWasteKg: 1,
        printWasteKg: 1,
        machineWasteKg: 1,
        coverPatchWasteKg: 1,
      }),
      calculateValvomaticWastageRow({
        sequence: 2,
        productionKg: 200,
        loomWasteKg: 4,
        lamWasteKg: 2,
        printWasteKg: 2,
        machineWasteKg: 2,
        coverPatchWasteKg: 2,
      }),
    ];

    const totals = computeValvomaticWastageTotals(entries);

    expect(totals.totalProductionKg).toBe(300);
    expect(totals.totalLoomWasteKg).toBe(6);
    // 6 / 300 * 100 = 2%
    expect(totals.totalLoomWastePct).toBe(2);
    expect(totals.totalLamWasteKg).toBe(3);
    // 3 / 300 * 100 = 1%
    expect(totals.totalLamWastePct).toBe(1);
    expect(totals.totalWastageKg).toBe(18);
    // 18 / 300 * 100 = 6%
    expect(totals.totalWastagePct).toBe(6);
    expect(totals.totalNetProductionKg).toBe(282);
  });
});
