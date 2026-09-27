import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Calendar,
  Clock,
  Printer,
  FileSpreadsheet,
  Save,
  RotateCcw,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
  Check,
  X,
  Gauge,
  Timer,
  Send,
  CloudCheck,
} from "lucide-react";
import {
  LoomReadingEntryItem,
  computeIntervalDeltas,
  computeLoomEfficiency,
  LOOM_BREAKDOWN_REASONS,
  IntervalKpiSummary,
} from "@/lib/loom/loom-reading-types";
import { exportLoomReadingSheetExcel } from "@/lib/loom/loom-reading-export";
import { printLoomReadingSheet } from "@/lib/loom/print-loom-reading";
import { LoomReadingPrintPreviewModal } from "./LoomReadingPrintPreviewModal";

interface AvailableShift {
  id: string;
  name: string;
}

interface AvailableOperator {
  id: string;
  name: string;
  employeeCode?: string | null;
}

interface AvailableQuality {
  code: string;
  colorGroup?: string | null;
  denier?: number | null;
  reedSpaceCm?: number | null;
}

interface ReadingSheetData {
  sheet: {
    id: string | null;
    date: string;
    shiftName: string;
    shiftId: string | null;
    shiftHours: number;
    timeSlots: string[];
    initialTimeSlot: string;
    preparedBy: string;
    checkedBy: string;
    approvedBy: string;
    totalLoomProductionMeters: number;
    totalLoomProductionKg: number;
    totalWastageKg: number;
    runningLoomsCount: number;
    idleLoomsCount: number;
    averageEfficiency?: number;
    totalBreakdownMins?: number;
    remarks: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
  };
  entries: LoomReadingEntryItem[];
  allEntriesCount: number;
  kpis: {
    totalLooms: number;
    runningLoomsCount: number;
    idleLoomsCount: number;
    totalShiftMeters: number;
    totalShiftKg: number;
    totalWastageKg: number;
    averageEfficiency?: number;
    totalBreakdownMins?: number;
    intervalTotals: IntervalKpiSummary[];
  };
  availableShifts: AvailableShift[];
  availableOperators: AvailableOperator[];
  availableQualities: AvailableQuality[];
}

