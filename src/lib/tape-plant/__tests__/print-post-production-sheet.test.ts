import { describe, it, expect } from "vitest";
import {
  generatePostProductionSheetHtml,
  PostProductionPrintData,
} from "../print-post-production-sheet";

describe("Tape Plant Post Production Print Engine", () => {
  const mockData: PostProductionPrintData = {
    date: "2026-09-28",
    shiftName: "Day Shift",
    operatorName: "Sunil Verma",
    status: "SUBMITTED",
    entries: [
      {
        id: "entry-1",
        recipeQuality: "FERRUS/LPP/WH/450/57/S1",
        plannedProductionKg: 2500,
        productionDoneKg: 2480,
        gapKg: 20,
        wasteKg: 35,
        wastePercent: 1.41,
        netProductionKg: 2445,
        remarks: "Smooth run, nominal trimming waste",
      },
      {
        id: "entry-2",
        recipeQuality: "AMB/PP/WH/500/76/S1",
        plannedProductionKg: 3000,
        productionDoneKg: 3050,
        gapKg: -50,
        wasteKg: 42,
        wastePercent: 1.38,
        netProductionKg: 3008,
        remarks: "Exceeded target",
      },
    ],
  };

  it("should generate valid printable HTML with DOCTYPE, logo, company title, and doc ref", () => {
    const html = generatePostProductionSheetHtml(mockData);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("logo.png");
    expect(html).toContain("FLEXICOM INDUSTRIES PVT. LIMITED");
    expect(html).toContain("DAILY TAPE PLANT POST-PRODUCTION REPORT");
    expect(html).toContain("TP-PP-20260928-DAYSHIFT");
    expect(html).toContain("Sunil Verma");
    expect(html).toContain("Day Shift");
  });

  it("should correctly compute and render aggregate KPIs", () => {
    const html = generatePostProductionSheetHtml(mockData);

    // Total planned: 2500 + 3000 = 5500
    expect(html).toContain("5,500");
    // Total done: 2480 + 3050 = 5530
    expect(html).toContain("5,530");
    // Total waste: 35 + 42 = 77
    expect(html).toContain("77");
    // Net output: 5530 - 77 = 5453
    expect(html).toContain("5,453");
  });

  it("should render per-recipe entries and official sign-offs", () => {
    const html = generatePostProductionSheetHtml(mockData);

    expect(html).toContain("FERRUS/LPP/WH/450/57/S1");
    expect(html).toContain("AMB/PP/WH/500/76/S1");
    expect(html).toContain("Shift Operator (Data Entry)");
    expect(html).toContain("Shift Supervisor / In-Charge");
    expect(html).toContain("Production Manager / Plant Head");
  });

  it("should handle empty entries gracefully without crashing", () => {
    const html = generatePostProductionSheetHtml({
      date: "2026-09-28",
      shiftName: "Night Shift",
      status: "SAVED",
      entries: [],
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("No recipe entries recorded for this shift");
  });
});
