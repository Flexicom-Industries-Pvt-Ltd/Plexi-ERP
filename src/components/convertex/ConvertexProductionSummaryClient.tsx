"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, subDays, startOfMonth } from "date-fns";
import { toast } from "sonner";
import {
  BarChart3,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  Clock,
  Scissors,
  Layers,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  Tag,
  CheckCircle2,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { ConvertexSummaryResult } from "@/lib/convertex/convertex-types";
import { ConvertexSummaryPrintModal } from "./ConvertexSummaryPrintModal";
import { exportConvertexSummaryExcel } from "@/lib/convertex/convertex-export";

export function ConvertexProductionSummaryClient() {
  const [dateFrom, setDateFrom] = useState<string>(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [shiftName, setShiftName] = useState<string>("ALL");
  const [machineNo, setMachineNo] = useState<string>("ALL");
  const [qualitySearch, setQualitySearch] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"qualities" | "wastage">("qualities");
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<ConvertexSummaryResult | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (shiftName && shiftName !== "ALL") params.set("shiftName", shiftName);
      if (machineNo && machineNo !== "ALL") params.set("machineNo", machineNo);
      if (qualitySearch.trim()) params.set("quality", qualitySearch.trim());

      const res = await fetch(`/api/production/convertex/summary?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load Convertex summary");
      }

      const json = await res.json();
      if (json.summary) {
        setSummaryData(json.summary);
        setLastRefreshedAt(format(new Date(), "hh:mm a"));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Convertex summary");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, shiftName, machineNo, qualitySearch]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const dateRangeLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
    if (dateFrom) return `From ${dateFrom}`;
    if (dateTo) return `Up to ${dateTo}`;
    return "All Time";
  }, [dateFrom, dateTo]);

  const setQuickRange = (range: "today" | "7d" | "30d" | "month" | "all") => {
    const today = new Date();
    if (range === "today") {
      const d = format(today, "yyyy-MM-dd");
      setDateFrom(d);
      setDateTo(d);
    } else if (range === "7d") {
      setDateFrom(format(subDays(today, 7), "yyyy-MM-dd"));
      setDateTo(format(today, "yyyy-MM-dd"));
    } else if (range === "30d") {
      setDateFrom(format(subDays(today, 30), "yyyy-MM-dd"));
      setDateTo(format(today, "yyyy-MM-dd"));
    } else if (range === "month") {
      setDateFrom(format(startOfMonth(today), "yyyy-MM-dd"));
      setDateTo(format(today, "yyyy-MM-dd"));
    } else if (range === "all") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const overall = summaryData?.overall || {
    totalReports: 0,
    totalRolls: 0,
    totalRollMtr: 0,
    totalNetWt: 0,
    avgGsm: 0,
    totalProductionPcs: 0,
    totalProductionKg: 0,
    totalCoverPatchOs: 0,
    totalCoverPatchDs: 0,
    totalValvePatch: 0,
    totalWastageKg: 0,
    totalWastagePct: 0,
    totalNetProductionKg: 0,
  };

  const wastage = summaryData?.wastage || {
    loomWasteKg: 0,
    loomWastePct: 0,
    lamWasteKg: 0,
    lamWastePct: 0,
    printWasteKg: 0,
    printWastePct: 0,
    machineWasteKg: 0,
    machineWastePct: 0,
    coverPatchWasteKg: 0,
    coverPatchWastePct: 0,
    totalWasteKg: 0,
    totalWastePct: 0,
  };

  const qualities = summaryData?.qualities || [];

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* Control Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                Analytics & Reporting
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                {overall.totalReports} Shifts Compiled
              </span>
              {loading ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-sky-700 bg-sky-50/80 px-2.5 py-0.5 rounded-full border border-sky-200 font-medium">
                  <RefreshCw className="h-3 w-3 animate-spin text-sky-600" />
                  Refreshing...
                </span>
              ) : lastRefreshedAt ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Live Aggregated ({lastRefreshedAt})
                </span>
              ) : null}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Convertex Production & Wastage Summary
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Aggregated reporting by Quality, comprehensive scrap stream analysis, and net factory output conversion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchSummary()}
              disabled={loading}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh summary data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {summaryData && (
              <>
                <button
                  type="button"
                  onClick={() => exportConvertexSummaryExcel(summaryData, dateRangeLabel)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Download Excel
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  Print Summary
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Shift Filter
              </label>
              <select
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="ALL">All Shifts</option>
                <option value="Day Shift">Day Shift</option>
                <option value="Night Shift">Night Shift</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5 text-slate-400" /> Machine Filter
              </label>
              <select
                value={machineNo}
                onChange={(e) => setMachineNo(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="ALL">All Machines</option>
                <option value="Convertex-1">Convertex-1</option>
                <option value="Convertex-2">Convertex-2</option>
                <option value="Convertex-3">Convertex-3</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-400" /> Quality Search
              </label>
              <input
                type="text"
                placeholder="Filter by quality name..."
                value={qualitySearch}
                onChange={(e) => setQualitySearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Quick Date Range Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Quick Range:</span>
            <button
              onClick={() => setQuickRange("today")}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setQuickRange("7d")}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setQuickRange("30d")}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setQuickRange("month")}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickRange("all")}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* Grand Totals KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Total Rolls</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{overall.totalRolls}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{overall.totalRollMtr.toLocaleString()} m</div>
        </div>

        <div className="bg-white border border-purple-200 bg-purple-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-purple-700 tracking-wider">Net Weight</div>
          <div className="text-xl font-bold font-mono text-purple-900 mt-1">{overall.totalNetWt.toFixed(1)} kg</div>
          <div className="text-[10px] text-purple-600/80 mt-0.5">Avg: {overall.avgGsm.toFixed(1)} g/m</div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/25 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-emerald-700 tracking-wider">Production (Pcs)</div>
          <div className="text-xl font-bold font-mono text-emerald-800 mt-1">{overall.totalProductionPcs.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Finished Sacks</div>
        </div>

        <div className="bg-white border border-teal-200 bg-teal-50/25 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-teal-700 tracking-wider">Production (Kg)</div>
          <div className="text-xl font-bold font-mono text-teal-800 mt-1">{overall.totalProductionKg.toFixed(1)} kg</div>
          <div className="text-[10px] text-teal-600/80 mt-0.5">Sack Output Wt</div>
        </div>

        <div className="bg-white border border-indigo-200 bg-indigo-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-indigo-700 tracking-wider">Cover & Valve</div>
          <div className="text-sm font-bold font-mono text-indigo-900 mt-1">
            OS: {overall.totalCoverPatchOs} | DS: {overall.totalCoverPatchDs}
          </div>
          <div className="text-[10px] text-indigo-600 mt-0.5">Valve: {overall.totalValvePatch}</div>
        </div>

        <div className="bg-white border border-rose-200 bg-rose-50/25 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-rose-700 tracking-wider">Total Waste</div>
          <div className="text-xl font-bold font-mono text-rose-900 mt-1">{overall.totalWastageKg.toFixed(1)} kg</div>
          <div className="text-[10px] text-rose-600 font-bold mt-0.5">{overall.totalWastagePct.toFixed(2)}% of prod</div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/25 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-emerald-700 tracking-wider">Net Production</div>
          <div className="text-xl font-bold font-mono text-emerald-900 mt-1">{overall.totalNetProductionKg.toFixed(1)} kg</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Net Bag Yield</div>
        </div>
      </div>

      {/* Tabs Switcher for Sections */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("qualities")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "qualities"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Quality-Wise Analysis ({qualities.length})
        </button>
        <button
          onClick={() => setActiveTab("wastage")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "wastage"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Wastage Categorisation Breakdown
        </button>
      </div>

      {/* Section 1: Quality Table */}
      {activeTab === "qualities" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Quality Breakdown (Conversion & Waste Yield)
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing {qualities.length} qualities
            </span>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs border-collapse min-w-[1400px]">
              <thead className="bg-slate-900 text-white font-semibold text-[11px] sticky top-0 z-10 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12 border-r border-slate-800">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 bg-slate-800 text-amber-300">Quality Name</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-800">Processed Rolls</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800">Total Mtrs</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800">Net Wt (Kg)</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800">Avg Linear Density</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-emerald-950 text-emerald-300">Production (Pcs)</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-teal-950 text-teal-300">Production (Kg)</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-indigo-950">Cover Patch OS</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-indigo-950">Cover Patch DS</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-indigo-950">Valve Patch</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-red-950 text-red-300">Total Waste (Kg)</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 bg-amber-950 text-amber-300">Waste (%)</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-950 text-emerald-300">Net Production (Kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {qualities.length > 0 ? (
                  qualities.map((q, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                      <td className="py-2 px-3 text-center font-bold text-slate-500 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200 bg-amber-50/15">
                        {q.quality}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-sky-700 border-r border-slate-200">
                        {q.rollsCount}
                      </td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">
                        {q.totalRollMtr.toLocaleString()} m
                      </td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">
                        {q.totalNetWt.toFixed(1)} kg
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-sky-800 bg-sky-50/30 border-r border-slate-200">
                        {q.avgGsm.toFixed(1)} g/m
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/25 border-r border-slate-200">
                        {q.productionPcs.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-teal-800 bg-teal-50/25 border-r border-slate-200">
                        {q.productionKg.toFixed(1)} kg
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-700 border-r border-slate-200">
                        {q.coverPatchOs}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-700 border-r border-slate-200">
                        {q.coverPatchDs}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-900 border-r border-slate-200 font-semibold">
                        {q.valvePatch}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-red-700 bg-red-50/25 border-r border-slate-200">
                        {q.totalWasteKg.toFixed(2)} kg
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 bg-amber-50/25 border-r border-slate-200">
                        {q.totalWastePct.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/30">
                        {q.netProductionKg.toFixed(1)} kg
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400">
                      No quality production data found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900 sticky bottom-0 z-10 text-xs">
                <tr>
                  <td colSpan={2} className="py-2.5 px-3 text-right uppercase">
                    GRAND TOTALS:
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-sky-800">
                    {overall.totalRolls}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {overall.totalRollMtr.toLocaleString()} m
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {overall.totalNetWt.toFixed(1)} kg
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sky-800">
                    {overall.avgGsm.toFixed(1)} g/m
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-black">
                    {overall.totalProductionPcs.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-teal-800 font-black">
                    {overall.totalProductionKg.toFixed(1)} kg
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-800">
                    {overall.totalCoverPatchOs}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-800">
                    {overall.totalCoverPatchDs}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-900">
                    {overall.totalValvePatch}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-800">
                    {overall.totalWastageKg.toFixed(2)} kg
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                    {overall.totalWastagePct.toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-black">
                    {overall.totalNetProductionKg.toFixed(1)} kg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Wastage Categorisation Breakdown */}
      {activeTab === "wastage" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              Scrap Streams Categorisation
            </h2>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Loom Fabric Wastage</span>
                  <span className="font-mono text-slate-900">
                    {wastage.loomWasteKg.toFixed(2)} kg ({wastage.loomWastePct.toFixed(2)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-sky-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, wastage.loomWastePct * 5)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Lamination Fabric Wastage</span>
                  <span className="font-mono text-slate-900">
                    {wastage.lamWasteKg.toFixed(2)} kg ({wastage.lamWastePct.toFixed(2)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-cyan-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, wastage.lamWastePct * 5)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Print Fabric Wastage</span>
                  <span className="font-mono text-slate-900">
                    {wastage.printWasteKg.toFixed(2)} kg ({wastage.printWastePct.toFixed(2)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, wastage.printWastePct * 5)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Machine Operational Wastage</span>
                  <span className="font-mono text-slate-900">
                    {wastage.machineWasteKg.toFixed(2)} kg ({wastage.machineWastePct.toFixed(2)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-amber-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, wastage.machineWastePct * 5)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Cover Patch Wastage</span>
                  <span className="font-mono text-slate-900">
                    {wastage.coverPatchWasteKg.toFixed(2)} kg ({wastage.coverPatchWastePct.toFixed(2)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${Math.min(100, wastage.coverPatchWastePct * 5)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-rose-700 uppercase">Total Accumulated Wastage</span>
                  <span className="font-mono text-rose-800">
                    {wastage.totalWasteKg.toFixed(2)} kg ({wastage.totalWastePct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Conversion & Efficiency Summary
            </h2>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-900">Net Finished Production</div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">
                    Gross Production (Kg) minus All Wastage (Kg)
                  </div>
                </div>
                <div className="text-lg font-black font-mono text-emerald-800">
                  {overall.totalNetProductionKg.toFixed(1)} kg
                </div>
              </div>

              <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-teal-900">Gross Sacks Produced</div>
                  <div className="text-[10px] text-teal-700 mt-0.5">
                    Total piece output from Convertex cutter
                  </div>
                </div>
                <div className="text-lg font-black font-mono text-teal-800">
                  {overall.totalProductionPcs.toLocaleString()} pcs
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-900">Total Patches Attached</div>
                  <div className="text-[10px] text-indigo-700 mt-0.5">
                    Operator Side + Drive Side Cover Patches + Valve Patch
                  </div>
                </div>
                <div className="text-base font-bold font-mono text-indigo-800">
                  OS: {overall.totalCoverPatchOs} | DS: {overall.totalCoverPatchDs} | Valve: {overall.totalValvePatch}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {isPrintModalOpen && summaryData && (
        <ConvertexSummaryPrintModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          data={summaryData}
          dateRange={dateRangeLabel}
        />
      )}
    </div>
  );
}
