import { describe, it, expect } from "vitest";
import {
  getValvomaticWastageRowKey,
  reconcileServerValvomaticWastageEntries,
  serializeValvomaticWastagePayload,
} from "../valvomatic-wastage-google-docs-sync";
import { ValvomaticWastageEntryItem } from "../valvomatic-types";

describe("Valvomatic Wastage Google Docs Sync", () => {
  const sampleLocal: ValvomaticWastageEntryItem[] = [
    {
      id: "w-entry-1",
      sequence: 1,
      quality: "50kg Cement Bag",
      rollNumber: "VR-101",
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
      rollNumber: "VR-102",
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
    expect(getValvomaticWastageRowKey({ id: "w-entry-1" }, 0)).toBe("id:w-entry-1");
    expect(getValvomaticWastageRowKey({ rollNumber: "vr-101" }, 1)).toBe("roll:VR-101");
    expect(getValvomaticWastageRowKey({ sequence: 3 }, 2)).toBe("seq:3");
  });

  it("should preserve active cell focus value when server updates arrive", () => {
    const incoming: ValvomaticWastageEntryItem[] = [
      {
        id: "w-entry-1",
        sequence: 1,
        quality: "50kg Cement Bag - Updated",
        rollNumber: "VR-101",
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
    const reconciled = reconcileServerValvomaticWastageEntries({
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
    const incomingFromPeer: ValvomaticWastageEntryItem[] = [
      sampleLocal[0],
      {
        id: "w-entry-peer-2",
        sequence: 2,
        quality: "50kg Fertilizer Bag",
        rollNumber: "VR-999",
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

    const reconciled = reconcileServerValvomaticWastageEntries({
      localEntries: sampleLocal,
      incomingEntries: incomingFromPeer,
      focusedCell: null,
      hasUnsavedLocalEdits: true,
    });

    // Should contain w-entry-1, VR-999, and local pending VR-102
    expect(reconciled).toHaveLength(3);
    expect(reconciled.map((r) => r.rollNumber)).toEqual(["VR-101", "VR-999", "VR-102"]);
  });

  it("should exclude rows that were deleted locally (deletedEntryIds)", () => {
    const deletedIds = new Set<string>(["w-entry-2"]);

    const reconciled = reconcileServerValvomaticWastageEntries({
      localEntries: [sampleLocal[0]],
      incomingEntries: sampleLocal,
      focusedCell: null,
      hasUnsavedLocalEdits: false,
      deletedEntryIds: deletedIds,
    });

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].rollNumber).toBe("VR-101");
  });

  it("should produce deterministic serialization for change detection", () => {
    const header = {
      date: "2026-11-19",
      shiftName: "Day Shift",
      machineNo: "Valvomatic-1",
      operatorName: "John Doe",
      supervisorName: "Jane Smith",
      remarks: "Normal run",
      status: "DRAFT",
    };

    const payload1 = serializeValvomaticWastagePayload(header, sampleLocal);
    const payload2 = serializeValvomaticWastagePayload(header, [
      { ...sampleLocal[0] },
      { ...sampleLocal[1] },
    ]);

    expect(payload1).toBe(payload2);
  });
});
