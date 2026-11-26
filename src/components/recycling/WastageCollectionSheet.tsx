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
  Recycle,
  AlertTriangle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RpWastageCollectionData,
  createDefaultWastageReport,
  recalculateWastageReport,
  round2,
  safeNum,
} from "@/lib/recycling/rp-types";
import { UniversalPersonnelInput } from "@/components/ui/UniversalPersonnelInput";
import { exportWastageCollectionExcel } from "@/lib/recycling/rp-export";
import { useProductionRealtime } from "@/hooks/useProductionRealtime";
import { RealtimeSyncBadge } from "@/components/production/RealtimeSyncBadge";
import { NumericCellInput } from "./NumericCellInput";

const RpPrintPreviewModal = dynamic(
  () => import("./RpPrintPreviewModal").then((m) => m.RpPrintPreviewModal),
  { ssr: false }
);

export function WastageCollectionSheet() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [report, setReport] = useState<RpWastageCollectionData>(() =>
    createDefaultWastageReport(initialDate, ["Day Shift", "Night Shift"], 1)
  );
  const [prevMonthBaseline, setPrevMonthBaseline] =
    useState<RpWastageCollectionData | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [newRowLabel, setNewRowLabel] = useState("");

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
        `/api/production/recycling-plant/wastage-collection?date=${encodeURIComponent(
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
        const hydrated = recalculateWastageReport(json.report, activeShifts);
        setReport(hydrated);
        setMigrationPending(Boolean(json.migrationPending));
        setPrevMonthBaseline(
          json.prevMonthReport
            ? recalculateWastageReport(json.prevMonthReport, activeShifts)
            : null
        );
        lastSavedPayloadRef.current = JSON.stringify(hydrated);
      } else {
        toast.error(json.error || "Failed to load Wastage Collection Report");
      }
    } catch {
      toast.error("Network error loading Wastage Collection Report");
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
    sheet: "wastage-collection",
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

    const calculated = recalculateWastageReport(report, report.shiftNames);
    const payloadStr = JSON.stringify(calculated);
    if (payloadStr === lastSavedPayloadRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const res = await fetch("/api/production/recycling-plant/wastage-collection", {
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
        console.error("RP Wastage auto-save failed:", err);
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

  const updateCell = (
    sectionKey: string,
    rowId: string,
    shiftName: string,
    value: number
  ) => {
    markEdited();
    setReport((prev) => {
      const prevSec = prevMonthBaseline?.sections?.find((s) => s.key === sectionKey);
      const sections = prev.sections.map((sec) => {
        if (sec.key !== sectionKey) return sec;
        return {
          ...sec,
          rows: sec.rows.map((r) => {
            if (r.id !== rowId) return r;
            const prevMtd =
              prevSec?.rows.find((pr) => pr.id === r.id)?.mtdShifts?.[shiftName] ?? 0;
            return {
              ...r,
              shifts: { ...r.shifts, [shiftName]: value },
              mtdShifts: prevMonthBaseline
                ? { ...r.mtdShifts, [shiftName]: round2(prevMtd + value) }
                : r.mtdShifts,
            };
          }),
        };
      });
      return recalculateWastageReport({ ...prev, sections }, prev.shiftNames);
    });
  };

  const updateMtdCell = (
    sectionKey: string,
    rowId: string,
    shiftName: string,
    value: number
  ) => {
    markEdited();
    setReport((prev) => {
      const sections = prev.sections.map((sec) => {
        if (sec.key !== sectionKey) return sec;
        return {
          ...sec,
          rows: sec.rows.map((r) =>
            r.id === rowId
              ? { ...r, mtdShifts: { ...r.mtdShifts, [shiftName]: value } }
              : r
          ),
        };
      });
      return recalculateWastageReport({ ...prev, sections }, prev.shiftNames);
    });
  };

  const handleAddCustomRow = (sectionKey: string) => {
    const label = newRowLabel.trim().toUpperCase();
    if (!label) return;
    markEdited();
    setReport((prev) => {
      const emptyShifts = Object.fromEntries(prev.shiftNames.map((s) => [s, 0]));
      const sections = prev.sections.map((sec) => {
        if (sec.key !== sectionKey) return sec;
        return {
          ...sec,
          rows: [
            ...sec.rows,
            {
              id: `custom-${Date.now()}`,
              label,
              isCustom: true,
              shifts: { ...emptyShifts },
              mtdShifts: { ...emptyShifts },
              total: 0,
            },
          ],
        };
      });
      return recalculateWastageReport({ ...prev, sections }, prev.shiftNames);
    });
    setNewRowLabel("");
    setAddingToSection(null);
  };

  const handleRemoveCustomRow = (sectionKey: string, rowId: string) => {
    markEdited();
    setReport((prev) => {
      const sections = prev.sections.map((sec) =>
        sec.key === sectionKey
          ? { ...sec, rows: sec.rows.filter((r) => r.id !== rowId) }
          : sec
      );
      return recalculateWastageReport({ ...prev, sections }, prev.shiftNames);
    });
  };

  const updateBobbinCleaning = (key: string, field: "day" | "mtd", val: number) => {
    markEdited();
    setReport((prev) => {
      const prevBc = prevMonthBaseline?.marginBlocks?.bobbinCleaning?.rows.find(
        (r) => r.key === key
      );
      const rows = prev.marginBlocks.bobbinCleaning.rows.map((r) => {
        if (r.key !== key) return r;
        if (field === "day" && prevMonthBaseline) {
          return { ...r, day: val, mtd: round2((prevBc?.mtd ?? 0) + val) };
        }
        return { ...r, [field]: val };
      });
      return recalculateWastageReport(
        {
          ...prev,
          marginBlocks: {
            ...prev.marginBlocks,
            bobbinCleaning: { ...prev.marginBlocks.bobbinCleaning, rows },
          },
        },
        prev.shiftNames
      );
    });
  };

  const updateSegregation = (key: string, val: number) => {
    markEdited();
    setReport((prev) => {
      const rows = prev.marginBlocks.segregation.rows.map((r) =>
        r.key === key ? { ...r, qty: val } : r
      );
      return recalculateWastageReport(
        {
          ...prev,
          marginBlocks: {
            ...prev.marginBlocks,
            segregation: { ...prev.marginBlocks.segregation, rows },
          },
        },
        prev.shiftNames
      );
    });
  };

  const updateOldBobbinCutting = (key: string, field: "day" | "mtd", val: number) => {
    markEdited();
    setReport((prev) => {
      const prevObc = prevMonthBaseline?.marginBlocks?.oldBobbinCutting?.rows.find(
        (r) => r.key === key
      );
      const rows = prev.marginBlocks.oldBobbinCutting.rows.map((r) => {
        if (r.key !== key) return r;
        if (field === "day" && prevMonthBaseline) {
          return { ...r, day: val, mtd: round2((prevObc?.mtd ?? 0) + val) };
        }
        return { ...r, [field]: val };
      });
      return recalculateWastageReport(
        {
          ...prev,
          marginBlocks: {
            ...prev.marginBlocks,
            oldBobbinCutting: { ...prev.marginBlocks.oldBobbinCutting, rows },
          },
        },
        prev.shiftNames
      );
    });
  };

  const updateCuttexSmallRoll = (val: number) => {
    markEdited();
    setReport((prev) =>
      recalculateWastageReport(
        {
          ...prev,
          marginBlocks: {
            ...prev.marginBlocks,
            oldBobbinCutting: {
              ...prev.marginBlocks.oldBobbinCutting,
              cuttexSmallRollWastage: val,
            },
          },
        },
        prev.shiftNames
      )
    );
  };

  const updateRpLums = (val: number) => {
    markEdited();
    setReport((prev) =>
      recalculateWastageReport(
        {
          ...prev,
          marginBlocks: {
            ...prev.marginBlocks,
            noteBox: { ...prev.marginBlocks.noteBox, rpLums: val },
          },
        },
        prev.shiftNames
      )
    );
  };

  const handleSave = async (
    targetStatus: "DRAFT" | "SUBMITTED" = report.status === "SUBMITTED"
      ? "SUBMITTED"
      : "DRAFT"
  ) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setIsSaving(true);
    try {
      const payload = recalculateWastageReport(
        { ...report, status: targetStatus },
        report.shiftNames
      );
      const res = await fetch("/api/production/recycling-plant/wastage-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, clientId: realtime.clientId }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.report) {
        const saved = recalculateWastageReport(json.report, report.shiftNames);
        setReport(saved);
        lastSavedPayloadRef.current = JSON.stringify(saved);
        setLastAutoSavedAt(new Date());
        realtime.broadcastSync({
          action: targetStatus === "SUBMITTED" ? "SUBMIT" : "SAVE",
          date: selectedDate,
        });
        toast.success(
          targetStatus === "SUBMITTED"
            ? "Wastage Collection Report submitted"
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
            <Recycle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                Wastage Collection Report
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
              Factory-wide floor wastage collection, bobbin cleaning &amp; segregation
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
            onClick={() => exportWastageCollectionExcel(report)}
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

      {/* Pending Migration Banner (only shown if DB migration hasn't run yet) */}
      {migrationPending && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Database migration pending:</strong> Run{" "}
            <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono">
              npx prisma migrate deploy
            </code>{" "}
            so saved Recycling Plant reports can persist to PostgreSQL.
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
              Sl. No.
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
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
          <span className="text-sm">Loading Wastage Collection Report...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left 8 Columns: 8 Departmental Sections */}
          <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.sections.map((sec) => (
              <div
                key={sec.key}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col"
              >
                <div className="px-3 py-2 bg-sky-50/60 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                    {sec.title}
                  </h3>
                  <span className="font-mono text-xs font-bold text-sky-700 tabular-nums">
                    {sec.sectionTotal.toFixed(1)} kg
                  </span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold text-slate-500 uppercase">
                        <th className="py-1.5 px-2.5 text-left">Type / Colour</th>
                        {shifts.map((s) => (
                          <React.Fragment key={s}>
                            <th className="py-1.5 px-1.5 text-right w-16">
                              {s.replace(" Shift", "")}
                            </th>
                            <th className="py-1.5 px-1.5 text-right w-14 text-slate-400">
                              MTD
                            </th>
                          </React.Fragment>
                        ))}
                        <th className="py-1.5 px-2.5 text-right w-16 text-slate-700">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sec.rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/60 group">
                          <td className="py-1 px-2.5 font-medium text-slate-700 whitespace-nowrap">
                            <div className="flex items-center justify-between gap-1">
                              <span>{row.label}</span>
                              {row.isCustom && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomRow(sec.key, row.id)}
                                  className="sm:opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                  title="Remove custom row"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          {shifts.map((s) => (
                            <React.Fragment key={s}>
                              <td className="py-1 px-1">
                                <NumericCellInput
                                  ariaLabel={`${sec.title} ${row.label} ${s}`}
                                  value={safeNum(row.shifts[s])}
                                  onChange={(v) => updateCell(sec.key, row.id, s, v)}
                                  className="h-9 sm:h-7 touch-manipulation"
                                />
                              </td>
                              <td className="py-1 px-1">
                                <NumericCellInput
                                  ariaLabel={`${sec.title} ${row.label} ${s} MTD`}
                                  value={safeNum(row.mtdShifts[s])}
                                  onChange={(v) => updateMtdCell(sec.key, row.id, s, v)}
                                  className="h-9 sm:h-7 text-slate-500 bg-transparent touch-manipulation"
                                />
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="py-1 px-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {row.total > 0 ? row.total.toFixed(1) : "—"}
                          </td>
                        </tr>
                      ))}

                      {addingToSection === sec.key && (
                        <tr className="bg-sky-50/50">
                          <td colSpan={2 + shifts.length * 2} className="p-1.5">
                            <div className="flex items-center gap-1.5">
                              <Input
                                value={newRowLabel}
                                onChange={(e) => setNewRowLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddCustomRow(sec.key);
                                  if (e.key === "Escape") setAddingToSection(null);
                                }}
                                placeholder="e.g. SEG, FAB, LUMS..."
                                className="h-8 text-xs bg-white"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                className="h-8 text-xs px-2.5 bg-sky-600 hover:bg-sky-700 text-white"
                                onClick={() => handleAddCustomRow(sec.key)}
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs px-2"
                                onClick={() => setAddingToSection(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>

                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50 font-bold text-slate-800">
                        <td className="py-1.5 px-2.5 text-[11px]">TOTAL</td>
                        {shifts.map((s) => (
                          <React.Fragment key={s}>
                            <td className="py-1.5 px-1.5 text-right font-mono tabular-nums">
                              {sec.sectionShiftTotals[s] > 0
                                ? sec.sectionShiftTotals[s].toFixed(1)
                                : "—"}
                            </td>
                            <td className="py-1.5 px-1.5 text-right font-mono text-slate-400 tabular-nums">
                              {sec.sectionMtdShiftTotals[s] > 0
                                ? sec.sectionMtdShiftTotals[s].toFixed(1)
                                : "—"}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-sky-800">
                          {sec.sectionTotal > 0 ? sec.sectionTotal.toFixed(1) : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="px-2.5 py-1.5 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingToSection(sec.key);
                      setNewRowLabel("");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-800 transition-colors cursor-pointer touch-manipulation"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Sub-Row</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right 4 Columns: System-Themed Summary, Note & Margin Blocks */}
          <div className="xl:col-span-4 space-y-3 xl:sticky xl:top-4">
            {/* SUMMARY CARD — Matches System Sky/Light Theme */}
            <div className="bg-white border border-sky-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-4 py-2.5 bg-sky-50 border-b border-sky-200 flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider uppercase text-sky-900">
                  Summary (Sections)
                </h3>
                <span className="text-[11px] text-sky-600 font-mono font-bold">KG</span>
              </div>
              <div className="p-4 space-y-2 text-xs">
                {report.sections.map((sec) => (
                  <div key={sec.key} className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">
                      {sec.title.replace(" SECTION", "")}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {sec.sectionTotal > 0 ? sec.sectionTotal.toFixed(1) : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-sky-50/80 border-t border-sky-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-900">
                  Summary Total
                </span>
                <span className="text-base font-mono font-extrabold text-emerald-700 tabular-nums">
                  {report.summaryTotalKg.toFixed(1)} kg
                </span>
              </div>
            </div>

            {/* NOTE / RECONCILIATION CARD */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Note (Reconciliation)
                </h3>
                <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                  {report.marginBlocks.noteBox.total.toFixed(1)} kg
                </span>
              </div>
              <div className="p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">B. Cleaning (Auto)</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {report.marginBlocks.noteBox.bCleaning.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">RP Lums</span>
                  <div className="w-24">
                    <NumericCellInput
                      ariaLabel="RP Lums"
                      value={report.marginBlocks.noteBox.rpLums}
                      onChange={updateRpLums}
                      className="h-9 sm:h-7 touch-manipulation"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Summary (Auto)</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {report.marginBlocks.noteBox.summary.toFixed(1)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sky-900">
                  <span>TOTAL RECONCILED</span>
                  <span className="font-mono text-sm tabular-nums">
                    {report.marginBlocks.noteBox.total.toFixed(1)} kg
                  </span>
                </div>
              </div>
            </div>

            {/* BOBBIN CLEANING CARD */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Bobbin Cleaning
                </h3>
                <span className="font-mono text-xs font-bold text-sky-700 tabular-nums">
                  {report.marginBlocks.bobbinCleaning.totalDay.toFixed(1)} kg
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase">
                    <th className="py-1.5 px-3 text-left">Colour</th>
                    <th className="py-1.5 px-2 text-right w-20">Day (kg)</th>
                    <th className="py-1.5 px-2 text-right w-20 text-slate-400">MTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.marginBlocks.bobbinCleaning.rows.map((r) => (
                    <tr key={r.key}>
                      <td className="py-1 px-3 font-medium text-slate-700">{r.label}</td>
                      <td className="py-1 px-1">
                        <NumericCellInput
                          ariaLabel={`Bobbin Cleaning ${r.label} Day`}
                          value={r.day}
                          onChange={(v) => updateBobbinCleaning(r.key, "day", v)}
                          className="h-9 sm:h-7 touch-manipulation"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <NumericCellInput
                          ariaLabel={`Bobbin Cleaning ${r.label} MTD`}
                          value={r.mtd}
                          onChange={(v) => updateBobbinCleaning(r.key, "mtd", v)}
                          className="h-9 sm:h-7 text-slate-500 bg-transparent touch-manipulation"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-bold text-slate-800">
                    <td className="py-1.5 px-3 text-[11px]">Total</td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {report.marginBlocks.bobbinCleaning.totalDay.toFixed(1)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-500 tabular-nums">
                      {report.marginBlocks.bobbinCleaning.totalMtd.toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* SEGREGATION CARD */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Segregation
                </h3>
                <span className="font-mono text-xs font-bold text-sky-700 tabular-nums">
                  {report.marginBlocks.segregation.total.toFixed(1)} kg
                </span>
              </div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {report.marginBlocks.segregation.rows.map((r) => (
                    <tr key={r.key}>
                      <td className="py-1 px-3 font-medium text-slate-700">{r.label}</td>
                      <td className="py-1 px-2 w-28">
                        <NumericCellInput
                          ariaLabel={`Segregation ${r.label}`}
                          value={r.qty}
                          onChange={(v) => updateSegregation(r.key, v)}
                          className="h-9 sm:h-7 touch-manipulation"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50 font-bold text-slate-800">
                    <td className="py-1.5 px-3 text-[11px]">Total</td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums">
                      {report.marginBlocks.segregation.total.toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* OLD BOBBIN CUTTING + CUTTEX SMALL ROLL */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Old Bobbin Cutting
                </h3>
                <span className="font-mono text-xs font-bold text-sky-700 tabular-nums">
                  {report.marginBlocks.oldBobbinCutting.totalDay.toFixed(1)} kg
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-500 uppercase">
                    <th className="py-1.5 px-3 text-left">Colour</th>
                    <th className="py-1.5 px-2 text-right w-20">Day (kg)</th>
                    <th className="py-1.5 px-2 text-right w-20 text-slate-400">MTD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.marginBlocks.oldBobbinCutting.rows.map((r) => (
                    <tr key={r.key}>
                      <td className="py-1 px-3 font-medium text-slate-700">{r.label}</td>
                      <td className="py-1 px-1">
                        <NumericCellInput
                          ariaLabel={`Old Bobbin Cutting ${r.label} Day`}
                          value={r.day}
                          onChange={(v) => updateOldBobbinCutting(r.key, "day", v)}
                          className="h-9 sm:h-7 touch-manipulation"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <NumericCellInput
                          ariaLabel={`Old Bobbin Cutting ${r.label} MTD`}
                          value={r.mtd}
                          onChange={(v) => updateOldBobbinCutting(r.key, "mtd", v)}
                          className="h-9 sm:h-7 text-slate-500 bg-transparent touch-manipulation"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/40">
                    <td className="py-1.5 px-3 font-medium text-slate-700">
                      Cuttex Small Roll Wastage
                    </td>
                    <td colSpan={2} className="py-1 px-1">
                      <NumericCellInput
                        ariaLabel="Cuttex Small Roll Wastage"
                        value={report.marginBlocks.oldBobbinCutting.cuttexSmallRollWastage}
                        onChange={updateCuttexSmallRoll}
                        className="h-9 sm:h-7 touch-manipulation"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Standard System Print Preview Modal */}
      <RpPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        mode="wastage"
        reportData={report}
      />
    </div>
  );
}
