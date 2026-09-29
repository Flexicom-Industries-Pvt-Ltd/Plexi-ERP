import { describe, it, expect } from "vitest";
import {
  calculateLaminationEntry,
  computeLaminationReportTotals,
  LaminationProductionEntryData,
  LaminationProductionReportData,
} from "../lamination-types";
import { generateLaminationReportHtml } from "../print-lamination-report";

describe("Lamination Production Calculations & Formats", () => {
  it("calculates avgWeightBefore, avgWeightAfter, and coating correctly based on sample data", () => {
    // Row 7 from Excel: Roll Mtr: 6367, Net Wt: 407.4, Prod: 6251, Net Wt After: 524
    const entry = calculateLaminationEntry({
      sequence: 1,
      quality: "NUVOCO SI",
      size: "500",
      loomNumber: 88,
      rollNumber: "DI13614",
      rollMeter: 6367,
      netWeightBefore: 407.4,
      productionMeter: 6251,
      netWeightAfter: 524,
    });

    expect(entry.sequence).toBe(1);
    expect(entry.quality).toBe("NUVOCO SI");
    expect(entry.loomNumber).toBe(88);
    expect(entry.rollNumber).toBe("DI13614");
    // (407.4 / 6367) * 1000 = 63.98 -> 64.0
    expect(entry.avgWeightBefore).toBeCloseTo(64.0, 1);
    // (524 / 6251) * 1000 = 83.82 -> 83.8
    expect(entry.avgWeightAfter).toBe(83.8);
    // ((524 - 407.4) / 6251) * 1000 = (116.6 / 6251) * 1000 = 18.65 -> 18.7
    expect(entry.coating).toBe(18.7);
  });

  it("handles zero production or zero roll meter safely without NaN or Infinity", () => {
    const zeroEntry = calculateLaminationEntry({
      sequence: 2,
      quality: "NUVOCO SI",
      loomNumber: 41,
      rollNumber: "DI13605",
      rollMeter: 0,
      netWeightBefore: 0,
      productionMeter: 0,
      netWeightAfter: 0,
    });

    expect(zeroEntry.avgWeightBefore).toBe(0);
    expect(zeroEntry.avgWeightAfter).toBe(0);
    expect(zeroEntry.coating).toBe(0);
  });

  it("computes report aggregate totals and overall averages accurately", () => {
    const entries: LaminationProductionEntryData[] = [
      calculateLaminationEntry({
        sequence: 1,
        quality: "NUVOCO SI",
        loomNumber: 88,
        rollNumber: "DI13614",
        rollMeter: 6367,
        netWeightBefore: 407.4,
        productionMeter: 6251,
        netWeightAfter: 524,
      }),
      calculateLaminationEntry({
        sequence: 2,
        quality: "NUVOCO SI",
        loomNumber: 41,
        rollNumber: "DI13605",
        rollMeter: 6516,
        netWeightBefore: 418.1,
        productionMeter: 6472,
        netWeightAfter: 537,
      }),
    ];

    const totals = computeLaminationReportTotals(entries);

    expect(totals.totalRollMtrs).toBe(6367 + 6516);
    expect(totals.totalNetWtBefore).toBe(407.4 + 418.1);
    expect(totals.totalProductionMtrs).toBe(6251 + 6472);
    expect(totals.totalNetWtAfter).toBe(524 + 537);

    // Overall avg wt before: ((407.4 + 418.1) / (6367 + 6516)) * 1000 = 64.07 -> 64.1
    expect(totals.avgWtBefore).toBeCloseTo(64.1, 1);
    // Overall avg wt after: ((524 + 537) / (6251 + 6472)) * 1000 = 83.39 -> 83.4
    expect(totals.avgWtAfter).toBeCloseTo(83.4, 1);
    // Overall coating: (((524 + 537) - (407.4 + 418.1)) / (6251 + 6472)) * 1000 = 18.5
    expect(totals.avgCoating).toBeCloseTo(18.5, 1);
  });

  it("generates company standard print HTML with all table columns and metadata", () => {
    const mockReport: LaminationProductionReportData = {
      date: "2026-09-21",
      shiftName: "Night Shift",
      operatorName: "Ramesh Kumar",
      helperCount: 3,
      supervisorName: "S.K. Sharma",
      status: "SUBMITTED",
      totalRollMtrs: 12883,
      totalNetWtBefore: 825.5,
      avgWtBefore: 64.1,
      totalProductionMtrs: 12723,
      totalNetWtAfter: 1061,
      avgWtAfter: 83.4,
      avgCoating: 18.5,
      entries: [
        calculateLaminationEntry({
          sequence: 1,
          quality: "NUVOCO SI",
          size: "500",
          loomNumber: 88,
          rollNumber: "DI13614",
          rollMeter: 6367,
          netWeightBefore: 407.4,
          productionMeter: 6251,
          netWeightAfter: 524,
        }),
      ],
    };

    const html = generateLaminationReportHtml(mockReport);

    expect(html).toContain("FLEXICOM INDUSTRIES PVT. LIMITED");
    expect(html).toContain("LAMINATION PRODUCT REPORT");
    expect(html).toContain("2026-09-21");
    expect(html).toContain("Night Shift");
    expect(html).toContain("Ramesh Kumar");
    expect(html).toContain("03");
    expect(html).toContain("DI13614");
    expect(html).toContain("NUVOCO SI");
    expect(html).toContain("88");
    expect(html).toContain("6,367");
    expect(html).toContain("407.4");
    expect(html).toContain("6,251");
    expect(html).toContain("524.0");
    expect(html).toContain("83.8");
    expect(html).toContain("18.7");
    expect(html).toContain("Operator Signature");
    expect(html).toContain("Floor Supervisor");
    expect(html).toContain("Plant Head / QA Approved");
  });
});
