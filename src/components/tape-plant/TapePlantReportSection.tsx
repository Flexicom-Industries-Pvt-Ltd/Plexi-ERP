"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Download,
  Filter,
  Loader2,
  BarChart3,
  Clock,
  Printer,
  FileSpreadsheet,
  FileText,
  Users,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Zap,
} from "lucide-react";
import { RecipeQualityBadge } from "./RecipeQualityBadge";
import {
  TapePlantReportDataset,
  exportTapePlantReportsExcel,
} from "@/lib/tape-plant/reports-export";
import { printTapePlantReport } from "@/lib/tape-plant/print-report-sheet";

export type ReportSubTab =
  | "shift"
  | "summary"
  | "all"
  | "operator"
  | "waste"
  | "efficiency";

interface TapePlantReportSectionProps {
  shifts: { id: string; name: string }[];
}

export function TapePlantReportSection({ shifts }: TapePlantReportSectionProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TapePlantReportDataset | null>(null);
  const [activeTab, setActiveTab] = useState<ReportSubTab>("shift");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOperatorBenchmarks, setShowOperatorBenchmarks] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [shiftFilter, setShiftFilter] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (shiftFilter) params.set("shiftId", shiftFilter);
      if (operatorFilter) params.set("operator", operatorFilter);
      if (recipeFilter) params.set("recipeQuality", recipeFilter);

      params.set("_t", String(Date.now()));
      const res = await fetch(`/api/production/tape-plant/reports?${params.toString()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (!res.ok) throw new Error("Failed to load reports");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load Tape Plant reports");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, shiftFilter, operatorFilter, recipeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Consolidated 2 Clean Export Handlers (BUG-017)
  const handlePrint = () => {
    if (!data || data.summary.length === 0) {
      toast.error("No report data available to print");
      return;
    }
    const selectedShift = shifts.find((s) => s.id === shiftFilter)?.name;
    const printMode = activeTab === "summary" ? "summary" : "shift";
    printTapePlantReport({
      data,
      dateFrom,
      dateTo,
      mode: printMode,
      filterShiftName: selectedShift,
      filterOperatorName: operatorFilter,
      filterRecipeQuality: recipeFilter,
    });
  };

  const handleExportExcel = () => {
    if (!data || data.summary.length === 0) {
      toast.error("No report data available to export");
      return;
    }
    const exportMode = activeTab === "summary" ? "summary" : "shift";
    exportTapePlantReportsExcel({
      data,
      dateFrom,
      dateTo,
      mode: exportMode,
    });
    toast.success(
      `Exported ${activeTab === "summary" ? "Detailed Batch Logs" : "Shift Performance Summary"} to Excel`
    );
  };

  const totals = data?.totals;

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full">
      {/* Top Header & Master Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs min-w-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 text-cyan-400 rounded-xl">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Tape Plant Production, Wastage & Efficiency Reports
              </h2>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded border border-slate-300">
                Enterprise Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Shift-wise performance breakdown, wastage benchmarking, and production logs.
            </p>
          </div>
        </div>

        {/* Master Actions (BUG-017 Consolidated into exactly 2 clean export buttons) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchReports}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="Reload latest data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Consolidated 2 Clean Export Buttons */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Print or save PDF report"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Export report to Excel spreadsheet"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 font-bold uppercase text-[11px] tracking-wider pr-2 border-r border-slate-200">
          <Filter className="h-3.5 w-3.5 text-slate-500" /> Filters:
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 font-medium outline-none focus:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 font-medium outline-none focus:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Shift:</span>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 font-medium outline-none focus:border-slate-800 cursor-pointer"
          >
            <option value="">All Shifts</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Operator:</span>
          <input
            type="text"
            placeholder="Filter operator name..."
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 outline-none focus:border-slate-800 w-36 sm:w-44 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Recipe:</span>
          <input
            type="text"
            placeholder="e.g. LPP-500-YL..."
            value={recipeFilter}
            onChange={(e) => setRecipeFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono text-slate-900 outline-none focus:border-slate-800 w-36 sm:w-48"
          />
        </div>

        {(shiftFilter || operatorFilter || recipeFilter) && (
          <button
            type="button"
            onClick={() => {
              setShiftFilter("");
              setOperatorFilter("");
              setRecipeFilter("");
            }}
            className="text-[11px] text-red-600 hover:text-red-700 font-bold ml-auto cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* 4 Core Executive KPI Scorecards (BUG-017) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Target Planned (KG) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Target Planned
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              Schedule
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {totals ? totals.totalPlannedKg.toLocaleString() : "—"}{" "}
            <span className="text-xs font-normal text-slate-400">KG</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Planned production target
          </span>
        </div>

        {/* 2. Actual Output (Gross KG) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              Actual Output
            </span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              Gross Output
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {totals ? totals.totalActualKg.toLocaleString() : "—"}{" "}
            <span className="text-xs font-normal text-slate-400">KG</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Variance:{" "}
            <strong className="text-amber-700 font-mono">
              {totals ? totals.totalGapKg.toLocaleString() : "—"} KG
            </strong>
          </span>
        </div>

        {/* 3. Waste (KG & %) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
              Waste (KG & %)
            </span>
            <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
              {totals ? `${totals.avgWastePercent.toFixed(2)}%` : "0%"}
            </span>
          </div>
          <p className="text-2xl font-black text-red-600 font-mono mt-1">
            {totals ? totals.totalWasteKg.toLocaleString() : "—"}{" "}
            <span className="text-xs font-normal text-red-400">KG</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Avg Waste Rate:{" "}
            <strong className="text-red-700 font-mono">
              {totals ? `${totals.avgWastePercent.toFixed(2)}%` : "0%"}
            </strong>
          </span>
        </div>

        {/* 4. Net Output Delivered (KG & Efficiency %) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Net Delivered
            </span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              {totals ? `${totals.avgEfficiencyPercent.toFixed(1)}% Eff` : "—"}
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-800 font-mono mt-1">
            {totals ? totals.totalNetKg.toLocaleString() : "—"}{" "}
            <span className="text-xs font-normal text-emerald-600">KG</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Plant Efficiency:{" "}
            <strong className="text-blue-700 font-mono">
              {totals ? `${totals.avgEfficiencyPercent.toFixed(1)}%` : "—"}
            </strong>
          </span>
        </div>
      </div>

      {/* Report View Container */}
      <div
        className={`space-y-4 ${
          isFullscreen
            ? "fixed inset-0 z-50 bg-background p-4 md:p-6 flex flex-col overflow-hidden"
            : ""
        }`}
      >
        {/* Report View Navigation: 2 Focused Views (BUG-017) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
            title={isFullscreen ? "Collapse (Esc)" : "Expand to Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 text-slate-600" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 text-slate-600" />
                <span>Expand</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("shift")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "shift"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Clock className={`h-4 w-4 ${activeTab === "shift" ? "text-cyan-400" : "text-slate-500"}`} />
            <span>Shift Performance Summary</span>
            {data && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                  activeTab === "shift"
                    ? "bg-slate-800 text-cyan-300"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {data.shiftWise.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "summary"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FileText className={`h-4 w-4 ${activeTab === "summary" ? "text-blue-400" : "text-slate-500"}`} />
            <span>Detailed Batch Logs</span>
            {data && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                  activeTab === "summary"
                    ? "bg-slate-800 text-blue-300"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {data.summary.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-7 w-7 animate-spin text-slate-700 mb-2" />
            <p className="text-xs font-bold text-slate-800">Calculating Tape Plant Report Aggregates...</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Aggregating shifts, operators, waste matrices, and efficiencies</p>
          </div>
        ) : !data || data.summary.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-500 text-xs">
            No production records match the selected date range ({dateFrom} to {dateTo}) and filters.
          </div>
        ) : (
          <div className={isFullscreen ? "flex-1 overflow-auto space-y-6" : "space-y-6"}>
            {/* VIEW 1: SHIFT PERFORMANCE SUMMARY (BUG-017 Simplified to 7 Columns) */}
            {activeTab === "shift" && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-700" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Production & Performance Shift-Wise Analysis
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {data.shiftWise.length} Shift Group(s)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse text-left">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        <tr>
                          <th className="px-3.5 py-2.5 text-center w-10">#</th>
                          <th className="px-3.5 py-2.5">Shift</th>
                          <th className="px-3.5 py-2.5 text-right">Planned (KG)</th>
                          <th className="px-3.5 py-2.5 text-right">Actual (KG)</th>
                          <th className="px-3.5 py-2.5 text-right">Waste (KG & %)</th>
                          <th className="px-3.5 py-2.5 text-right">Net Output (KG)</th>
                          <th className="px-3.5 py-2.5 text-right">Efficiency %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {data.shiftWise.map((s, idx) => (
                          <tr key={s.shiftId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3.5 py-2.5 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-slate-900">
                              {s.shiftName}
                              <span className="block text-[10px] font-normal text-slate-500">
                                {s.recordCount} batch{s.recordCount !== 1 ? "es" : ""} • {s.operators.length} op{s.operators.length !== 1 ? "s" : ""}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                              {s.plannedKg.toLocaleString()}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                              {s.actualKg.toLocaleString()}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-red-600">
                              {s.wasteKg.toLocaleString()}{" "}
                              <span className="text-[10px] font-normal text-slate-500">
                                ({s.wastePercent.toFixed(2)}%)
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                              {s.netKg.toLocaleString()}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono font-bold text-blue-700">
                              {s.efficiencyPercent.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                          <td colSpan={2} className="px-3.5 py-2.5 text-right uppercase text-[10px]">
                            Total Shift Summary:
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-slate-700">
                            {totals?.totalPlannedKg.toLocaleString()}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-black bg-slate-200">
                            {totals?.totalActualKg.toLocaleString()}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-red-700">
                            {totals?.totalWasteKg.toLocaleString()}{" "}
                            <span className="text-[10px] font-normal text-slate-600">
                              ({totals?.avgWastePercent.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-emerald-900 bg-emerald-100/50">
                            {totals?.totalNetKg.toLocaleString()}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-blue-900">
                            {totals?.avgEfficiencyPercent.toFixed(1)}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Collapsible Operator & Benchmark Intelligence */}
                <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowOperatorBenchmarks((prev) => !prev)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-700" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Operator Performance & Wastage Benchmarks ({data.operatorWise.length} Operators)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <span>{showOperatorBenchmarks ? "Hide" : "Show Details"}</span>
                      {showOperatorBenchmarks ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {showOperatorBenchmarks && (
                    <div className="p-4 space-y-4 border-t border-slate-200 bg-slate-50/40">
                      {/* Operator-wise Table */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                          <span>Operator Performance Breakdown</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            {data.operatorWise.length} Operator(s)
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse text-left">
                            <thead className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                              <tr>
                                <th className="px-3 py-2 text-center w-8">#</th>
                                <th className="px-3 py-2">Operator Name</th>
                                <th className="px-3 py-2 text-center">Shifts</th>
                                <th className="px-3 py-2 text-right">Target (KG)</th>
                                <th className="px-3 py-2 text-right">Actual (KG)</th>
                                <th className="px-3 py-2 text-right">Waste (KG & %)</th>
                                <th className="px-3 py-2 text-right">Net Output (KG)</th>
                                <th className="px-3 py-2 text-right">Eff %</th>
                                <th className="px-3 py-2 text-right">Quality Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {data.operatorWise.map((op, idx) => (
                                <tr key={op.operatorName} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 text-center font-bold text-slate-400">{idx + 1}</td>
                                  <td className="px-3 py-2 font-bold text-slate-900">{op.operatorName}</td>
                                  <td className="px-3 py-2 text-center font-mono">{op.shiftCount}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-600">{op.plannedKg.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                                    {op.actualKg.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-semibold text-red-600">
                                    {op.wasteKg.toLocaleString()}{" "}
                                    <span className="text-[10px] font-normal text-slate-500">
                                      ({op.wastePercent.toFixed(2)}%)
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                                    {op.netKg.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">
                                    {op.efficiencyPercent.toFixed(1)}%
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">
                                    {op.qualityScore}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Side-by-side Wastage & Efficiency Benchmarks */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Wastage Shift Benchmark */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <div className="px-3.5 py-2 bg-red-50/60 border-b border-red-100 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-red-950 uppercase">
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              <span>Shift Wastage Benchmark</span>
                            </div>
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                              ≤ 1.5% Target
                            </span>
                          </div>
                          <table className="w-full text-xs border-collapse text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                              <tr>
                                <th className="px-3 py-1.5">Shift</th>
                                <th className="px-3 py-1.5 text-right">Waste (KG)</th>
                                <th className="px-3 py-1.5 text-right">Waste %</th>
                                <th className="px-3 py-1.5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {data.wasteShiftWise.map((w) => (
                                <tr key={w.shiftName} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 font-semibold text-slate-800">{w.shiftName}</td>
                                  <td className="px-3 py-2 text-right font-mono text-red-600 font-semibold">{w.wasteKg.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{w.wastePercent.toFixed(2)}%</td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                        w.statusBenchmark === "OPTIMAL"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : w.statusBenchmark === "ACCEPTABLE"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-red-50 text-red-700 border-red-200"
                                      }`}
                                    >
                                      {w.statusBenchmark}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Efficiency Shift Benchmark */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                          <div className="px-3.5 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 uppercase">
                              <Zap className="h-3.5 w-3.5 text-blue-600" />
                              <span>Shift Efficiency Benchmark</span>
                            </div>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                              ≥ 95% Target
                            </span>
                          </div>
                          <table className="w-full text-xs border-collapse text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                              <tr>
                                <th className="px-3 py-1.5">Shift</th>
                                <th className="px-3 py-1.5 text-right">Actual (KG)</th>
                                <th className="px-3 py-1.5 text-right">Eff %</th>
                                <th className="px-3 py-1.5 text-center">Tier</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {data.efficiencyShiftWise.map((e) => (
                                <tr key={e.shiftName} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 font-semibold text-slate-800">{e.shiftName}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-900 font-semibold">{e.actualKg.toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">{e.efficiencyPercent.toFixed(1)}%</td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                        e.performanceTier === "TOP_TIER"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : e.performanceTier === "ON_TARGET"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      {e.performanceTier.replace(/_/g, " ")}
                                    </span>
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
            )}

            {/* VIEW 2: DETAILED BATCH LOGS (BUG-017 Focused Log Register) */}
            {activeTab === "summary" && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-700" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Detailed Production Log Register (Granular Batches)
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {data.summary.length} Records Found
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Shift</th>
                        <th className="px-3 py-2.5">Operator</th>
                        <th className="px-3 py-2.5">Recipe / Quality</th>
                        <th className="px-3 py-2.5 text-right">Planned (KG)</th>
                        <th className="px-3 py-2.5 text-right">Actual (KG)</th>
                        <th className="px-3 py-2.5 text-right">Gap (KG)</th>
                        <th className="px-3 py-2.5 text-right">Waste (KG)</th>
                        <th className="px-3 py-2.5 text-right">Waste %</th>
                        <th className="px-3 py-2.5 text-right">Net (KG)</th>
                        <th className="px-3 py-2.5 text-right">Efficiency %</th>
                        <th className="px-3 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.summary.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{row.date}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-600">{row.shiftName}</td>
                          <td className="px-3 py-2.5 font-medium text-slate-900">{row.operatorName}</td>
                          <td className="px-3 py-2.5">
                            <RecipeQualityBadge value={row.recipeQuality} />
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                            {row.plannedKg.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            {row.actualKg.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-700 font-semibold">
                            {row.gapKg.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-red-600 font-semibold">
                            {row.wasteKg.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                            {row.wastePercent.toFixed(2)}%
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                            {row.netKg.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700">
                            {row.efficiencyPercent.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                row.status === "SUBMITTED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
