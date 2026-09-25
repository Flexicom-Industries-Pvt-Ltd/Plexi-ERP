import { describe, it, expect } from "vitest";
import { generatePlanningSheetHtml, TapePlanningPrintData } from "../print-planning-sheet";

describe("Tape Plant Minimalist Planning Sheet Print Engine", () => {
  const mockPlanningData: TapePlanningPrintData = {
    date: "2026-09-24",
    shiftName: "Shift A (06:00 - 14:00)",
    status: "APPROVED",
    plans: [
      {
        id: "plan-1",
        recipeQuality: "LPP-500-YL-01",
        tapeType: "LPP",
        denier: 600,
        tapeWidth: 500,
        strength: 4.8,
        eloPercent: 22,
        bobbinMarking: "RED-BAND",
        colour: "YL (Yellow)",
        spacerSize: "1.2mm",
        requiredAsh: 1.5,
        ashPercent: 1.4,
        plannedQtyKg: 1200,
        omega: "W-3",
        vistPercent: 0,
        remarks: "Primary extrusion batch",
        materials: [
          { material: "PP", quantity: 960, percentage: 80 },
          { material: "CC", quantity: 120, percentage: 10 },
          { material: "MB", quantity: 60, percentage: 5 },
          { material: "RP1", quantity: 60, percentage: 5 },
        ],
      },
      {
        id: "plan-2",
        recipeQuality: "PP-700-NAT-02",
        tapeType: "PP",
        denier: 700,
        tapeWidth: 600,
        strength: 5.2,
        eloPercent: 25,
        bobbinMarking: "BLUE-BAND",
        colour: "Natural",
        spacerSize: "1.5mm",
        requiredAsh: 2.0,
        ashPercent: 1.8,
        plannedQtyKg: 800,
        omega: "W-4",
        vistPercent: 0,
        remarks: "Secondary batch",
        materials: [
          { material: "PP", quantity: 600, percentage: 75 },
          { material: "CC", quantity: 80, percentage: 10 },
          { material: "HD RP", quantity: 80, percentage: 10 },
          { material: "TPT", quantity: 40, percentage: 5 },
        ],
      },
    ],
  };

  it("should generate valid HTML document with standard DOCTYPE and title", () => {
    const html = generatePlanningSheetHtml(mockPlanningData);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Tape Plant Production Plan - TP-PLN-20260924-SHIFTA(06:00-14:00)</title>");
    expect(html).toContain("Flexicom Industries Pvt. Ltd.");
    expect(html).toContain("TAPE PLANT PRODUCTION PLAN");
  });

  it("should enforce A4 landscape print styling and compact margins", () => {
    const html = generatePlanningSheetHtml(mockPlanningData);
    expect(html).toContain("size: A4 landscape;");
    expect(html).toContain("margin: 6mm 8mm;");
    expect(html).toContain(".avoid-break");
  });

  it("should render Box 1: 1. QUALITY NAME AND SPECIFICATION with machine parameters", () => {
    const html = generatePlanningSheetHtml(mockPlanningData);
    expect(html).toContain("1. QUALITY NAME AND SPECIFICATION");
    expect(html).toContain("LPP-500-YL-01");
    expect(html).toContain("PP-700-NAT-02");
    expect(html).toContain("600");
    expect(html).toContain("700");
    expect(html).toContain("YL (Yellow)");
    expect(html).toContain("RED-BAND");
    expect(html).toContain("2,000 KG"); // Total planned output sum
  });

  it("should render Box 2: 2. RAW MATERIAL RECIPE AND QUANTITY with separate KG and % columns", () => {
    const html = generatePlanningSheetHtml(mockPlanningData);
    expect(html).toContain("2. RAW MATERIAL RECIPE AND QUANTITY");
    expect(html).toContain(">PP<");
    expect(html).toContain(">CC<");
    expect(html).toContain(">HD RP<");
    expect(html).toContain("960");
    expect(html).toContain("80%");
    expect(html).toContain("600");
    expect(html).toContain("75%");
    expect(html).toContain("1,560"); // Total PP sum
  });

  it("should render Box 3: 3. RAW MATERIAL SUMMARY with columnar totals and composition percentages", () => {
    const html = generatePlanningSheetHtml(mockPlanningData);
    expect(html).toContain("3. RAW MATERIAL SUMMARY");
    expect(html).toContain("Total Planned Qty (KG)");
    expect(html).toContain("Overall Composition (%)");
    expect(html).toContain("1,560 KG"); // PP aggregate
    expect(html).toContain("200 KG"); // CC aggregate
    expect(html).toContain("2,000 KG"); // Total batch
    expect(html).toContain("100.0%");
  });

  it("should render sign-off authorization block with all 3 signatures", () => {
    const html = generatePlanningSheetHtml(mockPlanningData);
    expect(html).toContain("Prepared By (Shift Operator / In-Charge)");
    expect(html).toContain("Verified By (Quality Control / Lab)");
    expect(html).toContain("Approved By (Plant Supervisor / Manager)");
  });

  it("should handle empty recipe plan gracefully", () => {
    const emptyData: TapePlanningPrintData = {
      date: "2026-09-24",
      shiftName: "Shift B",
      status: "DRAFT",
      plans: [],
    };
    const html = generatePlanningSheetHtml(emptyData);
    expect(html).toContain("No recipe plan runs defined for this shift");
    expect(html).toContain("0 KG");
  });
});
