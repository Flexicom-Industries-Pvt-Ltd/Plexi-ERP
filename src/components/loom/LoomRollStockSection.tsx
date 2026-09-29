"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Layers,
  Calendar,
  Clock,
  RotateCcw,
  Copy,
  Check,
  CheckCircle2,
  TrendingUp,
  Tag,
  Filter,
  X,
  SlidersHorizontal,
  Package,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  LoomRollStockItem,
  LoomRollStockSummary,
  LoomRollStockApiResponse,
  computeRollStockSummary,
} from "@/lib/loom/loom-roll-stock-types";
import { exportLoomRollStockExcel } from "@/lib/loom/loom-roll-stock-export";
import { LoomRollStockPrintModal } from "./LoomRollStockPrintModal";
import { RecipeQualityBadge } from "../tape-plant/RecipeQualityBadge";

export function LoomRollStockSection() {
  const [loading, setLoading] = useState(true);
  const [rolls, setRolls] = useState<LoomRollStockItem[]>([]);
  const [summary, setSummary] = useState<LoomRollStockSummary>({
    totalRolls: 0,
    totalMeters: 0,
    totalGrossWeightKg: 0,
    totalTareWeightKg: 0,
    totalNettWeightKg: 0,
    averageWeightPerMeter: 0,
    uniqueQualitiesCount: 0,
    uniqueLoomsCount: 0,
    qualityBreakdown: [],
    loomBreakdown: [],
  });

  const [availableQualities, setAvailableQualities] = useState<Array<{ code: string }>>([]);
  const [availableShifts, setAvailableShifts] = useState<Array<{ id: string; name: string }>>([]);
  const [availableLooms, setAvailableLooms] = useState<number[]>([]);

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<string>("ALL");
  const [selectedShift, setSelectedShift] = useState<string>("ALL");
  const [selectedLoom, setSelectedLoom] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "7DAYS" | "30DAYS">("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [copiedRoll, setCopiedRoll] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
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

  // Fetch function
  const fetchStockData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedQuality !== "ALL") params.append("quality", selectedQuality);
      if (selectedShift !== "ALL") params.append("shiftName", selectedShift);
      if (selectedLoom !== "ALL") params.append("loomNumber", selectedLoom);

      if (datePreset === "TODAY") {
        const today = new Date().toISOString().slice(0, 10);
        params.append("date", today);
      } else if (datePreset === "7DAYS") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.append("dateFrom", d.toISOString().slice(0, 10));
        params.append("dateTo", new Date().toISOString().slice(0, 10));
      } else if (datePreset === "30DAYS") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.append("dateFrom", d.toISOString().slice(0, 10));
        params.append("dateTo", new Date().toISOString().slice(0, 10));
      } else if (dateFrom || dateTo) {
        if (dateFrom) params.append("dateFrom", dateFrom);
        if (dateTo) params.append("dateTo", dateTo);
      }

      const res = await fetch(`/api/production/loom/roll-stock?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load stock data");
      }

      const data: LoomRollStockApiResponse = await res.json();
      setRolls(data.rolls || []);
      setSummary(data.summary);
      if (data.availableQualities) setAvailableQualities(data.availableQualities);
      if (data.availableShifts) setAvailableShifts(data.availableShifts);
      if (data.availableLooms) setAvailableLooms(data.availableLooms);
    } catch (err: any) {
      console.error("fetchStockData error:", err);
      toast.error(err.message || "Failed to fetch roll stock");
    } finally {
      setLoading(false);
    }
  }, [search, selectedQuality, selectedShift, selectedLoom, datePreset, dateFrom, dateTo]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Copy roll number to clipboard
  const handleCopyRoll = (rollNo: string) => {
    navigator.clipboard.writeText(rollNo);
    setCopiedRoll(rollNo);
    toast.success(`Copied "${rollNo}" to clipboard`);
    setTimeout(() => setCopiedRoll(null), 1800);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setSelectedQuality("ALL");
    setSelectedShift("ALL");
    setSelectedLoom("ALL");
    setDatePreset("ALL");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    Boolean(search) ||
    selectedQuality !== "ALL" ||
    selectedShift !== "ALL" ||
    selectedLoom !== "ALL" ||
    datePreset !== "ALL" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedQuality !== "ALL") parts.push(`Quality: ${selectedQuality}`);
    if (selectedLoom !== "ALL") parts.push(`Loom #${selectedLoom}`);
    if (selectedShift !== "ALL") parts.push(`Shift: ${selectedShift}`);
    if (datePreset === "TODAY") parts.push("Today");
    else if (datePreset === "7DAYS") parts.push("Last 7 Days");
    else if (datePreset === "30DAYS") parts.push("Last 30 Days");
    else if (dateFrom || dateTo) parts.push(`Date: ${dateFrom || "..."} to ${dateTo || "..."}`);
    if (search) parts.push(`Search: "${search}"`);
    return parts.length > 0 ? parts.join(" • ") : "All Active Floor Stock";
  }, [selectedQuality, selectedLoom, selectedShift, datePreset, dateFrom, dateTo, search]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-700 border border-sky-200/90 rounded-xl shadow-xs">
            <Layers className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Roll Stock
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                Circular Loom Stock
              </span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {summary.totalRolls} Rolls
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live inventory of rolls produced and cut from the Circular Loom floor
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => exportLoomRollStockExcel({ rolls, summary, filterLabel })}
            disabled={rolls.length === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setPrintModalOpen(true)}
            disabled={rolls.length === 0}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="h-4 w-4" />
            <span>Print Stock Sheet</span>
          </button>

          <button
            onClick={fetchStockData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Top Bento KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Rolls in Stock */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Rolls in Stock
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {summary.totalRolls.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase">Rolls</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {summary.uniqueLoomsCount} active circular looms
          </p>
        </div>

        {/* Card 2: Total Quantity (Meters) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Quantity (Length)
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {summary.totalMeters.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-sky-700 uppercase">Meters</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total linear fabric length in floor stock
          </p>
        </div>

        {/* Card 3: Total Quantity (Nett Weight) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Quantity (Weight)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight">
              {summary.totalNettWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-emerald-700 uppercase">KG Nett</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Gross: {summary.totalGrossWeightKg.toFixed(1)} kg • Tare: {summary.totalTareWeightKg.toFixed(1)} kg
          </p>
        </div>

        {/* Card 4: Active Qualities & Avg Weight */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Qualities in Stock
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-900 font-mono tracking-tight">
              {summary.uniqueQualitiesCount}
            </span>
            <span className="text-xs font-bold text-purple-700 uppercase">Qualities</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Overall Linear Mass: <strong className="text-purple-900">{summary.averageWeightPerMeter.toFixed(1)} g/m</strong>
          </p>
        </div>
      </div>

      {/* 3. Quality Breakdown Pill Strip */}
      {summary.qualityBreakdown.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse"></span>
              <span>Stock by Quality (Click to filter):</span>
            </div>
            {selectedQuality !== "ALL" && (
              <button
                onClick={() => setSelectedQuality("ALL")}
                className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
              >
                Clear Quality Filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setSelectedQuality("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedQuality === "ALL"
                  ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50 hover:text-sky-800 hover:border-sky-200"
              }`}
            >
              All Qualities ({summary.totalRolls} rolls • {summary.totalNettWeightKg.toFixed(0)} kg)
            </button>

            {summary.qualityBreakdown.map((q) => {
              const isSelected = selectedQuality === q.qualityType;
              return (
                <button
                  key={q.qualityType}
                  onClick={() => setSelectedQuality(isSelected ? "ALL" : q.qualityType)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                      : "bg-sky-50/70 text-sky-800 border-sky-200 hover:bg-sky-100 hover:border-sky-300"
                  }`}
                >
                  <span>{q.qualityType}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-sm text-[10px] font-mono ${
                      isSelected ? "bg-white/20 text-white" : "bg-sky-100 text-sky-700 font-bold"
                    }`}
                  >
                    {q.rollsCount} rolls • {q.totalNettWeightKg.toFixed(0)} kg
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Minimalist Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Roll Number (e.g. CT-14376), Quality, Loom #, Contractor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quality Select Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium cursor-pointer"
            >
              <option value="ALL">All Qualities</option>
              {availableQualities.map((q) => (
                <option key={q.code} value={q.code}>
                  {q.code}
                </option>
              ))}
            </select>
          </div>

          {/* Loom # Select */}
          <div className="w-full md:w-40">
            <select
              value={selectedLoom}
              onChange={(e) => setSelectedLoom(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium cursor-pointer"
            >
              <option value="ALL">All Looms</option>
              {availableLooms.map((loomNo) => (
                <option key={loomNo} value={String(loomNo)}>
                  Loom #{loomNo}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Select */}
          <div className="w-full md:w-40">
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-medium cursor-pointer"
            >
              <option value="ALL">All Shifts</option>
              <option value="DAY">Day Shift</option>
              <option value="NIGHT">Night Shift</option>
              {availableShifts.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date presets & Custom Range */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-semibold mr-1">Date:</span>
            {(["ALL", "TODAY", "7DAYS", "30DAYS"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setDatePreset(preset);
                  setDateFrom("");
                  setDateTo("");
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  datePreset === preset && !dateFrom && !dateTo
                    ? "bg-sky-600 text-white font-bold shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {preset === "ALL"
                  ? "All Time"
                  : preset === "TODAY"
                  ? "Today"
                  : preset === "7DAYS"
                  ? "Last 7 Days"
                  : "Last 30 Days"}
              </button>
            ))}

            <div className="flex items-center gap-1 ml-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDatePreset("ALL");
                }}
                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"
                title="From Date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDatePreset("ALL");
                }}
                className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"
                title="To Date"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Roll Stock Main Table */}
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-6 shadow-2xl overflow-hidden"
            : "bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
        }
      >
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
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
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Roll Stock Inventory Register
            </h2>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              ({rolls.length} rolls shown)
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Scope: <span className="font-semibold text-slate-800">{filterLabel}</span>
          </div>
        </div>

        <div className={isFullscreen ? "overflow-x-auto overflow-y-auto flex-1 border rounded-lg bg-card" : "overflow-x-auto min-w-full"}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-10 text-center font-semibold text-slate-500">#</th>
                <th className="py-2.5 px-3 w-32 font-bold text-slate-700">Roll Number</th>
                <th className="py-2.5 px-3 min-w-[200px] font-bold text-slate-700">Quality / Recipe</th>
                <th className="py-2.5 px-3 w-32 text-right font-bold text-slate-700">Quantity (Meters)</th>
                <th className="py-2.5 px-3 w-36 text-right font-bold text-emerald-700">Quantity (Nett Kg)</th>
                <th className="py-2.5 px-3 w-24 text-center font-bold text-sky-700">Loom #</th>
                <th className="py-2.5 px-3 w-20 text-center font-semibold text-slate-600">Size</th>
                <th className="py-2.5 px-3 w-28 text-right font-semibold text-slate-600">Gross Wt</th>
                <th className="py-2.5 px-3 w-24 text-right font-semibold text-slate-500">Tare Wt</th>
                <th className="py-2.5 px-3 w-24 text-right font-semibold text-purple-700">Linear Mass</th>
                <th className="py-2.5 px-3 w-28 text-center font-semibold text-slate-600">Cut Date</th>
                <th className="py-2.5 px-3 w-24 text-center font-semibold text-slate-600">Shift</th>
                <th className="py-2.5 px-3 min-w-[140px] font-semibold text-slate-600">Contractor</th>
                <th className="py-2.5 px-3 min-w-[140px] font-semibold text-slate-500">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                      <p className="text-xs font-semibold">Loading live roll stock inventory...</p>
                    </div>
                  </td>
                </tr>
              ) : rolls.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">No rolls found matching your criteria</p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your search terms, date range, or quality filters.
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 text-white cursor-pointer transition-all"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                rolls.map((r, idx) => (
                  <tr
                    key={r.id || idx}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                      {idx + 1}
                    </td>

                    {/* Roll Number with Quick Copy */}
                    <td className="py-2.5 px-3">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 group-hover:border-slate-300">
                          {r.rollNumber || "—"}
                        </span>
                        <button
                          onClick={() => handleCopyRoll(r.rollNumber)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Copy Roll Number"
                        >
                          {copiedRoll === r.rollNumber ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Quality */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center">
                        <RecipeQualityBadge value={r.qualityType} />
                      </div>
                    </td>

                    {/* Quantity (Meters) */}
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {r.meter !== undefined && r.meter !== null ? Number(r.meter).toLocaleString() : "0"}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">m</span>
                    </td>

                    {/* Quantity (Nett Weight Kg) */}
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-mono font-black text-emerald-700 text-xs">
                        {r.nettWeightKg !== undefined && r.nettWeightKg !== null
                          ? Number(r.nettWeightKg).toFixed(2)
                          : "0.00"}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 ml-1">kg</span>
                    </td>

                    {/* Loom # */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 font-mono font-bold text-sky-800 bg-sky-50 border border-sky-200 rounded text-xs">
                        #{r.loomNumber}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {r.size ? `${r.size} mm` : "—"}
                    </td>

                    {/* Gross Weight */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      {r.grossWeightKg !== undefined && r.grossWeightKg !== null
                        ? Number(r.grossWeightKg).toFixed(2)
                        : "0.00"}
                    </td>

                    {/* Tare Weight */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {r.tareWeightKg !== undefined && r.tareWeightKg !== null
                        ? Number(r.tareWeightKg).toFixed(2)
                        : "1.20"}
                    </td>

                    {/* Linear Mass (Avg Weight per Meter) */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-purple-700">
                      {r.avgWeightPerMeter !== undefined && r.avgWeightPerMeter !== null
                        ? `${Number(r.avgWeightPerMeter).toFixed(1)} g/m`
                        : "0.0 g/m"}
                    </td>

                    {/* Cut Date */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700 text-[11px]">
                      {r.date || "—"}
                    </td>

                    {/* Shift */}
                    <td className="py-2.5 px-3 text-center text-slate-600 text-[11px] font-medium">
                      {r.shiftName || "—"}
                    </td>

                    {/* Contractor */}
                    <td className="py-2.5 px-3 text-slate-700 font-medium truncate max-w-[140px]">
                      {r.contractor || "In-House"}
                    </td>

                    {/* Remarks */}
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-[140px]">
                      {r.remarks || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer with Totals */}
            {rolls.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/80 border-t-2 border-slate-200 text-slate-800 font-mono font-bold text-xs">
                  <td colSpan={3} className="py-3 px-3 text-right font-sans font-bold uppercase tracking-wider text-slate-700">
                    TOTAL ({rolls.length} ROLLS):
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900">
                    {summary.totalMeters.toLocaleString()} m
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-black">
                    {summary.totalNettWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-center text-slate-400 font-sans">
                    —
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">
                    {summary.totalGrossWeightKg.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">
                    {summary.totalTareWeightKg.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-purple-800">
                    {summary.averageWeightPerMeter.toFixed(1)} g/m
                  </td>
                  <td colSpan={4} className="py-3 px-3 text-center text-slate-400 font-sans">
                    —
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 6. Print Preview Modal */}
      {printModalOpen && (
        <LoomRollStockPrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          rolls={rolls}
          summary={summary}
          filterLabel={filterLabel}
        />
      )}
    </div>
  );
}
