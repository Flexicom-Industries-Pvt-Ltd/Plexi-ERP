"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Thermometer,
  Plus,
  Copy,
  CheckCircle,
  Lock,
  Unlock,
  Camera,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  Printer,
} from "lucide-react";
import dynamic from "next/dynamic";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";
import { OperatorSelect } from "./OperatorSelect";
import { PhotoEvidenceModal } from "./PhotoEvidenceModal";
import { useProductionShifts } from "@/hooks/useProductionShifts";
import { useProductionRealtime } from "@/hooks/useProductionRealtime";
import { RealtimeSyncBadge } from "@/components/production/RealtimeSyncBadge";
import {
  generateShiftTimeSlots,
  isTimeSlotLocked,
} from "@/lib/tape-plant/telemetry-time-slots";

const TemperaturePrintPreviewModal = dynamic(
  () => import("./TemperaturePrintPreviewModal").then((m) => m.TemperaturePrintPreviewModal),
  { ssr: false }
);

export interface TemperatureReading {
  id?: string;
  time: string;
  photoUrl?: string;
  b1: number | string;
  b2: number | string;
  b3: number | string;
  b4: number | string;
  b5: number | string;
  b6: number | string;
  b7: number | string;
  screenChanger: number | string;
  ad1: number | string;
  ad2: number | string;
  meltPump: number | string;
  d1: number | string;
  d2: number | string;
  d3: number | string;
  d4: number | string;
  d5: number | string;
  d6: number | string;
  d7: number | string;
  meltTemp: number | string;
  h1: number | string;
  h2: number | string;
  hotAirTemp: number | string;
}

interface ProcessTemperatureSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function normalizeTimeSlot(t?: string): string {
  if (!t) return "";
  const trimmed = t.trim();
  const parts = trimmed.split(":");
  if (parts.length >= 2) {
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    return `${hh}:${mm}`;
  }
  return trimmed;
}

export function serializeTemperaturePayload(
  date: string,
  shiftId: string,
  operatorName: string,
  operatorId: string,
  readings: TemperatureReading[]
): string {
  return JSON.stringify({
    date,
    shiftId,
    operatorName: (operatorName || "").trim(),
    operatorId: (operatorId || "").trim(),
    readings: readings.map((r) => ({
      time: normalizeTimeSlot(r.time),
      photoUrl: r.photoUrl || null,
      b1: r.b1 ?? "",
      b2: r.b2 ?? "",
      b3: r.b3 ?? "",
      b4: r.b4 ?? "",
      b5: r.b5 ?? "",
      b6: r.b6 ?? "",
      b7: r.b7 ?? "",
      screenChanger: r.screenChanger ?? "",
      ad1: r.ad1 ?? "",
      ad2: r.ad2 ?? "",
      meltPump: r.meltPump ?? "",
      d1: r.d1 ?? "",
      d2: r.d2 ?? "",
      d3: r.d3 ?? "",
      d4: r.d4 ?? "",
      d5: r.d5 ?? "",
      d6: r.d6 ?? "",
      d7: r.d7 ?? "",
      meltTemp: r.meltTemp ?? "",
      h1: r.h1 ?? "",
      h2: r.h2 ?? "",
      hotAirTemp: r.hotAirTemp ?? "",
    })),
  });
}

export function reconcileServerReadings(
  localReadings: TemperatureReading[],
  incomingServerReadings: TemperatureReading[],
  activeCell: { time: string; field: string } | null,
  intervals: string[]
): TemperatureReading[] {
  const normIntervals = intervals.map(normalizeTimeSlot);
  const serverMap = new Map<string, TemperatureReading>();
  for (const s of incomingServerReadings) {
    const t = normalizeTimeSlot(s.time);
    if (t) serverMap.set(t, s);
  }

  const localMap = new Map<string, TemperatureReading>();
  for (const l of localReadings) {
    const t = normalizeTimeSlot(l.time);
    if (t) localMap.set(t, l);
  }

  const allTimes = new Set<string>();
  normIntervals.forEach((t) => allTimes.add(t));
  localReadings.forEach((l) => {
    const t = normalizeTimeSlot(l.time);
    if (t) allTimes.add(t);
  });
  incomingServerReadings.forEach((s) => {
    const t = normalizeTimeSlot(s.time);
    if (t) allTimes.add(t);
  });

  const merged: TemperatureReading[] = [];

  for (const t of allTimes) {
    const local = localMap.get(t);
    const server = serverMap.get(t);

    if (server && !local) {
      merged.push({ ...server, time: t });
      continue;
    }

    if (!server && local) {
      merged.push({ ...local, time: t });
      continue;
    }

    if (server && local) {
      const mergedRow: TemperatureReading = {
        id: server.id || local.id,
        time: t,
        photoUrl: server.photoUrl !== undefined ? server.photoUrl : local.photoUrl,
        b1: server.b1 ?? "",
        b2: server.b2 ?? "",
        b3: server.b3 ?? "",
        b4: server.b4 ?? "",
        b5: server.b5 ?? "",
        b6: server.b6 ?? "",
        b7: server.b7 ?? "",
        screenChanger: server.screenChanger ?? "",
        ad1: server.ad1 ?? "",
        ad2: server.ad2 ?? "",
        meltPump: server.meltPump ?? "",
        d1: server.d1 ?? "",
        d2: server.d2 ?? "",
        d3: server.d3 ?? "",
        d4: server.d4 ?? "",
        d5: server.d5 ?? "",
        d6: server.d6 ?? "",
        d7: server.d7 ?? "",
        meltTemp: server.meltTemp ?? "",
        h1: server.h1 ?? "",
        h2: server.h2 ?? "",
        hotAirTemp: server.hotAirTemp ?? "",
      };

      // FOCUSED CELL ISOLATION (Google Docs-Grade):
      // If the local operator is actively typing in a cell on this row,
      // retain local draft value to prevent cursor jumps and dropped keystrokes!
      if (activeCell && normalizeTimeSlot(activeCell.time) === t) {
        const fieldKey = activeCell.field as keyof TemperatureReading;
        if (fieldKey && fieldKey in local) {
          (mergedRow as unknown as Record<string, unknown>)[fieldKey] = (local as unknown as Record<string, unknown>)[fieldKey];
        }
      }

      merged.push(mergedRow);
    }
  }

  // Sort deterministically: intervals first in defined order, then any custom rows
  merged.sort((a, b) => {
    const idxA = normIntervals.indexOf(normalizeTimeSlot(a.time));
    const idxB = normIntervals.indexOf(normalizeTimeSlot(b.time));
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return normalizeTimeSlot(a.time).localeCompare(normalizeTimeSlot(b.time));
  });

  return merged;
}

