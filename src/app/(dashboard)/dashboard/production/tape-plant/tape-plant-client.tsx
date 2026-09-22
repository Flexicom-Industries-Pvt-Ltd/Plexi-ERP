"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, addDays, subDays } from "date-fns";
import {
  ClipboardList,
  Thermometer,
  Gauge,
  FlaskConical,
  PackageCheck,
  BarChart3,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { TapePlantPlanningSection } from "@/components/tape-plant/TapePlantPlanningSection";
import { ProcessTemperatureSection } from "@/components/tape-plant/ProcessTemperatureSection";
import { ProcessDriveParameterSection } from "@/components/tape-plant/ProcessDriveParameterSection";
import { RawMaterialSection } from "@/components/tape-plant/RawMaterialSection";
import { PostProductionSection } from "@/components/tape-plant/PostProductionSection";
import { TapePlantReportSection } from "@/components/tape-plant/TapePlantReportSection";

export type TapePlantTab =
  | "planning"
  | "temperature"
  | "drive"
  | "raw-material"
  | "post-production"
  | "reports";

const TABS = [
  { id: "planning" as TapePlantTab, label: "1. Planning", icon: ClipboardList },
  { id: "temperature" as TapePlantTab, label: "2. Temperature", icon: Thermometer },
  { id: "drive" as TapePlantTab, label: "3. Drive Parameters", icon: Gauge },
  { id: "raw-material" as TapePlantTab, label: "4. Raw Material", icon: FlaskConical },
  { id: "post-production" as TapePlantTab, label: "5. Post Production & QC", icon: PackageCheck },
  { id: "reports" as TapePlantTab, label: "6. Reports", icon: BarChart3 },
];

export function TapePlantClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TapePlantTab | null;

  const [activeTab, setActiveTab] = useState<TapePlantTab>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "planning"
  );

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: TapePlantTab) => {
    setActiveTab(tabId);
    router.replace(`/dashboard/production/tape-plant?tab=${tabId}`, { scroll: false });
  };

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState<{ id: string; name: string; startTime?: string; endTime?: string }[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState("");

  useEffect(() => {
    fetch("/api/settings/master-data/shift")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setShifts(data);
          setSelectedShiftId(data[0].id);
        } else {
          // Fallback if master data empty
          const fallback = [
            { id: "shift-a", name: "Shift A (06:00 - 14:00)" },
            { id: "shift-b", name: "Shift B (14:00 - 22:00)" },
            { id: "shift-c", name: "Shift C (22:00 - 06:00)" },
          ];
          setShifts(fallback);
          setSelectedShiftId(fallback[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    setSelectedDate(subDays(current, 1).toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    setSelectedDate(addDays(current, 1).toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const currentShift = shifts.find((s) => s.id === selectedShiftId);
  const shiftName = currentShift?.name || "Shift A";

  return (
    <div className="space-y-6">
      {/* Module Title & Shift/Date Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Tape Plant</h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    v1.1 Tabular
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Excel-like spreadsheet workspace for Tape Plant shift planning, telemetry, material consumption, output, and reports.
                </p>
              </div>
            </div>
          </div>

          {/* Date & Shift Context Control */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            {/* Date Navigator */}
            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
              <button
                type="button"
                onClick={handlePrevDay}
                title="Previous Day"
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={handleNextDay}
                title="Next Day"
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                Today
              </button>
            </div>

            {/* Shift Picker */}
            <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-1 shadow-sm">
              <Clock className="h-4 w-4 text-slate-400" />
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 6 Section Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-4 mt-4 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Section Tab Workspace */}
      <div className="transition-all duration-200">
        {activeTab === "planning" && (
          <TapePlantPlanningSection date={selectedDate} shiftId={selectedShiftId} shiftName={shiftName} />
        )}
        {activeTab === "temperature" && (
          <ProcessTemperatureSection date={selectedDate} shiftId={selectedShiftId} shiftName={shiftName} />
        )}
        {activeTab === "drive" && (
          <ProcessDriveParameterSection date={selectedDate} shiftId={selectedShiftId} shiftName={shiftName} />
        )}
        {activeTab === "raw-material" && (
          <RawMaterialSection date={selectedDate} shiftId={selectedShiftId} shiftName={shiftName} />
        )}
        {activeTab === "post-production" && (
          <PostProductionSection date={selectedDate} shiftId={selectedShiftId} shiftName={shiftName} />
        )}
        {activeTab === "reports" && <TapePlantReportSection shifts={shifts} />}
      </div>
    </div>
  );
}
