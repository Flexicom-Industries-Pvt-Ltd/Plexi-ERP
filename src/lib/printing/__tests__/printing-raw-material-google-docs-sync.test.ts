import { describe, it, expect } from "vitest";
import {
  getPrintingRawMaterialRowKey,
  reconcileServerPrintingRawMaterialEntries,
  serializePrintingRawMaterialPayload,
} from "../printing-raw-material-google-docs-sync";
import { PrintingRawMaterialEntryItem } from "../printing-types";

describe("Printing Raw Material Google Docs Sync", () => {
  const sampleLocal: PrintingRawMaterialEntryItem[] = [
    {
      id: "mat-1",
      sequence: 1,
      materialName: "CYAN INK",
      unit: "LITRE",
      consumedLitre: 10,
      conversionFactor: 0.82,
      consumedKg: 8.2,
      ratioPercent: 50,
      mileage: 100,
    },
    {
      id: "mat-2",
      sequence: 2,
      materialName: "ETHYL ACETATE (SOLVENT)",
      unit: "LITRE",
      consumedLitre: 10,
      conversionFactor: 0.82,
      consumedKg: 8.2,
      ratioPercent: 50,
      mileage: 100,
    },
  ];

  it("should generate stable unique keys", () => {
    expect(getPrintingRawMaterialRowKey({ id: "mat-1" }, 0)).toBe("id:mat-1");
    expect(getPrintingRawMaterialRowKey({ rawMaterialId: "rm-99" }, 1)).toBe("rm:rm-99");
    expect(getPrintingRawMaterialRowKey({ materialName: "black ink" }, 2)).toBe("name:BLACK INK");
    expect(getPrintingRawMaterialRowKey({ sequence: 4 }, 3)).toBe("seq:4");
  });

  it("should preserve focused cell when peer updates arrive", () => {
    const incoming: PrintingRawMaterialEntryItem[] = [
      {
        id: "mat-1",
        sequence: 1,
        materialName: "CYAN INK",
        unit: "LITRE",
        consumedLitre: 25, // Peer changed consumedLitre
        conversionFactor: 0.82,
        consumedKg: 20.5,
        ratioPercent: 71.4,
        mileage: 48.8,
        remarks: "Updated by peer",
      },
      {
        id: "mat-2",
        sequence: 2,
        materialName: "ETHYL ACETATE (SOLVENT)",
        unit: "LITRE",
        consumedLitre: 10,
        conversionFactor: 0.82,
        consumedKg: 8.2,
        ratioPercent: 28.6,
        mileage: 122,
      },
    ];

    // Local user is actively editing consumedLitre of mat-1
    const reconciled = reconcileServerPrintingRawMaterialEntries({
      localEntries: [
        {
          ...sampleLocal[0],
          consumedLitre: 12.5, // Unsaved local edit
        },
        sampleLocal[1],
      ],
      incomingEntries: incoming,
      focusedCell: { rowKey: "id:mat-1", field: "consumedLitre" },
      hasUnsavedLocalEdits: true,
      totalPrintMtrs: 1000,
    });

    expect(reconciled).toHaveLength(2);
    // Focused cell value preserved!
    expect(reconciled[0].consumedLitre).toBe(12.5);
    // Peer's remarks merged in
    expect(reconciled[0].remarks).toBe("Updated by peer");
  });

  it("should serialize payload deterministically for echo suppression", () => {
    const header = {
      date: "2026-11-18",
      shiftName: "Day Shift",
      operatorName: "Jane Doe ",
      supervisorName: "Manager",
      totalPrintMtrs: 1000,
      status: "DRAFT",
    };

    const s1 = serializePrintingRawMaterialPayload(header, sampleLocal);
    const s2 = serializePrintingRawMaterialPayload(
      { ...header, operatorName: "Jane Doe" },
      [...sampleLocal]
    );

    expect(s1).toBe(s2);
  });
});
