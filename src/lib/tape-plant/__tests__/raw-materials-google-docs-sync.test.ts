import { describe, it, expect } from "vitest";
import {
  serializeRawMaterialPayload,
  reconcileServerRawMaterialRows,
  RawMaterialRow,
} from "@/components/tape-plant/RawMaterialSection";

function mockMaterialRow(partial: Partial<RawMaterialRow> & { material: string }): RawMaterialRow {
  return {
    material: partial.material,
    grade: partial.grade ?? "",
    openingStock: partial.openingStock ?? "",
    received: partial.received ?? "",
    consumption: partial.consumption ?? "",
    settingPercent: partial.settingPercent ?? "",
    actualPercent: partial.actualPercent ?? "",
    wastage: partial.wastage ?? "",
    photoUrl: partial.photoUrl,
    operatorName: partial.operatorName ?? "",
    operatorId: partial.operatorId ?? "",
  };
}

describe("Google Docs-Grade Collaborative Sync for Raw Materials", () => {
  describe("serializeRawMaterialPayload", () => {
    it("produces deterministic serialized string regardless of key ordering or whitespace", () => {
      const rows1 = [
        mockMaterialRow({ material: "PP Homopolymer", consumption: 500, received: 1000 }),
      ];
      const rows2 = [
        mockMaterialRow({ material: " PP Homopolymer ", consumption: 500, received: 1000 }),
      ];

      const s1 = serializeRawMaterialPayload("2026-11-18", "shift-1", "John", "OP-1", rows1);
      const s2 = serializeRawMaterialPayload("2026-11-18", "shift-1", "John", "OP-1", rows2);
      expect(s1).toEqual(s2);
    });
  });

  describe("reconcileServerRawMaterialRows", () => {
    it("merges remote changes into local state non-destructively", () => {
      const local: RawMaterialRow[] = [
        mockMaterialRow({ material: "PP Homopolymer", openingStock: "1500", consumption: "400" }),
        mockMaterialRow({ material: "Calcium Carbonate", consumption: "" }),
      ];
      const server: RawMaterialRow[] = [
        mockMaterialRow({ material: "PP Homopolymer", openingStock: "1500", consumption: "400", received: "500" }),
        mockMaterialRow({ material: "Calcium Carbonate", consumption: "120", photoUrl: "http://example.com/scale.webp" }),
        mockMaterialRow({ material: "UV Stabilizer", consumption: "25" }),
      ];

      const reconciled = reconcileServerRawMaterialRows(local, server, null);

      const pp = reconciled.find((r) => r.material.toUpperCase() === "PP HOMOPOLYMER");
      expect(pp?.openingStock).toBe("1500");
      expect(pp?.consumption).toBe("400");
      expect(pp?.received).toBe("500");

      const calcium = reconciled.find((r) => r.material.toUpperCase() === "CALCIUM CARBONATE");
      expect(calcium?.consumption).toBe("120");
      expect(calcium?.photoUrl).toBe("http://example.com/scale.webp");

      const uv = reconciled.find((r) => r.material.toUpperCase() === "UV STABILIZER");
      expect(uv?.consumption).toBe("25");
    });

    it("ISOLATES active cell currently being typed into (Google Docs-grade)", () => {
      const local: RawMaterialRow[] = [
        mockMaterialRow({ material: "PP Homopolymer", consumption: "450-typing", received: "500" }),
      ];
      const server: RawMaterialRow[] = [
        mockMaterialRow({ material: "PP Homopolymer", consumption: "300-stale", received: "600" }),
      ];

      // User is actively focused on consumption of PP Homopolymer
      const activeCell = { material: "PP Homopolymer", field: "consumption" };

      const reconciled = reconcileServerRawMaterialRows(local, server, activeCell);

      const pp = reconciled.find((r) => r.material.toUpperCase() === "PP HOMOPOLYMER");
      // consumption MUST retain user's active keystrokes
      expect(pp?.consumption).toBe("450-typing");
      // received field merges from server seamlessly
      expect(pp?.received).toBe("600");
    });

    it("handles concurrent material additions from PC and Phone without dropping either", () => {
      const local: RawMaterialRow[] = [
        mockMaterialRow({ material: "PP Homopolymer" }),
        mockMaterialRow({ material: "Special Batch Additive A", consumption: "15" }), // Phone added custom row
      ];
      const server: RawMaterialRow[] = [
        mockMaterialRow({ material: "PP Homopolymer" }),
        mockMaterialRow({ material: "Special Batch Additive B", consumption: "20" }), // PC added custom row
      ];

      const reconciled = reconcileServerRawMaterialRows(local, server, null);

      const names = reconciled.map((r) => r.material);
      expect(names).toContain("PP Homopolymer");
      expect(names).toContain("Special Batch Additive A");
      expect(names).toContain("Special Batch Additive B");
    });

    it("preserves default materials ordering followed by custom additives", () => {
      const local: RawMaterialRow[] = [
        mockMaterialRow({ material: "Custom Additive Z" }),
        mockMaterialRow({ material: "PP" }),
      ];
      const server: RawMaterialRow[] = [
        mockMaterialRow({ material: "CC" }),
        mockMaterialRow({ material: "Custom Additive A" }),
      ];

      const reconciled = reconcileServerRawMaterialRows(local, server, null);

      // Default materials must appear before custom materials
      const idxPP = reconciled.findIndex((r) => r.material.toUpperCase() === "PP");
      const idxCC = reconciled.findIndex((r) => r.material.toUpperCase() === "CC");
      const idxA = reconciled.findIndex((r) => r.material.toUpperCase() === "CUSTOM ADDITIVE A");
      const idxZ = reconciled.findIndex((r) => r.material.toUpperCase() === "CUSTOM ADDITIVE Z");

      expect(idxPP).toBeLessThan(idxA);
      expect(idxCC).toBeLessThan(idxA);
      expect(idxA).toBeLessThan(idxZ);
    });
  });
});
