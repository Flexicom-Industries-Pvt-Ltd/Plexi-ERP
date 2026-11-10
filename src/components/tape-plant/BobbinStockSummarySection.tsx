"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Boxes,
  Package,
  Layers,
  Scale,
  Download,
  Printer,
  RefreshCw,
  Search,
  FileSpreadsheet,
  ArrowRight,
  Info,
  Calendar,
  Clock,
  RotateCcw,
  ArrowRightLeft,
  Send,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { RecipeQualityBadge } from "./RecipeQualityBadge";
import dynamic from "next/dynamic";

const BobbinStockPrintPreviewModal = dynamic(
  () => import("./BobbinStockPrintPreviewModal").then((m) => m.BobbinStockPrintPreviewModal),
  { ssr: false }
);
import { BobbinIssueModal } from "./BobbinIssueModal";
import { BobbinIssueSlipModal } from "./BobbinIssueSlipModal";
import { BobbinIssueSlipData } from "@/lib/tape-plant/print-bobbin-issue-slip";
import {
  BobbinStockItem,
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
  computeNetProductionKg,
  computeBobbinStockCount,
  computeCrateStockCount,
  computeBobbinStockTotals,
  formatDiscreteCrates,
  exportBobbinStockExcel,
  printBobbinStockSummary,
} from "@/lib/tape-plant/bobbin-stock";

interface ShiftOption {
  id: string;
  name: string;
}

interface BobbinStockSummarySectionProps {
  date?: string;
  shiftId?: string;
  shiftName?: string;
  onNavigateToPostProduction?: () => void;
  onNavigateToBobbinIssue?: () => void;
}

