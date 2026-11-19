import { describe, it, expect } from "vitest";
import {
  serializeLoomReadingPayload,
  reconcileServerLoomReadings,
  getLoomEntryKey,
} from "../reading-sheet-google-docs-sync";
import { LoomReadingEntryItem } from "../loom-reading-types";

describe("Loom Reading Sheet Google Docs-Style Realtime Sync", () => {
  const baseEntry = (loomNumber: number, rowSequence: number = 1): LoomReadingEntryItem => ({
    loomNumber,
    rowSequence,
    operatorName: "Ramesh Kumar",
    size: "490",
    denier: "600",
    qualityType: "PP 490 600",
    initialReading: 1000,
    r1Reading: 1200,
    r1Prod: 200,
    r2Reading: 1450,
    r2Prod: 250,
    r3Reading: null,
    r3Prod: null,
    r4Reading: null,
    r4Prod: null,
    r5Reading: null,
    r5Prod: null,
    r6Reading: null,
    r6Prod: null,
    totalProduction: 450,
    status: "RUNNING",
    remarks: "Good",
  });

  describe("serializeLoomReadingPayload", () => {
    it("produces deterministic serialization regardless of array order", () => {
      const e1 = baseEntry(1, 1);
      const e2 = baseEntry(2, 1);
      const e3 = baseEntry(1, 2);

      const s1 = serializeLoomReadingPayload("2026-11-18", "DAY", [e1, e2, e3], { status: "DRAFT" });
      const s2 = serializeLoomReadingPayload("2026-11-18", "DAY", [e3, e2, e1], { status: "DRAFT" });

      expect(s1).toBe(s2);
    });

    it("trims whitespace and handles nullish fields cleanly", () => {
      const e1 = { ...baseEntry(1, 1), remarks: "  Running well  ", operatorName: " John Doe " };
      const s = serializeLoomReadingPayload("2026-11-18", "DAY", [e1]);
      const parsed = JSON.parse(s);

      expect(parsed.entries[0].remarks).toBe("Running well");
      expect(parsed.entries[0].operatorName).toBe("John Doe");
    });
  });

  describe("reconcileServerLoomReadings", () => {
    it("merges remote edits seamlessly into local state", () => {
      const local = [baseEntry(1, 1), baseEntry(2, 1)];
      const remote = [
        { ...baseEntry(1, 1), r3Reading: 1700 }, // remote user filled r3
        baseEntry(2, 1),
      ];

      const merged = reconcileServerLoomReadings(local, remote, null);
      expect(merged).toHaveLength(2);
      expect(merged[0].r3Reading).toBe(1700);
      expect(merged[0].r3Prod).toBe(250); // 1700 - 1450
      expect(merged[0].totalProduction).toBe(700);
    });

    it("ISOLATES ACTIVE FOCUSED CELL: preserves keystrokes during remote sync", () => {
      const local = [
        { ...baseEntry(1, 1), r2Reading: 1480 }, // local user is actively typing 1480
        baseEntry(2, 1),
      ];
      const remote = [
        // remote user updated r1 and operator
        { ...baseEntry(1, 1), operatorName: "Suresh Patel", r1Reading: 1250, r2Reading: 1400 },
        baseEntry(2, 1),
      ];

      const activeCell = {
        loomNumber: 1,
        rowSequence: 1,
        field: "r2Reading",
      };

      const merged = reconcileServerLoomReadings(local, remote, activeCell);
      expect(merged).toHaveLength(2);
      // Remote changes to other fields landed
      expect(merged[0].operatorName).toBe("Suresh Patel");
      expect(merged[0].r1Reading).toBe(1250);
      // Active focused field value PRESERVED (no drop, no clobber)
      expect(merged[0].r2Reading).toBe(1480);
      expect(merged[0].r2Prod).toBe(230); // 1480 - 1250
    });

    it("preserves locally added split rows not yet persisted to server", () => {
      const local = [
        baseEntry(1, 1),
        baseEntry(1, 2), // local split changeover row
      ];
      const remote = [
        baseEntry(1, 1),
      ];

      const merged = reconcileServerLoomReadings(local, remote, null);
      expect(merged).toHaveLength(2);
      expect(merged[1].rowSequence).toBe(2);
    });

    it("adopts remote split rows added by another user on another loom", () => {
      const local = [
        baseEntry(1, 1),
      ];
      const remote = [
        baseEntry(1, 1),
        baseEntry(2, 1),
        baseEntry(2, 2), // remote user added split row for Loom #2
      ];

      const merged = reconcileServerLoomReadings(local, remote, null);
      expect(merged).toHaveLength(3);
      expect(merged[1].loomNumber).toBe(2);
      expect(merged[1].rowSequence).toBe(1);
      expect(merged[2].loomNumber).toBe(2);
      expect(merged[2].rowSequence).toBe(2);
    });

    it("excludes deleted split rows in deletedKeys", () => {
      const local = [
        baseEntry(1, 1),
      ];
      const remote = [
        baseEntry(1, 1),
        baseEntry(1, 2), // server has split row that local just deleted
      ];

      const deletedKeys = new Set([getLoomEntryKey(1, 2)]);
      const merged = reconcileServerLoomReadings(local, remote, null, deletedKeys);
      expect(merged).toHaveLength(1);
      expect(merged[0].loomNumber).toBe(1);
      expect(merged[0].rowSequence).toBe(1);
    });

    it("recalculates efficiency and deltas automatically", () => {
      const local = [baseEntry(1, 1)];
      const remote = [
        {
          ...baseEntry(1, 1),
          r3Reading: 1700,
          breakdownMinutes: 30,
        },
      ];

      const merged = reconcileServerLoomReadings(local, remote, null);
      expect(merged[0].r3Prod).toBe(250);
      expect(merged[0].totalProduction).toBe(700);
      expect(merged[0].efficiencyPct).toBeGreaterThan(0);
    });
  });
});
