import { describe, it, expect } from "vitest";
import {
  generateBobbinLabel,
  generateRollLabel,
  generateBaleLabel,
} from "../label-generator";

describe("Industrial Barcode & Label Generator Engine", () => {
  it("should generate a valid Bobbin label in SVG and ZPL formats", () => {
    const res = generateBobbinLabel({
      lotNumber: "BOB-20260916-0001",
      extruderLine: "EXT-01",
      denier: 850,
      color: "MILKY WHITE",
      netWeightKg: 4.85,
      operatorName: "Ramesh K",
    });

    expect(res.labelType).toBe("BOBBIN");
    expect(res.identifier).toBe("BOB-20260916-0001");
    expect(res.zpl).toContain("^XA");
    expect(res.zpl).toContain("^FD" + "BOB-20260916-0001" + "^FS");
    expect(res.svg).toContain("<svg");
    expect(res.svg).toContain("BOBBIN LOT: BOB-20260916-0001");
  });

  it("should generate a valid Weaving Roll label in SVG and ZPL formats", () => {
    const res = generateRollLabel({
      rollNumber: "ROLL-20260916-0042",
      rollType: "LPP",
      widthMm: 560,
      mesh: "10x10",
      grade: "A",
      loomId: "Loom-14",
      lengthMeters: 4500,
      weightKg: 385.5,
      operatorName: "Sunil S",
    });

    expect(res.labelType).toBe("ROLL");
    expect(res.identifier).toBe("ROLL-20260916-0042");
    expect(res.zpl).toContain("ROLL NO: ROLL-20260916-0042 (LPP)");
    expect(res.svg).toContain("560 mm");
  });

  it("should generate a valid Finished Goods Bale label in SVG and ZPL formats", () => {
    const res = generateBaleLabel({
      baleId: "BAL-20260916-0010",
      bagCount: 500,
      productName: "Cement Bag 50kg Valve",
      customerOrder: "ORD-AMBUJA-992",
      shift: "B",
      qualityStatus: "PASSED",
    });

    expect(res.labelType).toBe("BALE");
    expect(res.identifier).toBe("BAL-20260916-0010");
    expect(res.zpl).toContain("BALE ID: BAL-20260916-0010");
    expect(res.svg).toContain("500 BAGS");
    expect(res.svg).toContain("QC: PASSED");
  });
});
