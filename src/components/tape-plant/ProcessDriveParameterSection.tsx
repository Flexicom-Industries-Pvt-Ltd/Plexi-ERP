"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2, Gauge, Plus } from "lucide-react";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";

interface DriveParameterReading {
  id?: string;
  time: string;
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

const DEFAULT_SCHEDULED_TIMES = ["12:00", "14:00", "16:00", "18:00", "20:00"];

const driveColumns: ColumnDef<DriveParameterReading>[] = [
  { key: "time", label: "Time", width: "90px", minWidth: 90, sticky: true, placeholder: "HH:MM" },
  { key: "extruderRpm", label: "Extruder RPM", width: "100px", minWidth: 95, type: "number", align: "right", placeholder: "RPM" },
  { key: "meltPumpRpm", label: "Melt Pump RPM", width: "110px", minWidth: 105, type: "number", align: "right", placeholder: "RPM" },
  { key: "takeUpMpm", label: "Take-up MPM", width: "105px", minWidth: 100, type: "number", align: "right", placeholder: "MPM" },
  { key: "nipRollMpm", label: "Nip Roll MPM", width: "105px", minWidth: 100, type: "number", align: "right", placeholder: "MPM" },
  { key: "isuMpm", label: "ISU MPM", width: "90px", minWidth: 85, type: "number", align: "right", placeholder: "MPM" },
  { key: "pauMpm", label: "P.A.U MPM", width: "95px", minWidth: 90, type: "number", align: "right", placeholder: "MPM" },
  { key: "stretchingMpm", label: "Stretching MPM", width: "115px", minWidth: 110, type: "number", align: "right", placeholder: "MPM" },
  { key: "annealingMpm", label: "Annealing MPM", width: "115px", minWidth: 110, type: "number", align: "right", placeholder: "MPM" },
  { key: "stretchingRatio", label: "Stretch Ratio", width: "100px", minWidth: 95, type: "number", align: "right", placeholder: "Ratio" },
  { key: "meltPressureP1", label: "Pressure P1", width: "95px", minWidth: 90, type: "number", align: "right", placeholder: "bar" },
  { key: "meltPressureP2", label: "Pressure P2", width: "95px", minWidth: 90, type: "number", align: "right", placeholder: "bar" },
  { key: "meltPressureP3", label: "Pressure P3", width: "95px", minWidth: 90, type: "number", align: "right", placeholder: "bar" },
  { key: "waterBath", label: "Water Bath", width: "95px", minWidth: 90, type: "number", align: "right", placeholder: "°C" },
  { key: "colour", label: "Colour", width: "110px", minWidth: 100, placeholder: "Color" },
  { key: "denier", label: "Denier", width: "80px", minWidth: 75, type: "number", align: "right", placeholder: "D" },
  { key: "tapeWidth", label: "Tape Width", width: "95px", minWidth: 90, type: "number", align: "right", placeholder: "mm" },
  { key: "strength", label: "Strength", width: "85px", minWidth: 80, type: "number", align: "right", placeholder: "gpd" },
  { key: "eloPercent", label: "ELO %", width: "80px", minWidth: 75, type: "number", align: "right", placeholder: "%" },
  { key: "spacerWidth", label: "Spacer Width", width: "100px", minWidth: 95, type: "number", align: "right", placeholder: "mm" },
  { key: "numberOfTape", label: "No. of Tapes", width: "95px", minWidth: 90, type: "number", align: "right", placeholder: "Count" },
];

interface ProcessDriveParameterSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function ProcessDriveParameterSection({ date, shiftId, shiftName }: ProcessDriveParameterSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<DriveParameterReading[]>([]);

  useEffect(() => {
    if (!date || !shiftId) return;
    setLoading(true);
    fetch(`/api/production/tape-plant/drive-parameters?date=${date}&shiftId=${shiftId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: DriveParameterReading[]) => {
        if (data && data.length > 0) {
          setRecords(data);
        } else {
          const initial: DriveParameterReading[] = DEFAULT_SCHEDULED_TIMES.map((time) => ({
            time,
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
        }
      })
      .catch(() => toast.error("Failed to load drive parameters"))
      .finally(() => setLoading(false));
  }, [date, shiftId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/production/tape-plant/drive-parameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          shiftId,
          records,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save drive parameters");
      }

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
      id: undefined,
    };
    setRecords(updated);
    toast.success("Copied parameters from previous row");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Drive Parameters...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">3. Process Drive Parameter</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Extruder speeds, stretch ratios, line MPMs, and pressure telemetry for {shiftName} ({date}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Drive Log
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <SpreadsheetTable<DriveParameterReading>
        title="Extruder Line & Process Drive Parameter Spreadsheet"
        subtitle="Click any cell to edit. Use Tab / Enter to navigate."
        columns={driveColumns}
        data={records}
        onChange={setRecords}
        allowAddRow={true}
        onAddRow={handleAddReading}
        allowDeleteRow={true}
        onDeleteRow={(idx) => setRecords(records.filter((_, i) => i !== idx))}
        allowCopyRow={true}
        onCopyPrevious={handleCopyPrevious}
      />
    </div>
  );
}
