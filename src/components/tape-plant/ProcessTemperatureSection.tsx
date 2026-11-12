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
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  Sparkles,
} from "lucide-react";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";
import { OperatorSelect } from "./OperatorSelect";
import { PhotoEvidenceModal } from "./PhotoEvidenceModal";
import { useProductionShifts } from "@/hooks/useProductionShifts";
import {
  generateShiftTimeSlots,
  isTimeSlotLocked,
  canUserOverrideLock,
} from "@/lib/tape-plant/telemetry-time-slots";

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
  const [operatorName, setOperatorName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [readings, setReadings] = useState<TemperatureReading[]>([]);

  // Shift Master integration
  const { shifts, allowDayNight } = useProductionShifts();
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
  const [userRole, setUserRole] = useState<string>("");
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
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

  // Fetch data on date / shift change
  useEffect(() => {
    if (!date || !shiftId) return;
    isInitialLoadedRef.current = false;
    setLoading(true);
    // Reset supervisor unlocks on shift/date change
    setUnlockedSlots(new Set());

    fetch(`/api/production/tape-plant/temperature?date=${date}&shiftId=${shiftId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (data && data.length > 0) {
          const opName = data[0]?.operatorName || "";
          const opId = data[0]?.operatorId || "";
          setOperatorName(opName);
          setOperatorId(opId);
          const mapped: TemperatureReading[] = data.map((d) => ({
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
          }));
          setReadings(mapped);
          lastSavedPayloadRef.current = JSON.stringify({
            date,
            shiftId,
            operatorName: opName,
            operatorId: opId,
            readings: mapped,
          });
        } else {
          setOperatorName("");
          setOperatorId("");
          // Initialize with dynamically derived shift intervals
          const initial: TemperatureReading[] = shiftIntervals.map((time) => ({
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
          }));
          setReadings(initial);
          lastSavedPayloadRef.current = JSON.stringify({
            date,
            shiftId,
            operatorName: "",
            operatorId: "",
            readings: initial,
          });
        }
      })
      .catch(() => toast.error("Failed to load temperature readings"))
      .finally(() => {
        setLoading(false);
        isInitialLoadedRef.current = true;
      });
  }, [date, shiftId, shiftIntervals]);

  // Debounced Auto-Save
  useEffect(() => {
    if (!isInitialLoadedRef.current || !date || !shiftId) return;

    const hasData = readings.some((r) => r.time && r.time.trim() !== "");
    if (!hasData) return;

    const payload = {
      date,
      shiftId,
      operatorName,
      operatorId,
      readings,
    };

    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedPayloadRef.current) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const res = await fetch("/api/production/tape-plant/temperature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        });
        if (res.ok) {
          lastSavedPayloadRef.current = serialized;
          setLastAutoSavedAt(new Date());
        }
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setAutoSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [readings, operatorName, operatorId, date, shiftId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date,
        shiftId,
        operatorName,
        operatorId,
        readings,
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

      lastSavedPayloadRef.current = JSON.stringify(payload);
      setLastAutoSavedAt(new Date());
      toast.success("Process temperature readings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save readings");
    } finally {
      setSaving(false);
    }
  };

  // Auto-expand all reading slots on initial load
  useEffect(() => {
    if (readings.length > 0 && expandedSlots.size === 0) {
      setExpandedSlots(new Set(readings.map((_, i) => i)));
    }
  }, [readings.length]);

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

  const handleFieldChange = (
    idx: number,
    field: keyof TemperatureReading,
    rawVal: string,
    isNumber = true
  ) => {
    const val = isNumber && rawVal !== "" ? (isNaN(Number(rawVal)) ? rawVal : Number(rawVal)) : rawVal;
    setReadings((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleDeleteReading = (idx: number) => {
    setReadings((prev) => prev.filter((_, i) => i !== idx));
    setExpandedSlots((prev) => {
      const next = new Set<number>();
      prev.forEach((val) => {
        if (val < idx) next.add(val);
        else if (val > idx) next.add(val - 1);
      });
      return next;
    });
  };

  const handleAddReading = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newIdx = readings.length;
    setReadings([
      ...readings,
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
    ]);
    setExpandedSlots((prev) => new Set([...prev, newIdx]));
  };

  const handleCopyPrevious = (idx: number) => {
    if (idx <= 0) return;
    const prev = readings[idx - 1];
    const updated = [...readings];
    updated[idx] = {
      ...prev,
      time: updated[idx].time || prev.time,
      photoUrl: undefined, // Do not copy photo across rows
      id: undefined,
    };
    setReadings(updated);
    toast.success("Copied values from previous row");
  };

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
    } catch (err: any) {
      console.error("Time slot toggle error:", err);
      toast.error(err.message || "Operation failed");
    }
  };

  // Update photo for active row
  const handleUpdateRowPhoto = (idx: number, photoUrl: string | undefined) => {
    const updated = [...readings];
    updated[idx] = { ...updated[idx], photoUrl };
    setReadings(updated);
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
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Thermometer className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">2. Process Temperature</h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">Real-time zone temperatures & telemetry log</p>
            </div>
          </div>

          {/* Mobile Save Button on Header */}
          <div className="sm:hidden flex items-center gap-1.5">
            {autoSaving ? (
              <span className="p-1.5 bg-slate-100 text-slate-500 rounded-lg" title="Auto-saving...">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              </span>
            ) : lastAutoSavedAt ? (
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg" title="Auto-saved">
                <CheckCircle className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Save</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          <div className="flex-1 sm:flex-none min-w-[200px]">
            <OperatorSelect
              value={operatorName}
              operatorId={operatorId}
              onChange={(name, id) => {
                setOperatorName(name);
                setOperatorId(id || "");
              }}
              section="TAPE_PLANT"
            />
          </div>

          {/* Desktop Auto-save Status Indicator */}
          <div className="hidden sm:inline-flex">
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
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Log
          </button>
        </div>
      </div>

      {/* ── Mobile Toolbar (Quick navigation & slot actions on < md) ── */}
      <div className="flex md:hidden flex-col gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900">{readings.length}</span>
            <span>Time Slots Recorded</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Expand All
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-xs text-slate-500 hover:underline font-medium"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Horizontal Quick-Jump Chips */}
        {readings.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
            {readings.map((r, i) => {
              const isLocked = isRowLocked(r, i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setExpandedSlots((prev) => new Set([...prev, i]));
                    const el = document.getElementById(`reading-slot-${i}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border transition-all ${
                    isLocked
                      ? "bg-slate-100 text-slate-500 border-slate-200"
                      : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  {isLocked ? <Lock className="h-2.5 w-2.5 text-slate-400" /> : <Clock className="h-2.5 w-2.5 text-amber-600" />}
                  <span>{r.time || `#${i + 1}`}</span>
                  {r.photoUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </button>
              );
            })}
          </div>
        )}
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
          onChange={setReadings}
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
    </div>
  );
}
