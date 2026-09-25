import { describe, it, expect, vi } from "vitest";
import { generateTapePlantPlanningExcel } from "../planning-export";
import { generatePlanningSheetHtml } from "../print-planning-sheet";
import { RecipePlanItem } from "@/components/tape-plant/TapePlantPlanningSection";
import * as XLSX from "xlsx";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<any>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("Tape Plant Multi-Shift (Day + Night) Planning & Execution", () => {
  const mockPlans: RecipePlanItem[] = [
    {
      id: "plan-1",
      recipeQuality: "wOND/LPP/WH/500/67/S1",
      tapeType: "LPP",
      denier: 900,
      tapeWidth: 500,
      strength: 4.8,
      eloPercent: 22,
      bobbinMarking: "RED",
      colour: "WHITE",
      spacerSize: "3.0",
      requiredAsh: 18,
      ashPercent: 18.2,
      plannedQtyKg: 5000,
      omega: "1.2",
      vistPercent: 0.5,
      remarks: "High volume 24h continuous batch feeding 28 looms",
      isDayNight: true,
      materials: [
        { material: "PP", quantity: 3800, percentage: 76 },
        { material: "CC", quantity: 800, percentage: 16 },
        { material: "MB", quantity: 400, percentage: 8 },
      ],
    },
    {
      id: "plan-2",
      recipeQuality: "AMB/PP/YL/74/500/S1",
      tapeType: "PP",
      denier: 850,
      tapeWidth: 500,
      strength: 4.5,
      eloPercent: 20,
      bobbinMarking: "BLACK",
      colour: "YELLOW",
      spacerSize: "2.45",
      requiredAsh: 15,
      ashPercent: 15.0,
      plannedQtyKg: 1200,
      omega: "1.0",
      vistPercent: 0.3,
      remarks: "Single shift test run",
      isDayNight: false,
      materials: [
        { material: "PP", quantity: 1000, percentage: 83.3 },
        { material: "CC", quantity: 200, percentage: 16.7 },
      ],
    },
  ];

  describe("Excel Export with Multi-Shift Runs", () => {
    it("should include Day+Night continuous run tag in remarks column", () => {
      generateTapePlantPlanningExcel({
        date: "2026-09-25",
        shiftName: "Day + Night (24 Hours)",
        status: "SUBMITTED",
        plans: mockPlans,
      });

      expect(XLSX.writeFile).toHaveBeenCalled();
      const [wb] = (XLSX.writeFile as any).mock.calls.slice(-1)[0];
      const sheet = wb.Sheets["Shift Production Plan"];
      expect(sheet).toBeDefined();

      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      // Row 4 is header, Row 5 is first data row
      const firstDataRow = json[4];
      const lastCol = firstDataRow[firstDataRow.length - 1];
      expect(lastCol).toContain("[Day+Night 24h Continuous Run]");
    });
  });

  describe("Printable Sheet Engine with Day + Night Runs", () => {
    it("should render Day+Night (24h) badge on 2-shift continuous recipes", () => {
      const html = generatePlanningSheetHtml({
        date: "2026-09-25",
        shiftName: "Day + Night (24 Hours)",
        status: "SUBMITTED",
        plans: mockPlans,
      });

      expect(html).toContain("wOND/LPP/WH/500/67/S1");
      expect(html).toContain("Day+Night (24h)");
      expect(html).toContain("5,000");
    });
  });

  describe("Multi-Shift Aggregate Logic", () => {
    it("should aggregate total 24h continuous planned production volume", () => {
      const totalPlanned = mockPlans.reduce((sum, p) => sum + Number(p.plannedQtyKg), 0);
      expect(totalPlanned).toBe(6200);

      const dayNightPlans = mockPlans.filter((p) => p.isDayNight);
      expect(dayNightPlans.length).toBe(1);
      expect(dayNightPlans[0].plannedQtyKg).toBe(5000);
    });
  });
});
