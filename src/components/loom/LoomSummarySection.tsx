"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  LayoutGrid,
  Layers,
  Activity,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
  SlidersHorizontal,
  Lock,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  LoomSummaryDataset,
  exportLoomSummaryExcel,
} from "@/lib/loom/loom-summary-export";
import { printLoomSummary } from "@/lib/loom/print-loom-summary";
import { RecipeQualityBadge } from "../tape-plant/RecipeQualityBadge";
import { RecipeLoomSummaryItem, LoomMachineSummaryItem } from "@/lib/loom/loom-summary-types";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";

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

  // Filters (Persistent Lifetime Mapping - No Date or Shift Filters)
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mobile Collapsible Cards State (Default Collapsed on Load)
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());

  const toggleExpandRecipe = (recipeQuality: string) => {
    setExpandedRecipes((prev) => {
      const next = new Set(prev);
      if (next.has(recipeQuality)) next.delete(recipeQuality);
      else next.add(recipeQuality);
      return next;
    });
  };

  const expandAllRecipes = () => {
    setExpandedRecipes(new Set(recipeList.map((r) => r.recipeQuality)));
  };

  const collapseAllRecipes = () => {
    setExpandedRecipes(new Set());
  };

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
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
  }, [search, selectedLoomFilter]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

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

    // Pre-occupied check on single assign
    const currentLoom = rawLoomList.find((l) => l.loomNumber === assigningLoomNumber);
    const currentOwner = currentLoom?.activeRecipe;
    if (
      currentOwner &&
      targetCode &&
      currentOwner.toLowerCase() !== targetCode.toLowerCase()
    ) {
      toast.error(
        `Loom #${assigningLoomNumber} is already allocated to "${currentOwner}". Please unassign (Set Idle) first before assigning to "${targetCode}".`
      );
      return;
    }

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
    const currentOwner = rawLoomList.find((l) => l.loomNumber === loomNo)?.activeRecipe;
    const isOtherOwner = !!currentOwner && currentOwner.toLowerCase() !== bulkSelectedRecipe.toLowerCase();

    if (isOtherOwner) {
      toast.error(
        `Loom #${loomNo} is currently occupied by "${currentOwner}". You cannot assign it to "${bulkSelectedRecipe}" without freeing it first.`
      );
      return;
    }

    setBulkSelectedLooms((prev) =>
      prev.includes(loomNo) ? prev.filter((n) => n !== loomNo) : [...prev, loomNo].sort((a, b) => a - b)
    );
  };

  const handleSelectLoomRange = (start: number, end: number) => {
    const validLooms: number[] = [];
    let blockedCount = 0;

    for (let i = start; i <= end; i++) {
      const currentOwner = rawLoomList.find((l) => l.loomNumber === i)?.activeRecipe;
      const isOtherOwner = !!currentOwner && currentOwner.toLowerCase() !== bulkSelectedRecipe.toLowerCase();
      if (!isOtherOwner) {
        validLooms.push(i);
      } else {
        blockedCount++;
      }
    }

    if (blockedCount > 0) {
      toast.info(`Skipped ${blockedCount} pre-occupied loom(s) in range #${start}..#${end}.`);
    }

    setBulkSelectedLooms((prev) => {
      return Array.from(new Set([...prev, ...validLooms])).sort((a, b) => a - b);
    });
  };

  const handleSelectAllAvailableLooms = () => {
    const validLooms: number[] = [];
    let blockedCount = 0;

    for (let i = 1; i <= 91; i++) {
      const currentOwner = rawLoomList.find((l) => l.loomNumber === i)?.activeRecipe;
      const isOtherOwner = !!currentOwner && currentOwner.toLowerCase() !== bulkSelectedRecipe.toLowerCase();
      if (!isOtherOwner) {
        validLooms.push(i);
      } else {
        blockedCount++;
      }
    }

    if (blockedCount > 0) {
      toast.info(`Selected ${validLooms.length} free/owned looms (skipped ${blockedCount} occupied looms).`);
    }

    setBulkSelectedLooms(validLooms);
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
      selectedDate: "Continuous Lifetime",
      selectedShiftId: "ALL",
      selectedShiftName: "All Shifts",
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
      selectedDate: "Continuous Lifetime",
      selectedShiftId: "ALL",
      selectedShiftName: "All Shifts",
      search,
      selectedLoomFilter,
      showActiveOnly: loomStatusFilter === "ACTIVE_ONLY",
      recipeSummaries: recipeList,
      loomSummaries: displayedLoomList,
    });
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedLoomFilter("ALL");
    setLoomStatusFilter("ALL");
    toast.info("Reset filters to default");
  };

  const isFilterActive =
    search !== "" ||
    selectedLoomFilter !== "ALL" ||
    loomStatusFilter !== "ALL";

  const kpis = data?.kpis;

  return (
    <div className="space-y-4 w-full min-w-0 max-w-full font-sans text-slate-800">
      {/* ======================================================== */}
      {/* DESKTOP VIEW (100% INTACT SPREADSHEETS & FULL GRID)      */}
      {/* ======================================================== */}
      <div className="hidden md:block space-y-4">
        {/* 1. Header Toolbar (Minimalist, Sleek, Professional) */}
        <div className="bg-white px-5 py-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Loom Machine Allocations
            </h1>
          </div>
        </div>

        {/* Actions Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => handleOpenBulkRecipeModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
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

      {/* 2. Sleek Minimalist KPIs Strip (Persistent Machine Allocation) */}
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

        {/* Idle Looms */}
        <div
          onClick={() => {
            setActiveView("looms");
            setLoomStatusFilter("ALL");
          }}
          className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs cursor-pointer hover:border-slate-300 transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Idle Looms</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">
              {kpis?.idleLoomsCount ?? Math.max(0, 91 - (kpis?.activeLoomsCount ?? 0))}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 91 idle</span>
          </div>
        </div>

        {/* Shed Capacity */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Shed Capacity</span>
            <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-slate-900">
              91
            </span>
            <span className="text-xs text-slate-400">Circular Looms</span>
          </div>
        </div>
      </div>

      {/* 3. View Switcher & Minimalist Filter Bar */}
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-6 shadow-2xl overflow-y-auto space-y-4"
            : "space-y-4"
        }
      >
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              {/* Top-Left Fullscreen Expand / Collapse Toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
                title={isFullscreen ? "Collapse back to normal view (Esc)" : "Expand sheet to fullscreen"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 text-sky-600" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 text-sky-600" />
                    <span>Expand</span>
                  </>
                )}
              </button>
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
            </div>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Reset filters"
              >
                Reset Filters
              </button>
            )}
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
            <table className="w-full text-left border-collapse min-w-[700px] text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                  <th className="py-2.5 px-3.5">Recipe Quality</th>
                  <th className="py-2.5 px-3 text-center w-24">Looms</th>
                  <th className="py-2.5 px-3.5">Assigned Loom Numbers</th>
                  <th className="py-2.5 px-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
                        <span>Loading assignments...</span>
                      </div>
                    </td>
                  </tr>
                ) : recipeList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
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
                          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
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
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <RecipeQualityBadge value={loom.activeRecipe} />
                              {(loom.size || loom.denier) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                                  {loom.size && <span>{loom.size}mm</span>}
                                  {loom.size && loom.denier && <span>•</span>}
                                  {loom.denier && <span>{loom.denier}D</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
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
    </div>
    </div>

      {/* ======================================================== */}
      {/* MOBILE CARD-BASED VIEW (DEFAULT COLLAPSED, TOUCH-FIRST)  */}
      {/* ======================================================== */}
      <div className="block md:hidden space-y-3">
        {/* Mobile Header Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 text-primary rounded-lg shrink-0">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Loom Machine Allocations
              </h2>
            </div>

            <button
              type="button"
              onClick={() => handleOpenBulkRecipeModal()}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Assign Quality</span>
            </button>
          </div>

          {/* Sub-bar with secondary actions */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-medium text-slate-500 font-mono">
              91 Circular Looms Shed
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
                title="Print PDF"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
                title="Export Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={fetchSummary}
                disabled={loading}
                className="p-1 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-slate-700" : "text-slate-500"}`} />
              </button>
            </div>
          </div>

          {/* Mobile 2x2 KPI Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
            <div
              onClick={() => {
                setActiveView("looms");
                setLoomStatusFilter("ACTIVE_ONLY");
              }}
              className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/80 cursor-pointer active:scale-98 transition-all"
            >
              <div className="flex items-center justify-between text-[10px] text-emerald-800 font-semibold uppercase">
                <span>Running Looms</span>
                <Activity className="h-3 w-3 text-emerald-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-emerald-950">
                  {kpis?.activeLoomsCount ?? 0}
                </span>
                <span className="text-[10px] font-mono text-emerald-700">/ 91</span>
              </div>
            </div>

            <div
              onClick={() => setActiveView("recipes")}
              className="bg-blue-50/60 p-2 rounded-lg border border-blue-200/80 cursor-pointer active:scale-98 transition-all"
            >
              <div className="flex items-center justify-between text-[10px] text-blue-800 font-semibold uppercase">
                <span>Active Qualities</span>
                <Layers className="h-3 w-3 text-blue-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-blue-950">
                  {recipeList.length}
                </span>
                <span className="text-[10px] text-blue-700">recipes</span>
              </div>
            </div>

            <div
              onClick={() => {
                setActiveView("looms");
                setLoomStatusFilter("ALL");
              }}
              className="bg-amber-50/60 p-2 rounded-lg border border-amber-200/80 cursor-pointer active:scale-98 transition-all"
            >
              <div className="flex items-center justify-between text-[10px] text-amber-800 font-semibold uppercase">
                <span>Idle Looms</span>
                <AlertTriangle className="h-3 w-3 text-amber-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-amber-950">
                  {kpis?.idleLoomsCount ?? Math.max(0, 91 - (kpis?.activeLoomsCount ?? 0))}
                </span>
                <span className="text-[10px] font-mono text-amber-700">/ 91 idle</span>
              </div>
            </div>

            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                <span>Shed Capacity</span>
                <LayoutGrid className="h-3 w-3 text-slate-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-slate-900">91</span>
                <span className="text-[10px] text-slate-500">Looms</span>
              </div>
            </div>
          </div>

          {/* View Switcher Pills */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-medium border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveView("recipes")}
              className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
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
              className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
                activeView === "looms"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Loom Shed (1–91)
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quality code, loom #..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/90 rounded-lg outline-none focus:border-slate-800 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* VIEW 1 (MOBILE): RECIPE ALLOCATIONS CARDS */}
        {activeView === "recipes" && (
          <div className="space-y-2">
            {/* List Control Strip (Expand All / Collapse All) */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-600">
              <span className="font-semibold text-slate-800">
                {recipeList.length} Recipe {recipeList.length === 1 ? "Allocation" : "Allocations"}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={expandAllRecipes}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  Expand All
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={collapseAllRecipes}
                  className="text-slate-500 hover:underline font-medium cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                <span>Loading loom allocations...</span>
              </div>
            ) : recipeList.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs space-y-2">
                <Layers className="h-6 w-6 mx-auto text-slate-400" />
                <p className="font-semibold text-slate-700">No Recipe Allocations</p>
                <p className="text-[11px] text-slate-400">Click &quot;Assign&quot; above to allocate looms to a quality formulation.</p>
              </div>
            ) : (
              recipeList.map((item, idx) => {
                const isExpanded = expandedRecipes.has(item.recipeQuality);
                return (
                  <div
                    key={item.recipeQuality}
                    id={`recipe-card-${idx}`}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Accordion Card Header */}
                    <div
                      onClick={() => toggleExpandRecipe(item.recipeQuality)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-mono font-bold text-slate-400 w-5 shrink-0 text-center">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <RecipeQualityBadge value={item.recipeQuality} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold font-mono text-[11px] border border-slate-200/80">
                          {item.totalLoomsCount} {item.totalLoomsCount === 1 ? "Loom" : "Looms"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Accordion Card Body */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 space-y-3 bg-slate-50/30">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Assigned Machines ({item.assignedLooms.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {item.assignedLooms.map((loomNo) => (
                              <button
                                key={loomNo}
                                type="button"
                                onClick={() => handleOpenSingleLoomModal(loomNo)}
                                className="px-2 py-1 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-900 font-mono font-bold text-xs rounded-lg border border-slate-200 hover:border-blue-300 shadow-2xs transition-colors cursor-pointer active:scale-95"
                                title={`Click to edit Loom #${loomNo}`}
                              >
                                #{loomNo}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => handleOpenBulkRecipeModal(item.recipeQuality)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                            <span>Edit Looms</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecipeMapping(item.recipeQuality)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50/70 border border-rose-200 rounded-lg hover:bg-rose-100/70 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 2 (MOBILE): LOOM SHED (1–91) MATRIX & LIST */}
        {activeView === "looms" && (
          <div className="space-y-3">
            {/* Filter Switcher Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">Shed Filter</span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setLoomStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    loomStatusFilter === "ALL"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600"
                  }`}
                >
                  All (91)
                </button>
                <button
                  type="button"
                  onClick={() => setLoomStatusFilter("ACTIVE_ONLY")}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    loomStatusFilter === "ACTIVE_ONLY"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600"
                  }`}
                >
                  Active ({kpis?.activeLoomsCount ?? 0})
                </button>
              </div>
            </div>

            {/* 5-Column Touch Grid */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 border-b border-slate-100">
                <span className="font-semibold text-slate-700">1–91 Machine Matrix</span>
                <span>Tap machine to assign</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 max-h-80 overflow-y-auto p-0.5">
                {displayedLoomList.map((loom) => {
                  const isFiltered = selectedLoomFilter === String(loom.loomNumber);
                  return (
                    <button
                      key={loom.loomNumber}
                      type="button"
                      onClick={() => handleOpenSingleLoomModal(loom.loomNumber)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center active:scale-95 ${
                        isFiltered
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : loom.isActive
                          ? "bg-emerald-50/80 hover:bg-emerald-100 border-emerald-300 text-emerald-900 font-bold"
                          : "bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-400 font-medium"
                      }`}
                    >
                      <span className="text-xs font-mono font-bold leading-none">
                        #{loom.loomNumber}
                      </span>
                      <span className="text-[8px] font-mono leading-none mt-1 truncate max-w-full">
                        {loom.isActive ? (loom.activeRecipe?.split("/")[0] || "Active") : "Idle"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Mobile Loom Cards List */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 px-1">
                Machines List ({displayedLoomList.length})
              </div>
              {displayedLoomList.map((loom) => (
                <div
                  key={loom.loomNumber}
                  className={`p-3 rounded-xl border shadow-2xs flex items-center justify-between gap-3 ${
                    loom.isActive
                      ? "bg-white border-slate-200/90"
                      : "bg-slate-50/50 border-slate-200/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col items-center shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-900">
                        #{loom.loomNumber}
                      </span>
                      <span
                        className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-full mt-0.5 ${
                          loom.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {loom.isActive ? "RUNNING" : "IDLE"}
                      </span>
                    </div>

                    <div className="min-w-0">
                      {loom.activeRecipe ? (
                        <div className="space-y-1">
                          <RecipeQualityBadge value={loom.activeRecipe} />
                          {(loom.size || loom.denier) && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                              {loom.size && <span>{loom.size} mm</span>}
                              {loom.size && loom.denier && <span>•</span>}
                              {loom.denier && <span>{loom.denier} D</span>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned Machine</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenSingleLoomModal(loom.loomNumber)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: SINGLE LOOM QUICK ASSIGN MODAL                  */}
      {/* ======================================================== */}
      {singleLoomModalOpen && assigningLoomNumber !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[92vh] flex flex-col">
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
              {(() => {
                const currentLoom = rawLoomList.find((l) => l.loomNumber === assigningLoomNumber);
                const currentOwner = currentLoom?.activeRecipe;
                if (!currentOwner) return null;
                return (
                  <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-semibold">Pre-Occupied Machine:</span> Loom #{assigningLoomNumber} is assigned to recipe <strong>{currentOwner}</strong>. To reassign it to a different recipe, click <strong>Unassign (Set Idle)</strong> first.
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Recipe Quality:
                </label>
                <UniversalQualityInput
                  value={assigningQualityCode}
                  onChange={(code) => setAssigningQualityCode(code)}
                  options={availableRecipes.map((r) => ({
                    code: r.code,
                    colour: r.colour || undefined,
                    denier: r.denier,
                    tapeType: r.tapeType || undefined,
                    colorGroup: r.colorGroup || undefined,
                    size: r.size ? `${r.size}mm` : r.reedSpaceCm ? `${r.reedSpaceCm * 10}mm` : undefined,
                  }))}
                  placeholder="— Search / Select / Type Quality —"
                  inputClassName="h-9 font-semibold"
                />
              </div>

              {/* Dynamic Auto-Fetched Quality Specs */}
              {(() => {
                const selectedSpec = availableRecipes.find((r) => r.code === assigningQualityCode);
                if (!selectedSpec) return null;
                return (
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Auto Size (Width)</span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedSpec.size ? `${selectedSpec.size} mm` : selectedSpec.reedSpaceCm ? `${selectedSpec.reedSpaceCm} cm` : "—"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Auto Denier (DNR)</span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedSpec.denier ? `${selectedSpec.denier} D` : "—"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Color Group</span>
                      <span className="font-semibold text-slate-700">
                        {selectedSpec.colorGroup || "Standard"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Auto-Fetched Specs End */}
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg md:max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[92vh] flex flex-col">
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
                <UniversalQualityInput
                  value={bulkSelectedRecipe}
                  onChange={(code) => handleSelectRecipeInBulkModal(code)}
                  options={availableRecipes.map((r) => ({
                    code: r.code,
                    colour: r.colour || undefined,
                    denier: r.denier,
                    tapeType: r.tapeType || undefined,
                    colorGroup: r.colorGroup || undefined,
                    size: r.size ? `${r.size}mm` : r.reedSpaceCm ? `${r.reedSpaceCm * 10}mm` : undefined,
                  }))}
                  placeholder="— Search / Select / Type Quality —"
                  inputClassName="h-9 font-semibold"
                />
              </div>

              {/* Dynamic Auto-Fetched Specs for Bulk Selected Recipe */}
              {(() => {
                const selectedSpec = availableRecipes.find((r) => r.code === bulkSelectedRecipe);
                if (!selectedSpec) return null;
                return (
                  <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Auto Size (Width)</span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedSpec.size ? `${selectedSpec.size} mm` : selectedSpec.reedSpaceCm ? `${selectedSpec.reedSpaceCm} cm` : "—"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Auto Denier (DNR)</span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedSpec.denier ? `${selectedSpec.denier} D` : "—"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Color Group</span>
                      <span className="font-semibold text-slate-700">
                        {selectedSpec.colorGroup || "Standard"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Dynamic Auto-Fetched Specs End */}

              {/* Looms Interactive Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    Allocated Looms: <strong>{bulkSelectedLooms.length}</strong> of 91
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSelectAllAvailableLooms}
                      className="px-2 py-0.5 text-[10px] text-slate-600 hover:text-slate-900 bg-slate-100 rounded cursor-pointer"
                      title="Select all free and currently allocated looms for this recipe"
                    >
                      All Available
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
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-13 gap-1.5 max-h-56 overflow-y-auto p-0.5">
                    {Array.from({ length: 91 }, (_, i) => i + 1).map((loomNo) => {
                      const isSelected = bulkSelectedLooms.includes(loomNo);
                      const currentOwner = rawLoomList.find((l) => l.loomNumber === loomNo)?.activeRecipe;
                      const isOtherOwner = !!currentOwner && currentOwner.toLowerCase() !== bulkSelectedRecipe.toLowerCase();

                      return (
                        <button
                          key={loomNo}
                          type="button"
                          onClick={() => handleToggleBulkLoom(loomNo)}
                          disabled={isOtherOwner}
                          className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                            isSelected
                              ? "bg-primary text-white border-primary shadow-2xs font-bold cursor-pointer"
                              : isOtherOwner
                              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                              : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 font-medium cursor-pointer"
                          }`}
                          title={
                            isSelected
                              ? `Loom #${loomNo}: Selected for ${bulkSelectedRecipe}`
                              : isOtherOwner
                              ? `Loom #${loomNo}: Occupied by "${currentOwner}" (Locked - unassign first)`
                              : `Loom #${loomNo}: Free / Idle`
                          }
                        >
                          <div className="flex items-center gap-0.5">
                            {isOtherOwner && <Lock className="h-2.5 w-2.5 text-slate-400 shrink-0" />}
                            <span className="text-[11px] font-mono font-bold leading-none">
                              #{loomNo}
                            </span>
                          </div>
                          <span className="text-[7px] font-mono leading-none mt-1 truncate max-w-full">
                            {isSelected ? "Selected" : isOtherOwner ? "Occupied" : "Idle"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-xs bg-primary inline-block" /> Selected
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-xs bg-white border border-slate-300 inline-block" /> Free / Idle
                      </span>
                      <span className="flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-slate-400 inline-block" /> Pre-Occupied (Locked)
                      </span>
                    </div>
                    <span>Single-click free loom to allocate</span>
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
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
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
