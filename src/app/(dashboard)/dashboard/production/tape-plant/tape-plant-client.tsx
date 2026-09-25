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
  Boxes,
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
import { BobbinStockSummarySection } from "@/components/tape-plant/BobbinStockSummarySection";
import { TapePlantReportSection } from "@/components/tape-plant/TapePlantReportSection";

export type TapePlantTab =
  | "planning"
  | "temperature"
  | "drive"
  | "raw-material"
  | "post-production"
  | "bobbin-stock"
  | "reports";

const TABS = [
  { id: "planning" as TapePlantTab, label: "1. Planning", icon: ClipboardList },
  { id: "temperature" as TapePlantTab, label: "2. Temperature", icon: Thermometer },
  { id: "drive" as TapePlantTab, label: "3. Drive Parameters", icon: Gauge },
  { id: "raw-material" as TapePlantTab, label: "4. Raw Material", icon: FlaskConical },
  { id: "post-production" as TapePlantTab, label: "5. Post Production & QC", icon: PackageCheck },
  { id: "bobbin-stock" as TapePlantTab, label: "6. Bobbin Stock Summary", icon: Boxes },
  { id: "reports" as TapePlantTab, label: "7. Reports", icon: BarChart3 },
];

const TAB_META: Record<
  TapePlantTab,
  {
    title: string;
    subtitle: string;
    badge: string;
    icon: React.ComponentType<{ className?: string }>;
    showRootDateShift: boolean;
  }
> = {
  planning: {
    title: "Tape Plant Planning",
    subtitle: "Excel-like spreadsheet workspace for Tape Plant shift planning, telemetry, material consumption, output, and reports.",
    badge: "v1.1 Tabular",
    icon: ClipboardList,
    showRootDateShift: true,
  },
  temperature: {
    title: "Process Temperature",
    subtitle: "Real-time extruder zones, adaptor, die, water bath, and godet temperature tracking.",
    badge: "Telemetry",
    icon: Thermometer,
    showRootDateShift: true,
  },
  drive: {
    title: "Process Drive Parameters",
    subtitle: "Extruder speed, godet ratio, winder tension, line speed, and telemetry parameters.",
    badge: "Drive Sync",
    icon: Gauge,
    showRootDateShift: true,
  },
  "raw-material": {
    title: "Raw Material Consumption",
    subtitle: "Live batch mixing, polymer resin, calcium carbonate, and masterbatch material tracking.",
    badge: "Formulation",
    icon: FlaskConical,
    showRootDateShift: true,
  },
  "post-production": {
    title: "Post Production Entry & QC",
    subtitle: "Per-recipe shift output entry, net production, quality inspection, and shift wastage records.",
    badge: "Auto-Save",
    icon: PackageCheck,
    showRootDateShift: true,
  },
  "bobbin-stock": {
    title: "Bobbin Stock Summary",
    subtitle: "Cumulative finished bobbin stock and crate inventory derived from Post-Production Net Output.",
    badge: "Inventory Stock",
    icon: Boxes,
    showRootDateShift: false,
  },
  reports: {
    title: "Tape Plant Reports",
    subtitle: "Comprehensive shift logs, operator performance, wastage trends, and consolidated exports.",
    badge: "Analytics",
    icon: BarChart3,
    showRootDateShift: false,
  },
};

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
            { id: "shift_day", name: "Day Shift (08:00 - 20:00)" },
            { id: "shift_night", name: "Night Shift (20:00 - 08:00)" },
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

  const isAllShifts = selectedShiftId === "ALL";
  const currentShift = shifts.find((s) => s.id === selectedShiftId);
  const shiftName = isAllShifts ? "All Shifts (Day + Night)" : (currentShift?.name || "Shift A");

  const currentTabMeta = TAB_META[activeTab] || TAB_META.planning;
  const HeaderIcon = currentTabMeta.icon;

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Module Title & Shift/Date Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
                <HeaderIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {currentTabMeta.title}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    {currentTabMeta.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {currentTabMeta.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Date & Shift Context Control (Hidden on tabs with their own dedicated range/filter systems like Bobbin Stock) */}
          {currentTabMeta.showRootDateShift && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shrink-0">
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
                  <option value="ALL">ALL (All Shifts)</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Section Workspace */}
      <div className="transition-all duration-200 w-full min-w-0 max-w-full">
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
        {activeTab === "bobbin-stock" && (
          <BobbinStockSummarySection
            date={selectedDate}
            shiftId={selectedShiftId}
            shiftName={shiftName}
            onNavigateToPostProduction={() => handleTabChange("post-production")}
          />
        )}
        {activeTab === "reports" && <TapePlantReportSection shifts={shifts} />}
      </div>
    </div>
  );
}
