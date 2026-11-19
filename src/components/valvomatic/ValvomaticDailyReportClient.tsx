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
  FileCheck,
  AlertCircle,
} from "lucide-react";
import {
  ValvomaticReportItem,
  ValvomaticDailyReportData,
  calculateValvomaticRow,
  computeValvomaticTotals,
} from "@/lib/valvomatic/valvomatic-types";
import {
  FocusedValvomaticReportCell,
  getValvomaticReportRowKey,
  reconcileServerValvomaticReportEntries,
  serializeValvomaticReportPayload,
} from "@/lib/valvomatic/valvomatic-daily-report-google-docs-sync";
import dynamic from "next/dynamic";
import { exportValvomaticReportExcel } from "@/lib/valvomatic/valvomatic-export";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";
import { UniversalPersonnelInput } from "@/components/ui/UniversalPersonnelInput";
import { UniversalShiftSelector } from "@/components/production/UniversalShiftSelector";
import { useProductionRealtime } from "@/hooks/useProductionRealtime";
import { RealtimeSyncBadge } from "@/components/production/RealtimeSyncBadge";

const ValvomaticReportPrintModal = dynamic(
  () => import("./ValvomaticReportPrintModal").then((m) => m.ValvomaticReportPrintModal),
  { ssr: false }
);

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
  const lastUserEditTimeRef = useRef<number>(0);

  // Google Docs Concurrent Sync & Typing Isolation Refs
  const lastSavedPayloadRef = useRef<string>("");
  const hasUnsavedLocalEditsRef = useRef<boolean>(false);
  const activeFocusedCellRef = useRef<FocusedValvomaticReportCell | null>(null);
  const deletedEntryIdsRef = useRef<Set<string>>(new Set());

  const [, setFocusedCellState] = useState<FocusedValvomaticReportCell | null>(null);

  const setFocusedCell = useCallback((rowKey: string, field: keyof ValvomaticReportItem) => {
    const next = { rowKey, field };
    activeFocusedCellRef.current = next;
    setFocusedCellState(next);
  }, []);

  const clearFocusedCell = useCallback((rowKey: string, field: keyof ValvomaticReportItem) => {
    if (
      activeFocusedCellRef.current?.rowKey === rowKey &&
      activeFocusedCellRef.current?.field === field
    ) {
      activeFocusedCellRef.current = null;
      setFocusedCellState(null);
    }
  }, []);

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

        const incomingEntries: ValvomaticReportItem[] =
          Array.isArray(rep.entries) && rep.entries.length > 0
            ? rep.entries.map((e: any, idx: number) =>
                calculateValvomaticRow({
                  ...e,
                  quality: e.quality || e.partyName || "",
                  partyName: e.quality || e.partyName || "",
                  sequence: idx + 1,
                })
              )
            : [];

        setEntries((prev) => {
          const reconciled = reconcileServerValvomaticReportEntries({
            localEntries: prev,
            incomingEntries,
            focusedCell: activeFocusedCellRef.current,
            hasUnsavedLocalEdits: hasUnsavedLocalEditsRef.current,
            deletedEntryIds: deletedEntryIdsRef.current,
          });
          while (reconciled.length < 5) {
            reconciled.push(createEmptyValvomaticRow(reconciled.length + 1));
          }
          lastSavedPayloadRef.current = serializeValvomaticReportPayload(rep, incomingEntries);
          return reconciled;
        });

        setLastSavedAt(format(new Date(rep.updatedAt || Date.now()), "hh:mm a"));
      } else {
        // No report exists for this shift
        if (!hasUnsavedLocalEditsRef.current) {
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

  const realtime = useProductionRealtime({
    module: "valvomatic",
    sheet: "daily-report",
    date,
    shift: shiftName,
    onSync: (event?: { clientId?: string | null }) => {
      // Echo suppression: Ignore notifications originating from this client session
      if (event?.clientId && event.clientId === realtime.clientId) return;
      if (Date.now() - lastUserEditTimeRef.current < 2500 && activeFocusedCellRef.current) return;
      fetchReportData();
    },
  });

  // Catch-up upon tab wake-up (e.g., user returns after lock or tab switch)
  useEffect(() => {
    const handleVisibilityCatchup = () => {
      if (document.visibilityState === "visible") {
        fetchReportData();
      }
    };
    const handleFocusCatchup = () => {
      fetchReportData();
    };

    document.addEventListener("visibilitychange", handleVisibilityCatchup);
    window.addEventListener("focus", handleFocusCatchup);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityCatchup);
      window.removeEventListener("focus", handleFocusCatchup);
    };
  }, [fetchReportData]);

  // Helper to determine if a row has any user entered data
  const hasRowData = useCallback((e: ValvomaticReportItem) => {
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
  }, []);

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
      const currentTotals = computeValvomaticTotals(current.entries);

      try {
        const payload = {
          date: current.date,
          shiftName: current.shiftName,
          machineNo: current.machineNo,
          companyName: current.companyName,
          unitName: current.unitName,
          operatorName: current.operatorName.trim() || undefined,
          supervisorName: current.supervisorName.trim() || undefined,
          status: newStatus,
          remarks: current.remarks.trim() || undefined,
          clientId: realtime.clientId,
          deletedEntryIds: Array.from(deletedEntryIdsRef.current),
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

        const res = await fetch("/api/production/valvomatic/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save Valvomatic report");
        }

        lastSavedPayloadRef.current = serializeValvomaticReportPayload(current, filledEntries);
        hasUnsavedLocalEditsRef.current = false;
        deletedEntryIdsRef.current.clear();
        setStatus(newStatus);
        setLastSavedAt(format(new Date(), "hh:mm:ss a"));
        isDirtyRef.current = false;

        realtime.broadcastSync({
          action: newStatus === "SUBMITTED" ? "SUBMIT" : "SAVE",
          date: current.date,
          shift: current.shiftName,
        });

        if (!silent) {
          toast.success(
            newStatus === "SUBMITTED"
              ? "Valvomatic production report submitted successfully!"
              : "Valvomatic report saved successfully"
          );
        }
      } catch (err: any) {
        console.error("Valvomatic save error:", err);
        setAutoSaveError(err.message || "Auto-save failed");
        if (!silent) toast.error(err.message || "Failed to save Valvomatic report");
      } finally {
        setSaving(false);
        setIsAutoSaving(false);
      }
    },
    [hasRowData, realtime]
  );

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      executeSave("DRAFT", true);
    }, 1500);
  }, [executeSave]);

  const markDirtyAndTriggerAutoSave = useCallback(() => {
    isDirtyRef.current = true;
    hasUnsavedLocalEditsRef.current = true;
    lastUserEditTimeRef.current = Date.now();
    realtime.markLocalEdit();
    triggerAutoSave();
  }, [realtime, triggerAutoSave]);

  // Handle cell edits with live recalculation and dirty flagging
  const handleCellChange = useCallback(
    (index: number, field: keyof ValvomaticReportItem, value: any) => {
      setEntries((prev) => {
        const next = [...prev];
        const updatedRow = { ...next[index], [field]: value };
        next[index] = calculateValvomaticRow(updatedRow);
        return next;
      });
      markDirtyAndTriggerAutoSave();
    },
    [markDirtyAndTriggerAutoSave]
  );

  // Add row
  const handleAddRow = useCallback(() => {
    setEntries((prev) => [...prev, createEmptyValvomaticRow(prev.length + 1)]);
    markDirtyAndTriggerAutoSave();
  }, [markDirtyAndTriggerAutoSave]);

  // Add 5 rows
  const handleAdd5Rows = useCallback(() => {
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
    markDirtyAndTriggerAutoSave();
  }, [markDirtyAndTriggerAutoSave]);

  // Reset to blank
  const handleResetToBlank = useCallback(() => {
    if (confirm("Reset sheet to 5 blank rows? Unsaved changes will be discarded.")) {
      setEntries([
        createEmptyValvomaticRow(1),
        createEmptyValvomaticRow(2),
        createEmptyValvomaticRow(3),
        createEmptyValvomaticRow(4),
        createEmptyValvomaticRow(5),
      ]);
      setRemarks("");
      markDirtyAndTriggerAutoSave();
    }
  }, [markDirtyAndTriggerAutoSave]);

  // Delete row
  const handleDeleteRow = useCallback(
    (index: number) => {
      setEntries((prev) => {
        const rowToDelete = prev[index];
        if (rowToDelete?.id) {
          deletedEntryIdsRef.current.add(rowToDelete.id);
        }
        const filtered = prev.filter((_, i) => i !== index);
        if (filtered.length === 0) {
          return [createEmptyValvomaticRow(1)];
        }
        return filtered.map((row, i) => ({ ...row, sequence: i + 1 }));
      });
      markDirtyAndTriggerAutoSave();
    },
    [markDirtyAndTriggerAutoSave]
  );

  // Fill from suggested roll
  const handleSelectSuggestedRoll = useCallback(
    (rowIndex: number, roll: any) => {
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
      markDirtyAndTriggerAutoSave();
    },
    [markDirtyAndTriggerAutoSave]
  );

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

  // Prepare full data for printing
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
                    Cutting &amp; Bag Making
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
                  Daily production tracking: meters, pieces, kg, cover &amp; valve patch consumption
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Strip */}
          <div className="flex flex-wrap items-center gap-2">
            <RealtimeSyncBadge
              isConnected={realtime.isConnected}
              lastUpdatedBy={realtime.lastUpdatedBy}
              lastUpdatedAt={realtime.lastUpdatedAt}
              lastAction={realtime.lastAction}
              isSelfUpdate={realtime.isSelfUpdate}
            />

            <button
              onClick={() => executeSave("DRAFT")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
              Save Draft
            </button>

            <button
              onClick={() => executeSave("SUBMITTED")}
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
            <UniversalShiftSelector
              value={shiftName}
              onChange={(val) => setShiftName(val)}
              mode="byName"
              showIcon={false}
              selectClassName="px-2.5 py-1.5 border-slate-300"
            />
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
            <UniversalPersonnelInput
              type="operator"
              section="VALVOMATIC"
              value={operatorName}
              onChange={(val) => {
                setOperatorName(val);
                markDirtyAndTriggerAutoSave();
              }}
              placeholder="Select operator..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Supervisor</label>
            <UniversalPersonnelInput
              type="supervisor"
              section="VALVOMATIC"
              value={supervisorName}
              onChange={(val) => {
                setSupervisorName(val);
                markDirtyAndTriggerAutoSave();
              }}
              placeholder="Select supervisor..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Company / Unit</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  markDirtyAndTriggerAutoSave();
                }}
                placeholder="Company"
                className="w-3/5 text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary font-medium"
              />
              <input
                type="text"
                value={unitName}
                onChange={(e) => {
                  setUnitName(e.target.value);
                  markDirtyAndTriggerAutoSave();
                }}
                placeholder="Unit"
                className="w-2/5 text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary font-medium text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Production Aggregate Summary Tiles */}
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
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
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
                entries.map((entry, index) => {
                  const rowKey = getValvomaticReportRowKey(entry, index);
                  return (
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
                          onFocus={() => setFocusedCell(rowKey, "companyName")}
                          onBlur={() => clearFocusedCell(rowKey, "companyName")}
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
                          onFocus={() => setFocusedCell(rowKey, "unitName")}
                          onBlur={() => clearFocusedCell(rowKey, "unitName")}
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
                          onFocus={() => setFocusedCell(rowKey, "grade")}
                          onBlur={() => clearFocusedCell(rowKey, "grade")}
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
                          onFocus={() => setFocusedCell(rowKey, "targetProductionPcs")}
                          onBlur={() => clearFocusedCell(rowKey, "targetProductionPcs")}
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
                          onFocus={() => setFocusedCell(rowKey, "quality")}
                          onBlur={() => clearFocusedCell(rowKey, "quality")}
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
                              setFocusedCell(rowKey, "rollNumber");
                              setRollSearchQuery(entry.rollNumber || "");
                              setActiveRollSearchRow(index);
                            }}
                            onBlur={() => clearFocusedCell(rowKey, "rollNumber")}
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
                          onFocus={() => setFocusedCell(rowKey, "loomNumber")}
                          onBlur={() => clearFocusedCell(rowKey, "loomNumber")}
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
                          onFocus={() => setFocusedCell(rowKey, "rollMtr")}
                          onBlur={() => clearFocusedCell(rowKey, "rollMtr")}
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
                          onFocus={() => setFocusedCell(rowKey, "netWeight")}
                          onBlur={() => clearFocusedCell(rowKey, "netWeight")}
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
                          onFocus={() => setFocusedCell(rowKey, "openingMeterReading")}
                          onBlur={() => clearFocusedCell(rowKey, "openingMeterReading")}
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
                          onFocus={() => setFocusedCell(rowKey, "closingMeterReading")}
                          onBlur={() => clearFocusedCell(rowKey, "closingMeterReading")}
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
                          onFocus={() => setFocusedCell(rowKey, "coverPatchOs")}
                          onBlur={() => clearFocusedCell(rowKey, "coverPatchOs")}
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
                          onFocus={() => setFocusedCell(rowKey, "coverPatchDs")}
                          onBlur={() => clearFocusedCell(rowKey, "coverPatchDs")}
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
                          onFocus={() => setFocusedCell(rowKey, "valvePatch")}
                          onBlur={() => clearFocusedCell(rowKey, "valvePatch")}
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
                          onFocus={() => setFocusedCell(rowKey, "productionPcs")}
                          onBlur={() => clearFocusedCell(rowKey, "productionPcs")}
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
                          onFocus={() => setFocusedCell(rowKey, "productionKg")}
                          onBlur={() => clearFocusedCell(rowKey, "productionKg")}
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
                          onFocus={() => setFocusedCell(rowKey, "remarks")}
                          onBlur={() => clearFocusedCell(rowKey, "remarks")}
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
                  );
                })
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
                <td className="p-2 border-r border-slate-300 text-right font-mono text-indigo-900 bg-indigo-50/50">
                  {totals.totalCoverPatchOs}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-indigo-900 bg-indigo-50/50">
                  {totals.totalCoverPatchDs}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-purple-900 bg-purple-50/50">
                  {totals.totalValvePatch}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-emerald-900 bg-emerald-100">
                  {totals.totalProductionPcs.toLocaleString()}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-teal-900 bg-teal-100">
                  {totals.totalProductionKg.toFixed(1)}
                </td>
                <td colSpan={2} className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* General Remarks Textarea */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Shift Remarks &amp; Observations
        </label>
        <textarea
          value={remarks}
          onChange={(e) => {
            setRemarks(e.target.value);
            markDirtyAndTriggerAutoSave();
          }}
          rows={2}
          placeholder="Any machine downtime, maintenance, quality issues, or shift notes..."
          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Mobile Card View (shown below md screen) */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Rolls ({entries.length})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={handleAdd5Rows}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold active:scale-95 transition-all"
            >
              <span>+5</span>
            </button>
            <button
              type="button"
              onClick={handleResetToBlank}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-rose-600 active:scale-95 transition-all"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
              No entries in this report. Tap &quot;Add Row&quot; to begin.
            </div>
          ) : (
            entries.map((entry, index) => {
              const rowKey = getValvomaticReportRowKey(entry, index);
              return (
                <div
                  key={index}
                  className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden"
                >
                  {/* Card Header Strip */}
                  <div className="bg-slate-50/90 px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-md bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                        {entry.sequence}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {entry.rollNumber ? entry.rollNumber : `Row ${index + 1}`}
                      </span>
                      {entry.loomNumber && (
                        <span className="text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-mono">
                          Loom #{entry.loomNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.productionPcs > 0 && (
                        <span className="text-xs font-black font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {entry.productionPcs.toLocaleString()} pcs
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(index)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded active:scale-90 transition-all"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-3 text-xs">
                    {/* Quality & Company */}
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Quality
                        </label>
                        <UniversalQualityInput
                          value={entry.quality || entry.partyName || ""}
                          onChange={(newVal) => {
                            handleCellChange(index, "quality", newVal);
                            handleCellChange(index, "partyName", newVal);
                          }}
                          onFocus={() => setFocusedCell(rowKey, "quality")}
                          onBlur={() => clearFocusedCell(rowKey, "quality")}
                          placeholder="Select quality..."
                          compact={false}
                          inputClassName="h-9 text-xs font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={entry.companyName || ""}
                            onChange={(e) => handleCellChange(index, "companyName", e.target.value)}
                            onFocus={() => setFocusedCell(rowKey, "companyName")}
                            onBlur={() => clearFocusedCell(rowKey, "companyName")}
                            placeholder="e.g. Flexicom"
                            className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Unit / Grade
                          </label>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="text"
                              value={entry.unitName || ""}
                              onChange={(e) => handleCellChange(index, "unitName", e.target.value)}
                              onFocus={() => setFocusedCell(rowKey, "unitName")}
                              onBlur={() => clearFocusedCell(rowKey, "unitName")}
                              placeholder="Unit"
                              className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                            />
                            <input
                              type="text"
                              value={entry.grade || ""}
                              onChange={(e) => handleCellChange(index, "grade", e.target.value)}
                              onFocus={() => setFocusedCell(rowKey, "grade")}
                              onBlur={() => clearFocusedCell(rowKey, "grade")}
                              placeholder="Grade"
                              className="w-full h-8 px-2 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Roll No & Loom Details */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Roll Number
                          </label>
                          <input
                            type="text"
                            value={entry.rollNumber}
                            onChange={(e) => handleCellChange(index, "rollNumber", e.target.value)}
                            onFocus={() => setFocusedCell(rowKey, "rollNumber")}
                            onBlur={() => clearFocusedCell(rowKey, "rollNumber")}
                            placeholder="e.g. V-1021"
                            className="w-full h-8 px-2.5 text-xs font-mono font-bold border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            Loom Number
                          </label>
                          <input
                            type="text"
                            value={entry.loomNumber || ""}
                            onChange={(e) => handleCellChange(index, "loomNumber", e.target.value)}
                            onFocus={() => setFocusedCell(rowKey, "loomNumber")}
                            onBlur={() => clearFocusedCell(rowKey, "loomNumber")}
                            placeholder="e.g. 15"
                            className="w-full h-8 px-2.5 text-xs font-mono border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Roll Mtr</span>
                          <input
                            type="number"
                            step="any"
                            value={entry.rollMtr || ""}
                            onChange={(e) => handleCellChange(index, "rollMtr", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "rollMtr")}
                            onBlur={() => clearFocusedCell(rowKey, "rollMtr")}
                            placeholder="0"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-slate-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Net Wt (Kg)</span>
                          <input
                            type="number"
                            step="any"
                            value={entry.netWeight || ""}
                            onChange={(e) => handleCellChange(index, "netWeight", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "netWeight")}
                            onBlur={() => clearFocusedCell(rowKey, "netWeight")}
                            placeholder="0"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-slate-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg (g/m)</span>
                          <div className="h-7 flex items-center justify-center font-mono font-bold text-sky-800 bg-sky-50 rounded border border-sky-200 text-xs">
                            {entry.avgWeight ? entry.avgWeight.toFixed(1) : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meter Readings & Patches */}
                    <div className="p-2.5 rounded-lg bg-indigo-50/30 border border-indigo-100 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-indigo-900 tracking-wider block">
                        Meter Readings &amp; Patches
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Opening Reading</span>
                          <input
                            type="number"
                            step="any"
                            value={entry.openingMeterReading || ""}
                            onChange={(e) => handleCellChange(index, "openingMeterReading", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "openingMeterReading")}
                            onBlur={() => clearFocusedCell(rowKey, "openingMeterReading")}
                            placeholder="0"
                            className="w-full h-7 px-2 text-xs font-mono border border-slate-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Closing Reading</span>
                          <input
                            type="number"
                            step="any"
                            value={entry.closingMeterReading || ""}
                            onChange={(e) => handleCellChange(index, "closingMeterReading", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "closingMeterReading")}
                            onBlur={() => clearFocusedCell(rowKey, "closingMeterReading")}
                            placeholder="0"
                            className="w-full h-7 px-2 text-xs font-mono border border-slate-200 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-indigo-700 block">Cover OS</span>
                          <input
                            type="number"
                            step="any"
                            value={entry.coverPatchOs || ""}
                            onChange={(e) => handleCellChange(index, "coverPatchOs", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "coverPatchOs")}
                            onBlur={() => clearFocusedCell(rowKey, "coverPatchOs")}
                            placeholder="0"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-indigo-200 rounded bg-white text-indigo-800"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-indigo-700 block">Cover DS</span>
                          <input
                            type="number"
                            step="any"
                            value={entry.coverPatchDs || ""}
                            onChange={(e) => handleCellChange(index, "coverPatchDs", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "coverPatchDs")}
                            onBlur={() => clearFocusedCell(rowKey, "coverPatchDs")}
                            placeholder="0"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-indigo-200 rounded bg-white text-indigo-800"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-indigo-800 block">Valve</span>
                          <input
                            type="number"
                            step="any"
                            value={entry.valvePatch || ""}
                            onChange={(e) => handleCellChange(index, "valvePatch", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "valvePatch")}
                            onBlur={() => clearFocusedCell(rowKey, "valvePatch")}
                            placeholder="0"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-indigo-200 rounded bg-white text-indigo-900"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Production Output Highlights */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                        <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-0.5">
                          Production (Pcs)
                        </label>
                        <input
                          type="number"
                          value={entry.productionPcs || ""}
                          onChange={(e) => handleCellChange(index, "productionPcs", parseInt(e.target.value, 10) || 0)}
                          onFocus={() => setFocusedCell(rowKey, "productionPcs")}
                          onBlur={() => clearFocusedCell(rowKey, "productionPcs")}
                          placeholder="0"
                          className="w-full h-8 px-2 font-mono font-black text-sm text-emerald-900 bg-white border border-emerald-300 rounded focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="bg-teal-50/50 p-2.5 rounded-lg border border-teal-200">
                        <label className="block text-[10px] font-bold text-teal-800 uppercase mb-0.5">
                          Production (Kg)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={entry.productionKg || ""}
                          onChange={(e) => handleCellChange(index, "productionKg", parseFloat(e.target.value) || 0)}
                          onFocus={() => setFocusedCell(rowKey, "productionKg")}
                          onBlur={() => clearFocusedCell(rowKey, "productionKg")}
                          placeholder="0.00"
                          className="w-full h-8 px-2 font-mono font-black text-sm text-teal-900 bg-white border border-teal-300 rounded focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    {/* Remarks Input */}
                    <div>
                      <input
                        type="text"
                        value={entry.remarks || ""}
                        onChange={(e) => handleCellChange(index, "remarks", e.target.value)}
                        onFocus={() => setFocusedCell(rowKey, "remarks")}
                        onBlur={() => clearFocusedCell(rowKey, "remarks")}
                        placeholder="Row remarks or notes..."
                        className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mobile Remarks Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Shift Observations / Downtime / Maintenance Notes
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              markDirtyAndTriggerAutoSave();
            }}
            placeholder="Add any specific observations for this shift..."
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary bg-white"
          />
        </div>

        {/* Mobile Sticky Actions Bar */}
        <div className="sticky bottom-3 z-20 bg-slate-900 text-white rounded-2xl p-3 shadow-xl border border-slate-800 flex items-center justify-between gap-3">
          <div className="leading-tight">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Shift Output</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-black font-mono text-emerald-400">
                {totals.totalProductionPcs.toLocaleString()} <span className="text-xs font-normal">pcs</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({totals.totalProductionKg.toFixed(1)} kg)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => executeSave("DRAFT")}
              disabled={saving}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold active:scale-95 transition-all flex items-center gap-1.5 border border-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
              <span>Draft</span>
            </button>
            <button
              type="button"
              onClick={() => executeSave("SUBMITTED")}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Submit</span>
            </button>
          </div>
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