export type RawTemperatureReading = Partial<TemperatureReading & { housingWater?: string | number }>;

export function mergeTemperatureReadings(data: RawTemperatureReading[], intervals: string[]): TemperatureReading[] {
  const normIntervals = intervals.map(normalizeTimeSlot);
  const dataByTime = new Map<string, RawTemperatureReading>();
  const extraItemsByTime = new Map<string, RawTemperatureReading>();

  for (const d of data) {
    const t = normalizeTimeSlot(d.time);
    if (!t) continue;
    if (normIntervals.includes(t)) {
      if (!dataByTime.has(t)) {
        dataByTime.set(t, { ...d, time: t });
      } else {
        const existing = dataByTime.get(t);
        if (existing) {
          for (const [key, val] of Object.entries(d)) {
            if (val !== null && val !== undefined && val !== "") {
              (existing as Record<string, unknown>)[key] = val;
            }
          }
          if (d.id) existing.id = d.id;
          if ("photoUrl" in d) {
            existing.photoUrl = d.photoUrl || undefined;
          }
          dataByTime.set(t, existing);
        }
      }
    } else {
      if (!extraItemsByTime.has(t)) {
        extraItemsByTime.set(t, { ...d, time: t });
      } else {
        const existing = extraItemsByTime.get(t);
        if (existing) {
          for (const [key, val] of Object.entries(d)) {
            if (val !== null && val !== undefined && val !== "") {
              (existing as Record<string, unknown>)[key] = val;
            }
          }
          if (d.id) existing.id = d.id;
          if ("photoUrl" in d) {
            existing.photoUrl = d.photoUrl || undefined;
          }
          extraItemsByTime.set(t, existing);
        }
      }
    }
  }

  const result: TemperatureReading[] = normIntervals.map((time) => {
    const d = dataByTime.get(time);
    if (d) {
      return {
        id: d.id,
        time,
        photoUrl: d.photoUrl || undefined,
        b1: d.b1 ?? "",
        b2: d.b2 ?? "",
        b3: d.b3 ?? "",
        b4: d.b4 ?? "",
        b5: d.b5 ?? "",
        b6: d.b6 ?? "",
        b7: d.b7 ?? "",
        screenChanger: d.screenChanger ?? "",
        ad1: d.ad1 ?? "",
        ad2: d.ad2 ?? "",
        meltPump: d.meltPump ?? "",
        d1: d.d1 ?? "",
        d2: d.d2 ?? "",
        d3: d.d3 ?? "",
        d4: d.d4 ?? "",
        d5: d.d5 ?? "",
        d6: d.d6 ?? "",
        d7: d.d7 ?? "",
        meltTemp: d.meltTemp ?? "",
        h1: d.h1 !== undefined && d.h1 !== null ? d.h1 : (d.housingWater ?? ""),
        h2: d.h2 ?? "",
        hotAirTemp: d.hotAirTemp ?? "",
      };
    }
    return {
      time,
      photoUrl: undefined,
      b1: "",
      b2: "",
      b3: "",
      b4: "",
      b5: "",
      b6: "",
      b7: "",
      screenChanger: "",
      ad1: "",
      ad2: "",
      meltPump: "",
      d1: "",
      d2: "",
      d3: "",
      d4: "",
      d5: "",
      d6: "",
      d7: "",
      meltTemp: "",
      h1: "",
      h2: "",
      hotAirTemp: "",
    };
  });

  for (const d of extraItemsByTime.values()) {
    result.push({
      id: d.id,
      time: d.time || "",
      photoUrl: d.photoUrl || undefined,
      b1: d.b1 ?? "",
      b2: d.b2 ?? "",
      b3: d.b3 ?? "",
      b4: d.b4 ?? "",
      b5: d.b5 ?? "",
      b6: d.b6 ?? "",
      b7: d.b7 ?? "",
      screenChanger: d.screenChanger ?? "",
      ad1: d.ad1 ?? "",
      ad2: d.ad2 ?? "",
      meltPump: d.meltPump ?? "",
      d1: d.d1 ?? "",
      d2: d.d2 ?? "",
      d3: d.d3 ?? "",
      d4: d.d4 ?? "",
      d5: d.d5 ?? "",
      d6: d.d6 ?? "",
      d7: d.d7 ?? "",
      meltTemp: d.meltTemp ?? "",
      h1: d.h1 !== undefined && d.h1 !== null ? d.h1 : (d.housingWater ?? ""),
      h2: d.h2 ?? "",
      hotAirTemp: d.hotAirTemp ?? "",
    });
  }

  return result;
}

