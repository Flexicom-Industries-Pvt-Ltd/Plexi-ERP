import { describe, it, expect } from "vitest";
import {
  createDefaultWastageReport,
  recalculateWastageReport,
  createDefaultRpProductionReport,
  createBlankRpRow,
  recalculateRpProductionReport,
} from "../rp-types";

describe("Recycling Plant (RP) Sheets Calculation Engine", () => {
  const SHIFTS = ["Day Shift", "Night Shift"];

  describe("Sheet 1: Wastage Collection Report", () => {
    it("reproduces exact sheet totals from 17/10/2026 Sl. No. 054", () => {
      const report = createDefaultWastageReport("2026-10-17", SHIFTS, 54);

      const setRow = (
        secKey: string,
        rowId: string,
        day: number,
        night: number
      ) => {
        const sec = report.sections.find((s) => s.key === secKey)!;
        const row = sec.rows.find((r) => r.id === rowId)!;
        row.shifts["Day Shift"] = day;
        row.shifts["Night Shift"] = night;
      };

      setRow("TAPE_PLANT", "tp-yellow", 55.4, 29.0);
      setRow("TAPE_PLANT", "tp-white", 30.0, 20.0);
      setRow("TAPE_PLANT", "tp-lums", 0, 2.0);

      setRow("LOOM", "loom-yellow", 4.4, 2.9);
      setRow("LOOM", "loom-white", 4.7, 2.2);
      setRow("LOOM", "loom-green", 4.0, 0);
      setRow("LOOM", "loom-mix", 4.0, 2.7);

      setRow("LAMINATION", "lam-fabric", 0, 4.5);
      setRow("LAMINATION", "lam-lums", 0, 2.8);

      setRow("CUTTEX", "cut-wastage", 0, 45.2);
      setRow("CUTTEX", "cut-fab", 0, 1.6);

      setRow("AD_CONVERTEX", "ad-wastage", 0, 49.9);
      setRow("AD_CONVERTEX", "ad-seg", 128.1, 0);

      setRow("PIPE_CUTTING", "pipe-yellow", 47.5, 0);
      setRow("PIPE_CUTTING", "pipe-white", 62.6, 0);

      setRow("PRINTING", "prt-fabric", 0, 12.1);
      setRow("PRINTING", "prt-loom-lam", 3.0, 6.4);

      report.marginBlocks.bobbinCleaning.rows[0].day = 10;
      report.marginBlocks.bobbinCleaning.rows[1].day = 5;
      report.marginBlocks.noteBox.rpLums = 23;

      const calc = recalculateWastageReport(report, SHIFTS);

      expect(calc.sections.find((s) => s.key === "TAPE_PLANT")?.sectionTotal).toBe(136.4);
      expect(calc.sections.find((s) => s.key === "LOOM")?.sectionTotal).toBe(24.9);
      expect(calc.sections.find((s) => s.key === "LAMINATION")?.sectionTotal).toBe(7.3);
      expect(calc.sections.find((s) => s.key === "VALVOMATIC")?.sectionTotal).toBe(0);
      expect(calc.sections.find((s) => s.key === "CUTTEX")?.sectionTotal).toBe(46.8);
      expect(calc.sections.find((s) => s.key === "AD_CONVERTEX")?.sectionTotal).toBe(178.0);
      expect(calc.sections.find((s) => s.key === "PIPE_CUTTING")?.sectionTotal).toBe(110.1);
      expect(calc.sections.find((s) => s.key === "PRINTING")?.sectionTotal).toBe(21.5);

      expect(calc.summaryTotalKg).toBe(525.0);
      expect(calc.marginBlocks.bobbinCleaning.totalDay).toBe(15);
      expect(calc.marginBlocks.noteBox.bCleaning).toBe(15);
      expect(calc.marginBlocks.noteBox.summary).toBe(525.0);
      expect(calc.marginBlocks.noteBox.total).toBe(563.0);
      expect(calc.grandTotalKg).toBe(563.0);
    });

    it("supports dynamic Shift Master shift configurations (e.g. 3 shifts)", () => {
      const THREE_SHIFTS = ["Shift A", "Shift B", "Shift C"];
      const report = createDefaultWastageReport("2026-10-18", THREE_SHIFTS, 55);
      const row = report.sections[0].rows[0];
      row.shifts["Shift A"] = 10;
      row.shifts["Shift B"] = 12.5;
      row.shifts["Shift C"] = 7.5;

      const calc = recalculateWastageReport(report, THREE_SHIFTS);
      expect(calc.sections[0].rows[0].total).toBe(30);
      expect(calc.sections[0].sectionShiftTotals["Shift B"]).toBe(12.5);
    });
  });

  describe("Sheet 2: R.P. Plant Production Report", () => {
    it("starts with blank editable rows instead of hardcoded material listings", () => {
      const report = createDefaultRpProductionReport("2026-10-17", SHIFTS, 414);
      expect(report.rows.length).toBe(5);
      expect(report.rows.every((r) => r.particular === "" && r.color === "")).toBe(true);
    });

    it("reproduces exact opening, production, issued and closing math from 17/10/26 Sr. No. 414", () => {
      const report = createDefaultRpProductionReport("2026-10-17", SHIFTS, 414);

      const rowDefs = [
        { particular: "PP", color: "MIX", op: 15320, prodA: 20, issued: 60 },
        { particular: "PP", color: "YELLOW", op: 3420, prodA: 600, issued: 180 },
        { particular: "PP", color: "WHITE", op: 4640, prodA: 180, issued: 600 },
        { particular: "PP", color: "GREEN", op: 280 },
        { particular: "PP", color: "ORANGE", op: 840 },
        { particular: "PP", color: "LUMS", op: 999, lumps: 23, isLumpsOnly: true },
        { particular: "PATTI MIX", color: "RED", op: 920 },
        { particular: "LUMS MIX", color: "40/60", op: 6640 },
        { particular: "RED PP", color: "", op: 615 },
        { particular: "PATTI MIX", color: "", op: 380 },
        { particular: "TAPE MIX", color: "", op: 2440 },
        { particular: "HD MIX", color: "", op: 960 },
        { particular: "DRL", color: "", op: 780 },
      ];

      report.rows = rowDefs.map((d, idx) => {
        const row = createBlankRpRow(idx + 1, SHIFTS, `rp-${idx + 1}`);
        row.particular = d.particular;
        row.color = d.color;
        row.isLumpsOnly = Boolean(d.isLumpsOnly);
        row.openingStock = d.op;
        if (d.prodA) row.productionShifts["Day Shift"] = d.prodA;
        if (d.issued) row.issuedToTapePlant = d.issued;
        if (d.lumps) row.lumpsOnDate = d.lumps;
        return row;
      });

      const calc = recalculateRpProductionReport(report, SHIFTS);

      expect(calc.rows[0].closingStock).toBe(15280);
      expect(calc.rows[1].closingStock).toBe(3840);
      expect(calc.rows[2].closingStock).toBe(4220);
      expect(calc.rows[5].openingStock).toBe(0);
      expect(calc.rows[5].closingStock).toBe(0);

      expect(calc.totalOpeningStock).toBe(37235);
      expect(calc.totalProductionOnDate).toBe(800);
      expect(calc.totalIssuedToTapePlant).toBe(840);
      expect(calc.totalLumpsOnDate).toBe(23);
      expect(calc.totalClosingStock).toBe(37195);
    });

    it("carries forward non-empty Particulars, Closing Stock -> Opening Stock, and same-month MTD", () => {
      const oct17 = createDefaultRpProductionReport("2026-10-17", SHIFTS, 414);
      oct17.rows[0].particular = "PP";
      oct17.rows[0].color = "MIX";
      oct17.rows[0].openingStock = 1000;
      oct17.rows[0].productionShifts["Day Shift"] = 200;
      oct17.rows[0].productionMtd = 5200;
      oct17.rows[0].issuedToTapePlant = 50;
      oct17.rows[0].issuedToTapePlantMtd = 1050;
      const calcOct17 = recalculateRpProductionReport(oct17, SHIFTS);

      const oct18 = createDefaultRpProductionReport("2026-10-18", SHIFTS, 415, calcOct17);
      expect(oct18.rows.length).toBe(1);
      expect(oct18.rows[0].particular).toBe("PP");
      expect(oct18.rows[0].openingStock).toBe(1150);
      expect(oct18.rows[0].closingStock).toBe(1150);
      expect(oct18.rows[0].productionMtd).toBe(5200);
      expect(oct18.rows[0].issuedToTapePlantMtd).toBe(1050);

      const nov01 = createDefaultRpProductionReport("2026-11-01", SHIFTS, 416, calcOct17);
      expect(nov01.rows[0].openingStock).toBe(1150);
      expect(nov01.rows[0].productionMtd).toBe(0);
      expect(nov01.rows[0].issuedToTapePlantMtd).toBe(0);
    });
  });
});
