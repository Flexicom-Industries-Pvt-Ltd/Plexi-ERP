import { describe, it, expect } from "vitest";
import {
  calculateWastage,
  LaminationWastageReportData,
} from "../lamination-wastage-types";
import { generateWastageReportHtml } from "../print-wastage-report";

describe("Lamination Wastage Calculations", () => {
  it("calculates lumps and fabric wastage percentages correctly", () => {
    // 1000 kg raw material used with 15 kg lumps
    // 5000 kg fabric rolled with 50 kg fabric waste
    const res = calculateWastage(1000, 15, 5000, 50);

    expect(res.rawMaterialUsedKg).toBe(1000);
    expect(res.lumpsWastageKg).toBe(15);
    // (15 / 1000) * 100 = 1.5%
    expect(res.lumpsWastagePct).toBe(1.5);

    expect(res.fabricNetWeightKg).toBe(5000);
    expect(res.fabricWastageKg).toBe(50);
    // (50 / 5000) * 100 = 1.0%
    expect(res.fabricWastagePct).toBe(1.0);

    // Total base: 1000 + 5000 = 6000 kg
    expect(res.totalBaseKg).toBe(6000);
    // Total waste: 15 + 50 = 65 kg
    expect(res.totalWastageKg).toBe(65);
    // (65 / 6000) * 100 = 1.08%
    expect(res.totalWastagePct).toBe(1.08);
  });

  it("handles zero base quantities gracefully without NaN", () => {
    const res = calculateWastage(0, 0, 0, 0);

    expect(res.lumpsWastagePct).toBe(0);
    expect(res.fabricWastagePct).toBe(0);
    expect(res.totalWastagePct).toBe(0);
    expect(res.totalBaseKg).toBe(0);
    expect(res.totalWastageKg).toBe(0);
  });
});

describe("Lamination Wastage Printable Report HTML", () => {
  it("generates correct HTML with company title and values", () => {
    const mockReport: LaminationWastageReportData = {
      date: "2026-09-29",
      shiftName: "Day Shift",
      operatorName: "Ramesh Kumar",
      contractorName: "Shree Ram Textiles",
      rawMaterialUsedKg: 1000,
      lumpsWastageKg: 15,
      lumpsWastagePct: 1.5,
      fabricNetWeightKg: 5000,
      fabricWastageKg: 50,
      fabricWastagePct: 1.0,
      totalBaseKg: 6000,
      totalWastageKg: 65,
      totalWastagePct: 1.08,
      status: "SUBMITTED",
      remarks: "Normal purging at startup",
    };

    const html = generateWastageReportHtml(mockReport);

    expect(html).toContain("FLEXICOM INDUSTRIES PVT. LIMITED");
    expect(html).toContain("LAMINATION SHIFT WASTAGE & SCRAP REPORT");
    expect(html).toContain("2026-09-29");
    expect(html).toContain("Day Shift");
    expect(html).toContain("Ramesh Kumar");
    expect(html).toContain("Shree Ram Textiles");
    expect(html).toContain("Lumps");
    expect(html).toContain("1.5%");
    expect(html).toContain("Fabric");
    expect(html).toContain("1%");
    expect(html).toContain("6,000.00");
    expect(html).toContain("65.00");
  });
});
