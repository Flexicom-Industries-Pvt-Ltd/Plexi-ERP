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
  Calendar,
  Clock,
  User,
  Scale,
  Sparkles,
  FileCheck,
  AlertCircle,
  Download,
  ArrowDownToLine,
} from "lucide-react";
import {
  ConvertexWastageEntryItem,
  ConvertexWastageReportData,
  calculateConvertexWastageRow,
  computeConvertexWastageTotals,
} from "@/lib/convertex/convertex-types";
import dynamic from "next/dynamic";
import { exportConvertexWastageReportExcel } from "@/lib/convertex/convertex-export";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";
import { UniversalPersonnelInput } from "@/components/ui/UniversalPersonnelInput";
import { UniversalShiftSelector } from "@/components/production/UniversalShiftSelector";

const ConvertexWastagePrintModal = dynamic(
  () => import("./ConvertexWastagePrintModal").then((m) => m.ConvertexWastagePrintModal),
  { ssr: false }
);

function createEmptyWastageRow(sequence: number): ConvertexWastageEntryItem {
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

export function ConvertexWastageClient() {
  const [date, setDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [shiftName, setShiftName] = useState<string>("Day Shift");
  const [machineNo, setMachineNo] = useState<string>("Convertex-1");

  const [operatorName, setOperatorName] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [status, setStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [remarks, setRemarks] = useState<string>("");

  const [entries, setEntries] = useState<ConvertexWastageEntryItem[]>(() => [
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

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Fetch wastage report & linked production rolls
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    isInitialLoadRef.current = true;
    isDirtyRef.current = false;
    setAutoSaveError(null);

    try {
      const res = await fetch(
        `/api/production/convertex/wastage?date=${date}&shiftName=${encodeURIComponent(
          shiftName
        )}&machineNo=${encodeURIComponent(machineNo)}&_t=${Date.now()}`
      );
      const json = await res.json();

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

      if (json.success && json.report) {
        const rep = json.report;
        setStatus(rep.status || "DRAFT");
        if (rep.operatorName) setOperatorName(rep.operatorName);
        if (rep.supervisorName) setSupervisorName(rep.supervisorName);
        setRemarks(rep.remarks || "");

        if (Array.isArray(rep.entries) && rep.entries.length > 0) {
          const parsed = rep.entries.map((e: any, idx: number) =>
            calculateConvertexWastageRow({
              ...e,
              sequence: idx + 1,
            })
          );
          while (parsed.length < 5) {
            parsed.push(createEmptyWastageRow(parsed.length + 1));
          }
          setEntries(parsed);
        } else {
          setEntries([
            createEmptyWastageRow(1),
            createEmptyWastageRow(2),
            createEmptyWastageRow(3),
            createEmptyWastageRow(4),
            createEmptyWastageRow(5),
          ]);
        }
        setLastSavedAt(format(new Date(rep.updatedAt || Date.now()), "hh:mm a"));
      } else {
        // No wastage report saved yet
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
    } catch (err: any) {
      toast.error(err.message || "Failed to load Convertex wastage report");
    } finally {
      setLoading(false);
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 400);
    }
  }, [date, shiftName, machineNo, operatorName, supervisorName]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Import rolls from Daily Production
  const handleImportFromProduction = () => {
    if (linkedProductionEntries.length === 0) {
      toast.info("No production rolls found for this Date, Shift, and Machine.");
      return;
    }

    isDirtyRef.current = true;
    const importedRows = linkedProductionEntries.map((item, idx) =>
      calculateConvertexWastageRow({
        sequence: idx + 1,
        quality: item.quality || "Standard",
        rollNumber: item.rollNumber || "",
        productionKg: item.productionKg || 0,
        loomWasteKg: 0,
        lamWasteKg: 0,
        printWasteKg: 0,
        machineWasteKg: 0,
        coverPatchWasteKg: 0,
      })
    );

    while (importedRows.length < 5) {
      importedRows.push(createEmptyWastageRow(importedRows.length + 1));
    }

    setEntries(importedRows);
    toast.success(
      `Imported ${linkedProductionEntries.length} rolls from Daily Production Report!`
    );
  };

  // Cell change
  const handleCellChange = (
    index: number,
    field: keyof ConvertexWastageEntryItem,
    value: any
  ) => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      const next = [...prev];
      const updatedRow = { ...next[index], [field]: value };
      next[index] = calculateConvertexWastageRow(updatedRow);
      return next;
    });
  };

  // Add row
  const handleAddRow = () => {
    isDirtyRef.current = true;
    setEntries((prev) => [...prev, createEmptyWastageRow(prev.length + 1)]);
  };

  // Add 5 rows
  const handleAdd5Rows = () => {
    isDirtyRef.current = true;
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
  };

  // Reset to blank
  const handleResetToBlank = () => {
    if (confirm("Reset sheet to 5 blank rows? Unsaved changes will be discarded.")) {
      isDirtyRef.current = true;
      setEntries([
        createEmptyWastageRow(1),
        createEmptyWastageRow(2),
        createEmptyWastageRow(3),
        createEmptyWastageRow(4),
        createEmptyWastageRow(5),
      ]);
      setRemarks("");
    }
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    isDirtyRef.current = true;
    setEntries((prev) => {
      if (prev.length <= 1) {
        return [createEmptyWastageRow(1)];
      }
      return prev
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, sequence: i + 1 }));
    });
  };

  // Totals
  const totals = useMemo(() => computeConvertexWastageTotals(entries), [entries]);

  // Check if row has data
  const hasRowData = (e: ConvertexWastageEntryItem) => {
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
  };

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
        const payload: ConvertexWastageReportData = {
          date: current.date,
          shiftName: current.shiftName,
          machineNo: current.machineNo,
          operatorName: current.operatorName.trim() || undefined,
          supervisorName: current.supervisorName.trim() || undefined,
          status: newStatus,
          remarks: current.remarks.trim() || undefined,
          ...computeConvertexWastageTotals(current.entries),
          entries: filledEntries.map((e, idx) => ({ ...e, sequence: idx + 1 })),
        };

        const res = await fetch("/api/production/convertex/wastage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save Convertex wastage report");
        }

        setStatus(newStatus);
        setLastSavedAt(format(new Date(), "hh:mm:ss a"));
        isDirtyRef.current = false;

        if (!silent) {
          toast.success(
            newStatus === "SUBMITTED"
              ? "Convertex wastage report submitted successfully!"
              : "Convertex wastage report saved successfully"
          );
        }
      } catch (err: any) {
        console.error("Convertex wastage save error:", err);
        setAutoSaveError(err.message || "Auto-save failed");
        if (!silent) toast.error(err.message || "Failed to save Convertex wastage report");
      } finally {
        setSaving(false);
        setIsAutoSaving(false);
      }
    },
    []
  );

  // Debounced auto-save
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

  // Flush on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDirtyRef.current) {
        executeSave("DRAFT", true);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [executeSave]);

  const reportDataForPrint: ConvertexWastageReportData = useMemo(() => {
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
    <div className="space-y-5 font-sans pb-16">
      {/* Control Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                Wastage Accounting
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

              {/* Auto-Save Status */}
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
              Convertex Wastage Report
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {linkedProductionEntries.length > 0 && (
              <button
                type="button"
                onClick={handleImportFromProduction}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold shadow-xs transition-colors"
                title="Import rolls and production kg from Daily Production sheet"
              >
                <ArrowDownToLine className="w-4 h-4 text-primary" />
                Sync Rolls ({linkedProductionEntries.length})
              </button>
            )}

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
              onClick={() => exportConvertexWastageReportExcel(reportDataForPrint)}
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
              Submit Wastage
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
            <UniversalShiftSelector
              value={shiftName}
              onChange={(val) => {
                isDirtyRef.current = false;
                setShiftName(val);
              }}
              mode="byName"
              showIcon={false}
              selectClassName="px-3 py-1.5 border-slate-200"
            />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white border border-teal-200 bg-teal-50/20 rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-teal-700 tracking-wider">Prod (Kg)</div>
          <div className="text-lg font-bold font-mono text-teal-900 mt-1">{totals.totalProductionKg.toFixed(1)}</div>
          <div className="text-[9px] text-teal-600/80 mt-0.5">Input Wt</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-slate-600 tracking-wider">Loom Waste</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">{totals.totalLoomWasteKg.toFixed(1)}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{totals.totalLoomWastePct.toFixed(2)}%</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-slate-600 tracking-wider">Lam Waste</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">{totals.totalLamWasteKg.toFixed(1)}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{totals.totalLamWastePct.toFixed(2)}%</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-slate-600 tracking-wider">Print Waste</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">{totals.totalPrintWasteKg.toFixed(1)}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{totals.totalPrintWastePct.toFixed(2)}%</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-slate-600 tracking-wider">Machine Waste</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">{totals.totalMachineWasteKg.toFixed(1)}</div>
          <div className="text-[9px] text-slate-400 mt-0.5">{totals.totalMachineWastePct.toFixed(2)}%</div>
        </div>

        <div className="bg-white border border-indigo-200 bg-indigo-50/20 rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-indigo-700 tracking-wider">Cover Patch Wst</div>
          <div className="text-lg font-bold font-mono text-indigo-900 mt-1">{totals.totalCoverPatchWasteKg.toFixed(1)}</div>
          <div className="text-[9px] text-indigo-600 mt-0.5">{totals.totalCoverPatchWastePct.toFixed(2)}%</div>
        </div>

        <div className="bg-white border border-rose-200 bg-rose-50/25 rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-rose-700 tracking-wider">Total Waste</div>
          <div className="text-lg font-bold font-mono text-rose-900 mt-1">{totals.totalWastageKg.toFixed(1)}</div>
          <div className="text-[9px] text-rose-600 font-bold mt-0.5">{totals.totalWastagePct.toFixed(2)}%</div>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/25 rounded-xl p-3 shadow-xs">
          <div className="text-[10px] font-semibold uppercase text-emerald-700 tracking-wider">Net Prod (Kg)</div>
          <div className="text-lg font-bold font-mono text-emerald-900 mt-1">{totals.totalNetProductionKg.toFixed(1)}</div>
          <div className="text-[9px] text-emerald-600/80 mt-0.5">Finished Wt</div>
        </div>
      </div>

      {/* Spreadsheet Table Container (Desktop: hidden md:flex) */}
      <div
        ref={tableContainerRef}
        className={`hidden md:flex bg-white border border-slate-200 shadow-sm transition-all duration-200 flex-col ${
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
              title={isFullscreen ? "Collapse view (Esc)" : "Expand view"}
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
              {entries.length} {entries.length === 1 ? "roll" : "rolls"}
            </span>
            <span>•</span>
            <span className="text-rose-700 font-bold">
              Total Waste: {totals.totalWastageKg.toFixed(1)} kg ({totals.totalWastagePct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto flex-1 max-h-[680px]">
          <table className="w-full text-left text-xs border-collapse min-w-[2100px]">
            <thead className="bg-slate-900 text-white font-semibold text-[11px] sticky top-0 z-10 uppercase tracking-wider">
              <tr>
                <th rowSpan={2} className="py-2 px-2 text-center w-12 border-r border-slate-800">Sl. No.</th>
                <th rowSpan={2} className="py-2 px-2 text-left w-44 border-r border-slate-800 bg-slate-800 text-amber-300">Quality</th>
                <th rowSpan={2} className="py-2 px-2 text-center w-36 border-r border-slate-800">Roll Number</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-32 border-r border-slate-800 bg-teal-950 text-teal-300">Production (Kg)</th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-800 bg-sky-950">Loom Wastage</th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-800 bg-cyan-950">Lam Wastage</th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-800 bg-indigo-950">Print Wastage</th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-800 bg-amber-950">Machine Wastage</th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-800 bg-purple-950">Cover Patch Wastage</th>
                <th colSpan={2} className="py-1 px-2 text-center border-r border-slate-800 bg-red-950 text-red-300">Total Waste</th>
                <th rowSpan={2} className="py-2 px-2 text-right w-32 border-r border-slate-800 bg-emerald-950 text-emerald-300">Net Prod (Kg)</th>
                <th rowSpan={2} className="py-2 px-2 text-left min-w-[140px] border-r border-slate-800">Remarks</th>
                <th rowSpan={2} className="py-2 px-2 text-center w-12">Act</th>
              </tr>
              <tr>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-800 bg-sky-900/90 text-[10px]">Kg</th>
                <th className="py-1 px-2 text-right w-16 border-r border-slate-800 bg-sky-900/90 text-[10px]">%</th>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-800 bg-cyan-900/90 text-[10px]">Kg</th>
                <th className="py-1 px-2 text-right w-16 border-r border-slate-800 bg-cyan-900/90 text-[10px]">%</th>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-800 bg-indigo-900/90 text-[10px]">Kg</th>
                <th className="py-1 px-2 text-right w-16 border-r border-slate-800 bg-indigo-900/90 text-[10px]">%</th>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-800 bg-amber-900/90 text-[10px]">Kg</th>
                <th className="py-1 px-2 text-right w-16 border-r border-slate-800 bg-amber-900/90 text-[10px]">%</th>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-800 bg-purple-900/90 text-[10px]">Kg</th>
                <th className="py-1 px-2 text-right w-16 border-r border-slate-800 bg-purple-900/90 text-[10px]">%</th>
                <th className="py-1 px-2 text-right w-24 border-r border-slate-800 bg-red-900/90 text-[10px]">Kg</th>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-800 bg-red-900/90 text-[10px]">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {entries.map((entry, index) => (
                <tr
                  key={index}
                  className={`hover:bg-rose-50/30 transition-colors ${
                    index % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                  }`}
                >
                  {/* Sequence */}
                  <td className="py-1.5 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                    {entry.sequence}
                  </td>

                  {/* Quality */}
                  <td className="py-1 px-1 border-r border-slate-200 bg-amber-50/20 min-w-[200px]">
                    <UniversalQualityInput
                      value={entry.quality}
                      onChange={(newVal) => handleCellChange(index, "quality", newVal)}
                      placeholder="— Quality —"
                      compact={true}
                      inputClassName="h-7 text-xs font-semibold text-slate-800"
                    />
                  </td>

                  {/* Roll Number */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={entry.rollNumber}
                      onChange={(e) => handleCellChange(index, "rollNumber", e.target.value)}
                      placeholder="e.g. D14332"
                      className="w-full px-2 py-1 text-xs font-mono font-bold text-slate-900 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>

                  {/* Production in Kg */}
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

                  {/* Loom Wastage in Kg */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.loomWasteKg || ""}
                      onChange={(e) => handleCellChange(index, "loomWasteKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>
                  {/* Loom Wastage % */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 bg-slate-50/50">
                    {entry.loomWastePct ? `${entry.loomWastePct.toFixed(2)}%` : "—"}
                  </td>

                  {/* Lam Wastage in Kg */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.lamWasteKg || ""}
                      onChange={(e) => handleCellChange(index, "lamWasteKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>
                  {/* Lam Wastage % */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 bg-slate-50/50">
                    {entry.lamWastePct ? `${entry.lamWastePct.toFixed(2)}%` : "—"}
                  </td>

                  {/* Print Wastage in Kg */}
                  <td className="py-1 px-1 border-r border-slate-200">
                    <input
                      type="number"
                      step="any"
                      value={entry.printWasteKg || ""}
                      onChange={(e) => handleCellChange(index, "printWasteKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-slate-700 border border-transparent hover:border-slate-300 focus:border-primary focus:bg-white rounded transition-colors"
                    />
                  </td>
                  {/* Print Wastage % */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 bg-slate-50/50">
                    {entry.printWastePct ? `${entry.printWastePct.toFixed(2)}%` : "—"}
                  </td>

                  {/* Machine Wastage in Kg */}
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
                  {/* Machine Wastage % */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-[10px] text-slate-500 bg-slate-50/50">
                    {entry.machineWastePct ? `${entry.machineWastePct.toFixed(2)}%` : "—"}
                  </td>

                  {/* Cover Patch Wastage in Kg */}
                  <td className="py-1 px-1 border-r border-slate-200 bg-purple-50/15">
                    <input
                      type="number"
                      step="any"
                      value={entry.coverPatchWasteKg || ""}
                      onChange={(e) => handleCellChange(index, "coverPatchWasteKg", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-xs text-right font-mono text-purple-800 border border-transparent hover:border-purple-300 focus:border-purple-500 rounded transition-colors"
                    />
                  </td>
                  {/* Cover Patch Wastage % */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono text-[10px] text-purple-700 bg-purple-50/30">
                    {entry.coverPatchWastePct ? `${entry.coverPatchWastePct.toFixed(2)}%` : "—"}
                  </td>

                  {/* Total Waste (Kg) */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold text-red-700 bg-red-50/25">
                    {entry.totalWasteKg ? entry.totalWasteKg.toFixed(2) : "0.00"}
                  </td>
                  {/* Total Waste (%) */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold text-amber-700 bg-amber-50/25">
                    {entry.totalWastePct ? `${entry.totalWastePct.toFixed(2)}%` : "0.00%"}
                  </td>

                  {/* Net Production (Kg) */}
                  <td className="py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-800 bg-emerald-50/25">
                    {entry.netProductionKg ? entry.netProductionKg.toFixed(1) : "0.0"}
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

            {/* Totals Summary Footer */}
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900 sticky bottom-0 z-10 text-xs">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px] tracking-wider">
                  TOTALS ({entries.length} ROLLS):
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-teal-800 bg-teal-100/60 font-black text-sm">
                  {totals.totalProductionKg > 0 ? totals.totalProductionKg.toFixed(1) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                  {totals.totalLoomWasteKg > 0 ? totals.totalLoomWasteKg.toFixed(2) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-500 text-[10px]">
                  {totals.totalLoomWastePct > 0 ? `${totals.totalLoomWastePct.toFixed(2)}%` : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                  {totals.totalLamWasteKg > 0 ? totals.totalLamWasteKg.toFixed(2) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-500 text-[10px]">
                  {totals.totalLamWastePct > 0 ? `${totals.totalLamWastePct.toFixed(2)}%` : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                  {totals.totalPrintWasteKg > 0 ? totals.totalPrintWasteKg.toFixed(2) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-500 text-[10px]">
                  {totals.totalPrintWastePct > 0 ? `${totals.totalPrintWastePct.toFixed(2)}%` : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                  {totals.totalMachineWasteKg > 0 ? totals.totalMachineWasteKg.toFixed(2) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-slate-500 text-[10px]">
                  {totals.totalMachineWastePct > 0 ? `${totals.totalMachineWastePct.toFixed(2)}%` : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-purple-800">
                  {totals.totalCoverPatchWasteKg > 0 ? totals.totalCoverPatchWasteKg.toFixed(2) : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-purple-700 text-[10px]">
                  {totals.totalCoverPatchWastePct > 0 ? `${totals.totalCoverPatchWastePct.toFixed(2)}%` : "—"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-red-800 bg-red-100/60 font-black text-sm">
                  {totals.totalWastageKg > 0 ? totals.totalWastageKg.toFixed(2) : "0.00"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-amber-800 bg-amber-100/60 font-black text-sm">
                  {totals.totalWastagePct > 0 ? `${totals.totalWastagePct.toFixed(2)}%` : "0.00%"}
                </td>
                <td className="py-2.5 px-2 text-right font-mono text-emerald-800 bg-emerald-100/60 font-black text-sm">
                  {totals.totalNetProductionKg > 0 ? totals.totalNetProductionKg.toFixed(1) : "—"}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE TOUCH FEED (<md) - ZERO DESKTOP REGRESSION                        */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4">
        {/* Mobile Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Row</span>
            </button>
            <button
              type="button"
              onClick={handleAdd5Rows}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5 text-slate-400" />
              <span>+5</span>
            </button>
            <button
              type="button"
              onClick={handleResetToBlank}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-rose-600 active:scale-95 transition-all"
              title="Reset blank"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {linkedProductionEntries.length > 0 && (
              <button
                type="button"
                onClick={handleImportFromProduction}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-bold"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Sync ({linkedProductionEntries.length})</span>
              </button>
            )}
            <span className="text-xs font-bold font-mono text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              {totals.totalWastagePct.toFixed(2)}% Waste
            </span>
          </div>
        </div>

        {/* Mobile Cards List */}
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-xs">
              No wastage entries recorded. Tap &quot;Add Row&quot; or &quot;Sync&quot; from daily report.
            </div>
          ) : (
            entries.map((entry, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden"
              >
                {/* Card Header Strip */}
                <div className="bg-slate-50/90 px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                      {entry.sequence}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {entry.rollNumber ? entry.rollNumber : `Roll ${index + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black font-mono px-2 py-0.5 rounded-md border ${
                        entry.totalWastePct <= 1.5
                          ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                          : entry.totalWastePct <= 3.0
                          ? "text-amber-800 bg-amber-50 border-amber-200"
                          : "text-rose-800 bg-rose-50 border-rose-200"
                      }`}
                    >
                      {entry.totalWastePct.toFixed(2)}% Scrap
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded active:scale-90 transition-all"
                      title="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-3.5 space-y-3 text-xs">
                  {/* Quality & Roll No */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Quality
                      </label>
                      <UniversalQualityInput
                        value={entry.quality}
                        onChange={(newVal) => handleCellChange(index, "quality", newVal)}
                        placeholder="Select quality..."
                        compact={false}
                        inputClassName="h-9 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        value={entry.rollNumber}
                        onChange={(e) => handleCellChange(index, "rollNumber", e.target.value)}
                        placeholder="e.g. D14332"
                        className="w-full h-8 px-2.5 text-xs font-mono font-bold border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Production Weights: Input Wt vs Finished Wt */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-teal-50/50 p-2.5 rounded-lg border border-teal-200">
                      <label className="block text-[10px] font-bold text-teal-800 uppercase mb-0.5">
                        Production Input (Kg)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={entry.productionKg || ""}
                        onChange={(e) => handleCellChange(index, "productionKg", e.target.value)}
                        placeholder="0.00"
                        className="w-full h-8 px-2 font-mono font-black text-sm text-teal-900 bg-white border border-teal-300 rounded focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                        Net Output (Kg)
                      </span>
                      <span className="font-mono font-black text-base text-emerald-900">
                        {entry.netProductionKg ? entry.netProductionKg.toFixed(1) : "0.0"}{" "}
                        <span className="text-[10px] font-normal text-slate-500">kg</span>
                      </span>
                    </div>
                  </div>

                  {/* Breakdown Wastage Inputs */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-600 tracking-wider block">
                      Wastage Breakdown Categories (Kg)
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Loom Waste */}
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Loom Waste</span>
                          <span className="font-mono text-slate-400">{entry.loomWastePct.toFixed(2)}%</span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={entry.loomWasteKg || ""}
                          onChange={(e) => handleCellChange(index, "loomWasteKg", e.target.value)}
                          placeholder="0.00"
                          className="w-full h-7 text-xs font-mono font-bold text-slate-800 border-0 p-0 focus:ring-0"
                        />
                      </div>

                      {/* Lam Waste */}
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Lam Waste</span>
                          <span className="font-mono text-slate-400">{entry.lamWastePct.toFixed(2)}%</span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={entry.lamWasteKg || ""}
                          onChange={(e) => handleCellChange(index, "lamWasteKg", e.target.value)}
                          placeholder="0.00"
                          className="w-full h-7 text-xs font-mono font-bold text-slate-800 border-0 p-0 focus:ring-0"
                        />
                      </div>

                      {/* Print Waste */}
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Print Waste</span>
                          <span className="font-mono text-slate-400">{entry.printWastePct.toFixed(2)}%</span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={entry.printWasteKg || ""}
                          onChange={(e) => handleCellChange(index, "printWasteKg", e.target.value)}
                          placeholder="0.00"
                          className="w-full h-7 text-xs font-mono font-bold text-slate-800 border-0 p-0 focus:ring-0"
                        />
                      </div>

                      {/* Machine Waste */}
                      <div className="bg-white p-2 rounded border border-slate-200">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Machine Waste</span>
                          <span className="font-mono text-slate-400">{entry.machineWastePct.toFixed(2)}%</span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={entry.machineWasteKg || ""}
                          onChange={(e) => handleCellChange(index, "machineWasteKg", e.target.value)}
                          placeholder="0.00"
                          className="w-full h-7 text-xs font-mono font-bold text-slate-800 border-0 p-0 focus:ring-0"
                        />
                      </div>
                    </div>

                    {/* Cover Patch Wastage */}
                    <div className="bg-purple-50/40 p-2 rounded border border-purple-200">
                      <div className="flex items-center justify-between text-[10px] text-purple-700 mb-0.5">
                        <span className="font-bold">Cover Patch Waste</span>
                        <span className="font-mono">{entry.coverPatchWastePct.toFixed(2)}%</span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        value={entry.coverPatchWasteKg || ""}
                        onChange={(e) => handleCellChange(index, "coverPatchWasteKg", e.target.value)}
                        placeholder="0.00"
                        className="w-full h-7 text-xs font-mono font-bold text-purple-900 bg-transparent border-0 p-0 focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Total Roll Scrap Summary Strip */}
                  <div className="p-2 rounded-lg bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-800">Roll Total Wastage:</span>
                    <span className="text-sm font-black font-mono text-rose-900">
                      {entry.totalWasteKg ? entry.totalWasteKg.toFixed(2) : "0.00"} kg{" "}
                      <span className="text-xs text-rose-600 font-semibold">
                        ({entry.totalWastePct ? entry.totalWastePct.toFixed(2) : "0.00"}%)
                      </span>
                    </span>
                  </div>

                  {/* Remarks Input */}
                  <div>
                    <input
                      type="text"
                      value={entry.remarks || ""}
                      onChange={(e) => handleCellChange(index, "remarks", e.target.value)}
                      placeholder="Scrap rationale or defect notes..."
                      className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Mobile Sticky Action Bar */}
        <div className="sticky bottom-3 z-20 bg-slate-900 text-white rounded-2xl p-3 shadow-xl border border-slate-800 flex items-center justify-between gap-3">
          <div className="leading-tight">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Shift Scrap</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-black font-mono text-rose-400">
                {totals.totalWastageKg.toFixed(1)} <span className="text-xs font-normal">kg</span>
              </span>
              <span className="text-xs text-amber-300 font-bold font-mono">
                ({totals.totalWastagePct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="h-9 px-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={() => executeSave("SUBMITTED")}
              disabled={saving}
              className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-white text-slate-900 text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
              <span>Submit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
          Wastage Remarks & Observations
        </label>
        <textarea
          rows={2}
          value={remarks}
          onChange={(e) => {
            isDirtyRef.current = true;
            setRemarks(e.target.value);
          }}
          placeholder="Record scrap causes, quality defects, machine breakdown waste notes..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      {/* Print Modal */}
      {isPrintModalOpen && (
        <ConvertexWastagePrintModal
          open={isPrintModalOpen}
          onOpenChange={setIsPrintModalOpen}
          data={reportDataForPrint}
        />
      )}
    </div>
  );
}