export function BobbinStockSummarySection({
  onNavigateToPostProduction,
  onNavigateToBobbinIssue,
}: BobbinStockSummarySectionProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Optional Filters: Default to All Till Date (Cumulative)
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "single" | "range">("all");
  const [selectedSingleDate, setSelectedSingleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("ALL");

  const [items, setItems] = useState<BobbinStockItem[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Bobbin Issue quick modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedQualityForIssue, setSelectedQualityForIssue] = useState<string>("");
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [activeSlipData, setActiveSlipData] = useState<BobbinIssueSlipData | null>(null);

  // Fetch available shifts master list
  useEffect(() => {
    fetch("/api/settings/master-data/shift")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setShifts(data);
        } else {
          setShifts([
            { id: "shift_day", name: "Day Shift (08:00 - 20:00)" },
            { id: "shift_night", name: "Night Shift (20:00 - 08:00)" },
            { id: "shift-a", name: "Shift A (06:00 - 14:00)" },
            { id: "shift-b", name: "Shift B (14:00 - 22:00)" },
            { id: "shift-c", name: "Shift C (22:00 - 06:00)" },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Bobbin Stock data from dedicated API
  const fetchBobbinStock = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("scope", dateFilterMode === "all" ? "all" : dateFilterMode);

        if (dateFilterMode === "single" && selectedSingleDate) {
          params.set("date", selectedSingleDate);
        } else if (dateFilterMode === "range") {
          if (dateFrom) params.set("dateFrom", dateFrom);
          if (dateTo) params.set("dateTo", dateTo);
        }

        if (selectedShiftId && selectedShiftId.toUpperCase() !== "ALL") {
          params.set("shiftId", selectedShiftId);
        }

        params.set("_t", String(Date.now()));

        const res = await fetch(`/api/production/tape-plant/bobbin-stock?${params.toString()}`, {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
          },
        });

        if (!res.ok) throw new Error("Failed to load bobbin stock");
        const data = await res.json();

        setItems(Array.isArray(data.items) ? data.items : []);

        if (isManual) {
          toast.success("Bobbin stock refreshed successfully");
        }
      } catch (err) {
        console.error("Error fetching bobbin stock data:", err);
        toast.error("Failed to load bobbin stock summary");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateFilterMode, selectedSingleDate, dateFrom, dateTo, selectedShiftId]
  );

  useEffect(() => {
    fetchBobbinStock();
  }, [fetchBobbinStock]);

  const handleResetFilters = () => {
    setDateFilterMode("all");
    setSelectedShiftId("ALL");
    setSearchTerm("");
    toast.info("Reset to All Till Date (Cumulative)");
  };

  const isFilterActive = dateFilterMode !== "all" || selectedShiftId !== "ALL" || searchTerm !== "";

  // Filter items by live search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return items.map((item, idx) => ({ ...item, slNo: idx + 1 }));
    }
    const q = searchTerm.toLowerCase();
    return items
      .filter((i) => i.recipeQuality.toLowerCase().includes(q))
      .map((item, idx) => ({ ...item, slNo: idx + 1 }));
  }, [items, searchTerm]);

  // Compute live summary totals
  const totals = useMemo(() => {
    return computeBobbinStockTotals(filteredItems);
  }, [filteredItems]);

  // Stock options formatted for BobbinIssueModal
  const availableStockOptions = useMemo(() => {
    return items.map((i) => ({
      recipeQuality: i.recipeQuality,
      availableCrates: i.availableCrates ?? i.crateStock,
      availableBobbins: i.availableBobbins ?? i.bobbinStock,
      availableKg: i.availableKg ?? i.netProductionKg,
    }));
  }, [items]);

  // Description for Exports & Prints
  const periodDescription = useMemo(() => {
    if (dateFilterMode === "all") {
      return `All Time (Till ${new Date().toISOString().slice(0, 10)})`;
    }
    if (dateFilterMode === "single") {
      return `Date: ${selectedSingleDate}`;
    }
    return `Range: ${dateFrom} to ${dateTo}`;
  }, [dateFilterMode, selectedSingleDate, dateFrom, dateTo]);

  const shiftDescription = useMemo(() => {
    if (selectedShiftId === "ALL") return "All Shifts";
    const found = shifts.find((s) => s.id === selectedShiftId);
    return found ? found.name : selectedShiftId;
  }, [selectedShiftId, shifts]);

  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      toast.error("No bobbin stock entries to export");
      return;
    }
    exportBobbinStockExcel({
      dateDescription: periodDescription,
      shiftDescription,
      items: filteredItems,
      totals,
    });
    toast.success("Excel report exported successfully");
  };

  const handlePrint = () => {
    if (filteredItems.length === 0) {
      toast.error("No bobbin stock entries to print");
      return;
    }
    setPreviewModalOpen(true);
  };

  const handleQuickIssue = (quality?: string) => {
    setSelectedQualityForIssue(quality || "");
    setIssueModalOpen(true);
  };

  const handleIssueSuccess = (issueData: BobbinIssueSlipData) => {
    fetchBobbinStock(false);
    setActiveSlipData(issueData);
    setSlipModalOpen(true);
  };

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full">
      {/* Consolidated 3 Bento Metric Cards (BUG-015) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total Produced (Net) */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Produced (Net)
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${totals.totalNetProductionKg.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
              <span>{totals.uniqueQualitiesCount} Recipe(s) Produced</span>
              <span>•</span>
              <span className="text-slate-600 font-mono">
                {formatDiscreteCrates(totals.totalProducedCrates, BOBBINS_PER_CRATE, true)}
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Issued to Looms */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Issued to Looms
            </span>
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${(totals.totalIssuedKg ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
              <span className="font-mono text-indigo-700">
                {formatDiscreteCrates(totals.totalIssuedCrates, BOBBINS_PER_CRATE, true)}
              </span>
              <span>•</span>
              <span>Loom Hall Dispatch</span>
            </p>
          </div>
        </div>

        {/* Card 3: Current Available Stock */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Current Available Stock
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${(totals.totalAvailableKg ?? totals.totalNetProductionKg).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
              <span className="font-mono text-emerald-700 font-bold">
                {formatDiscreteCrates(totals.totalAvailableCrateStock ?? totals.totalCrateStock, BOBBINS_PER_CRATE, false)}
              </span>
              <span>in Warehouse</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className={`bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-0 p-4 md:p-6 flex flex-col bg-background h-screen w-screen"
          : ""
      }`}>
        {/* Table Control Header & Optional Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
                title={isFullscreen ? "Collapse (Esc)" : "Expand to Fullscreen"}
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
                    <span>Expand</span>
                  </>
                )}
              </button>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Bobbin & Crate Stock Summary</h2>
              {/* Scope / Ledger Indicator (BUG-015) */}
              {dateFilterMode === "all" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cumulative Warehouse Balance (All-Time)
                </span>
              ) : dateFilterMode === "single" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                  <Clock className="h-3 w-3 text-amber-600" />
                  Single Shift Batch Stock ({selectedSingleDate} • {shiftDescription})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                  <Calendar className="h-3 w-3 text-blue-600" />
                  Date Range ({dateFrom} to {dateTo})
                </span>
              )}
            </div>

            {/* Global Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Issue Button */}
              <button
                type="button"
                onClick={() => handleQuickIssue()}
                disabled={items.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Issue Bobbins / Crates to Looms"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Issue to Loom</span>
              </button>

              {/* Refresh */}
              <button
                type="button"
                onClick={() => fetchBobbinStock(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-slate-700" : "text-slate-500"}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={filteredItems.length === 0}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Print Summary Sheet"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span className="hidden sm:inline">Print</span>
              </button>

              {/* Export Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredItems.length === 0}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Export to Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          {/* Optional Filters Bar */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Scope Selector Pills */}
              <div className="inline-flex rounded-md bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setDateFilterMode("all")}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                    dateFilterMode === "all"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All Till Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode("single")}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                    dateFilterMode === "single"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Single Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode("range")}
                  className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                    dateFilterMode === "range"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Range
                </button>
              </div>

              {/* Conditional Date Pickers */}
              {dateFilterMode === "single" && (
                <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <input
                    type="date"
                    value={selectedSingleDate}
                    onChange={(e) => setSelectedSingleDate(e.target.value)}
                    className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
              )}

              {dateFilterMode === "range" && (
                <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                  <span className="text-slate-400 text-[10px]">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
              )}

              {/* Optional Shift Selector */}
              <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs">
                <Clock className="h-3 w-3 text-slate-400" />
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="text-xs font-medium text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">All Shifts</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset filter button if active */}
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Reset all filters to default"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Live Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search quality name..."
                className="w-full pl-8 pr-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className={isFullscreen ? "overflow-auto flex-1" : "overflow-x-auto"}>
          <table className="w-full text-left border-collapse min-w-[850px] text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-medium text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3">Quality / Recipe</th>
                <th className="py-2.5 px-3 text-right">Produced Net (KG)</th>
                <th className="py-2.5 px-3 text-right">Issued to Looms (Crates / KG)</th>
                <th className="py-2.5 px-3 text-right">Available Balance</th>
                <th className="py-2.5 px-3 text-right">Available Crates</th>
                <th className="py-2.5 px-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-slate-600" />
                      <span className="font-medium">Loading Bobbin Stock summary...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center p-4">
                      <div className="p-3 bg-slate-100 text-slate-400 rounded-xl mb-2.5">
                        <Boxes className="h-6 w-6" />
                      </div>
                      <h3 className="text-xs font-semibold text-slate-800">No Post-Production Data Found</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 text-center">
                        {searchTerm
                          ? `No recipes match "${searchTerm}". Try clearing your search.`
                          : "No recipe production records exist for the selected period."}
                      </p>
                      {onNavigateToPostProduction && !searchTerm && (
                        <button
                          type="button"
                          onClick={onNavigateToPostProduction}
                          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                        >
                          <span>Open Post Production</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const issuedCrates = item.issuedCrates ?? 0;
                  const issuedKg = item.issuedKg ?? 0;
                  const availCrates = item.availableCrates ?? item.crateStock;
                  const availKg = item.availableKg ?? (item.netProductionKg - (item.issuedKg || 0));

                  return (
                    <tr
                      key={item.id || item.slNo}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Serial Number */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {item.slNo}
                      </td>

                      {/* Quality / Recipe */}
                      <td className="py-2.5 px-3">
                        <RecipeQualityBadge value={item.recipeQuality} />
                      </td>

                      {/* Produced Net in KG */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {item.netProductionKg.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-[10px] font-normal text-slate-400">kg</span>
                      </td>

                      {/* Issued to Looms (Discrete Whole Crates + Loose Bobbins & KG) */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        {issuedCrates > 0 ? (
                          <div>
                            <span className="font-semibold text-indigo-900">
                              {formatDiscreteCrates(issuedCrates, BOBBINS_PER_CRATE, true)}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({issuedKg.toFixed(1)} kg)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-normal">0 cr</span>
                        )}
                      </td>

                      {/* Available Balance in KG */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {availKg.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-[10px] font-normal text-slate-400">kg</span>
                      </td>

                      {/* Available Crates (Discrete Whole Crates + Loose Bobbins) */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block text-[11px]">
                          {formatDiscreteCrates(availCrates, BOBBINS_PER_CRATE, false)}
                        </span>
                      </td>

                      {/* Row Action: Quick Issue Button */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleQuickIssue(item.recipeQuality)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200/80 transition-colors cursor-pointer"
                          title={`Issue ${item.recipeQuality} to circular loom`}
                        >
                          <Send className="h-3 w-3 text-slate-500" />
                          <span>Issue</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Grand Totals (7 Streamlined Columns) */}
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 border-t border-slate-200 font-semibold text-xs text-slate-900">
                  <td colSpan={2} className="py-2.5 px-3 text-right text-slate-500 text-[11px] uppercase tracking-wider">
                    Grand Total:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {totals.totalNetProductionKg.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] font-normal text-slate-400">kg</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-900">
                    <div>
                      <span>{formatDiscreteCrates(totals.totalIssuedCrates, BOBBINS_PER_CRATE, true)}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        ({(totals.totalIssuedKg ?? 0).toFixed(1)} kg)
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {(totals.totalAvailableKg ?? totals.totalNetProductionKg).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] font-normal text-slate-400">kg</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                    <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block text-[11px]">
                      {formatDiscreteCrates(totals.totalAvailableCrateStock ?? totals.totalCrateStock, BOBBINS_PER_CRATE, false)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {onNavigateToBobbinIssue && (
                      <button
                        type="button"
                        onClick={onNavigateToBobbinIssue}
                        className="text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                      >
                        Log &rarr;
                      </button>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Calculation Info Footer */}
        <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span>
              Available Stock = Net Produced − Issued to Looms • <strong>1 bobbin = 1.6 kg</strong> • <strong>1 crate = 8 bobbins = 12.8 kg</strong>
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            Real-time stock ledger synchronised with Loom Issues and Production Output
          </div>
        </div>
      </div>

      {/* Interactive Bobbin Stock Print Preview Modal */}
      <BobbinStockPrintPreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        dateDescription={periodDescription}
        shiftDescription={shiftDescription}
        items={filteredItems}
        totals={totals}
      />

      {/* Interactive Bobbin Issue Launcher Modal */}
      <BobbinIssueModal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        onSuccess={handleIssueSuccess}
        defaultRecipeQuality={selectedQualityForIssue}
        availableStock={availableStockOptions}
      />

      {/* Slip Preview Modal after Issue */}
      <BobbinIssueSlipModal
        open={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        slipData={activeSlipData}
      />
    </div>
  );
}
