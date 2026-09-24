import { describe, it, expect } from "vitest";
import { generateTapePlantReportHtml } from "../print-report-sheet";
import { TapePlantReportDataset } from "../reports-export";

describe("Tape Plant Print & PDF Report Engine", () => {
  const mockDataset: TapePlantReportDataset = {
    summary: [
      {
        id: "rep-1",
        date: "2026-09-24",
        shiftId: "shift-a",
        shiftName: "Shift A (06:00 - 14:00)",
        operatorName: "Rajesh Kumar",
        recipeQuality: "LPP-500-YL-01",
        plannedKg: 1200,
        actualKg: 1180,
        gapKg: 20,
        wasteKg: 18,
        wastePercent: 1.53,
        netKg: 1162,
        efficiencyPercent: 98.3,
        status: "SUBMITTED",
      },
    ],
    shiftWise: [
      {
        shiftId: "shift-a",
        shiftName: "Shift A (06:00 - 14:00)",
        recordCount: 1,
        plannedKg: 1200,
        actualKg: 1180,
        gapKg: 20,
        wasteKg: 18,
        wastePercent: 1.53,
        netKg: 1162,
        efficiencyPercent: 98.3,
        productionShare: 100,
        operators: ["Rajesh Kumar"],
      },
    ],
    operatorWise: [
      {
        operatorName: "Rajesh Kumar",
        shiftCount: 1,
        plannedKg: 1200,
        actualKg: 1180,
        gapKg: 20,
        wasteKg: 18,
        wastePercent: 1.53,
        netKg: 1162,
        efficiencyPercent: 98.3,
        qualityScore: 95.2,
        productionShare: 100,
        shifts: ["Shift A (06:00 - 14:00)"],
      },
    ],
    wasteShiftWise: [
      {
        shiftName: "Shift A (06:00 - 14:00)",
        actualKg: 1180,
        wasteKg: 18,
        wastePercent: 1.53,
        statusBenchmark: "ACCEPTABLE",
      },
    ],
    wasteOperatorWise: [
      {
        operatorName: "Rajesh Kumar",
        actualKg: 1180,
        wasteKg: 18,
        wastePercent: 1.53,
        statusBenchmark: "ACCEPTABLE",
      },
    ],
    efficiencyShiftWise: [
      {
        shiftName: "Shift A (06:00 - 14:00)",
        plannedKg: 1200,
        actualKg: 1180,
        efficiencyPercent: 98.3,
        netEfficiencyPercent: 96.8,
        performanceTier: "TOP_TIER",
      },
    ],
    efficiencyOperatorWise: [
      {
        operatorName: "Rajesh Kumar",
        plannedKg: 1200,
        actualKg: 1180,
        efficiencyPercent: 98.3,
        qualityScore: 95.2,
        performanceTier: "TOP_TIER",
      },
    ],
    totals: {
      totalPlannedKg: 1200,
      totalActualKg: 1180,
      totalGapKg: 20,
      totalWasteKg: 18,
      totalNetKg: 1162,
      avgWastePercent: 1.53,
      avgEfficiencyPercent: 98.3,
      totalShiftsCount: 1,
      totalOperatorsCount: 1,
      recordCount: 1,
    },
    count: 1,
  };

  it("should generate valid consolidated HTML printable audit document", () => {
    const html = generateTapePlantReportHtml({
      data: mockDataset,
      dateFrom: "2026-09-10",
      dateTo: "2026-09-24",
      mode: "all",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Flexicom Industries Pvt. Ltd.");
    expect(html).toContain("Comprehensive Production, Wastage & Efficiency Audit");
    expect(html).toContain("size: A4 landscape;");
    expect(html).toContain("margin: 8mm;");
    expect(html).toContain("Shift A (06:00 - 14:00)");
    expect(html).toContain("Rajesh Kumar");
    expect(html).toContain("1,180");
    expect(html).toContain("98.3%");
  });

  it("should generate dedicated shift-wise printable HTML document", () => {
    const html = generateTapePlantReportHtml({
      data: mockDataset,
      dateFrom: "2026-09-10",
      dateTo: "2026-09-24",
      mode: "shift",
    });

    expect(html).toContain("Tape Plant Production Shift-Wise Analysis");
    expect(html).toContain("Production & Performance Breakdown (Shift-Wise)");
    expect(html).toContain("Rajesh Kumar");
  });

  it("should render 3 authorization sign-off signatures block", () => {
    const html = generateTapePlantReportHtml({
      data: mockDataset,
      dateFrom: "2026-09-10",
      dateTo: "2026-09-24",
      mode: "all",
    });

    expect(html).toContain("Prepared By (Production Data In-Charge)");
    expect(html).toContain("Verified By (Plant QC & Quality Audit)");
    expect(html).toContain("Approved By (General Manager / Plant Head)");
  });
});
