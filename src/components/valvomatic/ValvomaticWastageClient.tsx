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
  ArrowDownToLine,
} from "lucide-react";
import {
  ValvomaticWastageEntryItem,
  ValvomaticWastageReportData,
  calculateValvomaticWastageRow,
  computeValvomaticWastageTotals,
} from "@/lib/valvomatic/valvomatic-types";
import {
  FocusedValvomaticWastageCell,
  getValvomaticWastageRowKey,
  reconcileServerValvomaticWastageEntries,
  serializeValvomaticWastagePayload,
} from "@/lib/valvomatic/valvomatic-wastage-google-docs-sync";
import dynamic from "next/dynamic";
import { exportValvomaticWastageReportExcel } from "@/lib/valvomatic/valvomatic-export";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";
import { UniversalPersonnelInput } from "@/components/ui/UniversalPersonnelInput";
import { UniversalShiftSelector } from "@/components/production/UniversalShiftSelector";
import { useProductionRealtime } from "@/hooks/useProductionRealtime";
import { RealtimeSyncBadge } from "@/components/production/RealtimeSyncBadge";

const ValvomaticWastagePrintModal = dynamic(
  () => import("./ValvomaticWastagePrintModal").then((m) => m.ValvomaticWastagePrintModal),
  { ssr: false }
);

function createEmptyWastageRow(sequence: number): ValvomaticWastageEntryItem {
  return {
    sequence,
    quality: "",
    rollNumber: "",
    productionKg: 0,
    loomWasteKg: 0,
    loomWastePct: 0,
    lamWasteKg: 0,
    lamWastePct: 0,
    printWasteKg: 0,
    printWastePct: 0,
    machineWasteKg: 0,
    machineWastePct: 0,
    coverPatchWasteKg: 0,
    coverPatchWastePct: 0,
    totalWasteKg: 0,
    totalWastePct: 0,
    netProductionKg: 0,
    remarks: "",
  };
}

