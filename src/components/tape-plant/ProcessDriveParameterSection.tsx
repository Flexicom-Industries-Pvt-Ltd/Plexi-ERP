"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Gauge,
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
  Printer,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";
import { OperatorSelect } from "./OperatorSelect";
import { PhotoEvidenceModal } from "./PhotoEvidenceModal";
import { useProductionShifts } from "@/hooks/useProductionShifts";
import {
  generateShiftTimeSlots,
  isTimeSlotLocked,
  canUserOverrideLock,
} from "@/lib/tape-plant/telemetry-time-slots";

const DriveParameterPrintPreviewModal = dynamic(
  () => import("./DriveParameterPrintPreviewModal").then((m) => m.DriveParameterPrintPreviewModal),
  { ssr: false }
);

export interface DriveParameterReading {
  id?: string;
  time: string;
  photoUrl?: string;
  operatorName?: string;
  operatorId?: string;
  extruderRpm: number | string;
  meltPumpRpm: number | string;
  takeUpMpm: number | string;
  nipRollMpm: number | string;
  isuMpm: number | string;
  pauMpm: number | string;
  stretchingMpm: number | string;
  annealingMpm: number | string;
  stretchingRatio: number | string;
  meltPressureP1: number | string;
  meltPressureP2: number | string;
  meltPressureP3: number | string;
  waterBath: number | string;
  colour: string;
  denier: number | string;
  tapeWidth: number | string;
  strength: number | string;
  eloPercent: number | string;
  spacerWidth: number | string;
  numberOfTape: number | string;
}

