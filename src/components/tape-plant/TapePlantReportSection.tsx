"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Download,
  Filter,
  Loader2,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  FileText,
  Layers,
  Users,
  Calendar,
  Clock,
  Trash2,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { RecipeQualityBadge } from "./RecipeQualityBadge";
import {
  TapePlantReportDataset,
  exportTapePlantReportsExcel,
} from "@/lib/tape-plant/reports-export";
import { printTapePlantReport } from "@/lib/tape-plant/print-report-sheet";

export type ReportSubTab =
  | "all"
  | "summary"
  | "shift"
  | "operator"
  | "waste"
  | "efficiency";

interface TapePlantReportSectionProps {
  shifts: { id: string; name: string }[];
}

export function TapePlantReportSection({ shifts }: TapePlantReportSectionProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TapePlantReportDataset | null>(null);
  const [activeTab, setActiveTab] = useState<ReportSubTab>("all");

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

  // Export handlers
  const handleExportActiveExcel = () => {
    if (!data || data.summary.length === 0) {
      toast.error("No report data available to export");
      return;
    }
    exportTapePlantReportsExcel({
      data,
      dateFrom,
      dateTo,
      mode: activeTab,
    });
    toast.success(`Exported ${activeTab.toUpperCase()} report to Excel`);
  };

  const handleExportConsolidatedExcel = () => {
    if (!data || data.summary.length === 0) {
      toast.error("No report data available to export");
      return;
    }
    exportTapePlantReportsExcel({
      data,
      dateFrom,
      dateTo,
      mode: "all",
    });
    toast.success("Exported Consolidated Master Excel Workbook (6 Sheets)");
  };

  const handlePrintActive = () => {
    if (!data || data.summary.length === 0) {
      toast.error("No report data available to print");
      return;
    }
    const selectedShift = shifts.find((s) => s.id === shiftFilter)?.name;
    printTapePlantReport({
      data,
      dateFrom,
      dateTo,
      mode: activeTab,
      filterShiftName: selectedShift,
      filterOperatorName: operatorFilter,
      filterRecipeQuality: recipeFilter,
    });
  };

  const handlePrintConsolidated = () => {
    if (!data || data.summary.length === 0) {
      toast.error("No report data available to print");
      return;
    }
    const selectedShift = shifts.find((s) => s.id === shiftFilter)?.name;
    printTapePlantReport({
      data,
      dateFrom,
      dateTo,
      mode: "all",
      filterShiftName: selectedShift,
      filterOperatorName: operatorFilter,
      filterRecipeQuality: recipeFilter,
    });
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
              Shift-wise and operator-wise performance breakdown, wastage benchmarking, and production logs.
            </p>
          </div>
        </div>

        {/* Master Actions */}
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

          {/* Individual Active View Exports */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={handlePrintActive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-xs font-semibold border-r border-slate-300 transition-colors cursor-pointer"
              title="Print or save PDF of current tab"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>PDF / Print</span>
            </button>
            <button
              type="button"
              onClick={handleExportActiveExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Export current tab to Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
          </div>

          {/* Consolidated Master Exports */}
          <div className="flex items-center rounded-lg bg-slate-900 text-white shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={handlePrintConsolidated}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-bold border-r border-slate-700 transition-colors cursor-pointer"
              title="Print complete 6-section consolidated report"
            >
              <Printer className="h-3.5 w-3.5 text-cyan-400" />
              <span>Print All (Master PDF)</span>
            </button>
            <button
              type="button"
              onClick={handleExportConsolidatedExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer"
              title="Download full 6-sheet consolidated Excel workbook"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Master Excel (6-Sheets)</span>
            </button>
          </div>
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

      {/* KPI Overview Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Target
          </span>
          <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {totals ? totals.totalPlannedKg.toLocaleString() : "—"}{" "}
            <span className="text-[11px] font-normal text-slate-400">KG</span>
          </p>
          <span className="text-[10px] text-slate-400">Planned output</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Actual Output
          </span>
          <p className="text-xl font-black text-emerald-800 font-mono mt-0.5">
            {totals ? totals.totalActualKg.toLocaleString() : "—"}{" "}
            <span className="text-[11px] font-normal text-emerald-500">KG</span>
          </p>
          <span className="text-[10px] text-emerald-600 font-semibold">
            Net: {totals ? totals.totalNetKg.toLocaleString() : "—"} KG
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Variance / Gap
          </span>
          <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {totals ? totals.totalGapKg.toLocaleString() : "—"}{" "}
            <span className="text-[11px] font-normal text-slate-400">KG</span>
          </p>
          <span className="text-[10px] text-amber-700 font-medium">Target vs Output</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
            Total Waste
          </span>
          <p className="text-xl font-black text-red-600 font-mono mt-0.5">
            {totals ? totals.totalWasteKg.toLocaleString() : "—"}{" "}
            <span className="text-[11px] font-normal text-red-400">KG</span>
          </p>
          <span className="text-[10px] text-red-700 font-bold">
            Rate: {totals ? `${totals.avgWastePercent.toFixed(2)}%` : "0%"}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Plant Efficiency
          </span>
          <p className="text-xl font-black text-blue-700 font-mono mt-0.5">
            {totals ? `${totals.avgEfficiencyPercent.toFixed(1)}%` : "—"}
          </p>
          <span className="text-[10px] text-blue-600 font-medium">Delivered / Target</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Coverage Scope
          </span>
          <p className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {totals ? totals.totalShiftsCount : 0}{" "}
            <span className="text-xs font-normal text-slate-500">Shifts</span>
          </p>
          <span className="text-[10px] text-slate-500">
            {totals ? totals.totalOperatorsCount : 0} Active Operator(s)
          </span>
        </div>
      </div>

      {/* Report View Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Master Overview (All)</span>
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
          <Clock className="h-4 w-4 text-cyan-400" />
          <span>Production Shift-Wise</span>
          {data && (
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 text-[10px] rounded-full">
              {data.shiftWise.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("operator")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "operator"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Users className="h-4 w-4 text-emerald-400" />
          <span>Production Operator-Wise</span>
          {data && (
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 text-[10px] rounded-full">
              {data.operatorWise.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("waste")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "waste"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Trash2 className="h-4 w-4 text-red-400" />
          <span>Wastage Breakdown</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("efficiency")}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "efficiency"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Zap className="h-4 w-4 text-amber-400" />
          <span>Efficiency Benchmark</span>
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
          <FileText className="h-4 w-4 text-blue-400" />
          <span>Production Summary (Logs)</span>
          {data && (
            <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 text-[10px] rounded-full">
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
        <div className="space-y-6">
          {/* TAB 1: MASTER OVERVIEW OR SHIFT-WISE TABLE */}
          {(activeTab === "all" || activeTab === "shift") && (
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
                      <th className="px-3 py-2 text-center w-8">#</th>
                      <th className="px-3 py-2">Shift Name</th>
                      <th className="px-3 py-2 text-center">Batches</th>
                      <th className="px-3 py-2 text-right">Planned (KG)</th>
                      <th className="px-3 py-2 text-right">Actual (KG)</th>
                      <th className="px-3 py-2 text-right">Variance (KG)</th>
                      <th className="px-3 py-2 text-right">Waste (KG)</th>
                      <th className="px-3 py-2 text-right">Waste %</th>
                      <th className="px-3 py-2 text-right">Net Output (KG)</th>
                      <th className="px-3 py-2 text-right">Efficiency %</th>
                      <th className="px-3 py-2 text-right">Share %</th>
                      <th className="px-3 py-2">Active Operators</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.shiftWise.map((s, idx) => (
                      <tr key={s.shiftId} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{s.shiftName}</td>
                        <td className="px-3 py-2.5 text-center font-mono">{s.recordCount}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">{s.plannedKg.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50/70">
                          {s.actualKg.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-amber-700">
                          {s.gapKg.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-red-600">
                          {s.wasteKg.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                          {s.wastePercent.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                          {s.netKg.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700">
                          {s.efficiencyPercent.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">
                          {s.productionShare.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 text-[11px]">
                          {s.operators.join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={2} className="px-3 py-2 text-right uppercase text-[10px]">
                        Total Shift Summary:
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{totals?.recordCount}</td>
                      <td className="px-3 py-2 text-right font-mono">{totals?.totalPlannedKg.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono font-black bg-slate-200">
                        {totals?.totalActualKg.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-amber-800">{totals?.totalGapKg.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-700">{totals?.totalWasteKg.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{totals?.avgWastePercent.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-900">{totals?.totalNetKg.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-blue-800">{totals?.avgEfficiencyPercent.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono">100%</td>
                      <td className="px-3 py-2">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: OPERATOR-WISE TABLE */}
          {(activeTab === "all" || activeTab === "operator") && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Production & Performance Operator-Wise Analysis
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {data.operatorWise.length} Operator(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse text-left">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-center w-8">#</th>
                      <th className="px-3 py-2">Operator Name</th>
                      <th className="px-3 py-2 text-center">Shifts Logged</th>
                      <th className="px-3 py-2 text-right">Target (KG)</th>
                      <th className="px-3 py-2 text-right">Actual Output (KG)</th>
                      <th className="px-3 py-2 text-right">Variance (KG)</th>
                      <th className="px-3 py-2 text-right">Waste (KG)</th>
                      <th className="px-3 py-2 text-right">Waste %</th>
                      <th className="px-3 py-2 text-right">Net Output</th>
                      <th className="px-3 py-2 text-right">Efficiency %</th>
                      <th className="px-3 py-2 text-right">Quality Score</th>
                      <th className="px-3 py-2 text-right">Share %</th>
                      <th className="px-3 py-2">Shifts Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.operatorWise.map((op, idx) => (
                      <tr key={op.operatorName} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{op.operatorName}</td>
                        <td className="px-3 py-2.5 text-center font-mono">{op.shiftCount}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">{op.plannedKg.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50/70">
                          {op.actualKg.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-amber-700">
                          {op.gapKg.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-red-600">
                          {op.wasteKg.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                          {op.wastePercent.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                          {op.netKg.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700">
                          {op.efficiencyPercent.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-700">
                          {op.qualityScore}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">
                          {op.productionShare.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 text-[11px]">
                          {op.shifts.join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={2} className="px-3 py-2 text-right uppercase text-[10px]">
                        Total Operator Summary:
                      </td>
                      <td className="px-3 py-2 text-center font-mono">{totals?.recordCount}</td>
                      <td className="px-3 py-2 text-right font-mono">{totals?.totalPlannedKg.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono font-black bg-slate-200">
                        {totals?.totalActualKg.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-amber-800">{totals?.totalGapKg.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-700">{totals?.totalWasteKg.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{totals?.avgWastePercent.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-900">{totals?.totalNetKg.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono text-blue-800">{totals?.avgEfficiencyPercent.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right font-mono">—</td>
                      <td className="px-3 py-2 text-right font-mono">100%</td>
                      <td className="px-3 py-2">—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: WASTAGE BREAKDOWN (SHIFT & OPERATOR) */}
          {(activeTab === "all" || activeTab === "waste") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Shift-wise Wastage */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-600" />
                    <h3 className="text-xs font-bold text-red-950 uppercase tracking-wider">
                      Wastage Shift-Wise Breakdown
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                    Benchmark ≤ 1.5%
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="px-3 py-2">Shift</th>
                        <th className="px-3 py-2 text-right">Output (KG)</th>
                        <th className="px-3 py-2 text-right">Waste (KG)</th>
                        <th className="px-3 py-2 text-right">Waste %</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.wasteShiftWise.map((w) => (
                        <tr key={w.shiftName} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-bold text-slate-800">{w.shiftName}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{w.actualKg.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-red-600">{w.wasteKg.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">{w.wastePercent.toFixed(2)}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
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
              </div>

              {/* Operator-wise Wastage */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-red-50/50 border-b border-red-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-600" />
                    <h3 className="text-xs font-bold text-red-950 uppercase tracking-wider">
                      Wastage Operator-Wise Breakdown
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                    Operator Control
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="px-3 py-2">Operator</th>
                        <th className="px-3 py-2 text-right">Output (KG)</th>
                        <th className="px-3 py-2 text-right">Waste (KG)</th>
                        <th className="px-3 py-2 text-right">Waste %</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.wasteOperatorWise.map((w) => (
                        <tr key={w.operatorName} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-bold text-slate-800">{w.operatorName}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{w.actualKg.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-red-600">{w.wasteKg.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">{w.wastePercent.toFixed(2)}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
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
              </div>
            </div>
          )}

          {/* TAB 4: EFFICIENCY BENCHMARK (SHIFT & OPERATOR) */}
          {(activeTab === "all" || activeTab === "efficiency") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Shift-wise Efficiency */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                      Efficiency Shift-Wise Benchmark
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Target ≥ 95%
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="px-3 py-2">Shift</th>
                        <th className="px-3 py-2 text-right">Target (KG)</th>
                        <th className="px-3 py-2 text-right">Actual (KG)</th>
                        <th className="px-3 py-2 text-right">Eff %</th>
                        <th className="px-3 py-2 text-center">Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.efficiencyShiftWise.map((e) => (
                        <tr key={e.shiftName} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-bold text-slate-800">{e.shiftName}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{e.plannedKg.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">{e.actualKg.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700">{e.efficiencyPercent.toFixed(1)}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
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

              {/* Operator-wise Efficiency */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                      Efficiency Operator-Wise Benchmark
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Quality Indexed
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="px-3 py-2">Operator</th>
                        <th className="px-3 py-2 text-right">Target (KG)</th>
                        <th className="px-3 py-2 text-right">Actual (KG)</th>
                        <th className="px-3 py-2 text-right">Eff %</th>
                        <th className="px-3 py-2 text-right">Score</th>
                        <th className="px-3 py-2 text-center">Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.efficiencyOperatorWise.map((e) => (
                        <tr key={e.operatorName} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-bold text-slate-800">{e.operatorName}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{e.plannedKg.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">{e.actualKg.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-700">{e.efficiencyPercent.toFixed(1)}%</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-700">{e.qualityScore || "—"}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
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

          {/* TAB 5: PRODUCTION SUMMARY (GRANULAR LOGS) */}
          {(activeTab === "all" || activeTab === "summary") && (
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
  );
}
