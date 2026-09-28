import { describe, it, expect } from "vitest";
import {
  computeRollMeters,
  computeRollWeightsAndAvg,
  generateNextRollNumber,
} from "../loom-roll-cutting-types";

describe("Daily Loom Roll Cutting Utilities", () => {
  describe("computeRollMeters", () => {
    it("correctly computes standard meter length between readings", () => {
      expect(computeRollMeters(1000, 2500)).toBe(1500);
      expect(computeRollMeters(0, 850)).toBe(850);
      expect(computeRollMeters(7420, 8920)).toBe(1500);
    });

    it("handles mechanical counter rollover (e.g. 9950 -> 0150)", () => {
      // 10,000 - 9,950 = 50 + 150 = 200
      expect(computeRollMeters(9950, 150)).toBe(200);
      expect(computeRollMeters(9800, 400)).toBe(600);
    });

    it("handles zero or invalid numbers gracefully", () => {
      expect(computeRollMeters(NaN, 2000)).toBe(0);
      expect(computeRollMeters(2000, NaN)).toBe(0);
    });
  });

  describe("computeRollWeightsAndAvg", () => {
    it("correctly computes nett weight by deducting tare core weight", () => {
      const res = computeRollWeightsAndAvg(1000, 161.2, 1.2);
      expect(res.nettWeightKg).toBe(160.0);
      // (160 * 1000) / 1000 = 160 g/m
      expect(res.avgWeightPerMeter).toBe(160.0);
    });

    it("correctly computes avg linear mass in g/m for standard rolls", () => {
      // 1500 meters, Gross: 241.2kg, Tare: 1.2kg -> Nett: 240kg
      // (240 * 1000) / 1500 = 160 g/m
      const res = computeRollWeightsAndAvg(1500, 241.2, 1.2);
      expect(res.nettWeightKg).toBe(240);
      expect(res.avgWeightPerMeter).toBe(160);
    });

    it("defaults tare weight to 1.2 kg if omitted", () => {
      const res = computeRollWeightsAndAvg(1000, 101.2);
      expect(res.nettWeightKg).toBe(100);
    });

    it("returns 0 avg if meter or nett weight is zero", () => {
      expect(computeRollWeightsAndAvg(0, 50, 1.2).avgWeightPerMeter).toBe(0);
      expect(computeRollWeightsAndAvg(1000, 1.2, 1.2).avgWeightPerMeter).toBe(0);
    });
  });

  describe("generateNextRollNumber", () => {
    it("increments sequential prefix roll numbers correctly", () => {
      expect(generateNextRollNumber("CT-14376")).toBe("CT-14377");
      expect(generateNextRollNumber("DT-14377")).toBe("DT-14378");
      expect(generateNextRollNumber("ROLL-100")).toBe("ROLL-101");
    });

    it("provides fallback roll format if empty string passed", () => {
      const roll = generateNextRollNumber("");
      expect(roll).toMatch(/^[A-Z]{2}-\d+$/);
    });
  });
});
