"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Filter,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  LayoutGrid,
  Calendar,
  Clock,
  Layers,
  Activity,
  Boxes,
  Package,
  Scale,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  LoomSummaryDataset,
  exportLoomSummaryExcel,
} from "@/lib/loom/loom-summary-export";
import { printLoomSummary } from "@/lib/loom/print-loom-summary";
import { RecipeQualityBadge } from "../tape-plant/RecipeQualityBadge";
import { RecipeLoomSummaryItem, LoomMachineSummaryItem } from "@/app/api/production/loom/summary/route";

// Color group styling helper for changeover and matrix cards
export const COLOR_GROUP_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Yellow: { bg: "bg-amber-50 text-amber-900 border-amber-300", text: "text-amber-800", border: "border-amber-300", dot: "bg-amber-500" },
  White: { bg: "bg-slate-50 text-slate-900 border-slate-300", text: "text-slate-800", border: "border-slate-300", dot: "bg-slate-400" },
  "Light Green": { bg: "bg-emerald-50 text-emerald-900 border-emerald-300", text: "text-emerald-800", border: "border-emerald-300", dot: "bg-emerald-500" },
  "Dark Green": { bg: "bg-teal-50 text-teal-900 border-teal-300", text: "text-teal-800", border: "border-teal-300", dot: "bg-teal-600" },
  Grey: { bg: "bg-zinc-100 text-zinc-900 border-zinc-300", text: "text-zinc-800", border: "border-zinc-300", dot: "bg-zinc-500" },
  "Dark Blue": { bg: "bg-blue-50 text-blue-900 border-blue-300", text: "text-blue-800", border: "border-blue-300", dot: "bg-blue-600" },
  "Light Blue": { bg: "bg-cyan-50 text-cyan-900 border-cyan-300", text: "text-cyan-800", border: "border-cyan-300", dot: "bg-cyan-500" },
  Active: { bg: "bg-emerald-50 text-emerald-900 border-emerald-300", text: "text-emerald-800", border: "border-emerald-300", dot: "bg-emerald-500" },
  Idle: { bg: "bg-slate-50 text-slate-700 border-slate-200", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-300" },
};

