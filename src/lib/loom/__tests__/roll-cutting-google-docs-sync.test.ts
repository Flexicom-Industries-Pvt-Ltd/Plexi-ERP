import { describe, it, expect } from "vitest";
import {
  serializeRollCuttingPayload,
  reconcileServerRollCuttingEntries,
  getRollCuttingEntryKey,
} from "../roll-cutting-google-docs-sync";
import { LoomRollCuttingEntryItem } from "../loom-roll-cutting-types";

describe("Loom Roll Cutting Google Docs-Style Realtime Sync", () => {
  const baseRoll = (seq: number, rollNumber: string, loomNumber: number = 4): LoomRollCuttingEntryItem => ({
    id: `cuid_${rollNumber}`,
    sequence: seq,
    rollNumber,
    loomNumber,
    size: "490",
    qualityType: "Mahal/LPP/W",
    contractor: "ABC Textiles",
    initialReading: 1000,
    finalReading: 1500,
    meter: 500,
    grossWeightKg: 81.2,
    tareWeightKg: 1.2,
    nettWeightKg: 80,
    avgWeightPerMeter: 160,
    supervisorSign: "SS",
    remarks: "Good quality",
    photoUrl: null,
  });

  describe("serializeRollCuttingPayload", () => {
    it("produces deterministic serialization regardless of array order", () => {
      const r1 = baseRoll(1, "CT-101");
      const r2 = baseRoll(2, "CT-102");

      const s1 = serializeRollCuttingPayload("2026-11-18", "DAY", [r1, r2], { status: "DRAFT" });
      const s2 = serializeRollCuttingPayload("2026-11-18", "DAY", [r2, r1], { status: "DRAFT" });

      expect(s1).toBe(s2);
    });

    it("trims whitespace cleanly", () => {
      const r1 = { ...baseRoll(1, "CT-101"), remarks: "  Cut clean  ", contractor: " ABC " };
      const s = serializeRollCuttingPayload("2026-11-18", "DAY", [r1]);
      const parsed = JSON.parse(s);

      expect(parsed.entries[0].remarks).toBe("Cut clean");
      expect(parsed.entries[0].contractor).toBe("ABC");
    });
  });

  describe("reconcileServerRollCuttingEntries", () => {
    it("merges remote edits seamlessly into local state", () => {
      const local = [baseRoll(1, "CT-101"), baseRoll(2, "CT-102")];
      const remote = [
        { ...baseRoll(1, "CT-101"), grossWeightKg: 85 }, // remote user updated scale weight
        baseRoll(2, "CT-102"),
      ];

      const merged = reconcileServerRollCuttingEntries(local, remote, null);
      expect(merged).toHaveLength(2);
      expect(merged[0].grossWeightKg).toBe(85);
      expect(merged[0].nettWeightKg).toBe(83.8); // 85 - 1.2
    });

    it("ISOLATES ACTIVE FOCUSED CELL: preserves local typing during remote sync", () => {
      const local = [
        { ...baseRoll(1, "CT-101"), grossWeightKg: 92.5 }, // local operator is typing scale reading
        baseRoll(2, "CT-102"),
      ];
      const remote = [
        // remote user changed finalReading
        { ...baseRoll(1, "CT-101"), finalReading: 1600, grossWeightKg: 80 },
        baseRoll(2, "CT-102"),
      ];

      const activeCell = {
        rollKey: "CT-101",
        field: "grossWeightKg",
      };

      const merged = reconcileServerRollCuttingEntries(local, remote, activeCell);
      expect(merged).toHaveLength(2);
      // Remote changes landed
      expect(merged[0].finalReading).toBe(1600);
      expect(merged[0].meter).toBe(600); // 1600 - 1000
      // Local typing preserved
      expect(merged[0].grossWeightKg).toBe(92.5);
      expect(merged[0].nettWeightKg).toBe(91.3); // 92.5 - 1.2
    });

    it("preserves locally added rolls not yet persisted to server", () => {
      const local = [
        baseRoll(1, "CT-101"),
        baseRoll(2, "CT-102"), // locally added roll
      ];
      const remote = [
        baseRoll(1, "CT-101"),
      ];

      const merged = reconcileServerRollCuttingEntries(local, remote, null);
      expect(merged).toHaveLength(2);
      expect(merged[1].rollNumber).toBe("CT-102");
    });

    it("adopts remote rolls added concurrently by another operator", () => {
      const local = [
        baseRoll(1, "CT-101"),
      ];
      const remote = [
        baseRoll(1, "CT-101"),
        baseRoll(2, "CT-102"),
      ];

      const merged = reconcileServerRollCuttingEntries(local, remote, null);
      expect(merged).toHaveLength(2);
      expect(merged[1].rollNumber).toBe("CT-102");
    });

    it("excludes deleted rolls in deletedRollKeys", () => {
      const local = [
        baseRoll(1, "CT-101"),
      ];
      const remote = [
        baseRoll(1, "CT-101"),
        baseRoll(2, "CT-102"), // remote server still has deleted roll
      ];

      const deletedRollKeys = new Set(["cuid_CT-102", "CT-102"]);
      const merged = reconcileServerRollCuttingEntries(local, remote, null, deletedRollKeys);
      expect(merged).toHaveLength(1);
      expect(merged[0].rollNumber).toBe("CT-101");
    });
  });
});
