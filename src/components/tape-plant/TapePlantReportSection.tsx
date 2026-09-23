"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, Filter, Loader2, BarChart3, TrendingUp, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { RecipeQualityBadge } from "./RecipeQualityBadge";

interface ReportSummaryItem {
  id: string;
  date: string;
  shiftId: string;
  shiftName: string;
  recipeQuality: string;
  plannedKg: number;
  actualKg: number;
  gapKg: number;
  wasteKg: number;
  wastePercent: number;
  netKg: number;
  efficiencyPercent: number;
  status: string;
}

interface ReportData {
  summary: ReportSummaryItem[];
  totals: {
    totalPlannedKg: number;
    totalActualKg: number;
    totalGapKg: number;
    totalWasteKg: number;
    totalNetKg: number;
  };
  count: number;
}

interface TapePlantReportSectionProps {
  shifts: { id: string; name: string }[];
}

export function TapePlantReportSection({ shifts }: TapePlantReportSectionProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [shiftFilter, setShiftFilter] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (shiftFilter) params.set("shiftId", shiftFilter);
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
  }, [dateFrom, dateTo, shiftFilter, recipeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportCsv = () => {
    if (!data || data.summary.length === 0) {
      toast.error("No data available to export");
      return;
    }

    const headers = [
      "Date",
      "Shift",
      "Recipe / Quality",
      "Planned KG",
      "Actual KG",
      "Gap KG",
      "Waste KG",
      "Waste %",
      "Net KG",
      "Efficiency %",
      "Status",
    ];

    const rows = data.summary.map((item) => [
      item.date,
      item.shiftName,
      item.recipeQuality,
      item.plannedKg,
      item.actualKg,
      item.gapKg,
      item.wasteKg,
      `${item.wastePercent}%`,
      item.netKg,
      `${item.efficiencyPercent}%`,
      item.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tape_plant_report_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV report exported successfully");
  };

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">6. Tape Plant Reports & Analytics</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Production output, waste analysis, and shift efficiency metrics in spreadsheet view.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReports}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[11px]">
          <Filter className="h-3.5 w-3.5" /> Filters:
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Shift:</span>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">All Shifts</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Recipe:</span>
          <input
            type="text"
            placeholder="STYM/LPP/YL/500/64/HC"
            value={recipeFilter}
            onChange={(e) => setRecipeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 outline-none focus:ring-1 focus:ring-primary w-40 sm:w-56"
          />
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Planned Output</p>
          <p className="text-2xl font-black text-slate-800 mt-1 font-mono">
            {totals ? totals.totalPlannedKg.toLocaleString() : "—"}{" "}
            <span className="text-xs font-normal text-slate-400">KG</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Across selected shifts</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase">Total Actual Produced</p>
          <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
            {totals ? totals.totalActualKg.toLocaleString() : "—"}{" "}
            <span className="text-xs font-normal text-emerald-500">KG</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Net: {totals ? totals.totalNetKg.toLocaleString() : "—"} KG
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-red-600 uppercase">Total Plant Waste</p>
          <p className="text-2xl font-black text-red-600 mt-1 font-mono">
            {totals ? totals.totalWasteKg.toLocaleString() : "—"}{" "}
            <span className="text-xs font-normal text-red-400">KG</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Avg Waste:{" "}
            {totals && totals.totalActualKg > 0
              ? `${((totals.totalWasteKg / totals.totalActualKg) * 100).toFixed(2)}%`
              : "0.00%"}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-blue-600 uppercase">Avg Shift Efficiency</p>
          <p className="text-2xl font-black text-blue-700 mt-1 font-mono">
            {totals && totals.totalPlannedKg > 0
              ? `${((totals.totalActualKg / totals.totalPlannedKg) * 100).toFixed(1)}%`
              : "100.0%"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Output vs target</p>
        </div>
      </div>

      {/* Production Summary Spreadsheet Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Production Summary Table
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {data ? `${data.count} shift records found` : "Loading..."}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 text-xs">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
            Loading report records...
          </div>
        ) : !data || data.summary.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">
            No production records match the selected date range and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px]">Date</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px]">Shift</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px]">Recipe / Quality</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px] text-right">Planned (KG)</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px] text-right">Actual (KG)</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px] text-right">Gap (KG)</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px] text-right">Waste (KG)</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px] text-right">Waste %</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px] text-right">Net Output (KG)</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px] text-right">Efficiency %</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 uppercase text-[11px] text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.summary.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{row.date}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-600">{row.shiftName}</td>
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
        )}
      </div>
    </div>
  );
}
