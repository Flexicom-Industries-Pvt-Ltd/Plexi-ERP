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
  Search,
  Calendar,
  Clock,
  User,
  Scale,
  Sparkles,
  FileCheck,
  AlertCircle,
  Tag,
} from "lucide-react";
import {
  ValvomaticReportItem,
  ValvomaticDailyReportData,
  calculateValvomaticRow,
  computeValvomaticTotals,
} from "@/lib/valvomatic/valvomatic-types";
import { ValvomaticReportPrintModal } from "./ValvomaticReportPrintModal";
import { exportValvomaticReportExcel } from "@/lib/valvomatic/valvomatic-export";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";

function createEmptyValvomaticRow(sequence: number): ValvomaticReportItem {
  return {
    sequence,
    companyName: "",
    unitName: "",
    grade: "",
    targetProductionPcs: 0,
    quality: "",
    partyName: "",
    rollNumber: "",
    loomNumber: "",
    rollMtr: 0,
    netWeight: 0,
    avgWeight: 0,
    openingMeterReading: 0,
    closingMeterReading: 0,
    coverPatchOs: 0,
    coverPatchDs: 0,
    valvePatch: 0,
    productionPcs: 0,
    productionKg: 0,
    remarks: "",
  };
}

export function ValvomaticDailyReportClient() {
  const [date, setDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [machineNo, setMachineNo] = useState<string>("Valvomatic-1");

  const [companyName, setCompanyName] = useState<string>("FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA");
  const [unitName, setUnitName] = useState<string>("Unit-1");
  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  // Start with 5 clean rows
  const [entries, setEntries] = useState<ValvomaticReportItem[]>(() => [
    createEmptyValvomaticRow(1),
    createEmptyValvomaticRow(2),
    createEmptyValvomaticRow(3),
    createEmptyValvomaticRow(4),
    createEmptyValvomaticRow(5),
  ]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Available roll autocomplete picker state
  const [availableRolls, setAvailableRolls] = useState<any[]>([]);
  const [activeRollSearchRow, setActiveRollSearchRow] = useState<number | null>(null);
  const [rollSearchQuery, setRollSearchQuery] = useState<string>("");

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const isDirtyRef = useRef<boolean>(false);

  // Keep a reference to the latest data to prevent stale closures during auto-save
  const latestDataRef = useRef({
    date,
    shiftName,
    machineNo,
    companyName,
    unitName,
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
      companyName,
      unitName,
      operatorName,
      supervisorName,
      status,
      remarks,
      entries,
    };
  }, [date, shiftName, machineNo, companyName, unitName, operatorName, supervisorName, status, remarks, entries]);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Fetch available rolls for suggestion
  const fetchAvailableRolls = useCallback(async (query: string = "") => {
    try {
      const res = await fetch(
        `/api/production/valvomatic/available-rolls?search=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const json = await res.json();
        setAvailableRolls(Array.isArray(json.rolls) ? json.rolls : []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAvailableRolls();
  }, [fetchAvailableRolls]);

  // Fetch report data for Date, Shift, and Machine
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    isInitialLoadRef.current = true;
    isDirtyRef.current = false;
    setAutoSaveError(null);

    try {
      const res = await fetch(
        `/api/production/valvomatic/reports?date=${date}&shiftName=${encodeURIComponent(
          shiftName
        )}&machineNo=${encodeURIComponent(machineNo)}&_t=${Date.now()}`
      );
      const json = await res.json();

      if (json.success && json.report) {
        const rep = json.report;
        setStatus(rep.status || "DRAFT");
        setOperatorName(rep.operatorName || "");
        setSupervisorName(rep.supervisorName || "");
        setCompanyName(rep.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA");
        setUnitName(rep.unitName || "Unit-1");
        setRemarks(rep.remarks || "");

        if (Array.isArray(rep.entries) && rep.entries.length > 0) {
          const parsed = rep.entries.map((e: any, idx: number) =>
            calculateValvomaticRow({
              ...e,
              quality: e.quality || e.partyName || "",
              partyName: e.quality || e.partyName || "",
              sequence: idx + 1,
            })
          );
          while (parsed.length < 5) {
            parsed.push(createEmptyValvomaticRow(parsed.length + 1));
          }
          setEntries(parsed);
        } else {
          setEntries([
            createEmptyValvomaticRow(1),
            createEmptyValvomaticRow(2),
            createEmptyValvomaticRow(3),
            createEmptyValvomaticRow(4),
            createEmptyValvomaticRow(5),
          ]);
        }
        setLastSavedAt(format(new Date(rep.updatedAt || Date.now()), "hh:mm a"));
      } else {
        // No report exists for this shift
        setStatus("DRAFT");
        setRemarks("");
        setEntries([
          createEmptyValvomaticRow(1),
          createEmptyValvomaticRow(2),
          createEmptyValvomaticRow(3),
          createEmptyValvomaticRow(4),
          createEmptyValvomaticRow(5),
        ]);
        setLastSavedAt(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Valvomatic production report");
    } finally {
      setLoading(false);
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 400);
    }
  }, [date, shiftName, machineNo]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Handle cell edits with live recalculation and dirty flagging
  const handleCellChange = (index: number, field: keyof ValvomaticReportItem, value: any) => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const next = [...prev];
      const updatedRow = { ...next[index], [field]: value };
      next[index] = calculateValvomaticRow(updatedRow);
      return next;
    });
  };

  // Add row
  const handleAddRow = () => {
    isDirtyRef.current = true;
    setEntries((prev) => [...prev, createEmptyValvomaticRow(prev.length + 1)]);
  };

  // Add 5 rows
  const handleAdd5Rows = () => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const start = prev.length + 1;
      return [
        ...prev,
        createEmptyValvomaticRow(start),
        createEmptyValvomaticRow(start + 1),
        createEmptyValvomaticRow(start + 2),
        createEmptyValvomaticRow(start + 3),
        createEmptyValvomaticRow(start + 4),
      ];
    });
  };

  // Reset to blank
  const handleResetToBlank = () => {
    if (confirm("Reset sheet to 5 blank rows? Unsaved changes will be discarded.")) {
      isDirtyRef.current = true;
      setEntries([
        createEmptyValvomaticRow(1),
        createEmptyValvomaticRow(2),
        createEmptyValvomaticRow(3),
        createEmptyValvomaticRow(4),
        createEmptyValvomaticRow(5),
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
        return [createEmptyValvomaticRow(1)];
      }
      return filtered.map((row, i) => ({ ...row, sequence: i + 1 }));
    });
  };

  // Fill from suggested roll
  const handleSelectSuggestedRoll = (rowIndex: number, roll: any) => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const next = [...prev];
      const target = next[rowIndex];
      const updated = calculateValvomaticRow({
        ...target,
        rollNumber: roll.rollNumber,
        companyName: roll.companyName || target.companyName,
        unitName: roll.unitName || target.unitName,
        grade: roll.grade || target.grade,
        quality: roll.quality || roll.partyName || target.quality,
        partyName: roll.quality || roll.partyName || target.partyName,
        loomNumber: roll.loomNumber || target.loomNumber,
        rollMtr: Number(roll.rollMtr) || target.rollMtr,
        netWeight: Number(roll.netWeight) || target.netWeight,
        targetProductionPcs: Number(roll.targetProductionPcs) || target.targetProductionPcs,
      });
      next[rowIndex] = updated;
      return next;
    });
    setActiveRollSearchRow(null);
  };

  // Core save function
  const saveReport = async (overrideStatus?: "DRAFT" | "SUBMITTED" | "APPROVED", isSilent = false) => {
    const currentData = latestDataRef.current;
    const finalStatus = overrideStatus || currentData.status;

    if (!isSilent) setSaving(true);
    else setIsAutoSaving(true);
    setAutoSaveError(null);

    try {
      const currentTotals = computeValvomaticTotals(currentData.entries);
      const payload: ValvomaticDailyReportData = {
        date: currentData.date,
        shiftName: currentData.shiftName,
        machineNo: currentData.machineNo,
        companyName: currentData.companyName,
        unitName: currentData.unitName,
        operatorName: currentData.operatorName,
        supervisorName: currentData.supervisorName,
        status: finalStatus,
        remarks: currentData.remarks,
        totalRolls: currentTotals.totalRolls,
        totalRollMtr: currentTotals.totalRollMtr,
        totalNetWt: currentTotals.totalNetWt,
        avgWeightGsm: currentTotals.avgWeightGsm,
        totalCoverPatchOs: currentTotals.totalCoverPatchOs,
        totalCoverPatchDs: currentTotals.totalCoverPatchDs,
        totalValvePatch: currentTotals.totalValvePatch,
        totalProductionPcs: currentTotals.totalProductionPcs,
        totalProductionKg: currentTotals.totalProductionKg,
        totalTargetPcs: currentTotals.totalTargetPcs,
        entries: currentData.entries,
      };

      const res = await fetch("/api/production/valvomatic/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save production report");
      }

      setLastSavedAt(format(new Date(), "hh:mm:ss a"));
      isDirtyRef.current = false;

      if (!isSilent) {
        toast.success(
          finalStatus === "SUBMITTED"
            ? "Report submitted successfully!"
            : "Production report saved successfully!"
        );
      }
    } catch (err: any) {
      console.error("Valvomatic save error:", err);
      setAutoSaveError(err.message || "Auto-save failed");
      if (!isSilent) {
        toast.error(err.message || "Failed to save report");
      }
    } finally {
      if (!isSilent) setSaving(false);
      else setIsAutoSaving(false);
    }
  };

  // Debounced auto-save hook
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    if (!isDirtyRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        saveReport(undefined, true);
      }
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [entries, operatorName, supervisorName, remarks, status, companyName, unitName]);

  // Totals
  const totals = useMemo(() => computeValvomaticTotals(entries), [entries]);

  // Filtered roll search suggestions
  const filteredRollSuggestions = useMemo(() => {
    if (!rollSearchQuery.trim()) return availableRolls.slice(0, 10);
    const q = rollSearchQuery.toLowerCase();
    return availableRolls
      .filter(
        (r) =>
          r.rollNumber.toLowerCase().includes(q) ||
          (r.quality && r.quality.toLowerCase().includes(q)) ||
          (r.companyName && r.companyName.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [availableRolls, rollSearchQuery]);

  // Current report data object for print and export
  const currentReportData: ValvomaticDailyReportData = useMemo(() => {
    return {
      date,
      shiftName,
      machineNo,
      companyName,
      unitName,
      operatorName,
      supervisorName,
      status,
      remarks,
      totalRolls: totals.totalRolls,
      totalRollMtr: totals.totalRollMtr,
      totalNetWt: totals.totalNetWt,
      avgWeightGsm: totals.avgWeightGsm,
      totalCoverPatchOs: totals.totalCoverPatchOs,
      totalCoverPatchDs: totals.totalCoverPatchDs,
      totalValvePatch: totals.totalValvePatch,
      totalProductionPcs: totals.totalProductionPcs,
      totalProductionKg: totals.totalProductionKg,
      totalTargetPcs: totals.totalTargetPcs,
      entries,
    };
  }, [
    date,
    shiftName,
    machineNo,
    companyName,
    unitName,
    operatorName,
    supervisorName,
    status,
    remarks,
    totals,
    entries,
  ]);

  return (
    <div
      className={`space-y-5 pb-16 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-100 p-4 overflow-y-auto"
          : "max-w-[100vw] overflow-x-hidden"
      }`}
    >
      {/* Main Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Cutting & Bag Making
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

                  {/* Auto-Save Live Status Indicator */}
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
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                  Valvomatic Machine Daily Production
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Daily production tracking: meters, pieces, kg, cover & valve patch consumption
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Strip */}
          <div className="flex flex-wrap items-center gap-2">

            <button
              onClick={() => saveReport("DRAFT")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
              Save Draft
            </button>

            <button
              onClick={() => saveReport("SUBMITTED")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-50"
            >
              <FileCheck className="h-3.5 w-3.5" />
              Submit Report
            </button>

            <button
              onClick={() => exportValvomaticReportExcel(currentReportData)}
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

        {/* Filters and Header Metadata Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Date</label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Total Rolls</div>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{totals.totalRolls}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Target (Pcs)</div>
          <div className="text-lg font-black text-blue-700 font-mono mt-0.5">{totals.totalTargetPcs.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Total Mtrs</div>
          <div className="text-lg font-black text-sky-700 font-mono mt-0.5">{totals.totalRollMtr.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Net Wt (Kg)</div>
          <div className="text-lg font-black text-slate-900 font-mono mt-0.5">{totals.totalNetWt.toFixed(1)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Avg GSM</div>
          <div className="text-lg font-black text-sky-800 font-mono mt-0.5">{totals.avgWeightGsm.toFixed(1)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Cover OS/DS</div>
          <div className="text-sm font-black text-indigo-700 font-mono mt-1">
            {totals.totalCoverPatchOs} / {totals.totalCoverPatchDs}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Valve Patch</div>
          <div className="text-lg font-black text-purple-700 font-mono mt-0.5">{totals.totalValvePatch}</div>
        </div>
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-emerald-800">Prod (Pcs)</div>
          <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">{totals.totalProductionPcs.toLocaleString()}</div>
        </div>
        <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-3 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-teal-800">Prod (Kg)</div>
          <div className="text-lg font-black text-teal-700 font-mono mt-0.5">{totals.totalProductionKg.toFixed(1)}</div>
        </div>
      </div>

      {/* Main Interactive Spreadsheet Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Production Rolls Entry Table
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {entries.length} rows
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

        {/* Scrollable Spreadsheet Table */}
        <div ref={tableContainerRef} className="overflow-x-auto max-h-[620px] relative">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap min-w-[1400px]">
            <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-bold tracking-wider sticky top-0 z-10 border-b border-slate-300 shadow-2xs">
              <tr>
                <th className="p-2 border-r border-slate-200 text-center w-10">#</th>
                <th className="p-2 border-r border-slate-200 min-w-[140px]">Company Name</th>
                <th className="p-2 border-r border-slate-200 min-w-[90px]">Unit</th>
                <th className="p-2 border-r border-slate-200 min-w-[80px]">Grade</th>
                <th className="p-2 border-r border-slate-200 min-w-[100px] text-right">Target (Pcs)</th>
                <th className="p-2 border-r border-slate-200 min-w-[150px] bg-amber-50/80 text-amber-950 font-black">
                  Quality Name
                </th>
                <th className="p-2 border-r border-slate-200 min-w-[130px] text-center bg-slate-200/80 font-black">
                  Roll No.
                </th>
                <th className="p-2 border-r border-slate-200 min-w-[80px] text-center">Loom #</th>
                <th className="p-2 border-r border-slate-200 min-w-[90px] text-right">Roll Mtr</th>
                <th className="p-2 border-r border-slate-200 min-w-[90px] text-right">Net Wt (Kg)</th>
                <th className="p-2 border-r border-slate-200 min-w-[90px] text-right bg-sky-50 text-sky-900 font-bold">
                  Avg (g/m)
                </th>
                <th className="p-2 border-r border-slate-200 min-w-[100px] text-right">Opening Meter</th>
                <th className="p-2 border-r border-slate-200 min-w-[100px] text-right">Closing Meter</th>
                <th className="p-2 border-r border-slate-200 min-w-[90px] text-right text-indigo-800">Cover OS</th>
                <th className="p-2 border-r border-slate-200 min-w-[90px] text-right text-indigo-800">Cover DS</th>
                <th className="p-2 border-r border-slate-200 min-w-[90px] text-right text-purple-800">Valve</th>
                <th className="p-2 border-r border-slate-200 min-w-[110px] text-right bg-emerald-50 text-emerald-900 font-black">
                  Prod (Pcs)
                </th>
                <th className="p-2 border-r border-slate-200 min-w-[110px] text-right bg-teal-50 text-teal-900 font-black">
                  Prod (Kg)
                </th>
                <th className="p-2 border-r border-slate-200 min-w-[140px]">Remarks</th>
                <th className="p-2 text-center w-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={20} className="p-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading production data...
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-1 border-r border-slate-200 text-center font-bold text-slate-500 bg-slate-50/50">
                      {index + 1}
                    </td>

                    {/* Company Name */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={entry.companyName || ""}
                        onChange={(e) => handleCellChange(index, "companyName", e.target.value)}
                        placeholder="e.g. Ambuja"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent"
                      />
                    </td>

                    {/* Unit Name */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={entry.unitName || ""}
                        onChange={(e) => handleCellChange(index, "unitName", e.target.value)}
                        placeholder="Ropar"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-center"
                      />
                    </td>

                    {/* Grade */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={entry.grade || ""}
                        onChange={(e) => handleCellChange(index, "grade", e.target.value)}
                        placeholder="PPC"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-center"
                      />
                    </td>

                    {/* Target Production Pcs */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        value={entry.targetProductionPcs || ""}
                        onChange={(e) =>
                          handleCellChange(index, "targetProductionPcs", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                      />
                    </td>

                    {/* Quality Name */}
                    <td className="p-1 border-r border-slate-200 bg-amber-50/40 min-w-[200px]">
                      <UniversalQualityInput
                        value={entry.quality || entry.partyName || ""}
                        onChange={(newVal) => {
                          handleCellChange(index, "quality", newVal);
                          handleCellChange(index, "partyName", newVal);
                        }}
                        placeholder="— Quality —"
                        compact={true}
                        inputClassName="h-7 text-xs font-bold text-slate-900 border-amber-300"
                      />
                    </td>

                    {/* Roll Number with Autocomplete */}
                    <td className="p-1 border-r border-slate-200 relative bg-slate-50/50">
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={entry.rollNumber || ""}
                          onChange={(e) => {
                            handleCellChange(index, "rollNumber", e.target.value);
                            setRollSearchQuery(e.target.value);
                            setActiveRollSearchRow(index);
                          }}
                          onFocus={() => {
                            setRollSearchQuery(entry.rollNumber || "");
                            setActiveRollSearchRow(index);
                          }}
                          placeholder="Roll #"
                          className="w-full px-2 py-1 text-xs font-mono font-bold text-center border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent"
                        />
                      </div>

                      {/* Autocomplete Suggestions Dropdown */}
                      {activeRollSearchRow === index && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setActiveRollSearchRow(null)}
                          />
                          <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-300 rounded-lg shadow-xl z-30 max-h-52 overflow-y-auto">
                            <div className="p-1.5 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                              <span>Available Printing Rolls</span>
                              <span className="text-primary font-mono">{filteredRollSuggestions.length} found</span>
                            </div>
                            {filteredRollSuggestions.length > 0 ? (
                              filteredRollSuggestions.map((roll) => (
                                <div
                                  key={roll.id}
                                  onClick={() => handleSelectSuggestedRoll(index, roll)}
                                  className="p-2 text-xs hover:bg-primary/10 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                                >
                                  <div className="flex items-center justify-between font-bold font-mono text-slate-900">
                                    <span>{roll.rollNumber}</span>
                                    <span className="text-[10px] text-slate-500 font-sans font-normal">
                                      {roll.netWeight} kg • {roll.rollMtr} m
                                    </span>
                                  </div>
                                  <div className="text-[10.5px] text-slate-600 truncate mt-0.5">
                                    {roll.quality || roll.companyName || "Standard Quality"}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-400 italic">
                                No matching rolls found
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </td>

                    {/* Loom # */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={entry.loomNumber || ""}
                        onChange={(e) => handleCellChange(index, "loomNumber", e.target.value)}
                        placeholder="Loom"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-center font-mono text-sky-700"
                      />
                    </td>

                    {/* Roll Mtr */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.rollMtr || ""}
                        onChange={(e) =>
                          handleCellChange(index, "rollMtr", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono font-semibold"
                      />
                    </td>

                    {/* Net Wt */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={entry.netWeight || ""}
                        onChange={(e) =>
                          handleCellChange(index, "netWeight", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.0"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                      />
                    </td>

                    {/* Avg (g/m) Auto Computed */}
                    <td className="p-1 border-r border-slate-200 bg-sky-50/50 text-right font-mono text-sky-800 font-bold px-2">
                      {entry.avgWeight > 0 ? entry.avgWeight.toFixed(1) : "—"}
                    </td>

                    {/* Opening Meter Reading */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        value={entry.openingMeterReading || ""}
                        onChange={(e) =>
                          handleCellChange(index, "openingMeterReading", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                      />
                    </td>

                    {/* Closing Meter Reading */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        value={entry.closingMeterReading || ""}
                        onChange={(e) =>
                          handleCellChange(index, "closingMeterReading", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                      />
                    </td>

                    {/* Cover Patch OS */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        value={entry.coverPatchOs || ""}
                        onChange={(e) =>
                          handleCellChange(index, "coverPatchOs", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono text-indigo-700 font-semibold"
                      />
                    </td>

                    {/* Cover Patch DS */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        value={entry.coverPatchDs || ""}
                        onChange={(e) =>
                          handleCellChange(index, "coverPatchDs", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono text-indigo-700 font-semibold"
                      />
                    </td>

                    {/* Valve Patch */}
                    <td className="p-1 border-r border-slate-200">
                      <input
                        type="number"
                        min="0"
                        value={entry.valvePatch || ""}
                        onChange={(e) =>
                          handleCellChange(index, "valvePatch", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono text-purple-700 font-semibold"
                      />
                    </td>

                    {/* Production Pcs (Auto/Editable) */}
                    <td className="p-1 border-r border-slate-200 bg-emerald-50/50">
                      <input
                        type="number"
                        min="0"
                        value={entry.productionPcs || ""}
                        onChange={(e) =>
                          handleCellChange(index, "productionPcs", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs font-mono font-black text-emerald-800 border border-transparent hover:border-emerald-300 focus:border-emerald-500 rounded focus:outline-hidden bg-transparent text-right"
                      />
                    </td>

                    {/* Production Kg */}
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

                    {/* Delete Action */}
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
                <td colSpan={3} className="p-2 border-r border-slate-300 uppercase">
                  Shift Totals
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-blue-800">
                  {totals.totalTargetPcs.toLocaleString()}
                </td>
                <td className="p-2 border-r border-slate-300 text-center text-slate-600 font-medium">
                  {totals.totalRolls} Rolls
                </td>
                <td colSpan={2} className="p-2 border-r border-slate-300"></td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-sky-800">
                  {totals.totalRollMtr.toLocaleString()}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {totals.totalNetWt.toFixed(1)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-sky-800 bg-sky-100">
                  {totals.avgWeightGsm.toFixed(1)}
                </td>
                <td colSpan={2} className="p-2 border-r border-slate-300"></td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-indigo-800">
                  {totals.totalCoverPatchOs}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-indigo-800">
                  {totals.totalCoverPatchDs}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-purple-800">
                  {totals.totalValvePatch}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-emerald-800 bg-emerald-100">
                  {totals.totalProductionPcs.toLocaleString()}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-teal-800 bg-teal-100">
                  {totals.totalProductionKg.toFixed(1)}
                </td>
                <td colSpan={2} className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Remarks Section */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Shift Observations / Downtime / Maintenance Notes
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => {
              isDirtyRef.current = true;
              setRemarks(e.target.value);
            }}
            placeholder="Add any specific observations for this shift (machine speed, temperature, maintenance alerts)..."
            className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary bg-white"
          />
        </div>
      </div>

      {/* Formal A4 Print Modal */}
      <ValvomaticReportPrintModal
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        data={currentReportData}
      />
    </div>
  );
}
