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
  Scissors,
  Search,
  Calendar,
  Clock,
  User,
  Scale,
  Sparkles,
  FileCheck,
  AlertCircle,
  Layers,
  Tag,
} from "lucide-react";
import {
  ConvertexReportItem,
  ConvertexDailyReportData,
  calculateConvertexRow,
  computeConvertexTotals,
} from "@/lib/convertex/convertex-types";
import dynamic from "next/dynamic";
import { exportConvertexReportExcel } from "@/lib/convertex/convertex-export";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";
import { UniversalPersonnelInput } from "@/components/ui/UniversalPersonnelInput";

const ConvertexReportPrintModal = dynamic(
  () => import("./ConvertexReportPrintModal").then((m) => m.ConvertexReportPrintModal),
  { ssr: false }
);

function createEmptyConvertexRow(sequence: number): ConvertexReportItem {
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

export function ConvertexDailyReportClient() {
  const [date, setDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [machineNo, setMachineNo] = useState<string>("Convertex-1");

  const [companyName, setCompanyName] = useState<string>("FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA");
  const [unitName, setUnitName] = useState<string>("Unit-1");
  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  // Start with 5 clean rows
  const [entries, setEntries] = useState<ConvertexReportItem[]>(() => [
    createEmptyConvertexRow(1),
    createEmptyConvertexRow(2),
    createEmptyConvertexRow(3),
    createEmptyConvertexRow(4),
    createEmptyConvertexRow(5),
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
        `/api/production/convertex/available-rolls?search=${encodeURIComponent(query)}`
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
        `/api/production/convertex/reports?date=${date}&shiftName=${encodeURIComponent(
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
            calculateConvertexRow({
              ...e,
              quality: e.quality || e.partyName || "",
              partyName: e.quality || e.partyName || "",
              sequence: idx + 1,
            })
          );
          while (parsed.length < 5) {
            parsed.push(createEmptyConvertexRow(parsed.length + 1));
          }
          setEntries(parsed);
        } else {
          setEntries([
            createEmptyConvertexRow(1),
            createEmptyConvertexRow(2),
            createEmptyConvertexRow(3),
            createEmptyConvertexRow(4),
            createEmptyConvertexRow(5),
          ]);
        }
        setLastSavedAt(format(new Date(rep.updatedAt || Date.now()), "hh:mm a"));
      } else {
        // No report exists for this shift
        setStatus("DRAFT");
        setRemarks("");
        setEntries([
          createEmptyConvertexRow(1),
          createEmptyConvertexRow(2),
          createEmptyConvertexRow(3),
          createEmptyConvertexRow(4),
          createEmptyConvertexRow(5),
        ]);
        setLastSavedAt(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Convertex production report");
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
  const handleCellChange = (index: number, field: keyof ConvertexReportItem, value: any) => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const next = [...prev];
      const updatedRow = { ...next[index], [field]: value };
      next[index] = calculateConvertexRow(updatedRow);
      return next;
    });
  };

  // Add row
  const handleAddRow = () => {
    isDirtyRef.current = true;
    setEntries((prev) => [...prev, createEmptyConvertexRow(prev.length + 1)]);
  };

  // Add 5 rows
  const handleAdd5Rows = () => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const start = prev.length + 1;
      return [
        ...prev,
        createEmptyConvertexRow(start),
        createEmptyConvertexRow(start + 1),
        createEmptyConvertexRow(start + 2),
        createEmptyConvertexRow(start + 3),
        createEmptyConvertexRow(start + 4),
      ];
    });
  };

  // Reset to blank
  const handleResetToBlank = () => {
    if (confirm("Reset sheet to 5 blank rows? Unsaved changes will be discarded.")) {
      isDirtyRef.current = true;
      setEntries([
        createEmptyConvertexRow(1),
        createEmptyConvertexRow(2),
        createEmptyConvertexRow(3),
        createEmptyConvertexRow(4),
        createEmptyConvertexRow(5),
      ]);
      setRemarks("");
    }
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      if (prev.length <= 1) {
        return [createEmptyConvertexRow(1)];
      }
      return prev
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, sequence: i + 1 }));
    });
  };

  // Select an available roll to populate row
  const handleSelectRoll = (rowIndex: number, roll: any) => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const next = [...prev];
      const target = next[rowIndex];
      next[rowIndex] = calculateConvertexRow({
        ...target,
        rollNumber: roll.rollNumber || target.rollNumber,
        companyName: roll.companyName || target.companyName,
        unitName: roll.unitName || target.unitName,
        grade: roll.grade || target.grade,
        targetProductionPcs: roll.targetProductionPcs || target.targetProductionPcs,
        quality: roll.quality || roll.partyName || target.quality,
        partyName: roll.quality || roll.partyName || target.partyName,
        loomNumber: roll.loomNumber || target.loomNumber,
        rollMtr: roll.rollMtr || target.rollMtr,
        netWeight: roll.netWeight || target.netWeight,
        avgWeight: roll.avgWeight || target.avgWeight,
      });
      return next;
    });
    setActiveRollSearchRow(null);
  };

  // Compute live totals
  const totals = useMemo(() => computeConvertexTotals(entries), [entries]);

  // Helper to determine if a row has any user entered data
  const hasRowData = (e: ConvertexReportItem) => {
    return Boolean(
      (e.companyName && e.companyName.trim()) ||
      (e.unitName && e.unitName.trim()) ||
      (e.rollNumber && e.rollNumber.trim()) ||
      (e.quality && e.quality.trim()) ||
      (e.partyName && e.partyName.trim()) ||
      (e.grade && e.grade.trim()) ||
      (e.loomNumber && e.loomNumber.trim()) ||
      Number(e.productionPcs) > 0 ||
      Number(e.productionKg) > 0 ||
      Number(e.coverPatchOs) > 0 ||
      Number(e.coverPatchDs) > 0 ||
      Number(e.valvePatch) > 0 ||
      Number(e.rollMtr) > 0 ||
      Number(e.netWeight) > 0 ||
      Number(e.openingMeterReading) > 0 ||
      Number(e.closingMeterReading) > 0 ||
      (e.remarks && e.remarks.trim())
    );
  };

  // Save handler (manual submit or silent auto-save)
  const executeSave = useCallback(
    async (targetStatus?: "DRAFT" | "SUBMITTED" | "APPROVED", silent = false) => {
      const current = latestDataRef.current;
      if (!current.date || !current.shiftName) return;

      const filledEntries = current.entries.filter(hasRowData);

      const hasAnyData =
        filledEntries.length > 0 ||
        Boolean(current.operatorName.trim()) ||
        Boolean(current.supervisorName.trim()) ||
        Boolean(current.remarks.trim());

      if (!hasAnyData && (!targetStatus || targetStatus === "DRAFT")) return;

      // When submitting for final approval, require at least 1 entry with a valid Roll Number
      if (targetStatus === "SUBMITTED") {
        if (filledEntries.length === 0) {
          toast.error("Please add at least one entry before submitting for approval");
          return;
        }
        const hasMissingRolls = filledEntries.some((e) => !e.rollNumber?.trim());
        if (hasMissingRolls) {
          toast.error("All production entries must have a valid Roll Number before submission");
          return;
        }
      }

      if (!silent) setSaving(true);
      else setIsAutoSaving(true);
      setAutoSaveError(null);

      const newStatus = targetStatus || current.status;
      const currentTotals = computeConvertexTotals(current.entries);

      try {
        const payload: ConvertexDailyReportData = {
          date: current.date,
          shiftName: current.shiftName,
          machineNo: current.machineNo,
          companyName: current.companyName,
          unitName: current.unitName,
          operatorName: current.operatorName.trim() || undefined,
          supervisorName: current.supervisorName.trim() || undefined,
          status: newStatus,
          remarks: current.remarks.trim() || undefined,
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
          entries: filledEntries.map((e, idx) => ({ ...e, sequence: idx + 1 })),
        };

        const res = await fetch("/api/production/convertex/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save Convertex report");
        }

        setStatus(newStatus);
        setLastSavedAt(format(new Date(), "hh:mm:ss a"));
        isDirtyRef.current = false;

        if (!silent) {
          toast.success(
            newStatus === "SUBMITTED"
              ? "Convertex production report submitted successfully!"
              : "Convertex report saved successfully"
          );
        }
      } catch (err: any) {
        console.error("Convertex save error:", err);
        setAutoSaveError(err.message || "Auto-save failed");
        if (!silent) toast.error(err.message || "Failed to save Convertex report");
      } finally {
        setSaving(false);
        setIsAutoSaving(false);
      }
    },
    []
  );

  // Debounced auto-save effect: triggers 1000ms after last keystroke when dirty
  useEffect(() => {
    if (isInitialLoadRef.current || loading) return;
    if (!isDirtyRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        executeSave("DRAFT", true);
      }
    }, 1000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [entries, remarks, operatorName, supervisorName, loading, executeSave]);

  // Flush unsaved changes on tab blur or beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        executeSave("DRAFT", true);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [executeSave]);

  const reportDataForPrint: ConvertexDailyReportData = useMemo(() => {
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
  }, [date, shiftName, machineNo, companyName, unitName, operatorName, supervisorName, status, remarks, totals, entries]);

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* Header Control Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Convertex Daily Production Report
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Accurate tracking of roll conversion into sacks with real-time meter readings, cover patch counts, and production in pcs & kg.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fetchReportData()}
              disabled={loading}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              title="Refresh sheet"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => exportConvertexReportExcel(reportDataForPrint)}
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
              Print Report
            </button>

            <button
              type="button"
              onClick={() => executeSave("SUBMITTED")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
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
              onChange={(e) => {
                isDirtyRef.current = false;
                setDate(e.target.value);
              }}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Shift
            </label>
            <select
              value={shiftName}
              onChange={(e) => {
                isDirtyRef.current = false;
                setShiftName(e.target.value);
              }}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium"
            >
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-slate-400" /> Machine No.
            </label>
            <select
              value={machineNo}
              onChange={(e) => {
                isDirtyRef.current = false;
                setMachineNo(e.target.value);
              }}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium"
            >
              <option value="Convertex-1">Convertex-1</option>
              <option value="Convertex-2">Convertex-2</option>
              <option value="Convertex-3">Convertex-3</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> Operator Name
            </label>
            <UniversalPersonnelInput
              type="operator"
              section="CONVERTEX"
              value={operatorName}
              onChange={(name) => {
                isDirtyRef.current = true;
                setOperatorName(name);
              }}
              placeholder="e.g. Rajesh Kumar"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> Supervisor Name
            </label>
            <UniversalPersonnelInput
              type="supervisor"
              value={supervisorName}
              onChange={(name) => {
                isDirtyRef.current = true;
                setSupervisorName(name);
              }}
              placeholder="e.g. Anil Sharma"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Total Rolls</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{totals.totalRolls}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Processed Rolls</div>
        </div>

        <div className="bg-white border border-sky-200 bg-sky-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-sky-700 tracking-wider">Roll Metres</div>
          <div className="text-xl font-bold font-mono text-sky-800 mt-1">{totals.totalRollMtr.toLocaleString()} m</div>
          <div className="text-[10px] text-sky-600/80 mt-0.5">Input Fabric Length</div>
        </div>

        <div className="bg-white border border-purple-200 bg-purple-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-purple-700 tracking-wider">Net Weight</div>
          <div className="text-xl font-bold font-mono text-purple-800 mt-1">{totals.totalNetWt.toFixed(1)} kg</div>
          <div className="text-[10px] text-purple-600/80 mt-0.5">Input Net Weight</div>
        </div>

        <div className="bg-white border border-blue-200 bg-blue-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-blue-700 tracking-wider">Avg Weight</div>
          <div className="text-xl font-bold font-mono text-blue-800 mt-1">{totals.avgWeightGsm.toFixed(1)} g/m</div>
          <div className="text-[10px] text-blue-600/80 mt-0.5">Linear Density</div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-emerald-700 tracking-wider">Production (Pcs)</div>
          <div className="text-xl font-bold font-mono text-emerald-800 mt-1">{totals.totalProductionPcs.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600/80 mt-0.5">Finished Sacks</div>
        </div>

        <div className="bg-white border border-teal-200 bg-teal-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-teal-700 tracking-wider">Production (Kg)</div>
          <div className="text-xl font-bold font-mono text-teal-800 mt-1">{totals.totalProductionKg.toFixed(1)} kg</div>
          <div className="text-[10px] text-teal-600/80 mt-0.5">Total Finished Wt</div>
        </div>

        <div className="bg-white border border-indigo-200 bg-indigo-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-indigo-700 tracking-wider">Cover / Valve</div>
          <div className="text-sm font-bold font-mono text-indigo-900 mt-1">
            OS: {totals.totalCoverPatchOs} | DS: {totals.totalCoverPatchDs}
          </div>
          <div className="text-[10px] text-indigo-600/80 mt-0.5">Valve: {totals.totalValvePatch}</div>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div
        ref={tableContainerRef}
        className={`bg-white border border-slate-200 shadow-sm transition-all duration-200 flex flex-col ${
          isFullscreen
            ? "fixed inset-0 z-50 p-4 bg-white overflow-hidden"
            : "rounded-xl overflow-hidden"
        }`}
      >
        {/* Table Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-xs transition-colors"
              title={isFullscreen ? "Collapse to standard view (Esc)" : "Expand sheet to fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 text-primary" />
                  <span>Collapse Sheet</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 text-primary" />
                  <span>Expand Sheet</span>
                </>
              )}
            </button>

            <button
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </button>

            <button
              onClick={handleAdd5Rows}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-slate-500" />
              +5 Rows
            </button>

            <button
              onClick={handleResetToBlank}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold shadow-xs transition-colors"
              title="Reset sheet to 5 empty blank rows"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              Reset Blank
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {entries.length} {entries.length === 1 ? "row" : "rows"}
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">
              {totals.totalProductionPcs.toLocaleString()} pcs ({totals.totalProductionKg.toFixed(1)} kg)
            </span>
          </div>
        </div>

        {/* Scrollable Spreadsheet Table */}
        <div className="overflow-x-auto flex-1 max-h-[680px]">
          <table className="w-full text-left text-xs border-collapse min-w-[2000px]">
            <thead className="bg-slate-900 text-white font-semibold text-[11px] sticky top-0 z-10 uppercase tracking-wider">
              {/* Row 1 Header with Grouping */}
              <tr>
                <th rowSpan={2} className="py-2 px-2 text-center w-12 border-r border-slate-800">Sl. No.</th>
                <th rowSpan={2} className="py-2 px-2 text-left w-36 border-r border-slate-800">Company Name</th>
                <th rowSpan={2} className="py-2 px-2 text-left w-24 border-r border-slate-800">Unit Name</th>
                <th rowSpan={2} className="py-2 px-2 text-center w-20 border-r border-slate-800">Grade</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-28 border-r border-slate-800">Target (Pcs)</th>
                <th rowSpan={2} className="py-2 px-2 text-left w-36 border-r border-slate-800 bg-slate-800 text-amber-300">Quality</th>
                <th rowSpan={2} className="py-2 px-2 text-center w-32 border-r border-slate-800">Roll No.</th>
                <th rowSpan={2} className="py-2 px-2 text-center w-20 border-r border-slate-800">Loom No.</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-24 border-r border-slate-800">Roll Mtr</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-24 border-r border-slate-800">Net Wt (Kg)</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-24 border-r border-slate-800">Avg. (g/m)</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-28 border-r border-slate-800">Opening Reading</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-28 border-r border-slate-800">Closing Reading</th>
                {/* Grouped Header: Cover Patch */}
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-800 bg-indigo-900/80">Cover Patch</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-24 border-r border-slate-800 bg-indigo-950">Valve Patch</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-32 border-r border-slate-800 bg-emerald-950 text-emerald-300">Prod (In Pcs)</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-32 border-r border-slate-800 bg-teal-950 text-teal-300">Prod (In Kg)</th>
                <th rowSpan={2} className="py-2 px-2 text-left min-w-[140px] border-r border-slate-800">Remarks</th>
                <th rowSpan={2} className="py-2 px-2 text-center w-12">Act</th>
              </tr>
              {/* Row 2 Sub-Headers for Cover Patch */}
              <tr>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-800 bg-indigo-900/90 text-[10px]">OS</th>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-800 bg-indigo-900/90 text-[10px]">DS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {entries.map((entry, index) => (
                <tr
                  key={index}
                  className={`hover:bg-sky-50/40 transition-colors ${
                    index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                  }`}
                >
                  {/* Sequence */}
                  <td className="py-1.5 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                    {entry.sequence}
                  </td>

                  {/* Company Name */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={entry.companyName || ""}
                      onChange={(e) => handleCellChange(index, "companyName", e.target.value)}
                      placeholder="e.g. UltraTech"
                      className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Unit Name */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={entry.unitName || ""}
                      onChange={(e) => handleCellChange(index, "unitName", e.target.value)}
                      placeholder="e.g. Unit-1"
                      className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Grade */}
                  <td className="py-1 px-1 border-r border-slate-200 text-center">
                    <input
                      type="text"
                      value={entry.grade || ""}
                      onChange={(e) => handleCellChange(index, "grade", e.target.value)}
                      placeholder="PPC"
                      className="w-full px-2 py-1 text-xs text-center border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Target Production (in pcs) */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      value={entry.targetProductionPcs || ""}
                      onChange={(e) => handleCellChange(index, "targetProductionPcs", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-blue-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Quality (Replaced Party Name!) */}
                  <td className="py-1 px-1 border-r border-slate-200 bg-amber-50/20 min-w-[200px]">
                    <UniversalQualityInput
                      value={entry.quality || entry.partyName || ""}
                      onChange={(newVal) => {
                        handleCellChange(index, "quality", newVal);
                        handleCellChange(index, "partyName", newVal);
                      }}
                      placeholder="— Quality —"
                      compact={true}
                      inputClassName="h-7 text-xs font-semibold text-slate-800"
                    />
                  </td>

                  {/* Roll No. (with quick autocomplete popup) */}
                  <td className="py-1 px-1 border-r border-slate-200 relative">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={entry.rollNumber}
                        onChange={(e) => {
                          handleCellChange(index, "rollNumber", e.target.value);
                          setRollSearchQuery(e.target.value);
                        }}
                        onFocus={() => {
                          setActiveRollSearchRow(index);
                          setRollSearchQuery(entry.rollNumber || "");
                        }}
                        placeholder="e.g. D14332"
                        className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-900 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRollSearchRow(activeRollSearchRow === index ? null : index);
                          setRollSearchQuery(entry.rollNumber || "");
                        }}
                        className="p-1 text-slate-400 hover:text-primary transition-colors"
                        title="Pick from available printed rolls"
                      >
                        <Search className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Autocomplete Dropdown Popup */}
                    {activeRollSearchRow === index && availableRolls.length > 0 && (
                      <div className="absolute left-0 top-full z-30 mt-1 w-80 bg-white border border-slate-300 rounded-lg shadow-xl p-2 max-h-60 overflow-y-auto">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                          <span>Available Rolls ({availableRolls.length})</span>
                          <button
                            type="button"
                            onClick={() => setActiveRollSearchRow(null)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="space-y-1">
                          {availableRolls
                            .filter(
                              (r) =>
                                !rollSearchQuery ||
                                r.rollNumber.toLowerCase().includes(rollSearchQuery.toLowerCase()) ||
                                (r.companyName && r.companyName.toLowerCase().includes(rollSearchQuery.toLowerCase()))
                            )
                            .slice(0, 15)
                            .map((roll) => (
                              <button
                                key={roll.id}
                                type="button"
                                onClick={() => handleSelectRoll(index, roll)}
                                className="w-full text-left p-1.5 rounded hover:bg-sky-50 transition-colors flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-mono font-bold text-slate-900">
                                    {roll.rollNumber}
                                  </span>
                                  {roll.companyName && (
                                    <span className="text-slate-500 text-[10px] ml-1.5">
                                      ({roll.companyName})
                                    </span>
                                  )}
                                </div>
                                <div className="text-right text-[10px] font-mono text-slate-600">
                                  <span>{roll.rollMtr}m</span> / <span>{roll.netWeight}kg</span>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Loom No. */}
                  <td className="py-1 px-1 border-r border-slate-200 text-center">
                    <input
                      type="text"
                      value={entry.loomNumber || ""}
                      onChange={(e) => handleCellChange(index, "loomNumber", e.target.value)}
                      placeholder="e.g. 42"
                      className="w-full px-2 py-1 text-xs text-center font-mono text-sky-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Roll Mtr */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.rollMtr || ""}
                      onChange={(e) => handleCellChange(index, "rollMtr", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono font-medium text-slate-900 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Net Wt */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.netWeight || ""}
                      onChange={(e) => handleCellChange(index, "netWeight", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-800 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Avg. (g/m) */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold text-sky-800 bg-sky-50/30">
                    {entry.avgWeight ? entry.avgWeight.toFixed(1) : "—"}
                  </td>

                  {/* Opening Meter Reading */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.openingMeterReading || ""}
                      onChange={(e) => handleCellChange(index, "openingMeterReading", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-600 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Closing Meter Reading */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.closingMeterReading || ""}
                      onChange={(e) => handleCellChange(index, "closingMeterReading", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-600 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Cover Patch OS */}
                  <td className="py-1 px-1 border-r border-slate-200 bg-indigo-50/15">
                    <input
                      type="number"
                      step="any"
                      value={entry.coverPatchOs || ""}
                      onChange={(e) => handleCellChange(index, "coverPatchOs", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-indigo-700 border border-transparent hover:border-indigo-300 focus:border-indigo-500 rounded transition-colors"
                    />
                  </td>

                  {/* Cover Patch DS */}
                  <td className="py-1 px-1 border-r border-slate-200 bg-indigo-50/15">
                    <input
                      type="number"
                      step="any"
                      value={entry.coverPatchDs || ""}
                      onChange={(e) => handleCellChange(index, "coverPatchDs", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-indigo-700 border border-transparent hover:border-indigo-300 focus:border-indigo-500 rounded transition-colors"
                    />
                  </td>

                  {/* Valve Patch */}
                  <td className="py-1 px-1 border-r border-slate-200 bg-indigo-50/20">
                    <input
                      type="number"
                      step="any"
                      value={entry.valvePatch || ""}
                      onChange={(e) => handleCellChange(index, "valvePatch", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-indigo-800 border border-transparent hover:border-indigo-300 focus:border-indigo-500 rounded transition-colors"
                    />
                  </td>

                  {/* Production (In Pcs) */}
                  <td className="py-1 px-1 border-r border-slate-200 bg-emerald-50/25">
                    <input
                      type="number"
                      value={entry.productionPcs || ""}
                      onChange={(e) => handleCellChange(index, "productionPcs", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono font-bold text-emerald-700 bg-transparent border border-transparent hover:border-emerald-300 focus:border-emerald-500 rounded transition-colors"
                    />
                  </td>

                  {/* Production (In Kg) */}
                  <td className="py-1 px-1 border-r border-slate-200 bg-teal-50/25">
                    <input
                      type="number"
                      step="any"
                      value={entry.productionKg || ""}
                      onChange={(e) => handleCellChange(index, "productionKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono font-bold text-teal-800 bg-transparent border border-transparent hover:border-teal-300 focus:border-teal-500 rounded transition-colors"
                    />
                  </td>

                  {/* Remarks */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={entry.remarks || ""}
                      onChange={(e) => handleCellChange(index, "remarks", e.target.value)}
                      placeholder="Notes..."
                      className="w-full px-2 py-1 text-xs text-slate-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Delete Action */}
                  <td className="py-1 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totals Summary Footer Row */}
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900 sticky bottom-0 z-10 text-xs">
              <tr>
                <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                  SHIFT TOTALS:
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-blue-700">
                  {totals.totalTargetPcs > 0 ? totals.totalTargetPcs.toLocaleString() : "—"}
                </td>
                <td colSpan={3} className="py-2.5 px-2 text-center text-slate-600">
                  {totals.totalRolls} ROLLS
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-900">
                  {totals.totalRollMtr > 0 ? totals.totalRollMtr.toLocaleString() : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-900">
                  {totals.totalNetWt > 0 ? totals.totalNetWt.toFixed(1) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-sky-800 bg-sky-100/50">
                  {totals.avgWeightGsm > 0 ? totals.avgWeightGsm.toFixed(1) : "—"}
                </td>
                <td colSpan={2} className="py-2.5 px-2 text-center text-slate-400">
                  —
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-indigo-800 bg-indigo-100/50 font-bold">
                  {totals.totalCoverPatchOs > 0 ? totals.totalCoverPatchOs.toLocaleString() : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-indigo-800 bg-indigo-100/50 font-bold">
                  {totals.totalCoverPatchDs > 0 ? totals.totalCoverPatchDs.toLocaleString() : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-indigo-900 bg-indigo-100/60 font-bold">
                  {totals.totalValvePatch > 0 ? totals.totalValvePatch.toLocaleString() : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-emerald-800 bg-emerald-100/60 font-black text-sm">
                  {totals.totalProductionPcs > 0 ? totals.totalProductionPcs.toLocaleString() : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-teal-800 bg-teal-100/60 font-black text-sm">
                  {totals.totalProductionKg > 0 ? totals.totalProductionKg.toFixed(1) : "—"}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Remarks Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
          Shift Remarks & Observations
        </label>
        <textarea
          rows={2}
          value={remarks}
          onChange={(e) => {
            isDirtyRef.current = true;
            setRemarks(e.target.value);
          }}
          placeholder="Record downtime reasons, machine maintenance, quality checks, roll defects..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      {/* Print & Preview Modal */}
      {isPrintModalOpen && (
        <ConvertexReportPrintModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          data={reportDataForPrint}
        />
      )}
    </div>
  );
}
