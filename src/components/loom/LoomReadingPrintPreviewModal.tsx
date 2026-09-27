"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  FileText,
  Filter,
} from "lucide-react";
import { LoomReadingEntryItem, IntervalKpiSummary } from "@/lib/loom/loom-reading-types";
import { exportLoomReadingSheetExcel } from "@/lib/loom/loom-reading-export";
import { printLoomReadingSheet } from "@/lib/loom/print-loom-reading";

interface LoomReadingPrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  shiftName: string;
  preparedBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  timeSlots?: string[];
  initialTimeSlot?: string;
  entries: LoomReadingEntryItem[];
  kpis?: {
    totalLooms: number;
    runningLoomsCount: number;
    idleLoomsCount: number;
    totalShiftMeters: number;
    totalShiftKg: number;
    totalWastageKg: number;
    intervalTotals?: IntervalKpiSummary[];
  };
  filterActiveOnly?: boolean;
  isFiltered?: boolean;
  filterLabel?: string;
}

export function LoomReadingPrintPreviewModal({
  open,
  onClose,
  date,
  shiftName,
  preparedBy = "",
  checkedBy = "",
  approvedBy = "",
  timeSlots = ["10:00", "12:00", "02:00", "04:00", "06:00", "08:00"],
  initialTimeSlot = "08:00",
  entries,
  kpis,
  filterActiveOnly = false,
  isFiltered = false,
  filterLabel,
}: LoomReadingPrintPreviewModalProps) {
  if (!open) return null;

  const docDate = (date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LM-2HR-${docDate}-${(shiftName || "SHIFT").replace(/\s+/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const slot1 = timeSlots[0] || "10:00";
  const slot2 = timeSlots[1] || "12:00";
  const slot3 = timeSlots[2] || "02:00";
  const slot4 = timeSlots[3] || "04:00";
  const slot5 = timeSlots[4] || "06:00";
  const slot6 = timeSlots[5] || "08:00";

  // Calculate Column Totals for the displayed entries
  const totalR1Prod = entries.reduce((s, e) => s + (e.r1Prod || 0), 0);
  const totalR2Prod = entries.reduce((s, e) => s + (e.r2Prod || 0), 0);
  const totalR3Prod = entries.reduce((s, e) => s + (e.r3Prod || 0), 0);
  const totalR4Prod = entries.reduce((s, e) => s + (e.r4Prod || 0), 0);
  const totalR5Prod = entries.reduce((s, e) => s + (e.r5Prod || 0), 0);
  const totalR6Prod = entries.reduce((s, e) => s + (e.r6Prod || 0), 0);
  const totalMeters = entries.reduce((s, e) => s + (e.totalProduction || 0), 0);
  const totalKg = Math.round(totalMeters * 0.16 * 100) / 100;

  const r1Count = entries.filter((e) => (e.r1Prod || 0) > 0 || e.r1Reading !== null).length;
  const r2Count = entries.filter((e) => (e.r2Prod || 0) > 0 || e.r2Reading !== null).length;
  const r3Count = entries.filter((e) => (e.r3Prod || 0) > 0 || e.r3Reading !== null).length;
  const r4Count = entries.filter((e) => (e.r4Prod || 0) > 0 || e.r4Reading !== null).length;
  const r5Count = entries.filter((e) => (e.r5Prod || 0) > 0 || e.r5Reading !== null).length;
  const r6Count = entries.filter((e) => (e.r6Prod || 0) > 0 || e.r6Reading !== null).length;

  const prog1 = totalR1Prod;
  const prog2 = prog1 + totalR2Prod;
  const prog3 = prog2 + totalR3Prod;
  const prog4 = prog3 + totalR4Prod;
  const prog5 = prog4 + totalR5Prod;
  const prog6 = prog5 + totalR6Prod;

  const runningLooms = entries.filter((e) => e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0)).length;
  const idleLooms = entries.length - runningLooms;

  const handlePrint = () => {
    printLoomReadingSheet({
      date,
      shiftName,
      preparedBy,
      checkedBy,
      approvedBy,
      timeSlots,
      initialTimeSlot,
      entries,
      kpis: {
        totalLooms: 91,
        runningLoomsCount: runningLooms,
        idleLoomsCount: idleLooms,
        totalShiftMeters: totalMeters,
        totalShiftKg: totalKg,
        totalWastageKg: kpis?.totalWastageKg || 0,
        intervalTotals: [],
      },
      filterActiveOnly: false,
    });
  };

  const handleExportExcel = () => {
    exportLoomReadingSheetExcel({
      date,
      shiftName,
      preparedBy,
      checkedBy,
      approvedBy,
      timeSlots,
      initialTimeSlot,
      entries,
      kpis: {
        totalLooms: 91,
        runningLoomsCount: runningLooms,
        idleLoomsCount: idleLooms,
        totalShiftMeters: totalMeters,
        totalShiftKg: totalKg,
        totalWastageKg: kpis?.totalWastageKg || 0,
        intervalTotals: [],
      },
      filterActiveOnly: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Modal Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-sm">
              <FileText className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  2 Hours Reading Sheet Preview
                </h2>
                {isFiltered && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Filter className="h-3 w-3" />
                    {filterLabel || `Filtered (${entries.length} of 91 Looms)`}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Official shop-floor report layout • Formatted for standard A4 landscape output
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Excel Export</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-100 text-slate-900 transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-900" />
              <span>Print Document</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/80">
          <div className="max-w-[1240px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 font-sans text-slate-900">
            {/* Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="w-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="Flexicom Logo"
                    className="h-10 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-base font-extrabold tracking-wide uppercase text-slate-950">
                    Flexicom Industries Pvt. Limited
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 tracking-tight">
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CIRCULAR WEAVING DIVISION
                  </div>
                  <div className="text-sm font-black tracking-wider text-slate-900 mt-1 uppercase">
                    2 HOUR&apos;S LOOM PRODUCTION REPORT
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    A4 LANDSCAPE
                  </span>
                </div>
              </div>

              {/* Metadata strip */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium">
                <div>
                  Doc Ref: <strong className="text-slate-900">{docRef}</strong>
                </div>
                <div>
                  Date: <strong className="text-slate-900">{date}</strong>
                </div>
                <div>
                  Shift: <strong className="text-slate-900">{shiftName}</strong>
                </div>
                <div>
                  Scope:{" "}
                  <strong className="text-slate-900">
                    {isFiltered || entries.length < 91
                      ? `Filtered (${entries.length} of 91 Looms)`
                      : "All Circular Looms (1-91)"}
                  </strong>
                </div>
                <div>
                  Generated: <strong className="text-slate-900">{genTimestamp}</strong>
                </div>
              </div>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Running Looms
                </div>
                <div className="text-base font-black text-emerald-700 mt-0.5">
                  {runningLooms}{" "}
                  <span className="text-xs font-normal text-slate-500">/ {entries.length} shown</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Shift Production (Mtr)
                </div>
                <div className="text-base font-black text-blue-700 mt-0.5">
                  {totalMeters.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-500">Meters</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Shift Production (Kg)
                </div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {totalKg.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-500">Kg</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Wastage (Kg)
                </div>
                <div className="text-base font-black text-rose-700 mt-0.5">
                  {kpis?.totalWastageKg ? kpis.totalWastageKg.toLocaleString() : "0"}{" "}
                  <span className="text-xs font-normal text-slate-500">Kg</span>
                </div>
              </div>
            </div>

            {/* Main Bi-Hourly Table */}
            <div className="border border-slate-300 rounded-lg overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  {/* Top Header Group */}
                  <tr className="bg-slate-900 text-white font-bold text-[10px] tracking-wider uppercase">
                    <th rowSpan={2} className="border border-slate-700 px-2 py-1.5 text-center w-12">
                      Loom #
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-2 py-1.5 text-left min-w-[90px]">
                      Operator
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-1.5 py-1.5 text-center w-11">
                      Size
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-1.5 py-1.5 text-center w-11">
                      Denier
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-2 py-1.5 text-left min-w-[110px]">
                      Quality Type
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-2 py-1.5 text-right w-16 bg-slate-800">
                      Initial ({initialTimeSlot})
                    </th>
                    <th colSpan={2} className="border border-slate-700 px-2 py-1 text-center bg-slate-800">
                      {slot1}
                    </th>
                    <th colSpan={2} className="border border-slate-700 px-2 py-1 text-center bg-slate-800">
                      {slot2}
                    </th>
                    <th colSpan={2} className="border border-slate-700 px-2 py-1 text-center bg-slate-800">
                      {slot3}
                    </th>
                    <th colSpan={2} className="border border-slate-700 px-2 py-1 text-center bg-slate-800">
                      {slot4}
                    </th>
                    <th colSpan={2} className="border border-slate-700 px-2 py-1 text-center bg-slate-800">
                      {slot5}
                    </th>
                    <th colSpan={2} className="border border-slate-700 px-2 py-1 text-center bg-slate-800">
                      {slot6}
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-2 py-1.5 text-right w-18 bg-emerald-900 text-white">
                      Shift Total (Mtr)
                    </th>
                    <th rowSpan={2} className="border border-slate-700 px-2 py-1.5 text-left min-w-[90px]">
                      Remarks
                    </th>
                  </tr>
                  {/* Sub Header for Read / Prod */}
                  <tr className="bg-slate-800 text-slate-300 text-[9px] font-bold uppercase tracking-wider">
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right">Read</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right text-emerald-400 bg-slate-900/50">Prod</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right">Read</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right text-emerald-400 bg-slate-900/50">Prod</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right">Read</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right text-emerald-400 bg-slate-900/50">Prod</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right">Read</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right text-emerald-400 bg-slate-900/50">Prod</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right">Read</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right text-emerald-400 bg-slate-900/50">Prod</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right">Read</th>
                    <th className="border border-slate-700 px-1.5 py-0.5 text-right text-emerald-400 bg-slate-900/50">Prod</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={20} className="px-4 py-8 text-center text-slate-500 font-medium bg-slate-50">
                        No loom entries found for this filter criteria.
                      </td>
                    </tr>
                  ) : (
                    entries.map((e) => {
                      const isRunning = e.status === "RUNNING" || (e.totalProduction && e.totalProduction > 0);
                      return (
                        <tr
                          key={e.loomNumber}
                          className={`border-b border-slate-200 transition-colors ${
                            isRunning ? "bg-white hover:bg-slate-50/70" : "bg-slate-50/80 text-slate-400"
                          }`}
                        >
                          <td className={`border border-slate-200 px-2 py-1 text-center font-mono font-black ${
                            isRunning ? "text-slate-900" : "text-slate-400"
                          }`}>
                            #{e.loomNumber}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 font-medium truncate max-w-[100px]">
                            {e.operatorName || "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-center font-mono">
                            {e.size || "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-center font-mono">
                            {e.denier || "—"}
                          </td>
                          <td className={`border border-slate-200 px-2 py-1 font-bold truncate max-w-[120px] ${
                            isRunning ? "text-slate-900" : "text-slate-400"
                          }`}>
                            {e.qualityType || "—"}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono bg-slate-50/50 text-slate-700 font-medium">
                            {e.initialReading !== null ? e.initialReading.toLocaleString() : "—"}
                          </td>

                          {/* Slot 1 */}
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono text-slate-600">
                            {e.r1Reading !== null ? e.r1Reading.toLocaleString() : "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                            {e.r1Prod !== null && e.r1Prod > 0 ? e.r1Prod.toLocaleString() : e.r1Prod === 0 ? "0" : "—"}
                          </td>

                          {/* Slot 2 */}
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono text-slate-600">
                            {e.r2Reading !== null ? e.r2Reading.toLocaleString() : "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                            {e.r2Prod !== null && e.r2Prod > 0 ? e.r2Prod.toLocaleString() : e.r2Prod === 0 ? "0" : "—"}
                          </td>

                          {/* Slot 3 */}
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono text-slate-600">
                            {e.r3Reading !== null ? e.r3Reading.toLocaleString() : "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                            {e.r3Prod !== null && e.r3Prod > 0 ? e.r3Prod.toLocaleString() : e.r3Prod === 0 ? "0" : "—"}
                          </td>

                          {/* Slot 4 */}
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono text-slate-600">
                            {e.r4Reading !== null ? e.r4Reading.toLocaleString() : "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                            {e.r4Prod !== null && e.r4Prod > 0 ? e.r4Prod.toLocaleString() : e.r4Prod === 0 ? "0" : "—"}
                          </td>

                          {/* Slot 5 */}
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono text-slate-600">
                            {e.r5Reading !== null ? e.r5Reading.toLocaleString() : "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                            {e.r5Prod !== null && e.r5Prod > 0 ? e.r5Prod.toLocaleString() : e.r5Prod === 0 ? "0" : "—"}
                          </td>

                          {/* Slot 6 */}
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono text-slate-600">
                            {e.r6Reading !== null ? e.r6Reading.toLocaleString() : "—"}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                            {e.r6Prod !== null && e.r6Prod > 0 ? e.r6Prod.toLocaleString() : e.r6Prod === 0 ? "0" : "—"}
                          </td>

                          {/* Total */}
                          <td className="border border-slate-200 px-2 py-1 text-right font-mono font-black text-slate-950 bg-emerald-100/50">
                            {e.totalProduction ? e.totalProduction.toLocaleString() : "0"}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 text-xs truncate max-w-[100px] text-slate-500">
                            {e.remarks || (isRunning ? "" : "STOP")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Progressive Summary Totals Footer */}
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-[10px]">
                    <td colSpan={6} className="border border-slate-300 px-2 py-1.5 text-right uppercase tracking-wider text-slate-700">
                      Interval Production (Mtrs)
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-emerald-800 bg-emerald-50/80">
                      {totalR1Prod.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-emerald-800 bg-emerald-50/80">
                      {totalR2Prod.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-emerald-800 bg-emerald-50/80">
                      {totalR3Prod.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-emerald-800 bg-emerald-50/80">
                      {totalR4Prod.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-emerald-800 bg-emerald-50/80">
                      {totalR5Prod.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-emerald-800 bg-emerald-50/80">
                      {totalR6Prod.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono font-black text-slate-950 bg-emerald-200/80">
                      {totalMeters.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 bg-slate-100"></td>
                  </tr>

                  <tr className="bg-slate-50 border-t border-slate-300 font-bold text-[10px]">
                    <td colSpan={6} className="border border-slate-300 px-2 py-1.5 text-right uppercase tracking-wider text-slate-600">
                      Cumulative Shift (Mtrs)
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-blue-900 bg-blue-50/60">
                      {prog1.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-blue-900 bg-blue-50/60">
                      {prog2.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-blue-900 bg-blue-50/60">
                      {prog3.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-blue-900 bg-blue-50/60">
                      {prog4.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-blue-900 bg-blue-50/60">
                      {prog5.toLocaleString()}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-blue-900 bg-blue-50/60">
                      {prog6.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono font-black text-blue-950 bg-blue-100/80">
                      {totalMeters.toLocaleString()}
                    </td>
                    <td className="border border-slate-300 bg-slate-50"></td>
                  </tr>

                  <tr className="bg-white border-t border-slate-300 font-bold text-[10px]">
                    <td colSpan={6} className="border border-slate-300 px-2 py-1.5 text-right uppercase tracking-wider text-slate-500">
                      Running Looms (Count)
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-slate-700">
                      {r1Count}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-slate-700">
                      {r2Count}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-slate-700">
                      {r3Count}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-slate-700">
                      {r4Count}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-slate-700">
                      {r5Count}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-2 py-1 text-right font-mono text-slate-700">
                      {r6Count}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold text-slate-900">
                      {runningLooms}
                    </td>
                    <td className="border border-slate-300 bg-white"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature Block */}
            <div className="mt-6 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center">
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-6">
                  Prepared By (Loom Shed In-Charge)
                </div>
                <div className="text-xs font-bold text-slate-900 mb-1">
                  {preparedBy || "—"}
                </div>
                <div className="border-t border-dotted border-slate-400 pt-1 text-[10px] text-slate-500">
                  Signature & Date
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-6">
                  Checked By (Shift Supervisor)
                </div>
                <div className="text-xs font-bold text-slate-900 mb-1">
                  {checkedBy || "—"}
                </div>
                <div className="border-t border-dotted border-slate-400 pt-1 text-[10px] text-slate-500">
                  Signature & Date
                </div>
              </div>

              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-6">
                  Approved By (Plant Manager)
                </div>
                <div className="text-xs font-bold text-slate-900 mb-1">
                  {approvedBy || "—"}
                </div>
                <div className="border-t border-dotted border-slate-400 pt-1 text-[10px] text-slate-500">
                  Signature & Date
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span>Flexicom ERP • Circular Loom Weaving Division</span>
              <span>Confidential & Proprietary • Flexicom Industries Pvt. Ltd.</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
