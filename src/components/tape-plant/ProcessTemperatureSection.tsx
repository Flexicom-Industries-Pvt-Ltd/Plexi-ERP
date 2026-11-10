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
  AlertCircle,
  ShieldAlert,
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
  const isSupervisor = useMemo(() => {
    return canUserOverrideLock(userRole, userPermissions);
  }, [userRole, userPermissions]);

  // Set of unlocked time slots (supervisor manual override)
  const [unlockedSlots, setUnlockedSlots] = useState<Set<string>>(new Set());

  // Photo Evidence Modal state
  const [photoModalRowIdx, setPhotoModalRowIdx] = useState<number | null>(null);

  // Fetch current user session to determine role & permissions (live check)
  const refreshUserPermissions = useCallback(() => {
    fetch("/api/auth/session", { cache: "no-store", headers: { Pragma: "no-cache", "Cache-Control": "no-cache" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (!session?.user) return;
        const roleName = session.user.role || "";
        setUserRole(roleName);
        setUserPermissions(session.user.permissions || []);
        const roleUpper = roleName.toUpperCase().replace(/[\s_-]+/g, "");
        const isSuperAdmin =
          roleName === "SUPER ADMIN" ||
          roleUpper === "SUPERADMIN" ||
          roleUpper.includes("ADMIN");
        setCanUploadPhoto(isSuperAdmin ? true : Boolean(session.user.canUploadPhoto));
        setCanCapturePhoto(isSuperAdmin ? true : session.user.canCapturePhoto ?? true);
      })
      .catch((err) => {
        console.warn("Could not determine user session for RBAC:", err);
      });
  }, []);

  useEffect(() => {
    refreshUserPermissions();
  }, [refreshUserPermissions]);

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

  const handleAddReading = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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

  // Toggle supervisor unlock override
  const handleToggleUnlock = (row: TemperatureReading, idx: number) => {
    if (!isSupervisor) {
      toast.error("Supervisor or Admin credentials required to unlock expired slots");
      return;
    }
    const slotKey = `${row.time}-${idx}`;
    const next = new Set(unlockedSlots);
    if (next.has(slotKey) || next.has(row.time)) {
      next.delete(slotKey);
      next.delete(row.time);
      toast.info(`Slot ${row.time || `#${idx + 1}`} locked`);
    } else {
      next.add(slotKey);
      toast.success(`Supervisor override: Slot ${row.time || `#${idx + 1}`} unlocked for edits`);
    }
    setUnlockedSlots(next);
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-w-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Thermometer className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">2. Process Temperature</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                Shift Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Extruder barrel, adaptor, and die zone telemetry aligned with {shiftName} ({date}). Auto-locks after 2h window expiry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <OperatorSelect
            value={operatorName}
            operatorId={operatorId}
            onChange={(name, id) => {
              setOperatorName(name);
              setOperatorId(id || "");
            }}
            section="TAPE_PLANT"
          />

          {/* Auto-save Status Indicator */}
          {autoSaving ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium rounded-lg h-8">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="hidden sm:inline">Auto-saving...</span>
            </div>
          ) : lastAutoSavedAt ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg h-8">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">
                Auto-saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          ) : null}

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
      </div>

      {/* Telemetry Status / Policy Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/90 border border-slate-200/80 rounded-lg text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
          <span>
            <strong>Policy:</strong> Hourly/bi-hourly readings auto-lock 120 minutes past window start. Supervisors can click the lock icon to unlock expired rows.
          </span>
        </div>
        {isSupervisor && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-[11px] font-medium">
            <Unlock className="h-3 w-3" />
            <span>Supervisor Override Active</span>
          </div>
        )}
      </div>

      {/* Spreadsheet Table with Lock and Evidence integration */}
      <SpreadsheetTable<TemperatureReading>
        title="Extruder & Die Zone Temperature Spreadsheet"
        subtitle={`Scheduled interval logging for ${shiftName}. Attach photo evidence per reading row.`}
        columns={tempColumns}
        data={readings}
        onChange={setReadings}
        allowAddRow={true}
        onAddRow={handleAddReading}
        allowDeleteRow={true}
        onDeleteRow={(idx) => setReadings(readings.filter((_, i) => i !== idx))}
        allowCopyRow={true}
        onCopyPrevious={handleCopyPrevious}
        isRowDisabled={isRowLocked}
        renderRowBadge={(row, idx) => {
          const isLocked = isRowLocked(row, idx);
          const isOverridden = isTimeSlotLocked(date, row.time, 120) && !isLocked;

          if (isOverridden) {
            return (
              <span
                className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-300"
                title="Unlocked by Supervisor"
              >
                <Unlock className="h-2.5 w-2.5" />
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

          if (!isSupervisor) {
            return (
              <div
                title="Auto-Locked: Window expired. Contact supervisor to unlock."
                className="p-1 text-slate-400 cursor-not-allowed"
              >
                <Lock className="h-3 w-3" />
              </div>
            );
          }

          return (
            <button
              type="button"
              onClick={() => handleToggleUnlock(row, idx)}
              className={`p-1 rounded transition-colors ${
                isOverridden
                  ? "text-amber-600 hover:bg-amber-100"
                  : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
              title={
                isOverridden
                  ? "Supervisor Override Active: Click to re-lock this slot"
                  : "Click to unlock this expired slot (Supervisor Override)"
              }
            >
              {isOverridden ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            </button>
          );
        }}
      />

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
