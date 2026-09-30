"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Trash2,
  Printer,
  Scale,
  Calendar,
  Clock,
  User,
  FileCheck,
  TrendingDown,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  PrintingWastageReportData,
  calculatePrintingWastage,
} from "@/lib/printing/printing-types";
import { PrintingWastagePrintModal } from "./PrintingWastagePrintModal";

const SHIFTS = ["Day Shift", "Night Shift", "General Shift"];

export function PrintingWastageClient() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  // Base production numbers (auto-pulled from Daily Production)
  const [totalProductionKg, setTotalProductionKg] = useState<number>(0);
  const [totalProductionMtrs, setTotalProductionMtrs] = useState<number>(0);

  // Wastage inputs (in kg)
  const [laminationFabricWasteKg, setLaminationFabricWasteKg] = useState<string>("");
  const [printFabricWasteKg, setPrintFabricWasteKg] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Fetch Report for Date & Shift
  const loadReport = useCallback(async () => {
    if (!date || !shiftName) return;
    setLoading(true);
    isInitialLoadRef.current = true;
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
        setLaminationFabricWasteKg(rep.laminationFabricWasteKg ? String(rep.laminationFabricWasteKg) : "");
        setPrintFabricWasteKg(rep.printFabricWasteKg ? String(rep.printFabricWasteKg) : "");
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
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  }, [date, shiftName]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Live calculations
  const calc = useMemo(() => {
    return calculatePrintingWastage(
      totalProductionKg,
      parseFloat(laminationFabricWasteKg) || 0,
      parseFloat(printFabricWasteKg) || 0
    );
  }, [totalProductionKg, laminationFabricWasteKg, printFabricWasteKg]);

  // Save handler (manual submit or silent auto-save)
  const handleSave = useCallback(
    async (targetStatus?: "DRAFT" | "SUBMITTED" | "APPROVED", silent = false) => {
      if (!date || !shiftName) return;

      const hasAnyData =
        Boolean(laminationFabricWasteKg) ||
        Boolean(printFabricWasteKg) ||
        Boolean(remarks.trim()) ||
        Boolean(operatorName.trim()) ||
        Boolean(supervisorName.trim());

      if (!hasAnyData && (!targetStatus || targetStatus === "DRAFT")) return;

      if (!silent) setSaving(true);
      else setIsAutoSaving(true);
      setAutoSaveError(null);

      const newStatus = targetStatus || status;

      try {
        const payload: PrintingWastageReportData = {
          date,
          shiftName,
          operatorName: operatorName.trim() || undefined,
          supervisorName: supervisorName.trim() || undefined,
          totalProductionMtrs,
          totalProductionKg,
          laminationFabricWasteKg: parseFloat(laminationFabricWasteKg) || 0,
          laminationFabricWastePct: calc.laminationFabricWastePct,
          printFabricWasteKg: parseFloat(printFabricWasteKg) || 0,
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

        setStatus(newStatus);
        setLastSavedAt(format(new Date(), "hh:mm:ss a"));

        if (!silent) {
          toast.success(
            newStatus === "SUBMITTED"
              ? "Printing wastage report submitted successfully!"
              : "Printing wastage report saved successfully"
          );
        }
      } catch (err: any) {
        console.error("Printing wastage auto-save error:", err);
        setAutoSaveError(err.message || "Auto-save failed");
        if (!silent) toast.error(err.message || "Failed to save wastage report");
      } finally {
        setSaving(false);
        setIsAutoSaving(false);
      }
    },
    [
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
    ]
  );

  // Debounced Auto-Save Trigger (auto save as draft)
  useEffect(() => {
    if (isInitialLoadRef.current || loading) return;
    const hasAnyData =
      Boolean(laminationFabricWasteKg) ||
      Boolean(printFabricWasteKg) ||
      Boolean(remarks.trim()) ||
      Boolean(operatorName.trim()) ||
      Boolean(supervisorName.trim());

    if (!hasAnyData) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave("DRAFT", true);
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [laminationFabricWasteKg, printFabricWasteKg, remarks, operatorName, supervisorName, totalProductionKg, loading, handleSave]);

  const reportDataForPrint: PrintingWastageReportData = useMemo(() => {
    return {
      date,
      shiftName,
      operatorName,
      supervisorName,
      totalProductionMtrs,
      totalProductionKg,
      laminationFabricWasteKg: parseFloat(laminationFabricWasteKg) || 0,
      laminationFabricWastePct: calc.laminationFabricWastePct,
      printFabricWasteKg: parseFloat(printFabricWasteKg) || 0,
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

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Printing Wastage Report
                </h1>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : status === "SUBMITTED"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {status}
                </span>

                {/* Auto-Save Live Status Pill */}
                {isAutoSaving ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/80 px-2.5 py-0.5 rounded-full border border-amber-200 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                    Auto-saving...
                  </span>
                ) : autoSaveError ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50/80 px-2.5 py-0.5 rounded-full border border-rose-200 font-medium cursor-help"
                    title={autoSaveError}
                  >
                    <AlertCircle className="h-3 w-3 text-rose-600" />
                    Auto-save failed
                  </span>
                ) : lastSavedAt ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    All changes saved ({lastSavedAt})
                  </span>
                ) : null}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Track shift lamination and print fabric waste with live percentage calculation against production net weights.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            Print Report
          </button>

          <button
            type="button"
            onClick={() => handleSave("SUBMITTED", false)}
            disabled={saving || loading}
            className="h-9 px-4 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
            Submit Report
          </button>
        </div>
      </div>

      {/* Shift & Date Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-9 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          {/* Shift */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Shift
            </label>
            <select
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="w-full h-9 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary bg-white font-medium"
            >
              {SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Operator / Technician
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full h-9 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Supervisor Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Supervisor
            </label>
            <input
              type="text"
              placeholder="e.g. Anil Verma"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full h-9 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-9 px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary bg-white font-medium"
            >
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
        </div>

        {/* Remarks and Source Indicators */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <span className="text-slate-500 font-medium shrink-0">Remarks:</span>
            <input
              type="text"
              placeholder="Trim scrap cause, roll core tail, or color mismatch..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="h-8 text-xs bg-slate-50/50 w-full rounded-md border border-slate-200 px-3"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400">Daily Production Net Wt:</span>
              {totalProductionKg > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Synced ({totalProductionKg.toLocaleString()} kg)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                  <AlertCircle className="h-2.5 w-2.5" /> Not Found / 0 kg
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              1. Lamination Fabric Waste
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {(parseFloat(laminationFabricWasteKg) || 0).toFixed(2)}{" "}
              <span className="text-xs font-semibold text-slate-400">kg</span>
            </h3>
            <p className="text-xs font-bold text-amber-700 mt-1">
              {calc.laminationFabricWastePct.toFixed(2)}%{" "}
              <span className="text-[11px] font-normal text-slate-500">
                of base production ({totalProductionKg.toLocaleString()} kg)
              </span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-800 uppercase tracking-wider">
              2. Print Fabric Waste
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {(parseFloat(printFabricWasteKg) || 0).toFixed(2)}{" "}
              <span className="text-xs font-semibold text-slate-400">kg</span>
            </h3>
            <p className="text-xs font-bold text-purple-700 mt-1">
              {calc.printFabricWastePct.toFixed(2)}%{" "}
              <span className="text-[11px] font-normal text-slate-500">
                of base production ({totalProductionKg.toLocaleString()} kg)
              </span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
              Total Shift Wastage
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {calc.totalWastageKg.toFixed(2)}{" "}
              <span className="text-xs font-semibold text-slate-400">kg</span>
            </h3>
            <p className="text-xs font-bold text-rose-600 mt-1">
              {calc.totalWastagePct.toFixed(2)}%{" "}
              <span className="text-[11px] font-normal text-slate-500">
                {calc.totalWastagePct <= 1.8
                  ? "(Optimal ≤ 1.8%)"
                  : calc.totalWastagePct <= 3.0
                  ? "(Monitor 1.8% – 3.0%)"
                  : "(Limit Exceeded > 3.0%)"}
              </span>
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <Trash2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Wastage Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Shift Wastage Breakdown & Percentage Calculations
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Formula: (Wastage kg ÷ Base Production {totalProductionKg.toLocaleString()} kg) × 100
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">S.No.</th>
                <th className="py-3 px-4 w-48">Wastage Type</th>
                <th className="py-3 px-4">Base Input Material (Source)</th>
                <th className="py-3 px-4 w-44 text-right">Base Qty (kg)</th>
                <th className="py-3 px-4 w-44 text-right">Wastage Qty (kg)</th>
                <th className="py-3 px-4 w-36 text-right">Wastage %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {/* ROW 1: LAMINATION FABRIC WASTE */}
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 text-center font-medium text-slate-500">1</td>
                <td className="py-3.5 px-4 font-bold text-amber-900">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    Lamination Fabric Waste
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  <div className="font-medium text-slate-900">
                    Daily Production Total Net Weight
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Auto-synced from shift daily production report
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="relative inline-block w-36">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={totalProductionKg}
                      onChange={(e) => setTotalProductionKg(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full h-8 px-3 text-right font-bold text-xs pr-6 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="relative inline-block w-36">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={laminationFabricWasteKg}
                      onChange={(e) => setLaminationFabricWasteKg(e.target.value)}
                      placeholder="Enter kg"
                      className="w-full h-8 px-3 text-right font-bold text-xs pr-6 bg-amber-50/40 border border-amber-300 rounded-md focus:ring-1 focus:ring-amber-500 text-amber-950"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-sm text-amber-700">
                  {calc.laminationFabricWastePct.toFixed(2)}%
                </td>
              </tr>

              {/* ROW 2: PRINT FABRIC WASTE */}
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4 text-center font-medium text-slate-500">2</td>
                <td className="py-3.5 px-4 font-bold text-purple-900">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                    Print Fabric Waste
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  <div className="font-medium text-slate-900">
                    Daily Production Total Net Weight
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Auto-synced from shift daily production report
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="relative inline-block w-36">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={totalProductionKg}
                      onChange={(e) => setTotalProductionKg(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full h-8 px-3 text-right font-bold text-xs pr-6 bg-slate-50 border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="relative inline-block w-36">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={printFabricWasteKg}
                      onChange={(e) => setPrintFabricWasteKg(e.target.value)}
                      placeholder="Enter kg"
                      className="w-full h-8 px-3 text-right font-bold text-xs pr-6 bg-purple-50/40 border border-purple-300 rounded-md focus:ring-1 focus:ring-purple-500 text-purple-950"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      kg
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-extrabold text-sm text-purple-700">
                  {calc.printFabricWastePct.toFixed(2)}%
                </td>
              </tr>
            </tbody>

            {/* TOTALS FOOTER */}
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                <td colSpan={3} className="py-3 px-4 text-right uppercase tracking-wider">
                  Combined Shift Total:
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                  {totalProductionKg.toLocaleString()} kg
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                  {calc.totalWastageKg.toFixed(2)} kg
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-sm">
                  {calc.totalWastagePct.toFixed(2)}%
                </td>
              </tr>
            </tfoot>
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
