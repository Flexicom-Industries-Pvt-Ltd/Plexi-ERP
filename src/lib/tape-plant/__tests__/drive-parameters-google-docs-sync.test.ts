import { describe, it, expect } from "vitest";
import {
  serializeDrivePayload,
  reconcileServerDriveReadings,
  mergeDriveReadings,
  DriveParameterReading,
} from "@/components/tape-plant/ProcessDriveParameterSection";

function mockDriveReading(partial: Partial<DriveParameterReading> & { time: string }): DriveParameterReading {
  return {
    time: partial.time,
    photoUrl: partial.photoUrl,
    operatorName: partial.operatorName ?? "",
    operatorId: partial.operatorId ?? "",
    extruderRpm: partial.extruderRpm ?? "",
    meltPumpRpm: partial.meltPumpRpm ?? "",
    takeUpMpm: partial.takeUpMpm ?? "",
    nipRollMpm: partial.nipRollMpm ?? "",
    isuMpm: partial.isuMpm ?? "",
    pauMpm: partial.pauMpm ?? "",
    stretchingMpm: partial.stretchingMpm ?? "",
    annealingMpm: partial.annealingMpm ?? "",
    stretchingRatio: partial.stretchingRatio ?? "",
    meltPressureP1: partial.meltPressureP1 ?? "",
    meltPressureP2: partial.meltPressureP2 ?? "",
    meltPressureP3: partial.meltPressureP3 ?? "",
    waterBath: partial.waterBath ?? "",
    colour: partial.colour ?? "",
    denier: partial.denier ?? "",
    tapeWidth: partial.tapeWidth ?? "",
    strength: partial.strength ?? "",
    eloPercent: partial.eloPercent ?? "",
    spacerWidth: partial.spacerWidth ?? "",
    numberOfTape: partial.numberOfTape ?? "",
  };
}

describe("Google Docs-Grade Collaborative Sync for Process Drive Parameters", () => {
  describe("serializeDrivePayload", () => {
    it("produces deterministic serialized string for same drive data", () => {
      const records = [
        mockDriveReading({ time: "08:00", extruderRpm: "45", meltPumpRpm: "22" }),
      ];
      const s1 = serializeDrivePayload("2026-11-18", "shift-1", "John", "OP-1", records);
      const s2 = serializeDrivePayload("2026-11-18", "shift-1", "John", "OP-1", [
        mockDriveReading({ time: "8:00", extruderRpm: "45", meltPumpRpm: "22" }),
      ]);
      expect(s1).toEqual(s2);
    });
  });

  describe("reconcileServerDriveReadings", () => {
    const intervals = ["08:00", "10:00", "12:00", "14:00"];

    it("merges remote changes into local state non-destructively", () => {
      const local: DriveParameterReading[] = [
        mockDriveReading({ time: "08:00", extruderRpm: "40" }),
        mockDriveReading({ time: "10:00", extruderRpm: "" }),
      ];
      const server: DriveParameterReading[] = [
        mockDriveReading({ time: "08:00", extruderRpm: "40", meltPumpRpm: "25" }),
        mockDriveReading({ time: "10:00", extruderRpm: "48", photoUrl: "http://example.com/drive.webp" }),
        mockDriveReading({ time: "12:00", extruderRpm: "50" }),
      ];

      const reconciled = reconcileServerDriveReadings(local, server, null, intervals);

      const row8 = reconciled.find((r) => r.time === "08:00");
      expect(row8?.extruderRpm).toBe("40");
      expect(row8?.meltPumpRpm).toBe("25");

      const row10 = reconciled.find((r) => r.time === "10:00");
      expect(row10?.extruderRpm).toBe("48");
      expect(row10?.photoUrl).toBe("http://example.com/drive.webp");

      const row12 = reconciled.find((r) => r.time === "12:00");
      expect(row12?.extruderRpm).toBe("50");
    });

    it("ISOLATES active cell currently being typed into (Google Docs-grade)", () => {
      const local: DriveParameterReading[] = [
        mockDriveReading({ time: "08:00", extruderRpm: "45-draft-typing", meltPumpRpm: "" }),
      ];
      const server: DriveParameterReading[] = [
        mockDriveReading({ time: "08:00", extruderRpm: "35-stale-server", meltPumpRpm: "24" }),
      ];

      // User is actively focused on extruderRpm of row 08:00
      const activeCell = { time: "08:00", field: "extruderRpm" };

      const reconciled = reconcileServerDriveReadings(local, server, activeCell, intervals);

      const row8 = reconciled.find((r) => r.time === "08:00");
      // extruderRpm MUST retain the user's active keystrokes
      expect(row8?.extruderRpm).toBe("45-draft-typing");
      // meltPumpRpm merges from server without interruption
      expect(row8?.meltPumpRpm).toBe("24");
    });

    it("handles concurrent row additions from PC and Phone without loss", () => {
      const local: DriveParameterReading[] = [
        mockDriveReading({ time: "08:00" }),
        mockDriveReading({ time: "09:15", extruderRpm: "44" }), // Phone added custom row
      ];
      const server: DriveParameterReading[] = [
        mockDriveReading({ time: "08:00" }),
        mockDriveReading({ time: "09:45", extruderRpm: "46" }), // PC added custom row
      ];

      const reconciled = reconcileServerDriveReadings(local, server, null, intervals);

      const times = reconciled.map((r) => r.time);
      expect(times).toContain("08:00");
      expect(times).toContain("09:15");
      expect(times).toContain("09:45");
    });
  });

  describe("mergeDriveReadings", () => {
    it("deduplicates multiple server entries for the exact same time slot", () => {
      const rawData = [
        { time: "08:00", extruderRpm: "40" },
        { time: "8:00", extruderRpm: "42", meltPumpRpm: "22" }, // Duplicate legacy entry
      ];
      const intervals = ["08:00", "10:00"];

      const merged = mergeDriveReadings(rawData, intervals);
      const slot8Rows = merged.filter((r) => r.time === "08:00");
      expect(slot8Rows.length).toBe(1);
      // Merges properties into single row
      expect(slot8Rows[0].extruderRpm).toBe("42");
      expect(slot8Rows[0].meltPumpRpm).toBe("22");
    });
  });
});