export function ValvomaticWastageClient() {
  const [date, setDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [machineNo, setMachineNo] = useState<string>("Valvomatic-1");

  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  const [entries, setEntries] = useState<ValvomaticWastageEntryItem[]>(() => [
    createEmptyWastageRow(1),
    createEmptyWastageRow(2),
    createEmptyWastageRow(3),
    createEmptyWastageRow(4),
    createEmptyWastageRow(5),
  ]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Linked daily production rolls available for sync
  const [linkedProductionEntries, setLinkedProductionEntries] = useState<any[]>([]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const isDirtyRef = useRef<boolean>(false);
  const lastUserEditTimeRef = useRef<number>(0);

  // Google Docs Concurrent Sync & Typing Isolation Refs
  const lastSavedPayloadRef = useRef<string>("");
  const hasUnsavedLocalEditsRef = useRef<boolean>(false);
  const activeFocusedCellRef = useRef<FocusedValvomaticWastageCell | null>(null);
  const deletedEntryIdsRef = useRef<Set<string>>(new Set());

  const [, setFocusedCellState] = useState<FocusedValvomaticWastageCell | null>(null);

  const setFocusedCell = useCallback((rowKey: string, field: keyof ValvomaticWastageEntryItem) => {
    const next = { rowKey, field };
    activeFocusedCellRef.current = next;
    setFocusedCellState(next);
  }, []);

  const clearFocusedCell = useCallback((rowKey: string, field: keyof ValvomaticWastageEntryItem) => {
    if (
      activeFocusedCellRef.current?.rowKey === rowKey &&
      activeFocusedCellRef.current?.field === field
    ) {
      activeFocusedCellRef.current = null;
      setFocusedCellState(null);
    }
  }, []);

  // Ref to hold latest state for debounced auto-save
  const latestDataRef = useRef({
    date,
    shiftName,
    machineNo,
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
      operatorName,
      supervisorName,
      status,
      remarks,
      entries,
    };
  }, [date, shiftName, machineNo, operatorName, supervisorName, status, remarks, entries]);

  // Handle escape fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Fetch report data
  const fetchWastageData = useCallback(async () => {
    setLoading(true);
    isInitialLoadRef.current = true;
    isDirtyRef.current = false;
    setAutoSaveError(null);

    try {
      const res = await fetch(
        `/api/production/valvomatic/wastage?date=${date}&shiftName=${encodeURIComponent(
          shiftName
        )}&machineNo=${encodeURIComponent(machineNo)}&_t=${Date.now()}`
      );
      const json = await res.json();

      if (json.success) {
        if (json.linkedProduction) {
          setLinkedProductionEntries(json.linkedProduction.entries || []);
          if (!operatorName && json.linkedProduction.operatorName) {
            setOperatorName(json.linkedProduction.operatorName);
          }
          if (!supervisorName && json.linkedProduction.supervisorName) {
            setSupervisorName(json.linkedProduction.supervisorName);
          }
        } else {
          setLinkedProductionEntries([]);
        }

        if (json.report) {
          const rep = json.report;
          setStatus(rep.status || "DRAFT");
          if (rep.operatorName) setOperatorName(rep.operatorName);
          if (rep.supervisorName) setSupervisorName(rep.supervisorName);
          setRemarks(rep.remarks || "");

          const incomingEntries: ValvomaticWastageEntryItem[] =
            Array.isArray(rep.entries) && rep.entries.length > 0
              ? rep.entries.map((e: any, idx: number) =>
                  calculateValvomaticWastageRow({
                    ...e,
                    sequence: idx + 1,
                  })
                )
              : [];

          setEntries((prev) => {
            const reconciled = reconcileServerValvomaticWastageEntries({
              localEntries: prev,
              incomingEntries,
              focusedCell: activeFocusedCellRef.current,
              hasUnsavedLocalEdits: hasUnsavedLocalEditsRef.current,
              deletedEntryIds: deletedEntryIdsRef.current,
            });
            while (reconciled.length < 5) {
              reconciled.push(createEmptyWastageRow(reconciled.length + 1));
            }
            lastSavedPayloadRef.current = serializeValvomaticWastagePayload(rep, incomingEntries);
            return reconciled;
          });

          setLastSavedAt(format(new Date(rep.updatedAt || Date.now()), "hh:mm a"));
        } else {
          // No report yet
          if (!hasUnsavedLocalEditsRef.current) {
            setStatus("DRAFT");
            setRemarks("");
            setEntries([
              createEmptyWastageRow(1),
              createEmptyWastageRow(2),
              createEmptyWastageRow(3),
              createEmptyWastageRow(4),
              createEmptyWastageRow(5),
            ]);
            setLastSavedAt(null);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load Valvomatic wastage report");
    } finally {
      setLoading(false);
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 400);
    }
  }, [date, shiftName, machineNo, operatorName, supervisorName]);

  useEffect(() => {
    fetchWastageData();
  }, [fetchWastageData]);

  const realtime = useProductionRealtime({
    module: "valvomatic",
    sheet: "wastage",
    date,
    shift: shiftName,
    onSync: (event?: { clientId?: string | null }) => {
      // Echo suppression: Ignore notifications originating from this client session
      if (event?.clientId && event.clientId === realtime.clientId) return;
      if (Date.now() - lastUserEditTimeRef.current < 2500 && activeFocusedCellRef.current) return;
      fetchWastageData();
    },
  });

  // Catch-up upon tab wake-up (e.g., user returns after lock or tab switch)
  useEffect(() => {
    const handleVisibilityCatchup = () => {
      if (document.visibilityState === "visible") {
        fetchWastageData();
      }
    };
    const handleFocusCatchup = () => {
      fetchWastageData();
    };

    document.addEventListener("visibilitychange", handleVisibilityCatchup);
    window.addEventListener("focus", handleFocusCatchup);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityCatchup);
      window.removeEventListener("focus", handleFocusCatchup);
    };
  }, [fetchWastageData]);

  // Check if row has data
  const hasRowData = useCallback((e: ValvomaticWastageEntryItem) => {
    return Boolean(
      (e.quality && e.quality.trim()) ||
      (e.rollNumber && e.rollNumber.trim()) ||
      Number(e.productionKg) > 0 ||
      Number(e.loomWasteKg) > 0 ||
      Number(e.lamWasteKg) > 0 ||
      Number(e.printWasteKg) > 0 ||
      Number(e.machineWasteKg) > 0 ||
      Number(e.coverPatchWasteKg) > 0 ||
      (e.remarks && e.remarks.trim())
    );
  }, []);

  // Save handler
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

      if (targetStatus === "SUBMITTED" && filledEntries.length === 0) {
        toast.error("Please add at least one entry before submitting for approval");
        return;
      }

      if (!silent) setSaving(true);
      else setIsAutoSaving(true);
      setAutoSaveError(null);

      const newStatus = targetStatus || current.status;

      try {
        const payload = {
          date: current.date,
          shiftName: current.shiftName,
          machineNo: current.machineNo,
          operatorName: current.operatorName.trim() || undefined,
          supervisorName: current.supervisorName.trim() || undefined,
          status: newStatus,
          remarks: current.remarks.trim() || undefined,
          clientId: realtime.clientId,
          deletedEntryIds: Array.from(deletedEntryIdsRef.current),
          ...computeValvomaticWastageTotals(current.entries),
          entries: filledEntries.map((e, idx) => ({ ...e, sequence: idx + 1 })),
        };

        const res = await fetch("/api/production/valvomatic/wastage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save Valvomatic wastage report");
        }

        lastSavedPayloadRef.current = serializeValvomaticWastagePayload(current, filledEntries);
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
              ? "Valvomatic wastage report submitted successfully!"
              : "Valvomatic wastage report saved successfully"
          );
        }
      } catch (err: any) {
        console.error("Valvomatic wastage save error:", err);
        setAutoSaveError(err.message || "Auto-save failed");
        if (!silent) toast.error(err.message || "Failed to save Valvomatic wastage report");
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

  // 1-Click Sync Rolls from Daily Production
  const handleSyncFromDailyProduction = useCallback(() => {
    if (!linkedProductionEntries || linkedProductionEntries.length === 0) {
      toast.error("No daily production rolls found for this Date, Shift, and Machine.");
      return;
    }

    if (
      entries.some((e) => e.rollNumber || e.productionKg > 0) &&
      !confirm("Syncing will populate/merge rolls from Daily Production into this table. Proceed?")
    ) {
      return;
    }

    const synced = linkedProductionEntries.map((prod, idx) => {
      const existing = entries.find((e) => e.rollNumber === prod.rollNumber);
      return calculateValvomaticWastageRow({
        sequence: idx + 1,
        quality: prod.quality || existing?.quality || "Standard Quality",
        rollNumber: prod.rollNumber || "",
        productionKg: Number(prod.productionKg) || existing?.productionKg || 0,
        loomWasteKg: existing?.loomWasteKg || 0,
        lamWasteKg: existing?.lamWasteKg || 0,
        printWasteKg: existing?.printWasteKg || 0,
        machineWasteKg: existing?.machineWasteKg || 0,
        coverPatchWasteKg: existing?.coverPatchWasteKg || 0,
        remarks: existing?.remarks || "",
      });
    });

    while (synced.length < 5) {
      synced.push(createEmptyWastageRow(synced.length + 1));
    }

    setEntries(synced);
    markDirtyAndTriggerAutoSave();
    toast.success(`Synced ${linkedProductionEntries.length} rolls from Daily Production!`);
  }, [linkedProductionEntries, entries, markDirtyAndTriggerAutoSave]);

  // Cell edit
  const handleCellChange = useCallback(
    (
      index: number,
      field: keyof ValvomaticWastageEntryItem,
      value: any
    ) => {
      setEntries((prev) => {
        const next = [...prev];
        const updatedRow = { ...next[index], [field]: value };
        next[index] = calculateValvomaticWastageRow(updatedRow);
        return next;
      });
      markDirtyAndTriggerAutoSave();
    },
    [markDirtyAndTriggerAutoSave]
  );

  // Add row
  const handleAddRow = useCallback(() => {
    setEntries((prev) => [...prev, createEmptyWastageRow(prev.length + 1)]);
    markDirtyAndTriggerAutoSave();
  }, [markDirtyAndTriggerAutoSave]);

  // Add 5 rows
  const handleAdd5Rows = useCallback(() => {
    setEntries((prev) => {
      const start = prev.length + 1;
      return [
        ...prev,
        createEmptyWastageRow(start),
        createEmptyWastageRow(start + 1),
        createEmptyWastageRow(start + 2),
        createEmptyWastageRow(start + 3),
        createEmptyWastageRow(start + 4),
      ];
    });
    markDirtyAndTriggerAutoSave();
  }, [markDirtyAndTriggerAutoSave]);

  // Reset
  const handleResetToBlank = useCallback(() => {
    if (confirm("Reset wastage sheet to 5 blank rows? Unsaved changes will be discarded.")) {
      setEntries([
        createEmptyWastageRow(1),
        createEmptyWastageRow(2),
        createEmptyWastageRow(3),
        createEmptyWastageRow(4),
        createEmptyWastageRow(5),
      ]);
      setRemarks("");
      markDirtyAndTriggerAutoSave();
    }
  }, [markDirtyAndTriggerAutoSave]);

  // Delete row
  const handleDeleteRow = useCallback(
    (index: number) => {
      setEntries((prev) => {
        const target = prev[index];
        if (target?.id) {
          deletedEntryIdsRef.current.add(target.id);
        }
        if (target?.rollNumber?.trim()) {
          deletedEntryIdsRef.current.add(target.rollNumber.trim().toUpperCase());
        }
        const filtered = prev.filter((_, i) => i !== index);
        if (filtered.length === 0) {
          return [createEmptyWastageRow(1)];
        }
        return filtered.map((row, i) => ({ ...row, sequence: i + 1 }));
      });
      markDirtyAndTriggerAutoSave();
    },
    [markDirtyAndTriggerAutoSave]
  );

  // Totals
  const totals = useMemo(() => computeValvomaticWastageTotals(entries), [entries]);

  // Current full report data for print and export
  const currentReportData: ValvomaticWastageReportData = useMemo(() => {
    return {
      date,
      shiftName,
      machineNo,
      operatorName,
      supervisorName,
      status,
      remarks,
      ...totals,
      entries,
    };
  }, [date, shiftName, machineNo, operatorName, supervisorName, status, remarks, totals, entries]);

  return (
    <div
      className={`space-y-4 pb-16 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-100 p-4 overflow-y-auto"
          : "max-w-[100vw] overflow-x-hidden"
      }`}
    >
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 text-amber-700 rounded-lg">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
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
                  Valvomatic Machine Wastage Report
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Track roll-wise scrap: loom, lamination, printing, machine, &amp; cover patch wastage
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <RealtimeSyncBadge
              isConnected={realtime.isConnected}
              lastUpdatedBy={realtime.lastUpdatedBy}
              lastUpdatedAt={realtime.lastUpdatedAt}
              lastAction={realtime.lastAction}
              isSelfUpdate={realtime.isSelfUpdate}
            />

            {/* 1-Click Sync from Daily Production */}
            <button
              onClick={handleSyncFromDailyProduction}
              disabled={linkedProductionEntries.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 transition-colors shadow-2xs disabled:opacity-40"
              title="Populate roll numbers and production weights from saved daily report"
            >
              <ArrowDownToLine className="h-3.5 w-3.5 text-sky-600" />
              <span>Sync Rolls ({linkedProductionEntries.length})</span>
            </button>

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
              onClick={() => exportValvomaticWastageReportExcel(currentReportData)}
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

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
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
        </div>
      </div>

      {/* Aggregate KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Gross Prod</div>
          <div className="text-base font-black text-slate-900 font-mono mt-0.5">
            {totals.totalProductionKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Loom Waste</div>
          <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
            {totals.totalLoomWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Lam Waste</div>
          <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
            {totals.totalLamWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Print Waste</div>
          <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
            {totals.totalPrintWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Mach Waste</div>
          <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
            {totals.totalMachineWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-500">Cover Waste</div>
          <div className="text-sm font-black text-indigo-700 font-mono mt-0.5">
            {totals.totalCoverPatchWasteKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-rose-800">Total Waste</div>
          <div className="text-base font-black text-rose-700 font-mono mt-0.5">
            {totals.totalWastageKg.toFixed(1)}
          </div>
        </div>
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-emerald-800">Net Prod (Kg)</div>
          <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
            {totals.totalNetProductionKg.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Main Wastage Table Card */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Wastage Entries Breakdown Table
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              {entries.length} rolls
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

        {/* Scrollable Table Grid */}
        <div ref={tableContainerRef} className="overflow-x-auto max-h-[620px] relative">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap min-w-[1400px]">
            <thead className="bg-slate-100 text-slate-700 text-[11px] uppercase font-bold tracking-wider sticky top-0 z-10 border-b border-slate-300 shadow-2xs">
              <tr>
                <th rowSpan={2} className="p-2 border-r border-slate-200 text-center w-10">#</th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[170px] bg-amber-50/80 text-amber-950 font-black">
                  Quality Name
                </th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[130px] text-center bg-slate-200/80 font-black">
                  Roll No.
                </th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[110px] text-right bg-teal-50 text-teal-900 font-black">
                  Gross Prod (Kg)
                </th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Loom Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Lam Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Print Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Machine Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Cover Patch Waste</th>
                <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center bg-rose-50 text-rose-900 font-bold">
                  Total Wastage
                </th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[120px] text-right bg-emerald-50 text-emerald-900 font-black">
                  Net Prod (Kg)
                </th>
                <th rowSpan={2} className="p-2 border-r border-slate-200 min-w-[140px]">Remarks</th>
                <th rowSpan={2} className="p-2 text-center w-10">Action</th>
              </tr>
              <tr className="text-[10px] text-slate-600 bg-slate-100">
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[65px]">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[55px] text-[9px] text-slate-400">%</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[70px] bg-rose-50/80 text-rose-900 font-bold">Kg</th>
                <th className="p-1 border-r border-slate-200 text-right min-w-[60px] bg-rose-50/80 text-rose-800 text-[9px]">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={19} className="p-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading wastage data...
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => {
                  const rowKey = getValvomaticWastageRowKey(entry, index);
                  return (
                    <tr key={index} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-1 border-r border-slate-200 text-center font-bold text-slate-500 bg-slate-50/50">
                        {index + 1}
                      </td>

                      {/* Quality */}
                      <td className="p-1 border-r border-slate-200 bg-amber-50/40 min-w-[200px]">
                        <UniversalQualityInput
                          value={entry.quality || ""}
                          onChange={(newVal) => handleCellChange(index, "quality", newVal)}
                          onFocus={() => setFocusedCell(rowKey, "quality")}
                          onBlur={() => clearFocusedCell(rowKey, "quality")}
                          placeholder="— Quality —"
                          compact={true}
                          inputClassName="h-7 text-xs font-bold text-slate-900 border-amber-300"
                        />
                      </td>

                      {/* Roll No */}
                      <td className="p-1 border-r border-slate-200 bg-slate-50/50">
                        <input
                          type="text"
                          value={entry.rollNumber || ""}
                          onChange={(e) => handleCellChange(index, "rollNumber", e.target.value)}
                          onFocus={() => setFocusedCell(rowKey, "rollNumber")}
                          onBlur={() => clearFocusedCell(rowKey, "rollNumber")}
                          placeholder="Roll #"
                          className="w-full px-2 py-1 text-xs font-mono font-bold text-center border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent"
                        />
                      </td>

                      {/* Production (Kg) */}
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

                      {/* Loom Waste Kg & Pct */}
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.loomWasteKg || ""}
                          onChange={(e) =>
                            handleCellChange(index, "loomWasteKg", parseFloat(e.target.value) || 0)
                          }
                          onFocus={() => setFocusedCell(rowKey, "loomWasteKg")}
                          onBlur={() => clearFocusedCell(rowKey, "loomWasteKg")}
                          placeholder="0.00"
                          className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 px-1.5">
                        {entry.loomWastePct > 0 ? `${entry.loomWastePct.toFixed(1)}%` : "—"}
                      </td>

                      {/* Lam Waste Kg & Pct */}
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.lamWasteKg || ""}
                          onChange={(e) =>
                            handleCellChange(index, "lamWasteKg", parseFloat(e.target.value) || 0)
                          }
                          onFocus={() => setFocusedCell(rowKey, "lamWasteKg")}
                          onBlur={() => clearFocusedCell(rowKey, "lamWasteKg")}
                          placeholder="0.00"
                          className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 px-1.5">
                        {entry.lamWastePct > 0 ? `${entry.lamWastePct.toFixed(1)}%` : "—"}
                      </td>

                      {/* Print Waste Kg & Pct */}
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.printWasteKg || ""}
                          onChange={(e) =>
                            handleCellChange(index, "printWasteKg", parseFloat(e.target.value) || 0)
                          }
                          onFocus={() => setFocusedCell(rowKey, "printWasteKg")}
                          onBlur={() => clearFocusedCell(rowKey, "printWasteKg")}
                          placeholder="0.00"
                          className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 px-1.5">
                        {entry.printWastePct > 0 ? `${entry.printWastePct.toFixed(1)}%` : "—"}
                      </td>

                      {/* Machine Waste Kg & Pct */}
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.machineWasteKg || ""}
                          onChange={(e) =>
                            handleCellChange(index, "machineWasteKg", parseFloat(e.target.value) || 0)
                          }
                          onFocus={() => setFocusedCell(rowKey, "machineWasteKg")}
                          onBlur={() => clearFocusedCell(rowKey, "machineWasteKg")}
                          placeholder="0.00"
                          className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 px-1.5">
                        {entry.machineWastePct > 0 ? `${entry.machineWastePct.toFixed(1)}%` : "—"}
                      </td>

                      {/* Cover Patch Waste Kg & Pct */}
                      <td className="p-1 border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.coverPatchWasteKg || ""}
                          onChange={(e) =>
                            handleCellChange(index, "coverPatchWasteKg", parseFloat(e.target.value) || 0)
                          }
                          onFocus={() => setFocusedCell(rowKey, "coverPatchWasteKg")}
                          onBlur={() => clearFocusedCell(rowKey, "coverPatchWasteKg")}
                          placeholder="0.00"
                          className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-primary rounded focus:outline-hidden bg-transparent text-right font-mono text-indigo-700 font-semibold"
                        />
                      </td>
                      <td className="p-1 border-r border-slate-200 text-right font-mono text-[10px] text-indigo-500 px-1.5">
                        {entry.coverPatchWastePct > 0 ? `${entry.coverPatchWastePct.toFixed(1)}%` : "—"}
                      </td>

                      {/* Total Waste (Kg & %) Auto-calculated */}
                      <td className="p-1 border-r border-slate-200 bg-rose-50/60 text-right font-mono font-bold text-rose-700 px-2">
                        {entry.totalWasteKg > 0 ? entry.totalWasteKg.toFixed(2) : "0.00"}
                      </td>
                      <td className="p-1 border-r border-slate-200 bg-rose-50/40 text-right font-mono text-[10px] text-rose-600 px-1.5">
                        {entry.totalWastePct > 0 ? `${entry.totalWastePct.toFixed(1)}%` : "0.0%"}
                      </td>

                      {/* Net Production (Kg) Auto-calculated */}
                      <td className="p-1 border-r border-slate-200 bg-emerald-50/60 text-right font-mono font-black text-emerald-800 px-2">
                        {entry.netProductionKg > 0 ? entry.netProductionKg.toFixed(1) : "0.0"}
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

                      {/* Action */}
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
                <td colSpan={2} className="p-2 border-r border-slate-300 uppercase">
                  Wastage Totals
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-teal-800 bg-teal-100">
                  {totals.totalProductionKg.toFixed(1)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {totals.totalLoomWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-slate-500">
                  {totals.totalLoomWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {totals.totalLamWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-slate-500">
                  {totals.totalLamWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {totals.totalPrintWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-slate-500">
                  {totals.totalPrintWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono">
                  {totals.totalMachineWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-slate-500">
                  {totals.totalMachineWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-indigo-800">
                  {totals.totalCoverPatchWasteKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-[10px] text-indigo-600">
                  {totals.totalCoverPatchWastePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-rose-800 bg-rose-100">
                  {totals.totalWastageKg.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-rose-800 bg-rose-100 text-[10px]">
                  {totals.totalWastagePct.toFixed(1)}%
                </td>
                <td className="p-2 border-r border-slate-300 text-right font-mono text-emerald-800 bg-emerald-100">
                  {totals.totalNetProductionKg.toFixed(1)}
                </td>
                <td colSpan={2} className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Remarks Section */}
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
            Wastage Remarks / Scrap Observations / Recycling Route
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              markDirtyAndTriggerAutoSave();
            }}
            placeholder="Add any specific observations for this shift's scrap generation..."
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary bg-white"
          />
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncFromDailyProduction}
              disabled={linkedProductionEntries.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-300 text-xs font-semibold active:scale-95 transition-all"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Sync ({linkedProductionEntries.length})</span>
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={handleAdd5Rows}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold active:scale-95 transition-all"
            >
              <span>+5</span>
            </button>
            <button
              type="button"
              onClick={handleResetToBlank}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-rose-600 active:scale-95 transition-all"
              title="Reset"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="text-xs font-bold font-mono text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            {totals.totalWastageKg.toFixed(1)} kg waste
          </span>
        </div>

        {/* Mobile Cards List */}
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
              No wastage entries. Tap &quot;Sync&quot; or &quot;Add&quot; to begin.
            </div>
          ) : (
            entries.map((entry, index) => {
              const rowKey = getValvomaticWastageRowKey(entry, index);
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
                        {entry.rollNumber ? entry.rollNumber : `Roll ${index + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.totalWasteKg > 0 && (
                        <span className="text-xs font-black font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          {entry.totalWasteKg.toFixed(2)} kg ({entry.totalWastePct.toFixed(1)}%)
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
                    {/* Quality & Gross Prod */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Quality
                        </label>
                        <UniversalQualityInput
                          value={entry.quality || ""}
                          onChange={(newVal) => handleCellChange(index, "quality", newVal)}
                          onFocus={() => setFocusedCell(rowKey, "quality")}
                          onBlur={() => clearFocusedCell(rowKey, "quality")}
                          placeholder="Select quality..."
                          compact={false}
                          inputClassName="h-9 text-xs font-semibold"
                        />
                      </div>
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
                            placeholder="e.g. V-101"
                            className="w-full h-9 px-2.5 text-xs font-mono font-bold border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-teal-800 mb-0.5">
                            Gross Prod (Kg)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={entry.productionKg || ""}
                            onChange={(e) => handleCellChange(index, "productionKg", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "productionKg")}
                            onBlur={() => clearFocusedCell(rowKey, "productionKg")}
                            placeholder="0.0"
                            className="w-full h-9 px-2.5 text-xs font-mono font-black text-teal-900 bg-teal-50/40 border border-teal-200 rounded-md focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Scrap Streams Input Grid */}
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider block">
                        Scrap Streams (Kg)
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Loom Waste</span>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.loomWasteKg || ""}
                            onChange={(e) => handleCellChange(index, "loomWasteKg", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "loomWasteKg")}
                            onBlur={() => clearFocusedCell(rowKey, "loomWasteKg")}
                            placeholder="0.00"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-slate-200 rounded bg-white"
                          />
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                            {entry.loomWastePct > 0 ? `${entry.loomWastePct.toFixed(1)}%` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Lam Waste</span>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.lamWasteKg || ""}
                            onChange={(e) => handleCellChange(index, "lamWasteKg", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "lamWasteKg")}
                            onBlur={() => clearFocusedCell(rowKey, "lamWasteKg")}
                            placeholder="0.00"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-slate-200 rounded bg-white"
                          />
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                            {entry.lamWastePct > 0 ? `${entry.lamWastePct.toFixed(1)}%` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Print Waste</span>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.printWasteKg || ""}
                            onChange={(e) => handleCellChange(index, "printWasteKg", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "printWasteKg")}
                            onBlur={() => clearFocusedCell(rowKey, "printWasteKg")}
                            placeholder="0.00"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-slate-200 rounded bg-white"
                          />
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                            {entry.printWastePct > 0 ? `${entry.printWastePct.toFixed(1)}%` : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-slate-200/60">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-amber-700 block">Machine Waste</span>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.machineWasteKg || ""}
                            onChange={(e) => handleCellChange(index, "machineWasteKg", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "machineWasteKg")}
                            onBlur={() => clearFocusedCell(rowKey, "machineWasteKg")}
                            placeholder="0.00"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-amber-200 rounded bg-white text-amber-800"
                          />
                          <span className="text-[9px] text-amber-600 font-mono block mt-0.5">
                            {entry.machineWastePct > 0 ? `${entry.machineWastePct.toFixed(1)}%` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-indigo-700 block">Cover Patch Waste</span>
                          <input
                            type="number"
                            step="0.01"
                            value={entry.coverPatchWasteKg || ""}
                            onChange={(e) => handleCellChange(index, "coverPatchWasteKg", parseFloat(e.target.value) || 0)}
                            onFocus={() => setFocusedCell(rowKey, "coverPatchWasteKg")}
                            onBlur={() => clearFocusedCell(rowKey, "coverPatchWasteKg")}
                            placeholder="0.00"
                            className="w-full h-7 text-center font-mono font-bold text-xs border border-indigo-200 rounded bg-white text-indigo-800"
                          />
                          <span className="text-[9px] text-indigo-600 font-mono block mt-0.5">
                            {entry.coverPatchWastePct > 0 ? `${entry.coverPatchWastePct.toFixed(1)}%` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Waste & Net Yield Summary Pills */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Waste</span>
                          <span className="text-[10px] text-rose-600 font-mono">{entry.totalWastePct.toFixed(1)}% of prod</span>
                        </div>
                        <span className="font-mono font-black text-rose-800 text-sm">
                          {entry.totalWasteKg.toFixed(2)} kg
                        </span>
                      </div>
                      <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Net Good Prod</span>
                          <span className="text-[10px] text-emerald-600">Net yield</span>
                        </div>
                        <span className="font-mono font-black text-emerald-800 text-sm">
                          {entry.netProductionKg.toFixed(1)} kg
                        </span>
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
                        placeholder="Scrap observations or recycling notes..."
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
            Wastage Remarks / Scrap Observations / Recycling Route
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              markDirtyAndTriggerAutoSave();
            }}
            placeholder="Add any specific observations for this shift's scrap generation..."
            className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary bg-white"
          />
        </div>

        {/* Mobile Sticky Actions Bar */}
        <div className="sticky bottom-3 z-20 bg-slate-900 text-white rounded-2xl p-3 shadow-xl border border-slate-800 flex items-center justify-between gap-3">
          <div className="leading-tight">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Shift Scrap</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-black font-mono text-rose-400">
                {totals.totalWastageKg.toFixed(1)} <span className="text-xs font-normal">kg</span>
              </span>
              <span className="text-xs text-amber-300 font-mono">
                ({totals.totalWastagePct.toFixed(1)}%)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold ml-1">
                Net: {totals.totalNetProductionKg.toFixed(1)} kg
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

      {/* Formal Wastage Print Modal */}
      <ValvomaticWastagePrintModal
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        data={currentReportData}
      />
    </div>
  );
}
