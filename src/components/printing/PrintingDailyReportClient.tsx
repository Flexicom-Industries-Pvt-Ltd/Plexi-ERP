"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import {
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Calendar as CalendarIcon,
  Clock,
  User,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Building,
  Check,
  Loader2,
  HelpCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  AvailablePrintingRoll,
  calculatePrintingRow,
  computePrintingTotals,
  PartyPrintingDetailItem,
  PrintingDailyReportData,
  PrintingReportItem,
} from "@/lib/printing/printing-types";
import { exportPrintingReportExcel } from "@/lib/printing/printing-export";
import { PrintingReportPrintModal } from "./PrintingReportPrintModal";

const SHIFTS = ["Day Shift", "Night Shift", "Shift 1", "Shift 2"];

function createEmptyRow(seq: number): PrintingReportItem {
  return {
    sequence: seq,
    companyName: "",
    unitName: "",
    grade: "",
    targetProductionMtrs: "",
    drumSize: "",
    quality: "",
    rollNumber: "",
    loomNumber: "",
    productionMeter: "",
    netWeight: "",
    avgWeight: "",
    printMeter: "",
    remarks: "",
  };
}

export function PrintingDailyReportClient() {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  // Machine No is removed from UI as requested, defaults to "Machine-1" under the hood
  const machineNo = "Machine-1";

  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  // Start with clean blank rows as requested (no dummy prefill data)
  const [entries, setEntries] = useState<PrintingReportItem[]>(() => [
    createEmptyRow(1),
    createEmptyRow(2),
    createEmptyRow(3),
    createEmptyRow(4),
    createEmptyRow(5),
  ]);

  const [loading, setLoading] = useState<boolean>(true);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Available roll autocomplete suggestions (from circular loom roll cutting)
  const [availableRolls, setAvailableRolls] = useState<AvailablePrintingRoll[]>([]);
  const [activeRollSearchRow, setActiveRollSearchRow] = useState<number | null>(null);

  // Party Printing master suggestions (from Data Centre)
  const [partySuggestions, setPartySuggestions] = useState<PartyPrintingDetailItem[]>([]);
  const [activeCompanySearchRow, setActiveCompanySearchRow] = useState<number | null>(null);

  // Table container ref for fullscreen focus
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

  // Fetch Party Printing master suggestions for typing search
  const fetchPartySuggestions = useCallback(async (query: string = "") => {
    try {
      const res = await fetch(`/api/data-centre/party-printing-details?search=${encodeURIComponent(query)}&limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      setPartySuggestions(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPartySuggestions();
  }, [fetchPartySuggestions]);

  // Fetch report data for selected Date and Shift
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/production/printing/reports?date=${date}&shiftName=${encodeURIComponent(
          shiftName
        )}&machineNo=${encodeURIComponent(machineNo)}&_t=${Date.now()}`
      );
      const json = await res.json();

      if (json.success && json.report) {
        const rep = json.report;
        setStatus(rep.status || "DRAFT");
        setOperatorName(rep.operatorName || "");
        setSupervisorName(rep.supervisorName || "");
        setRemarks(rep.remarks || "");

        if (rep.entries && rep.entries.length > 0) {
          setEntries(
            rep.entries.map((e: any, idx: number) => ({
              id: e.id,
              sequence: e.sequence || idx + 1,
              companyName: e.companyName || "",
              unitName: e.unitName || "",
              grade: e.grade || "",
              targetProductionMtrs: e.targetProductionMtrs ?? "",
              drumSize: e.drumSize || "",
              quality: e.quality || "",
              rollNumber: e.rollNumber || "",
              loomNumber: e.loomNumber || "",
              productionMeter: e.productionMeter ?? "",
              netWeight: e.netWeight ?? "",
              avgWeight: e.avgWeight ?? "",
              printMeter: e.printMeter ?? "",
              remarks: e.remarks || "",
            }))
          );
        } else {
          // Initialize clean blank rows
          setEntries([
            createEmptyRow(1),
            createEmptyRow(2),
            createEmptyRow(3),
            createEmptyRow(4),
            createEmptyRow(5),
          ]);
        }
        setLastSavedAt(format(new Date(rep.updatedAt || Date.now()), "hh:mm a"));
      } else {
        // No report yet: clean blank rows
        setStatus("DRAFT");
        setOperatorName("");
        setSupervisorName("");
        setRemarks("");
        setEntries([
          createEmptyRow(1),
          createEmptyRow(2),
          createEmptyRow(3),
          createEmptyRow(4),
          createEmptyRow(5),
        ]);
        setLastSavedAt(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load printing report");
    } finally {
      setLoading(false);
      // Allow auto-save only after initial data is loaded
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  }, [date, shiftName, machineNo]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    fetchReportData();
  }, [fetchReportData]);

  // Load available rolls from Loom roll cutting entries for autocomplete
  const fetchAvailableRolls = useCallback(async (query: string = "") => {
    try {
      const res = await fetch(`/api/production/printing/available-rolls?search=${encodeURIComponent(query)}&limit=25`);
      const json = await res.json();
      if (json.success && Array.isArray(json.rolls)) {
        setAvailableRolls(json.rolls);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAvailableRolls();
  }, [fetchAvailableRolls]);

  // Auto-Save Report to Backend
  const saveReport = useCallback(
    async (targetStatus: "DRAFT" | "SUBMITTED" = "DRAFT", silent = true) => {
      // Check if there is anything to save
      const hasAnyData = entries.some(
        (e) =>
          e.companyName?.trim() ||
          e.rollNumber?.trim() ||
          e.quality?.trim() ||
          Number(e.productionMeter) > 0 ||
          Number(e.netWeight) > 0 ||
          Number(e.printMeter) > 0
      );

      if (!hasAnyData && targetStatus === "DRAFT") return;

      setIsAutoSaving(true);
      try {
        const payload = {
          date,
          shiftName,
          machineNo,
          operatorName,
          supervisorName,
          status: targetStatus,
          remarks,
          entries: entries.map((e, idx) => ({
            ...e,
            sequence: idx + 1,
            productionMeter: Number(e.productionMeter) || 0,
            netWeight: Number(e.netWeight) || 0,
            avgWeight: Number(e.avgWeight) || 0,
            printMeter: Number(e.printMeter) || 0,
            targetProductionMtrs: e.targetProductionMtrs ? Number(e.targetProductionMtrs) : null,
          })),
        };

        const res = await fetch("/api/production/printing/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to save printing report");

        setStatus(targetStatus);
        setLastSavedAt(format(new Date(), "hh:mm:ss a"));

        if (!silent) {
          toast.success(
            targetStatus === "SUBMITTED"
              ? "Printing report submitted for approval"
              : "Printing report saved successfully"
          );
        }
      } catch (err: any) {
        if (!silent) toast.error(err.message || "Failed to save report");
      } finally {
        setIsAutoSaving(false);
      }
    },
    [date, shiftName, machineNo, operatorName, supervisorName, remarks, entries]
  );

  // Debounced Auto-Save Trigger
  useEffect(() => {
    if (isInitialLoadRef.current || loading) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      saveReport("DRAFT", true);
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [entries, operatorName, supervisorName, remarks, saveReport, loading]);

  // Handle auto-saving new company details to Data Centre Party Printing master
  const handleAutoSavePartyToDataCentre = async (row: PrintingReportItem) => {
    const comp = row.companyName?.trim();
    if (!comp) return;

    try {
      await fetch("/api/data-centre/party-printing-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: comp,
          unitName: row.unitName?.trim() || null,
          grade: row.grade?.trim() || null,
          drumSize: row.drumSize?.trim() || null,
          targetProductionMtrs: row.targetProductionMtrs ? Number(row.targetProductionMtrs) : null,
          quality: row.quality?.trim() || null,
          isActive: true,
        }),
      });
      // Refresh local suggestions list
      fetchPartySuggestions();
    } catch {
      // background operation fails silently
    }
  };

  // Row update handlers
  const handleFieldChange = (index: number, field: keyof PrintingReportItem, value: any) => {
    setEntries((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      // Recalculate avg if netWeight or productionMeter changes
      if (field === "productionMeter" || field === "netWeight") {
        updated[index] = calculatePrintingRow(current);
      } else {
        updated[index] = current;
      }
      return updated;
    });
  };

  // Select party suggestion
  const handleSelectParty = (index: number, party: PartyPrintingDetailItem) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        companyName: party.companyName,
        unitName: party.unitName || updated[index].unitName,
        grade: party.grade || updated[index].grade,
        drumSize: party.drumSize || updated[index].drumSize,
        targetProductionMtrs: party.targetProductionMtrs ?? updated[index].targetProductionMtrs,
        quality: party.quality || updated[index].quality,
      };
      return updated;
    });
    setActiveCompanySearchRow(null);
  };

  // Select roll autocomplete
  const handleSelectRoll = (index: number, roll: AvailablePrintingRoll) => {
    setEntries((prev) => {
      const updated = [...prev];
      const withRoll = {
        ...updated[index],
        rollNumber: roll.rollNumber,
        loomNumber: String(roll.loomNumber),
        quality: roll.qualityType || updated[index].quality,
        productionMeter: roll.meter || updated[index].productionMeter,
        netWeight: roll.nettWeightKg || updated[index].netWeight,
        printMeter: roll.meter || updated[index].printMeter,
      };
      updated[index] = calculatePrintingRow(withRoll);
      return updated;
    });
    setActiveRollSearchRow(null);
  };

  const handleAddRow = () => {
    setEntries((prev) => [...prev, createEmptyRow(prev.length + 1)]);
  };

  const handleRemoveRow = (index: number) => {
    setEntries((prev) => {
      if (prev.length <= 1) {
        return [createEmptyRow(1)];
      }
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((item, idx) => ({ ...item, sequence: idx + 1 }));
    });
  };

  const handleResetToBlank = () => {
    if (window.confirm("Clear all rows and reset to blank boxes?")) {
      setEntries([
        createEmptyRow(1),
        createEmptyRow(2),
        createEmptyRow(3),
        createEmptyRow(4),
        createEmptyRow(5),
      ]);
      toast.info("Sheet reset to blank boxes");
    }
  };

  // Calculations
  const calculatedRows = useMemo(() => {
    return entries.map((e, idx) => calculatePrintingRow({ ...e, sequence: idx + 1 }));
  }, [entries]);

  const totals = useMemo(() => {
    return computePrintingTotals(calculatedRows);
  }, [calculatedRows]);

  const reportDataForExport: PrintingDailyReportData = useMemo(() => {
    return {
      date,
      shiftName,
      machineNo,
      operatorName,
      supervisorName,
      status,
      remarks,
      totals,
      entries: calculatedRows,
    };
  }, [date, shiftName, machineNo, operatorName, supervisorName, status, remarks, totals, calculatedRows]);

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold shadow-xs">
              <Printer className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Printing Daily Production Report
                </h1>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : status === "SUBMITTED"
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-amber-50 text-amber-700 border-amber-300"
                  }`}
                >
                  {status}
                </span>

                {/* Auto-Save Status Pill */}
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
              <p className="text-xs text-slate-500 mt-0.5">
                Record flexo printing runs, party specifications, roll meterage, fabric consumption, and net print output.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportPrintingReportExcel(reportDataForExport)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Export Excel
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              Print Sheet
            </button>
            <button
              onClick={() => saveReport("SUBMITTED", false)}
              disabled={isAutoSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs disabled:opacity-50"
            >
              <Check className="h-4 w-4 text-emerald-400" />
              Submit Output
            </button>
          </div>
        </div>

        {/* Metadata Filter Strip (Machine Number removed as requested) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <CalendarIcon className="h-3 w-3" /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <Clock className="h-3 w-3" /> Shift
            </label>
            <select
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SHIFTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <User className="h-3 w-3" /> Operator
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              <Shield className="h-3 w-3" /> Supervisor
            </label>
            <input
              type="text"
              placeholder="e.g. Rajesh Sharma"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Remarks Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Shift Remarks:
          </span>
          <input
            type="text"
            placeholder="Optional production notes, cylinder changes, ink shade variations, batch comments..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="flex-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* KPI Cards Strip (Stays outside the fullscreen table) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Rolls</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{totals.totalRolls}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Target Prod</div>
          <div className="text-xl font-black text-blue-700 font-mono mt-0.5">
            {totals.totalTargetMtrs.toLocaleString()} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fabric Prod</div>
          <div className="text-xl font-black text-sky-700 font-mono mt-0.5">
            {totals.totalProductionMtrs.toLocaleString()} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Net Weight</div>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {totals.totalNetWt.toFixed(1)} <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avg GSM</div>
          <div className="text-xl font-black text-blue-600 font-mono mt-0.5">
            {totals.avgWeightGsm.toFixed(1)} <span className="text-xs font-normal text-slate-500">g/m</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Printed</div>
          <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
            {totals.totalPrintMtrs.toLocaleString()} <span className="text-xs font-normal text-slate-500">m</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Variance</div>
          <div
            className={`text-xl font-black font-mono mt-0.5 ${
              totals.varianceMtrs < 0 ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            {totals.varianceMtrs > 0 ? `+${totals.varianceMtrs}` : totals.varianceMtrs}{" "}
            <span className="text-xs font-normal text-slate-500">m</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Efficiency</div>
          <div
            className={`text-xl font-black font-mono mt-0.5 ${
              totals.efficiencyPercent >= 95 ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {totals.efficiencyPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Spreadsheet Table Container (Only this container expands in fullscreen!) */}
      <div
        ref={tableContainerRef}
        className={`bg-white border border-slate-200 shadow-sm transition-all duration-200 flex flex-col ${
          isFullscreen
            ? "fixed inset-0 z-50 p-4 bg-white overflow-hidden"
            : "rounded-2xl overflow-hidden"
        }`}
      >
        {/* Table Toolbar with Top-Left Fullscreen Expand/Collapse */}
        <div className="p-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
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
              onClick={handleResetToBlank}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold shadow-xs transition-colors"
              title="Reset sheet to 5 empty blank rows"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              Clear / Reset Blank
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{entries.length} Rows</span>
            <span>•</span>
            <span className="text-[11px] text-slate-400">Avg. GSM = (Net Wt / Prod Mtr) × 1000</span>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1380px]">
            <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 shadow-xs">
              <tr className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-2.5 px-2 w-12 text-center border-r border-slate-200">#</th>
                <th className="py-2.5 px-3 w-48 border-r border-slate-200">Company Name</th>
                <th className="py-2.5 px-3 w-32 border-r border-slate-200">Unit Name</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-200">Grade</th>
                <th className="py-2.5 px-3 w-36 text-right border-r border-slate-200">Target (m)</th>
                <th className="py-2.5 px-3 w-36 border-r border-slate-200">Drum Size / Cut</th>
                <th className="py-2.5 px-3 w-36 border-r border-slate-200">Quality</th>
                <th className="py-2.5 px-3 w-32 border-r border-slate-200">Roll No.</th>
                <th className="py-2.5 px-3 w-28 border-r border-slate-200">Loom No.</th>
                <th className="py-2.5 px-3 w-32 text-right border-r border-slate-200">Prod (m)</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200">Net Wt (kg)</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200 bg-blue-50/60 text-blue-900">Avg (g/m)</th>
                <th className="py-2.5 px-3 w-32 text-right border-r border-slate-200 bg-emerald-50/60 text-emerald-900">Print (m)</th>
                <th className="py-2.5 px-3 w-44 border-r border-slate-200">Remarks</th>
                <th className="py-2.5 px-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {calculatedRows.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    idx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                  }`}
                >
                  {/* Sequence */}
                  <td className="py-2 px-2 text-center font-bold text-slate-400 text-xs border-r border-slate-200">
                    {idx + 1}
                  </td>

                  {/* Company Name (Searchable Typing Dropdown with Auto-Save) */}
                  <td className="py-1 px-2 border-r border-slate-200 relative">
                    <input
                      type="text"
                      placeholder="Type or select company..."
                      value={row.companyName || ""}
                      onChange={(e) => {
                        handleFieldChange(idx, "companyName", e.target.value);
                        setActiveCompanySearchRow(idx);
                        fetchPartySuggestions(e.target.value);
                      }}
                      onFocus={() => {
                        setActiveCompanySearchRow(idx);
                        fetchPartySuggestions(row.companyName || "");
                      }}
                      onBlur={() => {
                        // Delay closing so click on suggestion registers
                        setTimeout(() => {
                          setActiveCompanySearchRow(null);
                          // Auto-save new party to Data Centre on blur
                          handleAutoSavePartyToDataCentre(row);
                        }, 250);
                      }}
                      className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />

                    {/* Company Suggestions Dropdown */}
                    {activeCompanySearchRow === idx && partySuggestions.length > 0 && (
                      <div className="absolute left-2 top-full mt-1 z-30 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-1 max-h-56 overflow-y-auto">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span>Data Centre Parties</span>
                          <Building className="h-3 w-3" />
                        </div>
                        {partySuggestions.map((party) => (
                          <div
                            key={party.id}
                            onMouseDown={() => handleSelectParty(idx, party)}
                            className="px-3 py-1.5 hover:bg-primary/10 cursor-pointer text-xs flex flex-col gap-0.5 border-b border-slate-50 last:border-0"
                          >
                            <span className="font-bold text-slate-800">{party.companyName}</span>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              {party.unitName && <span>Unit: {party.unitName}</span>}
                              {party.grade && <span>• Grade: {party.grade}</span>}
                              {party.drumSize && <span>• Drum: {party.drumSize}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Unit Name */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="text"
                      placeholder="e.g. Ropar"
                      value={row.unitName || ""}
                      onChange={(e) => handleFieldChange(idx, "unitName", e.target.value)}
                      onBlur={() => handleAutoSavePartyToDataCentre(row)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </td>

                  {/* Grade */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="text"
                      placeholder="e.g. PPC"
                      value={row.grade || ""}
                      onChange={(e) => handleFieldChange(idx, "grade", e.target.value)}
                      onBlur={() => handleAutoSavePartyToDataCentre(row)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </td>

                  {/* Target Production (in metre) */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={row.targetProductionMtrs ?? ""}
                      onChange={(e) => handleFieldChange(idx, "targetProductionMtrs", e.target.value)}
                      onBlur={() => handleAutoSavePartyToDataCentre(row)}
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-right text-blue-700 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </td>

                  {/* Drum Size / Cut Length */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="text"
                      placeholder="e.g. 20mm"
                      value={row.drumSize || ""}
                      onChange={(e) => handleFieldChange(idx, "drumSize", e.target.value)}
                      onBlur={() => handleAutoSavePartyToDataCentre(row)}
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </td>

                  {/* Quality */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="text"
                      placeholder="Quality name..."
                      value={row.quality || ""}
                      onChange={(e) => handleFieldChange(idx, "quality", e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </td>

                  {/* Roll No. (Autocomplete from Loom Roll Cutting) */}
                  <td className="py-1 px-2 border-r border-slate-200 relative">
                    <input
                      type="text"
                      placeholder="e.g. D14332"
                      value={row.rollNumber || ""}
                      onChange={(e) => {
                        handleFieldChange(idx, "rollNumber", e.target.value);
                        setActiveRollSearchRow(idx);
                        fetchAvailableRolls(e.target.value);
                      }}
                      onFocus={() => {
                        setActiveRollSearchRow(idx);
                        fetchAvailableRolls(row.rollNumber || "");
                      }}
                      onBlur={() => {
                        setTimeout(() => setActiveRollSearchRow(null), 250);
                      }}
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />

                    {/* Roll Suggestions Dropdown */}
                    {activeRollSearchRow === idx && availableRolls.length > 0 && (
                      <div className="absolute left-2 top-full mt-1 z-30 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-1 max-h-56 overflow-y-auto">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span>Loom Rolls Available</span>
                          <Sparkles className="h-3 w-3 text-amber-500" />
                        </div>
                        {availableRolls.map((roll) => (
                          <div
                            key={roll.id}
                            onMouseDown={() => handleSelectRoll(idx, roll)}
                            className="px-3 py-1.5 hover:bg-primary/10 cursor-pointer text-xs flex flex-col gap-0.5 border-b border-slate-50 last:border-0"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-800">
                              <span>{roll.rollNumber}</span>
                              <span className="text-[10px] font-mono text-blue-600">Loom #{roll.loomNumber}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center justify-between">
                              <span className="truncate max-w-[120px]">{roll.qualityType}</span>
                              <span className="font-mono">{roll.meter}m • {roll.nettWeightKg}kg</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Loom No */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="text"
                      placeholder="e.g. 42 S1"
                      value={row.loomNumber || ""}
                      onChange={(e) => handleFieldChange(idx, "loomNumber", e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </td>

                  {/* Production in Metre */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={row.productionMeter}
                      onChange={(e) => handleFieldChange(idx, "productionMeter", e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono font-bold text-right text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </td>

                  {/* Net Wt. (kg) */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      placeholder="0.0"
                      value={row.netWeight}
                      onChange={(e) => handleFieldChange(idx, "netWeight", e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-right text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </td>

                  {/* Avg (g/m) Auto-Calculated */}
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-blue-700 bg-blue-50/40">
                    {Number(row.avgWeight) > 0 ? Number(row.avgWeight).toFixed(1) : "—"}
                  </td>

                  {/* Print in Metre */}
                  <td className="py-1 px-2 border-r border-slate-200 bg-emerald-50/30">
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={row.printMeter}
                      onChange={(e) => handleFieldChange(idx, "printMeter", e.target.value)}
                      className="w-full px-2 py-1 border border-emerald-300 rounded font-mono font-bold text-right text-emerald-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs"
                    />
                  </td>

                  {/* Remarks */}
                  <td className="py-1 px-2 border-r border-slate-200">
                    <input
                      type="text"
                      placeholder="Notes..."
                      value={row.remarks || ""}
                      onChange={(e) => handleFieldChange(idx, "remarks", e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-slate-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs"
                    />
                  </td>

                  {/* Delete Row Action */}
                  <td className="py-1 px-2 text-center">
                    <button
                      onClick={() => handleRemoveRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totals Summary Row */}
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 border-t-2 border-slate-400 shadow-md">
              <tr className="font-bold text-slate-900 text-xs">
                <td className="py-2.5 px-2 text-center font-black">Σ</td>
                <td colSpan={3} className="py-2.5 px-3 uppercase tracking-wider text-slate-800 font-extrabold">
                  Total Summary
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-blue-700 font-black">
                  {totals.totalTargetMtrs.toLocaleString()}
                </td>
                <td colSpan={4}></td>
                <td className="py-2.5 px-3 text-right font-mono text-sky-800 font-black">
                  {totals.totalProductionMtrs.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-bold">
                  {totals.totalNetWt.toFixed(1)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-blue-800 font-black bg-blue-100/70">
                  {totals.avgWeightGsm.toFixed(1)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-black bg-emerald-100/70">
                  {totals.totalPrintMtrs.toLocaleString()}
                </td>
                <td colSpan={2} className="py-2.5 px-3 text-slate-600 text-[11px]">
                  Eff: <strong className="text-emerald-700">{totals.efficiencyPercent.toFixed(1)}%</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Formal Print Preview Modal */}
      <PrintingReportPrintModal
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        data={reportDataForExport}
      />
    </div>
  );
}
