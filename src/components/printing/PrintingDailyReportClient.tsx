"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  Sliders,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  AvailablePrintingRoll,
  calculatePrintingRow,
  computePrintingTotals,
  PrintingDailyReportData,
  PrintingReportItem,
} from "@/lib/printing/printing-types";
import { exportPrintingReportExcel } from "@/lib/printing/printing-export";
import { PrintingReportPrintModal } from "./PrintingReportPrintModal";

const SHIFTS = ["Day Shift", "Night Shift", "Shift 1", "Shift 2"];
const MACHINES = ["Machine-1", "Machine-2", "Machine-3"];

const DEFAULT_SAMPLE_ROWS: PrintingReportItem[] = [
  { sequence: 1, quality: "Ambuja", rollNumber: "D14332", loomNumber: "42 S1", productionMeter: 2421, netWeight: 181.7, avgWeight: 75.0, printMeter: 2350, remarks: "" },
  { sequence: 2, quality: "Ambuja PPC", rollNumber: "D14339", loomNumber: "68 S1", productionMeter: 3494, netWeight: 265.5, avgWeight: 76.0, printMeter: "", remarks: "" },
  { sequence: 3, quality: "T Rapan Yellow", rollNumber: "D14390", loomNumber: "66 S1", productionMeter: 3270, netWeight: 249.5, avgWeight: 76.3, printMeter: 5336, remarks: "" },
  { sequence: 4, quality: "Rady", rollNumber: "D14320", loomNumber: "37 S1", productionMeter: 3112, netWeight: 235.1, avgWeight: 75.5, printMeter: "", remarks: "" },
  { sequence: 5, quality: "Cem 9.5 20mm", rollNumber: "D14383", loomNumber: "52 S1", productionMeter: 2532, netWeight: 194.2, avgWeight: 76.7, printMeter: 5111, remarks: "" },
  { sequence: 6, quality: "Jet M. T-01", rollNumber: "D14336", loomNumber: "22 S1", productionMeter: 2694, netWeight: 199.1, avgWeight: 75.2, printMeter: "", remarks: "" },
];

