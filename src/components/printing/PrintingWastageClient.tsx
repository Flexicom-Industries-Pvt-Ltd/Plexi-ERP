"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Trash2,
  Printer,
  Save,
  RefreshCw,
  Scale,
  Percent,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  TrendingDown,
  History,
} from "lucide-react";
import {
  PrintingWastageReportData,
  calculatePrintingWastage,
} from "@/lib/printing/printing-types";
import { PrintingWastagePrintModal } from "./PrintingWastagePrintModal";

export function PrintingWastageClient() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  // Base production numbers
  const [totalProductionKg, setTotalProductionKg] = useState<number>(0);
  const [totalProductionMtrs, setTotalProductionMtrs] = useState<number>(0);

  // Wastage inputs (in kg)
  const [laminationFabricWasteKg, setLaminationFabricWasteKg] = useState<number | string>("");
  const [printFabricWasteKg, setPrintFabricWasteKg] = useState<number | string>("");

  // History list
  const [historyList, setHistoryList] = useState<PrintingWastageReportData[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // 1. Fetch Report for Date & Shift
  const loadReport = useCallback(async () => {
    if (!date || !shiftName) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/production/printing/wastage?date=${date}&shiftName=${encodeURIComponent(shiftName)}`
      );
      if (!res.ok) throw new Error("Failed to load wastage report");
      const data = await res.json();

      if (data.report) {
        const rep = data.report;
        setOperatorName(rep.operatorName || "");
        setSupervisorName(rep.supervisorName || "");
        setStatus(rep.status || "DRAFT");
        setRemarks(rep.remarks || "");
        setTotalProductionKg(rep.totalProductionKg || data.dailyReportTotals?.totalProductionKg || 0);
        setTotalProductionMtrs(rep.totalProductionMtrs || data.dailyReportTotals?.totalProductionMtrs || 0);
        setLaminationFabricWasteKg(rep.laminationFabricWasteKg ?? "");
        setPrintFabricWasteKg(rep.printFabricWasteKg ?? "");
      } else {
        // Auto-resolve base production from Daily Report
        if (data.dailyReportTotals) {
          setTotalProductionKg(data.dailyReportTotals.totalProductionKg || 0);
          setTotalProductionMtrs(data.dailyReportTotals.totalProductionMtrs || 0);
          if (data.dailyReportTotals.operatorName) {
            setOperatorName(data.dailyReportTotals.operatorName);
          }
          if (data.dailyReportTotals.supervisorName) {
            setSupervisorName(data.dailyReportTotals.supervisorName);
          }
        } else {
          setTotalProductionKg(0);
          setTotalProductionMtrs(0);
        }
        setStatus("DRAFT");
        setRemarks("");
        setLaminationFabricWasteKg("");
        setPrintFabricWasteKg("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load wastage data");
    } finally {
      setLoading(false);
    }
  }, [date, shiftName]);

  // 2. Fetch history list
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/production/printing/wastage");
      if (res.ok) {
        const data = await res.json();
        setHistoryList(Array.isArray(data.reports) ? data.reports : []);
      }
    } catch (err) {
      console.error("Failed to load wastage history", err);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Live calculations
  const calc = useMemo(() => {
    return calculatePrintingWastage(
      totalProductionKg,
      Number(laminationFabricWasteKg) || 0,
      Number(printFabricWasteKg) || 0
    );
  }, [totalProductionKg, laminationFabricWasteKg, printFabricWasteKg]);

  // Save handler
  const handleSave = async (targetStatus?: "DRAFT" | "SUBMITTED" | "APPROVED") => {
    if (!date || !shiftName) {
      toast.error("Please specify Date and Shift");
      return;
    }

    if (totalProductionKg <= 0) {
      toast.warning("Base Production Kg is 0. Please verify daily production report.");
    }

    setSaving(true);
    const newStatus = targetStatus || status;

    try {
      const payload: PrintingWastageReportData = {
        date,
        shiftName,
        operatorName: operatorName.trim() || undefined,
        supervisorName: supervisorName.trim() || undefined,
        totalProductionMtrs,
        totalProductionKg,
        laminationFabricWasteKg: Number(laminationFabricWasteKg) || 0,
        laminationFabricWastePct: calc.laminationFabricWastePct,
        printFabricWasteKg: Number(printFabricWasteKg) || 0,
        printFabricWastePct: calc.printFabricWastePct,
        totalWastageKg: calc.totalWastageKg,
        totalWastagePct: calc.totalWastagePct,
        status: newStatus,
        remarks: remarks.trim() || undefined,
      };

      const res = await fetch("/api/production/printing/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save wastage report");
      }

      toast.success(
        newStatus === "SUBMITTED"
          ? "Printing wastage report submitted successfully!"
          : "Printing wastage report saved successfully"
      );
      setStatus(newStatus);
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to save wastage report");
    } finally {
      setSaving(false);
    }
  };

  const reportDataForPrint: PrintingWastageReportData = useMemo(() => {
    return {
      date,
      shiftName,
      operatorName,
      supervisorName,
      totalProductionMtrs,
      totalProductionKg,
      laminationFabricWasteKg: Number(laminationFabricWasteKg) || 0,
      laminationFabricWastePct: calc.laminationFabricWastePct,
      printFabricWasteKg: Number(printFabricWasteKg) || 0,
      printFabricWastePct: calc.printFabricWastePct,
      totalWastageKg: calc.totalWastageKg,
      totalWastagePct: calc.totalWastagePct,
      status,
      remarks,
    };
  }, [
    date,
    shiftName,
    operatorName,
    supervisorName,
    totalProductionMtrs,
    totalProductionKg,
    laminationFabricWasteKg,
    printFabricWasteKg,
    calc,
    status,
    remarks,
  ]);

  // Status benchmark badge
  let badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let badgeLabel = "Optimal (≤ 1.8%)";
  if (calc.totalWastagePct > 3.0) {
    badgeColor = "bg-red-50 text-red-700 border-red-200";
    badgeLabel = "Limit Exceeded (> 3.0%)";
  } else if (calc.totalWastagePct > 1.8) {
    badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
    badgeLabel = "Monitor (1.8% – 3.0%)";
  }

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
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : status === "SUBMITTED"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {status}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Printing Wastage Report
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Track lamination fabric waste (kg and %) & print fabric waste (kg and %) calculated directly from total production.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadReport()}
              disabled={loading}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print Report
            </button>

            <button
              type="button"
              onClick={() => handleSave("DRAFT")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-4 h-4 text-slate-500" />
              Save Draft
            </button>

            <button
              type="button"
              onClick={() => handleSave("SUBMITTED")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
              Submit Report
            </button>
          </div>
        </div>

        {/* Filters and Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Shift
            </label>
            <select
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium"
            >
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
              <option value="General Shift">General Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> Operator
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> Supervisor
            </label>
            <input
              type="text"
              placeholder="e.g. Anil Verma"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-slate-400" /> Production Net Wt
              </span>
              <span className="text-[10px] text-primary font-normal">Auto-Synced</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={totalProductionKg}
                onChange={(e) => setTotalProductionKg(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-sm font-bold font-mono text-blue-700 bg-blue-50/40 border border-blue-200 rounded-md focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 font-medium">
                kg
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Base Production</span>
            <Scale className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {totalProductionKg.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{totalProductionMtrs.toLocaleString()} Mtrs produced</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Lamination Waste</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono mt-2">
            {(Number(laminationFabricWasteKg) || 0).toFixed(2)}{" "}
            <span className="text-xs font-normal text-amber-500">kg</span>
          </div>
          <div className="text-xs font-bold text-amber-700 mt-1">
            {calc.laminationFabricWastePct.toFixed(2)}% of base production
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Print Fabric Waste</span>
            <TrendingDown className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono mt-2">
            {(Number(printFabricWasteKg) || 0).toFixed(2)}{" "}
            <span className="text-xs font-normal text-purple-500">kg</span>
          </div>
          <div className="text-xs font-bold text-purple-700 mt-1">
            {calc.printFabricWastePct.toFixed(2)}% of base production
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Wastage</span>
            <Trash2 className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-700 font-mono mt-2">
            {calc.totalWastageKg.toFixed(2)}{" "}
            <span className="text-xs font-normal text-red-400">kg</span>
          </div>
          <div className="text-xs font-black text-red-700 mt-1">
            {calc.totalWastagePct.toFixed(2)}% ({badgeLabel})
          </div>
        </div>
      </div>

      {/* Main Wastage Input & Calculation Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-slate-900">
              Shift Wastage Measurement & Calculation
            </h2>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>
            {badgeLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lamination Fabric Waste Card */}
          <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                1. Lamination Fabric Waste
              </span>
              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-sm">
                Target: ≤ 1.5%
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Waste Quantity in Kilograms (Kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={laminationFabricWasteKg}
                  onChange={(e) => setLaminationFabricWasteKg(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono font-bold text-amber-900 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-amber-600 font-semibold">
                  kg
                </span>
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Calculated Percentage:</span>
              <span className="text-base font-mono font-black text-amber-800">
                {calc.laminationFabricWastePct.toFixed(2)}%
              </span>
            </div>
            <p className="text-[11px] text-amber-700/80">
              Formula: (Lamination Waste Kg / Base Production {totalProductionKg} Kg) x 100
            </p>
          </div>

          {/* Print Fabric Waste Card */}
          <div className="bg-purple-50/40 border border-purple-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                2. Print Fabric Waste
              </span>
              <span className="text-xs font-mono font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-sm">
                Target: ≤ 1.5%
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Waste Quantity in Kilograms (Kg)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={printFabricWasteKg}
                  onChange={(e) => setPrintFabricWasteKg(e.target.value)}
                  className="w-full px-3 py-2 text-base font-mono font-bold text-purple-900 bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-purple-600 font-semibold">
                  kg
                </span>
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-lg border border-purple-200/60 flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Calculated Percentage:</span>
              <span className="text-base font-mono font-black text-purple-800">
                {calc.printFabricWastePct.toFixed(2)}%
              </span>
            </div>
            <p className="text-[11px] text-purple-700/80">
              Formula: (Print Waste Kg / Base Production {totalProductionKg} Kg) x 100
            </p>
          </div>
        </div>

        {/* Aggregate Summary Box */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
              Total Wastage (Calculated from Total Production {totalProductionKg.toLocaleString()} kg)
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl font-black font-mono text-white">
                {calc.totalWastageKg.toFixed(2)} <span className="text-sm font-normal text-slate-300">kg</span>
              </span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                ({calc.totalWastagePct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Overall Benchmark Assessment</span>
            <span className="text-sm font-bold text-white mt-0.5 block">
              {calc.totalWastagePct <= 1.8
                ? "✓ Optimal factory standards maintained"
                : calc.totalWastagePct <= 3.0
                ? "⚠ Moderate waste level, within warning threshold"
                : "✕ High scrap detected, supervisor audit mandatory"}
            </span>
          </div>
        </div>

        {/* Remarks Input */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
            Root Cause & Quality Supervisor Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Specify reason for lamination/printing trim scrap (e.g. edge alignment adjustment, roll core tail, or color mismatch)..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Recent Wastage History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-slate-900 text-sm">Recent Shift Wastage Records</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {historyList.length} Historical records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3 text-right">Production Wt (kg)</th>
                <th className="px-4 py-3 text-right">Lam Waste (kg)</th>
                <th className="px-4 py-3 text-right">Lam Waste (%)</th>
                <th className="px-4 py-3 text-right">Print Waste (kg)</th>
                <th className="px-4 py-3 text-right">Print Waste (%)</th>
                <th className="px-4 py-3 text-right font-black">Total Waste (kg)</th>
                <th className="px-4 py-3 text-right font-black">Total Waste (%)</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {historyList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400 italic">
                    No historical wastage records logged yet.
                  </td>
                </tr>
              ) : (
                historyList.slice(0, 10).map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    onClick={() => {
                      setDate(item.date);
                      setShiftName(item.shiftName);
                    }}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.date}</td>
                    <td className="px-4 py-3">{item.shiftName}</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-700 font-semibold">
                      {item.totalProductionKg.toLocaleString()} kg
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-amber-700">
                      {item.laminationFabricWasteKg.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                      {item.laminationFabricWastePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-purple-700">
                      {item.printFabricWasteKg.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-purple-700">
                      {item.printFabricWastePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-red-700">
                      {item.totalWastageKg.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-red-700">
                      {item.totalWastagePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          item.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : item.status === "SUBMITTED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Preview Modal */}
      <PrintingWastagePrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        data={reportDataForPrint}
      />
    </div>
  );
}
