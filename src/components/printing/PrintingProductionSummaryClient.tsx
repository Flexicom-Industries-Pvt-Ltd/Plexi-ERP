"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Printer,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  Users,
  Award,
  TrendingUp,
  FileSpreadsheet,
  Layers,
  Scale,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { PrintingProductionSummaryResult } from "@/lib/printing/printing-types";
import dynamic from "next/dynamic";

const PrintingSummaryPrintModal = dynamic(
  () => import("./PrintingSummaryPrintModal").then((m) => m.PrintingSummaryPrintModal),
  { ssr: false }
);

export function PrintingProductionSummaryClient() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [shiftName, setShiftName] = useState<string>("ALL");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [qualitySearch, setQualitySearch] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"customers" | "qualities">("customers");

  const [loading, setLoading] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<PrintingProductionSummaryResult | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (shiftName && shiftName !== "ALL") params.set("shiftName", shiftName);
      if (customerSearch) params.set("companyName", customerSearch);
      if (qualitySearch) params.set("quality", qualitySearch);

      const res = await fetch(`/api/production/printing/summary?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load printing production summary");
      const data = await res.json();

      if (data.summary) {
        setSummaryData(data.summary);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, shiftName, customerSearch, qualitySearch]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Quick range helpers
  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateTo(end.toISOString().slice(0, 10));
    setDateFrom(start.toISOString().slice(0, 10));
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setShiftName("ALL");
    setCustomerSearch("");
    setQualitySearch("");
  };

  const overall = summaryData?.overall || {
    totalReports: 0,
    totalRolls: 0,
    totalTargetMtrs: 0,
    totalProductionMtrs: 0,
    totalNetWeightKg: 0,
    avgGsm: 0,
    totalPrintMtrs: 0,
    varianceMtrs: 0,
    overallEfficiency: 0,
  };

  return (
    <div className="space-y-6">
      {/* Control Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Printing & Conversion
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Printing Production Summary
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchSummary()}
              disabled={loading}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {summaryData && (
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Executive Report
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Shift
            </label>
            <select
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary bg-white"
            >
              <option value="ALL">All Shifts</option>
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
              <option value="General Shift">General Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Customer Filter
            </label>
            <input
              type="text"
              placeholder="Search company..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Quality Filter
            </label>
            <input
              type="text"
              placeholder="Search fabric quality..."
              value={qualitySearch}
              onChange={(e) => setQualitySearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={() => setQuickRange(7)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 font-medium"
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => setQuickRange(30)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 font-medium"
            >
              30D
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 text-slate-500 font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Printed Metres</span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono mt-2">
            {overall.totalPrintMtrs.toLocaleString()} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{overall.totalRolls} total rolls printed</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Net Weight</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-2">
            {overall.totalNetWeightKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Average Fabric GSM: {overall.avgGsm.toFixed(1)}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Variance vs Target</span>
            {overall.varianceMtrs >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div
            className={`text-2xl font-black font-mono mt-2 ${
              overall.varianceMtrs >= 0 ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {overall.varianceMtrs >= 0 ? "+" : ""}
            {overall.varianceMtrs.toLocaleString()} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Target: {overall.totalTargetMtrs.toLocaleString()} m
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Overall Efficiency</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-2">
            {overall.overallEfficiency.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Across {overall.totalReports} shift reports</div>
        </div>
      </div>

      {/* Main Tab Navigation (Desktop: hidden md:block) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="border-b border-slate-200 px-4 bg-slate-50 flex items-center justify-between">
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab("customers")}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "customers"
                  ? "border-primary text-slate-900 bg-white shadow-xs"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4 text-blue-600" />
              Customer-Wise Printing ({summaryData?.customers.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("qualities")}
              className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "qualities"
                  ? "border-primary text-slate-900 bg-white shadow-xs"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Award className="w-4 h-4 text-emerald-600" />
              Quality-Wise Printing ({summaryData?.qualities.length || 0})
            </button>
          </div>
        </div>

        {/* Tab 1: Customer-Wise Printing Table */}
        {activeTab === "customers" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Customer / Party Name</th>
                  <th className="px-4 py-3">Unit / Branch</th>
                  <th className="px-4 py-3 text-center">Rolls</th>
                  <th className="px-4 py-3 text-right">Target (m)</th>
                  <th className="px-4 py-3 text-right bg-blue-50/40">Printed (m)</th>
                  <th className="px-4 py-3 text-right">Fabric Length (m)</th>
                  <th className="px-4 py-3 text-right">Net Wt (Kg)</th>
                  <th className="px-4 py-3 text-center">Avg GSM</th>
                  <th className="px-4 py-3 text-right bg-purple-50/40">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!summaryData?.customers || summaryData.customers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
                      No customer print records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  summaryData.customers.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{c.companyName}</td>
                      <td className="px-4 py-3 text-slate-600">{c.unitName || "—"}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                        {c.totalRolls}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {c.targetMtrs.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-blue-700 bg-blue-50/20">
                        {c.printMtrs.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {c.productionMtrs.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {c.netWeightKg.toLocaleString()} kg
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">
                        {c.avgGsm.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-purple-700 bg-purple-50/20">
                        {c.sharePercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
                {summaryData?.customers && summaryData.customers.length > 0 && (
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider text-slate-800">
                      Total Customer Print:
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-900">
                      {overall.totalRolls}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {overall.totalTargetMtrs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-800 text-sm font-black bg-blue-50/40">
                      {overall.totalPrintMtrs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {overall.totalProductionMtrs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      {overall.totalNetWeightKg.toLocaleString()} kg
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {overall.avgGsm.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-purple-800 font-black bg-purple-50/40">
                      100.0%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Quality-Wise Printing Table */}
        {activeTab === "qualities" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Fabric Quality / Substrate</th>
                  <th className="px-4 py-3 text-center">Total Rolls</th>
                  <th className="px-4 py-3 text-right bg-blue-50/40">Printed (m)</th>
                  <th className="px-4 py-3 text-right">Fabric Length (m)</th>
                  <th className="px-4 py-3 text-right">Net Weight (Kg)</th>
                  <th className="px-4 py-3 text-center">Avg GSM</th>
                  <th className="px-4 py-3 text-right bg-emerald-50/40">Quality Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!summaryData?.qualities || summaryData.qualities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                      No quality print records found for the selected period.
                    </td>
                  </tr>
                ) : (
                  summaryData.qualities.map((q, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-center font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{q.quality}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                        {q.totalRolls}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-blue-700 bg-blue-50/20">
                        {q.printMtrs.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {q.productionMtrs.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {q.netWeightKg.toLocaleString()} kg
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-600">
                        {q.avgGsm.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-700 bg-emerald-50/20">
                        {q.sharePercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
                {summaryData?.qualities && summaryData.qualities.length > 0 && (
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-slate-800">
                      Total Quality Print:
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-900">
                      {overall.totalRolls}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-blue-800 text-sm font-black bg-blue-50/40">
                      {overall.totalPrintMtrs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">
                      {overall.totalProductionMtrs.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-900">
                      {overall.totalNetWeightKg.toLocaleString()} kg
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700">
                      {overall.avgGsm.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-800 font-black bg-emerald-50/40">
                      100.0%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE-RESPONSIVE TOUCH VIEW (<md) - ZERO DESKTOP REGRESSION */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4">
        {/* Mobile Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("customers")}
            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "customers"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Customers ({summaryData?.customers.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("qualities")}
            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "qualities"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "hover:text-slate-900"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Qualities ({summaryData?.qualities.length || 0})</span>
          </button>
        </div>

        {/* 1. CUSTOMER-WISE TAB CARDS */}
        {activeTab === "customers" && (
          <div className="space-y-3">
            {!summaryData?.customers || summaryData.customers.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 italic text-xs">
                No customer print records found for the selected period.
              </div>
            ) : (
              summaryData.customers.map((c, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden"
                >
                  <div className="bg-slate-50/80 px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-[11px]">
                        {i + 1}
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {c.companyName}
                        </h4>
                        {c.unitName && (
                          <span className="text-[10px] text-slate-500 font-medium block">
                            {c.unitName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                      {c.sharePercent.toFixed(1)}% Share
                    </span>
                  </div>

                  <div className="p-3.5 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50/40 p-2.5 rounded-lg border border-blue-100">
                        <span className="text-[10px] uppercase font-bold text-blue-700 block">
                          Printed Metres
                        </span>
                        <span className="text-base font-black text-blue-900 font-mono">
                          {c.printMtrs.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">m</span>
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Net Weight
                        </span>
                        <span className="text-base font-black text-slate-900 font-mono">
                          {c.netWeightKg.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">kg</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-slate-50/60 p-1.5 rounded-md border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Rolls</span>
                        <span className="font-mono font-bold text-slate-800 text-xs">{c.totalRolls}</span>
                      </div>
                      <div className="bg-slate-50/60 p-1.5 rounded-md border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Target (m)</span>
                        <span className="font-mono font-bold text-slate-700 text-xs">{c.targetMtrs.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-50/60 p-1.5 rounded-md border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg GSM</span>
                        <span className="font-mono font-bold text-slate-700 text-xs">{c.avgGsm.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. QUALITY-WISE TAB CARDS */}
        {activeTab === "qualities" && (
          <div className="space-y-3">
            {!summaryData?.qualities || summaryData.qualities.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 italic text-xs">
                No quality print records found for the selected period.
              </div>
            ) : (
              summaryData.qualities.map((q, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden"
                >
                  <div className="bg-slate-50/80 px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-[11px]">
                        {i + 1}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {q.quality}
                      </h4>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      {q.sharePercent.toFixed(1)}% Share
                    </span>
                  </div>

                  <div className="p-3.5 space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-50/40 p-2.5 rounded-lg border border-blue-100">
                        <span className="text-[10px] uppercase font-bold text-blue-700 block">
                          Printed Metres
                        </span>
                        <span className="text-base font-black text-blue-900 font-mono">
                          {q.printMtrs.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">m</span>
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Net Weight
                        </span>
                        <span className="text-base font-black text-slate-900 font-mono">
                          {q.netWeightKg.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">kg</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="bg-slate-50/60 p-1.5 rounded-md border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Rolls</span>
                        <span className="font-mono font-bold text-slate-800 text-xs">{q.totalRolls}</span>
                      </div>
                      <div className="bg-slate-50/60 p-1.5 rounded-md border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Fabric Length</span>
                        <span className="font-mono font-bold text-slate-700 text-xs">{q.productionMtrs.toLocaleString()}m</span>
                      </div>
                      <div className="bg-slate-50/60 p-1.5 rounded-md border border-slate-100">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg GSM</span>
                        <span className="font-mono font-bold text-slate-700 text-xs">{q.avgGsm.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* RECONCILIATION SUMMARY CARD */}
        <div className="bg-slate-900 text-white rounded-xl shadow-xs overflow-hidden p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Shift Printing Totals
            </span>
            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {overall.overallEfficiency.toFixed(1)}% Efficiency
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Total Printed Metres
              </span>
              <span className="text-base font-black text-blue-400 font-mono">
                {overall.totalPrintMtrs.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">m</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Total Net Weight
              </span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {overall.totalNetWeightKg.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">kg</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Total Rolls Printed
              </span>
              <span className="text-base font-black text-white font-mono">
                {overall.totalRolls} <span className="text-[10px] font-normal text-slate-400">rolls</span>
              </span>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Variance vs Target
              </span>
              <span
                className={`text-base font-black font-mono ${
                  overall.varianceMtrs >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {overall.varianceMtrs >= 0 ? "+" : ""}
                {overall.varianceMtrs.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">m</span>
              </span>
            </div>
          </div>

          {summaryData && (
            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="w-full h-11 mt-1 text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              Print Executive Summary
            </button>
          )}
        </div>
      </div>

      {/* Print Preview Modal */}
      {summaryData && (
        <PrintingSummaryPrintModal
          open={printModalOpen}
          onOpenChange={setPrintModalOpen}
          data={summaryData}
        />
      )}
    </div>
  );
}