interface ProcessDriveParameterSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function ProcessDriveParameterSection({
  date,
  shiftId,
  shiftName,
}: ProcessDriveParameterSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const isInitialLoadedRef = useRef(false);
  const lastSavedPayloadRef = useRef("");
  const [operatorName, setOperatorName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [records, setRecords] = useState<DriveParameterReading[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());

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
    fetch(`/api/production/telemetry/unlock?module=TAPE_PLANT_DRIVE&date=${date}&shiftId=${shiftId}`, {
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

    fetch(`/api/production/tape-plant/drive-parameters?date=${date}&shiftId=${shiftId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (data && data.length > 0) {
          const opName = data[0]?.operatorName || "";
          const opId = data[0]?.operatorId || "";
          setOperatorName(opName);
          setOperatorId(opId);
          const mapped: DriveParameterReading[] = data.map((d) => ({
            id: d.id,
            time: d.time || "",
            photoUrl: d.photoUrl || undefined,
            operatorName: d.operatorName || opName,
            operatorId: d.operatorId || opId,
            extruderRpm: d.extruderRpm ?? "",
            meltPumpRpm: d.meltPumpRpm ?? "",
            takeUpMpm: d.takeUpMpm ?? "",
            nipRollMpm: d.nipRollMpm ?? "",
            isuMpm: d.isuMpm ?? "",
            pauMpm: d.pauMpm ?? "",
            stretchingMpm: d.stretchingMpm ?? "",
            annealingMpm: d.annealingMpm ?? "",
            stretchingRatio: d.stretchingRatio ?? "",
            meltPressureP1: d.meltPressureP1 ?? "",
            meltPressureP2: d.meltPressureP2 ?? "",
            meltPressureP3: d.meltPressureP3 ?? "",
            waterBath: d.waterBath ?? "",
            colour: d.colour ?? "",
            denier: d.denier ?? "",
            tapeWidth: d.tapeWidth ?? "",
            strength: d.strength ?? "",
            eloPercent: d.eloPercent ?? "",
            spacerWidth: d.spacerWidth ?? "",
            numberOfTape: d.numberOfTape ?? "",
          }));
          setRecords(mapped);
          lastSavedPayloadRef.current = JSON.stringify({
            date,
            shiftId,
            operatorName: opName,
            operatorId: opId,
            records: mapped,
          });
        } else {
          setOperatorName("");
          setOperatorId("");
          // Initialize with dynamically derived shift intervals
          const initial: DriveParameterReading[] = shiftIntervals.map((time) => ({
            time,
            photoUrl: undefined,
            extruderRpm: "",
            meltPumpRpm: "",
            takeUpMpm: "",
            nipRollMpm: "",
            isuMpm: "",
            pauMpm: "",
            stretchingMpm: "",
            annealingMpm: "",
            stretchingRatio: "",
            meltPressureP1: "",
            meltPressureP2: "",
            meltPressureP3: "",
            waterBath: "",
            colour: "",
            denier: "",
            tapeWidth: "",
            strength: "",
            eloPercent: "",
            spacerWidth: "",
            numberOfTape: "",
          }));
          setRecords(initial);
          lastSavedPayloadRef.current = JSON.stringify({
            date,
            shiftId,
            operatorName: "",
            operatorId: "",
            records: initial,
          });
        }
      })
      .catch(() => toast.error("Failed to load drive parameters"))
      .finally(() => {
        setLoading(false);
        isInitialLoadedRef.current = true;
      });
  }, [date, shiftId, shiftIntervals]);

  // Debounced Auto-Save
  useEffect(() => {
    if (!isInitialLoadedRef.current || !date || !shiftId) return;

    const hasData = records.some((r) => r.time && r.time.trim() !== "");
    if (!hasData) return;

    const payload = {
      date,
      shiftId,
      operatorName,
      operatorId,
      records,
    };

    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedPayloadRef.current) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const res = await fetch("/api/production/tape-plant/drive-parameters", {
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
  }, [records, operatorName, operatorId, date, shiftId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date,
        shiftId,
        operatorName,
        operatorId,
        records,
      };

      const res = await fetch("/api/production/tape-plant/drive-parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save drive parameters");
      }

      lastSavedPayloadRef.current = JSON.stringify(payload);
      setLastAutoSavedAt(new Date());
      toast.success("Process drive parameters saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save parameters");
    } finally {
      setSaving(false);
    }
  };

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
    setExpandedSlots(new Set(records.map((_, i) => i)));
  };

  const handleCollapseAll = () => {
    setExpandedSlots(new Set());
  };

  const handleFieldChange = (
    idx: number,
    field: keyof DriveParameterReading,
    rawVal: string,
    isNumber = true
  ) => {
    const val = isNumber && rawVal !== "" ? (isNaN(Number(rawVal)) ? rawVal : Number(rawVal)) : rawVal;
    setRecords((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleDeleteReading = (idx: number) => {
    setRecords((prev) => prev.filter((_, i) => i !== idx));
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
    const newIdx = records.length;
    setRecords([
      ...records,
      {
        time: timeStr,
        photoUrl: undefined,
        extruderRpm: "",
        meltPumpRpm: "",
        takeUpMpm: "",
        nipRollMpm: "",
        isuMpm: "",
        pauMpm: "",
        stretchingMpm: "",
        annealingMpm: "",
        stretchingRatio: "",
        meltPressureP1: "",
        meltPressureP2: "",
        meltPressureP3: "",
        waterBath: "",
        colour: "",
        denier: "",
        tapeWidth: "",
        strength: "",
        eloPercent: "",
        spacerWidth: "",
        numberOfTape: "",
      },
    ]);
    setExpandedSlots((prev) => new Set([...prev, newIdx]));
  };

  const handleCopyPrevious = (idx: number) => {
    if (idx <= 0) return;
    const prev = records[idx - 1];
    const updated = [...records];
    updated[idx] = {
      ...prev,
      time: updated[idx].time || prev.time,
      photoUrl: undefined, // Do not copy photo across rows
      id: undefined,
    };
    setRecords(updated);
    toast.success("Copied parameters from previous row");
  };

  // Row Lock Determination
  const isRowLocked = useCallback(
    (row: DriveParameterReading, idx: number): boolean => {
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
  const handleToggleUnlock = async (row: DriveParameterReading, idx: number) => {
    if (!canUnlock) {
      toast.error("Your role does not have permission to override or unlock expired time slots");
      return;
    }
    const slotKey = `${row.time}-${idx}`;
    const isCurrentlyUnlocked = unlockedSlots.has(slotKey) || unlockedSlots.has(row.time);

    try {
      if (isCurrentlyUnlocked) {
        const res = await fetch(
          `/api/production/telemetry/unlock?module=TAPE_PLANT_DRIVE&date=${date}&shiftId=${shiftId}&timeSlot=${encodeURIComponent(row.time)}`,
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
            module: "TAPE_PLANT_DRIVE",
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
    const updated = [...records];
    updated[idx] = { ...updated[idx], photoUrl };
    setRecords(updated);
  };

  // Columns definition for Desktop Spreadsheet
  const driveColumns: ColumnDef<DriveParameterReading>[] = useMemo(
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

      {
        key: "extruderRpm",
        label: "Extruder RPM",
        width: "100px",
        minWidth: 95,
        type: "number",
        align: "right",
        placeholder: "RPM",
      },
      {
        key: "meltPumpRpm",
        label: "Melt Pump RPM",
        width: "110px",
        minWidth: 105,
        type: "number",
        align: "right",
        placeholder: "RPM",
      },
      {
        key: "takeUpMpm",
        label: "Take-up MPM",
        width: "105px",
        minWidth: 100,
        type: "number",
        align: "right",
        placeholder: "MPM",
      },
      {
        key: "nipRollMpm",
        label: "Nip Roll MPM",
        width: "105px",
        minWidth: 100,
        type: "number",
        align: "right",
        placeholder: "MPM",
      },
      {
        key: "isuMpm",
        label: "ISU MPM",
        width: "90px",
        minWidth: 85,
        type: "number",
        align: "right",
        placeholder: "MPM",
      },
      {
        key: "pauMpm",
        label: "P.A.U MPM",
        width: "95px",
        minWidth: 90,
        type: "number",
        align: "right",
        placeholder: "MPM",
      },
      {
        key: "stretchingMpm",
        label: "Stretching MPM",
        width: "115px",
        minWidth: 110,
        type: "number",
        align: "right",
        placeholder: "MPM",
      },
      {
        key: "annealingMpm",
        label: "Annealing MPM",
        width: "115px",
        minWidth: 110,
        type: "number",
        align: "right",
        placeholder: "MPM",
      },
      {
        key: "stretchingRatio",
        label: "Stretch Ratio",
        width: "100px",
        minWidth: 95,
        type: "number",
        align: "right",
        placeholder: "Ratio",
      },
      {
        key: "meltPressureP1",
        label: "Pressure P1",
        width: "95px",
        minWidth: 90,
        type: "number",
        align: "right",
        placeholder: "bar",
      },
      {
        key: "meltPressureP2",
        label: "Pressure P2",
        width: "95px",
        minWidth: 90,
        type: "number",
        align: "right",
        placeholder: "bar",
      },
      {
        key: "meltPressureP3",
        label: "Pressure P3",
        width: "95px",
        minWidth: 90,
        type: "number",
        align: "right",
        placeholder: "bar",
      },
      {
        key: "waterBath",
        label: "Water Bath",
        width: "95px",
        minWidth: 90,
        type: "number",
        align: "right",
        placeholder: "°C",
      },
      {
        key: "colour",
        label: "Colour",
        width: "110px",
        minWidth: 100,
        placeholder: "Color",
      },
      {
        key: "denier",
        label: "Denier",
        width: "80px",
        minWidth: 75,
        type: "number",
        align: "right",
        placeholder: "D",
      },
      {
        key: "tapeWidth",
        label: "Tape Width",
        width: "95px",
        minWidth: 90,
        type: "number",
        align: "right",
        placeholder: "mm",
      },
      {
        key: "strength",
        label: "Strength",
        width: "85px",
        minWidth: 80,
        type: "number",
        align: "right",
        placeholder: "gpd",
      },
      {
        key: "eloPercent",
        label: "ELO %",
        width: "80px",
        minWidth: 75,
        type: "number",
        align: "right",
        placeholder: "%",
      },
      {
        key: "spacerWidth",
        label: "Spacer Width",
        width: "100px",
        minWidth: 95,
        type: "number",
        align: "right",
        placeholder: "mm",
      },
      {
        key: "numberOfTape",
        label: "No. of Tapes",
        width: "95px",
        minWidth: 90,
        type: "number",
        align: "right",
        placeholder: "Count",
      },
    ],
    [isRowLocked]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200 shadow-xs">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Drive Parameter Log...</span>
      </div>
    );
  }

  const activePhotoRecord =
    photoModalRowIdx !== null ? records[photoModalRowIdx] : null;

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full">
      {/* ── Top Header & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-w-0">
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shrink-0">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">3. Process Drive Parameter</h2>
              <p className="text-[11px] text-slate-500 hidden sm:block">Extruder line speeds, pressures &amp; tape specifications</p>
            </div>
          </div>

          {/* Mobile Top Actions (< sm) */}
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
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Print / View Report"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print</span>
            </button>

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
            onClick={() => setShowPrintModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 h-8 cursor-pointer"
            title="Print / View Drive Parameters Report"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Print</span>
          </button>

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

      {/* ── Mobile Toolbar (Expand All / Collapse All on < md) ── */}
      <div className="flex md:hidden items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-xs text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-900">{records.length}</span>
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
      <div className="flex md:hidden flex-col gap-3">
        {records.map((row, idx) => {
          const isExpanded = expandedSlots.has(idx);
          const isLocked = isRowLocked(row, idx);
          const lockedByDefault = isTimeSlotLocked(date, row.time, 120);
          const isOverridden = lockedByDefault && !isLocked;

          return (
            <div
              key={idx}
              id={`reading-slot-${idx}`}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
            >
              {/* Card Header (Tap to expand/collapse) */}
              <div
                onClick={() => toggleSlotExpanded(idx)}
                className={`flex items-center justify-between p-3 cursor-pointer select-none transition-colors ${
                  isExpanded ? "bg-slate-50/80 border-b border-slate-200" : "bg-white hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-900 font-bold text-xs shrink-0">
                    #{idx + 1}
                  </span>

                  <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{row.time || `Slot #${idx + 1}`}</span>
                  </div>

                  {/* Status Badge */}
                  {isOverridden ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      <Unlock className="h-2.5 w-2.5" />
                      <span>Unlocked</span>
                    </span>
                  ) : isLocked ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                      <Lock className="h-2.5 w-2.5" />
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

                  {/* Group 1: Extruder & Line Speeds (RPM & MPM) */}
                  <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span className="text-xs font-bold text-indigo-900 tracking-tight">Extruder &amp; Line Speeds</span>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded border border-indigo-200">
                        RPM / MPM
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { key: "extruderRpm", label: "Extruder RPM", placeholder: "RPM" },
                        { key: "meltPumpRpm", label: "Melt Pump RPM", placeholder: "RPM" },
                        { key: "takeUpMpm", label: "Take-up MPM", placeholder: "MPM" },
                        { key: "nipRollMpm", label: "Nip Roll MPM", placeholder: "MPM" },
                        { key: "isuMpm", label: "ISU MPM", placeholder: "MPM" },
                        { key: "pauMpm", label: "P.A.U MPM", placeholder: "MPM" },
                        { key: "stretchingMpm", label: "Stretching MPM", placeholder: "MPM" },
                        { key: "annealingMpm", label: "Annealing MPM", placeholder: "MPM" },
                        { key: "stretchingRatio", label: "Stretch Ratio", placeholder: "Ratio" },
                      ].map((item) => (
                        <div key={item.key} className="space-y-0.5">
                          <label className="text-[10px] font-bold text-indigo-950/70 block truncate">
                            {item.label}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            disabled={isLocked}
                            value={(row as any)[item.key] ?? ""}
                            onChange={(e) =>
                              handleFieldChange(idx, item.key as keyof DriveParameterReading, e.target.value)
                            }
                            placeholder={item.placeholder}
                            className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Group 2: Melt Pressures & Water Bath */}
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-xs font-bold text-amber-900 tracking-tight">Melt Pressures &amp; Bath</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200">
                        bar / °C
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: "meltPressureP1", label: "Pressure P1", placeholder: "bar" },
                        { key: "meltPressureP2", label: "Pressure P2", placeholder: "bar" },
                        { key: "meltPressureP3", label: "Pressure P3", placeholder: "bar" },
                        { key: "waterBath", label: "Water Bath", placeholder: "°C" },
                      ].map((item) => (
                        <div key={item.key} className="space-y-0.5">
                          <label className="text-[10px] font-bold text-amber-950/70 block truncate">
                            {item.label}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            disabled={isLocked}
                            value={(row as any)[item.key] ?? ""}
                            onChange={(e) =>
                              handleFieldChange(idx, item.key as keyof DriveParameterReading, e.target.value)
                            }
                            placeholder={item.placeholder}
                            className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-400 text-right"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Group 3: Tape Quality & Physical Specifications */}
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-bold text-emerald-900 tracking-tight">Tape Quality Specifications</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200">
                        Specs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-emerald-950/70 block truncate">Colour</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          value={row.colour ?? ""}
                          onChange={(e) => handleFieldChange(idx, "colour", e.target.value, false)}
                          placeholder="Colour"
                          className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 text-left"
                        />
                      </div>

                      {[
                        { key: "denier", label: "Denier (D)", placeholder: "D" },
                        { key: "tapeWidth", label: "Tape Width (mm)", placeholder: "mm" },
                        { key: "strength", label: "Strength (gpd)", placeholder: "gpd" },
                        { key: "eloPercent", label: "ELO %", placeholder: "%" },
                        { key: "spacerWidth", label: "Spacer Width (mm)", placeholder: "mm" },
                        { key: "numberOfTape", label: "No. of Tapes", placeholder: "Count" },
                      ].map((item) => (
                        <div key={item.key} className="space-y-0.5">
                          <label className="text-[10px] font-bold text-emerald-950/70 block truncate">
                            {item.label}
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            disabled={isLocked}
                            value={(row as any)[item.key] ?? ""}
                            onChange={(e) =>
                              handleFieldChange(idx, item.key as keyof DriveParameterReading, e.target.value)
                            }
                            placeholder={item.placeholder}
                            className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 text-right"
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

        {/* Mobile Add Reading Slot Button */}
        <button
          type="button"
          onClick={handleAddReading}
          className="flex items-center justify-center gap-2 p-3.5 bg-white hover:bg-slate-50 border-2 border-dashed border-indigo-300 text-indigo-700 rounded-xl text-xs font-bold transition-all active:scale-[0.99] cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4 text-indigo-600" />
          <span>+ Add Reading Slot</span>
        </button>
      </div>

      {/* ── Desktop Spreadsheet Table with Lock and Evidence integration (md+) ── */}
      <div className="hidden md:block">
        <SpreadsheetTable<DriveParameterReading>
          title="Extruder Line & Process Drive Parameter Spreadsheet"
          columns={driveColumns}
          data={records}
          onChange={setRecords}
          allowAddRow={true}
          onAddRow={handleAddReading}
          allowDeleteRow={true}
          onDeleteRow={(idx) => setRecords(records.filter((_, i) => i !== idx))}
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

      {/* ── Photo Evidence Modal ── */}
      {photoModalRowIdx !== null && activePhotoRecord && (
        <PhotoEvidenceModal
          isOpen={true}
          onClose={() => setPhotoModalRowIdx(null)}
          title={`Evidence Photo — ${activePhotoRecord.time || `Row #${photoModalRowIdx + 1}`} (${date})`}
          timeSlot={activePhotoRecord.time}
          currentPhotoUrl={activePhotoRecord.photoUrl}
          allowUpload={canUploadPhoto}
          allowCapture={canCapturePhoto}
          disabled={isRowLocked(activePhotoRecord, photoModalRowIdx)}
          onSavePhoto={(url) => {
            handleUpdateRowPhoto(photoModalRowIdx, url);
            setPhotoModalRowIdx(null);
            toast.success(`Photo attached to ${activePhotoRecord.time || `row #${photoModalRowIdx + 1}`}`);
          }}
          onRemovePhoto={() => {
            handleUpdateRowPhoto(photoModalRowIdx, undefined);
            setPhotoModalRowIdx(null);
            toast.info("Photo removed");
          }}
        />
      )}

      {/* ── Standard Print & Excel Preview Modal ── */}
      <DriveParameterPrintPreviewModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        date={date}
        shiftName={shiftName}
        operatorName={operatorName}
        status="SAVED"
        records={records}
      />
    </div>
  );
}
