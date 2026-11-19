import { describe, it, expect } from "vitest";
import {
  reconcileServerRawMaterialEntries,
  serializeRawMaterialPayload,
  getRawMaterialRowKey,
  FocusedRawMaterialCell,
} from "../raw-material-google-docs-sync";
import { RawMaterialEntryItem } from "../lamination-raw-material-types";

describe("Lamination Raw Material Google Docs Sync Engine", () => {
  const sampleLocalEntry: RawMaterialEntryItem = {
    id: "entry-1",
    rawMaterialId: "rm-101",
    materialName: "PP Granules",
    percentage: 60,
    manualKg: 600,
    machineKg: 580,
    diffKg: 20,
    sequence: 1,
    remarks: "Batch A",
  };

  it("preserves active typing in machineKg field against remote sync overwrite", () => {
    const localEntries: RawMaterialEntryItem[] = [
      {
        ...sampleLocalEntry,
        machineKg: 595, // User is actively typing
      },
    ];

    const incomingEntries: RawMaterialEntryItem[] = [
      {
        ...sampleLocalEntry,
        remarks: "Updated remotely by shift lead",
        machineKg: 580, // Stale server value
      },
    ];

    const focusedCell: FocusedRawMaterialCell = {
      rowKey: "entry-1",
      field: "machineKg",
    };

    const reconciled = reconcileServerRawMaterialEntries({
      localEntries,
      incomingEntries,
      focusedCell,
      hasUnsavedLocalEdits: true,
      manualTotalKg: 1000,
    });

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].machineKg).toBe(595); // Isolated local keystroke preserved!
    expect(reconciled[0].remarks).toBe("Updated remotely by shift lead"); // Remote field adopted!
    expect(reconciled[0].diffKg).toBe(5); // 600 - 595 = 5
  });

  it("matches rows accurately by materialName if ID or rawMaterialId are absent", () => {
    const localEntries: RawMaterialEntryItem[] = [
      {
        materialName: "White Masterbatch",
        percentage: 5,
        manualKg: 50,
        machineKg: 48,
        diffKg: 2,
        sequence: 1,
      },
    ];

    const incomingEntries: RawMaterialEntryItem[] = [
      {
        id: "server-id-99",
        materialName: "White Masterbatch",
        percentage: 5,
        manualKg: 50,
        machineKg: 50,
        diffKg: 0,
        sequence: 1,
      },
    ];

    const reconciled = reconcileServerRawMaterialEntries({
      localEntries,
      incomingEntries,
      hasUnsavedLocalEdits: false,
      manualTotalKg: 1000,
    });

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].id).toBe("server-id-99");
  });

  it("generates deterministic and sanitized serialization payloads", () => {
    const payload1 = serializeRawMaterialPayload(
      { date: "2026-11-18", shiftName: "Day Shift", operatorName: "Alice" },
      [sampleLocalEntry]
    );

    const payload2 = serializeRawMaterialPayload(
      { date: "2026-11-18", shiftName: "Day Shift", operatorName: "Alice " },
      [sampleLocalEntry]
    );

    expect(payload1).toBe(payload2);
  });

  it("extracts appropriate row keys", () => {
    expect(getRawMaterialRowKey({ id: "id-1" })).toBe("id-1");
    expect(getRawMaterialRowKey({ rawMaterialId: "rm-9" })).toBe("rm-rm-9");
    expect(getRawMaterialRowKey({ materialName: "Calcium Carbonate" })).toBe("name-calcium carbonate");
    expect(getRawMaterialRowKey({ sequence: 3 })).toBe("seq-3");
    expect(getRawMaterialRowKey({}, 2)).toBe("idx-2");
  });
});
