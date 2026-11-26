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
  RpProductionReportData,
  RpProductionRow,
  createDefaultRpProductionReport,
  recalculateRpProductionReport,
  round2,
  safeNum,
} from "@/lib/recycling/rp-types";
import { UniversalPersonnelInput } from "@/components/ui/UniversalPersonnelInput";
import { exportRpProductionExcel } from "@/lib/recycling/rp-export";
import {
  generateRpProductionHtml,
  openPrintWindow,
} from "@/lib/recycling/print-rp-reports";
import { NumericCellInput } from "./NumericCellInput";

interface RpProductionSheetProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function RpProductionSheet({
  selectedDate,
  onDateChange,
}: RpProductionSheetProps) {
  const [report, setReport] = useState<RpProductionReportData>(() =>
    createDefaultRpProductionReport(selectedDate, ["Day Shift", "Night Shift"], 1)
  );
  const [prevMonthBaseline, setPrevMonthBaseline] =
    useState<RpProductionReportData | null>(null);
  const [previousDateCarried, setPreviousDateCarried] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Add new material row state
  const [showAddRow, setShowAddRow] = useState(false);
  const [newParticular, setNewParticular] = useState("");
  const [newColor, setNewColor] = useState("");

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
        `/api/production/recycling-plant/production?date=${encodeURIComponent(
          targetDate
        )}&_t=${Date.now()}`
      );
      const json = await res.json();
      if (json.success && json.report) {
        const activeShifts = Array.isArray(json.activeShifts)
          ? json.activeShifts
          : ["Day Shift", "Night Shift"];
        setReport(recalculateRpProductionReport(json.report, activeShifts));
        setPreviousDateCarried(json.previousDate || null);
        setPrevMonthBaseline(
          json.prevMonthReport
            ? recalculateRpProductionReport(json.prevMonthReport, activeShifts)
            : null
        );
      } else {
        toast.error(json.error || "Failed to load RP Plant Production Report");
      }
    } catch {
      toast.error("Network error loading RP Plant Production Report");
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

  const findPrevMonthRow = (row: RpProductionRow): RpProductionRow | undefined => {
    if (!prevMonthBaseline) return undefined;
    return prevMonthBaseline.rows.find(
      (pr) =>
        pr.id === row.id ||
        (pr.particular.toUpperCase() === row.particular.toUpperCase() &&
          (pr.color || "").toUpperCase() === (row.color || "").toUpperCase())
    );
  };

  const updateShiftProduction = (rowId: string, shiftName: string, val: number) => {
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
          productionMtd: prevRow ? round2(prevRow.productionMtd + newProdTotal) : r.productionMtd,
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
    setReport((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === rowId ? { ...r, [field]: val } : r)),
    }));
  };

  const handleAddRow = () => {
    const p = newParticular.trim().toUpperCase();
    if (!p) {
      toast.error("Particular name is required");
      return;
    }
    const c = newColor.trim().toUpperCase();
    setReport((prev) => {
      const emptyShifts = Object.fromEntries(prev.shiftNames.map((s) => [s, 0]));
      const newRow: RpProductionRow = {
        id: `rp-custom-${Date.now()}`,
        seq: prev.rows.length + 1,
        particular: p,
        color: c,
        isLumpsOnly: false,
        isCustom: true,
        openingStock: 0,
        productionShifts: emptyShifts,
        productionTotal: 0,
        productionMtd: 0,
        issuedToTapePlant: 0,
        issuedToTapePlantMtd: 0,
        lumpsOnDate: 0,
        lumpsMtd: 0,
        dispatchOnDate: 0,
        dispatchMtd: 0,
        closingStock: 0,
        remarks: "",
      };
      return recalculateRpProductionReport(
        { ...prev, rows: [...prev.rows, newRow] },
        prev.shiftNames
      );
    });
    setNewParticular("");
    setNewColor("");
    setShowAddRow(false);
  };

  const handleRemoveCustomRow = (rowId: string) => {
    setReport((prev) =>
      recalculateRpProductionReport(
        { ...prev, rows: prev.rows.filter((r) => r.id !== rowId) },
        prev.shiftNames
      )
    );
  };

  const handleSave = async (
    targetStatus: "DRAFT" | "SUBMITTED" = report.status === "SUBMITTED"
      ? "SUBMITTED"
      : "DRAFT"
  ) => {
    setIsSaving(true);
    try {
      const payload = recalculateRpProductionReport(
        { ...report, status: targetStatus },
        report.shiftNames
      );
      const res = await fetch("/api/production/recycling-plant/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.report) {
        setReport(recalculateRpProductionReport(json.report, report.shiftNames));
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
            <span className="text-[11px] font-medium text-slate-500">Sr. No.</span>
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

          {previousDateCarried && !report.id && (
            <span className="text-[11px] text-slate-400">
              Opening carried from {previousDateCarried}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPrintWindow(generateRpProductionHtml(report))}
            className="h-8 text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportRpProductionExcel(report)}
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

      {/* Minimalist 4-Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Opening Stock</span>
          <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
            {report.totalOpeningStock.toLocaleString()} kg
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Production on Date</span>
          <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
            +{report.totalProductionOnDate.toLocaleString()} kg
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Issued to Tape Plant</span>
          <span className="font-mono text-sm font-bold text-sky-700 tabular-nums">
            -{report.totalIssuedToTapePlant.toLocaleString()} kg
          </span>
        </div>
        <div className="bg-slate-900 text-white rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Closing Stock</span>
          <span className="font-mono text-sm font-bold text-white tabular-nums">
            {report.totalClosingStock.toLocaleString()} kg
          </span>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading R.P. Plant Production Report...</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
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
                    className="py-2 px-2.5 text-left border-r border-slate-200 w-36 sticky left-10 bg-slate-50 z-10"
                  >
                    Particulars
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2 px-2.5 text-left border-r border-slate-200 w-28"
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
                    className="py-1 px-2 text-center border-b border-r border-slate-200 bg-slate-100/70"
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
                    className="py-2 px-2.5 text-right border-r border-slate-200 w-24 bg-slate-100/70 text-slate-900"
                  >
                    Closing Stock
                  </th>
                  <th rowSpan={2} className="py-2 px-2.5 text-left min-w-[120px]">
                    Remarks
                  </th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                  {shifts.map((s) => (
                    <th key={s} className="py-1 px-2 text-right border-r border-slate-200 w-20">
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
                    <td className="py-1 px-2.5 font-semibold text-slate-800 border-r border-slate-100 sticky left-10 bg-white group-hover:bg-slate-50/80">
                      <div className="flex items-center justify-between gap-1">
                        {row.isCustom ? (
                          <input
                            type="text"
                            value={row.particular}
                            onChange={(e) =>
                              updateRowText(row.id, "particular", e.target.value)
                            }
                            className="w-full text-xs font-semibold bg-transparent focus:outline-none focus:underline"
                          />
                        ) : (
                          <span>{row.particular}</span>
                        )}
                        {row.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomRow(row.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                            title="Remove custom material"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-1 px-2.5 text-slate-600 border-r border-slate-100">
                      {row.isCustom ? (
                        <input
                          type="text"
                          value={row.color}
                          placeholder="—"
                          onChange={(e) => updateRowText(row.id, "color", e.target.value)}
                          className="w-full text-xs bg-transparent focus:outline-none focus:underline"
                        />
                      ) : (
                        <span>{row.color || "—"}</span>
                      )}
                    </td>

                    {/* Opening Stock */}
                    <td className="py-1 px-1 border-r border-slate-100">
                      {row.isLumpsOnly ? (
                        <div className="text-right px-2 text-slate-300 font-mono">—</div>
                      ) : (
                        <NumericCellInput
                          ariaLabel={`${row.particular} ${row.color} Opening Stock`}
                          value={row.openingStock}
                          onChange={(v) => updateRowField(row.id, "openingStock", v)}
                        />
                      )}
                    </td>

                    {/* Shift Productions */}
                    {shifts.map((s) => (
                      <td key={s} className="py-1 px-1 border-r border-slate-100">
                        <NumericCellInput
                          ariaLabel={`${row.particular} ${row.color} ${s} Production`}
                          value={safeNum(row.productionShifts[s])}
                          onChange={(v) => updateShiftProduction(row.id, s, v)}
                        />
                      </td>
                    ))}

                    {/* Production Total */}
                    <td className="py-1 px-2 text-right font-mono font-semibold text-slate-900 border-r border-slate-100 tabular-nums">
                      {row.productionTotal > 0 ? row.productionTotal : "—"}
                    </td>

                    {/* Production MTD */}
                    <td className="py-1 px-1 border-r border-slate-100">
                      <NumericCellInput
                        ariaLabel={`${row.particular} ${row.color} Prod MTD`}
                        value={row.productionMtd}
                        onChange={(v) => updateRowField(row.id, "productionMtd", v)}
                        className="text-slate-500 bg-transparent"
                      />
                    </td>

                    {/* Issued to Tape Plant */}
                    <td className="py-1 px-1 border-r border-slate-100">
                      <NumericCellInput
                        ariaLabel={`${row.particular} ${row.color} Issued to Tape Plant`}
                        value={row.issuedToTapePlant}
                        onChange={(v) => updateRowField(row.id, "issuedToTapePlant", v)}
                      />
                    </td>

                    {/* Issued MTD */}
                    <td className="py-1 px-1 border-r border-slate-100">
                      <NumericCellInput
                        ariaLabel={`${row.particular} ${row.color} Issued MTD`}
                        value={row.issuedToTapePlantMtd}
                        onChange={(v) => updateRowField(row.id, "issuedToTapePlantMtd", v)}
                        className="text-slate-500 bg-transparent"
                      />
                    </td>

                    {/* Lumps on Date */}
                    <td className="py-1 px-1 border-r border-slate-100">
                      <NumericCellInput
                        ariaLabel={`${row.particular} ${row.color} Lumps`}
                        value={row.lumpsOnDate}
                        onChange={(v) => updateRowField(row.id, "lumpsOnDate", v)}
                      />
                    </td>

                    {/* Lumps MTD */}
                    <td className="py-1 px-1 border-r border-slate-100">
                      <NumericCellInput
                        ariaLabel={`${row.particular} ${row.color} Lumps MTD`}
                        value={row.lumpsMtd}
                        onChange={(v) => updateRowField(row.id, "lumpsMtd", v)}
                        className="text-slate-500 bg-transparent"
                      />
                    </td>

                    {/* Dispatch on Date */}
                    <td className="py-1 px-1 border-r border-slate-100">
                      <NumericCellInput
                        ariaLabel={`${row.particular} ${row.color} Dispatch`}
                        value={row.dispatchOnDate}
                        onChange={(v) => updateRowField(row.id, "dispatchOnDate", v)}
                      />
                    </td>

                    {/* Dispatch MTD */}
                    <td className="py-1 px-1 border-r border-slate-100">
                      <NumericCellInput
                        ariaLabel={`${row.particular} ${row.color} Dispatch MTD`}
                        value={row.dispatchMtd}
                        onChange={(v) => updateRowField(row.id, "dispatchMtd", v)}
                        className="text-slate-500 bg-transparent"
                      />
                    </td>

                    {/* Closing Stock */}
                    <td
                      className={cn(
                        "py-1 px-2.5 text-right font-mono font-bold border-r border-slate-100 tabular-nums bg-slate-50/60",
                        row.closingStock < 0 ? "text-rose-600" : "text-slate-900"
                      )}
                    >
                      {row.isLumpsOnly
                        ? "—"
                        : row.closingStock === 0
                        ? "NIL"
                        : row.closingStock}
                    </td>

                    {/* Remarks */}
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={row.remarks || ""}
                        placeholder="—"
                        onChange={(e) => updateRowText(row.id, "remarks", e.target.value)}
                        className="w-full h-7 text-xs bg-transparent text-slate-600 placeholder:text-slate-300 focus:outline-none focus:bg-slate-50 rounded px-1"
                      />
                    </td>
                  </tr>
                ))}

                {/* Add New Particular/Color Row Inline */}
                {showAddRow && (
                  <tr className="bg-sky-50/40">
                    <td className="py-2 px-2 text-center font-mono text-slate-400">
                      {report.rows.length + 1}
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        value={newParticular}
                        onChange={(e) => setNewParticular(e.target.value)}
                        placeholder="Particular (e.g. HD GREEN)"
                        className="h-7 text-xs bg-white"
                        autoFocus
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddRow();
                          if (e.key === "Escape") setShowAddRow(false);
                        }}
                        placeholder="Colour (optional)"
                        className="h-7 text-xs bg-white"
                      />
                    </td>
                    <td colSpan={11 + shifts.length} className="py-1.5 px-2">
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={handleAddRow}>
                          Add Material Row
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setShowAddRow(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* GRAND TOTAL FOOTER */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td
                    colSpan={3}
                    className="py-2.5 px-3 text-left tracking-wider uppercase sticky left-0 bg-slate-900"
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
                  <td className="py-2.5 px-2 text-right font-mono text-emerald-400 tabular-nums">
                    {report.totalProductionOnDate.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                    {report.totalProductionMtd.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-sky-400 tabular-nums">
                    {report.totalIssuedToTapePlant.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                    {report.totalIssuedToTapePlantMtd.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                    {report.totalLumpsOnDate.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                    {report.totalLumpsMtd.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                    {report.totalDispatchOnDate.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-300 tabular-nums">
                    {report.totalDispatchMtd.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono text-emerald-300 tabular-nums">
                    {report.totalClosingStock.toLocaleString()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add Material Footer Bar */}
          <div className="px-3 py-2 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAddRow(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Particular / Colour Row</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Closing Stock = Opening + Production − Issued to Tape Plant − Dispatch
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
