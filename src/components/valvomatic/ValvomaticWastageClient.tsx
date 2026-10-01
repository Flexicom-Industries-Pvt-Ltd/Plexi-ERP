"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Layers,
  Calendar,
  Clock,
  User,
  Scale,
  Sparkles,
  FileCheck,
  AlertCircle,
  Download,
  ArrowDownToLine,
} from "lucide-react";
import {
  ValvomaticWastageEntryItem,
  ValvomaticWastageReportData,
  calculateValvomaticWastageRow,
  computeValvomaticWastageTotals,
} from "@/lib/valvomatic/valvomatic-types";
import { ValvomaticNavigationTabs } from "./ValvomaticNavigationTabs";
import { ValvomaticWastagePrintModal } from "./ValvomaticWastagePrintModal";
import { exportValvomaticWastageReportExcel } from "@/lib/valvomatic/valvomatic-export";

function createEmptyWastageRow(sequence: number): ValvomaticWastageEntryItem {
  return {
    sequence,
    quality: "",
    rollNumber: "",
    productionKg: 0,
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
    netProductionKg: 0,
    remarks: "",
  };
}

export function ValvomaticWastageClient() {
  const [date, setDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [machineNo, setMachineNo] = useState<string>("Valvomatic-1");

  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  const [entries, setEntries] = useState<ValvomaticWastageEntryItem[]>(() => [
    createEmptyWastageRow(1),
    createEmptyWastageRow(2),
    createEmptyWastageRow(3),
    createEmptyWastageRow(4),
    createEmptyWastageRow(5),
  ]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Linked daily production rolls available for sync
  const [linkedProductionEntries, setLinkedProductionEntries] = useState<any[]>([]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const isDirtyRef = useRef<boolean>(false);

  // Ref to hold latest state for debounced auto-save
  const latestDataRef = useRef({
    date,
    shiftName,
    machineNo,
    operatorName,
    supervisorName,
    status,
    remarks,
    entries,
  });

  useEffect(() => {
    latestDataRef.current = {
      date,
      shiftName,
      machineNo,
      operatorName,
      supervisorName,
      status,
      remarks,
      entries,
    };
  }, [date, shiftName, machineNo, operatorName, supervisorName, status, remarks, entries]);

  // Handle escape fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Fetch report data
  const fetchWastageData = useCallback(async () => {
    setLoading(true);
    isInitialLoadRef.current = true;
    isDirtyRef.current = false;
    setAutoSaveError(null);

    try {
      const res = await fetch(
        `/api/production/valvomatic/wastage?date=${date}&shiftName=${encodeURIComponent(
          shiftName
        )}&machineNo=${encodeURIComponent(machineNo)}&_t=${Date.now()}`
      );
      const json = await res.json();

      if (json.success) {
        if (json.linkedProduction) {
          setLinkedProductionEntries(json.linkedProduction.entries || []);
          if (!operatorName && json.linkedProduction.operatorName) {
            setOperatorName(json.linkedProduction.operatorName);
          }
          if (!supervisorName && json.linkedProduction.supervisorName) {
            setSupervisorName(json.linkedProduction.supervisorName);
          }
        }

        if (json.report) {
          const rep = json.report;
          setStatus(rep.status || "DRAFT");
          setOperatorName(rep.operatorName || "");
          setSupervisorName(rep.supervisorName || "");
          setRemarks(rep.remarks || "");

          if (Array.isArray(rep.entries) && rep.entries.length > 0) {
            const parsed = rep.entries.map((e: any, idx: number) =>
              calculateValvomaticWastageRow({
                ...e,
                sequence: idx + 1,
              })
            );
            while (parsed.length < 5) {
              parsed.push(createEmptyWastageRow(parsed.length + 1));
            }
            setEntries(parsed);
          } else {
            setEntries([
              createEmptyWastageRow(1),
              createEmptyWastageRow(2),
              createEmptyWastageRow(3),
              createEmptyWastageRow(4),
              createEmptyWastageRow(5),
            ]);
          }
          setLastSavedAt(format(new Date(rep.updatedAt || Date.now()), "hh:mm a"));
        } else {
          // No report yet
          setStatus("DRAFT");
          setRemarks("");
          setEntries([
            createEmptyWastageRow(1),
            createEmptyWastageRow(2),
            createEmptyWastageRow(3),
            createEmptyWastageRow(4),
            createEmptyWastageRow(5),
          ]);
          setLastSavedAt(null);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Valvomatic wastage report");
    } finally {
      setLoading(false);
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 400);
    }
  }, [date, shiftName, machineNo]);

  useEffect(() => {
    fetchWastageData();
  }, [fetchWastageData]);

  // Cell edit
  const handleCellChange = (
    index: number,
    field: keyof ValvomaticWastageEntryItem,
    value: any
  ) => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const next = [...prev];
      const updatedRow = { ...next[index], [field]: value };
      next[index] = calculateValvomaticWastageRow(updatedRow);
      return next;
    });
  };

  // 1-Click Sync Rolls from Daily Production
  const handleSyncFromDailyProduction = () => {
    if (!linkedProductionEntries || linkedProductionEntries.length === 0) {
      toast.error("No daily production rolls found for this Date, Shift, and Machine.");
      return;
    }

    if (
      entries.some((e) => e.rollNumber || e.productionKg > 0) &&
      !confirm("Syncing will populate/merge rolls from Daily Production into this table. Proceed?")
    ) {
      return;
    }

    isDirtyRef.current = true;
    const synced = linkedProductionEntries.map((prod, idx) => {
      const existing = entries.find((e) => e.rollNumber === prod.rollNumber);
      return calculateValvomaticWastageRow({
        sequence: idx + 1,
        quality: prod.quality || existing?.quality || "Standard Quality",
        rollNumber: prod.rollNumber || "",
        productionKg: Number(prod.productionKg) || existing?.productionKg || 0,
        loomWasteKg: existing?.loomWasteKg || 0,
        lamWasteKg: existing?.lamWasteKg || 0,
        printWasteKg: existing?.printWasteKg || 0,
        machineWasteKg: existing?.machineWasteKg || 0,
        coverPatchWasteKg: existing?.coverPatchWasteKg || 0,
        remarks: existing?.remarks || "",
      });
    });

    while (synced.length < 5) {
      synced.push(createEmptyWastageRow(synced.length + 1));
    }

    setEntries(synced);
    toast.success(`Synced ${linkedProductionEntries.length} rolls from Daily Production!`);
  };

  // Add row
  const handleAddRow = () => {
    isDirtyRef.current = true;
    setEntries((prev) => [...prev, createEmptyWastageRow(prev.length + 1)]);
  };

  // Add 5 rows
  const handleAdd5Rows = () => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const start = prev.length + 1;
      return [
        ...prev,
        createEmptyWastageRow(start),
        createEmptyWastageRow(start + 1),
        createEmptyWastageRow(start + 2),
        createEmptyWastageRow(start + 3),
        createEmptyWastageRow(start + 4),
      ];
    });
  };

  // Reset
  const handleResetToBlank = () => {
    if (confirm("Reset wastage sheet to 5 blank rows? Unsaved changes will be discarded.")) {
      isDirtyRef.current = true;
      setEntries([
        createEmptyWastageRow(1),
        createEmptyWastageRow(2),
        createEmptyWastageRow(3),
        createEmptyWastageRow(4),
        createEmptyWastageRow(5),
      ]);
      setRemarks("");
    }
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length === 0) {
        return [createEmptyWastageRow(1)];
      }
      return filtered.map((row, i) => ({ ...row, sequence: i + 1 }));
    });
  };

  // Core Save
  const saveWastageReport = async (
    overrideStatus?: "DRAFT" | "SUBMITTED" | "APPROVED",
    isSilent = false
  ) => {
    const currentData = latestDataRef.current;
    const finalStatus = overrideStatus || currentData.status;

    if (!isSilent) setSaving(true);
    else setIsAutoSaving(true);
    setAutoSaveError(null);

    try {
      const payload: ValvomaticWastageReportData = {
        date: currentData.date,
        shiftName: currentData.shiftName,
        machineNo: currentData.machineNo,
        operatorName: currentData.operatorName,
        supervisorName: currentData.supervisorName,
        status: finalStatus,
        remarks: currentData.remarks,
        totalProductionKg: 0,
        totalLoomWasteKg: 0,
        totalLoomWastePct: 0,
        totalLamWasteKg: 0,
        totalLamWastePct: 0,
        totalPrintWasteKg: 0,
        totalPrintWastePct: 0,
        totalMachineWasteKg: 0,
        totalMachineWastePct: 0,
        totalCoverPatchWasteKg: 0,
        totalCoverPatchWastePct: 0,
        totalWastageKg: 0,
        totalWastagePct: 0,
        totalNetProductionKg: 0,
        entries: currentData.entries,
      };

      const res = await fetch("/api/production/valvomatic/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save wastage report");
      }

      setLastSavedAt(format(new Date(), "hh:mm:ss a"));
      isDirtyRef.current = false;

      if (!isSilent) {
        toast.success(
          finalStatus === "SUBMITTED"
            ? "Wastage report submitted successfully!"
            : "Wastage report saved successfully!"
        );
      }
    } catch (err: any) {
      console.error("Valvomatic wastage save error:", err);
      setAutoSaveError(err.message || "Auto-save failed");
      if (!isSilent) {
        toast.error(err.message || "Failed to save wastage report");
      }
    } finally {
      if (!isSilent) setSaving(false);
      else setIsAutoSaving(false);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    if (!isDirtyRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        saveWastageReport(undefined, true);
      }
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [entries, operatorName, supervisorName, remarks, status]);

  // Totals
  const totals = useMemo(() => computeValvomaticWastageTotals(entries), [entries]);

  // Current full report data for print and export
  const currentReportData: ValvomaticWastageReportData = useMemo(() => {
    return {
      date,
      shiftName,
      machineNo,
      operatorName,
      supervisorName,
      status,
      remarks,
      ...totals,
      entries,
    };
  }, [date, shiftName, machineNo, operatorName, supervisorName, status, remarks, totals, entries]);

  return (
    <div
      className={`space-y-4 pb-16 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-100 p-4 overflow-y-auto"
          : "max-w-[100vw] overflow-x-hidden"
      }`}
    >
      {/* Navigation Sub-module Tabs */}
      <ValvomaticNavigationTabs currentTab="wastage" />

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Valvomatic Wastage & Scrap Accounting
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Granular roll-by-roll wastage accounting, scrap categorization, & net good production
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Strip */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-save status feedback */}
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mr-2">
              {isAutoSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span className="text-primary font-medium">Auto-saving...</span>
                </>
              ) : autoSaveError ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-rose-600 font-medium">Save failed</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-slate-600">Saved at {lastSavedAt}</span>
                </>
              ) : null}
            </div>

            {/* Sync Rolls from Daily Production */}
            <button
              onClick={handleSyncFromDailyProduction}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-300 transition-colors shadow-xs"
              title="Populate roll numbers and production kg from the matching Daily Production sheet"
            >
              <ArrowDownToLine className="h-3.5 w-3.5 text-sky-600" />
              Sync Rolls ({linkedProductionEntries.length})
            </button>

            <button
              onClick={() => saveWastageReport("DRAFT")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
              Save Draft
            </button>

            <button
              onClick={() => saveWastageReport("SUBMITTED")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-50"
            >
              <FileCheck className="h-3.5 w-3.5" />
              Submit Report
            </button>

            <button
              onClick={() => exportValvomaticWastageReportExcel(currentReportData)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Excel
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Sheet
            </button>

            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Header Metadata Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
              <option value="Valvomatic-1">Valvomatic-1</option>
              <option value="Valvomatic-2">Valvomatic-2</option>
              <option value="Valvomatic-3">Valvomatic-3</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Operator</label>
            <input
              type="text"
              placeholder="Operator name"
              value={operatorName}
              onChange={(e) => {
                isDirtyRef.current = true;
                setOperatorName(e.target.value);
              }}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Supervisor</label>
            <input
              type="text"
              placeholder="Supervisor name"
              value={supervisorName}
              onChange={(e) => {
                isDirtyRef.current = true;
                setSupervisorName(e.target.value);
              }}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                isDirtyRef.current = true;
                setStatus(e.target.value as any);
              }}
              className={`w-full text-xs px-2.5 py-1.5 font-bold rounded-lg border focus:outline-hidden ${
                status === "APPROVED"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : status === "SUBMITTED"
                  ? "bg-blue-50 text-blue-800 border-blue-300"
                  : "bg-amber-50 text-amber-800 border-amber-300"
              }`}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Rolls</div>
          <div className="text-base font-black text-slate-900 font-mono mt-0.5">{entries.length}</div>
        </div>
        <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-teal-800">Gross (Kg)</div>
          <div className="text-base font-black text-teal-700 font-mono mt-0.5">
            {totals.totalProductionKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Loom Waste</div>
          <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
            {totals.totalLoomWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Lam Waste</div>
          <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
            {totals.totalLamWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Print Waste</div>
          <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
            {totals.totalPrintWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Mach Waste</div>
          <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
            {totals.totalMachineWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Cover Waste</div>
          <div className="text-sm font-black text-indigo-700 font-mono mt-0.5">
            {totals.totalCoverPatchWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-rose-800">Total Waste</div>
          <div className="text-base font-black text-rose-700 font-mono mt-0.5">
            {totals.totalWastageKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-amber-800">Waste %</div>
          <div className="text-base font-black text-amber-700 font-mono mt-0.5">
            {totals.totalWastagePct.toFixed(2)}%
          </div>
        </div>
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-emerald-800">Net Prod (Kg)</div>
          <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
            {totals.totalNetProductionKg.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Main Wastage Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Wastage Entries Breakdown Table
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {entries.length} rolls
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              Add Row
            </button>
            <button
              onClick={handleAdd5Rows}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-600" />
              +5 Rows
            </button>
            <button
              onClick={handleResetToBlank}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 transition-colors shadow-2xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>

        {/* Scrollable Table Grid */}
        <div ref={tableContainerRef} className="overflow-x-auto max-h-[620px] relative">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap min-w-[1400px]">
            <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-bold tracking-wider sticky top-0 z-10 border-b border-slate-300 shadow-2xs">
              <tr>
                <th rowSpan={2} className="p-2 border-r border-slate-200 text-center w-10">#</th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[170px] bg-amber-50/80 text-amber-950 font-black">
                  Quality Name
                </th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[130px] text-center bg-slate-200/80 font-black">
                  Roll No.
                </th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[110px] text-right bg-teal-50 text-teal-900 font-black">
                  Gross Prod (Kg)
                </th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Loom Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Lam Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Print Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Machine Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Cover Patch Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center bg-rose-50 text-rose-900 font-bold">
                  Total Wastage
                </th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[120px] text-right bg-emerald-50 text-emerald-900 font-black">
                  Net Prod (Kg)
                </th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[140px]">Remarks</th>
                <th rowSpan={2} className="p-2 text-center w-10">Action</th>
              </tr>
              <tr className="text-[10px] text-slate-600 bg-slate-100">
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[70px] bg-rose-50/80 text-rose-900 font-bold">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[60px] bg-rose-50/80 text-rose-800 text-[9px]">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={19} className="p-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading wastage data...
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-1 border-r border-slate-200 text-center font-bold text-slate-500 bg-slate-50/50">
                      {index + 1}
                    </td>

                    {/* Quality */}
                    <td className="p-1 border-r border-slate-200 bg-amber-50/40">
                      <input
                        type="text"
                        value={entry.quality || ""}
                        onChange={(e) => handleCellChange(index, "quality", e.target.value)}
                        placeholder="Quality name..."
                        className="w-full px-2 py-1 text-xs font-bold text-slate-900 border border-transparent hover:border-amber-300 focus:border-amber-500 rounded focus:outline-hidden bg-transparent"
                      />
                    </td>

                    {/* Roll No */}
                    <td className="p-1 border-r border-slate-200 bg-slate-50/50">
                      <input
                        type="text"
                        value={entry.rollNumber || ""}
                        onChange={(e) => handleCellChange(index, "rollNumber", e.target.value)}
                        placeholder="Roll #"
                        className="w-full px-2 py-1 text-xs font-mono font-bold text-center border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent"
                      />
                    </td>

                    {/* Production (Kg) */}
                    <td className="p-1 border-r border-slate-200 bg-teal-50/50">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={entry.productionKg || ""}
                        onChange={(e) =>
                          handleCellChange(index, "productionKg", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.0"
                        className="w-full px-2 py-1 text-xs font-mono font-black text-teal-800 border border-transparent hover:border-teal-300 focus:border-teal-500 rounded focus:outline-hidden bg-transparent text-right"
                      />
                    </td>

                    {/* Loom Waste Kg & Pct */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.loomWasteKg || ""}
                        onChange={(e) =>
                          handleCellChange(index, "loomWasteKg", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 px-1.5">
                      {entry.loomWastePct > 0 ? `${entry.loomWastePct.toFixed(1)}%` : "—"}
                    </td>

                    {/* Lam Waste Kg & Pct */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.lamWasteKg || ""}
                        onChange={(e) =>
                          handleCellChange(index, "lamWasteKg", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 px-1.5">
                      {entry.lamWastePct > 0 ? `${entry.lamWastePct.toFixed(1)}%` : "—"}
                    </td>

                    {/* Print Waste Kg & Pct */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.printWasteKg || ""}
                        onChange={(e) =>
                          handleCellChange(index, "printWasteKg", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 px-1.5">
                      {entry.printWastePct > 0 ? `${entry.printWastePct.toFixed(1)}%` : "—"}
                    </td>

                    {/* Machine Waste Kg & Pct */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.machineWasteKg || ""}
                        onChange={(e) =>
                          handleCellChange(index, "machineWasteKg", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 px-1.5">
                      {entry.machineWastePct > 0 ? `${entry.machineWastePct.toFixed(1)}%` : "—"}
                    </td>

                    {/* Cover Patch Waste Kg & Pct */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.coverPatchWasteKg || ""}
                        onChange={(e) =>
                          handleCellChange(index, "coverPatchWasteKg", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono text-indigo-700 font-semibold"
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-indigo-500 px-1.5">
                      {entry.coverPatchWastePct > 0 ? `${entry.coverPatchWastePct.toFixed(1)}%` : "—"}
                    </td>

                    {/* Total Waste (Kg & %) Auto-calculated */}
                    <td className="p-1 border-r border-slate-200 bg-rose-50/60 text-right font-mono font-bold text-rose-700 px-2">
                      {entry.totalWasteKg > 0 ? entry.totalWasteKg.toFixed(2) : "0.00"}
                    </td>
                    <td className="p-1 border-r border-slate-200 bg-rose-50/40 text-right font-mono text-[10px] text-rose-600 px-1.5">
                      {entry.totalWastePct > 0 ? `${entry.totalWastePct.toFixed(1)}%` : "0.0%"}
                    </td>

                    {/* Net Production (Kg) Auto-calculated */}
                    <td className="p-1 border-r border-slate-200 bg-emerald-50/60 text-right font-mono font-black text-emerald-800 px-2">
                      {entry.netProductionKg > 0 ? entry.netProductionKg.toFixed(1) : "0.0"}
                    </td>

                    {/* Remarks */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={entry.remarks || ""}
                        onChange={(e) => handleCellChange(index, "remarks", e.target.value)}
                        placeholder="Notes..."
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-slate-600"
                      />
                    </td>

                    {/* Action */}
                    <td className="p-1 text-center">
                      <button
                        onClick={() => handleDeleteRow(index)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors opacity-70 group-hover:opacity-100"
                        title="Delete Row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Totals Footer Row */}
            <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400 text-xs">
              <tr>
                <td className="p-2 border-r border-slate-300 text-center">Σ</td>
                <td colSpan={2} className="p-2 border-r border-slate-300 uppercase">
                  Wastage Totals
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-teal-800 bg-teal-100">
                  {totals.totalProductionKg.toFixed(1)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {totals.totalLoomWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-slate-500">
                  {totals.totalLoomWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {totals.totalLamWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-slate-500">
                  {totals.totalLamWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {totals.totalPrintWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-slate-500">
                  {totals.totalPrintWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {totals.totalMachineWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-slate-500">
                  {totals.totalMachineWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-indigo-800">
                  {totals.totalCoverPatchWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-indigo-600">
                  {totals.totalCoverPatchWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-rose-800 bg-rose-100">
                  {totals.totalWastageKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-rose-800 bg-rose-100 text-[10px]">
                  {totals.totalWastagePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-emerald-800 bg-emerald-100">
                  {totals.totalNetProductionKg.toFixed(1)}
                </td>
                <td colSpan={2} className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Remarks Section */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Wastage Remarks / Scrap Observations / Recycling Route
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => {
              isDirtyRef.current = true;
              setRemarks(e.target.value);
            }}
            placeholder="Add any specific observations for this shift's scrap generation (e.g. edge trimming variation, printing defect rolls sent to recycling)..."
            className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary bg-white"
          />
        </div>
      </div>

      {/* Formal Wastage Print Modal */}
      <ValvomaticWastagePrintModal
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        data={currentReportData}
      />
    </div>
  );
}
