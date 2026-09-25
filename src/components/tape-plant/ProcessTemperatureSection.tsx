"use client";

import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Save, Loader2, Thermometer, Plus, Copy, CheckCircle } from "lucide-react";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";
import { OperatorSelect } from "./OperatorSelect";

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
  meltTemp: number | string;
  h1: number | string;
  h2: number | string;
  hotAirTemp: number | string;
}

const DEFAULT_SCHEDULED_TIMES = ["12:00", "14:00", "16:00", "18:00", "20:00"];

const tempColumns: ColumnDef<TemperatureReading>[] = [
  { key: "time", label: "Time", width: "90px", minWidth: 90, sticky: true, placeholder: "HH:MM" },
  
  // Barrel Zone
  { key: "b1", label: "B1", group: "Barrel Zone", groupColor: "bg-blue-100/90 text-blue-900 border-blue-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "b2", label: "B2", group: "Barrel Zone", groupColor: "bg-blue-100/90 text-blue-900 border-blue-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "b3", label: "B3", group: "Barrel Zone", groupColor: "bg-blue-100/90 text-blue-900 border-blue-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "b4", label: "B4", group: "Barrel Zone", groupColor: "bg-blue-100/90 text-blue-900 border-blue-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "b5", label: "B5", group: "Barrel Zone", groupColor: "bg-blue-100/90 text-blue-900 border-blue-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "b6", label: "B6", group: "Barrel Zone", groupColor: "bg-blue-100/90 text-blue-900 border-blue-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "b7", label: "B7", group: "Barrel Zone", groupColor: "bg-blue-100/90 text-blue-900 border-blue-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },

  // Adaptor
  { key: "screenChanger", label: "Screen Changer", group: "Adaptor", groupColor: "bg-indigo-100/90 text-indigo-900 border-indigo-200", width: "115px", minWidth: 105, type: "number", align: "right", placeholder: "°C" },
  { key: "ad1", label: "AD-1", group: "Adaptor", groupColor: "bg-indigo-100/90 text-indigo-900 border-indigo-200", width: "75px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "ad2", label: "AD-2", group: "Adaptor", groupColor: "bg-indigo-100/90 text-indigo-900 border-indigo-200", width: "75px", minWidth: 70, type: "number", align: "right", placeholder: "°C" },
  { key: "meltPump", label: "Melt Pump", group: "Adaptor", groupColor: "bg-indigo-100/90 text-indigo-900 border-indigo-200", width: "95px", minWidth: 90, type: "number", align: "right", placeholder: "°C" },

  // Die Zone
  { key: "d1", label: "D-1", group: "Die Zone", groupColor: "bg-amber-100/90 text-amber-900 border-amber-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "d2", label: "D-2", group: "Die Zone", groupColor: "bg-amber-100/90 text-amber-900 border-amber-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "d3", label: "D-3", group: "Die Zone", groupColor: "bg-amber-100/90 text-amber-900 border-amber-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "d4", label: "D-4", group: "Die Zone", groupColor: "bg-amber-100/90 text-amber-900 border-amber-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "d5", label: "D-5", group: "Die Zone", groupColor: "bg-amber-100/90 text-amber-900 border-amber-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "d6", label: "D-6", group: "Die Zone", groupColor: "bg-amber-100/90 text-amber-900 border-amber-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "d7", label: "D-7", group: "Die Zone", groupColor: "bg-amber-100/90 text-amber-900 border-amber-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },

  // After D-7: Melt Temp
  { key: "meltTemp", label: "Melt Temp", width: "100px", minWidth: 95, type: "number", align: "right", placeholder: "°C" },

  // Housing Water Temp
  { key: "h1", label: "H1", group: "Housing Water Temp", groupColor: "bg-cyan-100/90 text-cyan-900 border-cyan-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },
  { key: "h2", label: "H2", group: "Housing Water Temp", groupColor: "bg-cyan-100/90 text-cyan-900 border-cyan-200", width: "70px", minWidth: 65, type: "number", align: "right", placeholder: "°C" },

  // Hot Air Temp
  { key: "hotAirTemp", label: "Hot Air Temp", width: "115px", minWidth: 105, type: "number", align: "right", placeholder: "°C" },
];

interface ProcessTemperatureSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function ProcessTemperatureSection({ date, shiftId, shiftName }: ProcessTemperatureSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const isInitialLoadedRef = useRef(false);
  const lastSavedPayloadRef = useRef("");
  const [operatorName, setOperatorName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [readings, setReadings] = useState<TemperatureReading[]>([]);

  useEffect(() => {
    if (!date || !shiftId) return;
    isInitialLoadedRef.current = false;
    setLoading(true);
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
  }, [date, shiftId]);

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
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-w-0">
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

        <div className="flex items-center gap-3">
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
              <span className="hidden sm:inline">Auto-saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Log
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
