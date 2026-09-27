import { describe, it, expect, vi } from "vitest";
import { computeIntervalDeltas, computeLoomEfficiency, LoomReadingEntryItem } from "../loom-reading-types";
import { exportLoomReadingSheetExcel } from "../loom-reading-export";
import { generateLoomReadingHtml } from "../print-loom-reading";
import * as XLSX from "xlsx";

vi.mock("xlsx", () => ({
  utils: {
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe("2 Hours Loom Reading Sheet Logic & Deltas", () => {
  it("should calculate correct bi-hourly production deltas and total shift meters", () => {
    const entry: Partial<LoomReadingEntryItem> = {
      loomNumber: 31,
      operatorName: "Ravinder",
      initialReading: 7220,
      r1Reading: 7480, // diff: 260
      r2Reading: 7730, // diff: 250
      r3Reading: 7980, // diff: 250
      r4Reading: 8210, // diff: 230
      r5Reading: 8440, // diff: 230
      r6Reading: 8780, // diff: 340
    };

    const result = computeIntervalDeltas(entry);
    expect(result.r1Prod).toBe(260);
    expect(result.r2Prod).toBe(250);
    expect(result.r3Prod).toBe(250);
    expect(result.r4Prod).toBe(230);
    expect(result.r5Prod).toBe(230);
    expect(result.r6Prod).toBe(340);
    expect(result.totalProduction).toBe(1560);
  });

  it("should handle partial intervals correctly", () => {
    const entry: Partial<LoomReadingEntryItem> = {
      loomNumber: 37,
      operatorName: "STP",
      initialReading: 7010,
      r1Reading: 7030, // diff: 20
      r2Reading: 7030, // diff: 0
      r3Reading: null,
      r4Reading: null,
      r5Reading: null,
      r6Reading: null,
    };

    const result = computeIntervalDeltas(entry);
    expect(result.r1Prod).toBe(20);
    expect(result.r2Prod).toBe(0);
    expect(result.r3Prod).toBeNull();
    expect(result.totalProduction).toBe(20);
  });

  it("should handle counter rollover when meter passes 9999 to 0010", () => {
    const entry: Partial<LoomReadingEntryItem> = {
      loomNumber: 48,
      initialReading: 8430,
      r1Reading: 8710, // diff: 280
      r2Reading: 8720, // diff: 10
      r3Reading: 9020, // diff: 300
      r4Reading: 9300, // diff: 280
      r5Reading: 10140, // diff: 840
      r6Reading: 10430, // diff: 290
    };

    const result = computeIntervalDeltas(entry);
    expect(result.r1Prod).toBe(280);
    expect(result.r2Prod).toBe(10);
    expect(result.r3Prod).toBe(300);
    expect(result.r4Prod).toBe(280);
    expect(result.r5Prod).toBe(840);
    expect(result.r6Prod).toBe(290);
    expect(result.totalProduction).toBe(2000);
  });

  it("should compute standard speeds correctly for PP (2.01 m/min) and LPP (2.50 m/min)", () => {
    // PP Quality standard speed is 2.01 m/min
    const ppCalc = computeLoomEfficiency(1447.2, "PP/White/850D", 0, 12);
    expect(ppCalc.standardSpeedMpm).toBe(2.01);
    expect(ppCalc.shiftMinutes).toBe(720);
    expect(ppCalc.runningMinutes).toBe(720);
    expect(ppCalc.theoreticalMeters).toBe(1447.2);
    expect(ppCalc.efficiencyPct).toBe(100);

    // LPP Quality standard speed is 2.50 m/min
    const lppCalc = computeLoomEfficiency(1800, "UTCL/LPP/Yellow", 0, 12);
    expect(lppCalc.standardSpeedMpm).toBe(2.50);
    expect(lppCalc.shiftMinutes).toBe(720);
    expect(lppCalc.runningMinutes).toBe(720);
    expect(lppCalc.theoreticalMeters).toBe(1800);
    expect(lppCalc.efficiencyPct).toBe(100);
  });

  it("should adjust theoretical production and efficiency when breakdown downtime occurs", () => {
    // 12h shift = 720 mins. Breakdown = 120 mins (2h). Running = 600 mins (10h).
    // Standard PP speed: 2.01 m/min -> Theoretical: 600 * 2.01 = 1206.0 m
    // Actual production: 1085.4 m -> Efficiency = (1085.4 / 1206.0) * 100 = 90.0%
    const result = computeLoomEfficiency(1085.4, "Mahal/PP/W", 120, 12);
    expect(result.runningMinutes).toBe(600);
    expect(result.theoreticalMeters).toBe(1206);
    expect(result.efficiencyPct).toBe(90);
  });

  it("should return 0% efficiency when machine had 0 production or full shutdown", () => {
    const zeroProd = computeLoomEfficiency(0, "Mahal/PP/W", 0, 12);
    expect(zeroProd.efficiencyPct).toBe(0);

    const fullDowntime = computeLoomEfficiency(0, "Mahal/PP/W", 720, 12);
    expect(fullDowntime.runningMinutes).toBe(0);
    expect(fullDowntime.theoreticalMeters).toBe(0);
    expect(fullDowntime.efficiencyPct).toBe(0);
  });
});

describe("2 Hours Loom Reading Export & Print Engine", () => {
  const mockDataset = {
    date: "2026-09-21",
    shiftName: "Day Shift",
    preparedBy: "Ravinder Kumar",
    checkedBy: "Suresh Sharma",
    approvedBy: "Plant Manager",
    timeSlots: ["10:00", "12:00", "02:00", "04:00", "06:00", "08:00"],
    initialTimeSlot: "08:00",
    entries: [
      {
        loomNumber: 31,
        operatorName: "Ravinder",
        size: "480",
        denier: "850",
        qualityType: "Mahal/LPP/W",
        initialReading: 7220,
        r1Reading: 7480,
        r1Prod: 260,
        r2Reading: 7730,
        r2Prod: 250,
        r3Reading: 7980,
        r3Prod: 250,
        r4Reading: 8210,
        r4Prod: 230,
        r5Reading: 8440,
        r5Prod: 230,
        r6Reading: 8780,
        r6Prod: 340,
        totalProduction: 1560,
        breakdownReason: "Change Over",
        breakdownMinutes: 30,
        efficiencyPct: 90.4,
        status: "RUNNING" as const,
        remarks: "",
      },
      {
        loomNumber: 37,
        operatorName: "STP",
        size: "500",
        denier: "1000",
        qualityType: "Amb/PP/Y/76",
        initialReading: 7010,
        r1Reading: 7030,
        r1Prod: 20,
        r2Reading: 7030,
        r2Prod: 0,
        r3Reading: 7030,
        r3Prod: 0,
        r4Reading: 7030,
        r4Prod: 0,
        r5Reading: 7030,
        r5Prod: 0,
        r6Reading: 7030,
        r6Prod: 0,
        totalProduction: 20,
        breakdownReason: "Full Shut Down",
        breakdownMinutes: 700,
        efficiencyPct: 49.8,
        status: "STOP" as const,
        remarks: "STOP",
      },
    ],
    kpis: {
      totalLooms: 91,
      runningLoomsCount: 1,
      idleLoomsCount: 1,
      totalShiftMeters: 1580,
      totalShiftKg: 252.8,
      totalWastageKg: 5,
      averageEfficiency: 90.4,
      totalBreakdownMins: 730,
      intervalTotals: [],
    },
  };

  it("should generate Excel export for 2 Hours Loom Reading Sheet", () => {
    exportLoomReadingSheetExcel(mockDataset);

    expect(XLSX.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const lastCall = calls[calls.length - 1];
    const filename = lastCall[1];

    expect(filename).toContain("Flexicom_Loom_2Hours_Report_20260921_Day_Shift.xlsx");
  });

  it("should generate official A4 landscape printable HTML with breakdown and efficiency", () => {
    const html = generateLoomReadingHtml(mockDataset);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Flexicom Industries Pvt. Limited");
    expect(html).toContain("2 HOUR'S LOOM PRODUCTION REPORT");
    expect(html).toContain("#31");
    expect(html).toContain("Ravinder");
    expect(html).toContain("Mahal/LPP/W");
    expect(html).toContain("1,560");
    expect(html).toContain("Change Over");
    expect(html).toContain("90.4%");
    expect(html).toContain("Prepared By (Loom Shed In-Charge)");
    expect(html).toContain("Checked By (Shift Supervisor)");
    expect(html).toContain("Approved By (Plant Manager)");
  });

  it("should respect filterActiveOnly option in printout", () => {
    const html = generateLoomReadingHtml({
      ...mockDataset,
      filterActiveOnly: true,
    });

    expect(html).toContain("Active Running Looms Only");
    expect(html).toContain("#31");
  });
});