export function ProcessTemperatureSection({
  date,
  shiftId,
  shiftName,
}: ProcessTemperatureSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const isInitialLoadedRef = useRef(false);
  const lastSavedPayloadRef = useRef("");
  const lastUserEditTimeRef = useRef(0);
  const activeFocusedCellRef = useRef<{ time: string; field: string } | null>(null);
  const hasUnsavedLocalEditsRef = useRef(false);
  const deletedTimesRef = useRef<Set<string>>(new Set());
  const [operatorName, setOperatorName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [readings, setReadings] = useState<TemperatureReading[]>([]);

  // Shift Master integration
  const { shifts } = useProductionShifts();
  const isDayNight = shiftId === "ALL" || shiftName.toLowerCase().includes("day + night");
  const activeShift = useMemo(() => {
    return shifts.find((s) => s.id === shiftId);
  }, [shifts, shiftId]);

  // Dynamic Shift Intervals
  const shiftIntervals = useMemo(() => {
    return generateShiftTimeSlots(
      activeShift?.startTime,
      activeShift?.endTime,
      isDayNight,
      2
    );
  }, [activeShift, isDayNight]);

  // Auth & RBAC State
  const [, setUserRole] = useState<string>("");
  const [, setUserPermissions] = useState<unknown[]>([]);
  const [canUploadPhoto, setCanUploadPhoto] = useState<boolean>(true);
  const [canCapturePhoto, setCanCapturePhoto] = useState<boolean>(true);
  const [canUnlockTimeSlots, setCanUnlockTimeSlots] = useState<boolean>(false);
  const canUnlock = Boolean(canUnlockTimeSlots);

  // Set of unlocked time slots (persisted global overrides)
  const [unlockedSlots, setUnlockedSlots] = useState<Set<string>>(new Set());

  // Photo Evidence Modal state
  const [photoModalRowIdx, setPhotoModalRowIdx] = useState<number | null>(null);

  // Mobile accordion expanded slots state
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());

  // Print Preview Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Fetch current user session to determine role & permissions (live check)
  const refreshUserPermissions = useCallback(() => {
    fetch("/api/auth/session", { cache: "no-store", headers: { Pragma: "no-cache", "Cache-Control": "no-cache" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (!session?.user) return;
        const roleName = session.user.role || "";
        setUserRole(roleName);
        setUserPermissions(session.user.permissions || []);
        setCanUploadPhoto(Boolean(session.user.canUploadPhoto));
        setCanCapturePhoto(session.user.canCapturePhoto !== undefined ? Boolean(session.user.canCapturePhoto) : true);
        setCanUnlockTimeSlots(Boolean(session.user.canUnlockTimeSlots));
      })
      .catch((err) => {
        console.warn("Could not determine user session for RBAC:", err);
      });
  }, []);

  const fetchUnlockedSlots = useCallback(() => {
    if (!date || !shiftId) return;
    fetch(`/api/production/telemetry/unlock?module=TAPE_PLANT_TEMPERATURE&date=${date}&shiftId=${shiftId}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.unlockedSlots && Array.isArray(data.unlockedSlots)) {
          setUnlockedSlots(new Set(data.unlockedSlots));
        } else {
          setUnlockedSlots(new Set());
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch unlocked time slots:", err);
      });
  }, [date, shiftId]);

  useEffect(() => {
    refreshUserPermissions();
  }, [refreshUserPermissions]);

  useEffect(() => {
    fetchUnlockedSlots();
  }, [fetchUnlockedSlots]);

  // Re-fetch live session every time photo modal opens to ensure immediate sync
  useEffect(() => {
    if (photoModalRowIdx !== null) {
      refreshUserPermissions();
    }
  }, [photoModalRowIdx, refreshUserPermissions]);

  // Authoritative data fetch & Google Docs-style 3-way reconciliation
  const fetchAuthoritativeState = useCallback(async (force = false) => {
    if (!date || !shiftId) return;
    try {
      const res = await fetch(
        `/api/production/tape-plant/temperature?date=${date}&shiftId=${shiftId}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        }
      );
      if (!res.ok) return;
      const data: Partial<TemperatureReading & { operatorName?: string; operatorId?: string }>[] = await res.json();
      if (!data) return;

      const opName = (data && data[0]?.operatorName) || "";
      const opId = (data && data[0]?.operatorId) || "";
      if (opName) setOperatorName((prev) => prev || opName);
      if (opId) setOperatorId((prev) => prev || opId);

      const mapped = mergeTemperatureReadings(data, shiftIntervals);

      setReadings((currentLocal) => {
        // If initial load or forced, replace local state directly
        if (!isInitialLoadedRef.current || force) {
          lastSavedPayloadRef.current = serializeTemperaturePayload(
            date,
            shiftId,
            opName || operatorName,
            opId || operatorId,
            mapped
          );
          return mapped;
        }

        // Cell-level 3-way merge isolating actively focused cell typing
        const reconciled = reconcileServerReadings(
          currentLocal,
          mapped,
          activeFocusedCellRef.current,
          shiftIntervals
        );

        // Filter out any locally deleted time slots that have not landed yet
        const finalReadings = reconciled.filter(
          (r) => !deletedTimesRef.current.has(normalizeTimeSlot(r.time))
        );

        // Update baseline snapshot only if user has no unsaved local edits
        if (!hasUnsavedLocalEditsRef.current) {
          lastSavedPayloadRef.current = serializeTemperaturePayload(
            date,
            shiftId,
            opName || operatorName,
            opId || operatorId,
            finalReadings
          );
        }

        return finalReadings;
      });
    } catch (err) {
      console.warn("Authoritative telemetry sync error:", err);
    }
  }, [date, shiftId, shiftIntervals, operatorName, operatorId]);

  // Initial load on date / shift change
  useEffect(() => {
    if (!date || !shiftId) return;
    isInitialLoadedRef.current = false;
    hasUnsavedLocalEditsRef.current = false;
    deletedTimesRef.current.clear();
    setLoading(true);
    setUnlockedSlots(new Set());

    fetch(`/api/production/tape-plant/temperature?date=${date}&shiftId=${shiftId}&_t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Partial<TemperatureReading & { operatorName?: string; operatorId?: string }>[]) => {
        const opName = (data && data[0]?.operatorName) || "";
        const opId = (data && data[0]?.operatorId) || "";
        setOperatorName(opName);
        setOperatorId(opId);
        const mapped = mergeTemperatureReadings(data || [], shiftIntervals);
        setReadings(mapped);
        lastSavedPayloadRef.current = serializeTemperaturePayload(
          date,
          shiftId,
          opName,
          opId,
          mapped
        );
      })
      .catch(() => toast.error("Failed to load temperature readings"))
      .finally(() => {
        setLoading(false);
        isInitialLoadedRef.current = true;
      });
  }, [date, shiftId, shiftIntervals]);

  // Google Docs-grade catch-up when tab/browser is minimized, backgrounded, or wakes up from sleep
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchAuthoritativeState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [fetchAuthoritativeState]);

  const realtime = useProductionRealtime({
    module: "tape-plant",
    sheet: "temperature",
    date,
    shift: shiftId,
    onSync: (event) => {
      if (!date || !shiftId) return;
      // Echo suppression: ignore broadcasts generated by our own client
      if (event?.clientId && event.clientId === realtime.clientId) return;
      fetchAuthoritativeState();
    },
  });

  // Debounced Auto-Save (only fires when local user made changes; avoids echo loops)
  useEffect(() => {
    if (!isInitialLoadedRef.current || !date || !shiftId) return;
    if (!hasUnsavedLocalEditsRef.current) return;

    const hasData = readings.some((r) => r.time && r.time.trim() !== "");
    if (!hasData && deletedTimesRef.current.size === 0) return;

    const serialized = serializeTemperaturePayload(date, shiftId, operatorName, operatorId, readings);
    if (serialized === lastSavedPayloadRef.current && deletedTimesRef.current.size === 0) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const deletedTimes = Array.from(deletedTimesRef.current);
        const payload = {
          date,
          shiftId,
          operatorName,
          operatorId,
          readings,
          deletedTimes,
          clientId: realtime.clientId,
        };

        const res = await fetch("/api/production/tape-plant/temperature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          lastSavedPayloadRef.current = serialized;
          hasUnsavedLocalEditsRef.current = false;
          deletedTimesRef.current.clear();
          setLastAutoSavedAt(new Date());
          realtime.broadcastSync({ action: "SAVE", date, shift: shiftId });
        }
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setAutoSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [readings, operatorName, operatorId, date, shiftId, realtime]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const deletedTimes = Array.from(deletedTimesRef.current);
      const payload = {
        date,
        shiftId,
        operatorName,
        operatorId,
        readings,
        deletedTimes,
        clientId: realtime.clientId,
      };

      const res = await fetch("/api/production/tape-plant/temperature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save readings");
      }

      lastSavedPayloadRef.current = serializeTemperaturePayload(date, shiftId, operatorName, operatorId, readings);
      hasUnsavedLocalEditsRef.current = false;
      deletedTimesRef.current.clear();
      setLastAutoSavedAt(new Date());
      realtime.broadcastSync({ action: "SAVE", date, shift: shiftId });
      toast.success("Process temperature readings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save readings");
    } finally {
      setSaving(false);
    }
  };

  // Mobile cards are collapsed by default on initial load. Users can expand individually or tap "Expand All".

  const toggleSlotExpanded = (idx: number) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedSlots(new Set(readings.map((_, i) => i)));
  };

  const handleCollapseAll = () => {
    setExpandedSlots(new Set());
  };

  const handleFieldChange = useCallback(
    (
      idx: number,
      field: keyof TemperatureReading,
      rawVal: string,
      isNumber = true
    ) => {
      realtime.markLocalEdit();
      hasUnsavedLocalEditsRef.current = true;
      lastUserEditTimeRef.current = Date.now();
      const val = isNumber && rawVal !== "" ? (isNaN(Number(rawVal)) ? rawVal : Number(rawVal)) : rawVal;
      setReadings((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: val };
        return next;
      });
    },
    [realtime]
  );

  const handleDeleteReading = useCallback(
    (idx: number) => {
      realtime.markLocalEdit();
      hasUnsavedLocalEditsRef.current = true;
      lastUserEditTimeRef.current = Date.now();
      setReadings((prev) => {
        const target = prev[idx];
        if (target?.time) {
          deletedTimesRef.current.add(normalizeTimeSlot(target.time));
        }
        return prev.filter((_, i) => i !== idx);
      });
      setExpandedSlots((prev) => {
        const next = new Set<number>();
        prev.forEach((val) => {
          if (val < idx) next.add(val);
          else if (val > idx) next.add(val - 1);
        });
        return next;
      });
    },
    [realtime]
  );

  const handleAddReading = useCallback(() => {
    realtime.markLocalEdit();
    hasUnsavedLocalEditsRef.current = true;
    lastUserEditTimeRef.current = Date.now();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setReadings((prev) => {
      const newIdx = prev.length;
      setExpandedSlots((old) => new Set([...old, newIdx]));
      return [
        ...prev,
        {
          time: timeStr,
          photoUrl: undefined,
          b1: "",
          b2: "",
          b3: "",
          b4: "",
          b5: "",
          b6: "",
          b7: "",
          screenChanger: "",
          ad1: "",
          ad2: "",
          meltPump: "",
          d1: "",
          d2: "",
          d3: "",
          d4: "",
          d5: "",
          d6: "",
          d7: "",
          meltTemp: "",
          h1: "",
          h2: "",
          hotAirTemp: "",
        },
      ];
    });
  }, [realtime]);

  const handleCopyPrevious = useCallback(
    (idx: number) => {
      if (idx <= 0) return;
      realtime.markLocalEdit();
      hasUnsavedLocalEditsRef.current = true;
      lastUserEditTimeRef.current = Date.now();
      setReadings((prevReadings) => {
        const prev = prevReadings[idx - 1];
        if (!prev) return prevReadings;
        const updated = [...prevReadings];
        updated[idx] = {
          ...prev,
          time: updated[idx]?.time || prev.time,
          photoUrl: undefined, // Do not copy photo across rows
          id: undefined,
        };
        return updated;
      });
      toast.success("Copied values from previous row");
    },
    [realtime]
  );

  // Row Lock Determination
  const isRowLocked = useCallback(
    (row: TemperatureReading, idx: number): boolean => {
      if (!row.time) return false;
      const lockedByDefault = isTimeSlotLocked(date, row.time, 120);
      if (!lockedByDefault) return false;
      // If supervisor explicitly unlocked this slot, allow editing
      const slotKey = `${row.time}-${idx}`;
      return !unlockedSlots.has(slotKey) && !unlockedSlots.has(row.time);
    },
    [date, unlockedSlots]
  );

  // Toggle supervisor unlock override (persisted in database for everyone)
  const handleToggleUnlock = async (row: TemperatureReading, idx: number) => {
    if (!canUnlock) {
      toast.error("Your role does not have permission to override or unlock expired time slots");
      return;
    }
    const slotKey = `${row.time}-${idx}`;
    const isCurrentlyUnlocked = unlockedSlots.has(slotKey) || unlockedSlots.has(row.time);

    try {
      if (isCurrentlyUnlocked) {
        const res = await fetch(
          `/api/production/telemetry/unlock?module=TAPE_PLANT_TEMPERATURE&date=${date}&shiftId=${shiftId}&timeSlot=${encodeURIComponent(row.time)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to re-lock time slot");

        const next = new Set(unlockedSlots);
        next.delete(slotKey);
        next.delete(row.time);
        setUnlockedSlots(next);
        toast.info(`Slot ${row.time || `#${idx + 1}`} re-locked`);
      } else {
        const res = await fetch("/api/production/telemetry/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module: "TAPE_PLANT_TEMPERATURE",
            date,
            shiftId,
            timeSlot: row.time,
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to unlock time slot");
        }

        const next = new Set(unlockedSlots);
        next.add(row.time);
        next.add(slotKey);
        setUnlockedSlots(next);
        toast.success(`Slot ${row.time || `#${idx + 1}`} unlocked for all operators`);
      }
    } catch (err) {
      console.error("Time slot toggle error:", err);
      toast.error(err instanceof Error ? err.message : "Operation failed");
    }
  };

  // Update photo for active row with immediate database persistence and cross-device sync
  const handleUpdateRowPhoto = async (idx: number, photoUrl: string | undefined) => {
    const updated = [...readings];
    updated[idx] = { ...updated[idx], photoUrl: photoUrl || undefined };
    setReadings(updated);

    if (!date || !shiftId) return;

    const deletedTimes = Array.from(deletedTimesRef.current);
    const payload = {
      date,
      shiftId,
      operatorName,
      operatorId,
      readings: updated,
      deletedTimes,
      clientId: realtime.clientId,
    };

    const serialized = serializeTemperaturePayload(date, shiftId, operatorName, operatorId, updated);
    lastSavedPayloadRef.current = serialized;
    hasUnsavedLocalEditsRef.current = false;
    deletedTimesRef.current.clear();

    try {
      const res = await fetch("/api/production/tape-plant/temperature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setLastAutoSavedAt(new Date());
        realtime.broadcastSync({ action: "PHOTO_UPDATE", date, shift: shiftId });
      }
    } catch (err) {
      console.error("Immediate photo save failed:", err);
    }
  };

  // Columns definition with Evidence Photo column
  const tempColumns: ColumnDef<TemperatureReading>[] = useMemo(
    () => [
      {
        key: "time",
        label: "Time",
        width: "90px",
        minWidth: 90,
        sticky: true,
        placeholder: "HH:MM",
      },

      // Photo Evidence Column
      {
        key: "photoUrl",
        label: "Photo",
        width: "80px",
        minWidth: 75,
        align: "center",
        render: (_val, row, idx) => {
          const hasPhoto = Boolean(row.photoUrl);
          const disabled = isRowLocked(row, idx);

          return (
            <button
              type="button"
              onClick={() => setPhotoModalRowIdx(idx)}
              className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                hasPhoto
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-xs"
                  : disabled
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-pointer"
                  : "bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary hover:bg-blue-50/40"
              }`}
              title={
                hasPhoto
                  ? "View / change evidence photo"
                  : disabled
                  ? "View photo evidence (Locked)"
                  : "Attach photo evidence (Upload or Camera)"
              }
            >
              {hasPhoto ? (
                <>
                  <ImageIcon className="h-3 w-3 text-emerald-600" />
                  <span>View</span>
                </>
              ) : (
                <>
                  <Camera className="h-3 w-3 text-slate-400" />
                  <span>+ Photo</span>
                </>
              )}
            </button>
          );
        },
      },

      // Barrel Zone
      {
        key: "b1",
        label: "B1",
        group: "Barrel Zone",
        groupColor: "bg-blue-100/90 text-blue-900 border-blue-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "b2",
        label: "B2",
        group: "Barrel Zone",
        groupColor: "bg-blue-100/90 text-blue-900 border-blue-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "b3",
        label: "B3",
        group: "Barrel Zone",
        groupColor: "bg-blue-100/90 text-blue-900 border-blue-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "b4",
        label: "B4",
        group: "Barrel Zone",
        groupColor: "bg-blue-100/90 text-blue-900 border-blue-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "b5",
        label: "B5",
        group: "Barrel Zone",
        groupColor: "bg-blue-100/90 text-blue-900 border-blue-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "b6",
        label: "B6",
        group: "Barrel Zone",
        groupColor: "bg-blue-100/90 text-blue-900 border-blue-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "b7",
        label: "B7",
        group: "Barrel Zone",
        groupColor: "bg-blue-100/90 text-blue-900 border-blue-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },

      // Adaptor
      {
        key: "screenChanger",
        label: "Screen Changer",
        group: "Adaptor",
        groupColor: "bg-indigo-100/90 text-indigo-900 border-indigo-200",
        width: "115px",
        minWidth: 105,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "ad1",
        label: "AD-1",
        group: "Adaptor",
        groupColor: "bg-indigo-100/90 text-indigo-900 border-indigo-200",
        width: "75px",
        minWidth: 70,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "ad2",
        label: "AD-2",
        group: "Adaptor",
        groupColor: "bg-indigo-100/90 text-indigo-900 border-indigo-200",
        width: "75px",
        minWidth: 70,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "meltPump",
        label: "Melt Pump",
        group: "Adaptor",
        groupColor: "bg-indigo-100/90 text-indigo-900 border-indigo-200",
        width: "95px",
        minWidth: 90,
        type: "number",
        align: "right",
        placeholder: "°C",
      },

      // Die Zone
      {
        key: "d1",
        label: "D-1",
        group: "Die Zone",
        groupColor: "bg-amber-100/90 text-amber-900 border-amber-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "d2",
        label: "D-2",
        group: "Die Zone",
        groupColor: "bg-amber-100/90 text-amber-900 border-amber-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "d3",
        label: "D-3",
        group: "Die Zone",
        groupColor: "bg-amber-100/90 text-amber-900 border-amber-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "d4",
        label: "D-4",
        group: "Die Zone",
        groupColor: "bg-amber-100/90 text-amber-900 border-amber-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "d5",
        label: "D-5",
        group: "Die Zone",
        groupColor: "bg-amber-100/90 text-amber-900 border-amber-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "d6",
        label: "D-6",
        group: "Die Zone",
        groupColor: "bg-amber-100/90 text-amber-900 border-amber-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "d7",
        label: "D-7",
        group: "Die Zone",
        groupColor: "bg-amber-100/90 text-amber-900 border-amber-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },

      // After D-7: Melt Temp
      {
        key: "meltTemp",
        label: "Melt Temp",
        width: "100px",
        minWidth: 95,
        type: "number",
        align: "right",
        placeholder: "°C",
      },

      // Housing Water Temp
      {
        key: "h1",
        label: "H1",
        group: "Housing Water Temp",
        groupColor: "bg-cyan-100/90 text-cyan-900 border-cyan-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "h2",
        label: "H2",
        group: "Housing Water Temp",
        groupColor: "bg-cyan-100/90 text-cyan-900 border-cyan-200",
        width: "68px",
        minWidth: 62,
        type: "number",
        align: "right",
        placeholder: "°C",
      },

      // Hot Air Temp
      {
        key: "hotAirTemp",
        label: "Hot Air Temp",
        width: "115px",
        minWidth: 105,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
    ],
    [isRowLocked]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200 shadow-xs">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Temperature Telemetry Log...</span>
      </div>
    );
  }

  const activePhotoReading =
    photoModalRowIdx !== null ? readings[photoModalRowIdx] : null;

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs min-w-0">
        {/* Desktop Header Left */}
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Thermometer className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">2. Process Temperature</h2>
            <p className="text-[11px] text-slate-500">Real-time zone temperatures & telemetry log</p>
          </div>
        </div>

        {/* Desktop Header Controls */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          <div className="flex-1 sm:flex-none min-w-[200px]">
            <OperatorSelect
              value={operatorName}
              operatorId={operatorId}
              onChange={(name, id) => {
                realtime.markLocalEdit();
                hasUnsavedLocalEditsRef.current = true;
                lastUserEditTimeRef.current = Date.now();
                setOperatorName(name);
                setOperatorId(id || "");
              }}
              section="TAPE_PLANT"
            />
          </div>

          {/* Desktop Auto-save Status Indicator */}
          <RealtimeSyncBadge
            isConnected={realtime.isConnected}
            lastUpdatedBy={realtime.lastUpdatedBy}
            lastUpdatedAt={realtime.lastUpdatedAt}
            lastAction={realtime.lastAction}
            isSelfUpdate={realtime.isSelfUpdate}
          />

          {autoSaving ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium rounded-lg h-8">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Auto-saving...</span>
            </div>
          ) : lastAutoSavedAt ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg h-8">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Auto-saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 h-8 cursor-pointer"
            title="Print / View Temperature Report"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Print</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Log
          </button>
        </div>

        {/* ── Mobile Streamlined Header (< sm) — No Redundant Heading ── */}
        <div className="sm:hidden space-y-2.5 w-full">
          {/* Row 1: Operator Selector */}
          <div className="w-full">
            <OperatorSelect
              value={operatorName}
              operatorId={operatorId}
              onChange={(name, id) => {
                realtime.markLocalEdit();
                hasUnsavedLocalEditsRef.current = true;
                lastUserEditTimeRef.current = Date.now();
                setOperatorName(name);
                setOperatorId(id || "");
              }}
              section="TAPE_PLANT"
            />
          </div>

          {/* Row 2: Auto-save status & Balanced Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div>
              {autoSaving ? (
                <span className="p-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs inline-flex items-center gap-1" title="Auto-saving...">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-[11px] font-medium text-slate-600">Saving...</span>
                </span>
              ) : lastAutoSavedAt ? (
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs inline-flex items-center gap-1" title="Auto-saved">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] font-medium text-emerald-700">Saved</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">Logged</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Print / View Report"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span>Print</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Toolbar (Expand All / Collapse All on < md) ── */}
      <div className="flex md:hidden items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-900">{readings.length}</span>
          <span>Time Slots Recorded</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExpandAll}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
          >
            Expand All
          </button>
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="text-xs text-slate-500 hover:underline font-medium cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── Mobile Readings Cards (< md) ── */}
      <div className="md:hidden space-y-3.5">
        {readings.map((row, idx) => {
          const isLocked = isRowLocked(row, idx);
          const lockedByDefault = isTimeSlotLocked(date, row.time, 120);
          const slotKey = `${row.time}-${idx}`;
          const isOverridden = unlockedSlots.has(slotKey) || unlockedSlots.has(row.time);
          const isExpanded = expandedSlots.has(idx);

          return (
            <div
              key={row.id || `temp-reading-${idx}`}
              id={`reading-slot-${idx}`}
              className={`bg-white rounded-xl border transition-all shadow-xs overflow-hidden ${
                isLocked ? "border-slate-200 bg-slate-50/40" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Card Header */}
              <div
                className="p-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-2 cursor-pointer select-none"
                onClick={() => toggleSlotExpanded(idx)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 tracking-tight">
                      {row.time || `Slot #${idx + 1}`}
                    </span>
                  </div>

                  {/* Lock badge */}
                  {isOverridden ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shrink-0">
                      <Unlock className="h-2.5 w-2.5 text-emerald-600" />
                      <span>Unlocked</span>
                    </span>
                  ) : isLocked ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-600 border border-slate-300 shrink-0">
                      <Lock className="h-2.5 w-2.5 text-slate-500" />
                      <span>Locked</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      <span>Active</span>
                    </span>
                  )}

                  {/* Photo Indicator */}
                  {row.photoUrl && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      <ImageIcon className="h-2.5 w-2.5 text-emerald-600" />
                      <span>Photo</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Quick Duplicate button */}
                  {idx > 0 && !isLocked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyPrevious(idx);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded transition-colors"
                      title="Copy from previous slot"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Expand / Collapse Chevron */}
                  <div className="p-1 text-slate-400">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              {isExpanded && (
                <div className="p-3.5 space-y-3.5 bg-white">
                  {/* Slot Controls (Time Edit, Evidence Photo, Lock/Unlock, Delete) */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-slate-600">Time:</label>
                      {isLocked ? (
                        <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {row.time || "—"}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={row.time}
                          onFocus={() => {
                            activeFocusedCellRef.current = { time: row.time || "", field: "time" };
                          }}
                          onBlur={() => {
                            activeFocusedCellRef.current = null;
                          }}
                          onChange={(e) => handleFieldChange(idx, "time", e.target.value, false)}
                          placeholder="HH:MM"
                          className="text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1 w-20 text-center focus:ring-1 focus:ring-primary"
                        />
                      )}
                    </div>

                    {/* Photo Evidence Button */}
                    <button
                      type="button"
                      onClick={() => setPhotoModalRowIdx(idx)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                        row.photoUrl
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                          : isLocked
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-pointer"
                          : "bg-white text-slate-700 border-slate-300 hover:border-primary hover:text-primary hover:bg-blue-50/40"
                      }`}
                    >
                      {row.photoUrl ? (
                        <>
                          <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Photo Attached</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-3.5 w-3.5 text-slate-400" />
                          <span>+ Photo Evidence</span>
                        </>
                      )}
                    </button>

                    {/* Supervisor Unlock toggle (if canUnlock and lockedByDefault) */}
                    {lockedByDefault && canUnlock && (
                      <button
                        type="button"
                        onClick={() => handleToggleUnlock(row, idx)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all ${
                          isOverridden
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                            : "bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 shadow-2xs"
                        }`}
                      >
                        {isOverridden ? (
                          <>
                            <Unlock className="h-3 w-3 text-emerald-600" />
                            <span>Re-lock</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 text-amber-600" />
                            <span>Unlock Slot</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Delete Reading */}
                    <button
                      type="button"
                      onClick={() => handleDeleteReading(idx)}
                      disabled={isLocked}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                      title="Delete Reading Slot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Auto-lock notice banner */}
                  {isLocked && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>Slot locked (&gt;2h expired). {canUnlock ? "Tap 'Unlock Slot' to edit." : "Contact supervisor to unlock."}</span>
                    </div>
                  )}

                  {/* Photo Evidence Preview Card (if attached) */}
                  {row.photoUrl && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.photoUrl}
                          alt="Evidence"
                          className="w-10 h-10 object-cover rounded-md border border-emerald-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-emerald-900 block truncate">Evidence Photo Attached</span>
                          <span className="text-[10px] text-emerald-700">Tap view/edit to inspect or update</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPhotoModalRowIdx(idx)}
                        className="text-xs font-bold text-emerald-800 hover:underline px-2 py-1 shrink-0"
                      >
                        View / Edit
                      </button>
                    </div>
                  )}

                  {/* Group 1: Barrel Zones (B1 - B7) */}
                  <div className="rounded-xl border border-blue-200/80 bg-blue-50/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-xs font-bold text-blue-900 tracking-tight">Barrel Zones</span>
                      </div>
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded border border-blue-200">
                        °C
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: "b1", label: "B1" },
                        { key: "b2", label: "B2" },
                        { key: "b3", label: "B3" },
                        { key: "b4", label: "B4" },
                        { key: "b5", label: "B5" },
                        { key: "b6", label: "B6" },
                        { key: "b7", label: "B7" },
                      ].map((item) => (
                        <div key={item.key} className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase text-center">
                            {item.label}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={row[item.key as keyof TemperatureReading] ?? ""}
                            onFocus={() => {
                              activeFocusedCellRef.current = { time: row.time || "", field: item.key };
                            }}
                            onBlur={() => {
                              activeFocusedCellRef.current = null;
                            }}
                            onChange={(e) => handleFieldChange(idx, item.key as keyof TemperatureReading, e.target.value)}
                            disabled={isLocked}
                            placeholder="°C"
                            className={`w-full text-center text-xs font-bold py-1.5 px-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                              isLocked
                                ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                                : "bg-white text-slate-900 border-slate-300 shadow-2xs"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Group 2: Adaptor & Melt Pump */}
                  <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-xs font-bold text-indigo-900 tracking-tight">Adaptor & Melt Pump</span>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded border border-indigo-200">
                        °C
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "screenChanger", label: "Screen Changer" },
                        { key: "meltPump", label: "Melt Pump" },
                        { key: "ad1", label: "AD-1" },
                        { key: "ad2", label: "AD-2" },
                      ].map((item) => (
                        <div key={item.key} className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 text-center truncate">
                            {item.label}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={row[item.key as keyof TemperatureReading] ?? ""}
                            onFocus={() => {
                              activeFocusedCellRef.current = { time: row.time || "", field: item.key };
                            }}
                            onBlur={() => {
                              activeFocusedCellRef.current = null;
                            }}
                            onChange={(e) => handleFieldChange(idx, item.key as keyof TemperatureReading, e.target.value)}
                            disabled={isLocked}
                            placeholder="°C"
                            className={`w-full text-center text-xs font-bold py-1.5 px-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                              isLocked
                                ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                                : "bg-white text-slate-900 border-slate-300 shadow-2xs"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Group 3: Die Zone & Melt Temp */}
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-xs font-bold text-amber-900 tracking-tight">Die Zones & Melt Temp</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200">
                        °C
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { key: "d1", label: "D1" },
                        { key: "d2", label: "D2" },
                        { key: "d3", label: "D3" },
                        { key: "d4", label: "D4" },
                        { key: "d5", label: "D5" },
                        { key: "d6", label: "D6" },
                        { key: "d7", label: "D7" },
                        { key: "meltTemp", label: "Melt T." },
                      ].map((item) => (
                        <div key={item.key} className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase text-center truncate">
                            {item.label}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={row[item.key as keyof TemperatureReading] ?? ""}
                            onFocus={() => {
                              activeFocusedCellRef.current = { time: row.time || "", field: item.key };
                            }}
                            onBlur={() => {
                              activeFocusedCellRef.current = null;
                            }}
                            onChange={(e) => handleFieldChange(idx, item.key as keyof TemperatureReading, e.target.value)}
                            disabled={isLocked}
                            placeholder="°C"
                            className={`w-full text-center text-xs font-bold py-1.5 px-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                              isLocked
                                ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                                : "bg-white text-slate-900 border-slate-300 shadow-2xs"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Group 4: Housing Water & Hot Air */}
                  <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                        <span className="text-xs font-bold text-cyan-900 tracking-tight">Cooling Water & Hot Air</span>
                      </div>
                      <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-100/70 px-1.5 py-0.5 rounded border border-cyan-200">
                        °C
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "h1", label: "H1 Water" },
                        { key: "h2", label: "H2 Water" },
                        { key: "hotAirTemp", label: "Hot Air" },
                      ].map((item) => (
                        <div key={item.key} className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 text-center truncate">
                            {item.label}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={row[item.key as keyof TemperatureReading] ?? ""}
                            onFocus={() => {
                              activeFocusedCellRef.current = { time: row.time || "", field: item.key };
                            }}
                            onBlur={() => {
                              activeFocusedCellRef.current = null;
                            }}
                            onChange={(e) => handleFieldChange(idx, item.key as keyof TemperatureReading, e.target.value)}
                            disabled={isLocked}
                            placeholder="°C"
                            className={`w-full text-center text-xs font-bold py-1.5 px-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                              isLocked
                                ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                                : "bg-white text-slate-900 border-slate-300 shadow-2xs"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Mobile Add New Reading Slot Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleAddReading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 text-primary border-2 border-dashed border-primary/30 hover:border-primary font-bold text-xs rounded-xl shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Reading Slot</span>
          </button>
        </div>
      </div>

      {/* ── Desktop View (Spreadsheet Table 100% Intact & Untouched on md+) ── */}
      <div className="hidden md:block">
        <SpreadsheetTable<TemperatureReading>
          title="Extruder & Die Zone Temperature Spreadsheet"
          columns={tempColumns}
          data={readings}
          onChange={(newReadings) => {
            realtime.markLocalEdit();
            hasUnsavedLocalEditsRef.current = true;
            lastUserEditTimeRef.current = Date.now();
            setReadings(newReadings);
          }}
          onCellFocus={(rowIndex, columnKey) => {
            activeFocusedCellRef.current = {
              time: readings[rowIndex]?.time || "",
              field: columnKey,
            };
          }}
          onCellBlur={() => {
            activeFocusedCellRef.current = null;
          }}
          allowAddRow={true}
          onAddRow={handleAddReading}
          allowDeleteRow={true}
          onDeleteRow={handleDeleteReading}
          allowCopyRow={true}
          onCopyPrevious={handleCopyPrevious}
          isRowDisabled={isRowLocked}
          renderRowBadge={(row, idx) => {
            const isLocked = isRowLocked(row, idx);
            const isOverridden = isTimeSlotLocked(date, row.time, 120) && !isLocked;

            if (isOverridden) {
              return (
                <span
                  className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-300"
                  title="Slot Unlocked Globally for All Operators"
                >
                  <Unlock className="h-2.5 w-2.5 text-emerald-600" />
                  <span>#{idx + 1}</span>
                </span>
              );
            }

            if (isLocked) {
              return (
                <span
                  className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-bold bg-slate-200 text-slate-600 rounded border border-slate-300"
                  title="Auto-Locked: Entry window expired (>2h)"
                >
                  <Lock className="h-2.5 w-2.5 text-slate-500" />
                  <span>#{idx + 1}</span>
                </span>
              );
            }

            return <span>{idx + 1}</span>;
          }}
          rowActions={(row, idx) => {
            const lockedByDefault = isTimeSlotLocked(date, row.time, 120);
            if (!lockedByDefault) return null;

            const slotKey = `${row.time}-${idx}`;
            const isOverridden = unlockedSlots.has(slotKey) || unlockedSlots.has(row.time);

            if (!canUnlock) {
              return (
                <div
                  title={
                    isOverridden
                      ? "Unlocked by Supervisor: Open for all operators to enter readings"
                      : "Auto-Locked: Window expired. Contact supervisor to unlock."
                  }
                  className="p-1 cursor-default"
                >
                  {isOverridden ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <Unlock className="h-2.5 w-2.5 text-emerald-600" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <Lock className="h-3 w-3 text-slate-400" />
                  )}
                </div>
              );
            }

            return (
              <button
                type="button"
                onClick={() => handleToggleUnlock(row, idx)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  isOverridden
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 shadow-2xs"
                }`}
                title={
                  isOverridden
                    ? "Unlocked for all operators. Click to re-lock this slot."
                    : "Click to unlock this expired slot globally for all operators"
                }
              >
                {isOverridden ? (
                  <>
                    <Unlock className="h-3 w-3 text-emerald-600" />
                    <span>Unlocked</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 text-slate-500" />
                    <span>Unlock</span>
                  </>
                )}
              </button>
            );
          }}
        />
      </div>

      {/* Photo Evidence Modal */}
      {photoModalRowIdx !== null && activePhotoReading && (
        <PhotoEvidenceModal
          isOpen={true}
          onClose={() => setPhotoModalRowIdx(null)}
          title={`Evidence Photo — ${activePhotoReading.time || `Row #${photoModalRowIdx + 1}`} (${date})`}
          timeSlot={activePhotoReading.time}
          currentPhotoUrl={activePhotoReading.photoUrl}
          allowUpload={canUploadPhoto}
          allowCapture={canCapturePhoto}
          disabled={isRowLocked(activePhotoReading, photoModalRowIdx)}
          onSavePhoto={(url) => {
            handleUpdateRowPhoto(photoModalRowIdx, url);
            setPhotoModalRowIdx(null);
            toast.success(`Photo attached to ${activePhotoReading.time || `row #${photoModalRowIdx + 1}`}`);
          }}
          onRemovePhoto={() => {
            handleUpdateRowPhoto(photoModalRowIdx, undefined);
            setPhotoModalRowIdx(null);
            toast.info("Photo removed");
          }}
        />
      )}

      {/* Temperature Print Preview Modal */}
      <TemperaturePrintPreviewModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        date={date}
        shiftName={shiftName}
        operatorName={operatorName}
        status="SAVED"
        readings={readings}
      />
    </div>
  );
}
