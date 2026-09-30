import { describe, it, expect } from "vitest";
import {
  calculateConvertexRow,
  computeConvertexTotals,
  ConvertexReportItem,
} from "../convertex-types";

describe("Convertex Production Calculations", () => {
  it("calculates avgWeight correctly in g/m", () => {
    // 500m roll with 50kg net weight => (50 / 500) * 1000 = 100 g/m
    const row = calculateConvertexRow({
      sequence: 1,
      rollNumber: "ROLL-001",
      rollMtr: 500,
      netWeight: 50,
      openingMeterReading: 1000,
      closingMeterReading: 1500,
    });

    expect(row.avgWeight).toBe(100);
    expect(row.productionPcs).toBe(500);
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

  it("computes total wastage kg and wastage percent correctly", () => {
    const row = calculateConvertexRow({
      sequence: 1,
      rollNumber: "ROLL-003",
      rollMtr: 1000,
      netWeight: 80,
      loomFabricWasteKg: 1.5,
      lamFabricWasteKg: 0.5,
      printFabricWasteKg: 1.0,
      machineWasteKg: 1.0,
    });

    // Total wastage = 1.5 + 0.5 + 1.0 + 1.0 = 4.0 kg
    expect(row.totalWastageKg).toBe(4);
    // Percentage = (4 / 80) * 100 = 5%
    expect(row.totalWastagePct).toBe(5);
  });

  it("computes shift totals accurately across multiple rows", () => {
    const entries: ConvertexReportItem[] = [
      calculateConvertexRow({
        sequence: 1,
        rollNumber: "R1",
        rollMtr: 1000,
        netWeight: 100,
        productionPcs: 1200,
        targetProductionPcs: 1200,
        loomFabricWasteKg: 1,
        lamFabricWasteKg: 1,
        printFabricWasteKg: 1,
        machineWasteKg: 1,
      }),
      calculateConvertexRow({
        sequence: 2,
        rollNumber: "R2",
        rollMtr: 2000,
        netWeight: 200,
        productionPcs: 2400,
        targetProductionPcs: 2400,
        loomFabricWasteKg: 2,
        lamFabricWasteKg: 2,
        printFabricWasteKg: 2,
        machineWasteKg: 2,
      }),
    ];

    const totals = computeConvertexTotals(entries);

    expect(totals.totalRolls).toBe(2);
    expect(totals.totalRollMtr).toBe(3000);
    expect(totals.totalNetWt).toBe(300);
    expect(totals.totalProductionPcs).toBe(3600);
    expect(totals.totalTargetPcs).toBe(3600);
    expect(totals.totalLoomWasteKg).toBe(3);
    expect(totals.totalLamWasteKg).toBe(3);
    expect(totals.totalPrintWasteKg).toBe(3);
    expect(totals.totalMachineWasteKg).toBe(3);
    expect(totals.totalWastageKg).toBe(12);
    // (12 / 300) * 100 = 4%
    expect(totals.totalWastagePct).toBe(4);
    // (300 / 3000) * 1000 = 100 g/m
    expect(totals.avgWeightGsm).toBe(100);
  });
});
