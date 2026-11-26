"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { format, addDays, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  Printer,
  FileSpreadsheet,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Loader2,
  Calendar,
  Factory,
  AlertTriangle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RpProductionReportData,
  RpProductionRow,
  createBlankRpRow,
  createDefaultRpProductionReport,
  recalculateRpProductionReport,
  round2,
  safeNum,
} from "@/lib/recycling/rp-types";
import { UniversalPersonnelInput } from "@/components/ui/UniversalPersonnelInput";
import { exportRpProductionExcel } from "@/lib/recycling/rp-export";
import { useProductionRealtime } from "@/hooks/useProductionRealtime";
import { RealtimeSyncBadge } from "@/components/production/RealtimeSyncBadge";
import { NumericCellInput } from "./NumericCellInput";

const RpPrintPreviewModal = dynamic(
  () => import("./RpPrintPreviewModal").then((m) => m.RpPrintPreviewModal),
  { ssr: false }
);

export function RpProductionSheet() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [report, setReport] = useState<RpProductionReportData>(() =>
    createDefaultRpProductionReport(initialDate, ["Day Shift", "Night Shift"], 1)
  );
  const [prevMonthBaseline, setPrevMonthBaseline] =
    useState<RpProductionReportData | null>(null);
  const [previousDateCarried, setPreviousDateCarried] = useState<string | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Auto-save & typing isolation refs
  const isInitialLoadedRef = useRef(false);
  const lastSavedPayloadRef = useRef("");
  const lastUserEditTimeRef = useRef(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const paramDate = searchParams.get("date");
    if (paramDate && paramDate !== selectedDate) {
      setSelectedDate(paramDate);
    }
  }, [searchParams, selectedDate]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const fetchReport = useCallback(async (targetDate: string, silent = false) => {
    if (!silent) {
      isInitialLoadedRef.current = false;
      setIsLoading(true);
    }
    try {
      const res = await fetch(
        `/api/production/recycling-plant/production?date=${encodeURIComponent(
          targetDate
        )}&_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        }
      );
      const json = await res.json();
      if (json.success && json.report) {
        const activeShifts = Array.isArray(json.activeShifts)
          ? json.activeShifts
          : ["Day Shift", "Night Shift"];
        const hydrated = recalculateRpProductionReport(json.report, activeShifts);
        setReport(hydrated);
        setMigrationPending(Boolean(json.migrationPending));
        setPreviousDateCarried(json.previousDate || null);
        setPrevMonthBaseline(
          json.prevMonthReport
            ? recalculateRpProductionReport(json.prevMonthReport, activeShifts)
            : null
        );
        lastSavedPayloadRef.current = JSON.stringify(hydrated);
      } else {
        toast.error(json.error || "Failed to load RP Plant Production Report");
      }
    } catch {
      toast.error("Network error loading RP Plant Production Report");
    } finally {
      if (!silent) setIsLoading(false);
      isInitialLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate, fetchReport]);

  // Catch-up sync on focus/visibility
  useEffect(() => {
    const onFocusOrVisible = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        Date.now() - lastUserEditTimeRef.current >= 2500
      ) {
        fetchReport(selectedDate, true);
      }
    };
    document.addEventListener("visibilitychange", onFocusOrVisible);
    window.addEventListener("focus", onFocusOrVisible);
    return () => {
      document.removeEventListener("visibilitychange", onFocusOrVisible);
      window.removeEventListener("focus", onFocusOrVisible);
    };
  }, [selectedDate, fetchReport]);

  const realtime = useProductionRealtime({
    module: "recycling-plant",
    sheet: "production",
    date: selectedDate,
    onSync: (event) => {
      if (!selectedDate || isAutoSaving) return;
      if (event?.clientId && event.clientId === realtime.clientId) return;
      if (Date.now() - lastUserEditTimeRef.current >= 2500) {
        fetchReport(selectedDate, true);
      }
    },
  });

  // Debounced auto-save (1500ms)
  useEffect(() => {
    if (!isInitialLoadedRef.current || migrationPending || isLoading) return;

    const calculated = recalculateRpProductionReport(report, report.shiftNames);
    const payloadStr = JSON.stringify(calculated);
    if (payloadStr === lastSavedPayloadRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const res = await fetch("/api/production/recycling-plant/production", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...calculated, clientId: realtime.clientId }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          lastSavedPayloadRef.current = payloadStr;
          setLastAutoSavedAt(new Date());
          realtime.broadcastSync({
            action: calculated.status === "SUBMITTED" ? "SUBMIT" : "SAVE",
            date: selectedDate,
          });
        }
      } catch (err) {
        console.error("RP Production auto-save failed:", err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [report, migrationPending, isLoading, selectedDate, realtime]);

  const markEdited = () => {
    lastUserEditTimeRef.current = Date.now();
  };

  const shiftDate = (delta: number) => {
    setSelectedDate(format(addDays(parseISO(selectedDate), delta), "yyyy-MM-dd"));
  };

  const findPrevMonthRow = (row: RpProductionRow): RpProductionRow | undefined => {
    if (!prevMonthBaseline) return undefined;
    return prevMonthBaseline.rows.find(
      (pr) =>
        pr.id === row.id ||
        (row.particular.trim() !== "" &&
          pr.particular.toUpperCase() === row.particular.toUpperCase() &&
          (pr.color || "").toUpperCase() === (row.color || "").toUpperCase())
    );
  };

  const updateShiftProduction = (rowId: string, shiftName: string, val: number) => {
    markEdited();
    setReport((prev) => {
      const rows = prev.rows.map((r) => {
        if (r.id !== rowId) return r;
        const updatedShifts = { ...r.productionShifts, [shiftName]: val };
        const newProdTotal = round2(
          prev.shiftNames.reduce((acc, s) => acc + safeNum(updatedShifts[s]), 0)
        );
        const prevRow = findPrevMonthRow(r);
        return {
          ...r,
          productionShifts: updatedShifts,
          productionMtd: prevRow
            ? round2(prevRow.productionMtd + newProdTotal)
            : r.productionMtd,
        };
      });
      return recalculateRpProductionReport({ ...prev, rows }, prev.shiftNames);
    });
  };

  const updateRowField = (
    rowId: string,
    field:
      | "openingStock"
      | "productionMtd"
      | "issuedToTapePlant"
      | "issuedToTapePlantMtd"
      | "lumpsOnDate"
      | "lumpsMtd"
      | "dispatchOnDate"
      | "dispatchMtd",
    val: number
  ) => {
    markEdited();
    setReport((prev) => {
      const rows = prev.rows.map((r) => {
        if (r.id !== rowId) return r;
        const prevRow = findPrevMonthRow(r);
        const updated: RpProductionRow = { ...r, [field]: val };

        if (field === "issuedToTapePlant" && prevRow) {
          updated.issuedToTapePlantMtd = round2(prevRow.issuedToTapePlantMtd + val);
        } else if (field === "lumpsOnDate" && prevRow) {
          updated.lumpsMtd = round2(prevRow.lumpsMtd + val);
        } else if (field === "dispatchOnDate" && prevRow) {
          updated.dispatchMtd = round2(prevRow.dispatchMtd + val);
        }

        return updated;
      });
      return recalculateRpProductionReport({ ...prev, rows }, prev.shiftNames);
    });
  };

  const updateRowText = (
    rowId: string,
    field: "particular" | "color" | "remarks",
    val: string
  ) => {
    markEdited();
    setReport((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === rowId ? { ...r, [field]: val } : r)),
    }));
  };

  const handleAddBlankRow = () => {
    markEdited();
    setReport((prev) => {
      const newRow = createBlankRpRow(prev.rows.length + 1, prev.shiftNames);
      return recalculateRpProductionReport(
        { ...prev, rows: [...prev.rows, newRow] },
        prev.shiftNames
      );
    });
  };

  const handleRemoveRow = (rowId: string) => {
    markEdited();
    setReport((prev) => {
      const remaining = prev.rows.filter((r) => r.id !== rowId);
      const nextRows =
        remaining.length > 0
          ? remaining
          : [createBlankRpRow(1, prev.shiftNames, "rp-row-1")];
      return recalculateRpProductionReport({ ...prev, rows: nextRows }, prev.shiftNames);
    });
  };

  const handleSave = async (
    targetStatus: "DRAFT" | "SUBMITTED" = report.status === "SUBMITTED"
      ? "SUBMITTED"
      : "DRAFT"
  ) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setIsSaving(true);
    try {
      const payload = recalculateRpProductionReport(
        { ...report, status: targetStatus },
        report.shiftNames
      );
      const res = await fetch("/api/production/recycling-plant/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, clientId: realtime.clientId }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.report) {
        const saved = recalculateRpProductionReport(json.report, report.shiftNames);
        setReport(saved);
        lastSavedPayloadRef.current = JSON.stringify(saved);
        setLastAutoSavedAt(new Date());
        realtime.broadcastSync({
          action: targetStatus === "SUBMITTED" ? "SUBMIT" : "SAVE",
          date: selectedDate,
        });
        toast.success(
          targetStatus === "SUBMITTED"
            ? "R.P. Plant Production Report submitted"
            : "Draft saved"
        );
      } else {
        toast.error(json.error || "Failed to save report");
      }
    } catch {
      toast.error("Network error saving report");
    } finally {
      setIsSaving(false);
    }
  };

  const shifts = report.shiftNames;

  return (
    <div
      className={cn(
        "space-y-4 font-sans pb-16 max-w-[1600px] mx-auto",
        isFullscreen &&
          "fixed inset-0 z-50 bg-slate-50 p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      )}
    >
      {/* Standard ERP Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 shrink-0">
            <Factory className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                R.P. Plant Production Report
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold uppercase",
                  report.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : report.status === "SUBMITTED"
                    ? "bg-sky-50 text-sky-700 border-sky-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {report.status}
              </Badge>
              {isAutoSaving ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Auto-saving...
                </span>
              ) : lastAutoSavedAt ? (
                <span className="text-[11px] text-slate-400">
                  Saved {format(lastAutoSavedAt, "hh:mm a")}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily RP granule production, issuance to Tape Plant &amp; closing stock ledger
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <RealtimeSyncBadge
            isConnected={realtime.isConnected}
            lastUpdatedBy={realtime.lastUpdatedBy}
            lastUpdatedAt={realtime.lastUpdatedAt}
            lastAction={realtime.lastAction}
            isSelfUpdate={realtime.isSelfUpdate}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportRpProductionExcel(report)}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50 touch-manipulation"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            <span className="hidden sm:inline">Excel Export</span>
            <span className="sm:hidden">Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50 touch-manipulation"
          >
            <Printer className="h-4 w-4 mr-1.5 text-sky-600" />
            <span className="hidden sm:inline">Print Report</span>
            <span className="sm:hidden">Print</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isSaving || isLoading}
            onClick={() => handleSave("DRAFT")}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50 touch-manipulation"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save Draft
          </Button>

          <Button
            size="sm"
            disabled={isSaving || isLoading}
            onClick={() => handleSave("SUBMITTED")}
            className="h-9 text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-xs touch-manipulation"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Submit Report
          </Button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer touch-manipulation"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Pending Migration Banner */}
      {migrationPending && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Database migration pending:</strong> Run{" "}
            <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono">
              npx prisma migrate deploy
            </code>{" "}
            so saved R.P. Plant Production reports can persist to PostgreSQL.
          </div>
        </div>
      )}

      {/* Metadata Control Card */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Date
            </label>
            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/70 overflow-hidden h-9">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="px-2.5 h-full hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer touch-manipulation"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="flex-1 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none text-center px-1"
              />
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="px-2.5 h-full hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer touch-manipulation"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Sr. No.
            </label>
            <Input
              type="number"
              min={1}
              value={report.serialNo}
              onChange={(e) => {
                markEdited();
                setReport((prev) => ({
                  ...prev,
                  serialNo: Math.max(1, parseInt(e.target.value, 10) || 1),
                }));
              }}
              className="h-9 text-xs font-mono font-bold text-rose-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Operator
            </label>
            <UniversalPersonnelInput
              value={report.operatorName}
              onChange={(name, item) => {
                markEdited();
                setReport((prev) => ({
                  ...prev,
                  operatorName: name,
                  operatorId: item?.id || null,
                }));
              }}
              type="operator"
              placeholder="Operator name"
              inputClassName="h-9"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 block">
              Active Shifts (Shift Master)
            </label>
            <div className="h-9 px-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center gap-1.5 overflow-x-auto">
              {shifts.map((s) => (
                <span
                  key={s}
                  className="text-[11px] font-medium px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap"
                >
                  {s}
                </span>
              ))}
              {previousDateCarried && !report.id && (
                <span className="text-[10px] text-slate-400 ml-auto whitespace-nowrap">
                  From {previousDateCarried}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System-Themed 4-Metric KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs">
          <span className="text-xs font-medium text-slate-500">Opening Stock</span>
          <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
            {report.totalOpeningStock.toLocaleString()} kg
          </span>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs">
          <span className="text-xs font-medium text-emerald-800">Production</span>
          <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
            +{report.totalProductionOnDate.toLocaleString()} kg
          </span>
        </div>
        <div className="bg-sky-50/60 border border-sky-200 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs">
          <span className="text-xs font-medium text-sky-800">Issued to TP</span>
          <span className="font-mono text-sm font-bold text-sky-700 tabular-nums">
            -{report.totalIssuedToTapePlant.toLocaleString()} kg
          </span>
        </div>
        <div className="bg-sky-50 border border-sky-300 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xs">
          <span className="text-xs font-bold text-sky-900">Closing Stock</span>
          <span className="font-mono text-sm font-extrabold text-sky-900 tabular-nums">
            {report.totalClosingStock.toLocaleString()} kg
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          <span className="text-sm">Loading R.P. Plant Production Report...</span>
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW: Spreadsheet Grid (hidden on < md mobile PWA) */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[1150px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                    <th
                      rowSpan={2}
                      className="py-2 px-2 text-center border-r border-slate-200 w-10 sticky left-0 bg-slate-50 z-10"
                    >
                      No.
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2.5 text-left border-r border-slate-200 w-40 sticky left-10 bg-slate-50 z-10"
                    >
                      Particulars
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2.5 text-left border-r border-slate-200 w-32"
                    >
                      Colors
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2 text-right border-r border-slate-200 w-24"
                    >
                      Opening Stock
                    </th>
                    <th
                      colSpan={shifts.length + 1}
                      className="py-1 px-2 text-center border-b border-r border-slate-200 bg-sky-50/70 text-sky-900"
                    >
                      Production on Date
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2 text-right border-r border-slate-200 w-24 text-slate-400"
                    >
                      Prod MTD
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2 text-right border-r border-slate-200 w-24"
                    >
                      Issued to TP
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2 text-right border-r border-slate-200 w-24 text-slate-400"
                    >
                      Issued MTD
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2 text-right border-r border-slate-200 w-20"
                    >
                      Lumps
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2 text-right border-r border-slate-200 w-20 text-slate-400"
                    >
                      Lumps MTD
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2 text-right border-r border-slate-200 w-22"
                    >
                      Dispatch
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2 text-right border-r border-slate-200 w-22 text-slate-400"
                    >
                      Dispatch MTD
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2 px-2.5 text-right border-r border-slate-200 w-24 bg-sky-50/70 text-sky-900"
                    >
                      Closing Stock
                    </th>
                    <th rowSpan={2} className="py-2 px-2.5 text-left min-w-[120px]">
                      Remarks
                    </th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                    {shifts.map((s) => (
                      <th
                        key={s}
                        className="py-1 px-2 text-right border-r border-slate-200 w-20"
                      >
                        {s.replace(" Shift", "")}
                      </th>
                    ))}
                    <th className="py-1 px-2 text-right border-r border-slate-200 w-20 text-slate-700">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {report.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-slate-50/80 group",
                        row.isLumpsOnly && "bg-amber-50/20"
                      )}
                    >
                      <td className="py-1 px-2 text-center font-mono text-[11px] text-slate-400 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50/80">
                        {row.seq}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-100 sticky left-10 bg-white group-hover:bg-slate-50/80">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={row.particular}
                            placeholder="Material..."
                            onChange={(e) =>
                              updateRowText(
                                row.id,
                                "particular",
                                e.target.value.toUpperCase()
                              )
                            }
                            className="w-full h-7 px-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-300 placeholder:font-normal bg-slate-50/60 rounded border border-transparent focus:bg-white focus:border-slate-300 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer shrink-0"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-1 px-2 border-r border-slate-100">
                        <input
                          type="text"
                          value={row.color}
                          placeholder="Colour..."
                          onChange={(e) =>
                            updateRowText(row.id, "color", e.target.value.toUpperCase())
                          }
                          className="w-full h-7 px-1.5 text-xs text-slate-700 placeholder:text-slate-300 bg-slate-50/60 rounded border border-transparent focus:bg-white focus:border-slate-300 focus:outline-none"
                        />
                      </td>

                      <td className="py-1 px-1 border-r border-slate-100">
                        {row.isLumpsOnly ? (
                          <div className="text-right px-2 text-slate-300 font-mono">—</div>
                        ) : (
                          <NumericCellInput
                            ariaLabel={`Row ${row.seq} Opening Stock`}
                            value={row.openingStock}
                            onChange={(v) => updateRowField(row.id, "openingStock", v)}
                          />
                        )}
                      </td>

                      {shifts.map((s) => (
                        <td key={s} className="py-1 px-1 border-r border-slate-100">
                          <NumericCellInput
                            ariaLabel={`Row ${row.seq} ${s} Production`}
                            value={safeNum(row.productionShifts[s])}
                            onChange={(v) => updateShiftProduction(row.id, s, v)}
                          />
                        </td>
                      ))}

                      <td className="py-1 px-2 text-right font-mono font-semibold text-slate-900 border-r border-slate-100 tabular-nums">
                        {row.productionTotal > 0 ? row.productionTotal : "—"}
                      </td>

                      <td className="py-1 px-1 border-r border-slate-100">
                        <NumericCellInput
                          ariaLabel={`Row ${row.seq} Prod MTD`}
                          value={row.productionMtd}
                          onChange={(v) => updateRowField(row.id, "productionMtd", v)}
                          className="text-slate-500 bg-transparent"
                        />
                      </td>

                      <td className="py-1 px-1 border-r border-slate-100">
                        <NumericCellInput
                          ariaLabel={`Row ${row.seq} Issued to Tape Plant`}
                          value={row.issuedToTapePlant}
                          onChange={(v) => updateRowField(row.id, "issuedToTapePlant", v)}
                        />
                      </td>

                      <td className="py-1 px-1 border-r border-slate-100">
                        <NumericCellInput
                          ariaLabel={`Row ${row.seq} Issued MTD`}
                          value={row.issuedToTapePlantMtd}
                          onChange={(v) =>
                            updateRowField(row.id, "issuedToTapePlantMtd", v)
                          }
                          className="text-slate-500 bg-transparent"
                        />
                      </td>

                      <td className="py-1 px-1 border-r border-slate-100">
                        <NumericCellInput
                          ariaLabel={`Row ${row.seq} Lumps`}
                          value={row.lumpsOnDate}
                          onChange={(v) => updateRowField(row.id, "lumpsOnDate", v)}
                        />
                      </td>

                      <td className="py-1 px-1 border-r border-slate-100">
                        <NumericCellInput
                          ariaLabel={`Row ${row.seq} Lumps MTD`}
                          value={row.lumpsMtd}
                          onChange={(v) => updateRowField(row.id, "lumpsMtd", v)}
                          className="text-slate-500 bg-transparent"
                        />
                      </td>

                      <td className="py-1 px-1 border-r border-slate-100">
                        <NumericCellInput
                          ariaLabel={`Row ${row.seq} Dispatch`}
                          value={row.dispatchOnDate}
                          onChange={(v) => updateRowField(row.id, "dispatchOnDate", v)}
                        />
                      </td>

                      <td className="py-1 px-1 border-r border-slate-100">
                        <NumericCellInput
                          ariaLabel={`Row ${row.seq} Dispatch MTD`}
                          value={row.dispatchMtd}
                          onChange={(v) => updateRowField(row.id, "dispatchMtd", v)}
                          className="text-slate-500 bg-transparent"
                        />
                      </td>

                      <td
                        className={cn(
                          "py-1 px-2.5 text-right font-mono font-bold border-r border-slate-100 tabular-nums bg-sky-50/40",
                          row.closingStock < 0 ? "text-rose-600" : "text-sky-900"
                        )}
                      >
                        {row.isLumpsOnly
                          ? "—"
                          : row.closingStock === 0
                          ? "NIL"
                          : row.closingStock}
                      </td>

                      <td className="py-1 px-2">
                        <input
                          type="text"
                          value={row.remarks || ""}
                          placeholder="—"
                          onChange={(e) =>
                            updateRowText(row.id, "remarks", e.target.value)
                          }
                          className="w-full h-7 text-xs bg-transparent text-slate-600 placeholder:text-slate-300 focus:outline-none focus:bg-slate-50 rounded px-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* System-Themed Grand Total Footer */}
                <tfoot>
                  <tr className="bg-sky-50 border-t-2 border-sky-600 text-slate-900 font-bold text-xs">
                    <td
                      colSpan={3}
                      className="py-2.5 px-3 text-left tracking-wider uppercase sticky left-0 bg-sky-50 text-sky-950"
                    >
                      Grand Total (kg)
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                      {report.totalOpeningStock.toLocaleString()}
                    </td>
                    {shifts.map((s) => (
                      <td key={s} className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {(report.shiftProductionTotals?.[s] || 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="py-2.5 px-2 text-right font-mono text-emerald-700 tabular-nums">
                      {report.totalProductionOnDate.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-500 tabular-nums">
                      {report.totalProductionMtd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-sky-700 tabular-nums">
                      {report.totalIssuedToTapePlant.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-500 tabular-nums">
                      {report.totalIssuedToTapePlantMtd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                      {report.totalLumpsOnDate.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-500 tabular-nums">
                      {report.totalLumpsMtd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                      {report.totalDispatchOnDate.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-500 tabular-nums">
                      {report.totalDispatchMtd.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-sky-900 tabular-nums">
                      {report.totalClosingStock.toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Row</span>
              </button>
              <span className="text-[11px] text-slate-400">
                Closing Stock = Opening + Production − Issued to Tape Plant − Dispatch
              </span>
            </div>
          </div>

          {/* MOBILE / PWA VIEW: Touch-First Card Layout (shown on < md) */}
          <div className="md:hidden space-y-3">
            {report.rows.map((row) => (
              <div
                key={row.id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      {row.seq}
                    </span>
                    <Input
                      value={row.particular}
                      placeholder="Particular..."
                      onChange={(e) =>
                        updateRowText(row.id, "particular", e.target.value.toUpperCase())
                      }
                      className="h-9 text-xs font-semibold"
                    />
                    <Input
                      value={row.color}
                      placeholder="Colour"
                      onChange={(e) =>
                        updateRowText(row.id, "color", e.target.value.toUpperCase())
                      }
                      className="h-9 text-xs w-28"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(row.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer touch-manipulation"
                    title="Remove row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                      Opening Stock
                    </label>
                    <NumericCellInput
                      value={row.openingStock}
                      onChange={(v) => updateRowField(row.id, "openingStock", v)}
                      className="h-9 border-slate-200 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-sky-700 uppercase block mb-1">
                      Closing Stock (Auto)
                    </label>
                    <div
                      className={cn(
                        "h-9 px-2.5 rounded border border-sky-200 bg-sky-50/70 flex items-center justify-end font-mono font-bold text-xs",
                        row.closingStock < 0 ? "text-rose-600" : "text-sky-900"
                      )}
                    >
                      {row.closingStock} kg
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {shifts.map((s) => (
                    <div key={s}>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                        Prod ({s.replace(" Shift", "")})
                      </label>
                      <NumericCellInput
                        value={safeNum(row.productionShifts[s])}
                        onChange={(v) => updateShiftProduction(row.id, s, v)}
                        className="h-9 border-slate-200 bg-slate-50"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                      Issued TP
                    </label>
                    <NumericCellInput
                      value={row.issuedToTapePlant}
                      onChange={(v) => updateRowField(row.id, "issuedToTapePlant", v)}
                      className="h-9 border-slate-200 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                      Lumps
                    </label>
                    <NumericCellInput
                      value={row.lumpsOnDate}
                      onChange={(v) => updateRowField(row.id, "lumpsOnDate", v)}
                      className="h-9 border-slate-200 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                      Dispatch
                    </label>
                    <NumericCellInput
                      value={row.dispatchOnDate}
                      onChange={(v) => updateRowField(row.id, "dispatchOnDate", v)}
                      className="h-9 border-slate-200 bg-slate-50"
                    />
                  </div>
                </div>

                <Input
                  value={row.remarks || ""}
                  placeholder="Remarks..."
                  onChange={(e) => updateRowText(row.id, "remarks", e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleAddBlankRow}
              className="w-full h-10 text-xs font-semibold text-sky-600 border-sky-200 bg-white hover:bg-sky-50 touch-manipulation"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Row
            </Button>
          </div>
        </>
      )}

      {/* Standard System Print Preview Modal */}
      <RpPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        mode="production"
        reportData={report}
      />
    </div>
  );
}