export function LoomSummarySection() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LoomSummaryDataset | null>(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [selectedShiftId, setSelectedShiftId] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedLoomFilter, setSelectedLoomFilter] = useState<string>("ALL");

  // View Mode: "recipes" (Recipe-Wise) | "looms" (Loom-Wise 1-91)
  const [activeView, setActiveView] = useState<"recipes" | "looms">("recipes");
  const [selectedLoomModal, setSelectedLoomModal] = useState<LoomMachineSummaryItem | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate && selectedDate !== "ALL") params.set("date", selectedDate);
      if (selectedShiftId && selectedShiftId !== "ALL") params.set("shiftId", selectedShiftId);
      if (search.trim()) params.set("search", search.trim());
      if (selectedLoomFilter !== "ALL") params.set("loomNumber", selectedLoomFilter);

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
    } catch (err: any) {
      toast.error(err?.message || "Failed to load Loom Summary");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedShiftId, search, selectedLoomFilter]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const selectedShiftName = useMemo(() => {
    if (!data?.availableShifts || selectedShiftId === "ALL") return "All Shifts";
    const found = data.availableShifts.find((s) => s.id === selectedShiftId);
    return found ? found.name : "All Shifts";
  }, [data?.availableShifts, selectedShiftId]);

  const handleExportExcel = () => {
    if (!data) {
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
    if (!data) {
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

  const handleResetFilters = () => {
    setSelectedDate("ALL");
    setSelectedShiftId("ALL");
    setSearch("");
    setSelectedLoomFilter("ALL");
    toast.info("Reset filters to default");
  };

  const isFilterActive =
    selectedDate !== "ALL" ||
    selectedShiftId !== "ALL" ||
    search !== "" ||
    selectedLoomFilter !== "ALL";

  const kpis = data?.kpis;
  const recipeList: RecipeLoomSummaryItem[] = data?.recipeSummaries || [];
  const loomList: LoomMachineSummaryItem[] = data?.loomSummaries || [];

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full">
      {/* Top Header & Master Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-2xs min-w-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Loom Machine Allocations & Recipe Summary
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded border border-slate-200">
                1-91 Looms Live
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live shop-floor dispenses from Tape Plant Bobbin Issue mapped to Circular Looms 1–91.
            </p>
          </div>
        </div>

        {/* Master Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchSummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Reload live allocations from Tape Plant Bobbin Issue"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Print or save PDF of Loom Allocations in Tape Planning format"
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

      {/* Minimalist Bento KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Active Looms Running */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Active Running Looms
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-emerald-700 tracking-tight">
              {loading ? (
                <div className="h-6 w-16 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${kpis?.activeLoomsCount ?? 0} / 91`
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {kpis?.idleLoomsCount ?? 0} idle / unassigned looms
            </p>
          </div>
        </div>

        {/* Active Recipe Qualities */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Active Recipe Qualities
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-16 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${kpis?.uniqueRecipesCount ?? 0} Qualities`
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Distinct tape recipes in loom shed
            </p>
          </div>
        </div>

        {/* Total Crates Dispatched */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Crates Issued
            </span>
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${(kpis?.totalCratesDispatched ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })} crates`
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {(kpis?.totalBobbinsDispatched ?? 0).toLocaleString()} bobbins (@ 8/crate)
            </p>
          </div>
        </div>

        {/* Total Weight Dispatched (KG) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Dispatched Weight
            </span>
            <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-24 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${(kpis?.totalWeightDispatchedKg ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              12.8 kg per crate conversion
            </p>
          </div>
        </div>
      </div>

      {/* Filter & View Switcher Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Primary View Switcher */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveView("recipes")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeView === "recipes"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Recipe-Wise View ({recipeList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("looms")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeView === "looms"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Loom-Wise View (1-91 Looms)</span>
            </button>
          </div>

          {/* Date Presets & Shift Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Scope Pills */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setDatePreset("ALL")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  selectedDate === "ALL" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600"
                }`}
              >
                All (Till Date)
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("TODAY")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  selectedDate === new Date().toISOString().slice(0, 10) ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("YESTERDAY")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  selectedDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600"
                }`}
              >
                Yesterday
              </button>
            </div>

            {/* Custom Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate === "ALL" ? "" : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || "ALL")}
                className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            </div>

            {/* Shift Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedShiftId}
                onChange={(e) => setSelectedShiftId(e.target.value)}
                className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All Shifts</option>
                {data?.availableShifts?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Loom Filter */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-[10px] text-slate-400 uppercase">Loom:</span>
              <select
                value={selectedLoomFilter}
                onChange={(e) => setSelectedLoomFilter(e.target.value)}
                className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All 91 Looms</option>
                {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    Loom #{num}
                  </option>
                ))}
              </select>
            </div>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by recipe quality code, loom number (e.g. 14), operator..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: RECIPE-WISE ALLOCATION SCHEDULE                  */}
      {/* ======================================================== */}
      {activeView === "recipes" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Recipe Formulation Allocations ({recipeList.length} Qualities)
              </h3>
              <p className="text-[11px] text-slate-500">
                Shows which tape quality is assigned to which loom machine numbers
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Context: <strong>{selectedDate === "ALL" ? "All Dates" : selectedDate}</strong> • <strong>{selectedShiftName}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px] text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Recipe Quality</th>
                  <th className="py-2.5 px-3 text-center">Active Looms</th>
                  <th className="py-2.5 px-3">Assigned Loom Machines</th>
                  <th className="py-2.5 px-3 text-right">Crates</th>
                  <th className="py-2.5 px-3 text-right">Bobbins</th>
                  <th className="py-2.5 px-3 text-right">Dispatched Weight</th>
                  <th className="py-2.5 px-3 text-center">Latest Date</th>
                  <th className="py-2.5 px-3">Active Shifts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-600" />
                        <span>Loading recipe allocations from Bobbin Issue...</span>
                      </div>
                    </td>
                  </tr>
                ) : recipeList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center p-4">
                        <div className="p-3 bg-slate-100 text-slate-400 rounded-xl mb-2.5">
                          <Layers className="h-6 w-6" />
                        </div>
                        <h3 className="text-xs font-semibold text-slate-800">No Recipe Allocations Found</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 text-center">
                          {search
                            ? `No recipe records matching "${search}".`
                            : "No bobbin issues have been recorded for the selected date and shift filter."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recipeList.map((item, idx) => (
                    <tr key={item.recipeQuality} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                      <td className="py-3 px-3">
                        <RecipeQualityBadge value={item.recipeQuality} />
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                          {item.totalLoomsCount} {item.totalLoomsCount === 1 ? "Loom" : "Looms"}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {item.assignedLooms.length > 0 ? (
                            item.assignedLooms.map((loomNo) => (
                              <button
                                key={loomNo}
                                type="button"
                                onClick={() => {
                                  setSelectedLoomFilter(String(loomNo));
                                  setActiveView("looms");
                                }}
                                className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] rounded border border-blue-200 transition-colors cursor-pointer"
                                title={`Click to view Loom #${loomNo} in Loom View`}
                              >
                                #{loomNo}
                              </button>
                            ))
                          ) : item.assignedLoomIdentifiers.length > 0 ? (
                            item.assignedLoomIdentifiers.map((ident, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-800 font-bold text-[11px] rounded border border-slate-200">
                                {ident}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Loom Shed</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-purple-900">
                        {item.totalCratesIssued.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-normal text-slate-400">crates</span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold text-blue-900">
                        {item.totalBobbinsIssued.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-normal text-slate-400">pcs</span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                        {item.totalWeightIssuedKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                        <span className="text-[10px] font-normal text-slate-400">kg</span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-800">
                        {item.latestIssueDate}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-600">
                        {item.activeShifts.join(", ") || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: LOOM-WISE VIEW (LOOMS 1 TO 91 STATUS & MATRIX)    */}
      {/* ======================================================== */}
      {activeView === "looms" && (
        <div className="space-y-4">
          {/* Visual Interactive 1-91 Loom Chips Grid */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Circular Loom Shed Machine Grid (Looms 1 - 91)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Click on any machine chip to filter or inspect its active recipe formulation
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="font-semibold text-slate-700">Running ({kpis?.activeLoomsCount ?? 0})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 inline-block" />
                  <span className="text-slate-500">Idle / Unassigned ({kpis?.idleLoomsCount ?? 0})</span>
                </div>
              </div>
            </div>

            {/* 91-Machine Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-13 gap-1.5 max-h-72 overflow-y-auto p-1">
              {loomList.map((loom) => {
                const isSelected = selectedLoomFilter === String(loom.loomNumber);
                return (
                  <button
                    key={loom.loomNumber}
                    type="button"
                    onClick={() => {
                      setSelectedLoomFilter(isSelected ? "ALL" : String(loom.loomNumber));
                    }}
                    className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-800"
                        : loom.isActive
                        ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900 font-bold"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400 font-medium"
                    }`}
                    title={
                      loom.isActive
                        ? `Loom #${loom.loomNumber}: ${loom.activeRecipe} (${loom.totalCrates} crates / ${loom.totalWeightKg} kg)`
                        : `Loom #${loom.loomNumber}: Idle`
                    }
                  >
                    <span className="text-[11px] font-mono font-bold leading-none">
                      #{loom.loomNumber}
                    </span>
                    <span className="text-[8px] font-mono leading-none mt-1 truncate max-w-full">
                      {loom.isActive ? `${loom.totalCrates}c` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loom Table List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Loom Machines Status & Dispatched Recipes
                </h3>
                <p className="text-[11px] text-slate-500">
                  Detailed status, recipe allocations, and crate totals for each circular loom
                </p>
              </div>
              {selectedLoomFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedLoomFilter("ALL")}
                  className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer"
                >
                  Show All 91 Looms
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-16 text-center">Loom #</th>
                    <th className="py-2.5 px-3 text-center w-24">Status</th>
                    <th className="py-2.5 px-3">Active Recipe Quality</th>
                    <th className="py-2.5 px-3 text-right">Crates</th>
                    <th className="py-2.5 px-3 text-right">Weight</th>
                    <th className="py-2.5 px-3 text-center">Latest Date</th>
                    <th className="py-2.5 px-3">Latest Shift</th>
                    <th className="py-2.5 px-3">Issuer / Receiver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-slate-600" />
                          <span>Loading machines...</span>
                        </div>
                      </td>
                    </tr>
                  ) : loomList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        No loom machine records found.
                      </td>
                    </tr>
                  ) : (
                    loomList.map((loom) => (
                      <tr
                        key={loom.loomNumber}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          loom.isActive ? "bg-white" : "bg-slate-50/30"
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 text-xs">
                          #{loom.loomNumber}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              loom.isActive
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {loom.isActive ? "RUNNING" : "IDLE"}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          {loom.activeRecipe ? (
                            <RecipeQualityBadge value={loom.activeRecipe} />
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unassigned / Idle</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-purple-900">
                          {loom.totalCrates > 0 ? (
                            `${loom.totalCrates.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} c`
                          ) : (
                            <span className="text-slate-300 font-normal">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                          {loom.totalWeightKg > 0 ? (
                            `${loom.totalWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
                          ) : (
                            <span className="text-slate-300 font-normal">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700">
                          {loom.latestDate || "—"}
                        </td>

                        <td className="py-2.5 px-3 text-[11px] text-slate-700">
                          {loom.latestShiftName || "—"}
                        </td>

                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          {loom.lastIssuedBy ? (
                            <span>{loom.lastIssuedBy} {loom.lastReceivedBy ? `→ ${loom.lastReceivedBy}` : ""}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
