import { describe, it, expect } from "vitest";
import {
  createDefaultWastageReport,
  recalculateWastageReport,
  createDefaultRpProductionReport,
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

      // Tape Plant: Yellow (55.4 + 29.0), White (30.0 + 20.0), Lums (0 + 2.0) => 136.4
      setRow("TAPE_PLANT", "tp-yellow", 55.4, 29.0);
      setRow("TAPE_PLANT", "tp-white", 30.0, 20.0);
      setRow("TAPE_PLANT", "tp-lums", 0, 2.0);

      // Loom: Yellow (4.4+2.9), White (4.7+2.2), Green (4.0+0), Mix (4.0+2.7) => 24.9
      setRow("LOOM", "loom-yellow", 4.4, 2.9);
      setRow("LOOM", "loom-white", 4.7, 2.2);
      setRow("LOOM", "loom-green", 4.0, 0);
      setRow("LOOM", "loom-mix", 4.0, 2.7);

      // Lamination: Fabric (0+4.5), Lums (0+2.8) => 7.3
      setRow("LAMINATION", "lam-fabric", 0, 4.5);
      setRow("LAMINATION", "lam-lums", 0, 2.8);

      // Cuttex: Wastage (0+45.2), Fab (0+1.6) => 46.8
      setRow("CUTTEX", "cut-wastage", 0, 45.2);
      setRow("CUTTEX", "cut-fab", 0, 1.6);

      // AD Convertex: Wastage (0+49.9), Seg (128.1+0) => 178.0
      setRow("AD_CONVERTEX", "ad-wastage", 0, 49.9);
      setRow("AD_CONVERTEX", "ad-seg", 128.1, 0);

      // Pipe Cutting: Yellow (47.5+0), White (62.6+0) => 110.1
      setRow("PIPE_CUTTING", "pipe-yellow", 47.5, 0);
      setRow("PIPE_CUTTING", "pipe-white", 62.6, 0);

      // Printing: Fabric (0+12.1), Loom Lam (3.0+6.4) => 21.5
      setRow("PRINTING", "prt-fabric", 0, 12.1);
      setRow("PRINTING", "prt-loom-lam", 3.0, 6.4);

      // Margin blocks
      report.marginBlocks.bobbinCleaning.rows[0].day = 10; // Yellow
      report.marginBlocks.bobbinCleaning.rows[1].day = 5; // White
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
    it("reproduces exact opening, production, issued and closing math from 17/10/26 Sr. No. 414", () => {
      const report = createDefaultRpProductionReport("2026-10-17", SHIFTS, 414);

      // Seed opening stocks & date entries matching physical sheet
      const mapSeed: Record<
        string,
        { op: number; prodA?: number; issued?: number; lumps?: number }
      > = {
        "rp-1": { op: 15320, prodA: 20, issued: 60 },
        "rp-2": { op: 3420, prodA: 600, issued: 180 },
        "rp-3": { op: 4640, prodA: 180, issued: 600 },
        "rp-4": { op: 280 },
        "rp-6": { op: 840 },
        "rp-7": { op: 999, lumps: 23 }, // PP LUMS must ignore opening/closing stock
        "rp-15": { op: 920 },
        "rp-16": { op: 6640 },
        "rp-17": { op: 615 },
        "rp-18": { op: 380 },
        "rp-19": { op: 2440 },
        "rp-21": { op: 960 },
        "rp-22": { op: 780 },
      };

      for (const r of report.rows) {
        const s = mapSeed[r.id];
        if (!s) continue;
        r.openingStock = s.op;
        if (s.prodA) r.productionShifts["Day Shift"] = s.prodA;
        if (s.issued) r.issuedToTapePlant = s.issued;
        if (s.lumps) r.lumpsOnDate = s.lumps;
      }

      const calc = recalculateRpProductionReport(report, SHIFTS);

      expect(calc.rows.find((r) => r.id === "rp-1")?.closingStock).toBe(15280);
      expect(calc.rows.find((r) => r.id === "rp-2")?.closingStock).toBe(3840);
      expect(calc.rows.find((r) => r.id === "rp-3")?.closingStock).toBe(4220);
      expect(calc.rows.find((r) => r.id === "rp-7")?.openingStock).toBe(0);
      expect(calc.rows.find((r) => r.id === "rp-7")?.closingStock).toBe(0);

      expect(calc.totalOpeningStock).toBe(37235);
      expect(calc.totalProductionOnDate).toBe(800);
      expect(calc.totalIssuedToTapePlant).toBe(840);
      expect(calc.totalLumpsOnDate).toBe(23);
      expect(calc.totalClosingStock).toBe(37195);
    });

    it("carries forward Closing Stock -> Opening Stock and same-month MTD, while resetting MTD on new month", () => {
      const oct17 = createDefaultRpProductionReport("2026-10-17", SHIFTS, 414);
      oct17.rows[0].openingStock = 1000;
      oct17.rows[0].productionShifts["Day Shift"] = 200;
      oct17.rows[0].productionMtd = 5200;
      oct17.rows[0].issuedToTapePlant = 50;
      oct17.rows[0].issuedToTapePlantMtd = 1050;
      const calcOct17 = recalculateRpProductionReport(oct17, SHIFTS);

      // Next day same month -> carries Closing Stock (1150) AND MTDs (5200, 1050)
      const oct18 = createDefaultRpProductionReport("2026-10-18", SHIFTS, 415, calcOct17);
      expect(oct18.rows[0].openingStock).toBe(1150);
      expect(oct18.rows[0].closingStock).toBe(1150);
      expect(oct18.rows[0].productionMtd).toBe(5200);
      expect(oct18.rows[0].issuedToTapePlantMtd).toBe(1050);

      // New month -> carries Closing Stock (1150) but resets MTDs to 0
      const nov01 = createDefaultRpProductionReport("2026-11-01", SHIFTS, 416, calcOct17);
      expect(nov01.rows[0].openingStock).toBe(1150);
      expect(nov01.rows[0].productionMtd).toBe(0);
      expect(nov01.rows[0].issuedToTapePlantMtd).toBe(0);
    });
  });
});
