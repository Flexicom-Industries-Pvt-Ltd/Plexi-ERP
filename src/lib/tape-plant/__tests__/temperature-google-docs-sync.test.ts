import { describe, it, expect } from "vitest";
import {
  normalizeTimeSlot,
  serializeTemperaturePayload,
  reconcileServerReadings,
  mergeTemperatureReadings,
  TemperatureReading,
} from "@/components/tape-plant/ProcessTemperatureSection";

function mockReading(partial: Partial<TemperatureReading> & { time: string }): TemperatureReading {
  return {
    time: partial.time,
    photoUrl: partial.photoUrl,
    b1: partial.b1 ?? "",
    b2: partial.b2 ?? "",
    b3: partial.b3 ?? "",
    b4: partial.b4 ?? "",
    b5: partial.b5 ?? "",
    b6: partial.b6 ?? "",
    b7: partial.b7 ?? "",
    screenChanger: partial.screenChanger ?? "",
    ad1: partial.ad1 ?? "",
    ad2: partial.ad2 ?? "",
    meltPump: partial.meltPump ?? "",
    d1: partial.d1 ?? "",
    d2: partial.d2 ?? "",
    d3: partial.d3 ?? "",
    d4: partial.d4 ?? "",
    d5: partial.d5 ?? "",
    d6: partial.d6 ?? "",
    d7: partial.d7 ?? "",
    meltTemp: partial.meltTemp ?? "",
    h1: partial.h1 ?? "",
    h2: partial.h2 ?? "",
    hotAirTemp: partial.hotAirTemp ?? "",
  };
}

describe("Google Docs-Grade Collaborative Sync for Process Temperature", () => {
  describe("normalizeTimeSlot", () => {
    it("pads single digit hours with leading zeros", () => {
      expect(normalizeTimeSlot("8:00")).toBe("08:00");
      expect(normalizeTimeSlot("08:00")).toBe("08:00");
      expect(normalizeTimeSlot(" 9:30 ")).toBe("09:30");
      expect(normalizeTimeSlot("14:00")).toBe("14:00");
    });

    it("returns empty string for undefined or empty input", () => {
      expect(normalizeTimeSlot("")).toBe("");
      expect(normalizeTimeSlot(undefined)).toBe("");
    });
  });

  describe("serializeTemperaturePayload", () => {
    it("produces deterministic serialized string for same data", () => {
      const readings: TemperatureReading[] = [
        mockReading({ time: "08:00", b1: "210", b2: "215" }),
      ];
      const s1 = serializeTemperaturePayload("2026-11-18", "shift-1", "John", "OP-1", readings);
      const s2 = serializeTemperaturePayload("2026-11-18", "shift-1", "John", "OP-1", [
        mockReading({ time: "8:00", b1: "210", b2: "215" }),
      ]);
      expect(s1).toEqual(s2);
    });
  });

  describe("reconcileServerReadings", () => {
    const intervals = ["08:00", "10:00", "12:00", "14:00"];

    it("merges remote changes into local state non-destructively", () => {
      const local: TemperatureReading[] = [
        mockReading({ time: "08:00", b1: "200" }),
        mockReading({ time: "10:00", b1: "" }),
      ];
      const server: TemperatureReading[] = [
        mockReading({ time: "08:00", b1: "200", b2: "205" }),
        mockReading({ time: "10:00", b1: "210", photoUrl: "http://example.com/p1.webp" }),
        mockReading({ time: "12:00", b1: "215" }),
      ];

      const reconciled = reconcileServerReadings(local, server, null, intervals);

      const row8 = reconciled.find((r) => r.time === "08:00");
      expect(row8?.b1).toBe("200");
      expect(row8?.b2).toBe("205");

      const row10 = reconciled.find((r) => r.time === "10:00");
      expect(row10?.b1).toBe("210");
      expect(row10?.photoUrl).toBe("http://example.com/p1.webp");

      const row12 = reconciled.find((r) => r.time === "12:00");
      expect(row12?.b1).toBe("215");
    });

    it("ISOLATES active cell currently being typed into (Google Docs-grade)", () => {
      const local: TemperatureReading[] = [
        mockReading({ time: "08:00", b1: "205-draft-typing", b2: "" }),
      ];
      const server: TemperatureReading[] = [
        mockReading({ time: "08:00", b1: "190-stale-server", b2: "210" }),
      ];

      // User is actively focused on b1 of row 08:00
      const activeCell = { time: "08:00", field: "b1" };

      const reconciled = reconcileServerReadings(local, server, activeCell, intervals);

      const row8 = reconciled.find((r) => r.time === "08:00");
      // b1 MUST retain the user's active keystrokes
      expect(row8?.b1).toBe("205-draft-typing");
      // b2 merges from server without interruption
      expect(row8?.b2).toBe("210");
    });

    it("handles concurrent row additions from PC and Phone without loss", () => {
      const local: TemperatureReading[] = [
        mockReading({ time: "08:00" }),
        mockReading({ time: "09:15", b1: "220" }), // Phone added custom row
      ];
      const server: TemperatureReading[] = [
        mockReading({ time: "08:00" }),
        mockReading({ time: "09:45", b1: "225" }), // PC added custom row
      ];

      const reconciled = reconcileServerReadings(local, server, null, intervals);

      const times = reconciled.map((r) => r.time);
      expect(times).toContain("08:00");
      expect(times).toContain("09:15");
      expect(times).toContain("09:45");
    });
  });

  describe("mergeTemperatureReadings", () => {
    it("deduplicates multiple server entries for the exact same time slot", () => {
      const rawData = [
        { time: "08:00", b1: "200" },
        { time: "8:00", b1: "205", b2: "210" }, // Duplicate legacy entry
      ];
      const intervals = ["08:00", "10:00"];

      const merged = mergeTemperatureReadings(rawData, intervals);
      const slot8Rows = merged.filter((r) => r.time === "08:00");
      expect(slot8Rows.length).toBe(1);
      // Merges properties into single row
      expect(slot8Rows[0].b1).toBe("205");
      expect(slot8Rows[0].b2).toBe("210");
    });
  });
});
