import { describe, it, expect } from "vitest";
import { resolveShiftIdForTime, ShiftTimeWindow } from "../telemetry-time-slots";

describe("Telemetry Shift Resolution for Day/Night and Multi-Shift Telemetry", () => {
  const shifts: ShiftTimeWindow[] = [
    {
      id: "shift-day-id",
      startTime: "08:00",
      endTime: "20:00",
      isNightShift: false,
    },
    {
      id: "shift-night-id",
      startTime: "20:00",
      endTime: "08:00",
      isNightShift: true,
    },
  ];

  it("resolves day shift time slots correctly", () => {
    expect(resolveShiftIdForTime("08:00", shifts, "fallback")).toBe("shift-day-id");
    expect(resolveShiftIdForTime("10:00", shifts, "fallback")).toBe("shift-day-id");
    expect(resolveShiftIdForTime("12:00", shifts, "fallback")).toBe("shift-day-id");
    expect(resolveShiftIdForTime("14:00", shifts, "fallback")).toBe("shift-day-id");
    expect(resolveShiftIdForTime("16:00", shifts, "fallback")).toBe("shift-day-id");
    expect(resolveShiftIdForTime("18:00", shifts, "fallback")).toBe("shift-day-id");
  });

  it("resolves night shift time slots correctly across midnight boundary", () => {
    expect(resolveShiftIdForTime("20:00", shifts, "fallback")).toBe("shift-night-id");
    expect(resolveShiftIdForTime("22:00", shifts, "fallback")).toBe("shift-night-id");
    expect(resolveShiftIdForTime("00:00", shifts, "fallback")).toBe("shift-night-id");
    expect(resolveShiftIdForTime("02:00", shifts, "fallback")).toBe("shift-night-id");
    expect(resolveShiftIdForTime("04:00", shifts, "fallback")).toBe("shift-night-id");
    expect(resolveShiftIdForTime("06:00", shifts, "fallback")).toBe("shift-night-id");
  });

  it("falls back to default shift if time format is invalid or shifts array is empty", () => {
    expect(resolveShiftIdForTime("", shifts, "fallback-id")).toBe("fallback-id");
    expect(resolveShiftIdForTime("invalid", shifts, "fallback-id")).toBe("fallback-id");
    expect(resolveShiftIdForTime("08:00", [], "fallback-id")).toBe("fallback-id");
  });
});
