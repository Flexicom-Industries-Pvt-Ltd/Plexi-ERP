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
} from "lucide-react";
import {
  ConvertexReportItem,
  ConvertexDailyReportData,
  calculateConvertexRow,
  computeConvertexTotals,
} from "@/lib/convertex/convertex-types";
import { ConvertexReportPrintModal } from "./ConvertexReportPrintModal";
import { exportConvertexReportExcel } from "@/lib/convertex/convertex-export";

function createEmptyConvertexRow(sequence: number): ConvertexReportItem {
  return {
    sequence,
    companyName: "",
    unitName: "",
    grade: "",
    targetProductionPcs: 0,
    partyName: "",
    rollNumber: "",
    loomNumber: "",
    rollMtr: 0,
    netWeight: 0,
    avgWeight: 0,
    openingMeterReading: 0,
    closingMeterReading: 0,
    productionPcs: 0,
    loomFabricWasteKg: 0,
    lamFabricWasteKg: 0,
    printFabricWasteKg: 0,
    machineWasteKg: 0,
    totalWastageKg: 0,
    totalWastagePct: 0,
    totalWastageMtdKg: 0,
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
              sequence: idx + 1,
            })
          );
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
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Convertex production report");
    } finally {
      setLoading(false);
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  }, [date, shiftName, machineNo]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Handle cell edits with live recalculation
  const handleCellChange = (index: number, field: keyof ConvertexReportItem, value: any) => {
    setEntries((prev) => {
      const next = [...prev];
      const updatedRow = { ...next[index], [field]: value };
      next[index] = calculateConvertexRow(updatedRow);
      return next;
    });
  };

  // Add row
  const handleAddRow = () => {
    setEntries((prev) => [...prev, createEmptyConvertexRow(prev.length + 1)]);
  };

  // Add 5 rows
  const handleAdd5Rows = () => {
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
        partyName: roll.partyName || target.partyName,
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

  // Save handler (supports manual submit or silent auto-save)
  const handleSave = useCallback(
    async (targetStatus?: "DRAFT" | "SUBMITTED" | "APPROVED", silent = false) => {
      if (!date || !shiftName) return;

      const validEntries = entries.filter((e) => e.rollNumber && e.rollNumber.trim() !== "");
      if (validEntries.length === 0 && !silent) {
        toast.error("Please add at least one entry with a valid Roll Number");
        return;
      }

      if (!silent) setSaving(true);
      else setIsAutoSaving(true);

      const newStatus = targetStatus || status;

      try {
        const payload: ConvertexDailyReportData = {
          date,
          shiftName,
          machineNo,
          companyName,
          unitName,
          operatorName: operatorName.trim() || undefined,
          supervisorName: supervisorName.trim() || undefined,
          status: newStatus,
          remarks: remarks.trim() || undefined,
          totalRolls: totals.totalRolls,
          totalRollMtr: totals.totalRollMtr,
          totalNetWt: totals.totalNetWt,
          avgWeightGsm: totals.avgWeightGsm,
          totalProductionPcs: totals.totalProductionPcs,
          totalTargetPcs: totals.totalTargetPcs,
          totalLoomWasteKg: totals.totalLoomWasteKg,
          totalLamWasteKg: totals.totalLamWasteKg,
          totalPrintWasteKg: totals.totalPrintWasteKg,
          totalMachineWasteKg: totals.totalMachineWasteKg,
          totalWastageKg: totals.totalWastageKg,
          totalWastagePct: totals.totalWastagePct,
          totalWastageMtdKg: totals.totalWastageMtdKg,
          entries: validEntries.map((e, idx) => ({ ...e, sequence: idx + 1 })),
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

        const resData = await res.json();
        setStatus(newStatus);
        setLastSavedAt(format(new Date(), "hh:mm:ss a"));

        if (!silent) {
          toast.success(
            newStatus === "SUBMITTED"
              ? "Convertex production report submitted successfully!"
              : "Convertex report saved successfully"
          );
        }

        if (resData.report && Array.isArray(resData.report.entries) && resData.report.entries.length > 0) {
          setEntries(
            resData.report.entries.map((e: any, idx: number) =>
              calculateConvertexRow({ ...e, sequence: idx + 1 })
            )
          );
        }
      } catch (err: any) {
        if (!silent) toast.error(err.message || "Failed to save Convertex report");
      } finally {
        setSaving(false);
        setIsAutoSaving(false);
      }
    },
    [
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
    ]
  );

  // Debounced auto-save effect (1200ms)
  useEffect(() => {
    if (isInitialLoadRef.current || loading) return;
    const hasData = entries.some((e) => e.rollNumber.trim() !== "");
    if (!hasData && !remarks && !operatorName && !supervisorName) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave("DRAFT", true);
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [entries, remarks, operatorName, supervisorName, loading, handleSave]);

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
      totalProductionPcs: totals.totalProductionPcs,
      totalTargetPcs: totals.totalTargetPcs,
      totalLoomWasteKg: totals.totalLoomWasteKg,
      totalLamWasteKg: totals.totalLamWasteKg,
      totalPrintWasteKg: totals.totalPrintWasteKg,
      totalMachineWasteKg: totals.totalMachineWasteKg,
      totalWastageKg: totals.totalWastageKg,
      totalWastagePct: totals.totalWastagePct,
      totalWastageMtdKg: totals.totalWastageMtdKg,
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

              {/* Auto-Save Live Status Pill */}
              {isAutoSaving ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/80 px-2.5 py-0.5 rounded-full border border-amber-200 font-medium">
                  <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                  Auto-saving...
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
              Track conversion from woven rolls to finished bags with real-time meter readings, waste categorisation, and live KPIs.
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
              onClick={() => handleSave("SUBMITTED")}
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
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-slate-400" /> Machine No.
            </label>
            <select
              value={machineNo}
              onChange={(e) => setMachineNo(e.target.value)}
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
            <input
              type="text"
              placeholder="e.g. Rajesh Kumar"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> Supervisor Name
            </label>
            <input
              type="text"
              placeholder="e.g. Anil Sharma"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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

        <div className="bg-white border border-red-200 bg-red-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-red-700 tracking-wider">Total Wastage</div>
          <div className="text-xl font-bold font-mono text-red-800 mt-1">{totals.totalWastageKg.toFixed(2)} kg</div>
          <div className="text-[10px] text-red-600/80 mt-0.5">Loom+Lam+Print+Machine</div>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-amber-700 tracking-wider">Wastage %</div>
          <div className="text-xl font-bold font-mono text-amber-800 mt-1">{totals.totalWastagePct.toFixed(2)}%</div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">MTD: {totals.totalWastageMtdKg.toFixed(2)} kg</div>
        </div>
      </div>

      {/* Spreadsheet Table Container (with the requested Expand Feature!) */}
      <div
        ref={tableContainerRef}
        className={`bg-white border border-slate-200 shadow-sm transition-all duration-200 flex flex-col ${
          isFullscreen
            ? "fixed inset-0 z-50 p-4 bg-white overflow-hidden"
            : "rounded-xl overflow-hidden"
        }`}
      >
        {/* Table Toolbar with Top-Left Fullscreen Expand/Collapse */}
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
              {totals.totalProductionPcs.toLocaleString()} pcs
            </span>
          </div>
        </div>

        {/* Scrollable Spreadsheet Table */}
        <div className="overflow-x-auto flex-1 max-h-[680px]">
          <table className="w-full text-left text-xs border-collapse min-w-[2100px]">
            <thead className="bg-slate-900 text-white font-semibold text-[11px] sticky top-0 z-10 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-2 text-center w-12 border-r border-slate-800">Sl. No.</th>
                <th className="py-2.5 px-2 text-left w-36 border-r border-slate-800">Company Name</th>
                <th className="py-2.5 px-2 text-left w-28 border-r border-slate-800">Unit Name</th>
                <th className="py-2.5 px-2 text-center w-24 border-r border-slate-800">Grade</th>
                <th className="py-2.5 px-2 text-right w-32 border-r border-slate-800">Target (Pcs)</th>
                <th className="py-2.5 px-2 text-left w-36 border-r border-slate-800">Party Name</th>
                <th className="py-2.5 px-2 text-center w-32 border-r border-slate-800">Roll No.</th>
                <th className="py-2.5 px-2 text-center w-24 border-r border-slate-800">Loom No.</th>
                <th className="py-2.5 px-2 text-right w-28 border-r border-slate-800">Roll Mtr</th>
                <th className="py-2.5 px-2 text-right w-24 border-r border-slate-800">Net Wt</th>
                <th className="py-2.5 px-2 text-right w-24 border-r border-slate-800">Avg. (g/m)</th>
                <th className="py-2.5 px-2 text-right w-32 border-r border-slate-800">Opening Reading</th>
                <th className="py-2.5 px-2 text-right w-32 border-r border-slate-800">Closing Reading</th>
                <th className="py-2.5 px-2 text-right w-32 border-r border-slate-800 bg-emerald-950">Prod (In Pcs)</th>
                <th className="py-2.5 px-2 text-right w-28 border-r border-slate-800">Loom Wst (Kg)</th>
                <th className="py-2.5 px-2 text-right w-28 border-r border-slate-800">Lam Wst (Kg)</th>
                <th className="py-2.5 px-2 text-right w-28 border-r border-slate-800">Print Wst (Kg)</th>
                <th className="py-2.5 px-2 text-right w-28 border-r border-slate-800">Mach Wst (Kg)</th>
                <th className="py-2.5 px-2 text-right w-28 border-r border-slate-800 bg-red-950">Total Wst (Kg)</th>
                <th className="py-2.5 px-2 text-right w-24 border-r border-slate-800 bg-amber-950">Total Wst (%)</th>
                <th className="py-2.5 px-2 text-right w-28 border-r border-slate-800">MTD Wst (Kg)</th>
                <th className="py-2.5 px-2 text-left min-w-[140px] border-r border-slate-800">Remarks</th>
                <th className="py-2.5 px-2 text-center w-12">Act</th>
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

                  {/* Party Name */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={entry.partyName || ""}
                      onChange={(e) => handleCellChange(index, "partyName", e.target.value)}
                      placeholder="Party / Customer"
                      className="w-full px-2 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
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

                  {/* Avg. (g/m) (Computed Automatically) */}
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

                  {/* Production (In Pcs) */}
                  <td className="py-1 px-1 border-r border-slate-200 bg-emerald-50/20">
                    <input
                      type="number"
                      value={entry.productionPcs || ""}
                      onChange={(e) => handleCellChange(index, "productionPcs", e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 text-xs text-right font-mono font-bold text-emerald-700 bg-transparent border border-transparent hover:border-emerald-300 focus:border-emerald-500 rounded transition-colors"
                    />
                  </td>

                  {/* Loom Fabric Wastage (In Kg) */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.loomFabricWasteKg || ""}
                      onChange={(e) => handleCellChange(index, "loomFabricWasteKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Lam Fabric Wastage (In Kg) */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.lamFabricWasteKg || ""}
                      onChange={(e) => handleCellChange(index, "lamFabricWasteKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Print Fabric Wastage (In Kg) */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.printFabricWasteKg || ""}
                      onChange={(e) => handleCellChange(index, "printFabricWasteKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Machine Wastage (In Kg) */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.machineWasteKg || ""}
                      onChange={(e) => handleCellChange(index, "machineWasteKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Total Wastage (In Kg) (Auto-Computed) */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold text-red-700 bg-red-50/20">
                    {entry.totalWastageKg ? entry.totalWastageKg.toFixed(2) : "0.00"}
                  </td>

                  {/* Total Wastage (%) (Auto-Computed) */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold text-amber-700 bg-amber-50/20">
                    {entry.totalWastagePct ? `${entry.totalWastagePct.toFixed(2)}%` : "0.00%"}
                  </td>

                  {/* Total Wastage MTD (In Kg) */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.totalWastageMtdKg || ""}
                      onChange={(e) => handleCellChange(index, "totalWastageMtdKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-purple-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
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
                <td className="py-2.5 px-2 text-right font-mono text-emerald-800 bg-emerald-100/60 font-black text-sm">
                  {totals.totalProductionPcs > 0 ? totals.totalProductionPcs.toLocaleString() : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                  {totals.totalLoomWasteKg > 0 ? totals.totalLoomWasteKg.toFixed(2) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                  {totals.totalLamWasteKg > 0 ? totals.totalLamWasteKg.toFixed(2) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                  {totals.totalPrintWasteKg > 0 ? totals.totalPrintWasteKg.toFixed(2) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                  {totals.totalMachineWasteKg > 0 ? totals.totalMachineWasteKg.toFixed(2) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-red-800 bg-red-100/50 font-black text-sm">
                  {totals.totalWastageKg > 0 ? totals.totalWastageKg.toFixed(2) : "0.00"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-amber-800 bg-amber-100/50 font-black text-sm">
                  {totals.totalWastagePct > 0 ? `${totals.totalWastagePct.toFixed(2)}%` : "0.00%"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-purple-800 bg-purple-100/50 font-bold">
                  {totals.totalWastageMtdKg > 0 ? totals.totalWastageMtdKg.toFixed(2) : "—"}
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
          onChange={(e) => setRemarks(e.target.value)}
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
