"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Save,
  Printer,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  Scissors,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Scale,
  Ruler,
  Layers,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  LoomRollCuttingEntryItem,
  LoomRollCuttingReportData,
  RollCuttingKpis,
  computeRollMeters,
  computeRollWeightsAndAvg,
  generateNextRollNumber,
} from "@/lib/loom/loom-roll-cutting-types";
import { exportLoomRollCuttingExcel } from "@/lib/loom/loom-roll-cutting-export";
import { LoomRollCuttingPrintModal } from "./LoomRollCuttingPrintModal";

interface AvailableQuality {
  code: string;
  colorGroup: string;
  colour: string;
  denier: number | null;
  reedSpaceCm: number | null;
  size: string;
}

interface AvailableShift {
  id: string;
  name: string;
}

interface AvailableOperator {
  id: string;
  name: string;
  employeeCode?: string | null;
  section?: string | null;
  designation?: string | null;
}

export function LoomRollCuttingSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedShift, setSelectedShift] = useState("Day Shift");
  const [supervisorName, setSupervisorName] = useState("");
  const [reportStatus, setReportStatus] = useState("DRAFT");
  const [reportRemarks, setReportRemarks] = useState("");

  const [entries, setEntries] = useState<LoomRollCuttingEntryItem[]>([]);
  const [availableQualities, setAvailableQualities] = useState<AvailableQuality[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [availableOperators, setAvailableOperators] = useState<AvailableOperator[]>([]);
  const [loomAllocations, setLoomAllocations] = useState<Record<number, { qualityCode: string; size: string; denier: string }>>({});
  const [suggestedRollNumber, setSuggestedRollNumber] = useState("CT-14376");
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Fetch report data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        shiftName: selectedShift,
        _t: String(Date.now()),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/production/loom/roll-cutting?${params.toString()}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });

      if (!res.ok) throw new Error("Failed to load Roll Cutting Report");
      const json = await res.json();

      const report = json.report || {};
      setSupervisorName(report.supervisorName || "");
      setReportStatus(report.status || "DRAFT");
      setReportRemarks(report.remarks || "");
      setEntries(json.entries || []);
      setAvailableQualities(json.availableQualities || []);
      setAvailableShifts(json.availableShifts || []);
      setAvailableOperators(json.availableOperators || []);
      setLoomAllocations(json.loomAllocations || {});
      if (json.suggestedNextRollNumber) {
        setSuggestedRollNumber(json.suggestedNextRollNumber);
      }
    } catch {
      toast.error("Failed to load Roll Cutting Report");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedShift, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live KPI Calculations
  const kpis: RollCuttingKpis = useMemo(() => {
    const totalRollsCount = entries.length;
    const totalMeters = Math.round(entries.reduce((s, e) => s + (e.meter || 0), 0) * 100) / 100;
    const totalGrossWtKg = Math.round(entries.reduce((s, e) => s + (e.grossWeightKg || 0), 0) * 100) / 100;
    const totalTareWtKg = Math.round(entries.reduce((s, e) => s + (e.tareWeightKg || 1.2), 0) * 100) / 100;
    const totalNettWtKg = Math.round(entries.reduce((s, e) => s + (e.nettWeightKg || 0), 0) * 100) / 100;
    const averageWeightPerMeter = totalMeters > 0 && totalNettWtKg > 0
      ? Math.round(((totalNettWtKg * 1000) / totalMeters) * 10) / 10
      : 0;
    const uniqueLooms = new Set(entries.map((e) => e.loomNumber));

    return {
      totalRollsCount,
      totalMeters,
      totalGrossWtKg,
      totalTareWtKg,
      totalNettWtKg,
      averageWeightPerMeter,
      activeLoomsCount: uniqueLooms.size,
    };
  }, [entries]);

  // Handle entry field update with live recalculation
  const handleUpdateEntry = (index: number, field: keyof LoomRollCuttingEntryItem, value: any) => {
    setEntries((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], [field]: value };

      if (field === "loomNumber") {
        const loomNum = Number(value);
        const alloc = loomAllocations[loomNum];
        if (alloc) {
          if (!current.qualityType || current.qualityType === "STANDARD") {
            current.qualityType = alloc.qualityCode;
          }
          if (!current.size) {
            current.size = alloc.size;
          }
        }
      }

      if (field === "qualityType") {
        const qObj = availableQualities.find((q) => q.code === value);
        if (qObj && qObj.size) {
          current.size = qObj.size;
        }
      }

      if (field === "initialReading" || field === "finalReading") {
        const init = field === "initialReading" ? Number(value) || 0 : current.initialReading;
        const final = field === "finalReading" ? Number(value) || 0 : current.finalReading;
        current.meter = computeRollMeters(init, final);
        const { nettWeightKg, avgWeightPerMeter } = computeRollWeightsAndAvg(
          current.meter,
          current.grossWeightKg,
          current.tareWeightKg
        );
        current.nettWeightKg = nettWeightKg;
        current.avgWeightPerMeter = avgWeightPerMeter;
      }

      if (field === "grossWeightKg" || field === "tareWeightKg") {
        const gross = field === "grossWeightKg" ? Number(value) || 0 : current.grossWeightKg;
        const tare = field === "tareWeightKg" ? Number(value) || 0 : current.tareWeightKg;
        const { nettWeightKg, avgWeightPerMeter } = computeRollWeightsAndAvg(current.meter, gross, tare);
        current.nettWeightKg = nettWeightKg;
        current.avgWeightPerMeter = avgWeightPerMeter;
      }

      copy[index] = current;
      return copy;
    });
  };

  // Add new roll entry
  const handleAddEntry = () => {
    const lastEntry = entries[entries.length - 1];
    const nextRoll = generateNextRollNumber(lastEntry?.rollNumber || suggestedRollNumber);
    const defaultLoom = lastEntry ? (lastEntry.loomNumber % 91) + 1 : 1;
    const alloc = loomAllocations[defaultLoom];

    const newEntry: LoomRollCuttingEntryItem = {
      sequence: entries.length + 1,
      rollNumber: nextRoll,
      loomNumber: defaultLoom,
      size: alloc?.size || "490",
      qualityType: alloc?.qualityCode || (availableQualities[0]?.code || "Mahal/LPP/W"),
      initialReading: 0,
      finalReading: 0,
      meter: 0,
      grossWeightKg: 0,
      tareWeightKg: 1.2,
      nettWeightKg: 0,
      avgWeightPerMeter: 0,
      supervisorSign: supervisorName,
      remarks: "",
    };

    setEntries((prev) => [...prev, newEntry]);
    setSuggestedRollNumber(generateNextRollNumber(nextRoll));
  };

  // Duplicate an entry
  const handleDuplicateEntry = (index: number) => {
    const target = entries[index];
    const nextRoll = generateNextRollNumber(target.rollNumber);
    const newEntry: LoomRollCuttingEntryItem = {
      ...target,
      id: undefined,
      sequence: entries.length + 1,
      rollNumber: nextRoll,
      initialReading: target.finalReading,
      finalReading: target.finalReading,
      meter: 0,
      grossWeightKg: 0,
      nettWeightKg: 0,
      avgWeightPerMeter: 0,
    };
    setEntries((prev) => [...prev, newEntry]);
    toast.success(`Duplicated entry #${index + 1} with Roll #${nextRoll}`);
  };

  // Delete an entry
  const handleDeleteEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    toast.info("Roll cutting entry removed");
  };

  // Auto-fill from 2-Hour Reading Sheet
  const handleAutoFillFromSheet = async () => {
    setAutoFilling(true);
    try {
      const res = await fetch("/api/production/loom/roll-cutting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "AUTO_PREFILL_FROM_SHEET",
          date: selectedDate,
          shiftName: selectedShift,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "No production recorded on 2-Hour Sheet for this shift");
      }

      if (json.entries && json.entries.length > 0) {
        setEntries(json.entries);
        toast.success(json.message);
      } else {
        toast.info("No active loom production found on the 2-Hour sheet for this shift");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to auto-fill from 2-Hour Sheet");
    } finally {
      setAutoFilling(false);
    }
  };

  // Save / Submit Report
  const handleSaveReport = async (targetStatus: "DRAFT" | "SUBMITTED" = "DRAFT") => {
    if (entries.length === 0) {
      toast.error("Please add at least one roll cutting entry before saving");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        action: "SAVE_REPORT",
        date: selectedDate,
        shiftName: selectedShift,
        supervisorName,
        status: targetStatus,
        remarks: reportRemarks,
        entries,
      };

      const res = await fetch("/api/production/loom/roll-cutting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save report");

      setReportStatus(targetStatus);
      toast.success(targetStatus === "SUBMITTED" ? "Daily Roll Cutting Report submitted and synced to Roll Stock!" : "Roll Cutting Report draft saved successfully!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const reportDataForPrint: LoomRollCuttingReportData = {
    date: selectedDate,
    shiftName: selectedShift,
    supervisorName,
    preparedBy: supervisorName,
    status: reportStatus,
    remarks: reportRemarks,
    totalRollsCount: kpis.totalRollsCount,
    totalMeters: kpis.totalMeters,
    totalGrossWtKg: kpis.totalGrossWtKg,
    totalTareWtKg: kpis.totalTareWtKg,
    totalNettWtKg: kpis.totalNettWtKg,
    averageWeightPerMeter: kpis.averageWeightPerMeter,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Daily Loom Roll Cutting Report
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  reportStatus === "SUBMITTED" || reportStatus === "APPROVED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}>
                  {reportStatus}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Physical floor log entry matching Starlinger / Lohia standards with auto-weight and g/m computation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAutoFillFromSheet}
            disabled={autoFilling || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Pull active looms and meter readings recorded on the 2-Hour Reading Sheet"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            {autoFilling ? "Syncing..." : "Auto-fill from 2-Hr Sheet"}
          </button>

          <button
            onClick={() => exportLoomRollCuttingExcel({ report: reportDataForPrint, entries, kpis })}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Excel
          </button>

          <button
            onClick={() => setPrintModalOpen(true)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Preview
          </button>

          <button
            onClick={() => handleSaveReport("DRAFT")}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            onClick={() => handleSaveReport("SUBMITTED")}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Submit & Sync Roll Stock
          </button>
        </div>
      </div>

      {/* Filter & Sheet Meta Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 rounded-xl bg-card border shadow-xs">
        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5" /> Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5" /> Shift
          </label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
          >
            <option value="Day Shift">Day Shift (08:00 - 20:00)</option>
            <option value="Night Shift">Night Shift (20:00 - 08:00)</option>
            <option value="Shift A">Shift A</option>
            <option value="Shift B">Shift B</option>
            {availableShifts.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <User className="w-3.5 h-3.5" /> Supervisor Sign / In-Charge
          </label>
          <input
            type="text"
            placeholder="e.g. Ravinder Kumar"
            value={supervisorName}
            onChange={(e) => setSupervisorName(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <Search className="w-3.5 h-3.5" /> Quick Filter
          </label>
          <input
            type="text"
            placeholder="Filter roll #, loom #, quality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
          />
        </div>
      </div>

      {/* KPI Highlight Summary Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Rolls Cut</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-foreground">{kpis.totalRollsCount}</span>
            <span className="text-xs text-muted-foreground font-medium">{kpis.activeLoomsCount} Looms</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Cut Length</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {kpis.totalMeters.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">meters</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Nett Weight</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {kpis.totalNettWtKg.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Avg Linear Mass</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {kpis.averageWeightPerMeter.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">g/m</span>
          </div>
        </div>
      </div>

      {/* Interactive Daily Floor Form Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="font-semibold text-sm text-foreground">Floor Roll Cut Log Entries</h3>
            <span className="text-xs font-mono text-muted-foreground">({entries.length} items)</span>
          </div>

          <button
            onClick={handleAddEntry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Roll Row
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/70 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="p-2.5 text-center border-r w-12">S.No.</th>
                <th className="p-2.5 border-r w-32">Roll No.</th>
                <th className="p-2.5 border-r w-24 text-center">Loom #</th>
                <th className="p-2.5 border-r w-20 text-center">Size (mm)</th>
                <th className="p-2.5 border-r min-w-[160px]">Quality Code</th>
                <th className="p-2.5 border-r w-24 text-right">Init Reading</th>
                <th className="p-2.5 border-r w-24 text-right">Final Reading</th>
                <th className="p-2.5 border-r w-20 text-right bg-muted/90 text-foreground font-bold">Meter</th>
                <th className="p-2.5 border-r w-24 text-right">Gross Wt (kg)</th>
                <th className="p-2.5 border-r w-20 text-right text-muted-foreground">Tare (kg)</th>
                <th className="p-2.5 border-r w-24 text-right font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">Nett (kg)</th>
                <th className="p-2.5 border-r w-20 text-right text-purple-600 dark:text-purple-400">Avg (g/m)</th>
                <th className="p-2.5 border-r w-28 text-center">Sup. Sign</th>
                <th className="p-2.5 border-r min-w-[140px]">Remarks</th>
                <th className="p-2.5 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {entries.length > 0 ? (
                entries.map((entry, idx) => (
                  <tr key={entry.id || idx} className="hover:bg-muted/20 transition-colors group">
                    {/* S.No */}
                    <td className="p-2 text-center border-r font-mono text-muted-foreground font-bold">
                      {idx + 1}
                    </td>

                    {/* Roll No */}
                    <td className="p-1.5 border-r">
                      <input
                        type="text"
                        value={entry.rollNumber}
                        onChange={(e) => handleUpdateEntry(idx, "rollNumber", e.target.value)}
                        className="w-full text-xs font-mono font-bold px-2 py-1.5 rounded border bg-background text-foreground focus:ring-1 focus:ring-primary outline-hidden uppercase"
                        placeholder="CT-14376"
                      />
                    </td>

                    {/* Loom No */}
                    <td className="p-1.5 border-r">
                      <select
                        value={entry.loomNumber}
                        onChange={(e) => handleUpdateEntry(idx, "loomNumber", Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold px-2 py-1.5 rounded border bg-background text-sky-600 dark:text-sky-400 focus:ring-1 focus:ring-primary outline-hidden cursor-pointer text-center"
                      >
                        {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num}>
                            #{num}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Size */}
                    <td className="p-1.5 border-r">
                      <input
                        type="text"
                        value={entry.size || ""}
                        onChange={(e) => handleUpdateEntry(idx, "size", e.target.value)}
                        className="w-full text-xs font-mono text-center px-1.5 py-1.5 rounded border bg-background text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                        placeholder="490"
                      />
                    </td>

                    {/* Quality */}
                    <td className="p-1.5 border-r">
                      <select
                        value={entry.qualityType}
                        onChange={(e) => handleUpdateEntry(idx, "qualityType", e.target.value)}
                        className="w-full text-xs font-medium px-2 py-1.5 rounded border bg-background text-foreground focus:ring-1 focus:ring-primary outline-hidden cursor-pointer"
                      >
                        {availableQualities.map((q) => (
                          <option key={q.code} value={q.code}>
                            {q.code}
                          </option>
                        ))}
                        {!availableQualities.some((q) => q.code === entry.qualityType) && entry.qualityType && (
                          <option value={entry.qualityType}>{entry.qualityType}</option>
                        )}
                      </select>
                    </td>

                    {/* Initial Reading */}
                    <td className="p-1.5 border-r">
                      <input
                        type="number"
                        value={entry.initialReading ?? ""}
                        onChange={(e) => handleUpdateEntry(idx, "initialReading", e.target.value === "" ? 0 : Number(e.target.value))}
                        className="w-full text-xs font-mono text-right px-2 py-1.5 rounded border bg-background text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                        placeholder="0"
                      />
                    </td>

                    {/* Final Reading */}
                    <td className="p-1.5 border-r">
                      <input
                        type="number"
                        value={entry.finalReading ?? ""}
                        onChange={(e) => handleUpdateEntry(idx, "finalReading", e.target.value === "" ? 0 : Number(e.target.value))}
                        className="w-full text-xs font-mono text-right px-2 py-1.5 rounded border bg-background text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                        placeholder="0"
                      />
                    </td>

                    {/* Meter (Auto-Calculated) */}
                    <td className="p-2 border-r text-right font-mono font-bold text-foreground bg-muted/20">
                      {entry.meter !== undefined && entry.meter !== null ? Number(entry.meter).toLocaleString() : "0"}
                    </td>

                    {/* Gross Wt */}
                    <td className="p-1.5 border-r">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.grossWeightKg ?? ""}
                        onChange={(e) => handleUpdateEntry(idx, "grossWeightKg", e.target.value === "" ? 0 : Number(e.target.value))}
                        className="w-full text-xs font-mono text-right px-2 py-1.5 rounded border bg-background text-foreground focus:ring-1 focus:ring-primary outline-hidden font-semibold"
                        placeholder="0.00"
                      />
                    </td>

                    {/* Tare Wt */}
                    <td className="p-1.5 border-r">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.tareWeightKg ?? 1.2}
                        onChange={(e) => handleUpdateEntry(idx, "tareWeightKg", e.target.value === "" ? 1.2 : Number(e.target.value))}
                        className="w-full text-xs font-mono text-right px-2 py-1.5 rounded border bg-background text-muted-foreground focus:ring-1 focus:ring-primary outline-hidden"
                        placeholder="1.20"
                      />
                    </td>

                    {/* Nett Wt (Auto-Calculated) */}
                    <td className="p-2 border-r text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                      {entry.nettWeightKg !== undefined && entry.nettWeightKg !== null ? entry.nettWeightKg.toFixed(2) : "0.00"}
                    </td>

                    {/* Avg g/m (Auto-Calculated) */}
                    <td className="p-2 border-r text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                      {entry.avgWeightPerMeter !== undefined && entry.avgWeightPerMeter !== null ? entry.avgWeightPerMeter.toFixed(1) : "0.0"}
                    </td>

                    {/* Sup. Sign */}
                    <td className="p-1.5 border-r">
                      <input
                        type="text"
                        value={entry.supervisorSign || ""}
                        onChange={(e) => handleUpdateEntry(idx, "supervisorSign", e.target.value)}
                        className="w-full text-xs text-center px-1.5 py-1.5 rounded border bg-background text-foreground focus:ring-1 focus:ring-primary outline-hidden"
                        placeholder={supervisorName || "Sign"}
                      />
                    </td>

                    {/* Remarks */}
                    <td className="p-1.5 border-r">
                      <input
                        type="text"
                        value={entry.remarks || ""}
                        onChange={(e) => handleUpdateEntry(idx, "remarks", e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded border bg-background text-muted-foreground focus:ring-1 focus:ring-primary outline-hidden"
                        placeholder="Notes..."
                      />
                    </td>

                    {/* Row Actions */}
                    <td className="p-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDuplicateEntry(idx)}
                          className="p-1.5 rounded text-muted-foreground hover:text-sky-600 hover:bg-sky-500/10 transition-colors cursor-pointer"
                          title="Duplicate row for next roll cut"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(idx)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-muted-foreground">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="p-3 bg-muted rounded-full w-fit mx-auto text-muted-foreground">
                        <Scissors className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium">No roll cutting entries for this shift</p>
                      <p className="text-xs">
                        Click <strong>&quot;Auto-fill from 2-Hr Sheet&quot;</strong> to automatically pull running looms with production, or click <strong>&quot;Add Roll Row&quot;</strong> to enter roll details manually.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={handleAutoFillFromSheet}
                          disabled={autoFilling}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Auto-fill from 2-Hr Sheet
                        </button>
                        <button
                          onClick={handleAddEntry}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add First Row
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="bg-muted font-bold border-t-2 text-foreground">
                  <td className="p-2.5 text-center border-r font-bold">TOTAL</td>
                  <td className="p-2.5 border-r font-mono">{entries.length} Rolls</td>
                  <td className="p-2.5 border-r text-center font-mono">{kpis.activeLoomsCount} Looms</td>
                  <td className="p-2.5 border-r"></td>
                  <td className="p-2.5 border-r"></td>
                  <td className="p-2.5 border-r"></td>
                  <td className="p-2.5 border-r"></td>
                  <td className="p-2.5 border-r text-right font-mono font-bold">{kpis.totalMeters.toLocaleString()}</td>
                  <td className="p-2.5 border-r text-right font-mono">{kpis.totalGrossWtKg.toFixed(2)}</td>
                  <td className="p-2.5 border-r text-right font-mono text-muted-foreground">{kpis.totalTareWtKg.toFixed(2)}</td>
                  <td className="p-2.5 border-r text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{kpis.totalNettWtKg.toFixed(2)}</td>
                  <td className="p-2.5 border-r text-right font-mono text-purple-600 dark:text-purple-400">{kpis.averageWeightPerMeter.toFixed(1)}</td>
                  <td className="p-2.5 border-r"></td>
                  <td className="p-2.5 border-r"></td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={handleAddEntry}
                      className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                      title="Add another row"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Print Preview Modal */}
      <LoomRollCuttingPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        report={reportDataForPrint}
        entries={entries}
        kpis={kpis}
      />
    </div>
  );
}
