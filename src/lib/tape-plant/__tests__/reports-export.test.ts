import { describe, it, expect, vi } from "vitest";
import {
  exportTapePlantReportsExcel,
  TapePlantReportDataset,
} from "../reports-export";
import * as XLSX from "xlsx";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<any>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("Tape Plant Reports Excel Export Engine", () => {
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
      {
        id: "rep-2",
        date: "2026-09-24",
        shiftId: "shift-b",
        shiftName: "Shift B (14:00 - 22:00)",
        operatorName: "Sunil Sharma",
        recipeQuality: "PP-700-NAT-02",
        plannedKg: 800,
        actualKg: 790,
        gapKg: 10,
        wasteKg: 12,
        wastePercent: 1.52,
        netKg: 778,
        efficiencyPercent: 98.8,
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
        productionShare: 59.9,
        operators: ["Rajesh Kumar"],
      },
      {
        shiftId: "shift-b",
        shiftName: "Shift B (14:00 - 22:00)",
        recordCount: 1,
        plannedKg: 800,
        actualKg: 790,
        gapKg: 10,
        wasteKg: 12,
        wastePercent: 1.52,
        netKg: 778,
        efficiencyPercent: 98.8,
        productionShare: 40.1,
        operators: ["Sunil Sharma"],
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
        productionShare: 59.9,
        shifts: ["Shift A (06:00 - 14:00)"],
      },
      {
        operatorName: "Sunil Sharma",
        shiftCount: 1,
        plannedKg: 800,
        actualKg: 790,
        gapKg: 10,
        wasteKg: 12,
        wastePercent: 1.52,
        netKg: 778,
        efficiencyPercent: 98.8,
        qualityScore: 95.8,
        productionShare: 40.1,
        shifts: ["Shift B (14:00 - 22:00)"],
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
        shiftName: "Shift B (14:00 - 22:00)",
        plannedKg: 800,
        actualKg: 790,
        efficiencyPercent: 98.8,
        netEfficiencyPercent: 97.3,
        performanceTier: "TOP_TIER",
      },
    ],
    efficiencyOperatorWise: [
      {
        operatorName: "Sunil Sharma",
        plannedKg: 800,
        actualKg: 790,
        efficiencyPercent: 98.8,
        qualityScore: 95.8,
        performanceTier: "TOP_TIER",
      },
    ],
    totals: {
      totalPlannedKg: 2000,
      totalActualKg: 1970,
      totalGapKg: 30,
      totalWasteKg: 30,
      totalNetKg: 1940,
      avgWastePercent: 1.52,
      avgEfficiencyPercent: 98.5,
      totalShiftsCount: 2,
      totalOperatorsCount: 2,
      recordCount: 2,
    },
    count: 2,
  };

  it("should generate consolidated master Excel workbook with 6 sheets", () => {
    exportTapePlantReportsExcel({
      data: mockDataset,
      dateFrom: "2026-09-10",
      dateTo: "2026-09-24",
      mode: "all",
    });

    expect(XLSX.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const lastCall = calls[calls.length - 1];
    const wb = lastCall[0];
    const filename = lastCall[1];

    expect(filename).toContain("Tape_Plant_Report_Consolidated_Master_2026-09-10_to_2026-09-24.xlsx");
    expect(wb.SheetNames).toContain("Executive Overview");
    expect(wb.SheetNames).toContain("Production Summary");
    expect(wb.SheetNames).toContain("Shift-Wise Analysis");
    expect(wb.SheetNames).toContain("Operator-Wise Analysis");
    expect(wb.SheetNames).toContain("Wastage Analysis");
    expect(wb.SheetNames).toContain("Efficiency & Performance");
  });

  it("should generate dedicated shift-wise Excel export when requested", () => {
    exportTapePlantReportsExcel({
      data: mockDataset,
      dateFrom: "2026-09-10",
      dateTo: "2026-09-24",
      mode: "shift",
    });

    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const lastCall = calls[calls.length - 1];
    const wb = lastCall[0];
    const filename = lastCall[1];

    expect(filename).toContain("Tape_Plant_Report_SHIFT_2026-09-10_to_2026-09-24.xlsx");
    expect(wb.SheetNames).toContain("Shift-Wise Analysis");
  });

  it("should generate dedicated operator-wise Excel export when requested", () => {
    exportTapePlantReportsExcel({
      data: mockDataset,
      dateFrom: "2026-09-10",
      dateTo: "2026-09-24",
      mode: "operator",
    });

    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const lastCall = calls[calls.length - 1];
    const wb = lastCall[0];
    const filename = lastCall[1];

    expect(filename).toContain("Tape_Plant_Report_OPERATOR_2026-09-10_to_2026-09-24.xlsx");
    expect(wb.SheetNames).toContain("Operator-Wise Analysis");
  });
});
