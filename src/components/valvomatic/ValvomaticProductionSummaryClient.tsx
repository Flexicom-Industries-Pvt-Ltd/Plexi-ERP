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
import { ValvomaticSummaryResult } from "@/lib/valvomatic/valvomatic-types";
import { ValvomaticSummaryPrintModal } from "./ValvomaticSummaryPrintModal";
import { exportValvomaticSummaryExcel } from "@/lib/valvomatic/valvomatic-export";

export function ValvomaticProductionSummaryClient() {
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
  const [summaryData, setSummaryData] = useState<ValvomaticSummaryResult | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (shiftName && shiftName !== "ALL") params.set("shiftName", shiftName);
      if (machineNo && machineNo !== "ALL") params.set("machineNo", machineNo);
      if (qualitySearch.trim()) params.set("quality", qualitySearch.trim());

      const res = await fetch(`/api/production/valvomatic/summary?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load Valvomatic summary");
      }

      const json = await res.json();
      if (json.summary) {
        setSummaryData(json.summary);
        setLastRefreshedAt(format(new Date(), "hh:mm a"));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Valvomatic summary");
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

  const handleExportExcel = () => {
    if (!summaryData) return;
    exportValvomaticSummaryExcel(summaryData, dateRangeLabel);
  };

  const wasteStreams = useMemo(() => {
    if (!summaryData) return [];
    const totalWaste = summaryData.overall.totalWastageKg || 1;
    return [
      {
        label: "Loom Wastage",
        kg: summaryData.wastage.loomWasteKg,
        share: (summaryData.wastage.loomWasteKg / totalWaste) * 100,
        desc: "Tape / fabric defects prior to bag conversion",
      },
      {
        label: "Lamination Wastage",
        kg: summaryData.wastage.lamWasteKg,
        share: (summaryData.wastage.lamWasteKg / totalWaste) * 100,
        desc: "Poly coating delamination, pinholes, or surface trim",
      },
      {
        label: "Printing Wastage",
        kg: summaryData.wastage.printWasteKg,
        share: (summaryData.wastage.printWasteKg / totalWaste) * 100,
        desc: "Ink smudging, registration error, print defect fabric",
      },
      {
        label: "Machine Wastage",
        kg: summaryData.wastage.machineWasteKg,
        share: (summaryData.wastage.machineWasteKg / totalWaste) * 100,
        desc: "Setup cuts, knife jams, bottom fold reject sacks",
      },
      {
        label: "Cover Patch Wastage",
        kg: summaryData.wastage.coverPatchWasteKg,
        share: (summaryData.wastage.coverPatchWasteKg / totalWaste) * 100,
        desc: "Trimmed patch fabric & off-spec valve seals",
      },
    ];
  }, [summaryData]);

  return (
    <div className="space-y-5 pb-16 max-w-[100vw] overflow-x-hidden">
      {/* Main Filter and Controls Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-700">
                    Analytics & Reporting
                  </span>
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-sky-700 bg-sky-50/80 px-2.5 py-0.5 rounded-full border border-sky-200 font-medium">
                      <RefreshCw className="h-3 w-3 animate-spin text-sky-600" />
                      Refreshing...
                    </span>
                  ) : lastRefreshedAt ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Live Summary ({lastRefreshedAt})
                    </span>
                  ) : null}
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Valvomatic Production & Wastage Summary
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Comprehensive performance analytics, quality breakdowns, and scrap stream diagnostics
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchSummary()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!summaryData || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Excel Export
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              disabled={!summaryData || loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors shadow-xs disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Executive Summary
            </button>
          </div>
        </div>

        {/* Quick Date Range Shortcuts */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Period:</span>
          {(["today", "7d", "30d", "month", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setQuickRange(r)}
              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              {r === "today"
                ? "Today"
                : r === "7d"
                ? "Last 7 Days"
                : r === "30d"
                ? "Last 30 Days"
                : r === "month"
                ? "This Month"
                : "All Time"}
            </button>
          ))}
        </div>

        {/* Filters Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Shift</label>
            <select
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary bg-white"
            >
              <option value="ALL">All Shifts</option>
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
              <option value="General Shift">General Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Machine</label>
            <select
              value={machineNo}
              onChange={(e) => setMachineNo(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary bg-white"
            >
              <option value="ALL">All Machines</option>
              <option value="Valvomatic-1">Valvomatic-1</option>
              <option value="Valvomatic-2">Valvomatic-2</option>
              <option value="Valvomatic-3">Valvomatic-3</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Filter Quality</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search quality..."
                value={qualitySearch}
                onChange={(e) => setQualitySearch(e.target.value)}
                className="w-full text-xs pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      {summaryData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500">Processed Rolls</div>
            <div className="text-xl font-black text-slate-900 font-mono mt-1">
              {summaryData.overall.totalRolls}
            </div>
            <div className="text-[10.5px] text-slate-500 mt-0.5">
              Across {summaryData.overall.totalReports} daily reports
            </div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-emerald-800">Total Bags Produced</div>
            <div className="text-xl font-black text-emerald-700 font-mono mt-1">
              {summaryData.overall.totalProductionPcs.toLocaleString()}
            </div>
            <div className="text-[10.5px] text-emerald-600 mt-0.5 font-medium">
              {(summaryData.overall.totalProductionKg / 1000).toFixed(2)} metric tons
            </div>
          </div>

          <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-teal-800">Gross Output (Kg)</div>
            <div className="text-xl font-black text-teal-700 font-mono mt-1">
              {summaryData.overall.totalProductionKg.toFixed(1)}
            </div>
            <div className="text-[10.5px] text-teal-600 mt-0.5">
              Avg GSM: {summaryData.overall.avgGsm.toFixed(1)}
            </div>
          </div>

          <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-rose-800">Total Scrap Generated</div>
            <div className="text-xl font-black text-rose-700 font-mono mt-1">
              {summaryData.overall.totalWastageKg.toFixed(1)} kg
            </div>
            <div className="text-[10.5px] text-rose-600 mt-0.5 font-medium">
              Scrap rate: {summaryData.overall.totalWastagePct.toFixed(2)}%
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-amber-800">Patch Consumption</div>
            <div className="text-base font-black text-amber-900 font-mono mt-1">
              {summaryData.overall.totalCoverPatchOs} OS / {summaryData.overall.totalCoverPatchDs} DS
            </div>
            <div className="text-[10.5px] text-amber-700 mt-0.5">
              Valve patches: {summaryData.overall.totalValvePatch}
            </div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-emerald-800">Net Good Production</div>
            <div className="text-xl font-black text-emerald-800 font-mono mt-1">
              {summaryData.overall.totalNetProductionKg.toFixed(1)} kg
            </div>
            <div className="text-[10.5px] text-emerald-600 mt-0.5">
              {(
                (summaryData.overall.totalNetProductionKg /
                  (summaryData.overall.totalProductionKg || 1)) *
                100
              ).toFixed(1)}
              % efficiency
            </div>
          </div>
        </div>
      )}

      {/* Breakdown View Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-4 pt-3 flex items-center gap-4">
          <button
            onClick={() => setActiveTab("qualities")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === "qualities"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            1. Quality Breakdown ({summaryData?.qualities.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("wastage")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === "wastage"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            2. Scrap Stream Diagnostics
          </button>
        </div>

        {/* Tab 1: Qualities Breakdown */}
        {activeTab === "qualities" && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-bold tracking-wider border-b border-slate-300">
                <tr>
                  <th className="p-2.5 border-r border-slate-200 text-center w-10">#</th>
                  <th className="p-2.5 border-r border-slate-200 min-w-[200px] bg-amber-50/80 text-amber-950 font-black">
                    Quality Name
                  </th>
                  <th className="p-2.5 border-r border-slate-200 text-center min-w-[80px]">Rolls</th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[120px] bg-emerald-50 text-emerald-900 font-black">
                    Bags (Pcs)
                  </th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[110px] bg-teal-50 text-teal-900 font-black">
                    Gross (Kg)
                  </th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[100px]">Total Mtrs</th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[100px]">Net Wt (Kg)</th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[90px]">Avg GSM</th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[90px] text-indigo-700">Cover OS</th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[90px] text-indigo-700">Cover DS</th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[90px] text-purple-700">Valve</th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[100px] bg-rose-50 text-rose-900 font-bold">
                    Scrap (Kg)
                  </th>
                  <th className="p-2.5 border-r border-slate-200 text-right min-w-[90px] bg-amber-50 text-amber-900 font-bold">
                    Scrap %
                  </th>
                  <th className="p-2.5 text-right min-w-[120px] bg-emerald-50 text-emerald-900 font-black">
                    Net Good (Kg)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="p-12 text-center text-slate-400">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading quality summary...
                    </td>
                  </tr>
                ) : summaryData && summaryData.qualities.length > 0 ? (
                  summaryData.qualities.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500 bg-slate-50/50">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-900 bg-amber-50/30">
                        {q.quality}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-sky-700">
                        {q.rollsCount}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono font-black text-emerald-700 bg-emerald-50/30">
                        {q.productionPcs.toLocaleString()}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono font-black text-teal-700 bg-teal-50/30">
                        {q.productionKg.toFixed(1)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700">
                        {q.totalRollMtr.toLocaleString()}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700">
                        {q.totalNetWt.toFixed(1)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono text-sky-800">
                        {q.avgGsm.toFixed(1)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono text-indigo-700">
                        {q.coverPatchOs}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono text-indigo-700">
                        {q.coverPatchDs}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono text-purple-700 font-semibold">
                        {q.valvePatch}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-rose-700 bg-rose-50/30">
                        {q.totalWasteKg.toFixed(2)}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono text-amber-700 bg-amber-50/30">
                        {q.totalWastePct.toFixed(2)}%
                      </td>
                      <td className="p-2 text-right font-mono font-black text-emerald-800 bg-emerald-50/30">
                        {q.netProductionKg.toFixed(1)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="p-12 text-center text-slate-400 italic">
                      No quality production data found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
              {summaryData && summaryData.qualities.length > 0 && (
                <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400 text-xs">
                  <tr>
                    <td className="p-2 border-r border-slate-300 text-center">Σ</td>
                    <td className="p-2 border-r border-slate-300 uppercase">Grand Totals</td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono text-sky-800">
                      {summaryData.overall.totalRolls}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono text-emerald-800 bg-emerald-100">
                      {summaryData.overall.totalProductionPcs.toLocaleString()}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono text-teal-800 bg-teal-100">
                      {summaryData.overall.totalProductionKg.toFixed(1)}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">
                      {summaryData.overall.totalRollMtr.toLocaleString()}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">
                      {summaryData.overall.totalNetWt.toFixed(1)}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono text-sky-800">
                      {summaryData.overall.avgGsm.toFixed(1)}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono text-indigo-800">
                      {summaryData.overall.totalCoverPatchOs}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono text-indigo-800">
                      {summaryData.overall.totalCoverPatchDs}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono text-purple-800">
                      {summaryData.overall.totalValvePatch}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono text-rose-800 bg-rose-100">
                      {summaryData.overall.totalWastageKg.toFixed(2)}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono text-amber-800 bg-amber-100">
                      {summaryData.overall.totalWastagePct.toFixed(2)}%
                    </td>
                    <td className="p-2 text-right font-mono text-emerald-800 bg-emerald-100">
                      {summaryData.overall.totalNetProductionKg.toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Tab 2: Scrap Stream Diagnostics */}
        {activeTab === "wastage" && (
          <div className="p-5">
            <div className="max-w-4xl border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-bold tracking-wider border-b border-slate-300">
                  <tr>
                    <th className="p-3 border-r border-slate-200 text-center w-12">#</th>
                    <th className="p-3 border-r border-slate-200">Scrap Category</th>
                    <th className="p-3 border-r border-slate-200 text-right">Waste (Kg)</th>
                    <th className="p-3 border-r border-slate-200 text-right">Share of Scrap (%)</th>
                    <th className="p-3 text-right">% of Output</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {wasteStreams.map((ws, i) => {
                    const pctOfOutput =
                      summaryData && summaryData.overall.totalProductionKg > 0
                        ? (ws.kg / summaryData.overall.totalProductionKg) * 100
                        : 0;

                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-500">
                          {i + 1}
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <div className="font-bold text-slate-900">{ws.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{ws.desc}</div>
                        </td>
                        <td className="p-3 border-r border-slate-200 text-right font-mono font-bold text-rose-700 text-sm">
                          {ws.kg.toFixed(2)} kg
                        </td>
                        <td className="p-3 border-r border-slate-200 text-right">
                          <div className="font-mono font-bold text-purple-700">
                            {ws.share.toFixed(1)}%
                          </div>
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full ml-auto mt-1 overflow-hidden">
                            <div
                              className="bg-purple-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, ws.share)}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700 font-semibold">
                          {pctOfOutput.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {summaryData && (
                  <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400 text-xs">
                    <tr>
                      <td className="p-3 border-r border-slate-300 text-center">Σ</td>
                      <td className="p-3 border-r border-slate-300 uppercase">
                        Total Scrap Recorded
                      </td>
                      <td className="p-3 border-r border-slate-300 text-right font-mono text-rose-800 bg-rose-100 text-sm">
                        {summaryData.overall.totalWastageKg.toFixed(2)} kg
                      </td>
                      <td className="p-3 border-r border-slate-300 text-right font-mono text-purple-800 bg-purple-100">
                        100.0%
                      </td>
                      <td className="p-3 text-right font-mono text-amber-800 bg-amber-100">
                        {summaryData.overall.totalWastagePct.toFixed(2)}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Formal Summary Print Modal */}
      {summaryData && (
        <ValvomaticSummaryPrintModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          data={summaryData}
          dateRange={dateRangeLabel}
        />
      )}
    </div>
  );
}
