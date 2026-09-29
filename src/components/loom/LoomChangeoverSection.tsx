"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Filter,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Plus,
  X,
  Sparkles,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  LoomChangeoverLogItem,
} from "@/app/api/production/loom/changeover/route";
import { exportLoomChangeoverExcel } from "@/lib/loom/loom-changeover-export";
import { printLoomChangeover } from "@/lib/loom/print-loom-changeover";

interface AvailableQuality {
  code: string;
  colorGroup?: string | null;
  colour?: string | null;
  denier?: number | null;
}

interface AvailableShift {
  id: string;
  name: string;
  startTime?: string | null;
  endTime?: string | null;
}

export function LoomChangeoverSection() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterShift, setFilterShift] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
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

  const [logs, setLogs] = useState<LoomChangeoverLogItem[]>([]);
  const [availableQualities, setAvailableQualities] = useState<AvailableQuality[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [kpis, setKpis] = useState({
    totalLogs: 0,
    totalDowntimeMinutes: 0,
    totalDowntimeHours: 0,
    avgDowntimeMinutes: 0,
    uniqueLoomsCount: 0,
    scheduledCount: 0,
    factoryTotalLooms: 91,
  });

  // Modal State for Quick Scheduling
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [newScheduleLoom, setNewScheduleLoom] = useState("1");
  const [newScheduleFrom, setNewScheduleFrom] = useState("");
  const [newScheduleTo, setNewScheduleTo] = useState("");
  const [newScheduleDate, setNewScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newScheduleShift, setNewScheduleShift] = useState("Day Shift");
  const [newScheduleRemarks, setNewScheduleRemarks] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterDate) params.set("date", filterDate);
      if (filterShift !== "ALL") params.set("shift", filterShift);
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      params.set("_t", String(Date.now()));

      const res = await fetch(`/api/production/loom/changeover?${params.toString()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) throw new Error("Failed to load Loom Changeover data");
      const json = await res.json();
      setLogs(json.logs || []);
      setAvailableQualities(json.availableQualities || []);
      setAvailableShifts(json.availableShifts || []);
      if (json.kpis) setKpis(json.kpis);
    } catch {
      toast.error("Failed to load Loom Changeover data");
    } finally {
      setLoading(false);
    }
  }, [search, filterDate, filterShift, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Quick Schedule Submit
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleTo.trim()) {
      toast.error("Please select or enter the Target Quality");
      return;
    }

    setScheduling(true);
    try {
      const res = await fetch("/api/production/loom/changeover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "QUICK_SCHEDULE",
          loomNumber: Number(newScheduleLoom),
          fromQuality: newScheduleFrom.trim() || null,
          toQuality: newScheduleTo.trim(),
          targetDate: newScheduleDate,
          targetShiftName: newScheduleShift,
          remarks: newScheduleRemarks.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to schedule changeover");
      toast.success(`Changeover scheduled for Loom #${newScheduleLoom}`);
      setScheduleModalOpen(false);
      setNewScheduleTo("");
      setNewScheduleRemarks("");
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to schedule changeover");
    } finally {
      setScheduling(false);
    }
  };

  const handleExportExcel = () => {
    exportLoomChangeoverExcel({
      logs,
      kpis,
      filterDate,
      filterShift: filterShift === "ALL" ? "" : filterShift,
      searchQuery: search,
    });
  };

  const handlePrint = () => {
    printLoomChangeover({
      logs,
      kpis,
      filterDate,
      filterShift: filterShift === "ALL" ? "" : filterShift,
    });
  };

  // Preset quick date filters
  const handleSetQuickDate = (type: "ALL" | "TODAY" | "YESTERDAY") => {
    if (type === "ALL") {
      setFilterDate("");
    } else if (type === "TODAY") {
      setFilterDate(new Date().toISOString().slice(0, 10));
    } else if (type === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setFilterDate(y.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Actions Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Loom Quality Changeover Logs
                </h1>
                <p className="text-xs text-slate-500">
                  Live audit trail of fabric quality transitions recorded across factory circular looms.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Changeover</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all cursor-pointer"
              title="Export Log Records to Excel"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
              <span>Excel Export</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
              title="Print Official Log Sheet"
            >
              <Printer className="h-4 w-4 text-slate-700" />
              <span>Print Report</span>
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin text-slate-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search loom #, quality, operator..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 transition-all placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Date Input & Quick Pills */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 text-slate-700 font-medium"
                />
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-medium">
                <button
                  onClick={() => handleSetQuickDate("ALL")}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    !filterDate ? "bg-white font-bold text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All Dates
                </button>
                <button
                  onClick={() => handleSetQuickDate("TODAY")}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    filterDate === new Date().toISOString().slice(0, 10)
                      ? "bg-white font-bold text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Shift Filter */}
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 text-slate-700 font-medium"
            >
              <option value="ALL">All Shifts</option>
              <option value="DAY">Day Shift</option>
              <option value="NIGHT">Night Shift</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-800 text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="LOGGED">Logged (Reading Sheet)</option>
              <option value="CHANGEOVER">In Changeover</option>
              <option value="SCHEDULED">Master Scheduled</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-slate-800 font-bold">{logs.length}</strong> changeover event(s)
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Changeovers
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {kpis.totalLogs}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Recorded events across all looms</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Downtime
          </div>
          <div className="text-2xl font-black font-mono text-amber-700">
            {kpis.totalDowntimeMinutes} <span className="text-xs font-semibold text-slate-400">mins ({kpis.totalDowntimeHours}h)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Cumulative downtime duration</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Avg Duration
          </div>
          <div className="text-2xl font-black font-mono text-sky-700">
            {kpis.avgDowntimeMinutes} <span className="text-xs font-semibold text-slate-400">mins / event</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Average time per quality swap</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Looms Involved
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">
            {kpis.uniqueLoomsCount} <span className="text-xs font-semibold text-slate-400">/ {kpis.factoryTotalLooms}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Looms with logged transitions</p>
        </div>
      </div>

      {/* Log-Wise Changeover Records Table */}
      <div className={`bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-0 p-4 md:p-6 flex flex-col bg-background h-screen w-screen"
          : ""
      }`}>
        <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title={isFullscreen ? "Collapse (Esc)" : "Expand to Fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Expand</span>
                </>
              )}
            </button>
            <span className="text-xs font-bold text-slate-800">Changeover Event Log</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {logs.length} event(s)
          </span>
        </div>
        <div className={isFullscreen ? "overflow-auto flex-1" : "overflow-x-auto"}>
          <table className="w-full text-left text-xs border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10.5px]">
                <th className="py-3 px-3 text-center w-12 border-r border-slate-100">#</th>
                <th className="py-3 px-3 text-center w-28 border-r border-slate-100">Date</th>
                <th className="py-3 px-3 text-center w-24 border-r border-slate-100">Shift</th>
                <th className="py-3 px-3 text-center w-20 border-r border-slate-100">Loom #</th>
                <th className="py-3 px-3.5 w-36 border-r border-slate-100">Operator</th>
                <th className="py-3 px-4 w-44 border-r border-slate-100">From Quality (Current)</th>
                <th className="py-3 px-2 text-center w-8 border-r border-slate-100"></th>
                <th className="py-3 px-4 w-48 border-r border-slate-100 bg-amber-50/40">To Quality (Target)</th>
                <th className="py-3 px-3 text-right w-28 border-r border-slate-100">Downtime</th>
                <th className="py-3 px-3 text-center w-28 border-r border-slate-100">Status</th>
                <th className="py-3 px-3.5 min-w-[140px]">Remarks / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      <span>Loading Changeover Logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Layers className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">No Changeover Logs Found</p>
                      <p className="text-[11px] text-slate-400 text-center">
                        Changeovers recorded during 2-hour reading sheets (when Breakdown is selected as Change Over) will automatically appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((item, idx) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Log Index */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-700 border-r border-slate-100">
                        {item.date}
                      </td>

                      {/* Shift */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-100">
                        <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700">
                          {item.shiftName}
                        </span>
                      </td>

                      {/* Loom Number */}
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900 border-r border-slate-100">
                        #{item.loomNumber}
                      </td>

                      {/* Operator */}
                      <td className="py-2.5 px-3.5 font-medium text-slate-800 border-r border-slate-100">
                        {item.operatorName}
                      </td>

                      {/* From Quality */}
                      <td className="py-2.5 px-4 border-r border-slate-100">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200">
                          {item.fromQuality}
                        </span>
                      </td>

                      {/* Arrow */}
                      <td className="py-2.5 px-1 text-center text-amber-500 border-r border-slate-100">
                        <ArrowRight className="h-3.5 w-3.5 mx-auto" />
                      </td>

                      {/* To Quality (Target) */}
                      <td className="py-2.5 px-4 border-r border-slate-100 bg-amber-50/20">
                        <span className="inline-block px-2.5 py-1 rounded text-xs font-mono font-extrabold text-amber-950 bg-amber-100/80 border border-amber-300">
                          {item.toQuality}
                        </span>
                      </td>

                      {/* Downtime Duration */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900 border-r border-slate-100">
                        {item.downtimeMinutes > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-600" />
                            {item.downtimeMinutes} mins
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-100">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            item.status === "CHANGEOVER" || item.status === "IN_PROGRESS"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : item.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : item.status === "SCHEDULED"
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="py-2.5 px-3.5 text-slate-600 text-xs truncate max-w-[200px]" title={item.remarks}>
                        {item.remarks || <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule / Add Changeover Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Schedule Loom Changeover</h3>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Loom Machine #:
                  </label>
                  <select
                    value={newScheduleLoom}
                    onChange={(e) => setNewScheduleLoom(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                  >
                    {Array.from({ length: 91 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Loom #{n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Target Date:
                  </label>
                  <input
                    type="date"
                    value={newScheduleDate}
                    onChange={(e) => setNewScheduleDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target / Next Quality:
                </label>
                <input
                  type="text"
                  list="target-qualities-list"
                  value={newScheduleTo}
                  onChange={(e) => setNewScheduleTo(e.target.value)}
                  placeholder="e.g. UTCL/LPP/Y/67 or 1000D/LPP/W"
                  required
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
                <datalist id="target-qualities-list">
                  {availableQualities.map((q) => (
                    <option key={q.code} value={q.code}>
                      {q.code} {q.colorGroup ? `(${q.colorGroup})` : ""}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Target Shift:
                </label>
                <select
                  value={newScheduleShift}
                  onChange={(e) => setNewScheduleShift(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                >
                  <option value="Day Shift">Day Shift</option>
                  <option value="Night Shift">Night Shift</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Remarks / Changeover Notes:
                </label>
                <textarea
                  rows={2}
                  value={newScheduleRemarks}
                  onChange={(e) => setNewScheduleRemarks(e.target.value)}
                  placeholder="Notes for floor operator..."
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {scheduling ? "Saving..." : "Schedule Changeover"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
