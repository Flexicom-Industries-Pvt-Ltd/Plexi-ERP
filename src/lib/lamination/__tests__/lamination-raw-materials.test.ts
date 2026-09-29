import { describe, it, expect } from "vitest";
import {
  calculateRawMaterialRow,
  computeRawMaterialTotals,
  RawMaterialEntryItem,
  LaminationRawMaterialReportData,
} from "../lamination-raw-material-types";
import { generateRawMaterialReportHtml } from "../print-raw-material-report";

describe("Lamination Raw Material Calculations", () => {
  it("calculates manual quantity based on total usage and percentage", () => {
    // 1000 kg manual total with 60% PP Granules
    const res = calculateRawMaterialRow(1000, 590, 60);

    expect(res.manualKg).toBe(600);
    expect(res.machineKg).toBe(590);
    // User mandate: "the machine inoput have to be subscrated from the manual inoput" -> 600 - 590 = +10
    expect(res.diffKg).toBe(10);
  });

  it("handles negative difference when machine input exceeds manual target (excess)", () => {
    // 1000 kg manual total with 25% LDPE Granules (target 250 kg), machine input 260 kg
    const res = calculateRawMaterialRow(1000, 260, 25);

    expect(res.manualKg).toBe(250);
    expect(res.machineKg).toBe(260);
    // 250 - 260 = -10 (excess material consumed)
    expect(res.diffKg).toBe(-10);
  });

  it("handles zero values and edge cases gracefully", () => {
    const res = calculateRawMaterialRow(0, 0, 10);
    expect(res.manualKg).toBe(0);
    expect(res.machineKg).toBe(0);
    expect(res.diffKg).toBe(0);
  });

  it("correctly computes totals for a complete batch of materials", () => {
    const entries: RawMaterialEntryItem[] = [
      {
        materialName: "PP Granules",
        percentage: 60,
        manualKg: 600,
        machineKg: 590,
        diffKg: 10,
        sequence: 1,
      },
      {
        materialName: "LDPE Granules",
        percentage: 25,
        manualKg: 250,
        machineKg: 255,
        diffKg: -5,
        sequence: 2,
      },
      {
        materialName: "White Masterbatch",
        percentage: 10,
        manualKg: 100,
        machineKg: 98,
        diffKg: 2,
        sequence: 3,
      },
      {
        materialName: "Calcium Carbonate",
        percentage: 5,
        manualKg: 50,
        machineKg: 52,
        diffKg: -2,
        sequence: 4,
      },
    ];

    const totals = computeRawMaterialTotals(entries, 1000);

    expect(totals.manualTotalKg).toBe(1000);
    expect(totals.machineTotalKg).toBe(995);
    // 1000 - 995 = 5 kg saved
    expect(totals.diffTotalKg).toBe(5);
    expect(totals.totalPercentage).toBe(100);
    expect(totals.variancePercentage).toBe(0.5);
  });
});

describe("Lamination Raw Material Printable Report HTML", () => {
  it("renders valid printable report with company letterhead and values", () => {
    const mockReport: LaminationRawMaterialReportData = {
      date: "2026-09-29",
      shiftName: "Day Shift",
      operatorName: "Ramesh Kumar",
      status: "SUBMITTED",
      manualTotalKg: 1000,
      machineTotalKg: 995,
      diffTotalKg: 5,
      remarks: "Batch #41 completed with minimal variance",
      entries: [
        {
          materialName: "PP Granules",
          percentage: 60,
          manualKg: 600,
          machineKg: 590,
          diffKg: 10,
          sequence: 1,
        },
      ],
    };

    const html = generateRawMaterialReportHtml(mockReport);

    expect(html).toContain("FLEXICOM INDUSTRIES PVT. LIMITED");
    expect(html).toContain("LAMINATION RAW MATERIAL CONSUMPTION & VARIANCE REPORT");
    expect(html).toContain("2026-09-29");
    expect(html).toContain("Day Shift");
    expect(html).toContain("Ramesh Kumar");
    expect(html).toContain("PP Granules");
    expect(html).toContain("60.0%");
    expect(html).toContain("600.00");
    expect(html).toContain("590.00");
    expect(html).toContain("+10");
  });
});
