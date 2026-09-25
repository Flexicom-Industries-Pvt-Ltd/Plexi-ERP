"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Filter,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Grid,
  Layers,
  LayoutGrid,
  Table,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  Boxes,
  Loader2,
  ChevronRight,
  Sparkles,
  Calendar,
  Zap,
  UserCheck,
} from "lucide-react";
import {
  LoomSummaryDataset,
  LoomQualityItem,
  exportLoomSummaryExcel,
} from "@/lib/loom/loom-summary-export";
import { printLoomSummary } from "@/lib/loom/print-loom-summary";

// Color group styling helper
export const COLOR_GROUP_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Yellow: { bg: "bg-amber-50 text-amber-900 border-amber-300", text: "text-amber-800", border: "border-amber-300", dot: "bg-amber-500" },
  White: { bg: "bg-slate-50 text-slate-900 border-slate-300", text: "text-slate-800", border: "border-slate-300", dot: "bg-slate-400" },
  "Light Green": { bg: "bg-emerald-50 text-emerald-900 border-emerald-300", text: "text-emerald-800", border: "border-emerald-300", dot: "bg-emerald-500" },
  "Dark Green": { bg: "bg-teal-50 text-teal-900 border-teal-300", text: "text-teal-800", border: "border-teal-300", dot: "bg-teal-600" },
  Grey: { bg: "bg-zinc-100 text-zinc-900 border-zinc-300", text: "text-zinc-800", border: "border-zinc-300", dot: "bg-zinc-500" },
  "Dark Blue": { bg: "bg-blue-50 text-blue-900 border-blue-300", text: "text-blue-800", border: "border-blue-300", dot: "bg-blue-600" },
  "Light Blue": { bg: "bg-cyan-50 text-cyan-900 border-cyan-300", text: "text-cyan-800", border: "border-cyan-300", dot: "bg-cyan-500" },
};

