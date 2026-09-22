"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Loader2, Thermometer, Plus, Copy } from "lucide-react";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";

interface TemperatureReading {
  id?: string;
  time: string;
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
  housingWater: number | string;
  hotAirTemp: number | string;
}

const DEFAULT_SCHEDULED_TIMES = ["12:00", "14:00", "16:00", "18:00", "20:00"];

const tempColumns: ColumnDef<TemperatureReading>[] = [
  { key: "time", label: "Time", width: "90px", minWidth: 90, sticky: true, placeholder: "HH:MM" },
  { key: "b1", label: "B1", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "b2", label: "B2", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "b3", label: "B3", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "b4", label: "B4", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "b5", label: "B5", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "b6", label: "B6", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "b7", label: "B7", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "screenChanger", label: "Screen Changer", width: "120px", minWidth: 110, type: "number", align: "right", placeholder: "°C" },
  { key: "ad1", label: "AD-1", width: "80px", minWidth: 75, type: "number", align: "right", placeholder: "°C" },
  { key: "ad2", label: "AD-2", width: "80px", minWidth: 75, type: "number", align: "right", placeholder: "°C" },
  { key: "meltPump", label: "Melt Pump", width: "95px", minWidth: 90, type: "number", align: "right", placeholder: "°C" },
  { key: "d1", label: "D-1", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "d2", label: "D-2", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "d3", label: "D-3", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "d4", label: "D-4", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "d5", label: "D-5", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "d6", label: "D-6", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "d7", label: "D-7", width: "70px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "housingWater", label: "Housing Water", width: "115px", minWidth: 110, type: "number", align: "right", placeholder: "°C" },
  { key: "hotAirTemp", label: "Hot Air Temp", width: "115px", minWidth: 110, type: "number", align: "right", placeholder: "°C" },
];

interface ProcessTemperatureSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function ProcessTemperatureSection({ date, shiftId, shiftName }: ProcessTemperatureSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [readings, setReadings] = useState<TemperatureReading[]>([]);

  useEffect(() => {
    if (!date || !shiftId) return;
    setLoading(true);
    fetch(`/api/production/tape-plant/temperature?date=${date}&shiftId=${shiftId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: TemperatureReading[]) => {
        if (data && data.length > 0) {
          setReadings(data);
        } else {
          // Initialize with standard shift intervals
          const initial: TemperatureReading[] = DEFAULT_SCHEDULED_TIMES.map((time) => ({
            time,
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
            housingWater: "",
            hotAirTemp: "",
          }));
          setReadings(initial);
        }
      })
      .catch(() => toast.error("Failed to load temperature readings"))
      .finally(() => setLoading(false));
  }, [date, shiftId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/production/tape-plant/temperature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          shiftId,
          readings,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save readings");
      }

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
        housingWater: "",
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
      id: undefined,
    };
    setReadings(updated);
    toast.success("Copied values from previous row");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Temperature Log...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <Thermometer className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">2. Process Temperature</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hourly / periodic extruder barrel, adaptor, and die zone temperature logging for {shiftName} ({date}).
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
            Save Temperature Log
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <SpreadsheetTable<TemperatureReading>
        title="Extruder & Die Zone Temperature Spreadsheet"
        subtitle="Click any cell to edit. Use Tab / Enter to navigate. Temperature values in °C."
        columns={tempColumns}
        data={readings}
        onChange={setReadings}
        allowAddRow={true}
        onAddRow={handleAddReading}
        allowDeleteRow={true}
        onDeleteRow={(idx) => setReadings(readings.filter((_, i) => i !== idx))}
        allowCopyRow={true}
        onCopyPrevious={handleCopyPrevious}
      />
    </div>
  );
}
