import { describe, it, expect } from "vitest";
import {
  getPrintingReportRowKey,
  reconcileServerPrintingReportEntries,
  serializePrintingReportPayload,
} from "../printing-daily-report-google-docs-sync";
import { PrintingReportItem } from "../printing-types";

describe("Printing Daily Report Google Docs Sync", () => {
  const sampleLocal: PrintingReportItem[] = [
    {
      id: "entry-1",
      sequence: 1,
      companyName: "ABC Corp",
      unitName: "Unit 1",
      grade: "A",
      targetProductionMtrs: 500,
      drumSize: "Standard",
      quality: "PP-Woven",
      rollNumber: "R-101",
      loomNumber: "12",
      productionMeter: 500,
      netWeight: 45,
      avgWeight: 90,
      printMeter: 500,
      remarks: "Initial entry",
    },
    {
      sequence: 2,
      companyName: "XYZ Ltd",
      quality: "HDPE",
      rollNumber: "R-102",
      loomNumber: "14",
      productionMeter: 600,
      netWeight: 54,
      avgWeight: 90,
      printMeter: 600,
    },
  ];

  it("should generate stable unique keys for rows", () => {
    expect(getPrintingReportRowKey({ id: "entry-1" }, 0)).toBe("id:entry-1");
    expect(getPrintingReportRowKey({ rollNumber: "r-999" }, 1)).toBe("roll:R-999");
    expect(getPrintingReportRowKey({ sequence: 3 }, 2)).toBe("seq:3");
  });

  it("should preserve active cell focus value when server updates arrive", () => {
    const incoming: PrintingReportItem[] = [
      {
        id: "entry-1",
        sequence: 1,
        companyName: "ABC Corp - Updated by peer",
        unitName: "Unit 1",
        grade: "A+",
        targetProductionMtrs: 550,
        drumSize: "Large",
        quality: "PP-Woven",
        rollNumber: "R-101",
        loomNumber: "12",
        productionMeter: 550,
        netWeight: 48,
        avgWeight: 87.3,
        printMeter: 550, // Server changed printMeter to 550
        remarks: "Updated by peer",
      },
    ];

    // Local user is actively typing in 'printMeter'
    const reconciled = reconcileServerPrintingReportEntries({
      localEntries: [
        {
          ...sampleLocal[0],
          printMeter: 777, // Local unsaved typed value
        },
      ],
      incomingEntries: incoming,
      focusedCell: { rowKey: "id:entry-1", field: "printMeter" },
      hasUnsavedLocalEdits: true,
    });

    expect(reconciled).toHaveLength(1);
    // Peer updates like companyName and grade should be accepted
    expect(reconciled[0].companyName).toBe("ABC Corp - Updated by peer");
    expect(reconciled[0].grade).toBe("A+");
    // But focused cell printMeter MUST be preserved from local
    expect(reconciled[0].printMeter).toBe(777);
  });

  it("should merge incoming rows from peer while keeping local pending rows", () => {
    const incomingFromPeer: PrintingReportItem[] = [
      {
        id: "entry-1",
        sequence: 1,
        companyName: "ABC Corp",
        quality: "PP-Woven",
        rollNumber: "R-101",
        loomNumber: "12",
        productionMeter: 500,
        netWeight: 45,
        avgWeight: 90,
        printMeter: 500,
      },
      {
        id: "entry-99",
        sequence: 2,
        companyName: "New Peer Customer",
        quality: "PP-Woven",
        rollNumber: "R-999",
        loomNumber: "20",
        productionMeter: 1000,
        netWeight: 90,
        avgWeight: 90,
        printMeter: 1000,
      },
    ];

    const reconciled = reconcileServerPrintingReportEntries({
      localEntries: sampleLocal,
      incomingEntries: incomingFromPeer,
      focusedCell: null,
      hasUnsavedLocalEdits: true,
    });

    // Should contain entry-1, entry-99 (peer added), and local pending R-102
    expect(reconciled.length).toBeGreaterThanOrEqual(3);
    expect(reconciled.some((e) => e.rollNumber === "R-999")).toBe(true);
    expect(reconciled.some((e) => e.rollNumber === "R-102")).toBe(true);
  });

  it("should respect deletedEntryIds and not resurrect deleted rows", () => {
    const incoming: PrintingReportItem[] = [
      {
        id: "entry-1",
        sequence: 1,
        quality: "PP",
        rollNumber: "R-101",
        loomNumber: "1",
        productionMeter: 100,
        netWeight: 10,
        avgWeight: 100,
        printMeter: 100,
      },
      {
        id: "entry-2",
        sequence: 2,
        quality: "PP",
        rollNumber: "R-102",
        loomNumber: "2",
        productionMeter: 200,
        netWeight: 20,
        avgWeight: 100,
        printMeter: 200,
      },
    ];

    const deletedIds = new Set(["id:entry-2", "entry-2"]);

    const reconciled = reconcileServerPrintingReportEntries({
      localEntries: [sampleLocal[0]],
      incomingEntries: incoming,
      focusedCell: null,
      hasUnsavedLocalEdits: false,
      deletedEntryIds: deletedIds,
    });

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].rollNumber).toBe("R-101");
  });

  it("should deterministically serialize payload for echo prevention", () => {
    const header = {
      date: "2026-11-18",
      shiftName: "Day Shift",
      machineNo: "Machine-1",
      operatorName: " John Doe ",
      supervisorName: "Jane Smith",
      status: "DRAFT",
    };

    const p1 = serializePrintingReportPayload(header, sampleLocal);
    const p2 = serializePrintingReportPayload(
      { ...header, operatorName: "John Doe" },
      [...sampleLocal]
    );

    expect(p1).toBe(p2);
  });
});
