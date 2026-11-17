import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchProductionShifts, ProductionShift } from "@/hooks/useProductionShifts";

describe("Production Shifts & Shift Master Integration (BUG-011)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("API Fetch and Formatting", () => {
    it("should fetch shifts and honor 24-Hour Day+Night provision", async () => {
      const mockShifts: ProductionShift[] = [
        { id: "shift-1", name: "Day Shift", startTime: "08:00", endTime: "20:00", isNightShift: false },
        { id: "shift-2", name: "Night Shift", startTime: "20:00", endTime: "08:00", isNightShift: true },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          shifts: mockShifts,
          allowDayNight: true,
          dayNightOption: {
            id: "DAY_NIGHT",
            name: "Day + Night (24h)",
            startTime: "08:00",
            endTime: "08:00",
            isDayNight: true,
          },
          allOptions: [
            ...mockShifts,
            { id: "DAY_NIGHT", name: "Day + Night (24h)", isDayNight: true },
          ],
        }),
      } as any);

      const result = await fetchProductionShifts(true);
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.shifts).toHaveLength(2);
      expect(result?.allowDayNight).toBe(true);
      expect(result?.dayNightOption?.id).toBe("DAY_NIGHT");
    });

    it("should handle disabled Day+Night provision gracefully", async () => {
      const mockShifts: ProductionShift[] = [
        { id: "shift-1", name: "Morning Shift", startTime: "06:00", endTime: "14:00" },
        { id: "shift-2", name: "Evening Shift", startTime: "14:00", endTime: "22:00" },
        { id: "shift-3", name: "Night Shift", startTime: "22:00", endTime: "06:00", isNightShift: true },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          shifts: mockShifts,
          allowDayNight: false,
          dayNightOption: null,
          allOptions: mockShifts,
        }),
      } as any);

      const result = await fetchProductionShifts(true);
      expect(result?.allowDayNight).toBe(false);
      expect(result?.shifts).toHaveLength(3);
    });

    it("should handle network failure gracefully without throwing exceptions", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Connection reset"));

      const result = await fetchProductionShifts(true);
      expect(result).toBeNull();
    });
  });
});

