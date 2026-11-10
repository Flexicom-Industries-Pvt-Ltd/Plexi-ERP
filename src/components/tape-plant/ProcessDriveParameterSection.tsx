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
  AlertCircle,
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
  const isSupervisor = useMemo(() => {
    return canUserOverrideLock(userRole, userPermissions);
  }, [userRole, userPermissions]);

  // Set of unlocked time slots (supervisor manual override)
  const [unlockedSlots, setUnlockedSlots] = useState<Set<string>>(new Set());

  // Photo Evidence Modal state
  const [photoModalRowIdx, setPhotoModalRowIdx] = useState<number | null>(null);

  // Fetch current user session to determine role & permissions
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((session) => {
        if (!isMounted || !session?.user) return;
        setUserRole(session.user.role || "");
        setUserPermissions(session.user.permissions || []);
      })
      .catch((err) => {
        console.warn("Could not determine user session for RBAC:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleAddReading = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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

  // Toggle supervisor unlock override
  const handleToggleUnlock = (row: DriveParameterReading, idx: number) => {
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
    const updated = [...records];
    updated[idx] = { ...updated[idx], photoUrl };
    setRecords(updated);
  };

  // Columns definition with Evidence Photo column
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
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs min-w-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">3. Process Drive Parameter</h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
                Drive Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Extruder speeds, stretch ratios, line MPMs, and pressure telemetry aligned with {shiftName} ({date}). Auto-locks after 2h window expiry.
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
      <SpreadsheetTable<DriveParameterReading>
        title="Extruder Line & Process Drive Parameter Spreadsheet"
        subtitle={`Scheduled interval logging for ${shiftName}. Attach photo evidence per reading row.`}
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
      {photoModalRowIdx !== null && activePhotoRecord && (
        <PhotoEvidenceModal
          isOpen={true}
          onClose={() => setPhotoModalRowIdx(null)}
          title={`Evidence Photo — ${activePhotoRecord.time || `Row #${photoModalRowIdx + 1}`} (${date})`}
          timeSlot={activePhotoRecord.time}
          currentPhotoUrl={activePhotoRecord.photoUrl}
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
    </div>
  );
}
