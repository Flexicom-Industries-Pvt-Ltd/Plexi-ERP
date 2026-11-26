"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import {
  generateWastageCollectionHtml,
  openPrintWindow,
} from "@/lib/recycling/print-rp-reports";
import { NumericCellInput } from "./NumericCellInput";

interface WastageCollectionSheetProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function WastageCollectionSheet({
  selectedDate,
  onDateChange,
}: WastageCollectionSheetProps) {
  const [report, setReport] = useState<RpWastageCollectionData>(() =>
    createDefaultWastageReport(selectedDate, ["Day Shift", "Night Shift"], 1)
  );
  const [prevMonthBaseline, setPrevMonthBaseline] =
    useState<RpWastageCollectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Adding custom row inline state
  const [addingToSection, setAddingToSection] = useState<string | null>(null);
  const [newRowLabel, setNewRowLabel] = useState("");

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const fetchReport = useCallback(async (targetDate: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/production/recycling-plant/wastage-collection?date=${encodeURIComponent(
          targetDate
        )}&_t=${Date.now()}`
      );
      const json = await res.json();
      if (json.success && json.report) {
        const activeShifts = Array.isArray(json.activeShifts)
          ? json.activeShifts
          : ["Day Shift", "Night Shift"];
        setReport(recalculateWastageReport(json.report, activeShifts));
        setPrevMonthBaseline(
          json.prevMonthReport
            ? recalculateWastageReport(json.prevMonthReport, activeShifts)
            : null
        );
      } else {
        toast.error(json.error || "Failed to load Wastage Collection Report");
      }
    } catch {
      toast.error("Network error loading Wastage Collection Report");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedDate);
  }, [selectedDate, fetchReport]);

  const shiftDate = (delta: number) => {
    const next = format(addDays(parseISO(selectedDate), delta), "yyyy-MM-dd");
    onDateChange(next);
  };

  // Update shift input in a departmental section + live MTD carry-forward
  const updateCell = (
    sectionKey: string,
    rowId: string,
    shiftName: string,
    value: number
  ) => {
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

  const handleSave = async (targetStatus: "DRAFT" | "SUBMITTED" = report.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT") => {
    setIsSaving(true);
    try {
      const payload = recalculateWastageReport(
        { ...report, status: targetStatus },
        report.shiftNames
      );
      const res = await fetch("/api/production/recycling-plant/wastage-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.report) {
        setReport(recalculateWastageReport(json.report, report.shiftNames));
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
        "space-y-4",
        isFullscreen &&
          "fixed inset-0 z-50 bg-slate-50 p-4 overflow-y-auto animate-in fade-in duration-150"
      )}
    >
      {/* Top Minimalist Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/70 overflow-hidden">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="p-1.5 hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none py-1"
              />
            </div>
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="p-1.5 hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Serial No */}
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1 bg-slate-50/60">
            <span className="text-[11px] font-medium text-slate-500">Sl. No.</span>
            <input
              type="number"
              min={1}
              value={report.serialNo}
              onChange={(e) =>
                setReport((prev) => ({
                  ...prev,
                  serialNo: Math.max(1, parseInt(e.target.value, 10) || 1),
                }))
              }
              className="w-12 text-xs font-mono font-bold text-rose-600 bg-transparent focus:outline-none text-right"
            />
          </div>

          {/* Dynamic Shifts from Master */}
          <div className="hidden md:flex items-center gap-1.5">
            {shifts.map((s) => (
              <span
                key={s}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/70"
              >
                {s}
              </span>
            ))}
          </div>

          {/* Operator */}
          <div className="w-44">
            <UniversalPersonnelInput
              value={report.operatorName}
              onChange={(name, item) =>
                setReport((prev) => ({
                  ...prev,
                  operatorName: name,
                  operatorId: item?.id || null,
                }))
              }
              type="operator"
              placeholder="Operator name"
              inputClassName="h-8 text-xs"
            />
          </div>

          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              report.status === "SUBMITTED" || report.status === "APPROVED"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            {report.status}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPrintWindow(generateWastageCollectionHtml(report))}
            className="h-8 text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportWastageCollectionExcel(report)}
            className="h-8 text-xs gap-1.5"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSave("DRAFT")}
            className="h-8 text-xs gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save Draft</span>
          </Button>
          <Button
            size="sm"
            disabled={isSaving}
            onClick={() => handleSave("SUBMITTED")}
            className="h-8 text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Submit</span>
          </Button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
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

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading Wastage Collection Report...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left 8 Columns: 8 Departmental Wastage Sections */}
          <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.sections.map((sec) => (
              <div
                key={sec.key}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col"
              >
                {/* Section Header */}
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                    {sec.title}
                  </h3>
                  <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                    {sec.sectionTotal.toFixed(1)} kg
                  </span>
                </div>

                {/* Section Table */}
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-semibold text-slate-500 uppercase">
                        <th className="py-1.5 px-2.5 text-left">Type / Colour</th>
                        {shifts.map((s) => (
                          <React.Fragment key={s}>
                            <th className="py-1.5 px-1.5 text-right w-16">{s.replace(" Shift", "")}</th>
                            <th className="py-1.5 px-1.5 text-right w-14 text-slate-400">MTD</th>
                          </React.Fragment>
                        ))}
                        <th className="py-1.5 px-2.5 text-right w-16 text-slate-700">Total</th>
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
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                  title="Remove custom row"
                                >
                                  <Trash2 className="h-3 w-3" />
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
                                />
                              </td>
                              <td className="py-1 px-1">
                                <NumericCellInput
                                  ariaLabel={`${sec.title} ${row.label} ${s} MTD`}
                                  value={safeNum(row.mtdShifts[s])}
                                  onChange={(v) => updateMtdCell(sec.key, row.id, s, v)}
                                  className="text-slate-500 bg-transparent"
                                />
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="py-1 px-2.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {row.total > 0 ? row.total.toFixed(1) : "—"}
                          </td>
                        </tr>
                      ))}

                      {/* Inline Add Custom Sub-Row */}
                      {addingToSection === sec.key && (
                        <tr className="bg-sky-50/40">
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
                                className="h-7 text-xs bg-white"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2.5"
                                onClick={() => handleAddCustomRow(sec.key)}
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2"
                                onClick={() => setAddingToSection(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {/* Section Total Footer */}
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
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-950">
                          {sec.sectionTotal > 0 ? sec.sectionTotal.toFixed(1) : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Add Sub-Row Trigger */}
                <div className="px-2.5 py-1 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingToSection(sec.key);
                      setNewRowLabel("");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Sub-Row</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right 4 Columns: Summary, Note Reconciliation & Margin Blocks */}
          <div className="xl:col-span-4 space-y-3 xl:sticky xl:top-4">
            {/* SUMMARY CARD */}
            <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <h3 className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Summary (Sections)
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">KG</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {report.sections.map((sec) => (
                  <div key={sec.key} className="flex items-center justify-between">
                    <span className="text-slate-300">
                      {sec.title.replace(" SECTION", "")}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      {sec.sectionTotal > 0 ? sec.sectionTotal.toFixed(1) : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-700 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Summary Total
                </span>
                <span className="text-base font-mono font-bold text-emerald-400 tabular-nums">
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
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
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
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Summary (Auto)</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    {report.marginBlocks.noteBox.summary.toFixed(1)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-950">
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
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
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
                        />
                      </td>
                      <td className="py-1 px-1">
                        <NumericCellInput
                          ariaLabel={`Bobbin Cleaning ${r.label} MTD`}
                          value={r.mtd}
                          onChange={(v) => updateBobbinCleaning(r.key, "mtd", v)}
                          className="text-slate-500 bg-transparent"
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
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
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
                <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
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
                        />
                      </td>
                      <td className="py-1 px-1">
                        <NumericCellInput
                          ariaLabel={`Old Bobbin Cutting ${r.label} MTD`}
                          value={r.mtd}
                          onChange={(v) => updateOldBobbinCutting(r.key, "mtd", v)}
                          className="text-slate-500 bg-transparent"
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
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
