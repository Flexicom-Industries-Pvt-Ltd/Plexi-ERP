"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LaminationProductionReportData,
  LaminationProductionEntryData,
  AvailableLaminationRoll,
  calculateLaminationEntry,
  computeLaminationReportTotals,
} from "@/lib/lamination/lamination-types";
import dynamic from "next/dynamic";
import { UniversalRollSelector } from "./UniversalRollSelector";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";
import { UniversalPersonnelInput } from "@/components/ui/UniversalPersonnelInput";

const LaminationReportPrintModal = dynamic(
  () => import("./LaminationReportPrintModal").then((m) => m.LaminationReportPrintModal),
  { ssr: false }
);
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { UniversalShiftSelector } from "@/components/production/UniversalShiftSelector";

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

  // Available Rolls from Circular Loom Roll Stock
  const [availableRolls, setAvailableRolls] = useState<AvailableLaminationRoll[]>([]);
  const [rollsLoading, setRollsLoading] = useState(false);

  // Modals & Viewport
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mobile accordion state
  const [expandedRolls, setExpandedRolls] = useState<Set<number>>(new Set());

  const toggleExpandRoll = (idx: number) => {
    setExpandedRolls((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const expandAllRolls = () => {
    setExpandedRolls(new Set(entries.map((_, i) => i)));
  };

  const collapseAllRolls = () => {
    setExpandedRolls(new Set());
  };

  // Fetch available rolls from Circular Loom Roll Stock
  const fetchAvailableRolls = useCallback(async () => {
    setRollsLoading(true);
    try {
      const res = await fetch("/api/production/lamination/available-rolls");
      const json = await res.json();
      if (json.success && Array.isArray(json.rolls)) {
        setAvailableRolls(json.rolls);
      }
    } catch (err) {
      console.error("Failed to load available rolls:", err);
    } finally {
      setRollsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableRolls();
  }, [fetchAvailableRolls]);

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
        rollNumber: "",
        quality: prev.length > 0 ? prev[prev.length - 1].quality : "",
        size: "500",
        loomNumber: 0,
        rollMeter: 0,
        netWeightBefore: 0,
        avgWeightBefore: 0,
        productionMeter: 0,
        netWeightAfter: 0,
        avgWeightAfter: 0,
        coating: 0,
        remarks: "",
      }),
    ]);
  };

  // Handle Roll ID selection and auto-populate upstream specs
  const handleRollSelect = (
    index: number,
    rollNumber: string,
    selectedRoll?: AvailableLaminationRoll
  ) => {
    setEntries((prev) => {
      const next = [...prev];
      if (selectedRoll) {
        next[index] = calculateLaminationEntry({
          ...next[index],
          rollNumber: selectedRoll.rollNumber,
          loomRollCuttingEntryId: selectedRoll.id,
          quality: selectedRoll.qualityType || next[index].quality,
          size: selectedRoll.size || next[index].size || "500",
          loomNumber: selectedRoll.loomNumber || next[index].loomNumber,
          rollMeter: selectedRoll.meter,
          netWeightBefore: selectedRoll.nettWeightKg,
          avgWeightBefore:
            selectedRoll.avgWeightPerMeter ||
            (selectedRoll.meter > 0
              ? Math.round(((selectedRoll.nettWeightKg * 1000) / selectedRoll.meter) * 10) / 10
              : 0),
        });
        toast.success(
          `Bound ${selectedRoll.rollNumber} specs (${selectedRoll.qualityType}, Loom #${selectedRoll.loomNumber})`
        );
      } else {
        next[index] = calculateLaminationEntry({
          ...next[index],
          rollNumber,
        });
      }
      return next;
    });
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
      {/* =========================================================================
          DESKTOP VIEW (100% Preserved - 0 Regression)
          ========================================================================= */}
      <div className="hidden md:block space-y-5">
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
            <UniversalShiftSelector
              value={shiftName}
              onChange={(val) => setShiftName(val)}
              mode="byName"
              label="Shift"
            />
          </div>

          {/* Operator Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Operator Name
            </label>
            <UniversalPersonnelInput
              type="operator"
              section="LAMINATION"
              value={operatorName}
              onChange={(name) => setOperatorName(name)}
              placeholder="e.g. Ramesh Kumar"
              inputClassName="h-9"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Floor Supervisor
            </label>
            <UniversalPersonnelInput
              type="supervisor"
              value={supervisorName}
              onChange={(name) => setSupervisorName(name)}
              placeholder="e.g. S.K. Sharma"
              inputClassName="h-9"
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
              onClick={handleAddManualRow}
              className="h-8.5 text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Blank Row</span>
            </Button>
          </div>

          <div className="text-xs text-slate-500">
            {entries.length} row(s) listed • Selecting a Roll ID auto-populates specs • Output values auto-calculate in real time
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
                Click &ldquo;+ Add Blank Row&rdquo; to select an authoritative Roll ID from Circular Loom stock and begin logging.
              </p>
              <Button
                size="sm"
                onClick={handleAddManualRow}
                className="h-8.5 text-xs bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Blank Row
              </Button>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-100 text-slate-700 font-semibold">
                  <th className="py-2.5 px-2 text-center w-10">S.No.</th>
                  <th className="py-2.5 px-3 min-w-[210px]">Roll ID (Stock)</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Quality</th>
                  <th className="py-2.5 px-2 text-center w-16">Width</th>
                  <th className="py-2.5 px-2 text-center w-16">Loom #</th>
                  <th className="py-2.5 px-2.5 text-right w-24">Roll Mtr. (In)</th>
                  <th className="py-2.5 px-2.5 text-right w-24">Net Wt. (In)</th>
                  <th className="py-2.5 px-2.5 text-right w-24 bg-slate-50">Avg Wt. (In)</th>
                  <th className="py-2.5 px-2.5 text-right w-28 bg-sky-50 text-sky-800">
                    Production (M) *
                  </th>
                  <th className="py-2.5 px-2.5 text-right w-28 bg-sky-50 text-sky-800">
                    Net Wt. (Kg) *
                  </th>
                  <th className="py-2.5 px-2.5 text-right w-24 bg-sky-100/60 text-sky-900 font-bold">
                    Avg (Out)
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

                      {/* Column 2: Roll ID Dropdown / Autocomplete */}
                      <td className="py-2 px-2.5 min-w-[210px]">
                        <UniversalRollSelector
                          value={entry.rollNumber}
                          availableRolls={availableRolls}
                          alreadySelectedRollNumbers={entries
                            .map((e, i) => (i !== index ? e.rollNumber : ""))
                            .filter(Boolean)}
                          onChange={(rollNo, selectedRoll) =>
                            handleRollSelect(index, rollNo, selectedRoll)
                          }
                        />
                      </td>

                      {/* Column 3: Quality (Auto-populated from Roll ID) */}
                      <td className="py-2 px-2.5 min-w-[180px]">
                        <UniversalQualityInput
                          value={entry.quality}
                          onChange={(val) => handleUpdateEntry(index, "quality", val)}
                          options={allQualities}
                          placeholder="— Quality —"
                          compact={true}
                          inputClassName="h-8 font-semibold text-slate-900"
                        />
                      </td>

                      {/* Column 4: Width / Size (Auto-populated) */}
                      <td className="py-2 px-2">
                        <Input
                          value={entry.size || ""}
                          onChange={(e) => handleUpdateEntry(index, "size", e.target.value)}
                          className="h-8 text-xs text-center text-slate-700 bg-transparent border-slate-200 focus:bg-white"
                          placeholder="500"
                        />
                      </td>

                      {/* Column 5: Loom Number (Auto-populated) */}
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          value={entry.loomNumber || ""}
                          onChange={(e) =>
                            handleUpdateEntry(index, "loomNumber", Number(e.target.value) || 0)
                          }
                          className="h-8 text-xs text-center font-bold text-sky-700 bg-transparent border-slate-200 focus:bg-white"
                          placeholder="88"
                        />
                      </td>

                      {/* Column 6: Roll Meter (Before) (Auto-populated) */}
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

                      {/* Column 7: Net Wt Before (Auto-populated) */}
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

                      {/* Column 8: Avg Wt Before (Auto-calculated) */}
                      <td className="py-2 px-2.5 text-right font-medium text-slate-600 bg-slate-50/70">
                        {entry.avgWeightBefore > 0 ? entry.avgWeightBefore.toFixed(1) : "—"}
                      </td>

                      {/* Column 9: Production Meter (Laminated Output) */}
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

                      {/* Column 10: Net Wt After (Laminated Output) */}
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

                      {/* Column 11: Avg Wt After (Auto-Calculated in Light Blue) */}
                      <td className="py-2 px-2.5 text-right font-bold text-sky-700 bg-sky-50/90 border-x border-sky-100">
                        {entry.avgWeightAfter > 0 ? entry.avgWeightAfter.toFixed(1) : "—"}
                      </td>

                      {/* Column 12: Coating g/m (Auto-Calculated in Light Green) */}
                      <td className="py-2 px-2.5 text-right font-bold text-emerald-700 bg-emerald-50/70 border-r border-emerald-100">
                        {entry.coating !== 0 ? entry.coating.toFixed(1) : "—"}
                      </td>

                      {/* Column 13: Remarks */}
                      <td className="py-2 px-3">
                        <Input
                          value={entry.remarks || ""}
                          onChange={(e) => handleUpdateEntry(index, "remarks", e.target.value)}
                          className="h-8 text-xs bg-transparent border-slate-200 focus:bg-white"
                          placeholder="Notes"
                        />
                      </td>

                      {/* Column 14: Delete */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
      </div>

      {/* =========================================================================
          MOBILE VIEW (Touch-First App Experience)
          ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {/* Mobile Header Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/90 shadow-2xs shrink-0">
                <Film className="h-5 w-5 text-sky-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
                    Lamination Report
                  </h1>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : status === "SUBMITTED"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {status}
                  </Badge>
                </div>
                <p className="text-[11px] font-mono text-slate-400 font-medium truncate">
                  {date} • {shiftName}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLaminationReportExcel(reportDataForPrint)}
                disabled={entries.length === 0}
                className="p-2 h-8 w-8 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 shadow-2xs transition-all cursor-pointer"
                title="Export Excel"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPrintModalOpen(true)}
                disabled={entries.length === 0}
                className="p-2 h-8 w-8 text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 shadow-2xs transition-all cursor-pointer"
                title="Print Report"
              >
                <Printer className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                onClick={() => handleSaveReport("SUBMITTED")}
                disabled={saving || entries.length === 0}
                className="h-8 px-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span>Submit</span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Shift & Personnel Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5 text-slate-400" />
                <span>Date:</span>
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 text-xs font-mono bg-slate-50 border-slate-200"
              />
            </div>
            <div>
              <UniversalShiftSelector
                value={shiftName}
                onChange={(val) => setShiftName(val)}
                mode="byName"
                label="Shift"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">
                Operator
              </label>
              <UniversalPersonnelInput
                type="operator"
                section="LAMINATION"
                value={operatorName}
                onChange={(name) => setOperatorName(name)}
                placeholder="Operator"
                inputClassName="h-7 text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">
                Supervisor
              </label>
              <UniversalPersonnelInput
                type="supervisor"
                value={supervisorName}
                onChange={(name) => setSupervisorName(name)}
                placeholder="Supervisor"
                inputClassName="h-7 text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">
                Helpers
              </label>
              <Input
                type="number"
                min="0"
                placeholder="3"
                value={helperCount || ""}
                onChange={(e) => setHelperCount(Number(e.target.value) || 0)}
                className="h-7 text-xs bg-slate-50 border-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Mobile 2x2 Bento KPI Cards */}
        <div className="grid grid-cols-2 gap-2">
          {/* Card 1: Production (Out) */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between text-sky-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Production</span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">{entries.length} Rolls</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono text-sky-700">
                {totals.totalProductionMtrs.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-sky-600">m</span>
            </div>
          </div>

          {/* Card 2: Net Weight (Out) */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between text-emerald-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Nett Weight</span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">{totals.totalNetWtBefore.toFixed(0)} In</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono text-emerald-700">
                {totals.totalNetWtAfter.toFixed(1)}
              </span>
              <span className="text-[10px] font-bold text-emerald-600">kg</span>
            </div>
          </div>

          {/* Card 3: Avg Coating */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Avg Coating</span>
              <span className="text-[10px] font-bold text-slate-400">g/m</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono text-emerald-800">
                {totals.avgCoating.toFixed(1)}
              </span>
              <span className="text-[10px] font-bold text-emerald-700">g/m</span>
            </div>
          </div>

          {/* Card 4: Avg Wt After */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <div className="flex items-center justify-between text-purple-500 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Avg Wt Out</span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">{totals.avgWtBefore.toFixed(1)} In</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-mono text-purple-900">
                {totals.avgWtAfter.toFixed(1)}
              </span>
              <span className="text-[10px] font-bold text-purple-700">g/m</span>
            </div>
          </div>
        </div>

        {/* Entries Header Toolbar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800">Roll Entries</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold font-mono text-slate-600">
              {entries.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-bold text-sky-600">
                <button type="button" onClick={expandAllRolls} className="hover:underline cursor-pointer">
                  Expand All
                </button>
                <span>•</span>
                <button type="button" onClick={collapseAllRolls} className="hover:underline cursor-pointer">
                  Collapse All
                </button>
              </div>
            )}
            <Button
              size="sm"
              onClick={handleAddManualRow}
              data-testid="mobile-add-row"
              className="h-7 px-2.5 text-[11px] bg-sky-600 hover:bg-sky-700 text-white shadow-2xs rounded-lg cursor-pointer"
            >
              <Plus className="h-3 w-3 mr-1" />
              <span>Add Roll</span>
            </Button>
          </div>
        </div>

        {/* Mobile Roll Entries Cards Feed */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2 shadow-2xs">
              <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
              <span>Loading report entries...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2 shadow-2xs">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Layers className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">No Production Entries Yet</p>
              <p className="text-[11px] text-slate-400">
                Tap &ldquo;Add Roll&rdquo; above to select a roll from Circular Loom stock.
              </p>
              <Button
                size="sm"
                onClick={handleAddManualRow}
                className="mt-1 h-8 text-xs bg-sky-600 text-white cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Blank Row
              </Button>
            </div>
          ) : (
            entries.map((entry, index) => {
              const isExpanded = expandedRolls.has(index);

              return (
                <div
                  key={entry.id || `mobile-entry-${index}`}
                  className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden transition-all"
                >
                  {/* Collapsed Card Header */}
                  <div
                    onClick={() => toggleExpandRoll(index)}
                    className="p-3 cursor-pointer flex items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 text-xs font-mono font-bold rounded-md bg-slate-900 text-white shrink-0">
                        #{entry.sequence}
                      </span>
                      <span className="px-1.5 py-0.5 text-xs font-mono font-bold rounded-md bg-slate-100 text-slate-800 border border-slate-200 truncate shrink-0">
                        {entry.rollNumber || "Select Roll"}
                      </span>
                      {entry.loomNumber > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-md bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                          Loom #{entry.loomNumber}
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-slate-700 truncate">
                        {entry.quality || "No Quality"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-sky-700">
                          {entry.productionMeter > 0 ? `${entry.productionMeter} m` : "0 m"}
                        </div>
                        {entry.coating !== 0 && (
                          <div className="text-[9px] font-mono font-bold text-emerald-700">
                            {entry.coating.toFixed(1)} g/m
                          </div>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Card Body */}
                  {isExpanded && (
                    <div className="p-3 pt-0 border-t border-slate-100 space-y-2.5 bg-slate-50/30">
                      {/* Roll Selector & Quality */}
                      <div className="pt-2 space-y-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Roll ID (Circular Loom Stock)
                          </label>
                          <UniversalRollSelector
                            value={entry.rollNumber}
                            availableRolls={availableRolls}
                            alreadySelectedRollNumbers={entries
                              .map((e, i) => (i !== index ? e.rollNumber : ""))
                              .filter(Boolean)}
                            onChange={(rollNo, selectedRoll) =>
                              handleRollSelect(index, rollNo, selectedRoll)
                            }
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Quality
                            </label>
                            <UniversalQualityInput
                              value={entry.quality}
                              onChange={(val) => handleUpdateEntry(index, "quality", val)}
                              options={allQualities}
                              placeholder="Quality"
                              compact={true}
                              inputClassName="h-8 text-xs font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Width (mm)
                            </label>
                            <Input
                              type="text"
                              value={entry.size}
                              onChange={(e) => handleUpdateEntry(index, "size", e.target.value)}
                              className="h-8 text-xs font-mono bg-white"
                              placeholder="500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fabric In Stats (3-col) */}
                      <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          1. Raw Fabric Input (Loom Stock)
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 bg-white p-2 rounded-xl border border-slate-200/80 text-center">
                          <div>
                            <span className="block text-[9px] font-bold uppercase text-slate-400">Roll Mtr</span>
                            <span className="text-xs font-mono font-bold text-slate-800">
                              {entry.rollMeter > 0 ? `${entry.rollMeter} m` : "—"}
                            </span>
                          </div>
                          <div className="border-x border-slate-100">
                            <span className="block text-[9px] font-bold uppercase text-slate-400">Net Wt In</span>
                            <span className="text-xs font-mono font-bold text-slate-800">
                              {entry.netWeightBefore > 0 ? `${entry.netWeightBefore} kg` : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="block text-[9px] font-bold uppercase text-slate-400">Avg Wt In</span>
                            <span className="text-xs font-mono font-bold text-slate-600">
                              {entry.avgWeightBefore > 0 ? `${entry.avgWeightBefore.toFixed(1)} g/m` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Laminated Output Inputs (3-col) */}
                      <div>
                        <span className="block text-[10px] font-bold text-sky-800 uppercase tracking-wider mb-1">
                          2. Laminated Output (Floor Measurements) *
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 bg-sky-50/50 p-2 rounded-xl border border-sky-200">
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-sky-800 mb-0.5">Prod (M) *</label>
                            <Input
                              type="number"
                              step="any"
                              value={entry.productionMeter || ""}
                              onChange={(e) =>
                                handleUpdateEntry(index, "productionMeter", Number(e.target.value) || 0)
                              }
                              className="h-7 text-xs text-right font-bold text-sky-900 bg-white border-sky-300"
                              placeholder="Meters"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-sky-800 mb-0.5">Net Wt *</label>
                            <Input
                              type="number"
                              step="any"
                              value={entry.netWeightAfter || ""}
                              onChange={(e) =>
                                handleUpdateEntry(index, "netWeightAfter", Number(e.target.value) || 0)
                              }
                              className="h-7 text-xs text-right font-bold text-sky-900 bg-white border-sky-300"
                              placeholder="Kg"
                            />
                          </div>
                          <div className="text-center pt-0.5">
                            <span className="block text-[9px] font-bold uppercase text-sky-800">Avg Out</span>
                            <span className="text-xs font-mono font-black text-sky-900 block mt-1">
                              {entry.avgWeightAfter > 0 ? `${entry.avgWeightAfter.toFixed(1)}` : "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Coating Badge Banner */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                        <span className="text-xs font-bold">Coating Result:</span>
                        <span className="text-xs font-mono font-black">
                          {entry.coating !== 0 ? `${entry.coating.toFixed(1)} g/m` : "—"}
                        </span>
                      </div>

                      {/* Remarks & Delete */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <Input
                          value={entry.remarks || ""}
                          onChange={(e) => handleUpdateEntry(index, "remarks", e.target.value)}
                          className="h-7 text-xs bg-white border-slate-200 flex-1"
                          placeholder="Remarks / notes..."
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(index)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Mobile Bottom Action Bar */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            onClick={handleAddManualRow}
            variant="outline"
            className="w-full h-10 rounded-xl border border-dashed border-sky-300 bg-sky-50/70 hover:bg-sky-100 text-sky-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Another Roll Entry</span>
          </Button>

          <Button
            type="button"
            onClick={() => handleSaveReport("SUBMITTED")}
            disabled={saving || entries.length === 0}
            className="w-full h-10 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>Submit Final Lamination Report</span>
          </Button>
        </div>
      </div>

      {/* Print Preview Modal */}
      <LaminationReportPrintModal
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        data={reportDataForPrint}
      />
    </div>
  );
}
