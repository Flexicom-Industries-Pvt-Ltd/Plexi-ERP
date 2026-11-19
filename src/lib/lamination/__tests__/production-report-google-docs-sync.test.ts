import { describe, it, expect } from "vitest";
import {
  reconcileServerLaminationReportEntries,
  serializeLaminationReportPayload,
  getLaminationRowKey,
  FocusedLaminationCell,
} from "../production-report-google-docs-sync";
import { LaminationProductionEntryData } from "../lamination-types";

describe("Lamination Production Report Google Docs Sync Engine", () => {
  const sampleLocalEntry: LaminationProductionEntryData = {
    id: "entry-1",
    sequence: 1,
    quality: "White VIP",
    size: "500",
    loomNumber: 42,
    rollNumber: "ROLL-101",
    rollMeter: 1000,
    netWeightBefore: 100,
    avgWeightBefore: 100,
    productionMeter: 1000,
    netWeightAfter: 120,
    avgWeightAfter: 120,
    coating: 20,
    remarks: "Initial",
  };

  it("isolates active typing in focused cell when incoming remote sync arrives", () => {
    const localEntries: LaminationProductionEntryData[] = [
      {
        ...sampleLocalEntry,
        productionMeter: 1050, // User currently typing locally
      },
    ];

    const incomingEntries: LaminationProductionEntryData[] = [
      {
        ...sampleLocalEntry,
        remarks: "Updated remotely by supervisor",
        productionMeter: 1000, // Stale remote value
      },
    ];

    const focusedCell: FocusedLaminationCell = {
      rowKey: "entry-1",
      field: "productionMeter",
    };

    const reconciled = reconcileServerLaminationReportEntries({
      localEntries,
      incomingEntries,
      focusedCell,
      hasUnsavedLocalEdits: true,
    });

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].productionMeter).toBe(1050); // Kept active local typing!
    expect(reconciled[0].remarks).toBe("Updated remotely by supervisor"); // Remote non-conflicting field adopted
  });

  it("merges concurrent rows added on separate devices without duplication", () => {
    const localEntries: LaminationProductionEntryData[] = [
      {
        ...sampleLocalEntry,
        id: "local-draft-1",
        rollNumber: "ROLL-101",
      },
      {
        id: "local-draft-2",
        sequence: 2,
        quality: "White VIP",
        size: "500",
        loomNumber: 43,
        rollNumber: "ROLL-102",
        rollMeter: 800,
        netWeightBefore: 80,
        avgWeightBefore: 100,
        productionMeter: 800,
        netWeightAfter: 96,
        avgWeightAfter: 120,
        coating: 20,
      },
    ];

    const incomingEntries: LaminationProductionEntryData[] = [
      {
        ...sampleLocalEntry,
        id: "server-persisted-1",
        rollNumber: "ROLL-101",
      },
      {
        id: "remote-entry-3",
        sequence: 2,
        quality: "NUVOCO SI",
        size: "600",
        loomNumber: 88,
        rollNumber: "ROLL-103",
        rollMeter: 1200,
        netWeightBefore: 120,
        avgWeightBefore: 100,
        productionMeter: 1200,
        netWeightAfter: 150,
        avgWeightAfter: 125,
        coating: 25,
      },
    ];

    const reconciled = reconcileServerLaminationReportEntries({
      localEntries,
      incomingEntries,
      hasUnsavedLocalEdits: true,
    });

    expect(reconciled).toHaveLength(3);
    const rollNumbers = reconciled.map((r) => r.rollNumber);
    expect(rollNumbers).toContain("ROLL-101");
    expect(rollNumbers).toContain("ROLL-102");
    expect(rollNumbers).toContain("ROLL-103");
  });

  it("prevents deleted rows from being resurrected by incoming stale server events", () => {
    const localEntries: LaminationProductionEntryData[] = [];
    const incomingEntries: LaminationProductionEntryData[] = [
      {
        ...sampleLocalEntry,
        id: "deleted-entry-id",
      },
    ];

    const deletedEntryIds = new Set(["deleted-entry-id"]);

    const reconciled = reconcileServerLaminationReportEntries({
      localEntries,
      incomingEntries,
      deletedEntryIds,
      hasUnsavedLocalEdits: true,
    });

    expect(reconciled).toHaveLength(0);
  });

  it("correctly generates deterministic serialization payloads", () => {
    const serialized1 = serializeLaminationReportPayload(
      { date: "2026-11-18", shiftName: "Day Shift", operatorName: "John" },
      [sampleLocalEntry],
      ["del-1", "del-2"]
    );

    const serialized2 = serializeLaminationReportPayload(
      { date: "2026-11-18", shiftName: "Day Shift", operatorName: "John " },
      [sampleLocalEntry],
      ["del-2", "del-1"]
    );

    expect(serialized1).toBe(serialized2);
  });

  it("extracts unique row keys accurately", () => {
    expect(getLaminationRowKey({ id: "custom-id" })).toBe("custom-id");
    expect(getLaminationRowKey({ loomRollCuttingEntryId: "cut-99" })).toBe("cut-cut-99");
    expect(getLaminationRowKey({ rollNumber: "DI-999" })).toBe("roll-DI-999");
    expect(getLaminationRowKey({ sequence: 5 })).toBe("seq-5");
    expect(getLaminationRowKey({}, 3)).toBe("idx-3");
  });
});