export function LoomReadingSheetSection() {
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedShift, setSelectedShift] = useState<string>("Day Shift");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [autoSaving, setAutoSaving] = useState<boolean>(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const lastSavedPayloadRef = useRef<string>("");
  const isInitialMountRef = useRef<boolean>(true);

  const [data, setData] = useState<ReadingSheetData | null>(null);
  const [entries, setEntries] = useState<LoomReadingEntryItem[]>([]);
  const [preparedBy, setPreparedBy] = useState<string>("");
  const [checkedBy, setCheckedBy] = useState<string>("");
  const [approvedBy, setApprovedBy] = useState<string>("");
  const [totalWastageKg, setTotalWastageKg] = useState<string>("0");
  const [sheetRemarks, setSheetRemarks] = useState<string>("");
  const [sheetStatus, setSheetStatus] = useState<string>("DRAFT");

  // Filters & Search - Default to active looms as requested
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [bulkModalOpen, setBulkModalOpen] = useState<boolean>(false);
  const [bulkStartLoom, setBulkStartLoom] = useState<string>("31");
  const [bulkEndLoom, setBulkEndLoom] = useState<string>("34");
  const [bulkOperator, setBulkOperator] = useState<string>("");
  const [bulkQuality, setBulkQuality] = useState<string>("");
  const [bulkSize, setBulkSize] = useState<string>("");
  const [bulkDenier, setBulkDenier] = useState<string>("");

  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch sheet data from server
  const fetchSheetData = useCallback(async (date: string, shift: string) => {
    setLoading(true);
    isInitialMountRef.current = true;
    try {
      const params = new URLSearchParams({
        date,
        shiftName: shift,
      });
      const res = await fetch(`/api/production/loom/reading-sheet?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch loom reading sheet");
      const json: ReadingSheetData = await res.json();
      setData(json);

      const computedEntries = (json.entries || []).map((entry) => {
        const { r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod, totalProduction } = computeIntervalDeltas(entry);
        const bdMinutes = Number(entry.breakdownMinutes) || 0;
        const eff = computeLoomEfficiency(
          totalProduction,
          entry.qualityType,
          bdMinutes,
          json.sheet?.shiftHours || 12
        );
        return {
          ...entry,
          r1Prod,
          r2Prod,
          r3Prod,
          r4Prod,
          r5Prod,
          r6Prod,
          totalProduction,
          efficiencyPct: eff.efficiencyPct,
        };
      });

      setEntries(computedEntries);
      setPreparedBy(json.sheet?.preparedBy || "");
      setCheckedBy(json.sheet?.checkedBy || "");
      setApprovedBy(json.sheet?.approvedBy || "");
      setTotalWastageKg(String(json.sheet?.totalWastageKg || 0));
      setSheetRemarks(json.sheet?.remarks || "");
      setSheetStatus(json.sheet?.status || "DRAFT");

      const initialPayload = {
        action: "SAVE_SHEET",
        date,
        shiftName: shift,
        entries: computedEntries,
        preparedBy: json.sheet?.preparedBy || "",
        checkedBy: json.sheet?.checkedBy || "",
        approvedBy: json.sheet?.approvedBy || "",
        totalWastageKg: parseFloat(String(json.sheet?.totalWastageKg || 0)) || 0,
        remarks: json.sheet?.remarks || "",
        status: json.sheet?.status || "DRAFT",
        shiftHours: json.sheet?.shiftHours || 12,
      };
      lastSavedPayloadRef.current = JSON.stringify(initialPayload);
      isInitialMountRef.current = false;
    } catch (err: any) {
      console.error("fetchSheetData error:", err);
      showNotification(err.message || "Failed to load reading sheet", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSheetData(selectedDate, selectedShift);
  }, [selectedDate, selectedShift, fetchSheetData]);

  // Real-time Auto-Save Effect (debounced 1000ms on any change)
  useEffect(() => {
    if (loading || isInitialMountRef.current || !data || entries.length === 0) return;

    const payload = {
      action: "SAVE_SHEET",
      date: selectedDate,
      shiftName: selectedShift,
      entries,
      preparedBy,
      checkedBy,
      approvedBy,
      totalWastageKg: parseFloat(totalWastageKg) || 0,
      remarks: sheetRemarks,
      status: sheetStatus,
      shiftHours: data?.sheet?.shiftHours || 12,
    };

    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedPayloadRef.current) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const res = await fetch("/api/production/loom/reading-sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        });

        if (res.ok) {
          lastSavedPayloadRef.current = serialized;
          setLastAutoSavedAt(new Date());
        }
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setAutoSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    entries,
    selectedDate,
    selectedShift,
    preparedBy,
    checkedBy,
    approvedBy,
    totalWastageKg,
    sheetRemarks,
    sheetStatus,
    loading,
    data,
  ]);

  // Handle live reading and breakdown changes with instant recalculation
  const handleEntryChange = (loomNumber: number, field: keyof LoomReadingEntryItem, value: any) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.loomNumber !== loomNumber) return item;

        const updated: LoomReadingEntryItem = {
          ...item,
          [field]: value,
        };

        // Recalculate deltas if any reading field changed
        if (
          field === "initialReading" ||
          field === "r1Reading" ||
          field === "r2Reading" ||
          field === "r3Reading" ||
          field === "r4Reading" ||
          field === "r5Reading" ||
          field === "r6Reading"
        ) {
          const { r1Prod, r2Prod, r3Prod, r4Prod, r5Prod, r6Prod, totalProduction } = computeIntervalDeltas(updated);
          updated.r1Prod = r1Prod;
          updated.r2Prod = r2Prod;
          updated.r3Prod = r3Prod;
          updated.r4Prod = r4Prod;
          updated.r5Prod = r5Prod;
          updated.r6Prod = r6Prod;
          updated.totalProduction = totalProduction;

          if (totalProduction > 0 && updated.status === "IDLE") {
            updated.status = "RUNNING";
          }
        }

        // Live calculate efficiency whenever meters, quality, or breakdown minutes change
        const bdMinutes = Number(updated.breakdownMinutes) || 0;
        const eff = computeLoomEfficiency(
          updated.totalProduction || 0,
          updated.qualityType,
          bdMinutes,
          data?.sheet?.shiftHours || 12
        );
        updated.efficiencyPct = eff.efficiencyPct;

        return updated;
      })
    );
  };

  // Live Calculated KPIs
  const timeSlots = data?.sheet?.timeSlots || ["10:00", "12:00", "02:00", "04:00", "06:00", "08:00"];
  const initialTimeSlot = data?.sheet?.initialTimeSlot || "08:00";

  const liveTotals = useMemo(() => {
    const totalR1Prod = entries.reduce((s, e) => s + (e.r1Prod || 0), 0);
    const totalR2Prod = entries.reduce((s, e) => s + (e.r2Prod || 0), 0);
    const totalR3Prod = entries.reduce((s, e) => s + (e.r3Prod || 0), 0);
    const totalR4Prod = entries.reduce((s, e) => s + (e.r4Prod || 0), 0);
    const totalR5Prod = entries.reduce((s, e) => s + (e.r5Prod || 0), 0);
    const totalR6Prod = entries.reduce((s, e) => s + (e.r6Prod || 0), 0);
    const totalShiftMeters = entries.reduce((s, e) => s + (e.totalProduction || 0), 0);
    const totalShiftKg = Math.round(totalShiftMeters * 0.16 * 100) / 100;
    const totalBreakdownMins = entries.reduce((s, e) => s + (Number(e.breakdownMinutes) || 0), 0);

    const runningEntries = entries.filter((e) => e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0));
    const runningLooms = runningEntries.length;
    const idleLooms = entries.length - runningLooms;

    const effValues = runningEntries
      .map((e) => e.efficiencyPct || 0)
      .filter((v) => v > 0);
    const averageEfficiency = effValues.length > 0
      ? Math.round((effValues.reduce((a, b) => a + b, 0) / effValues.length) * 10) / 10
      : 0;

    const prog1 = totalR1Prod;
    const prog2 = prog1 + totalR2Prod;
    const prog3 = prog2 + totalR3Prod;
    const prog4 = prog3 + totalR4Prod;
    const prog5 = prog4 + totalR5Prod;
    const prog6 = prog5 + totalR6Prod;

    return {
      totalR1Prod,
      totalR2Prod,
      totalR3Prod,
      totalR4Prod,
      totalR5Prod,
      totalR6Prod,
      totalShiftMeters,
      totalShiftKg,
      totalBreakdownMins,
      averageEfficiency,
      runningLooms,
      idleLooms,
      progressiveTotals: [prog1, prog2, prog3, prog4, prog5, prog6],
    };
  }, [entries]);

  // Filtered entries for table rendering
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterActiveOnly && !(e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0))) {
        return false;
      }
      if (statusFilter !== "ALL" && e.status !== statusFilter) {
        return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const match =
          `#${e.loomNumber}`.includes(term) ||
          String(e.loomNumber).includes(term) ||
          (e.operatorName && e.operatorName.toLowerCase().includes(term)) ||
          (e.qualityType && e.qualityType.toLowerCase().includes(term)) ||
          (e.size && e.size.toLowerCase().includes(term)) ||
          (e.denier && e.denier.toLowerCase().includes(term)) ||
          (e.breakdownReason && e.breakdownReason.toLowerCase().includes(term)) ||
          (e.remarks && e.remarks.toLowerCase().includes(term));
        if (!match) return false;
      }
      return true;
    });
  }, [entries, filterActiveOnly, statusFilter, searchTerm]);

  const isFiltered = filterActiveOnly || statusFilter !== "ALL" || Boolean(searchTerm.trim());
  const filterLabel = filterActiveOnly
    ? "Active Running Looms Only"
    : statusFilter !== "ALL"
    ? `Status: ${statusFilter}`
    : searchTerm.trim()
    ? `Search: "${searchTerm.trim()}"`
    : undefined;

  // Save Sheet Handler (Manual Save Draft or Submit Sheet)
  const handleSaveSheet = async (targetStatus: string = sheetStatus) => {
    setSaving(true);
    try {
      const payload = {
        action: "SAVE_SHEET",
        date: selectedDate,
        shiftName: selectedShift,
        entries,
        preparedBy,
        checkedBy,
        approvedBy,
        totalWastageKg: parseFloat(totalWastageKg) || 0,
        remarks: sheetRemarks,
        status: targetStatus,
        shiftHours: data?.sheet?.shiftHours || 12,
      };

      const res = await fetch("/api/production/loom/reading-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save reading sheet");

      setSheetStatus(targetStatus);
      lastSavedPayloadRef.current = JSON.stringify(payload);
      setLastAutoSavedAt(new Date());

      if (targetStatus === "SUBMITTED") {
        showNotification(
          `Sheet submitted successfully: ${liveTotals.totalShiftMeters.toLocaleString()} m across ${liveTotals.runningLooms} running looms (Avg Eff: ${liveTotals.averageEfficiency}%).`
        );
      } else {
        showNotification(
          `Draft saved successfully: ${liveTotals.totalShiftMeters.toLocaleString()} m across ${liveTotals.runningLooms} running looms.`
        );
      }
    } catch (err: any) {
      console.error("handleSaveSheet error:", err);
      showNotification(err.message || "Failed to save sheet", "error");
    } finally {
      setSaving(false);
    }
  };

  // Bulk Operator Assign Handler
  const handleBulkAssign = async () => {
    const start = parseInt(bulkStartLoom, 10);
    const end = parseInt(bulkEndLoom, 10);
    if (isNaN(start) || isNaN(end) || start < 1 || end > 91 || start > end) {
      alert("Please enter a valid loom range between 1 and 91.");
      return;
    }

    try {
      // Local state update
      setEntries((prev) =>
        prev.map((e) => {
          if (e.loomNumber >= start && e.loomNumber <= end) {
            const updated = {
              ...e,
              operatorName: bulkOperator !== "" ? bulkOperator : e.operatorName,
              qualityType: bulkQuality !== "" ? bulkQuality : e.qualityType,
              size: bulkSize !== "" ? bulkSize : e.size,
              denier: bulkDenier !== "" ? bulkDenier : e.denier,
            };
            const eff = computeLoomEfficiency(
              updated.totalProduction || 0,
              updated.qualityType,
              Number(updated.breakdownMinutes) || 0,
              data?.sheet?.shiftHours || 12
            );
            updated.efficiencyPct = eff.efficiencyPct;
            return updated;
          }
          return e;
        })
      );

      setBulkModalOpen(false);
      showNotification(`Assigned operator to looms #${start} to #${end}`);
    } catch (err: any) {
      showNotification(err.message || "Bulk assign failed", "error");
    }
  };

  // Reset Sheet Handler
  const handleResetSheet = async () => {
    try {
      const res = await fetch("/api/production/loom/reading-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESET_SHEET",
          date: selectedDate,
          shiftName: selectedShift,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reset sheet");

      setResetModalOpen(false);
      showNotification("Sheet reset to clean blank state.");
      fetchSheetData(selectedDate, selectedShift);
    } catch (err: any) {
      showNotification(err.message || "Reset failed", "error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === "success"
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                2H
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    2 Hours Reading Sheet
                  </h1>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                      sheetStatus === "SUBMITTED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : sheetStatus === "APPROVED"
                        ? "bg-blue-50 text-blue-700 border-blue-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}
                  >
                    {sheetStatus === "SUBMITTED" ? "✓ Submitted" : sheetStatus === "APPROVED" ? "★ Approved" : "● Draft"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Shop-floor bi-hourly circular loom meter log, progressive interval totals & shift production
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Real-time Auto-Save Status Pill */}
            {autoSaving ? (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200 animate-pulse font-medium shadow-2xs">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span>Auto-saving...</span>
              </div>
            ) : lastAutoSavedAt ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 font-medium shadow-2xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">
                  Auto-saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className="sm:hidden">Auto-saved</span>
              </div>
            ) : null}

            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span>Assign Range</span>
            </button>

            <button
              onClick={() =>
                exportLoomReadingSheetExcel({
                  date: selectedDate,
                  shiftName: selectedShift,
                  preparedBy,
                  checkedBy,
                  approvedBy,
                  timeSlots,
                  initialTimeSlot,
                  entries: filteredEntries,
                  kpis: {
                    totalLooms: 91,
                    runningLoomsCount: liveTotals.runningLooms,
                    idleLoomsCount: liveTotals.idleLooms,
                    totalShiftMeters: liveTotals.totalShiftMeters,
                    totalShiftKg: liveTotals.totalShiftKg,
                    totalWastageKg: parseFloat(totalWastageKg) || 0,
                    averageEfficiency: liveTotals.averageEfficiency,
                    totalBreakdownMins: liveTotals.totalBreakdownMins,
                    intervalTotals: [],
                  },
                  filterActiveOnly: false,
                })
              }
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title={isFiltered ? `Export filtered ${filteredEntries.length} looms to Excel` : "Export 2-hours reading sheet to Excel"}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Excel Export</span>
              {isFiltered && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </button>

            <button
              onClick={() => setPreviewModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title={isFiltered ? `Preview & print filtered ${filteredEntries.length} looms` : "Preview & print A4 sheet"}
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print Preview</span>
              {isFiltered && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </button>

            <button
              onClick={() => setResetModalOpen(true)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all inline-flex items-center gap-1 cursor-pointer"
              title="Reset Sheet to Blank"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => handleSaveSheet("SUBMITTED")}
              disabled={saving || autoSaving}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Submit and finalize this shift reading sheet"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{saving && sheetStatus === "SUBMITTED" ? "Submitting..." : "Submit Sheet"}</span>
            </button>
          </div>
        </div>

        {/* Date, Shift, and Quick Filter Selector Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>Production Date:</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                className="px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all"
              >
                Today
              </button>
            </div>
          </div>

          {/* Shift Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              <span>Shift:</span>
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all"
            >
              {(data?.availableShifts || [
                { id: "shift_day", name: "Day Shift" },
                { id: "shift_night", name: "Night Shift" },
              ]).map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
              <option value="Shift A">Shift A (08:00 - 20:00)</option>
              <option value="Shift B">Shift B (20:00 - 08:00)</option>
              <option value="Shift C">Shift C</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Search className="h-3 w-3 text-slate-400" />
              <span>Search Looms:</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search loom #, operator, quality..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-2.5 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Status & View Toggles */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-slate-400" />
              <span>View Filter:</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterActiveOnly((prev) => !prev)}
                className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer text-center ${
                  filterActiveOnly
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {filterActiveOnly ? "Active Only (Default)" : "All 91 Looms"}
              </button>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all"
              >
                <option value="ALL">All Status</option>
                <option value="RUNNING">Running</option>
                <option value="STOP">Stopped</option>
                <option value="IDLE">Idle</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Live KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Running Looms</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-emerald-700 font-mono">
              {liveTotals.runningLooms}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ 91 Active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Shift Meters</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {liveTotals.totalShiftMeters.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">Meters</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Output Weight (Est.)</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-blue-700 font-mono">
              {liveTotals.totalShiftKg.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">KG</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Avg Efficiency</span>
            <Gauge className="h-3 w-3 text-sky-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-xl font-extrabold font-mono ${
                liveTotals.averageEfficiency >= 85
                  ? "text-emerald-600"
                  : liveTotals.averageEfficiency >= 70
                  ? "text-amber-600"
                  : "text-slate-900"
              }`}
            >
              {liveTotals.averageEfficiency}%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">std speed</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Total Breakdown</span>
            <Timer className="h-3 w-3 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-amber-700 font-mono">
              {liveTotals.totalBreakdownMins}
            </span>
            <span className="text-xs text-slate-500 font-medium">Mins</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Shift Wastage</div>
          <div className="mt-1 flex items-center gap-1.5">
            <input
              type="number"
              value={totalWastageKg}
              onChange={(e) => setTotalWastageKg(e.target.value)}
              className="w-20 px-2 py-0.5 text-base font-extrabold text-rose-700 font-mono bg-rose-50/50 border border-rose-200 rounded-lg outline-none focus:bg-white focus:border-rose-400"
              placeholder="0"
            />
            <span className="text-xs text-slate-500 font-medium">KG</span>
          </div>
        </div>
      </div>

      {/* Progressive Interval Totals Strip */}
      <div className="bg-slate-900 text-white rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wide uppercase text-[11px] text-slate-300">
            Progressive Interval Totals:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono text-[11px]">
          {timeSlots.map((slot, idx) => {
            const prog = liveTotals.progressiveTotals[idx] || 0;
            return (
              <div key={slot} className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <span className="text-slate-400 font-medium">{slot}:</span>
                <span className="font-bold text-emerald-400">{prog.toLocaleString()} m</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Bi-Hourly Reading Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10.5px]">
                <th className="py-2.5 px-2 text-center w-12 border-r border-slate-200" rowSpan={2}>
                  Loom #
                </th>
                <th className="py-2.5 px-2.5 w-28 border-r border-slate-200" rowSpan={2}>
                  Operator Name
                </th>
                <th className="py-2.5 px-2 text-center w-14 border-r border-slate-200" rowSpan={2}>
                  Size
                </th>
                <th className="py-2.5 px-2 text-center w-14 border-r border-slate-200" rowSpan={2}>
                  DNR
                </th>
                <th className="py-2.5 px-2.5 w-36 border-r border-slate-200" rowSpan={2}>
                  Type / Quality
                </th>
                <th className="py-2.5 px-2 text-right w-20 bg-slate-100/70 border-r border-slate-200" rowSpan={2}>
                  I/R {initialTimeSlot}
                </th>
                <th className="py-1 px-2 text-center border-r border-slate-200" colSpan={2}>
                  {timeSlots[0] || "10:00"}
                </th>
                <th className="py-1 px-2 text-center border-r border-slate-200" colSpan={2}>
                  {timeSlots[1] || "12:00"}
                </th>
                <th className="py-1 px-2 text-center border-r border-slate-200" colSpan={2}>
                  {timeSlots[2] || "02:00"}
                </th>
                <th className="py-1 px-2 text-center border-r border-slate-200" colSpan={2}>
                  {timeSlots[3] || "04:00"}
                </th>
                <th className="py-1 px-2 text-center border-r border-slate-200" colSpan={2}>
                  {timeSlots[4] || "06:00"}
                </th>
                <th className="py-2.5 px-2 text-right w-20 bg-slate-100/70 border-r border-slate-200" rowSpan={2}>
                  {timeSlots[5] || "08:00"} End
                </th>
                <th className="py-2.5 px-2 text-right w-20 bg-blue-50/60 border-r border-slate-200" rowSpan={2}>
                  T PROD
                </th>
                <th className="py-2.5 px-2 text-center w-48 border-r border-slate-200 bg-amber-50/40" rowSpan={2}>
                  Breakdown (Reason / Min)
                </th>
                <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200 bg-sky-50/50" rowSpan={2}>
                  Efficiency
                </th>
                <th className="py-2.5 px-2.5 w-36" rowSpan={2}>
                  Remarks / Status
                </th>
              </tr>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[9.5px]">
                <th className="py-1 px-1.5 text-right w-14">Read</th>
                <th className="py-1 px-1.5 text-right w-12 bg-emerald-50 text-emerald-800 border-r border-slate-200">Prod</th>
                <th className="py-1 px-1.5 text-right w-14">Read</th>
                <th className="py-1 px-1.5 text-right w-12 bg-emerald-50 text-emerald-800 border-r border-slate-200">Prod</th>
                <th className="py-1 px-1.5 text-right w-14">Read</th>
                <th className="py-1 px-1.5 text-right w-12 bg-emerald-50 text-emerald-800 border-r border-slate-200">Prod</th>
                <th className="py-1 px-1.5 text-right w-14">Read</th>
                <th className="py-1 px-1.5 text-right w-12 bg-emerald-50 text-emerald-800 border-r border-slate-200">Prod</th>
                <th className="py-1 px-1.5 text-right w-14">Read</th>
                <th className="py-1 px-1.5 text-right w-12 bg-emerald-50 text-emerald-800 border-r border-slate-200">Prod</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={22} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="h-4 w-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
                      <span>Loading Circular Loom 2-Hours Reading Sheet...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={22} className="py-8 text-center text-slate-400 font-medium italic">
                    No loom machines match the active filters.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => {
                  const isRunning = e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0);
                  const isLpp = (e.qualityType || "").toUpperCase().includes("LPP");
                  const stdSpeed = isLpp ? "2.50 m/m" : "2.01 m/m";
                  const effVal = typeof e.efficiencyPct === "number" && e.efficiencyPct > 0 ? e.efficiencyPct : 0;

                  return (
                    <tr
                      key={e.loomNumber}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        e.status === "STOP"
                          ? "bg-rose-50/30"
                          : e.status === "CLEANING"
                          ? "bg-amber-50/30"
                          : isRunning
                          ? "bg-white"
                          : "bg-slate-50/40 text-slate-400"
                      }`}
                    >
                      {/* Loom Number */}
                      <td className="py-1.5 px-2 text-center font-bold font-mono text-slate-900 border-r border-slate-100">
                        #{e.loomNumber}
                      </td>

                      {/* Operator Name */}
                      <td className="py-1 px-2 border-r border-slate-100">
                        <input
                          type="text"
                          value={e.operatorName || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, "operatorName", ev.target.value)}
                          placeholder="Operator"
                          className="w-full px-1.5 py-0.5 text-xs bg-transparent border-b border-transparent focus:border-slate-800 outline-none hover:bg-slate-50/80 rounded"
                        />
                      </td>

                      {/* Size */}
                      <td className="py-1 px-1 border-r border-slate-100">
                        <input
                          type="text"
                          value={e.size || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, "size", ev.target.value)}
                          placeholder="Size"
                          className="w-full px-1 py-0.5 text-xs text-center font-mono bg-transparent border-b border-transparent focus:border-slate-800 outline-none rounded"
                        />
                      </td>

                      {/* Denier */}
                      <td className="py-1 px-1 border-r border-slate-100">
                        <input
                          type="text"
                          value={e.denier || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, "denier", ev.target.value)}
                          placeholder="DNR"
                          className="w-full px-1 py-0.5 text-xs text-center font-mono bg-transparent border-b border-transparent focus:border-slate-800 outline-none rounded"
                        />
                      </td>

                      {/* Quality Type */}
                      <td className="py-1 px-2 border-r border-slate-100">
                        <input
                          type="text"
                          value={e.qualityType || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, "qualityType", ev.target.value)}
                          placeholder="Recipe / Quality"
                          className="w-full px-1.5 py-0.5 text-xs font-semibold text-slate-800 bg-transparent border-b border-transparent focus:border-slate-800 outline-none rounded"
                        />
                      </td>

                      {/* Initial Reading */}
                      <td className="py-1 px-1.5 bg-slate-50/50 border-r border-slate-100">
                        <input
                          type="number"
                          value={e.initialReading !== null && e.initialReading !== undefined ? e.initialReading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              "initialReading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          placeholder="I/R"
                          className="w-full px-1 py-0.5 text-xs text-right font-mono font-bold text-slate-700 bg-transparent border-b border-transparent focus:border-slate-800 outline-none"
                        />
                      </td>

                      {/* 10:00 Reading & Prod */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          value={e.r1Reading !== null && e.r1Reading !== undefined ? e.r1Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              "r1Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          className="w-full px-1 py-0.5 text-xs text-right font-mono bg-transparent border-b border-transparent focus:border-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40 border-r border-slate-100">
                        {e.r1Prod !== null && e.r1Prod > 0 ? e.r1Prod : e.r1Prod === 0 ? "0" : "—"}
                      </td>

                      {/* 12:00 Reading & Prod */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          value={e.r2Reading !== null && e.r2Reading !== undefined ? e.r2Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              "r2Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          className="w-full px-1 py-0.5 text-xs text-right font-mono bg-transparent border-b border-transparent focus:border-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40 border-r border-slate-100">
                        {e.r2Prod !== null && e.r2Prod > 0 ? e.r2Prod : e.r2Prod === 0 ? "0" : "—"}
                      </td>

                      {/* 02:00 Reading & Prod */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          value={e.r3Reading !== null && e.r3Reading !== undefined ? e.r3Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              "r3Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          className="w-full px-1 py-0.5 text-xs text-right font-mono bg-transparent border-b border-transparent focus:border-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40 border-r border-slate-100">
                        {e.r3Prod !== null && e.r3Prod > 0 ? e.r3Prod : e.r3Prod === 0 ? "0" : "—"}
                      </td>

                      {/* 04:00 Reading & Prod */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          value={e.r4Reading !== null && e.r4Reading !== undefined ? e.r4Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              "r4Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          className="w-full px-1 py-0.5 text-xs text-right font-mono bg-transparent border-b border-transparent focus:border-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40 border-r border-slate-100">
                        {e.r4Prod !== null && e.r4Prod > 0 ? e.r4Prod : e.r4Prod === 0 ? "0" : "—"}
                      </td>

                      {/* 06:00 Reading & Prod */}
                      <td className="py-1 px-1">
                        <input
                          type="number"
                          value={e.r5Reading !== null && e.r5Reading !== undefined ? e.r5Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              "r5Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          className="w-full px-1 py-0.5 text-xs text-right font-mono bg-transparent border-b border-transparent focus:border-slate-800 outline-none"
                        />
                      </td>
                      <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40 border-r border-slate-100">
                        {e.r5Prod !== null && e.r5Prod > 0 ? e.r5Prod : e.r5Prod === 0 ? "0" : "—"}
                      </td>

                      {/* 08:00 (Final Reading) */}
                      <td className="py-1 px-1.5 bg-slate-50/50 border-r border-slate-100">
                        <input
                          type="number"
                          value={e.r6Reading !== null && e.r6Reading !== undefined ? e.r6Reading : ""}
                          onChange={(ev) =>
                            handleEntryChange(
                              e.loomNumber,
                              "r6Reading",
                              ev.target.value === "" ? null : parseFloat(ev.target.value)
                            )
                          }
                          placeholder="End"
                          className="w-full px-1 py-0.5 text-xs text-right font-mono font-bold text-slate-700 bg-transparent border-b border-transparent focus:border-slate-800 outline-none"
                        />
                      </td>

                      {/* Total Shift Production (Meters) */}
                      <td className="py-1 px-2 text-right font-mono font-extrabold text-blue-900 bg-blue-50/50 border-r border-slate-100">
                        {e.totalProduction > 0 ? e.totalProduction.toLocaleString() : "—"}
                      </td>

                      {/* Breakdown Column: Reason dropdown + Downtime in minutes */}
                      <td className="py-1 px-1.5 border-r border-slate-100 bg-amber-50/20">
                        <div className="flex items-center gap-1">
                          <select
                            value={e.breakdownReason || ""}
                            onChange={(ev) => handleEntryChange(e.loomNumber, "breakdownReason", ev.target.value || null)}
                            className="flex-1 text-[10px] font-medium px-1 py-0.5 bg-white border border-amber-200/80 rounded outline-none text-slate-700 hover:border-amber-400"
                          >
                            <option value="">No Breakdown</option>
                            {LOOM_BREAKDOWN_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <input
                              type="number"
                              min="0"
                              max="720"
                              value={e.breakdownMinutes !== null && e.breakdownMinutes !== undefined ? e.breakdownMinutes : ""}
                              onChange={(ev) =>
                                handleEntryChange(
                                  e.loomNumber,
                                  "breakdownMinutes",
                                  ev.target.value === "" ? 0 : Math.max(0, parseInt(ev.target.value, 10) || 0)
                                )
                              }
                              placeholder="0"
                              title="Downtime in minutes"
                              className="w-12 px-1 py-0.5 text-xs text-right font-mono font-bold text-amber-900 bg-white border border-amber-200/80 rounded outline-none focus:border-amber-500"
                            />
                            <span className="text-[10px] text-slate-400">m</span>
                          </div>
                        </div>
                      </td>

                      {/* Live Efficiency Column */}
                      <td className="py-1 px-1.5 text-center font-mono border-r border-slate-100 bg-sky-50/20">
                        {effVal > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-extrabold ${
                                effVal >= 85
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : effVal >= 70
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {effVal}%
                            </span>
                            <span className="text-[8.5px] text-slate-400 scale-90 -mt-0.5">
                              {stdSpeed}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal text-xs">—</span>
                        )}
                      </td>

                      {/* Remarks / Status */}
                      <td className="py-1 px-2 flex items-center gap-1.5">
                        <select
                          value={e.status}
                          onChange={(ev) => handleEntryChange(e.loomNumber, "status", ev.target.value)}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border outline-none ${
                            e.status === "RUNNING"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : e.status === "STOP"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : e.status === "CLEANING"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <option value="RUNNING">RUN</option>
                          <option value="STOP">STOP</option>
                          <option value="CLEANING">CLEAN</option>
                          <option value="CHANGEOVER">C/O</option>
                          <option value="IDLE">IDLE</option>
                        </select>
                        <input
                          type="text"
                          value={e.remarks || ""}
                          onChange={(ev) => handleEntryChange(e.loomNumber, "remarks", ev.target.value)}
                          placeholder="Notes..."
                          className="flex-1 min-w-[70px] px-1 py-0.5 text-xs bg-transparent border-b border-transparent focus:border-slate-800 outline-none"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer: Column Interval Totals */}
            <tfoot>
              <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-900">
                <td colSpan={6} className="py-2.5 px-3 text-right uppercase text-[10px] text-slate-700 border-r border-slate-200">
                  Total Interval Production (Meters):
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2 px-1.5 text-right font-mono font-extrabold text-emerald-800 bg-emerald-100/80 border-r border-slate-200">
                  {liveTotals.totalR1Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2 px-1.5 text-right font-mono font-extrabold text-emerald-800 bg-emerald-100/80 border-r border-slate-200">
                  {liveTotals.totalR2Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2 px-1.5 text-right font-mono font-extrabold text-emerald-800 bg-emerald-100/80 border-r border-slate-200">
                  {liveTotals.totalR3Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2 px-1.5 text-right font-mono font-extrabold text-emerald-800 bg-emerald-100/80 border-r border-slate-200">
                  {liveTotals.totalR4Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2 px-1.5 text-right font-mono font-extrabold text-emerald-800 bg-emerald-100/80 border-r border-slate-200">
                  {liveTotals.totalR5Prod.toLocaleString()}
                </td>
                <td className="border-r border-slate-200"></td>
                <td className="py-2 px-2 text-right font-mono font-extrabold text-blue-900 bg-blue-100 border-r border-slate-200">
                  {liveTotals.totalShiftMeters.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-center font-mono font-bold text-amber-900 bg-amber-100/80 border-r border-slate-200">
                  {liveTotals.totalBreakdownMins > 0 ? `${liveTotals.totalBreakdownMins} Mins` : "0 Mins"}
                </td>
                <td className="py-2 px-1 text-center font-mono font-extrabold text-sky-900 bg-sky-100/80 border-r border-slate-200">
                  {liveTotals.averageEfficiency}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Official Sign-Off Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Official Shift Approvals & Authorization
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Prepared By (Loom Shed In-Charge):
            </label>
            <input
              type="text"
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="e.g. Ravinder Kumar"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Checked By (Shift Supervisor):
            </label>
            <input
              type="text"
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              placeholder="e.g. Suresh Sharma"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Approved By (Plant Manager):
            </label>
            <input
              type="text"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="e.g. Plant Manager"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-slate-800 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Bulk Operator Assign Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Assign Operator Range</h3>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Apply operator name and specifications across a range of circular loom machines in one action.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Loom #:</label>
                <input
                  type="number"
                  min="1"
                  max="91"
                  value={bulkStartLoom}
                  onChange={(e) => setBulkStartLoom(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Loom #:</label>
                <input
                  type="number"
                  min="1"
                  max="91"
                  value={bulkEndLoom}
                  onChange={(e) => setBulkEndLoom(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Operator Name:</label>
              <input
                type="text"
                value={bulkOperator}
                onChange={(e) => setBulkOperator(e.target.value)}
                placeholder="e.g. Ravinder"
                list="plant-operators"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
              />
              <datalist id="plant-operators">
                {(data?.availableOperators || []).map((o) => (
                  <option key={o.id} value={o.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quality / Type (Optional):</label>
              <input
                type="text"
                value={bulkQuality}
                onChange={(e) => setBulkQuality(e.target.value)}
                placeholder="e.g. 1000D/LPP/W"
                list="plant-qualities"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
              />
              <datalist id="plant-qualities">
                {(data?.availableQualities || []).map((q) => (
                  <option key={q.code} value={q.code} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Size (mm):</label>
                <input
                  type="text"
                  value={bulkSize}
                  onChange={(e) => setBulkSize(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Denier (DNR):</label>
                <input
                  type="text"
                  value={bulkDenier}
                  onChange={(e) => setBulkDenier(e.target.value)}
                  placeholder="e.g. 850"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAssign}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Sheet Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900">Reset 2-Hours Sheet?</h3>
            </div>
            <p className="text-xs text-slate-600">
              This will erase all recorded bi-hourly readings for <strong>{selectedDate}</strong> ({selectedShift}).
              The sheet will return to a clean blank state.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetSheet}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Yes, Reset Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Print Preview Modal */}
      <LoomReadingPrintPreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        date={selectedDate}
        shiftName={selectedShift}
        preparedBy={preparedBy}
        checkedBy={checkedBy}
        approvedBy={approvedBy}
        timeSlots={timeSlots}
        initialTimeSlot={initialTimeSlot}
        entries={filteredEntries}
        kpis={{
          totalLooms: 91,
          runningLoomsCount: liveTotals.runningLooms,
          idleLoomsCount: liveTotals.idleLooms,
          totalShiftMeters: liveTotals.totalShiftMeters,
          totalShiftKg: liveTotals.totalShiftKg,
          totalWastageKg: parseFloat(totalWastageKg) || 0,
          averageEfficiency: liveTotals.averageEfficiency,
          totalBreakdownMins: liveTotals.totalBreakdownMins,
        }}
        filterActiveOnly={filterActiveOnly}
        isFiltered={isFiltered}
        filterLabel={filterLabel}
      />
    </div>
  );
}
