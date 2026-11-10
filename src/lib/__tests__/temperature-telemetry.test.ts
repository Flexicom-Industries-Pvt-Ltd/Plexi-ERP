import { describe, it, expect } from "vitest";
import {
  generateShiftTimeSlots,
  isTimeSlotLocked,
  canUserOverrideLock,
} from "../tape-plant/telemetry-time-slots";

describe("Telemetry Dynamic Shift Intervals & Auto-Lock (BUG-012)", () => {
  describe("generateShiftTimeSlots", () => {
    it("generates bi-hourly slots for standard Day Shift (08:00 - 20:00)", () => {
      const slots = generateShiftTimeSlots("08:00", "20:00", false, 2);
      expect(slots).toEqual([
        "08:00",
        "10:00",
        "12:00",
        "14:00",
        "16:00",
        "18:00",
        "20:00",
      ]);
    });

    it("generates bi-hourly slots for Night Shift crossing midnight (20:00 - 08:00)", () => {
      const slots = generateShiftTimeSlots("20:00", "08:00", false, 2);
      expect(slots).toContain("20:00");
      expect(slots).toContain("22:00");
      expect(slots).toContain("00:00");
      expect(slots).toContain("02:00");
      expect(slots).toContain("04:00");
      expect(slots).toContain("06:00");
      expect(slots).toContain("08:00");
    });

    it("generates 24h continuous slots when isDayNight is true", () => {
      const slots = generateShiftTimeSlots("08:00", "20:00", true, 2);
      expect(slots.length).toBe(13);
      expect(slots[0]).toBe("08:00");
      expect(slots[slots.length - 1]).toBe("08:00");
    });
  });

  describe("isTimeSlotLocked", () => {
    it("locks slots on past dates", () => {
      const pastDate = "2020-01-01";
      expect(isTimeSlotLocked(pastDate, "12:00", 120)).toBe(true);
    });

    it("does not lock future dates", () => {
      const futureDate = "2099-01-01";
      expect(isTimeSlotLocked(futureDate, "12:00", 120)).toBe(false);
    });

    it("locks a slot today if slot time + grace period (120 mins) has elapsed", () => {
      const today = new Date().toISOString().slice(0, 10);
      // Construct a time slot 4 hours in the past
      const pastHour = Math.max(0, new Date().getHours() - 4);
      const pastSlot = `${String(pastHour).padStart(2, "0")}:00`;
      expect(isTimeSlotLocked(today, pastSlot, 120)).toBe(true);
    });

    it("keeps slot open if within grace period or in the future today", () => {
      const today = new Date().toISOString().slice(0, 10);
      // Construct a time slot 2 hours in the future
      const futureHour = Math.min(23, new Date().getHours() + 2);
      const futureSlot = `${String(futureHour).padStart(2, "0")}:00`;
      expect(isTimeSlotLocked(today, futureSlot, 120)).toBe(false);
    });
  });

  describe("canUserOverrideLock", () => {
    it("authorizes SUPERADMIN, ADMIN, SUPERVISOR, MANAGER roles", () => {
      expect(canUserOverrideLock("SUPERADMIN")).toBe(true);
      expect(canUserOverrideLock("Admin")).toBe(true);
      expect(canUserOverrideLock("Plant Supervisor")).toBe(true);
      expect(canUserOverrideLock("Production Manager")).toBe(true);
    });

    it("denies regular operators or guests without production management permissions", () => {
      expect(canUserOverrideLock("OPERATOR")).toBe(false);
      expect(canUserOverrideLock("VIEWER")).toBe(false);
      expect(canUserOverrideLock(undefined)).toBe(false);
    });

    it("authorizes users with explicit canUpdate or canManage permission on PRODUCTION or TAPE_PLANT module", () => {
      const permissions = [
        { module: "INVENTORY", canUpdate: true },
        { module: "TAPE_PLANT", canUpdate: true },
      ];
      expect(canUserOverrideLock("CUSTOM_USER", permissions)).toBe(true);
    });
  });
});

