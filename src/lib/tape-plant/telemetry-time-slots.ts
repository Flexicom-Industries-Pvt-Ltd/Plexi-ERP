/**
 * Utility functions for generating dynamic telemetry time slots based on Shift Master
 * and enforcing time-window auto-locking with supervisor RBAC override.
 */

export function generateShiftTimeSlots(
  startTime?: string,
  endTime?: string,
  isDayNight: boolean = false,
  intervalHours: number = 2
): string[] {
  if (isDayNight) {
    // 24-hour continuous cycle (12 bi-hourly intervals starting from 08:00)
    return [
      "08:00",
      "10:00",
      "12:00",
      "14:00",
      "16:00",
      "18:00",
      "20:00",
      "22:00",
      "00:00",
      "02:00",
      "04:00",
      "06:00",
      "08:00",
    ];
  }

  const start = startTime || "08:00";
  const end = endTime || "20:00";

  const parseHour = (timeStr: string): number => {
    const parts = timeStr.split(":");
    return parseInt(parts[0], 10) || 0;
  };

  const startHour = parseHour(start);
  const endHour = parseHour(end);

  const slots: string[] = [];

  if (startHour <= endHour) {
    // Standard same-day shift (e.g. 08:00 -> 20:00 or 06:00 -> 14:00)
    for (let h = startHour; h <= endHour; h += intervalHours) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
    }
  } else {
    // Overnight shift crossing midnight (e.g. 20:00 -> 08:00)
    for (let h = startHour; h < 24; h += intervalHours) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
    }
    // Handle wrap-around from midnight
    const remainingStart = (slots.length > 0 ? (parseHour(slots[slots.length - 1]) + intervalHours) % 24 : 0);
    for (let h = remainingStart; h <= endHour; h += intervalHours) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
    }
  }

  // Fallback if loop didn't generate at least 3 intervals
  if (slots.length < 3) {
    return ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
  }

  return slots;
}

/**
 * Checks whether a telemetry interval slot has expired and should auto-lock.
 * Default grace period is 120 minutes (2 hours) past the slot start time.
 */
export function isTimeSlotLocked(
  slotDate: string,
  slotTime: string,
  graceMinutes: number = 120
): boolean {
  if (!slotDate || !slotTime) return false;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Past dates are automatically locked
  if (slotDate < todayStr) {
    return true;
  }

  // Future dates are not expired
  if (slotDate > todayStr) {
    return false;
  }

  // Same day: evaluate slot time + grace period
  const [slotH, slotM] = slotTime.split(":").map(Number);
  if (isNaN(slotH)) return false;

  const slotTimestamp = new Date(now);
  slotTimestamp.setHours(slotH, slotM || 0, 0, 0);

  const expiryTimestamp = new Date(slotTimestamp.getTime() + graceMinutes * 60 * 1000);

  return now.getTime() > expiryTimestamp.getTime();
}

/**
 * Validates if the active user possesses supervisor or admin RBAC authority
 * to unlock an expired telemetry reading row.
 */
export function canUserOverrideLock(
  userRole?: string,
  permissions?: any[],
  canUnlockTimeSlots?: boolean
): boolean {
  if (canUnlockTimeSlots !== undefined) {
    return Boolean(canUnlockTimeSlots);
  }
  if (!userRole) return false;

  const normalized = userRole.toUpperCase();
  if (
    normalized === "SUPERADMIN" ||
    normalized.includes("ADMIN") ||
    normalized.includes("SUPERVISOR") ||
    normalized.includes("MANAGER")
  ) {
    return true;
  }

  if (Array.isArray(permissions)) {
    return permissions.some(
      (p) =>
        (p.module === "PRODUCTION" || p.module === "TAPE_PLANT") &&
        (p.canUpdate || p.canManage)
    );
  }

  return false;
}

export interface ShiftTimeWindow {
  id: string;
  startTime?: string | null;
  endTime?: string | null;
  isNightShift?: boolean;
}

/**
 * Resolves the appropriate database Shift ID for a given time slot string (e.g. "08:00", "22:00").
 * Used when telemetry readings span across multiple shifts (e.g. in "ALL" / 24h mode)
 * so that each record satisfies the Shift foreign key constraint in the database.
 */
export function resolveShiftIdForTime(
  timeStr: string,
  shifts: ShiftTimeWindow[],
  fallbackShiftId: string
): string {
  if (!timeStr || !shifts || shifts.length === 0) return fallbackShiftId;
  const [hourStr] = timeStr.trim().split(":");
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return fallbackShiftId;

  for (const s of shifts) {
    const startH = s.startTime ? parseInt(s.startTime.split(":")[0], 10) : 8;
    const endH = s.endTime ? parseInt(s.endTime.split(":")[0], 10) : 20;

    if (startH <= endH) {
      // Same-day shift e.g. 08:00 to 20:00
      if (hour >= startH && hour < endH) return s.id;
    } else {
      // Overnight shift e.g. 20:00 to 08:00
      if (hour >= startH || hour < endH) return s.id;
    }
  }

  return fallbackShiftId;
}

