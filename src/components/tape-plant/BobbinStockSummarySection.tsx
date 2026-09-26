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
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Info,
  Calendar,
  Clock,
  Filter,
  RotateCcw,
  CheckCircle2,
  ArrowRightLeft,
  Send,
  Truck,
} from "lucide-react";
import { RecipeQualityBadge } from "./RecipeQualityBadge";
import { BobbinStockPrintPreviewModal } from "./BobbinStockPrintPreviewModal";
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
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Bento Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Output Done (kg) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Total Produced (Net)
            </span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Scale className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${totals.totalNetProductionKg.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
              <span>Gross: {totals.totalGrossDoneKg.toFixed(1)} kg</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600">Waste: {totals.totalWasteKg.toFixed(1)} kg</span>
            </p>
          </div>
        </div>

        {/* Total Issued to Looms */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Issued to Looms
            </span>
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-amber-950 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${(totals.totalIssuedKg ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              )}
            </div>
            <p className="text-[11px] font-medium text-amber-800/80 mt-1 flex items-center gap-1.5">
              <span>{(totals.totalIssuedCrates ?? 0).toFixed(2)} crates</span>
              <span className="text-amber-300">•</span>
              <span>{(totals.totalIssuedBobbins ?? 0).toFixed(2)} bobbins</span>
            </p>
          </div>
        </div>

        {/* Available Bobbin Stock (@ 1.6 kg) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Available Bobbin Stock
            </span>
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-blue-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${(totals.totalAvailableBobbinStock ?? totals.totalBobbinStock).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} pcs`
              )}
            </div>
            <p className="text-[11px] font-medium text-blue-700/80 mt-1 flex items-center gap-1.5">
              <span>Avail: {(totals.totalAvailableKg ?? totals.totalNetProductionKg).toFixed(1)} kg</span>
              <span className="text-blue-300">•</span>
              <span>@ {BOBBIN_WEIGHT_KG} kg/ea</span>
            </p>
          </div>
        </div>

        {/* Available Crate Stock (@ 12.8 kg) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
              Available Crate Stock
            </span>
            <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-purple-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${(totals.totalAvailableCrateStock ?? totals.totalCrateStock).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} crates`
              )}
            </div>
            <p className="text-[11px] font-medium text-purple-700/80 mt-1 flex items-center gap-1.5">
              <span>{totals.uniqueQualitiesCount} Recipe(s)</span>
              <span className="text-purple-300">•</span>
              <span>@ {CRATE_WEIGHT_KG} kg/crate</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Control Header & Optional Filter Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col gap-4 bg-slate-50/60">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Bobbin & Crate Stock Summary Table</h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {dateFilterMode === "all" ? "All Till Date (Cumulative)" : "Filtered Scope"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculates net inventory per recipe quality: <strong>Available = Net Output Done − Issued to Looms</strong>.
              </p>
            </div>

            {/* Global Actions */}
            <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
              {/* Quick Issue Button */}
              <button
                type="button"
                onClick={() => handleQuickIssue()}
                disabled={items.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-sm transition-colors disabled:opacity-50"
                title="Refresh Data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : "text-slate-500"}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={filteredItems.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-sm transition-colors disabled:opacity-50"
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                title="Export to Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* Optional Filters Bar */}
          <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date Scope Selector Pills */}
              <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDateFilterMode("all")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    dateFilterMode === "all"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All (Till Today)
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode("single")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    dateFilterMode === "single"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Single Date
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilterMode("range")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    dateFilterMode === "range"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Date Range
                </button>
              </div>

              {/* Conditional Date Pickers */}
              {dateFilterMode === "single" && (
                <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2.5 py-1 shadow-xs">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={selectedSingleDate}
                    onChange={(e) => setSelectedSingleDate(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
              )}

              {dateFilterMode === "range" && (
                <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2.5 py-1 shadow-xs">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 font-semibold">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  />
                </div>
              )}

              {/* Optional Shift Selector */}
              <div className="flex items-center gap-1.5 bg-white rounded-lg border border-slate-200 px-2.5 py-1 shadow-xs">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedShiftId}
                  onChange={(e) => setSelectedShiftId(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">All Shifts (Optional)</option>
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
                  title="Reset all filters to default"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset to All</span>
                </button>
              )}
            </div>

            {/* Live Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search quality name..."
                className="w-full pl-8 pr-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-3.5 w-12 text-center">#</th>
                <th className="py-3 px-3.5">Quality Name</th>
                <th className="py-3 px-3 text-right">Gross (kg)</th>
                <th className="py-3 px-3 text-right">Waste (kg)</th>
                <th className="py-3 px-3 text-right bg-emerald-50/60 text-emerald-900 border-x border-emerald-100">
                  Produced Net (kg)
                </th>
                <th className="py-3 px-3 text-right bg-amber-50/60 text-amber-900 border-r border-amber-100">
                  Issued to Looms <span className="text-[9px] font-medium text-amber-700 block normal-case">(Crates / KG)</span>
                </th>
                <th className="py-3 px-3 text-right bg-blue-50/60 text-blue-900 border-r border-blue-100">
                  Available Bobbins <span className="text-[9px] font-medium text-blue-700 block normal-case">(@ 1.6 kg)</span>
                </th>
                <th className="py-3 px-3 text-right bg-purple-50/60 text-purple-900 border-r border-purple-100">
                  Available Crates <span className="text-[9px] font-medium text-purple-700 block normal-case">(@ 12.8 kg)</span>
                </th>
                <th className="py-3 px-3 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      <span className="font-semibold">Loading Bobbin Stock summary...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center p-4">
                      <div className="p-3 bg-slate-100 text-slate-400 rounded-full mb-3">
                        <Boxes className="h-8 w-8" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">No Post-Production Data Found</h3>
                      <p className="text-xs text-slate-500 mt-1 text-center">
                        {searchTerm
                          ? `No recipes match "${searchTerm}". Try clearing your search.`
                          : "No recipe production records exist for the selected period."}
                      </p>
                      {onNavigateToPostProduction && !searchTerm && (
                        <button
                          type="button"
                          onClick={onNavigateToPostProduction}
                          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all"
                        >
                          <span>Open Post Production Sheet</span>
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
                  const availBobbins = item.availableBobbins ?? item.bobbinStock;
                  const availCrates = item.availableCrates ?? item.crateStock;
                  const availKg = item.availableKg ?? item.netProductionKg;

                  return (
                    <tr
                      key={item.id || item.slNo}
                      className="hover:bg-slate-50/80 transition-colors group font-medium"
                    >
                      {/* Serial Number */}
                      <td className="py-3.5 px-3.5 text-center font-bold text-slate-500">
                        {item.slNo}
                      </td>

                      {/* Quality Name */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <RecipeQualityBadge value={item.recipeQuality} />
                        </div>
                      </td>

                      {/* Gross Production Done in KG */}
                      <td className="py-3.5 px-3 text-right font-medium text-slate-600">
                        {item.productionDoneKg.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Wastage in KG */}
                      <td className="py-3.5 px-3 text-right font-medium text-rose-600">
                        {item.wasteKg > 0 ? (
                          item.wasteKg.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        ) : (
                          <span className="text-slate-300">0.00</span>
                        )}
                      </td>

                      {/* Net Production Done in KG */}
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-800 bg-emerald-50/30 border-x border-emerald-100/70">
                        {item.netProductionKg.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-[10px] font-semibold text-emerald-600">kg</span>
                      </td>

                      {/* Issued to Looms */}
                      <td className="py-3.5 px-3 text-right font-semibold text-amber-900 bg-amber-50/30 border-r border-amber-100/70">
                        {issuedCrates > 0 ? (
                          <div>
                            <span className="font-bold">{issuedCrates.toFixed(2)} cr</span>
                            <span className="text-[10px] text-amber-700 block">({issuedKg.toFixed(1)} kg)</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-normal">0.00</span>
                        )}
                      </td>

                      {/* Available Bobbin Stock (Net - Issued / 1.6) */}
                      <td className="py-3.5 px-3 text-right font-extrabold text-blue-900 bg-blue-50/30 border-r border-blue-100/70">
                        {availBobbins.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-[10px] font-semibold text-blue-600">pcs</span>
                      </td>

                      {/* Available Crate Stock (Net - Issued / 12.8) */}
                      <td className="py-3.5 px-3 text-right font-extrabold text-purple-900 bg-purple-50/30 border-r border-purple-100/70">
                        {availCrates.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-[10px] font-semibold text-purple-600">crates</span>
                      </td>

                      {/* Row Action: Quick Issue Button */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleQuickIssue(item.recipeQuality)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md shadow-2xs transition-all active:scale-95"
                          title={`Issue ${item.recipeQuality} to circular loom`}
                        >
                          <Send className="h-3 w-3" />
                          <span>Issue</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer with Grand Totals */}
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-xs text-slate-900">
                  <td colSpan={2} className="py-3.5 px-3.5 text-right uppercase tracking-wider">
                    Grand Total:
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-700">
                    {totals.totalGrossDoneKg.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3.5 px-3 text-right text-rose-600">
                    {totals.totalWasteKg.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3.5 px-3 text-right text-emerald-800 bg-emerald-100/80 border-x border-emerald-200">
                    {totals.totalNetProductionKg.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] font-bold text-emerald-700">kg</span>
                  </td>
                  <td className="py-3.5 px-3 text-right text-amber-900 bg-amber-100/80 border-r border-amber-200">
                    {(totals.totalIssuedKg ?? 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] font-bold text-amber-700">kg</span>
                  </td>
                  <td className="py-3.5 px-3 text-right text-blue-900 bg-blue-100/80 border-r border-blue-200">
                    {(totals.totalAvailableBobbinStock ?? totals.totalBobbinStock).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] font-bold text-blue-700">pcs</span>
                  </td>
                  <td className="py-3.5 px-3 text-right text-purple-900 bg-purple-100/80 border-r border-purple-200">
                    {(totals.totalAvailableCrateStock ?? totals.totalCrateStock).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] font-bold text-purple-700">crates</span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {onNavigateToBobbinIssue && (
                      <button
                        type="button"
                        onClick={onNavigateToBobbinIssue}
                        className="text-[11px] font-bold text-slate-700 hover:underline"
                      >
                        View Log &rarr;
                      </button>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Calculation Info Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong>Formulas:</strong> Available Stock = Net Produced (Gross − Waste) − Issued to Looms • <strong>1 bobbin = 1.6 kg</strong> • <strong>1 crate = 8 bobbins = 12.8 kg</strong>.
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
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

