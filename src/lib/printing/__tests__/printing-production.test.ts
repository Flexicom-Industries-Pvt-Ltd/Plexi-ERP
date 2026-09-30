import { describe, it, expect } from "vitest";
import {
  calculatePrintingRow,
  computePrintingTotals,
  PrintingReportItem,
  PrintingDailyReportData,
  computePrintingRawMaterialTotals,
  calculatePrintingWastage,
} from "../printing-types";
import { generatePrintingReportHtml } from "../print-printing-report";

describe("Printing Production Calculations", () => {
  describe("calculatePrintingRow", () => {
    it("calculates avg GSM accurately from net weight and production meters", () => {
      const row: PrintingReportItem = {
        sequence: 1,
        companyName: "Ambuja",
        unitName: "Ropar",
        grade: "PPC",
        targetProductionMtrs: 2500,
        drumSize: "20mm",
        quality: "80 GSM WHITE",
        rollNumber: "R-1001",
        loomNumber: "42 S1",
        productionMeter: 2421,
        netWeight: 181.7,
        avgWeight: 0,
        printMeter: 2421,
      };

      const result = calculatePrintingRow(row);
      // (181.7 * 1000) / 2421 = 75.0516... -> rounded to 1 decimal place = 75.1
      expect(result.avgWeight).toBe(75.1);
      expect(result.companyName).toBe("Ambuja");
      expect(result.unitName).toBe("Ropar");
    });

    it("handles zero production meter gracefully without NaN", () => {
      const row: PrintingReportItem = {
        sequence: 1,
        quality: "80 GSM WHITE",
        rollNumber: "R-1002",
        loomNumber: "42",
        productionMeter: 0,
        netWeight: 180,
        avgWeight: 0,
        printMeter: 0,
      };

      const result = calculatePrintingRow(row);
      expect(result.avgWeight).toBe(0);
    });

    it("handles zero net weight gracefully", () => {
      const row: PrintingReportItem = {
        sequence: 1,
        quality: "80 GSM WHITE",
        rollNumber: "R-1003",
        loomNumber: "42",
        productionMeter: 1000,
        netWeight: 0,
        avgWeight: 0,
        printMeter: 1000,
      };

      const result = calculatePrintingRow(row);
      expect(result.avgWeight).toBe(0);
    });
  });

  describe("computePrintingTotals", () => {
    it("computes totals matching the factory Excel report structure with new company and target fields", () => {
      const sampleRows: PrintingReportItem[] = [
        { sequence: 1, companyName: "Ambuja", unitName: "Ropar", grade: "PPC", targetProductionMtrs: 2500, drumSize: "20mm", quality: "80 GSM", rollNumber: "R-1", loomNumber: "42 S1", productionMeter: 2421, netWeight: 181.7, avgWeight: 75.1, printMeter: 2421 },
        { sequence: 2, companyName: "Ambuja PPC", unitName: "Darlaghat", grade: "OPC", targetProductionMtrs: 3500, drumSize: "20mm", quality: "80 GSM", rollNumber: "R-2", loomNumber: "42 S1", productionMeter: 2434, netWeight: 185.0, avgWeight: 76.0, printMeter: 2434 },
        { sequence: 3, companyName: "T Rapan Yellow", unitName: "Unit-1", grade: "Standard", targetProductionMtrs: 3300, drumSize: "25mm", quality: "80 GSM", rollNumber: "R-3", loomNumber: "68 S1", productionMeter: 2433, netWeight: 184.2, avgWeight: 75.7, printMeter: 2433 },
        { sequence: 4, companyName: "Rady", unitName: "", grade: "", targetProductionMtrs: 2500, drumSize: "", quality: "80 GSM", rollNumber: "R-4", loomNumber: "68 S1", productionMeter: 2432, netWeight: 184.8, avgWeight: 76.0, printMeter: 2432 },
        { sequence: 5, companyName: "Cem 9.5 20mm", unitName: "", grade: "", targetProductionMtrs: 2500, drumSize: "", quality: "80 GSM", rollNumber: "R-5", loomNumber: "68 S1", productionMeter: 2432, netWeight: 184.8, avgWeight: 76.0, printMeter: 2432 },
        { sequence: 6, companyName: "Jet M. T-01", unitName: "", grade: "", targetProductionMtrs: 2700, drumSize: "", quality: "80 GSM", rollNumber: "R-6", loomNumber: "68 S1", productionMeter: 2430, netWeight: 184.4, avgWeight: 75.9, printMeter: 2430 },
        { sequence: 7, companyName: "Ambuja", unitName: "Ropar", grade: "PPC", targetProductionMtrs: 2500, drumSize: "20mm", quality: "80 GSM", rollNumber: "R-7", loomNumber: "68 S1", productionMeter: 2431, netWeight: 184.6, avgWeight: 75.9, printMeter: 2431 },
        { sequence: 8, companyName: "Ambuja", unitName: "Ropar", grade: "PPC", targetProductionMtrs: 2500, drumSize: "20mm", quality: "80 GSM", rollNumber: "R-8", loomNumber: "68 S1", productionMeter: 2431, netWeight: 184.6, avgWeight: 75.9, printMeter: 2431 },
        // Empty blank row
        { sequence: 9, companyName: "", unitName: "", grade: "", targetProductionMtrs: "", drumSize: "", quality: "", rollNumber: "", loomNumber: "", productionMeter: 0, netWeight: 0, avgWeight: 0, printMeter: 0 },
      ];

      const totals = computePrintingTotals(sampleRows);

      expect(totals.totalRolls).toBe(8);
      expect(totals.totalTargetMtrs).toBe(22000);
      expect(totals.totalProductionMtrs).toBe(19444);
      expect(totals.totalNetWt).toBe(1474.1);
      expect(totals.totalPrintMtrs).toBe(19444);
      expect(totals.avgWeightGsm).toBe(75.8);
      expect(totals.varianceMtrs).toBe(0);
      expect(totals.efficiencyPercent).toBe(100);
    });

    it("computes variance and efficiency percent when printed meters differ", () => {
      const rows: PrintingReportItem[] = [
        { sequence: 1, quality: "80 GSM", rollNumber: "R-1", loomNumber: "1", productionMeter: 1000, netWeight: 80, avgWeight: 80, printMeter: 950 },
      ];

      const totals = computePrintingTotals(rows);

      expect(totals.totalRolls).toBe(1);
      expect(totals.totalProductionMtrs).toBe(1000);
      expect(totals.totalPrintMtrs).toBe(950);
      expect(totals.varianceMtrs).toBe(-50);
      expect(totals.efficiencyPercent).toBe(95);
    });
  });

  describe("generatePrintingReportHtml", () => {
    it("generates enterprise standard A4 landscape printout with 14 columns and signatures", () => {
      const mockReport: PrintingDailyReportData = {
        date: "2026-09-30",
        shiftName: "Day Shift",
        operatorName: "Ramesh Kumar",
        supervisorName: "Rajesh Sharma",
        status: "APPROVED",
        totals: {
          totalRolls: 1,
          totalTargetMtrs: 2500,
          totalProductionMtrs: 2421,
          totalNetWt: 181.7,
          avgWeightGsm: 75.1,
          totalPrintMtrs: 2350,
          varianceMtrs: -71,
          efficiencyPercent: 97.1,
        },
        entries: [
          {
            sequence: 1,
            companyName: "Ambuja Cement",
            unitName: "Ropar Unit",
            grade: "PPC",
            targetProductionMtrs: 2500,
            drumSize: "20mm",
            quality: "80 GSM WHITE",
            rollNumber: "D14332",
            loomNumber: "42 S1",
            productionMeter: 2421,
            netWeight: 181.7,
            avgWeight: 75.1,
            printMeter: 2350,
            remarks: "Standard run",
          },
        ],
      };

      const html = generatePrintingReportHtml(mockReport);

      expect(html).toContain("FLEXICOM INDUSTRIES PVT. LIMITED");
      expect(html).toContain("PRINTING DIVISION");
      expect(html).toContain("A4 landscape");
      expect(html).toContain("Ambuja Cement");
      expect(html).toContain("Ropar Unit");
      expect(html).toContain("D14332");
      expect(html).toContain("Operator Signature");
      expect(html).toContain("Supervisor Signature");
      expect(html).toContain("Quality In-Charge");
      expect(html).toContain("Plant Head / Manager");
    });
  });

  describe("Printing Raw Material Calculations & Conversions", () => {
    it("converts litres to kg using 0.82 factor and calculates ratio & mileage", () => {
      const { totals, calculatedEntries } = computePrintingRawMaterialTotals(
        [
          {
            sequence: 1,
            materialName: "Red Ink",
            unit: "LITRE",
            consumedLitre: 10,
            conversionFactor: 0.82,
            consumedKg: 0,
            ratioPercent: 0,
            mileage: 0,
          },
          {
            sequence: 2,
            materialName: "Ethyl Acetate (Solvent)",
            unit: "LITRE",
            consumedLitre: 20,
            conversionFactor: 0.82,
            consumedKg: 0,
            ratioPercent: 0,
            mileage: 0,
          },
          {
            sequence: 3,
            materialName: "Granules (Additive)",
            unit: "KG",
            consumedLitre: 0,
            conversionFactor: 1,
            consumedKg: 5.4,
            ratioPercent: 0,
            mileage: 0,
          },
        ],
        30000 // 30,000 metres printed
      );

      // Entry 1: 10 * 0.82 = 8.2 kg
      expect(calculatedEntries[0].consumedKg).toBe(8.2);
      // Entry 2: 20 * 0.82 = 16.4 kg
      expect(calculatedEntries[1].consumedKg).toBe(16.4);
      // Entry 3: direct kg = 5.4 kg
      expect(calculatedEntries[2].consumedKg).toBe(5.4);

      // Total Kg = 8.2 + 16.4 + 5.4 = 30 kg
      expect(totals.totalConsumedKg).toBe(30);
      expect(totals.totalConsumedLitre).toBe(30);

      // Overall Mileage = 30000 / 30 = 1000 m/kg
      expect(totals.overallMileage).toBe(1000);

      // Entry 1 Ratio = (8.2 / 30) * 100 = 27.33% -> 27.3%
      expect(calculatedEntries[0].ratioPercent).toBe(27.3);
      // Entry 1 Mileage = 30000 / 8.2 = 3658.5 m/kg
      expect(calculatedEntries[0].mileage).toBe(3658.5);
    });
  });

  describe("Printing Wastage Calculations", () => {
    it("calculates lamination waste %, print waste %, and total waste % against total production", () => {
      // 10,000 kg base production, 120 kg lamination waste, 80 kg print waste
      const calc = calculatePrintingWastage(10000, 120, 80);

      // Lamination waste % = (120 / 10000) * 100 = 1.2%
      expect(calc.laminationFabricWastePct).toBe(1.2);
      // Print waste % = (80 / 10000) * 100 = 0.8%
      expect(calc.printFabricWastePct).toBe(0.8);
      // Total waste kg = 120 + 80 = 200 kg
      expect(calc.totalWastageKg).toBe(200);
      // Total waste % = (200 / 10000) * 100 = 2.0%
      expect(calc.totalWastagePct).toBe(2.0);
    });

    it("handles zero base production safely without divide by zero or NaN", () => {
      const calc = calculatePrintingWastage(0, 50, 50);

      expect(calc.laminationFabricWastePct).toBe(0);
      expect(calc.printFabricWastePct).toBe(0);
      expect(calc.totalWastageKg).toBe(100);
      expect(calc.totalWastagePct).toBe(0);
    });
  });
});

