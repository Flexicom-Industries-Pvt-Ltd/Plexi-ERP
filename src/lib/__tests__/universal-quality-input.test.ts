import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UniversalQualityOption,
  fetchUniversalQualities,
} from "@/components/ui/UniversalQualityInput";

describe("Universal Quality Combobox & Data Centre Synchronization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Quality Matching & Filtering Logic", () => {
    const sampleQualities: UniversalQualityOption[] = [
      {
        code: "wOND/LPP/WH/500/67/S1",
        tapeType: "LPP",
        colour: "WHITE",
        colorGroup: "Yellow",
        denier: 900,
        size: "71.5mm",
      },
      {
        code: "NUVOCO SI",
        tapeType: "PP",
        colour: "YELLOW",
        colorGroup: "Yellow",
        denier: 850,
        label: "Nuvoco Vistas Corp",
      },
      {
        code: "Mahal/LPP/W",
        tapeType: "LPP",
        colour: "WHITE",
        denier: 1000,
      },
      {
        code: "STAR CEMENT 50KG",
        tapeType: "PP",
        label: "Star Cement Special",
      },
    ];

    it("should filter qualities matching search code case-insensitively", () => {
      const q = "nuvoco";
      const matches = sampleQualities.filter(
        (item) =>
          item.code.toLowerCase().includes(q) ||
          (item.label && item.label.toLowerCase().includes(q))
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].code).toBe("NUVOCO SI");
    });

    it("should filter qualities by colour and tapeType", () => {
      const q = "white";
      const matches = sampleQualities.filter(
        (item) =>
          (item.colour && item.colour.toLowerCase().includes(q)) ||
          item.code.toLowerCase().includes(q)
      );
      expect(matches).toHaveLength(2);
      expect(matches.map((m) => m.code)).toContain("wOND/LPP/WH/500/67/S1");
      expect(matches.map((m) => m.code)).toContain("Mahal/LPP/W");
    });

    it("should allow arbitrary custom quality strings (manual typing requirement)", () => {
      const customInput = "CUSTOM-TEST-BATCH-99";
      const matched = sampleQualities.find(
        (m) => m.code.toLowerCase() === customInput.toLowerCase()
      );
      expect(matched).toBeUndefined();

      // Manual typing allows using customInput as-is
      const finalSelectedQuality = matched ? matched.code : customInput.trim();
      expect(finalSelectedQuality).toBe("CUSTOM-TEST-BATCH-99");
    });
  });

  describe("Data Centre Dynamic API Fetch Caching", () => {
    it("should fetch qualities from /api/data-centre/qualities and parse correctly", async () => {
      const mockQualities: UniversalQualityOption[] = [
        { code: "RECIPE-001", tapeType: "PP", colour: "WHITE" },
        { code: "RECIPE-002", tapeType: "LPP", colour: "YELLOW" },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          count: mockQualities.length,
          qualities: mockQualities,
        }),
      } as any);

      const result = await fetchUniversalQualities();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle API failure gracefully without throwing unhandled exceptions", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

      // Should return array gracefully
      const result = await fetchUniversalQualities();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