export function LoomSummarySection() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LoomSummaryDataset | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [selectedShiftId, setSelectedShiftId] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedColorGroup, setSelectedColorGroup] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "matrix">("cards");
  const [highlightedLoom, setHighlightedLoom] = useState<number | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate && selectedDate !== "ALL") params.set("date", selectedDate);
      if (selectedShiftId && selectedShiftId !== "ALL") params.set("shiftId", selectedShiftId);
      if (search) params.set("search", search);
      if (selectedColorGroup !== "ALL") params.set("colorGroup", selectedColorGroup);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      params.set("_t", String(Date.now()));
      const res = await fetch(`/api/production/loom/summary?${params.toString()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) throw new Error("Failed to load Loom Summary");
      const json: LoomSummaryDataset = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load Loom Summary");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedShiftId, search, selectedColorGroup, selectedStatus]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const selectedShiftName = useMemo(() => {
    if (!data?.availableShifts || selectedShiftId === "ALL") return "All Shifts";
    const found = data.availableShifts.find((s) => s.id === selectedShiftId);
    return found ? found.name : "All Shifts";
  }, [data?.availableShifts, selectedShiftId]);

  const handleExportExcel = () => {
    if (!data || data.qualities.length === 0) {
      toast.error("No Loom summary data available to export");
      return;
    }
    exportLoomSummaryExcel({
      ...data,
      selectedDate,
      selectedShiftId,
      selectedShiftName,
    });
    toast.success("Loom Machine Allocations exported to Excel");
  };

  const handlePrint = () => {
    if (!data || data.qualities.length === 0) {
      toast.error("No Loom summary data available to print");
      return;
    }
    printLoomSummary({
      ...data,
      selectedDate,
      selectedShiftId,
      selectedShiftName,
    });
  };

  const handleLoomClick = (loomNo: number) => {
    setHighlightedLoom(loomNo === highlightedLoom ? null : loomNo);
    setSearch(loomNo === highlightedLoom ? "" : String(loomNo));
  };

  const setDatePreset = (preset: "ALL" | "TODAY" | "YESTERDAY") => {
    if (preset === "ALL") {
      setSelectedDate("ALL");
    } else if (preset === "TODAY") {
      const today = new Date().toISOString().slice(0, 10);
      setSelectedDate(today);
    } else if (preset === "YESTERDAY") {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setSelectedDate(y);
    }
  };

  const kpis = data?.kpis;
  const colorGroups = data?.colorGroupsSummary || [];
  const shiftSummaries = data?.shiftSummaryList || [];

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full">
      {/* Top Header & Master Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs min-w-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-cyan-400 rounded-xl">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Loom Section: Live Machine Allocations & Tape Summary
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded border border-slate-300">
                1-91 Looms Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time synchronization of active qualities running in Tape Plant mapped to assigned Loom machine numbers date & shift wise.
            </p>
          </div>
        </div>

        {/* Master Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchSummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Reload live status from Tape Plant & Data Centre"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
            title="Print or save PDF of Loom Allocations"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Print PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Export full Loom Allocations and 1-91 Matrix to Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Date & Shift Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Picker Input */}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="font-bold text-slate-700">Date:</span>
              <input
                type="date"
                value={selectedDate === "ALL" ? "" : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || "ALL")}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold outline-none focus:border-slate-800 cursor-pointer"
              />
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setDatePreset("ALL")}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedDate === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Dates (Live)
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("TODAY")}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedDate === new Date().toISOString().slice(0, 10) ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("YESTERDAY")}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Yesterday
              </button>
            </div>

            {/* Shift Selector */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="font-bold text-slate-700">Shift:</span>
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-bold outline-none focus:border-slate-800 cursor-pointer"
              >
                <option value="ALL">All Shifts</option>
                {data?.availableShifts?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Context Chip */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-mono font-bold rounded-lg border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Context: {selectedDate === "ALL" ? "All Dates" : selectedDate} • {selectedShiftName}
            </span>
          </div>
        </div>

        {/* Interactive Shift Summary Cards Row */}
        {shiftSummaries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
            {shiftSummaries.map((s) => {
              const isSelected = selectedShiftId === s.shiftId;
              return (
                <div
                  key={s.shiftId}
                  onClick={() => setSelectedShiftId(isSelected ? "ALL" : s.shiftId)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-800"
                      : "bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-black uppercase tracking-wider text-[11px] ${isSelected ? "text-cyan-300" : "text-slate-900"}`}>
                      {s.shiftName}
                    </span>
                    <span className={`text-[10px] font-mono ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                      {s.startTime} - {s.endTime}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <span className={`text-base font-black font-mono ${isSelected ? "text-white" : "text-slate-900"}`}>
                      {s.producedKg ? `${s.producedKg.toLocaleString()} kg` : "0 kg"}
                    </span>
                    <span className={`text-[11px] font-bold ${isSelected ? "text-emerald-300" : "text-emerald-700"}`}>
                      {s.activeLoomsCount} Looms Active
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className={isSelected ? "text-slate-300" : "text-slate-500"}>
                      {s.qualitiesCount} Qualities Running
                    </span>
                    {s.operators.length > 0 && (
                      <span className={`truncate max-w-[120px] ${isSelected ? "text-slate-300" : "text-slate-600"}`} title={s.operators.join(", ")}>
                        Op: {s.operators.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Factory Looms
          </span>
          <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {kpis?.totalFactoryLooms || 91}{" "}
            <span className="text-[11px] font-normal text-slate-400">Total</span>
          </p>
          <span className="text-[10px] text-slate-500">
            {kpis ? `${kpis.totalAllocatedLooms} Allocated (${kpis.totalUnallocatedLooms} Standby)` : "—"}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Running In Tape Plant
          </span>
          <p className="text-xl font-black text-emerald-800 font-mono mt-0.5">
            {kpis?.runningQualitiesCount || 0}{" "}
            <span className="text-[11px] font-normal text-emerald-600">Qualities</span>
          </p>
          <span className="text-[10px] text-emerald-700 font-semibold">
            {kpis?.totalRunningLooms || 0} Looms Active
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Planned In Tape Plant
          </span>
          <p className="text-xl font-black text-blue-800 font-mono mt-0.5">
            {kpis?.plannedQualitiesCount || 0}{" "}
            <span className="text-[11px] font-normal text-blue-600">Qualities</span>
          </p>
          <span className="text-[10px] text-blue-700 font-semibold">
            {kpis?.totalPlannedLooms || 0} Looms Scheduled
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Tape Produced Output
          </span>
          <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {kpis?.totalTapeProducedKg?.toLocaleString() || 0}{" "}
            <span className="text-[11px] font-normal text-slate-400">Kg</span>
          </p>
          <span className="text-[10px] text-slate-500">
            {kpis?.totalTapePlannedKg ? `${kpis.totalTapePlannedKg.toLocaleString()} Kg Planned` : "In Selected Filter"}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Active Color Groups
          </span>
          <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {colorGroups.length}{" "}
            <span className="text-[11px] font-normal text-slate-400">Groups</span>
          </p>
          <span className="text-[10px] text-slate-500">Yellow, White, Green, etc.</span>
        </div>
      </div>

      {/* Filter & View Switcher Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search quality code (e.g. AMB), loom # (e.g. 14), shift, colour..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-slate-800 font-medium"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-medium outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="RUNNING">🟢 Running in Tape Plant</option>
              <option value="PLANNED">🔵 Planned in Tape Plant</option>
              <option value="STANDBY">⚪ Standby / Mapped</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("matrix")}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "matrix" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>1-91 Matrix</span>
            </button>
          </div>
        </div>

        {/* Color Group Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Color Groups:
          </span>
          <button
            type="button"
            onClick={() => setSelectedColorGroup("ALL")}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedColorGroup === "ALL"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({kpis?.totalAllocatedLooms || 91} Looms)
          </button>

          {colorGroups.map((cg) => {
            const isSelected = selectedColorGroup.toLowerCase() === cg.colorGroup.toLowerCase();
            const style = COLOR_GROUP_STYLES[cg.colorGroup] || {
              bg: "bg-slate-50 text-slate-800 border-slate-300",
              dot: "bg-slate-400",
            };
            return (
              <button
                key={cg.colorGroup}
                type="button"
                onClick={() =>
                  setSelectedColorGroup(isSelected ? "ALL" : cg.colorGroup)
                }
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : `${style.bg} hover:opacity-90`
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                <span>{cg.colorGroup}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-slate-800 text-cyan-300" : "bg-white/80 text-slate-700"
                  }`}
                >
                  {cg.totalLooms} Looms
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-700 mb-2" />
          <p className="text-xs font-bold text-slate-800">Synchronizing Loom Allocations & Shift Data...</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Fetching 91 factory loom mappings, active shift plans and batch logs</p>
        </div>
      ) : !data || data.qualities.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-500 text-xs">
          No loom machine mappings match your search criteria.
        </div>
      ) : (
        <div className="space-y-6">
          {/* VIEW 1: FACTORY FLOOR 1-91 LOOM MATRIX */}
          {viewMode === "matrix" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Grid className="h-4 w-4 text-slate-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Factory Floor 1-91 Loom Live Matrix ({selectedDate === "ALL" ? "All Dates" : selectedDate} • {selectedShiftName})
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Running In Tape
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Planned In Tape
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Standby / Mapped
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-13 gap-2">
                  {data.loomMatrix.map((node) => {
                    const isRunning = node.status === "RUNNING";
                    const isPlanned = node.status === "PLANNED";
                    const isHighlighted = highlightedLoom === node.loomNumber;

                    return (
                      <div
                        key={node.loomNumber}
                        onClick={() => handleLoomClick(node.loomNumber)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          isHighlighted
                            ? "ring-2 ring-slate-900 bg-slate-900 text-white shadow-md scale-105"
                            : isRunning
                            ? "bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100/70"
                            : isPlanned
                            ? "bg-blue-50/80 border-blue-300 hover:bg-blue-100/70"
                            : node.isAllocated
                            ? "bg-white border-slate-300 hover:border-slate-400"
                            : "bg-slate-100 border-dashed border-slate-300 opacity-60"
                        }`}
                        title={`Loom #${node.loomNumber}: ${node.qualityCode || "Unallocated"} (${node.status})`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-mono font-black ${isHighlighted ? "text-cyan-300" : "text-slate-900"}`}>
                            #{node.loomNumber}
                          </span>
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isRunning
                                ? "bg-emerald-500"
                                : isPlanned
                                ? "bg-blue-500"
                                : node.isAllocated
                                ? "bg-slate-400"
                                : "bg-slate-300"
                            }`}
                          />
                        </div>
                        <div
                          className={`text-[9.5px] font-bold truncate mt-1 ${
                            isHighlighted ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {node.qualityCode || "Idle / Standby"}
                        </div>
                        <div
                          className={`text-[8.5px] truncate ${
                            isHighlighted ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {node.colour} {node.reedSpaceCm ? `• ${node.reedSpaceCm}cm` : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: BENTO QUALITY CARDS */}
          {viewMode === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.qualities.map((item) => {
                const style = COLOR_GROUP_STYLES[item.colorGroup] || {
                  bg: "bg-slate-50 text-slate-800 border-slate-300",
                  text: "text-slate-800",
                  border: "border-slate-300",
                  dot: "bg-slate-400",
                };
                const isRunning = item.status === "RUNNING";
                const isPlanned = item.status === "PLANNED";

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div>
                      {/* Top Card Header */}
                      <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              {item.colorGroup}
                            </span>
                          </div>
                          <h4 className="text-sm font-black font-mono text-slate-900 mt-1 tracking-tight">
                            {item.qualityCode}
                          </h4>
                        </div>

                        {/* Live Tape Plant Status Badge */}
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                              isRunning
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isPlanned
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-slate-100 text-slate-600 border-slate-300"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isRunning ? "bg-emerald-500 animate-pulse" : isPlanned ? "bg-blue-500" : "bg-slate-400"
                              }`}
                            />
                            {isRunning ? "Running in Tape" : isPlanned ? "Planned in Tape" : "Standby"}
                          </span>
                        </div>
                      </div>

                      {/* Technical Specs Grid */}
                      <div className="p-4 grid grid-cols-3 gap-2 bg-slate-50/60 border-b border-slate-100 text-xs">
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase">Colour</span>
                          <p className="font-semibold text-slate-800 text-xs truncate">{item.colour}</p>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase">Denier</span>
                          <p className="font-mono font-semibold text-slate-800 text-xs">{item.denier || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase">Tape Width</span>
                          <p className="font-mono font-semibold text-slate-800 text-xs">{item.tapeWidth ? `${item.tapeWidth} mm` : "—"}</p>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase">Reed Space</span>
                          <p className="font-mono font-semibold text-slate-800 text-xs">{item.reedSpaceCm ? `${item.reedSpaceCm} cm` : "—"}</p>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase">Bobbin Mark</span>
                          <p className="font-semibold text-slate-800 text-xs truncate">{item.bobbinMarking}</p>
                        </div>
                        <div>
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase">Mesh / PPM</span>
                          <p className="font-mono font-semibold text-slate-800 text-xs">{item.mesh || "—"}</p>
                        </div>
                      </div>

                      {/* Shift Output Highlights */}
                      {(item.actualOutputKg || item.plannedOutputKg) ? (
                        <div className="px-4 py-2 bg-emerald-50/50 border-b border-emerald-100/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                            <Zap className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Output: {item.actualOutputKg ? `${item.actualOutputKg.toLocaleString()} kg` : "0 kg"}</span>
                          </div>
                          {item.plannedOutputKg ? (
                            <span className="text-[11px] text-slate-600 font-mono">Plan: {item.plannedOutputKg.toLocaleString()} kg</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {/* Assigned Looms Footer */}
                    <div className="p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Boxes className="h-3.5 w-3.5 text-slate-500" />
                          Allocated Looms:
                        </span>
                        <span className="text-xs font-black font-mono px-2 py-0.5 bg-slate-900 text-white rounded">
                          {item.totalLooms} Looms
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {item.loomNumbers.map((loomNo) => (
                          <span
                            key={loomNo}
                            onClick={() => handleLoomClick(loomNo)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                              isRunning
                                ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
                                : isPlanned
                                ? "bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100"
                                : "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            #{loomNo}
                          </span>
                        ))}
                      </div>

                      {item.activeShifts && item.activeShifts.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                          <span>Shifts: <strong>{item.activeShifts.join(", ")}</strong></span>
                          {item.latestOperator && <span>Op: <strong>{item.latestOperator}</strong></span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: DENSE ERP TABLE VIEW */}
          {viewMode === "table" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4 text-slate-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Loom Machine Master Allocations Table ({selectedDate === "ALL" ? "All Dates" : selectedDate} • {selectedShiftName})
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {data.qualities.length} Qualities ({kpis?.totalAllocatedLooms} Looms Assigned)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-8">#</th>
                      <th className="px-3 py-2.5">Quality Formulation Code</th>
                      <th className="px-3 py-2.5 text-center">Tape Status</th>
                      <th className="px-3 py-2.5">Color Group</th>
                      <th className="px-3 py-2.5">Colour</th>
                      <th className="px-3 py-2.5 text-right">Denier</th>
                      <th className="px-3 py-2.5 text-right">Width (mm)</th>
                      <th className="px-3 py-2.5 text-right">Reed Space</th>
                      <th className="px-3 py-2.5">Bobbin Mark</th>
                      <th className="px-3 py-2.5 text-center font-bold">Looms</th>
                      <th className="px-3 py-2.5">Assigned Loom Numbers</th>
                      <th className="px-3 py-2.5 text-right">Produced (Kg)</th>
                      <th className="px-3 py-2.5">Active Shifts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.qualities.map((q, idx) => {
                      const isRunning = q.status === "RUNNING";
                      const isPlanned = q.status === "PLANNED";

                      return (
                        <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{q.qualityCode}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                isRunning
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : isPlanned
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-600 border-slate-300"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isRunning ? "bg-emerald-500 animate-pulse" : isPlanned ? "bg-blue-500" : "bg-slate-400"
                                }`}
                              />
                              {isRunning ? "Running" : isPlanned ? "Planned" : "Standby"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-700">{q.colorGroup}</td>
                          <td className="px-3 py-2.5 text-slate-800">{q.colour}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">{q.denier || "—"}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">{q.tapeWidth || "—"}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            {q.reedSpaceCm ? `${q.reedSpaceCm} cm` : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{q.bobbinMarking}</td>
                          <td className="px-3 py-2.5 text-center font-mono font-black text-slate-900 bg-slate-50">
                            {q.totalLooms}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {q.loomNumbers.map((num) => (
                                <span
                                  key={num}
                                  onClick={() => handleLoomClick(num)}
                                  className="px-1.5 py-0.2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10.5px] font-mono font-semibold cursor-pointer"
                                >
                                  #{num}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            {q.actualOutputKg ? `${q.actualOutputKg.toLocaleString()} kg` : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] text-slate-600">
                            {(q.activeShifts || []).join(", ") || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={2} className="px-3 py-2 text-right uppercase text-[10px]">
                        Total Active Mappings:
                      </td>
                      <td className="px-3 py-2 text-center">{kpis?.runningQualitiesCount} Running</td>
                      <td colSpan={6}>—</td>
                      <td className="px-3 py-2 text-center font-mono font-black bg-slate-200">
                        {kpis?.totalAllocatedLooms}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        Allocated across {kpis?.totalFactoryLooms} Loom bays
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">
                        {kpis?.totalTapeProducedKg?.toLocaleString()} kg
                      </td>
                      <td>—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
