import { describe, it, expect } from "vitest";
import {
  getValvomaticReportRowKey,
  reconcileServerValvomaticReportEntries,
  serializeValvomaticReportPayload,
} from "../valvomatic-daily-report-google-docs-sync";
import { ValvomaticReportItem } from "../valvomatic-types";

describe("Valvomatic Daily Report Google Docs Sync", () => {
  const sampleLocal: ValvomaticReportItem[] = [
    {
      id: "entry-1",
      sequence: 1,
      companyName: "Flexicom",
      unitName: "Unit 1",
      grade: "A",
      targetProductionPcs: 1000,
      quality: "50kg Cement Bag",
      rollNumber: "VR-101",
      loomNumber: "L-01",
      rollMtr: 500,
      netWeight: 50,
      avgWeight: 100,
      openingMeterReading: 1000,
      closingMeterReading: 1500,
      coverPatchOs: 25,
      coverPatchDs: 25,
      valvePatch: 50,
      productionPcs: 500,
      productionKg: 50,
      remarks: "First roll",
    },
    {
      id: "entry-2",
      sequence: 2,
      companyName: "Flexicom",
      unitName: "Unit 1",
      grade: "B",
      targetProductionPcs: 800,
      quality: "25kg Sugar Bag",
      rollNumber: "VR-102",
      loomNumber: "L-02",
      rollMtr: 400,
      netWeight: 40,
      avgWeight: 100,
      openingMeterReading: 1500,
      closingMeterReading: 1900,
      coverPatchOs: 20,
      coverPatchDs: 20,
      valvePatch: 40,
      productionPcs: 400,
      productionKg: 40,
    },
  ];

  it("should generate stable unique keys for rows", () => {
    expect(getValvomaticReportRowKey({ id: "entry-1" }, 0)).toBe("id:entry-1");
    expect(getValvomaticReportRowKey({ rollNumber: "vr-101" }, 1)).toBe("roll:VR-101");
    expect(getValvomaticReportRowKey({ sequence: 3 }, 2)).toBe("seq:3");
  });

  it("should preserve active cell focus value when server updates arrive", () => {
    const incoming: ValvomaticReportItem[] = [
      {
        id: "entry-1",
        sequence: 1,
        companyName: "Flexicom - Updated by peer",
        unitName: "Unit 1",
        grade: "A+",
        targetProductionPcs: 1100,
        quality: "50kg Cement Bag",
        rollNumber: "VR-101",
        loomNumber: "L-01",
        rollMtr: 500,
        netWeight: 50,
        avgWeight: 100,
        openingMeterReading: 1000,
        closingMeterReading: 1600, // Server changed closingMeterReading
        coverPatchOs: 25,
        coverPatchDs: 25,
        valvePatch: 50,
        productionPcs: 600,
        productionKg: 60,
        remarks: "Updated by peer",
      },
    ];

    // Local user is actively typing in 'closingMeterReading'
    const reconciled = reconcileServerValvomaticReportEntries({
      localEntries: [
        {
          ...sampleLocal[0],
          closingMeterReading: 1550, // Local unsaved keystrokes
        },
      ],
      incomingEntries: incoming,
      focusedCell: { rowKey: "id:entry-1", field: "closingMeterReading" },
      hasUnsavedLocalEdits: true,
    });

    expect(reconciled).toHaveLength(1);
    // Peer updates like companyName and grade should be accepted
    expect(reconciled[0].companyName).toBe("Flexicom - Updated by peer");
    expect(reconciled[0].grade).toBe("A+");
    // But focused cell closingMeterReading MUST be preserved from local
    expect(reconciled[0].closingMeterReading).toBe(1550);
  });

  it("should merge incoming rows from peer while keeping local pending rows", () => {
    const incomingFromPeer: ValvomaticReportItem[] = [
      {
        id: "entry-1",
        sequence: 1,
        companyName: "Flexicom",
        quality: "50kg Cement Bag",
        rollNumber: "VR-101",
        rollMtr: 500,
        netWeight: 50,
        avgWeight: 100,
        openingMeterReading: 1000,
        closingMeterReading: 1500,
        coverPatchOs: 25,
        coverPatchDs: 25,
        valvePatch: 50,
        productionPcs: 500,
        productionKg: 50,
      },
      {
        id: "entry-peer-2",
        sequence: 2,
        companyName: "Flexicom",
        quality: "50kg Fertilizer Bag",
        rollNumber: "VR-999", // Peer added this row
        rollMtr: 600,
        netWeight: 60,
        avgWeight: 100,
        openingMeterReading: 2000,
        closingMeterReading: 2600,
        coverPatchOs: 30,
        coverPatchDs: 30,
        valvePatch: 60,
        productionPcs: 600,
        productionKg: 60,
      },
    ];

    // Local has sampleLocal[1] (VR-102) which has not yet synced to server
    const reconciled = reconcileServerValvomaticReportEntries({
      localEntries: sampleLocal,
      incomingEntries: incomingFromPeer,
      focusedCell: null,
      hasUnsavedLocalEdits: true,
    });

    // Should contain entry-1, VR-999 (from peer), and VR-102 (local pending)
    expect(reconciled).toHaveLength(3);
    expect(reconciled.map((r) => r.rollNumber)).toEqual(["VR-101", "VR-999", "VR-102"]);
  });

  it("should exclude rows that were deleted locally (deletedEntryIds)", () => {
    const incoming: ValvomaticReportItem[] = [
      {
        id: "entry-1",
        sequence: 1,
        quality: "50kg Cement Bag",
        rollNumber: "VR-101",
        rollMtr: 500,
        netWeight: 50,
        avgWeight: 100,
        openingMeterReading: 1000,
        closingMeterReading: 1500,
        coverPatchOs: 25,
        coverPatchDs: 25,
        valvePatch: 50,
        productionPcs: 500,
        productionKg: 50,
      },
      {
        id: "entry-2",
        sequence: 2,
        quality: "25kg Sugar Bag",
        rollNumber: "VR-102",
        rollMtr: 400,
        netWeight: 40,
        avgWeight: 100,
        openingMeterReading: 1500,
        closingMeterReading: 1900,
        coverPatchOs: 20,
        coverPatchDs: 20,
        valvePatch: 40,
        productionPcs: 400,
        productionKg: 40,
      },
    ];

    const deletedIds = new Set<string>(["entry-2"]);

    const reconciled = reconcileServerValvomaticReportEntries({
      localEntries: [sampleLocal[0]],
      incomingEntries: incoming,
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

    const payload1 = serializeValvomaticReportPayload(header, sampleLocal);
    const payload2 = serializeValvomaticReportPayload(header, [
      { ...sampleLocal[0] },
      { ...sampleLocal[1] },
    ]);

    expect(payload1).toBe(payload2);
  });
});
