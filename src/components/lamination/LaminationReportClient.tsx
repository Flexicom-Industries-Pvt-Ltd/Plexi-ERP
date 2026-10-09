"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LaminationProductionReportData,
  LaminationProductionEntryData,
  AvailableLaminationRoll,
  calculateLaminationEntry,
  computeLaminationReportTotals,
} from "@/lib/lamination/lamination-types";
import { RollStockPickerModal } from "./RollStockPickerModal";
import { LaminationReportPrintModal } from "./LaminationReportPrintModal";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";
import { exportLaminationReportExcel } from "@/lib/lamination/lamination-report-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Printer,
  FileSpreadsheet,
  Save,
  Plus,
  Trash2,
  Layers,
  Calendar,
  Clock,
  User,
  Users,
  CheckCircle2,
  Loader2,
  Sparkles,
  Film,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";

const SHIFTS = [
  "Night Shift",
  "Day Shift",
  "Shift A",
  "Shift B",
  "Shift C",
];

export function LaminationReportClient() {
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [date, setDate] = useState<string>(todayStr);
  const [shiftName, setShiftName] = useState<string>("Night Shift");
  const [operatorName, setOperatorName] = useState<string>("");
  const [helperCount, setHelperCount] = useState<number>(3);
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");
  const [reportId, setReportId] = useState<string | undefined>(undefined);

  const [entries, setEntries] = useState<LaminationProductionEntryData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Modals
  const [rollPickerOpen, setRollPickerOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Fetch report for Date and Shift
  const fetchReport = useCallback(async (targetDate: string, targetShift: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/production/lamination/reports?date=${targetDate}&shiftName=${encodeURIComponent(targetShift)}`
      );
      const json = await res.json();
      if (json.success && json.report) {
        const r = json.report;
        setReportId(r.id);
        setOperatorName(r.operatorName || "");
        setHelperCount(r.helperCount ?? 3);
        setSupervisorName(r.supervisorName || "");
        setStatus(r.status || "DRAFT");
        setRemarks(r.remarks || "");
        setEntries(
          (r.entries || []).map((e: any, idx: number) =>
            calculateLaminationEntry({ ...e, sequence: idx + 1 })
          )
        );
      } else {
        // Reset to empty draft
        setReportId(undefined);
        setStatus("DRAFT");
        setEntries([]);
      }
    } catch (err) {
      console.error("Failed to load report:", err);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, []);

  const [availableQualities, setAvailableQualities] = useState<string[]>([]);

  // Fetch available distinct qualities across roll cutting, recipes, and past records
  const fetchQualities = useCallback(async () => {
    try {
      const res = await fetch("/api/production/lamination/qualities");
      const json = await res.json();
      if (json.success && Array.isArray(json.qualities)) {
        setAvailableQualities(json.qualities);
      }
    } catch (err) {
      console.error("Failed to load qualities:", err);
    }
  }, []);

  useEffect(() => {
    fetchQualities();
  }, [fetchQualities]);

  useEffect(() => {
    if (date && shiftName) {
      fetchReport(date, shiftName);
    }
  }, [date, shiftName, fetchReport]);

  // Combined set of master qualities + any dynamically entered in active sheet
  const allQualities = useMemo(() => {
    const set = new Set<string>(availableQualities);
    entries.forEach((e) => {
      if (e.quality && e.quality.trim()) {
        set.add(e.quality.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableQualities, entries]);

  // Derived column totals
  const totals = useMemo(() => computeLaminationReportTotals(entries), [entries]);

  // Handle entry cell changes
  const handleUpdateEntry = (index: number, field: keyof LaminationProductionEntryData, value: any) => {
    setEntries((prev) => {
      const next = [...prev];
      const updated = {
        ...next[index],
        [field]: value,
      };
      next[index] = calculateLaminationEntry(updated);
      return next;
    });
  };

  // Remove row
  const handleDeleteRow = (index: number) => {
    setEntries((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((e, idx) => ({ ...e, sequence: idx + 1 }));
    });
  };

  // Add blank manual row
  const handleAddManualRow = () => {
    setEntries((prev) => [
      ...prev,
      calculateLaminationEntry({
        sequence: prev.length + 1,
        quality: prev.length > 0 ? prev[prev.length - 1].quality : "NUVOCO SI",
        size: "500",
        loomNumber: 0,
        rollNumber: "",
        rollMeter: 0,
        netWeightBefore: 0,
        productionMeter: 0,
        netWeightAfter: 0,
      }),
    ]);
  };

  // Add rolls imported from Roll Stock
  const handleImportRolls = (selectedRolls: AvailableLaminationRoll[]) => {
    const newEntries: LaminationProductionEntryData[] = selectedRolls.map((r, idx) =>
      calculateLaminationEntry({
        sequence: entries.length + idx + 1,
        quality: r.qualityType,
        size: r.size || "500",
        loomNumber: r.loomNumber,
        rollNumber: r.rollNumber,
        rollMeter: r.meter,
        netWeightBefore: r.nettWeightKg,
        productionMeter: 0,
        netWeightAfter: 0,
        loomRollCuttingEntryId: r.id,
      })
    );

    setEntries((prev) => [...prev, ...newEntries]);
    toast.success(`Imported ${newEntries.length} rolls from Roll Stock`);
  };

  // Save report
  const handleSaveReport = async (newStatus: "DRAFT" | "SUBMITTED" = "DRAFT") => {
    if (!date || !shiftName) {
      toast.error("Please select Date and Shift");
      return;
    }

    if (entries.length === 0) {
      toast.error("Please add at least one production entry before saving");
      return;
    }

    setSaving(true);
    try {
      const payload: LaminationProductionReportData = {
        id: reportId,
        date,
        shiftName,
        operatorName,
        helperCount: Number(helperCount) || 0,
        supervisorName,
        status: newStatus,
        remarks,
        totalRollMtrs: totals.totalRollMtrs,
        totalNetWtBefore: totals.totalNetWtBefore,
        avgWtBefore: totals.avgWtBefore,
        totalProductionMtrs: totals.totalProductionMtrs,
        totalNetWtAfter: totals.totalNetWtAfter,
        avgWtAfter: totals.avgWtAfter,
        avgCoating: totals.avgCoating,
        entries,
      };

      const res = await fetch("/api/production/lamination/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save report");
      }

      setReportId(json.report.id);
      setStatus(newStatus);
      toast.success(
        newStatus === "SUBMITTED"
          ? "Lamination Production Report submitted successfully!"
          : "Report saved as draft"
      );
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const reportDataForPrint: LaminationProductionReportData = useMemo(
    () => ({
      id: reportId,
      date,
      shiftName,
      operatorName,
      helperCount,
      supervisorName,
      status,
      remarks,
      totalRollMtrs: totals.totalRollMtrs,
      totalNetWtBefore: totals.totalNetWtBefore,
      avgWtBefore: totals.avgWtBefore,
      totalProductionMtrs: totals.totalProductionMtrs,
      totalNetWtAfter: totals.totalNetWtAfter,
      avgWtAfter: totals.avgWtAfter,
      avgCoating: totals.avgCoating,
      entries,
    }),
    [
      reportId,
      date,
      shiftName,
      operatorName,
      helperCount,
      supervisorName,
      status,
      remarks,
      totals,
      entries,
    ]
  );

  return (
    <div className="space-y-5 font-sans pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                Lamination Product Report
                <Badge
                  variant="outline"
                  className={
                    status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : status === "SUBMITTED"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {status}
                </Badge>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Physical floor log entry with roll stock consumption, coating calculations, and real-time validation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportLaminationReportExcel(reportDataForPrint)}
            disabled={entries.length === 0}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            Excel Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintModalOpen(true)}
            disabled={entries.length === 0}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4 mr-1.5 text-sky-600" />
            Print Report
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveReport("DRAFT")}
            disabled={saving}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleSaveReport("SUBMITTED")}
            disabled={saving || entries.length === 0}
            className="h-9 text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
            )}
            Submit Report
          </Button>
        </div>
      </div>

      {/* Shift & Header Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Report Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Shift */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Shift
            </label>
            <Select value={shiftName} onValueChange={(val) => { if (val) setShiftName(val); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Shift" />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Operator Name
            </label>
            <Input
              placeholder="e.g. Ramesh Kumar"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Helper Count */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              No. of Helpers
            </label>
            <Input
              type="number"
              min="0"
              placeholder="03"
              value={helperCount || ""}
              onChange={(e) => setHelperCount(Number(e.target.value) || 0)}
              className="h-9 text-xs"
            />
          </div>

          {/* Supervisor Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Floor Supervisor
            </label>
            <Input
              placeholder="e.g. S.K. Sharma"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 min-w-0">
        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Rolls</div>
          <div className="text-lg font-bold text-slate-800">{entries.length}</div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Roll Mtr (In)</div>
          <div className="text-lg font-bold text-slate-800">
            {totals.totalRollMtrs.toLocaleString()} m
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Net Wt (In)</div>
          <div className="text-lg font-bold text-slate-800">
            {totals.totalNetWtBefore.toFixed(1)} kg
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500 uppercase">Avg Wt (In)</div>
          <div className="text-lg font-bold text-slate-700">
            {totals.avgWtBefore.toFixed(1)} g/m
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-sky-200 bg-sky-50/30 shadow-2xs">
          <div className="text-[11px] font-medium text-sky-700 uppercase">Production</div>
          <div className="text-lg font-bold text-sky-700">
            {totals.totalProductionMtrs.toLocaleString()} m
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-sky-200 bg-sky-50/30 shadow-2xs">
          <div className="text-[11px] font-medium text-sky-700 uppercase">Net Wt (Out)</div>
          <div className="text-lg font-bold text-sky-700">
            {totals.totalNetWtAfter.toFixed(1)} kg
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <div className="text-[11px] font-medium text-emerald-700 uppercase">Avg Coating</div>
          <div className="text-lg font-bold text-emerald-700">
            {totals.avgCoating.toFixed(1)} g/m
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-6 shadow-2xl overflow-hidden"
            : "bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden"
        }
      >
        {/* Table Toolbar */}
        <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2">
            {/* Top-Left Fullscreen Expand / Collapse Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8.5 text-xs border-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer active:scale-95"
              title={isFullscreen ? "Collapse back to normal view (Esc)" : "Expand table to fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-sky-600" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-sky-600" />
                  <span>Expand</span>
                </>
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => setRollPickerOpen(true)}
              className="h-8.5 text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer"
            >
              <Layers className="h-4 w-4 mr-1.5" />
              Import from Roll Stock
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddManualRow}
              className="h-8.5 text-xs border-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Blank Row
            </Button>
          </div>

          <div className="text-xs text-slate-500">
            {entries.length} row(s) listed • Values auto-calculate in real time
          </div>
        </div>

        {/* Data Grid */}
        <div className={isFullscreen ? "overflow-x-auto overflow-y-auto flex-1 border rounded-lg bg-card" : "overflow-x-auto min-h-[380px]"}>
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
              <span className="text-xs">Loading report entries...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Sparkles className="h-8 w-8 mx-auto text-sky-300 mb-2" />
              <div className="font-semibold text-sm text-slate-700">No Production Entries Yet</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Click &ldquo;Import from Roll Stock&rdquo; to load rolls serially by quality, or add a row manually.
              </p>
              <Button
                size="sm"
                onClick={() => setRollPickerOpen(true)}
                className="h-8.5 text-xs bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Layers className="h-4 w-4 mr-1.5" />
                Select Rolls from Roll Stock
              </Button>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-100 text-slate-700 font-semibold">
                  <th className="py-2.5 px-2 text-center w-10">S.No.</th>
                  <th className="py-2.5 px-3 min-w-[170px]">Quality</th>
                  <th className="py-2.5 px-2 text-center w-16">Width</th>
                  <th className="py-2.5 px-2 text-center w-16">Loom #</th>
                  <th className="py-2.5 px-2.5 min-w-[95px]">Roll No.</th>
                  <th className="py-2.5 px-2.5 text-right w-24">Roll Mtr.</th>
                  <th className="py-2.5 px-2.5 text-right w-24">Net Wt. (Kg)</th>
                  <th className="py-2.5 px-2.5 text-right w-24 bg-slate-50">Avg Wt. (g/m)</th>
                  <th className="py-2.5 px-2.5 text-right w-28 bg-sky-50 text-sky-800">
                    Production (M) *
                  </th>
                  <th className="py-2.5 px-2.5 text-right w-28 bg-sky-50 text-sky-800">
                    Net Wt. (Kg) *
                  </th>
                  <th className="py-2.5 px-2.5 text-right w-24 bg-sky-100/60 text-sky-900 font-bold">
                    Avg (g/m)
                  </th>
                  <th className="py-2.5 px-2.5 text-right w-24 bg-emerald-50 text-emerald-900 font-bold">
                    Coating (g/m)
                  </th>
                  <th className="py-2.5 px-3 min-w-[120px]">Remarks</th>
                  <th className="py-2.5 px-2 text-center w-10">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry, index) => {
                  return (
                    <tr
                      key={entry.id || `entry-${index}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* S.No */}
                      <td className="py-2 px-2 text-center font-medium text-slate-500">
                        {entry.sequence}
                      </td>

                      {/* Quality */}
                      <td className="py-2 px-2.5 min-w-[200px]">
                        <UniversalQualityInput
                          value={entry.quality}
                          onChange={(val) => handleUpdateEntry(index, "quality", val)}
                          options={allQualities}
                          placeholder="— Select / Type Quality —"
                          compact={true}
                          inputClassName="h-8 font-semibold"
                        />
                      </td>

                      {/* Width / Size */}
                      <td className="py-2 px-2">
                        <Input
                          value={entry.size || ""}
                          onChange={(e) => handleUpdateEntry(index, "size", e.target.value)}
                          className="h-8 text-xs text-center text-slate-700 bg-transparent border-slate-200 focus:bg-white"
                          placeholder="500"
                        />
                      </td>

                      {/* Loom Number */}
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={entry.loomNumber || ""}
                          onChange={(e) =>
                            handleUpdateEntry(index, "loomNumber", Number(e.target.value) || 0)
                          }
                          className="h-8 text-xs text-center font-bold text-slate-800 bg-transparent border-slate-200 focus:bg-white"
                          placeholder="88"
                        />
                      </td>

                      {/* Roll Number */}
                      <td className="py-2 px-2.5">
                        <Input
                          value={entry.rollNumber}
                          onChange={(e) => handleUpdateEntry(index, "rollNumber", e.target.value)}
                          className="h-8 text-xs font-mono font-semibold text-slate-900 bg-transparent border-slate-200 focus:bg-white"
                          placeholder="DI13614"
                        />
                      </td>

                      {/* Roll Meter (Before) */}
                      <td className="py-2 px-2.5">
                        <Input
                          type="number"
                          step="any"
                          value={entry.rollMeter || ""}
                          onChange={(e) =>
                            handleUpdateEntry(index, "rollMeter", Number(e.target.value) || 0)
                          }
                          className="h-8 text-xs text-right font-medium text-slate-800 bg-transparent border-slate-200 focus:bg-white"
                          placeholder="6367"
                        />
                      </td>

                      {/* Net Wt Before */}
                      <td className="py-2 px-2.5">
                        <Input
                          type="number"
                          step="any"
                          value={entry.netWeightBefore || ""}
                          onChange={(e) =>
                            handleUpdateEntry(index, "netWeightBefore", Number(e.target.value) || 0)
                          }
                          className="h-8 text-xs text-right font-medium text-slate-800 bg-transparent border-slate-200 focus:bg-white"
                          placeholder="407.4"
                        />
                      </td>

                      {/* Avg Wt Before (Auto) */}
                      <td className="py-2 px-2.5 text-right font-medium text-slate-600 bg-slate-50/70">
                        {entry.avgWeightBefore > 0 ? entry.avgWeightBefore.toFixed(1) : "—"}
                      </td>

                      {/* Production Meter (Laminated) */}
                      <td className="py-2 px-2.5 bg-sky-50/40">
                        <Input
                          type="number"
                          step="any"
                          value={entry.productionMeter || ""}
                          onChange={(e) =>
                            handleUpdateEntry(index, "productionMeter", Number(e.target.value) || 0)
                          }
                          className="h-8 text-xs text-right font-bold text-sky-800 bg-white border-sky-300 focus:ring-1 focus:ring-sky-500"
                          placeholder="6251"
                        />
                      </td>

                      {/* Net Wt After (Laminated) */}
                      <td className="py-2 px-2.5 bg-sky-50/40">
                        <Input
                          type="number"
                          step="any"
                          value={entry.netWeightAfter || ""}
                          onChange={(e) =>
                            handleUpdateEntry(index, "netWeightAfter", Number(e.target.value) || 0)
                          }
                          className="h-8 text-xs text-right font-bold text-sky-800 bg-white border-sky-300 focus:ring-1 focus:ring-sky-500"
                          placeholder="524"
                        />
                      </td>

                      {/* Avg Wt After (Auto-Calculated in Light Blue) */}
                      <td className="py-2 px-2.5 text-right font-bold text-sky-700 bg-sky-50/90 border-x border-sky-100">
                        {entry.avgWeightAfter > 0 ? entry.avgWeightAfter.toFixed(1) : "—"}
                      </td>

                      {/* Coating g/m (Auto-Calculated) */}
                      <td className="py-2 px-2.5 text-right font-bold text-emerald-700 bg-emerald-50/70 border-r border-emerald-100">
                        {entry.coating !== 0 ? entry.coating.toFixed(1) : "—"}
                      </td>

                      {/* Remarks */}
                      <td className="py-2 px-3">
                        <Input
                          value={entry.remarks || ""}
                          onChange={(e) => handleUpdateEntry(index, "remarks", e.target.value)}
                          className="h-8 text-xs bg-transparent border-slate-200 focus:bg-white"
                          placeholder="Notes"
                        />
                      </td>

                      {/* Delete */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Totals Row */}
                <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                  <td colSpan={5} className="py-2.5 px-3 text-right">
                    TOTAL:
                  </td>
                  <td className="py-2.5 px-2.5 text-right">
                    {totals.totalRollMtrs.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2.5 text-right">
                    {totals.totalNetWtBefore.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-slate-700">
                    {totals.avgWtBefore.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-sky-700 bg-sky-100/50">
                    {totals.totalProductionMtrs.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-sky-700 bg-sky-100/50">
                    {totals.totalNetWtAfter.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-sky-900 bg-sky-100">
                    {totals.avgWtAfter.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-emerald-900 bg-emerald-100">
                    {totals.avgCoating.toFixed(1)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      <RollStockPickerModal
        open={rollPickerOpen}
        onOpenChange={setRollPickerOpen}
        onSelectRolls={handleImportRolls}
        alreadyAddedRollNumbers={entries.map((e) => e.rollNumber).filter(Boolean)}
      />

      <LaminationReportPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        data={reportDataForPrint}
      />
    </div>
  );
}
