"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  FileBarChart,
  Printer,
  FileSpreadsheet,
  Search,
  Calendar,
  Clock,
  User,
  Shield,
  Layers,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import {
  LoomWiseRow,
  SupervisorWiseRow,
  OperatorWiseRow,
  ReportKpis,
  ReportPeriod,
  printLoomProductionReport,
} from "@/lib/loom/print-loom-production-report";
import { exportLoomProductionReportExcel } from "@/lib/loom/loom-production-report-export";

type ViewCriteria = "LOOM" | "SUPERVISOR" | "OPERATOR" | "CONSOLIDATED";

interface FilterOption {
  id: string;
  name: string;
  code?: string | null;
  department?: string | null;
  section?: string | null;
}

export function LoomProductionReportSection() {
  const [loading, setLoading] = useState(true);

  // Filters State
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedShift, setSelectedShift] = useState("ALL");
  const [selectedLoom, setSelectedLoom] = useState("ALL");
  const [selectedSupervisor, setSelectedSupervisor] = useState("ALL");
  const [selectedOperator, setSelectedOperator] = useState("ALL");

  // View state
  const [activeCriteria, setActiveCriteria] = useState<ViewCriteria>("LOOM");
  const [tableSearch, setTableSearch] = useState("");
  const [printMenuOpen, setPrintMenuOpen] = useState(false);

  // Data State
  const [kpis, setKpis] = useState<ReportKpis>({
    totalRollsCut: 0,
    totalCutMeters: 0,
    totalReadingMeters: 0,
    totalGrossKg: 0,
    totalTareKg: 0,
    totalNettKg: 0,
    totalNettMT: 0,
    avgWeightPerMeter: 0,
    avgEfficiency: 0,
    totalBreakdownMinutes: 0,
    activeLoomsCount: 0,
    activeSupervisorsCount: 0,
    activeOperatorsCount: 0,
  });

  const [loomWise, setLoomWise] = useState<LoomWiseRow[]>([]);
  const [supervisorWise, setSupervisorWise] = useState<SupervisorWiseRow[]>([]);
  const [operatorWise, setOperatorWise] = useState<OperatorWiseRow[]>([]);

  const [availableSupervisors, setAvailableSupervisors] = useState<FilterOption[]>([]);
  const [availableOperators, setAvailableOperators] = useState<FilterOption[]>([]);
  const [availableShifts, setAvailableShifts] = useState<FilterOption[]>([]);

  // Fetch Report Data
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        shiftName: selectedShift,
        loomNumber: selectedLoom,
        supervisorName: selectedSupervisor,
        operatorName: selectedOperator,
        _t: String(Date.now()),
      });

      const res = await fetch(`/api/production/loom/production-report?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load production report");

      const json = await res.json();
      setKpis(json.kpis);
      setLoomWise(json.loomWise || []);
      setSupervisorWise(json.supervisorWise || []);
      setOperatorWise(json.operatorWise || []);

      if (json.filters) {
        setAvailableSupervisors(json.filters.availableSupervisors || []);
        setAvailableOperators(json.filters.availableOperators || []);
        setAvailableShifts(json.filters.availableShifts || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load production report");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedShift, selectedLoom, selectedSupervisor, selectedOperator]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Date Range Quick Preset Helper
  const applyPreset = (preset: "today" | "yesterday" | "week" | "month") => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "week") {
      const w = new Date(now);
      w.setDate(w.getDate() - 6);
      setStartDate(w.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === "month") {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(mStart.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  // Filtered views based on in-table search
  const filteredLoomWise = useMemo(() => {
    if (!tableSearch) return loomWise;
    const q = tableSearch.toLowerCase();
    return loomWise.filter(
      (r) =>
        r.loomNumber.toString().includes(q) ||
        r.qualities.toLowerCase().includes(q) ||
        r.primaryBreakdownReason.toLowerCase().includes(q)
    );
  }, [loomWise, tableSearch]);

  const filteredSupervisorWise = useMemo(() => {
    if (!tableSearch) return supervisorWise;
    const q = tableSearch.toLowerCase();
    return supervisorWise.filter((r) => r.supervisorName.toLowerCase().includes(q));
  }, [supervisorWise, tableSearch]);

  const filteredOperatorWise = useMemo(() => {
    if (!tableSearch) return operatorWise;
    const q = tableSearch.toLowerCase();
    return operatorWise.filter(
      (r) => r.operatorName.toLowerCase().includes(q) || r.loomsList.toLowerCase().includes(q)
    );
  }, [operatorWise, tableSearch]);

  const currentPeriod: ReportPeriod = {
    startDate,
    endDate,
    shiftName: selectedShift,
    targetLoomNumber: selectedLoom !== "ALL" ? Number(selectedLoom) : null,
    targetSupervisor: selectedSupervisor !== "ALL" ? selectedSupervisor : null,
    targetOperator: selectedOperator !== "ALL" ? selectedOperator : null,
  };

  const handlePrint = (criteria: ViewCriteria) => {
    setPrintMenuOpen(false);
    printLoomProductionReport({
      criteria,
      period: currentPeriod,
      kpis,
      loomWise,
      supervisorWise,
      operatorWise,
    });
  };

  const handleExportExcel = () => {
    exportLoomProductionReportExcel({
      period: currentPeriod,
      kpis,
      loomWise,
      supervisorWise,
      operatorWise,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <FileBarChart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Loom Production Report
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-muted text-muted-foreground">
                  {startDate === endDate ? startDate : `${startDate} → ${endDate}`}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Consolidated circular loom analytics across Loom-wise, Supervisor-wise, and Operator-wise criteria.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Presets */}
          <div className="hidden lg:flex items-center bg-muted/60 p-1 rounded-lg border text-xs">
            <button
              onClick={() => applyPreset("today")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                startDate === endDate && startDate === new Date().toISOString().slice(0, 10)
                  ? "bg-background text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => applyPreset("yesterday")}
              className="px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              Yesterday
            </button>
            <button
              onClick={() => applyPreset("week")}
              className="px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyPreset("month")}
              className="px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              This Month
            </button>
          </div>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </button>

          {/* Print Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPrintMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {printMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl border bg-card shadow-xl p-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                <button
                  onClick={() => handlePrint("LOOM")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted font-medium flex items-center justify-between cursor-pointer"
                >
                  <span>Print Loom-Wise</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Loom #1-91</span>
                </button>
                <button
                  onClick={() => handlePrint("SUPERVISOR")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted font-medium flex items-center justify-between cursor-pointer"
                >
                  <span>Print Supervisor-Wise</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Floor In-Charge</span>
                </button>
                <button
                  onClick={() => handlePrint("OPERATOR")}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted font-medium flex items-center justify-between cursor-pointer"
                >
                  <span>Print Operator-Wise</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Output & Eff.</span>
                </button>
                <div className="my-1 border-t" />
                <button
                  onClick={() => handlePrint("CONSOLIDATED")}
                  className="w-full text-left px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>Print Consolidated Total</span>
                  <span className="text-[10px] uppercase font-mono">All Criteria</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Standard ERP Filter Bar */}
      <div className="p-3.5 rounded-xl border bg-card shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Start Date */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <Calendar className="w-3 h-3" /> From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <Calendar className="w-3 h-3" /> To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
            />
          </div>

          {/* Shift */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3" /> Shift
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
            >
              <option value="ALL">All Shifts</option>
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
              <option value="Shift A">Shift A</option>
              <option value="Shift B">Shift B</option>
              {availableShifts.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Loom Number */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <SlidersHorizontal className="w-3 h-3" /> Loom #
            </label>
            <select
              value={selectedLoom}
              onChange={(e) => setSelectedLoom(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
            >
              <option value="ALL">All Looms (1 - 91)</option>
              {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  Loom #{num}
                </option>
              ))}
            </select>
          </div>

          {/* Supervisor */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <Shield className="w-3 h-3" /> Supervisor
            </label>
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
            >
              <option value="ALL">All Supervisors</option>
              {availableSupervisors.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Operator */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              <User className="w-3 h-3" /> Operator
            </label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
            >
              <option value="ALL">All Operators</option>
              {availableOperators.map((o) => (
                <option key={o.id} value={o.name}>
                  {o.name} {o.code ? `(${o.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Highlight Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Rolls Cut</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-foreground">{kpis.totalRollsCut}</span>
            <span className="text-xs text-muted-foreground font-medium">{kpis.activeLoomsCount} Looms</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Cut Length</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {kpis.totalCutMeters.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-mono">meters</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Nett Weight</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {kpis.totalNettKg.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{kpis.totalNettMT} MT</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Avg Efficiency</span>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-2xl font-bold font-mono ${
                kpis.avgEfficiency >= 80
                  ? "text-emerald-600 dark:text-emerald-400"
                  : kpis.avgEfficiency >= 65
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {kpis.avgEfficiency.toFixed(1)}%
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400 font-mono font-bold">
              {kpis.avgWeightPerMeter.toFixed(1)} g/m
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Downtime</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {Math.round(kpis.totalBreakdownMinutes / 60)}h {kpis.totalBreakdownMinutes % 60}m
            </span>
            <span className="text-xs text-muted-foreground font-medium">downtime</span>
          </div>
        </div>
      </div>

      {/* Segmented Criteria Selector & Table Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3">
        {/* Segmented Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-muted/80 border text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveCriteria("LOOM")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeCriteria === "LOOM"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Loom-Wise ({loomWise.length})
          </button>
          <button
            onClick={() => setActiveCriteria("SUPERVISOR")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeCriteria === "SUPERVISOR"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Supervisor-Wise ({supervisorWise.length})
          </button>
          <button
            onClick={() => setActiveCriteria("OPERATOR")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeCriteria === "OPERATOR"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Operator-Wise ({operatorWise.length})
          </button>
          <button
            onClick={() => setActiveCriteria("CONSOLIDATED")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeCriteria === "CONSOLIDATED"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Consolidated View
          </button>
        </div>

        {/* Local Table Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search within report..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
          />
        </div>
      </div>

      {/* CRITERIA SECTION 1: LOOM-WISE REPORT */}
      {(activeCriteria === "LOOM" || activeCriteria === "CONSOLIDATED") && (
        <div className="space-y-3">
          {activeCriteria === "CONSOLIDATED" && (
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Loom-Wise Production ({loomWise.length} Active Looms)
              </h3>
              <button
                onClick={() => handlePrint("LOOM")}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" /> Print Loom-Wise
              </button>
            </div>
          )}

          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3 w-16 text-center">Loom #</th>
                    <th className="py-2.5 px-3">Qualities Produced</th>
                    <th className="py-2.5 px-3 w-20 text-center">Rolls Cut</th>
                    <th className="py-2.5 px-3 w-28 text-right bg-sky-500/5 text-sky-600 dark:text-sky-400 font-bold">
                      Cut Length (m)
                    </th>
                    <th className="py-2.5 px-3 w-28 text-right text-muted-foreground">Reading (m)</th>
                    <th className="py-2.5 px-3 w-24 text-right">Gross (kg)</th>
                    <th className="py-2.5 px-3 w-28 text-right bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold">
                      Nett Wt (kg)
                    </th>
                    <th className="py-2.5 px-3 w-20 text-right text-purple-600 dark:text-purple-400 font-bold">
                      Avg (g/m)
                    </th>
                    <th className="py-2.5 px-3 w-20 text-right">Efficiency</th>
                    <th className="py-2.5 px-3 w-24 text-right text-rose-600">Downtime</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Primary Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                        Generating production report...
                      </td>
                    </tr>
                  ) : filteredLoomWise.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-muted-foreground italic">
                        No production records found for the selected loom filters.
                      </td>
                    </tr>
                  ) : (
                    filteredLoomWise.map((r) => (
                      <tr key={r.loomNumber} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                          #{r.loomNumber}
                        </td>
                        <td className="py-2 px-3 font-semibold text-foreground max-w-[200px] truncate">
                          {r.qualities}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-foreground">
                          {r.totalRolls}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/5">
                          {r.cutMeters.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {r.readingMeters.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {r.grossWeightKg.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                          {r.nettWeightKg.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                          {r.avgWeightPerMeter.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              r.avgEfficiency >= 80
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : r.avgEfficiency >= 65
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {r.avgEfficiency.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                          {r.breakdownMinutes > 0 ? `${r.breakdownMinutes}m` : "0m"}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-[11px] truncate max-w-[150px]">
                          {r.primaryBreakdownReason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/70 font-bold text-foreground">
                    <td colSpan={2} className="py-2.5 px-3 text-right">
                      LOOM TOTALS:
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{kpis.totalRollsCut}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-sky-600 dark:text-sky-400">
                      {kpis.totalCutMeters.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                      {kpis.totalReadingMeters.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{kpis.totalGrossKg.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {kpis.totalNettKg.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-purple-600 dark:text-purple-400">
                      {kpis.avgWeightPerMeter.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{kpis.avgEfficiency.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                      {kpis.totalBreakdownMinutes}m
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CRITERIA SECTION 2: SUPERVISOR-WISE REPORT */}
      {(activeCriteria === "SUPERVISOR" || activeCriteria === "CONSOLIDATED") && (
        <div className="space-y-3">
          {activeCriteria === "CONSOLIDATED" && (
            <div className="flex items-center justify-between pt-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Supervisor-Wise Production ({supervisorWise.length} Floor Supervisors)
              </h3>
              <button
                onClick={() => handlePrint("SUPERVISOR")}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" /> Print Supervisor-Wise
              </button>
            </div>
          )}

          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                    <th className="py-2.5 px-3">Supervisor In-Charge</th>
                    <th className="py-2.5 px-3 w-24 text-center">Shifts Logged</th>
                    <th className="py-2.5 px-3 w-24 text-center">Looms Covered</th>
                    <th className="py-2.5 px-3 w-24 text-center">Rolls Cut</th>
                    <th className="py-2.5 px-3 w-32 text-right bg-sky-500/5 text-sky-600 dark:text-sky-400 font-bold">
                      Cut Length (m)
                    </th>
                    <th className="py-2.5 px-3 w-28 text-right">Gross (kg)</th>
                    <th className="py-2.5 px-3 w-32 text-right bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold">
                      Nett Wt (kg)
                    </th>
                    <th className="py-2.5 px-3 w-24 text-right text-purple-600 dark:text-purple-400 font-bold">
                      Avg (g/m)
                    </th>
                    <th className="py-2.5 px-3 w-24 text-right font-bold text-foreground">Share %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading supervisor statistics...
                      </td>
                    </tr>
                  ) : filteredSupervisorWise.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground italic">
                        No supervisor production records found.
                      </td>
                    </tr>
                  ) : (
                    filteredSupervisorWise.map((r, idx) => (
                      <tr key={r.supervisorName} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-center font-mono font-bold text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-foreground flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {r.supervisorName.charAt(0).toUpperCase()}
                          </div>
                          <span>{r.supervisorName}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{r.shiftsSupervised}</td>
                        <td className="py-2 px-3 text-center font-mono">{r.loomsCoveredCount} Looms</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-foreground">
                          {r.totalRolls}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/5">
                          {r.cutMeters.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                          {r.grossWeightKg.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                          {r.nettWeightKg.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                          {r.avgWeightPerMeter.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            {r.sharePct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/70 font-bold text-foreground">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      SUPERVISOR TOTALS:
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">{kpis.totalRollsCut}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-sky-600 dark:text-sky-400">
                      {kpis.totalCutMeters.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{kpis.totalGrossKg.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {kpis.totalNettKg.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-purple-600 dark:text-purple-400">
                      {kpis.avgWeightPerMeter.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CRITERIA SECTION 3: OPERATOR-WISE REPORT */}
      {(activeCriteria === "OPERATOR" || activeCriteria === "CONSOLIDATED") && (
        <div className="space-y-3">
          {activeCriteria === "CONSOLIDATED" && (
            <div className="flex items-center justify-between pt-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Operator-Wise Production ({operatorWise.length} Floor Operators)
              </h3>
              <button
                onClick={() => handlePrint("OPERATOR")}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" /> Print Operator-Wise
              </button>
            </div>
          )}

          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/60 text-muted-foreground uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                    <th className="py-2.5 px-3">Operator Name</th>
                    <th className="py-2.5 px-3 w-28 text-center">Shift Logs</th>
                    <th className="py-2.5 px-3 w-28 text-center">Looms Handled</th>
                    <th className="py-2.5 px-3">Looms Handled Detail</th>
                    <th className="py-2.5 px-3 w-36 text-right bg-sky-500/5 text-sky-600 dark:text-sky-400 font-bold">
                      Total Production (m)
                    </th>
                    <th className="py-2.5 px-3 w-28 text-right font-bold">Avg Efficiency</th>
                    <th className="py-2.5 px-3 w-28 text-right text-rose-600 font-semibold">Downtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading operator statistics...
                      </td>
                    </tr>
                  ) : filteredOperatorWise.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground italic">
                        No operator production records found.
                      </td>
                    </tr>
                  ) : (
                    filteredOperatorWise.map((r, idx) => (
                      <tr key={r.operatorName} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 text-center font-mono font-bold text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-foreground flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                            {r.operatorName.charAt(0).toUpperCase()}
                          </div>
                          <span>{r.operatorName}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{r.shiftLogsCount}</td>
                        <td className="py-2 px-3 text-center font-mono">{r.loomsHandledCount}</td>
                        <td className="py-2 px-3 text-muted-foreground text-[11px] truncate max-w-[200px]">
                          {r.loomsList || "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/5">
                          {r.totalProductionMeters.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              r.avgEfficiency >= 80
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : r.avgEfficiency >= 65
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {r.avgEfficiency.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                          {r.breakdownMinutes > 0 ? `${r.breakdownMinutes}m` : "0m"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/70 font-bold text-foreground">
                    <td colSpan={5} className="py-2.5 px-3 text-right">
                      OPERATOR TOTALS:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-sky-600 dark:text-sky-400">
                      {kpis.totalReadingMeters.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{kpis.avgEfficiency.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                      {kpis.totalBreakdownMinutes}m
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
