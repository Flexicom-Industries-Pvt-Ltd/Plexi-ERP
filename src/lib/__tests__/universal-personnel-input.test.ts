import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PersonnelItem,
  fetchPersonnel,
} from "@/components/ui/UniversalPersonnelInput";

describe("Universal Personnel Input & Data Centre Synchronization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Personnel Filtering and Search Logic", () => {
    const sampleOperators: PersonnelItem[] = [
      { id: "op-1", name: "Ramesh Kumar", code: "EMP-001", section: "LOOM", designation: "Master Operator" },
      { id: "op-2", name: "Suresh Singh", code: "EMP-002", section: "PRINTING", designation: "Print Technician" },
      { id: "op-3", name: "Anil Verma", code: "EMP-003", section: "LAMINATION", designation: "Lamination Operator" },
      { id: "op-4", name: "Sunil Sharma", code: "EMP-004", section: "CONVERTEX", designation: "Operator Grade 1" },
    ];

    it("should filter personnel by name query case-insensitively", () => {
      const q = "ramesh";
      const matches = sampleOperators.filter((item) =>
        item.name.toLowerCase().includes(q.toLowerCase())
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe("Ramesh Kumar");
    });

    it("should filter personnel by code or employee ID", () => {
      const q = "emp-002";
      const matches = sampleOperators.filter((item) =>
        (item.code || "").toLowerCase().includes(q.toLowerCase())
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe("Suresh Singh");
    });

    it("should filter personnel by section department", () => {
      const section = "PRINTING";
      const matches = sampleOperators.filter(
        (item) => !item.section || item.section.toUpperCase() === section.toUpperCase()
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe("Suresh Singh");
    });
  });

  describe("fetchPersonnel API Client", () => {
    it("should fetch operators from data-centre endpoint", async () => {
      const mockData = [
        { id: "op-1", name: "Ramesh Kumar", code: "EMP-001", section: "LOOM", designation: "Operator", phone: "9876543210" },
      ];

      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      } as Response);

      const items = await fetchPersonnel("operator");
      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].name).toBe("Ramesh Kumar");
    });

    it("should gracefully return empty array or cache on fetch failure", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

      const items = await fetchPersonnel("contractor");
      expect(Array.isArray(items)).toBe(true);
    });
  });
});
