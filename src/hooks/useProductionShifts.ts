"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

export interface ProductionShift {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  isNightShift?: boolean;
  isDayNight?: boolean;
  isActive?: boolean;
}

interface ShiftsApiResponse {
  success: boolean;
  shifts: ProductionShift[];
  allowDayNight: boolean;
  dayNightOption: ProductionShift | null;
  allOptions: ProductionShift[];
}

let cachedShiftsResponse: ShiftsApiResponse | null = null;
let activeFetchPromise: Promise<ShiftsApiResponse | null> | null = null;

export async function fetchProductionShifts(forceRefresh: boolean = false): Promise<ShiftsApiResponse | null> {
  if (!forceRefresh && cachedShiftsResponse) {
    return cachedShiftsResponse;
  }
  if (!forceRefresh && activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const res = await fetch("/api/production/shifts", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load production shifts");
      const data: ShiftsApiResponse = await res.json();
      cachedShiftsResponse = data;
      return data;
    } catch (err) {
      console.warn("useProductionShifts: could not fetch shifts from API, using fallback", err);
      return null;
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

export function useProductionShifts(options?: { includeDayNight?: boolean }) {
  const [data, setData] = useState<ShiftsApiResponse | null>(cachedShiftsResponse);
  const [loading, setLoading] = useState<boolean>(!cachedShiftsResponse);

  const loadData = useCallback(async (force: boolean = false) => {
    setLoading(true);
    const res = await fetchProductionShifts(force);
    if (res) {
      setData(res);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Primary discrete shifts strictly from Shift Master
  const shifts: ProductionShift[] = useMemo(() => {
    if (data?.shifts && data.shifts.length > 0) {
      return data.shifts;
    }
    return [
      { id: "shift_day", name: "Day Shift", startTime: "08:00", endTime: "20:00", isNightShift: false },
      { id: "shift_night", name: "Night Shift", startTime: "20:00", endTime: "08:00", isNightShift: true },
    ];
  }, [data]);

  const allowDayNight = data ? data.allowDayNight : true;

  const dayNightOption: ProductionShift = useMemo(() => {
    return (
      data?.dayNightOption || {
        id: "DAY_NIGHT",
        name: "Day + Night (24h)",
        startTime: "08:00",
        endTime: "08:00",
        isDayNight: true,
        isNightShift: false,
      }
    );
  }, [data]);

  // All options including Day+Night if enabled and requested
  const allOptions: ProductionShift[] = useMemo(() => {
    const shouldInclude = options?.includeDayNight !== false && allowDayNight;
    if (shouldInclude) {
      return [...shifts, dayNightOption];
    }
    return shifts;
  }, [shifts, dayNightOption, allowDayNight, options?.includeDayNight]);

  const getShiftById = useCallback(
    (id: string): ProductionShift | undefined => {
      if (!id) return undefined;
      if (id === "DAY_NIGHT" || id === "BOTH" || id.toLowerCase().includes("both")) {
        return dayNightOption;
      }
      return allOptions.find((s) => s.id === id);
    },
    [allOptions, dayNightOption]
  );

  const getShiftByName = useCallback(
    (name: string): ProductionShift | undefined => {
      if (!name) return undefined;
      const clean = name.trim().toLowerCase();
      if (clean.includes("24h") || clean.includes("both") || clean.includes("day + night") || clean.includes("day+night")) {
        return dayNightOption;
      }
      return allOptions.find((s) => s.name.trim().toLowerCase() === clean);
    },
    [allOptions, dayNightOption]
  );

  const formatShiftLabel = useCallback((shiftOrName: ProductionShift | string): string => {
    if (!shiftOrName) return "";
    if (typeof shiftOrName === "string") {
      return shiftOrName;
    }
    if (shiftOrName.isDayNight) {
      return `${shiftOrName.name}`;
    }
    if (shiftOrName.startTime && shiftOrName.endTime) {
      return `${shiftOrName.name} (${shiftOrName.startTime} - ${shiftOrName.endTime})`;
    }
    return shiftOrName.name;
  }, []);

  return {
    shifts,
    allOptions,
    allowDayNight,
    dayNightOption,
    loading,
    refetch: () => loadData(true),
    getShiftById,
    getShiftByName,
    formatShiftLabel,
  };
}