export function PrintingDailyReportClient() {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [machineNo, setMachineNo] = useState<string>("Machine-1");
  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  const [entries, setEntries] = useState<PrintingReportItem[]>(DEFAULT_SAMPLE_ROWS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Roll autocomplete suggestions
  const [availableRolls, setAvailableRolls] = useState<AvailablePrintingRoll[]>([]);
  const [activeRollSearchRow, setActiveRollSearchRow] = useState<number | null>(null);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Fetch report data for selected Date, Shift, and Machine
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
              quality: e.quality || "",
              rollNumber: e.rollNumber || "",
              loomNumber: e.loomNumber || "",
              productionMeter: e.productionMeter ?? 0,
              netWeight: e.netWeight ?? 0,
              avgWeight: e.avgWeight ?? 0,
              printMeter: e.printMeter > 0 ? e.printMeter : "",
              remarks: e.remarks || "",
            }))
          );
        } else {
          setEntries(DEFAULT_SAMPLE_ROWS);
        }
      } else {
        setStatus("DRAFT");
        // Fresh entry template with default rows
        setEntries(DEFAULT_SAMPLE_ROWS);
      }
    } catch {
      toast.error("Failed to load printing report data");
    } finally {
      setLoading(false);
    }
  }, [date, shiftName, machineNo]);

  // Fetch available rolls for fast lookup
  const fetchAvailableRolls = useCallback(async () => {
    try {
      const res = await fetch("/api/production/printing/available-rolls");
      const json = await res.json();
      if (json.success && Array.isArray(json.rolls)) {
        setAvailableRolls(json.rolls);
      }
    } catch {
      // Non-critical background fetch
    }
  }, []);

  useEffect(() => {
    fetchReportData();
    fetchAvailableRolls();
  }, [fetchReportData, fetchAvailableRolls]);

  // Dynamic Totals
  const totals = useMemo(() => computePrintingTotals(entries), [entries]);

  // Row update handlers
  const handleUpdateEntry = (index: number, field: keyof PrintingReportItem, value: any) => {
    setEntries((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };
      next[index] = calculatePrintingRow(updated);
      return next;
    });
  };

  // Roll selection handler (auto-fills quality, loom, production meter, net wt, avg)
  const handleSelectRoll = (index: number, roll: AvailablePrintingRoll) => {
    setEntries((prev) => {
      const next = [...prev];
      const updated: PrintingReportItem = {
        ...next[index],
        rollNumber: roll.rollNumber,
        loomNumber: String(roll.loomNumber),
        quality: roll.qualityType,
        productionMeter: roll.meter,
        netWeight: roll.nettWeightKg,
        avgWeight: roll.avgWeightPerMeter,
      };
      next[index] = calculatePrintingRow(updated);
      return next;
    });
    setActiveRollSearchRow(null);
  };

  const handleAddRow = () => {
    setEntries((prev) => [
      ...prev,
      {
        sequence: prev.length + 1,
        quality: "",
        rollNumber: "",
        loomNumber: "",
        productionMeter: "",
        netWeight: "",
        avgWeight: "",
        printMeter: "",
        remarks: "",
      },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    if (entries.length <= 1) {
      toast.error("At least one row must be retained");
      return;
    }
    setEntries((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((row, idx) => ({ ...row, sequence: idx + 1 }))
    );
  };

  // Save report (Draft or Submitted)
  const handleSaveReport = async (targetStatus: "DRAFT" | "SUBMITTED" = "DRAFT") => {
    setSaving(true);
    try {
      const payload = {
        date,
        shiftName,
        machineNo,
        operatorName: operatorName.trim() || null,
        supervisorName: supervisorName.trim() || null,
        status: targetStatus,
        remarks: remarks.trim() || null,
        entries: entries.map((e, idx) => ({
          ...e,
          sequence: idx + 1,
          productionMeter: Number(e.productionMeter) || 0,
          netWeight: Number(e.netWeight) || 0,
          avgWeight: Number(e.avgWeight) || 0,
          printMeter: Number(e.printMeter) || 0,
        })),
      };

      const res = await fetch("/api/production/printing/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setStatus(targetStatus);
        toast.success(
          targetStatus === "SUBMITTED"
            ? "Printing Daily Production Report submitted successfully"
            : "Draft saved successfully"
        );
        fetchReportData();
      } else {
        toast.error(json.error || "Failed to save printing report");
      }
    } catch {
      toast.error("An error occurred while saving the report");
    } finally {
      setSaving(false);
    }
  };

  // Current report data object for print & excel
  const currentReportData: PrintingDailyReportData = {
    date,
    shiftName,
    machineNo,
    companyName: "FLEXICOM INDUSTRIES PVT. LIMITED",
    unitName: "Unit-1",
    operatorName,
    supervisorName,
    status,
    remarks,
    totals,
    entries,
  };

  return (
    <div
      className={`space-y-5 font-sans ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-background p-4 md:p-6 overflow-hidden flex flex-col h-screen w-screen"
          : ""
      }`}
    >
      {/* 1. Header & Controls Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                  Printing Daily Production Report
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      status === "SUBMITTED" || status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {status}
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Record daily printing roll meterage, fabric consumption, net weight, average GSM, and printed meters.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportPrintingReportExcel(currentReportData)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Download Excel matching factory format"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Print Report with Company Letterhead"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveReport("DRAFT")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveReport("SUBMITTED")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Output</span>
            </button>
          </div>
        </div>

        {/* Filters Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
          {/* Date Picker */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 outline-none focus:bg-white focus:border-slate-800 transition-colors"
            />
          </div>

          {/* Shift Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Shift
            </label>
            <select
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              className="w-full text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 outline-none focus:bg-white focus:border-slate-800 transition-colors cursor-pointer"
            >
              {SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Machine Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Machine No.
            </label>
            <select
              value={machineNo}
              onChange={(e) => setMachineNo(e.target.value)}
              className="w-full text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 outline-none focus:bg-white focus:border-slate-800 transition-colors cursor-pointer"
            >
              {MACHINES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Operator */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Operator
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 outline-none focus:bg-white focus:border-slate-800 transition-colors placeholder:text-slate-400"
            />
          </div>

          {/* Supervisor */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Supervisor
            </label>
            <input
              type="text"
              placeholder="e.g. Rajesh Sharma"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-800 outline-none focus:bg-white focus:border-slate-800 transition-colors placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Remarks Input */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
            Shift Remarks:
          </span>
          <input
            type="text"
            placeholder="Optional production notes, cylinder changes, ink shade variations, batch comments..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="flex-1 text-xs px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-colors"
          />
        </div>
      </div>

      {/* 2. KPI Summary Bento Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 shrink-0">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Rolls
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {totals.totalRolls}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Rolls entered</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Fabric Length
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {totals.totalProductionMtrs.toLocaleString()} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Input roll meters</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Net Weight
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {totals.totalNetWt.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Cumulative net weight</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10.5px] font-bold text-sky-700 uppercase tracking-wider block mb-1">
            Average GSM
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-sky-700">
            {totals.avgWeightGsm} <span className="text-xs font-normal text-slate-400">g/m</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Net Wt / Production Metre</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            Printed Meters
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
            {totals.totalPrintMtrs.toLocaleString()} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Print in Metre output</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Variance / Gap
          </span>
          <div className={`text-xl sm:text-2xl font-black font-mono ${totals.varianceMtrs >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
            {totals.varianceMtrs >= 0 ? "+" : ""}{totals.varianceMtrs.toLocaleString()} <span className="text-xs font-normal text-slate-400">m</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Printed vs Input Length</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <span className="text-[10.5px] font-bold text-indigo-700 uppercase tracking-wider block mb-1">
            Efficiency
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-indigo-700">
            {totals.efficiencyPercent}%
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Printed / Fabric Ratio</p>
        </div>
      </div>

      {/* 3. Main Spreadsheet Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-[420px]">
        {/* Table Control Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Top-Left Expand / Collapse Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
              title={isFullscreen ? "Collapse (Esc)" : "Expand to Fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
                  <span>Expand</span>
                </>
              )}
            </button>

            <span className="text-xs font-bold text-slate-900 tracking-tight">
              Production Entries Grid
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              ({entries.length} rows)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>

            <button
              type="button"
              onClick={() => setEntries(DEFAULT_SAMPLE_ROWS)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Reset to Excel sample data"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Sample</span>
            </button>
          </div>
        </div>

        {/* Scrollable Spreadsheet Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[960px]">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 font-bold uppercase text-[10.5px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 text-center w-12 border-r border-slate-100">#</th>
                <th className="py-2.5 px-3.5 min-w-[150px] border-r border-slate-100">Quality</th>
                <th className="py-2.5 px-3 w-36 text-center border-r border-slate-100">Roll No.</th>
                <th className="py-2.5 px-3 w-28 text-center border-r border-slate-100">Loom No.</th>
                <th className="py-2.5 px-3 w-36 text-right border-r border-slate-100">Production (m)</th>
                <th className="py-2.5 px-3 w-32 text-right border-r border-slate-100">Net Wt. (kg)</th>
                <th className="py-2.5 px-3 w-28 text-right border-r border-slate-100 bg-sky-50/40 text-sky-800">
                  Avg. (g/m)
                </th>
                <th className="py-2.5 px-3 w-36 text-right border-r border-slate-100 bg-emerald-50/40 text-emerald-800">
                  Print (m)
                </th>
                <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-100">Remarks</th>
                <th className="py-2.5 px-2 text-center w-12">Act</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {entries.map((entry, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  {/* Sequence # */}
                  <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100">
                    {idx + 1}
                  </td>

                  {/* Quality Name */}
                  <td className="py-1.5 px-2 border-r border-slate-100">
                    <input
                      type="text"
                      value={entry.quality}
                      onChange={(e) => handleUpdateEntry(idx, "quality", e.target.value)}
                      placeholder="e.g. Ambuja, T Rapan"
                      className="w-full text-xs font-semibold px-2 py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-800 rounded-md outline-none transition-colors"
                    />
                  </td>

                  {/* Roll Number with Autocomplete lookup */}
                  <td className="py-1.5 px-2 text-center border-r border-slate-100 relative">
                    <input
                      type="text"
                      value={entry.rollNumber}
                      onChange={(e) => handleUpdateEntry(idx, "rollNumber", e.target.value)}
                      onFocus={() => setActiveRollSearchRow(idx)}
                      placeholder="D14332"
                      className="w-full text-xs font-mono font-bold text-center px-2 py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-800 rounded-md outline-none transition-colors"
                    />

                    {/* Autocomplete Dropdown if active */}
                    {activeRollSearchRow === idx && availableRolls.length > 0 && (
                      <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto text-left">
                        <div className="p-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                          <span>Available Rolls ({availableRolls.length})</span>
                          <button
                            type="button"
                            onClick={() => setActiveRollSearchRow(null)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            ×
                          </button>
                        </div>
                        {availableRolls
                          .filter(
                            (r) =>
                              !entry.rollNumber ||
                              r.rollNumber.toLowerCase().includes(entry.rollNumber.toLowerCase())
                          )
                          .slice(0, 8)
                          .map((roll) => (
                            <button
                              key={roll.id}
                              type="button"
                              onClick={() => handleSelectRoll(idx, roll)}
                              className="w-full text-left px-3 py-1.5 hover:bg-sky-50 text-xs flex items-center justify-between border-b border-slate-50 transition-colors"
                            >
                              <div>
                                <span className="font-mono font-bold text-slate-900">
                                  {roll.rollNumber}
                                </span>
                                <span className="text-[10px] text-slate-500 ml-1.5">
                                  Loom #{roll.loomNumber}
                                </span>
                                <div className="text-[10px] text-sky-700 truncate max-w-[140px]">
                                  {roll.qualityType}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-semibold text-slate-800">
                                  {roll.meter}m
                                </span>
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  {roll.nettWeightKg}kg
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </td>

                  {/* Loom Number */}
                  <td className="py-1.5 px-2 text-center border-r border-slate-100">
                    <input
                      type="text"
                      value={entry.loomNumber}
                      onChange={(e) => handleUpdateEntry(idx, "loomNumber", e.target.value)}
                      placeholder="42 S1"
                      className="w-full text-xs font-mono font-semibold text-center text-sky-700 px-2 py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-800 rounded-md outline-none transition-colors"
                    />
                  </td>

                  {/* Production in Metre */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-100">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={entry.productionMeter}
                      onChange={(e) => handleUpdateEntry(idx, "productionMeter", e.target.value)}
                      placeholder="0"
                      className="w-full text-xs font-mono font-semibold text-right px-2 py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-800 rounded-md outline-none transition-colors"
                    />
                  </td>

                  {/* Net Wt. (kg) */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-100">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={entry.netWeight}
                      onChange={(e) => handleUpdateEntry(idx, "netWeight", e.target.value)}
                      placeholder="0.0"
                      className="w-full text-xs font-mono text-right px-2 py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-800 rounded-md outline-none transition-colors"
                    />
                  </td>

                  {/* Avg. (g/m) Auto-calculated */}
                  <td className="py-2 px-3 text-right font-mono font-bold text-sky-800 bg-sky-50/30 border-r border-slate-100">
                    {Number(entry.avgWeight) > 0 ? Number(entry.avgWeight).toFixed(1) : "—"}
                  </td>

                  {/* Print in Metre */}
                  <td className="py-1.5 px-2 text-right border-r border-slate-100 bg-emerald-50/20">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={entry.printMeter}
                      onChange={(e) => handleUpdateEntry(idx, "printMeter", e.target.value)}
                      placeholder="e.g. 2350"
                      className="w-full text-xs font-mono font-black text-right text-emerald-800 px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-slate-800 rounded-md outline-none transition-colors placeholder:text-slate-300"
                    />
                  </td>

                  {/* Remarks */}
                  <td className="py-1.5 px-2 border-r border-slate-100">
                    <input
                      type="text"
                      value={entry.remarks || ""}
                      onChange={(e) => handleUpdateEntry(idx, "remarks", e.target.value)}
                      placeholder="Notes..."
                      className="w-full text-xs px-2 py-1 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-800 rounded-md outline-none transition-colors text-slate-600"
                    />
                  </td>

                  {/* Delete Action */}
                  <td className="py-1.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Totals Summary Row */}
            <tfoot className="sticky bottom-0 z-10 bg-slate-100/95 backdrop-blur-xs border-t-2 border-slate-900 text-xs font-bold">
              <tr>
                <td colSpan={4} className="py-3 px-3 text-right border-r border-slate-200">
                  TOTALS:
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                  {totals.totalProductionMtrs.toLocaleString()}{" "}
                  <span className="text-[10px] font-normal text-slate-400">m</span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                  {totals.totalNetWt.toFixed(1)}{" "}
                  <span className="text-[10px] font-normal text-slate-400">kg</span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-sky-800 bg-sky-100/50 border-r border-slate-200">
                  {totals.avgWeightGsm.toFixed(1)}{" "}
                  <span className="text-[10px] font-normal text-slate-500">g/m</span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-100/50 border-r border-slate-200">
                  {totals.totalPrintMtrs.toLocaleString()}{" "}
                  <span className="text-[10px] font-normal text-slate-500">m</span>
                </td>
                <td colSpan={2} className="py-3 px-3 text-slate-600 text-[11px]">
                  Variance:{" "}
                  <span
                    className={
                      totals.varianceMtrs >= 0
                        ? "text-emerald-700 font-mono font-bold"
                        : "text-rose-600 font-mono font-bold"
                    }
                  >
                    {totals.varianceMtrs >= 0 ? "+" : ""}
                    {totals.varianceMtrs} m ({totals.efficiencyPercent}%)
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. Letterhead Print Preview Modal */}
      <PrintingReportPrintModal
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        data={currentReportData}
      />
    </div>
  );
}
