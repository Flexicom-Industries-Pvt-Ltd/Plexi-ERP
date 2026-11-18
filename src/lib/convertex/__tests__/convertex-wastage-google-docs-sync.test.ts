import { describe, it, expect } from "vitest";
import {
  getConvertexWastageRowKey,
  reconcileServerConvertexWastageEntries,
  serializeConvertexWastagePayload,
} from "../convertex-wastage-google-docs-sync";
import { ConvertexWastageEntryItem } from "../convertex-types";

describe("Convertex Wastage Google Docs Sync", () => {
  const sampleLocal: ConvertexWastageEntryItem[] = [
    {
      id: "w-entry-1",
      sequence: 1,
      quality: "50kg Cement Bag",
      rollNumber: "CR-101",
      productionKg: 500,
      loomWasteKg: 5,
      loomWastePct: 1,
      lamWasteKg: 3,
      lamWastePct: 0.6,
      printWasteKg: 2,
      printWastePct: 0.4,
      machineWasteKg: 4,
      machineWastePct: 0.8,
      coverPatchWasteKg: 1,
      coverPatchWastePct: 0.2,
      totalWasteKg: 15,
      totalWastePct: 3,
      netProductionKg: 485,
      remarks: "Sample roll wastage",
    },
    {
      id: "w-entry-2",
      sequence: 2,
      quality: "25kg Sugar Bag",
      rollNumber: "CR-102",
      productionKg: 400,
      loomWasteKg: 4,
      loomWastePct: 1,
      lamWasteKg: 2,
      lamWastePct: 0.5,
      printWasteKg: 1,
      printWastePct: 0.25,
      machineWasteKg: 3,
      machineWastePct: 0.75,
      coverPatchWasteKg: 1,
      coverPatchWastePct: 0.25,
      totalWasteKg: 11,
      totalWastePct: 2.75,
      netProductionKg: 389,
    },
  ];

  it("should generate stable unique keys for rows", () => {
    expect(getConvertexWastageRowKey({ id: "w-entry-1" }, 0)).toBe("id:w-entry-1");
    expect(getConvertexWastageRowKey({ rollNumber: "cr-101" }, 1)).toBe("roll:CR-101");
    expect(getConvertexWastageRowKey({ sequence: 3 }, 2)).toBe("seq:3");
  });

  it("should preserve active cell focus value when server updates arrive", () => {
    const incoming: ConvertexWastageEntryItem[] = [
      {
        id: "w-entry-1",
        sequence: 1,
        quality: "50kg Cement Bag - Updated",
        rollNumber: "CR-101",
        productionKg: 500,
        loomWasteKg: 8, // Server changed loomWasteKg
        loomWastePct: 1.6,
        lamWasteKg: 3,
        lamWastePct: 0.6,
        printWasteKg: 2,
        printWastePct: 0.4,
        machineWasteKg: 4,
        machineWastePct: 0.8,
        coverPatchWasteKg: 1,
        coverPatchWastePct: 0.2,
        totalWasteKg: 18,
        totalWastePct: 3.6,
        netProductionKg: 482,
        remarks: "Updated by peer",
      },
    ];

    // Local user is actively typing in 'loomWasteKg'
    const reconciled = reconcileServerConvertexWastageEntries({
      localEntries: [
        {
          ...sampleLocal[0],
          loomWasteKg: 12, // Local unsaved keystrokes
        },
      ],
      incomingEntries: incoming,
      focusedCell: { rowKey: "id:w-entry-1", field: "loomWasteKg" },
      hasUnsavedLocalEdits: true,
    });

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].quality).toBe("50kg Cement Bag - Updated");
    // Actively focused cell value MUST be preserved from local
    expect(reconciled[0].loomWasteKg).toBe(12);
  });

  it("should merge incoming rows from peer while keeping local pending rows", () => {
    const incomingFromPeer: ConvertexWastageEntryItem[] = [
      sampleLocal[0],
      {
        id: "w-entry-peer-2",
        sequence: 2,
        quality: "50kg Fertilizer Bag",
        rollNumber: "CR-999",
        productionKg: 600,
        loomWasteKg: 6,
        loomWastePct: 1,
        lamWasteKg: 3,
        lamWastePct: 0.5,
        printWasteKg: 2,
        printWastePct: 0.33,
        machineWasteKg: 4,
        machineWastePct: 0.67,
        coverPatchWasteKg: 1,
        coverPatchWastePct: 0.17,
        totalWasteKg: 16,
        totalWastePct: 2.67,
        netProductionKg: 584,
      },
    ];

    const reconciled = reconcileServerConvertexWastageEntries({
      localEntries: sampleLocal,
      incomingEntries: incomingFromPeer,
      focusedCell: null,
      hasUnsavedLocalEdits: true,
    });

    // Should contain w-entry-1, CR-999, and local pending CR-102
    expect(reconciled).toHaveLength(3);
    expect(reconciled.map((r) => r.rollNumber)).toEqual(["CR-101", "CR-999", "CR-102"]);
  });

  it("should exclude rows that were deleted locally (deletedEntryIds)", () => {
    const deletedIds = new Set<string>(["w-entry-2"]);

    const reconciled = reconcileServerConvertexWastageEntries({
      localEntries: [sampleLocal[0]],
      incomingEntries: sampleLocal,
      focusedCell: null,
      hasUnsavedLocalEdits: false,
      deletedEntryIds: deletedIds,
    });

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].rollNumber).toBe("CR-101");
  });

  it("should produce deterministic serialization for change detection", () => {
    const header = {
      date: "2026-11-18",
      shiftName: "Day",
      machineNo: "Convertex-1",
      operatorName: "John Doe",
      supervisorName: "Jane Smith",
      remarks: "Normal run",
      status: "DRAFT",
    };

    const payload1 = serializeConvertexWastagePayload(header, sampleLocal);
    const payload2 = serializeConvertexWastagePayload(header, [
      { ...sampleLocal[0] },
      { ...sampleLocal[1] },
    ]);

    expect(payload1).toBe(payload2);
  });
});
