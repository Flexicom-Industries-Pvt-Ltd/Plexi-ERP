import { describe, it, expect } from "vitest";
import {
  computeRollStockSummary,
  LoomRollStockItem,
} from "../loom-roll-stock-types";
import { generateLoomRollStockHtml } from "../print-loom-roll-stock";

describe("Loom Roll Stock Calculation & Print Engine", () => {
  const mockRolls: LoomRollStockItem[] = [
    {
      id: "entry-1",
      sequence: 1,
      rollNumber: "CT-14376",
      loomNumber: 4,
      size: "490",
      qualityType: "Mahal/LPP/W",
      initialReading: 1000,
      finalReading: 2500,
      meter: 1500,
      grossWeightKg: 241.2,
      tareWeightKg: 1.2,
      nettWeightKg: 240.0,
      avgWeightPerMeter: 160.0,
      contractor: "Balaji Manpower",
      supervisorSign: "R. Sharma",
      remarks: "Clean weave",
      date: "2026-09-28",
      shiftName: "Day Shift",
    },
    {
      id: "entry-2",
      sequence: 2,
      rollNumber: "CT-14377",
      loomNumber: 4,
      size: "490",
      qualityType: "Mahal/LPP/W",
      initialReading: 2500,
      finalReading: 3500,
      meter: 1000,
      grossWeightKg: 161.2,
      tareWeightKg: 1.2,
      nettWeightKg: 160.0,
      avgWeightPerMeter: 160.0,
      contractor: "Balaji Manpower",
      supervisorSign: "R. Sharma",
      remarks: "",
      date: "2026-09-28",
      shiftName: "Day Shift",
    },
    {
      id: "entry-3",
      sequence: 3,
      rollNumber: "CT-14378",
      loomNumber: 12,
      size: "500",
      qualityType: "UTCL/LPP/Y/67",
      initialReading: 500,
      finalReading: 2000,
      meter: 1500,
      grossWeightKg: 256.2,
      tareWeightKg: 1.2,
      nettWeightKg: 255.0,
      avgWeightPerMeter: 170.0,
      contractor: "In-House",
      supervisorSign: "M. Kumar",
      remarks: "Sample roll",
      date: "2026-09-28",
      shiftName: "Night Shift",
    },
  ];

  describe("computeRollStockSummary", () => {
    it("correctly aggregates totals across all stock rolls", () => {
      const summary = computeRollStockSummary(mockRolls);

      expect(summary.totalRolls).toBe(3);
      // 1500 + 1000 + 1500 = 4000
      expect(summary.totalMeters).toBe(4000);
      // 240 + 160 + 255 = 655
      expect(summary.totalNettWeightKg).toBe(655);
      // 241.2 + 161.2 + 256.2 = 658.6
      expect(summary.totalGrossWeightKg).toBe(658.6);
      expect(summary.totalTareWeightKg).toBe(3.6);

      // (655 * 1000) / 4000 = 163.75 -> rounded to 163.8 g/m
      expect(summary.averageWeightPerMeter).toBe(163.8);
      expect(summary.uniqueQualitiesCount).toBe(2);
      expect(summary.uniqueLoomsCount).toBe(2);
    });

    it("correctly breaks down stock quality-wise with weights and percentages", () => {
      const summary = computeRollStockSummary(mockRolls);
      expect(summary.qualityBreakdown).toHaveLength(2);

      // Highest nett weight sorted first: Mahal/LPP/W has 240+160=400kg, UTCL has 255kg
      const mahal = summary.qualityBreakdown[0];
      expect(mahal.qualityType).toBe("Mahal/LPP/W");
      expect(mahal.rollsCount).toBe(2);
      expect(mahal.totalMeters).toBe(2500);
      expect(mahal.totalNettWeightKg).toBe(400);
      expect(mahal.avgWeightPerMeter).toBe(160);
      // 400 / 655 = 61.06% -> 61.1%
      expect(mahal.percentageByWeight).toBeCloseTo(61.1, 1);

      const utcl = summary.qualityBreakdown[1];
      expect(utcl.qualityType).toBe("UTCL/LPP/Y/67");
      expect(utcl.rollsCount).toBe(1);
      expect(utcl.totalNettWeightKg).toBe(255);
      expect(utcl.avgWeightPerMeter).toBe(170);
    });

    it("handles empty rolls list gracefully", () => {
      const summary = computeRollStockSummary([]);
      expect(summary.totalRolls).toBe(0);
      expect(summary.totalMeters).toBe(0);
      expect(summary.totalNettWeightKg).toBe(0);
      expect(summary.averageWeightPerMeter).toBe(0);
      expect(summary.qualityBreakdown).toHaveLength(0);
      expect(summary.loomBreakdown).toHaveLength(0);
    });
  });

  describe("generateLoomRollStockHtml", () => {
    it("generates printable HTML containing logo, document title, and high-contrast tables", () => {
      const summary = computeRollStockSummary(mockRolls);
      const html = generateLoomRollStockHtml({
        rolls: mockRolls,
        summary,
        filterLabel: "Test Filter Scope",
      });

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("FLEXICOM INDUSTRIES PVT. LTD.");
      expect(html).toContain("Circular Loom — Floor Roll Stock Report");
      expect(html).toContain("CT-14376");
      expect(html).toContain("CT-14377");
      expect(html).toContain("CT-14378");
      expect(html).toContain("Mahal/LPP/W");
      expect(html).toContain("UTCL/LPP/Y/67");
      expect(html).toContain("Test Filter Scope");
      // Zero-background & high-contrast styling checks
      expect(html).toContain("-webkit-print-color-adjust: exact !important;");
      expect(html).toContain("background-color: #e2e8f0 !important;");
      expect(html).toContain("color: #000000 !important;");
    });
  });
});
