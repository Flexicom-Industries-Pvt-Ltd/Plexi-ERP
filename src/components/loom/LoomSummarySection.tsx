"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  LayoutGrid,
  Calendar,
  Clock,
  Layers,
  Activity,
  Package,
  Scale,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
  SlidersHorizontal,
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

  // Loom View Status Filter: "ALL" | "ACTIVE_ONLY"
  const [loomStatusFilter, setLoomStatusFilter] = useState<"ALL" | "ACTIVE_ONLY">("ALL");

  // Single Loom Quick-Assign Modal State
  const [singleLoomModalOpen, setSingleLoomModalOpen] = useState(false);
  const [assigningLoomNumber, setAssigningLoomNumber] = useState<number | null>(null);
  const [assigningQualityCode, setAssigningQualityCode] = useState<string>("");
  const [isSubmittingSingleAssign, setIsSubmittingSingleAssign] = useState(false);

  // Recipe Bulk Loom Allocator Modal State
  const [bulkRecipeModalOpen, setBulkRecipeModalOpen] = useState(false);
  const [bulkSelectedRecipe, setBulkSelectedRecipe] = useState<string>("");
  const [bulkSelectedLooms, setBulkSelectedLooms] = useState<number[]>([]);
  const [isSubmittingBulkAssign, setIsSubmittingBulkAssign] = useState(false);

  // Reset All Confirmation Modal State
  const [resetConfirmModalOpen, setResetConfirmModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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

  const recipeList: RecipeLoomSummaryItem[] = data?.recipeSummaries || [];
  const rawLoomList: LoomMachineSummaryItem[] = data?.loomSummaries || [];
  const availableRecipes = data?.availableRecipes || [];

  // Filtered Loom List for Loom-Wise View
  const displayedLoomList = useMemo(() => {
    if (loomStatusFilter === "ACTIVE_ONLY") {
      return rawLoomList.filter((l) => l.isActive);
    }
    return rawLoomList;
  }, [rawLoomList, loomStatusFilter]);

  // Single Loom Assign Handlers
  const handleOpenSingleLoomModal = (loomNo: number) => {
    const current = rawLoomList.find((l) => l.loomNumber === loomNo);
    setAssigningLoomNumber(loomNo);
    setAssigningQualityCode(current?.activeRecipe || availableRecipes[0]?.code || "");
    setSingleLoomModalOpen(true);
  };

  const handleSaveSingleLoomAssign = async (overrideCode?: string) => {
    if (assigningLoomNumber === null) return;
    const targetCode = overrideCode !== undefined ? overrideCode : assigningQualityCode;
    setIsSubmittingSingleAssign(true);
    try {
      const res = await fetch("/api/production/loom/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_LOOM",
          loomNumber: assigningLoomNumber,
          qualityCode: targetCode,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to assign loom");

      toast.success(result.message || `Loom #${assigningLoomNumber} assignment updated`);
      setSingleLoomModalOpen(false);
      await fetchSummary();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign quality to loom");
    } finally {
      setIsSubmittingSingleAssign(false);
    }
  };

  const handleUnassignSingleLoom = async () => {
    if (assigningLoomNumber === null) return;
    setIsSubmittingSingleAssign(true);
    try {
      const res = await fetch("/api/production/loom/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNASSIGN_LOOM",
          loomNumber: assigningLoomNumber,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to unassign loom");

      toast.success(result.message || `Loom #${assigningLoomNumber} set to Idle`);
      setSingleLoomModalOpen(false);
      await fetchSummary();
    } catch (err: any) {
      toast.error(err?.message || "Failed to unassign loom");
    } finally {
      setIsSubmittingSingleAssign(false);
    }
  };

  // Bulk Recipe Looms Allocator Handlers
  const handleOpenBulkRecipeModal = (recipeCode?: string) => {
    let targetCode = recipeCode;
    if (!targetCode) {
      targetCode = recipeList[0]?.recipeQuality || availableRecipes[0]?.code || "";
    }
    setBulkSelectedRecipe(targetCode);
    const existing = recipeList.find((r) => r.recipeQuality.toLowerCase() === targetCode?.toLowerCase());
    setBulkSelectedLooms(existing ? [...existing.assignedLooms] : []);
    setBulkRecipeModalOpen(true);
  };

  const handleSelectRecipeInBulkModal = (code: string) => {
    setBulkSelectedRecipe(code);
    const existing = recipeList.find((r) => r.recipeQuality.toLowerCase() === code.toLowerCase());
    setBulkSelectedLooms(existing ? [...existing.assignedLooms] : []);
  };

  const handleToggleBulkLoom = (loomNo: number) => {
    setBulkSelectedLooms((prev) =>
      prev.includes(loomNo) ? prev.filter((n) => n !== loomNo) : [...prev, loomNo].sort((a, b) => a - b)
    );
  };

  const handleSelectLoomRange = (start: number, end: number) => {
    setBulkSelectedLooms((prev) => {
      const range: number[] = [];
      for (let i = start; i <= end; i++) range.push(i);
      return Array.from(new Set([...prev, ...range])).sort((a, b) => a - b);
    });
  };

  const handleSaveBulkRecipeLooms = async () => {
    if (!bulkSelectedRecipe.trim()) {
      toast.error("Please select a recipe quality.");
      return;
    }
    setIsSubmittingBulkAssign(true);
    try {
      const res = await fetch("/api/production/loom/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_RECIPE_LOOMS",
          qualityCode: bulkSelectedRecipe.trim(),
          loomNumbers: bulkSelectedLooms,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to save loom allocations");

      toast.success(result.message || `Allocated ${bulkSelectedLooms.length} looms to "${bulkSelectedRecipe}"`);
      setBulkRecipeModalOpen(false);
      await fetchSummary();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save loom allocations");
    } finally {
      setIsSubmittingBulkAssign(false);
    }
  };

  const handleDeleteRecipeMapping = async (qualityCode: string) => {
    if (!confirm(`Are you sure you want to remove the loom allocations for "${qualityCode}"?`)) return;
    try {
      const res = await fetch("/api/production/loom/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_RECIPE_MAPPING",
          qualityCode,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete assignment");

      toast.success(`Removed loom assignments for "${qualityCode}"`);
      await fetchSummary();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete assignment");
    }
  };

  const handleResetAllToBlank = async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/production/loom/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_ALL_MAPPINGS",
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to reset assignments");

      toast.success("All circular loom assignments reset to blank.");
      setResetConfirmModalOpen(false);
      await fetchSummary();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset assignments");
    } finally {
      setIsResetting(false);
    }
  };

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
      recipeSummaries: recipeList,
      loomSummaries: displayedLoomList,
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
      activeView,
      selectedDate,
      selectedShiftId,
      selectedShiftName,
      search,
      selectedLoomFilter,
      showActiveOnly: loomStatusFilter === "ACTIVE_ONLY",
      recipeSummaries: recipeList,
      loomSummaries: displayedLoomList,
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
    setLoomStatusFilter("ALL");
    toast.info("Reset filters to default");
  };

  const isFilterActive =
    selectedDate !== "ALL" ||
    selectedShiftId !== "ALL" ||
    search !== "" ||
    selectedLoomFilter !== "ALL" ||
    loomStatusFilter !== "ALL";

  const kpis = data?.kpis;

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full font-sans text-slate-800">
      {/* 1. Header Toolbar (Minimalist, Sleek, Professional) */}
      <div className="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                Loom Machine Allocations
              </h1>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase rounded tracking-wider border border-slate-200">
                Manual Allocation
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Direct quality-to-loom machine assignments across Circular Looms 1–91.
            </p>
          </div>
        </div>

        {/* Actions Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => handleOpenBulkRecipeModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Assign Quality</span>
          </button>

          {/* Reset All to Blank Action */}
          <button
            type="button"
            onClick={() => setResetConfirmModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-medium rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
            title="Wipe all loom assignments to start completely fresh"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset to Blank</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchSummary}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Refresh allocations"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Print PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Print PDF of current schedule"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden md:inline">Print</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Export Excel spreadsheet"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 2. Sleek Minimalist KPIs Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Active Looms */}
        <div
          onClick={() => {
            setActiveView("looms");
            setLoomStatusFilter("ACTIVE_ONLY");
          }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs cursor-pointer hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Running Looms</span>
            <Activity className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">
              {kpis?.activeLoomsCount ?? 0}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 91 looms</span>
          </div>
        </div>

        {/* Assigned Qualities */}
        <div
          onClick={() => setActiveView("recipes")}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs cursor-pointer hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Active Formulations</span>
            <Layers className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">
              {recipeList.length}
            </span>
            <span className="text-xs text-slate-400">qualities</span>
          </div>
        </div>

        {/* Dispatched Crates */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Dispatched Crates</span>
            <Package className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">
              {(kpis?.totalCratesDispatched ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs text-slate-400">crates</span>
          </div>
        </div>

        {/* Total Weight */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Dispatched Weight</span>
            <Scale className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">
              {(kpis?.totalWeightDispatchedKg ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs text-slate-400">kg</span>
          </div>
        </div>
      </div>

      {/* 3. View Switcher & Minimalist Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveView("recipes")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeView === "recipes"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Recipe Schedule ({recipeList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView("looms")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeView === "looms"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Loom Shed (1–91)
            </button>
          </div>

          {/* Date & Shift Filter Strip */}
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setDatePreset("ALL")}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  selectedDate === "ALL" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("TODAY")}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  selectedDate === new Date().toISOString().slice(0, 10) ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600"
                }`}
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs">
              <Calendar className="h-3 w-3 text-slate-400" />
              <input
                type="date"
                value={selectedDate === "ALL" ? "" : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || "ALL")}
                className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs">
              <Clock className="h-3 w-3 text-slate-400" />
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

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Reset filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quality code, loom number (e.g. 14)..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/90 rounded-lg outline-none focus:border-slate-800 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. VIEW 1: RECIPE-WISE ALLOCATION SCHEDULE               */}
      {/* ======================================================== */}
      {activeView === "recipes" && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5">Recipe Quality</th>
                  <th className="py-2.5 px-3 text-center w-24">Looms</th>
                  <th className="py-2.5 px-3.5">Assigned Loom Numbers</th>
                  <th className="py-2.5 px-3 text-right">Crates</th>
                  <th className="py-2.5 px-3 text-right">Weight</th>
                  <th className="py-2.5 px-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
                        <span>Loading assignments...</span>
                      </div>
                    </td>
                  </tr>
                ) : recipeList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center justify-center p-4 text-center">
                        <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                          <Layers className="h-5 w-5" />
                        </div>
                        <h3 className="text-xs font-semibold text-slate-900">No Loom Allocations Configured</h3>
                        <p className="text-[11px] text-slate-500 mt-1">
                          No recipe qualities are currently assigned to looms. Click below to manually assign looms to a quality.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenBulkRecipeModal()}
                          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Assign First Quality</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recipeList.map((item, idx) => (
                    <tr key={item.recipeQuality} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-3.5">
                        <RecipeQualityBadge value={item.recipeQuality} />
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono text-[11px] border border-slate-200">
                          {item.totalLoomsCount} {item.totalLoomsCount === 1 ? "Loom" : "Looms"}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 font-mono">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {item.assignedLooms.map((loomNo) => (
                            <button
                              key={loomNo}
                              type="button"
                              onClick={() => handleOpenSingleLoomModal(loomNo)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-800 hover:text-blue-900 font-semibold text-[11px] rounded border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                              title={`Click to edit Loom #${loomNo}`}
                            >
                              #{loomNo}
                            </button>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                        {item.totalCratesIssued > 0 ? (
                          `${item.totalCratesIssued.toFixed(1)} c`
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                        {item.totalWeightIssuedKg > 0 ? (
                          `${item.totalWeightIssuedKg.toFixed(1)} kg`
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenBulkRecipeModal(item.recipeQuality)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Edit assigned looms"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecipeMapping(item.recipeQuality)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Delete this quality allocation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
      {/* 5. VIEW 2: LOOM-WISE VIEW (1–91 SHED MATRIX & TABLE)     */}
      {/* ======================================================== */}
      {activeView === "looms" && (
        <div className="space-y-3.5">
          {/* Visual Interactive Loom Chips Grid */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-900">
                  Loom Shed Machine Grid (1–91)
                </span>
                <span className="text-[11px] text-slate-400">
                  • Click any machine to assign or edit
                </span>
              </div>

              {/* Status Filter */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setLoomStatusFilter("ALL")}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                    loomStatusFilter === "ALL" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600"
                  }`}
                >
                  All (91)
                </button>
                <button
                  type="button"
                  onClick={() => setLoomStatusFilter("ACTIVE_ONLY")}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                    loomStatusFilter === "ACTIVE_ONLY" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-600"
                  }`}
                >
                  Active ({kpis?.activeLoomsCount ?? 0})
                </button>
              </div>
            </div>

            {/* 1–91 Grid */}
            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-13 gap-1.5 max-h-72 overflow-y-auto p-0.5">
              {displayedLoomList.map((loom) => {
                const isFiltered = selectedLoomFilter === String(loom.loomNumber);
                return (
                  <button
                    key={loom.loomNumber}
                    type="button"
                    onClick={() => handleOpenSingleLoomModal(loom.loomNumber)}
                    className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isFiltered
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-800"
                        : loom.isActive
                        ? "bg-emerald-50/80 hover:bg-emerald-100 border-emerald-300 text-emerald-900 font-bold"
                        : "bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-400 font-medium"
                    }`}
                    title={
                      loom.isActive
                        ? `Loom #${loom.loomNumber}: ${loom.activeRecipe} (Click to edit)`
                        : `Loom #${loom.loomNumber}: Idle (Click to assign)`
                    }
                  >
                    <span className="text-[11px] font-mono font-bold leading-none">
                      #{loom.loomNumber}
                    </span>
                    <span className="text-[7px] font-mono leading-none mt-1 truncate max-w-full">
                      {loom.isActive ? (loom.activeRecipe?.split("/")[0] || "Active") : "Idle"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Loom Machine Table */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3.5 w-16 text-center">Loom #</th>
                    <th className="py-2.5 px-3 text-center w-20">Status</th>
                    <th className="py-2.5 px-3.5">Assigned Quality</th>
                    <th className="py-2.5 px-3 text-right">Crates</th>
                    <th className="py-2.5 px-3 text-right">Weight</th>
                    <th className="py-2.5 px-3 text-center w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {displayedLoomList.map((loom) => (
                    <tr
                      key={loom.loomNumber}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        loom.isActive ? "bg-white" : "bg-slate-50/20 text-slate-400"
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center font-mono font-semibold text-slate-900">
                        #{loom.loomNumber}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            loom.isActive
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                        >
                          {loom.isActive ? "ACTIVE" : "IDLE"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5">
                        {loom.activeRecipe ? (
                          <RecipeQualityBadge value={loom.activeRecipe} />
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {loom.totalCrates > 0 ? `${loom.totalCrates.toFixed(1)} c` : "—"}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {loom.totalWeightKg > 0 ? `${loom.totalWeightKg.toFixed(1)} kg` : "—"}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenSingleLoomModal(loom.loomNumber)}
                          className="px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: SINGLE LOOM QUICK ASSIGN MODAL                  */}
      {/* ======================================================== */}
      {singleLoomModalOpen && assigningLoomNumber !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm bg-slate-900 text-white px-2 py-0.5 rounded">
                  #{assigningLoomNumber}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">
                  Assign Quality to Loom #{assigningLoomNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSingleLoomModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Recipe Quality:
                </label>
                <select
                  value={assigningQualityCode}
                  onChange={(e) => setAssigningQualityCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                >
                  <option value="">-- Choose Quality --</option>
                  {availableRecipes.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.code} {r.denier ? `(${r.denier}D / ${r.colour || "White"})` : ""}
                    </option>
                  ))}
                  {recipeList
                    .filter((r) => !availableRecipes.some((ar) => ar.code.toLowerCase() === r.recipeQuality.toLowerCase()))
                    .map((r) => (
                      <option key={r.recipeQuality} value={r.recipeQuality}>
                        {r.recipeQuality}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleUnassignSingleLoom}
                disabled={isSubmittingSingleAssign}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Unassign (Set Idle)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSingleLoomModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSingleLoomAssign()}
                  disabled={isSubmittingSingleAssign || !assigningQualityCode.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isSubmittingSingleAssign ? "Saving..." : "Save"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: BULK RECIPE LOOM ALLOCATOR MODAL                 */}
      {/* ======================================================== */}
      {bulkRecipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[90vh] flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Manual Loom Allocation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkRecipeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Recipe Quality Formulation:
                </label>
                <select
                  value={bulkSelectedRecipe}
                  onChange={(e) => handleSelectRecipeInBulkModal(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                >
                  {availableRecipes.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.code} {r.denier ? `(${r.denier}D / ${r.colour || "White"})` : ""}
                    </option>
                  ))}
                  {recipeList
                    .filter((r) => !availableRecipes.some((ar) => ar.code.toLowerCase() === r.recipeQuality.toLowerCase()))
                    .map((r) => (
                      <option key={r.recipeQuality} value={r.recipeQuality}>
                        {r.recipeQuality}
                      </option>
                    ))}
                </select>
              </div>

              {/* Looms Interactive Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    Allocated Looms: <strong>{bulkSelectedLooms.length}</strong> of 91
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBulkSelectedLooms(Array.from({ length: 91 }, (_, i) => i + 1))}
                      className="px-2 py-0.5 text-[10px] text-slate-600 hover:text-slate-900 bg-slate-100 rounded cursor-pointer"
                    >
                      All 91
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkSelectedLooms([])}
                      className="px-2 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Range Buttons */}
                <div className="flex flex-wrap gap-1">
                  {[
                    [1, 10],
                    [11, 20],
                    [21, 30],
                    [31, 40],
                    [41, 50],
                    [51, 60],
                    [61, 70],
                    [71, 80],
                    [81, 91],
                  ].map(([start, end]) => (
                    <button
                      key={`${start}-${end}`}
                      type="button"
                      onClick={() => handleSelectLoomRange(start, end)}
                      className="px-2 py-0.5 text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded cursor-pointer"
                    >
                      +{start}..{end}
                    </button>
                  ))}
                </div>

                {/* 1–91 Grid */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-13 gap-1.5 max-h-56 overflow-y-auto p-0.5">
                    {Array.from({ length: 91 }, (_, i) => i + 1).map((loomNo) => {
                      const isSelected = bulkSelectedLooms.includes(loomNo);
                      const currentOwner = rawLoomList.find((l) => l.loomNumber === loomNo)?.activeRecipe;
                      const isOtherOwner = currentOwner && currentOwner.toLowerCase() !== bulkSelectedRecipe.toLowerCase();

                      return (
                        <button
                          key={loomNo}
                          type="button"
                          onClick={() => handleToggleBulkLoom(loomNo)}
                          className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-bold"
                              : isOtherOwner
                              ? "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 font-medium"
                              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600 font-medium"
                          }`}
                          title={
                            isSelected
                              ? `Loom #${loomNo}: Selected for ${bulkSelectedRecipe}`
                              : isOtherOwner
                              ? `Loom #${loomNo}: Assigned to ${currentOwner}`
                              : `Loom #${loomNo}: Idle`
                          }
                        >
                          <span className="text-[11px] font-mono font-bold leading-none">
                            #{loomNo}
                          </span>
                          <span className="text-[7px] font-mono leading-none mt-1 truncate max-w-full">
                            {isSelected ? "Selected" : isOtherOwner ? "Other" : "Idle"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Remove all loom allocations for "${bulkSelectedRecipe}"?`)) {
                    handleDeleteRecipeMapping(bulkSelectedRecipe);
                    setBulkRecipeModalOpen(false);
                  }
                }}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                Delete Assignment
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkRecipeModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkRecipeLooms}
                  disabled={isSubmittingBulkAssign || !bulkSelectedRecipe.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isSubmittingBulkAssign ? "Saving..." : `Save ${bulkSelectedLooms.length} Looms`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: RESET TO BLANK CONFIRMATION MODAL               */}
      {/* ======================================================== */}
      {resetConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Reset All Loom Assignments to Blank?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  This will clear all 91 circular loom allocations and give you a completely clean, blank slate. You can then manually assign qualities to looms one by one.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAllToBlank}
                disabled={isResetting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs cursor-pointer"
              >
                {isResetting ? "Resetting..." : "Yes, Reset to Blank"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
