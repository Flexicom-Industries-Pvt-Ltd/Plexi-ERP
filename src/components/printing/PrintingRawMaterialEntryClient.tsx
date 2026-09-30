"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Droplets,
  Plus,
  Trash2,
  Printer,
  RefreshCw,
  Gauge,
  Percent,
  Scale,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  PrintingRawMaterialReportData,
  PrintingRawMaterialEntryItem,
  PrintingRawMaterialMasterItem,
  computePrintingRawMaterialTotals,
} from "@/lib/printing/printing-types";
import { PrintingRawMaterialPrintModal } from "./PrintingRawMaterialPrintModal";

export function PrintingRawMaterialEntryClient() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  // Base production printed metres from Daily Report
  const [totalPrintMtrs, setTotalPrintMtrs] = useState<number>(0);

  // Entries
  const [entries, setEntries] = useState<PrintingRawMaterialEntryItem[]>([]);

  // Master materials for dropdown autocomplete
  const [masterMaterials, setMasterMaterials] = useState<PrintingRawMaterialMasterItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // 1. Fetch Master Materials from Data Centre
  useEffect(() => {
    async function loadMasterMaterials() {
      try {
        const res = await fetch("/api/data-centre/printing-raw-materials?activeOnly=true");
        if (res.ok) {
          const data = await res.json();
          setMasterMaterials(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load master materials", err);
      }
    }
    loadMasterMaterials();
  }, []);

  // 2. Fetch Report for Date & Shift
  const loadReport = useCallback(async () => {
    if (!date || !shiftName) return;
    isInitialLoadRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/production/printing/raw-materials?date=${date}&shiftName=${encodeURIComponent(
          shiftName
        )}`
      );
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();

      if (data.report) {
        const rep = data.report;
        setOperatorName(rep.operatorName || "");
        setSupervisorName(rep.supervisorName || "");
        setStatus(rep.status || "DRAFT");
        setRemarks(rep.remarks || "");
        setTotalPrintMtrs(rep.totalPrintMtrs || data.dailyReportTotals?.totalPrintMtrs || 0);

        if (Array.isArray(rep.entries) && rep.entries.length > 0) {
          setEntries(rep.entries);
        } else {
          setEntries([]);
        }
      } else {
        // No report yet: load linked values from dailyReportTotals
        if (data.dailyReportTotals) {
          setTotalPrintMtrs(data.dailyReportTotals.totalPrintMtrs || 0);
          if (data.dailyReportTotals.operatorName) {
            setOperatorName(data.dailyReportTotals.operatorName);
          }
          if (data.dailyReportTotals.supervisorName) {
            setSupervisorName(data.dailyReportTotals.supervisorName);
          }
        } else {
          setTotalPrintMtrs(0);
        }
        setStatus("DRAFT");
        setRemarks("");
        // Start with empty entries
        setEntries([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load raw material report");
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

  // Handle row change
  const handleEntryChange = (index: number, field: keyof PrintingRawMaterialEntryItem, value: any) => {
    setEntries((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };

      // If material selected from master, autofill unit and factor
      if (field === "materialName") {
        const match = masterMaterials.find(
          (m) => m.name.toLowerCase() === String(value).trim().toLowerCase()
        );
        if (match) {
          row.rawMaterialId = match.id;
          row.unit = match.unit || "LITRE";
          row.conversionFactor = match.conversionFactor || 0.82;
        }
      }

      next[index] = row;
      return next;
    });
  };

  const addRow = (presetMaterial?: PrintingRawMaterialMasterItem) => {
    setEntries((prev) => [
      ...prev,
      {
        sequence: prev.length + 1,
        rawMaterialId: presetMaterial?.id || undefined,
        materialName: presetMaterial?.name || "",
        unit: presetMaterial?.unit || "LITRE",
        consumedLitre: 0,
        conversionFactor: presetMaterial?.conversionFactor || 0.82,
        consumedKg: 0,
        ratioPercent: 0,
        mileage: 0,
        remarks: "",
      },
    ]);
  };

  const removeRow = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  // Compute live totals and row ratios/mileage
  const { totals, calculatedEntries } = useMemo(() => {
    return computePrintingRawMaterialTotals(entries, totalPrintMtrs);
  }, [entries, totalPrintMtrs]);

  // Save handler (manual submit or silent auto-save)
  const handleSave = useCallback(
    async (targetStatus?: "DRAFT" | "SUBMITTED" | "APPROVED", silent = false) => {
      if (!date || !shiftName) return;

      const validEntries = entries.filter((e) => e.materialName && e.materialName.trim());
      const hasAnyData =
        validEntries.length > 0 ||
        Boolean(operatorName.trim()) ||
        Boolean(supervisorName.trim()) ||
        Boolean(remarks.trim());

      if (!hasAnyData && (!targetStatus || targetStatus === "DRAFT")) return;

      if (targetStatus === "SUBMITTED" && validEntries.length === 0) {
        toast.error("Please add at least one raw material consumption entry before submitting");
        return;
      }

      if (!silent) setSaving(true);
      else setIsAutoSaving(true);
      setAutoSaveError(null);

      const newStatus = targetStatus || status;

      try {
        const payload: PrintingRawMaterialReportData = {
          date,
          shiftName,
          operatorName: operatorName.trim() || undefined,
          supervisorName: supervisorName.trim() || undefined,
          totalPrintMtrs,
          totalConsumedLitre: totals.totalConsumedLitre,
          totalConsumedKg: totals.totalConsumedKg,
          overallMileage: totals.overallMileage,
          status: newStatus,
          remarks: remarks.trim() || undefined,
          entries: validEntries,
        };

        const res = await fetch("/api/production/printing/raw-materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save raw material report");
        }

        setStatus(newStatus);
        setLastSavedAt(format(new Date(), "hh:mm:ss a"));

        if (!silent) {
          toast.success(
            newStatus === "SUBMITTED"
              ? "Raw material report submitted successfully!"
              : "Raw material report saved successfully"
          );
        }
        // Local entries state is intentionally preserved so user typing, empty rows, and focus are never lost
      } catch (err: any) {
        console.error("Printing raw material auto-save error:", err);
        setAutoSaveError(err.message || "Auto-save failed");
        if (!silent) toast.error(err.message || "Failed to save raw material report");
      } finally {
        setSaving(false);
        setIsAutoSaving(false);
      }
    },
    [date, shiftName, entries, status, operatorName, supervisorName, totalPrintMtrs, totals, remarks]
  );

  // Debounced Auto-Save Trigger (auto save as draft)
  useEffect(() => {
    if (isInitialLoadRef.current || loading) return;
    const hasAnyData =
      entries.some((e) => Boolean(e.materialName?.trim() || Number(e.consumedLitre) > 0 || Number(e.consumedKg) > 0)) ||
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
  }, [entries, remarks, operatorName, supervisorName, loading, handleSave]);

  const reportDataForPrint: PrintingRawMaterialReportData = useMemo(() => {
    return {
      date,
      shiftName,
      operatorName,
      supervisorName,
      totalPrintMtrs,
      totalConsumedLitre: totals.totalConsumedLitre,
      totalConsumedKg: totals.totalConsumedKg,
      overallMileage: totals.overallMileage,
      status,
      remarks,
      entries: calculatedEntries,
    };
  }, [date, shiftName, operatorName, supervisorName, totalPrintMtrs, totals, status, remarks, calculatedEntries]);

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Raw Material Consumption Entry
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Record ink & solvent consumption with 0.82 density conversion, real-time mix ratio %, and printed mileage.
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
              <User className="w-3.5 h-3.5 text-slate-400" /> Machine Operator
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
              <User className="w-3.5 h-3.5 text-slate-400" /> Shift Supervisor
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
                <Gauge className="w-3.5 h-3.5 text-slate-400" /> Printed Metres
              </span>
              <span className="text-[10px] text-primary font-normal">Daily Report Sync</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={totalPrintMtrs}
                onChange={(e) => setTotalPrintMtrs(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-sm font-bold font-mono text-blue-700 bg-blue-50/40 border border-blue-200 rounded-md focus:ring-2 focus:ring-primary/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 font-medium">
                mtrs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Production Base Length</span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {totals.totalPrintMtrs.toLocaleString()} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Used for mileage calculation</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Inks/Solvent (L)</span>
            <Droplets className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono mt-2">
            {totals.totalConsumedLitre.toFixed(2)} <span className="text-xs font-normal text-indigo-400">L</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Liquid consumption</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Weight (Kg)</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-2">
            {totals.totalConsumedKg.toFixed(2)} <span className="text-xs font-normal text-emerald-400">kg</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Calculated via 0.82 density factor</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Overall Mileage</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono mt-2">
            {totals.overallMileage.toLocaleString()} <span className="text-xs font-normal text-purple-400">m/kg</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Metres printed per kg consumed</div>
        </div>
      </div>

      {/* Main Consumption Entries Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-slate-900 text-sm md:text-base">
              Printing Raw Material Entries
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Add from Master Chips */}
            {masterMaterials.slice(0, 3).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => addRow(m)}
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-2.5 py-1 rounded-md transition-colors"
              >
                <Plus className="w-3 h-3 text-slate-400" />
                {m.name}
              </button>
            ))}

            <button
              type="button"
              onClick={() => addRow()}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Raw Material
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 w-10 text-center">#</th>
                <th className="px-3 py-3 min-w-[200px]">Raw Material (Inks / Solvents)</th>
                <th className="px-3 py-3 w-28 text-center">Unit</th>
                <th className="px-3 py-3 w-32 text-right">Consumed (L / Kg)</th>
                <th className="px-3 py-3 w-24 text-center">Factor</th>
                <th className="px-3 py-3 w-32 text-right bg-blue-50/30">Consumed (Kg)</th>
                <th className="px-3 py-3 w-28 text-right bg-purple-50/30">Ratio (%)</th>
                <th className="px-3 py-3 w-36 text-right bg-emerald-50/30">Mileage (m/kg)</th>
                <th className="px-3 py-3 min-w-[150px]">Remarks</th>
                <th className="px-3 py-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {calculatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <Droplets className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No raw materials added yet. Click &quot;Add Raw Material&quot; to begin tracking ink & solvent consumption.
                  </td>
                </tr>
              ) : (
                calculatedEntries.map((row, index) => {
                  const isLitre = (row.unit || "LITRE").toUpperCase() === "LITRE";

                  return (
                    <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Material Select / Input */}
                      <td className="px-3 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            list={`materials-list-${index}`}
                            placeholder="Select or enter material name..."
                            value={row.materialName}
                            onChange={(e) => handleEntryChange(index, "materialName", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                          />
                          <datalist id={`materials-list-${index}`}>
                            {masterMaterials.map((m) => (
                              <option key={m.id} value={m.name}>
                                {m.category} · {m.unit}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </td>

                      {/* Unit Select */}
                      <td className="px-3 py-2 text-center">
                        <select
                          value={row.unit || "LITRE"}
                          onChange={(e) => handleEntryChange(index, "unit", e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white font-mono"
                        >
                          <option value="LITRE">LITRE</option>
                          <option value="KG">KG</option>
                        </select>
                      </td>

                      {/* Consumed in original unit */}
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={isLitre ? row.consumedLitre || "" : row.consumedKg || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            if (isLitre) {
                              handleEntryChange(index, "consumedLitre", val);
                            } else {
                              handleEntryChange(index, "consumedKg", val);
                            }
                          }}
                          className="w-full text-right px-2 py-1 text-xs font-mono font-bold text-blue-700 border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Density Factor */}
                      <td className="px-3 py-2 text-center">
                        {isLitre ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            max="5"
                            value={row.conversionFactor ?? 0.82}
                            onChange={(e) =>
                              handleEntryChange(index, "conversionFactor", Number(e.target.value) || 0.82)
                            }
                            className="w-16 text-center px-1 py-1 text-xs font-mono text-slate-600 border border-slate-200 rounded-md"
                          />
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* Consumed (Kg) */}
                      <td className="px-3 py-2 text-right bg-blue-50/20">
                        <span className="font-mono text-xs font-bold text-emerald-700">
                          {(Number(row.consumedKg) || 0).toFixed(2)} kg
                        </span>
                      </td>

                      {/* Ratio (%) */}
                      <td className="px-3 py-2 text-right bg-purple-50/20">
                        <span className="font-mono text-xs font-bold text-purple-700">
                          {(Number(row.ratioPercent) || 0) > 0 ? `${Number(row.ratioPercent).toFixed(1)}%` : "—"}
                        </span>
                      </td>

                      {/* Mileage (m/kg) */}
                      <td className="px-3 py-2 text-right bg-emerald-50/20">
                        <span className="font-mono text-xs font-extrabold text-blue-800">
                          {(Number(row.mileage) || 0) > 0
                            ? `${Number(row.mileage).toLocaleString()} m/kg`
                            : "—"}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="e.g. Viscosity 18s"
                          value={row.remarks || ""}
                          onChange={(e) => handleEntryChange(index, "remarks", e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-md"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Total Aggregate Row */}
              {calculatedEntries.length > 0 && (
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <td colSpan={3} className="px-3 py-3 text-right uppercase tracking-wider text-slate-800">
                    Grand Totals:
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-blue-700 text-xs font-extrabold">
                    {totals.totalConsumedLitre.toFixed(2)} L
                  </td>
                  <td className="px-3 py-3 text-center text-xs font-mono text-slate-500">—</td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-800 text-sm font-black bg-blue-50/40">
                    {totals.totalConsumedKg.toFixed(2)} kg
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-purple-800 text-xs font-bold bg-purple-50/40">
                    {totals.totalConsumedKg > 0 ? "100.0%" : "—"}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-blue-900 text-sm font-black bg-emerald-50/40">
                    {totals.overallMileage.toLocaleString()} m/kg
                  </td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remarks Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
          Shift Consumption Notes / Solvent Mix Rationale
        </label>
        <textarea
          rows={2}
          placeholder="State any temperature / viscosity adjustments, shade changeover flushing, or machine idle remarks..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Print Preview Modal */}
      <PrintingRawMaterialPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        data={reportDataForPrint}
      />
    </div>
  );
}
