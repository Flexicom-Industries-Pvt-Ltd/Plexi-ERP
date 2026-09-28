"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  PackageCheck,
  Scale,
  TrendingUp,
  AlertCircle,
  Percent,
  Layers,
} from "lucide-react";
import { RecipePostProductionEntry } from "./PostProductionSection";
import {
  printTapePlantPostProductionSheet,
  PostProductionPrintData,
} from "@/lib/tape-plant/print-post-production-sheet";
import { exportTapePlantPostProductionExcel } from "@/lib/tape-plant/post-production-export";
import { toast } from "sonner";

interface PostProductionPrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  shiftName: string;
  operatorName?: string;
  status: string;
  entries: RecipePostProductionEntry[];
}

export function PostProductionPrintPreviewModal({
  open,
  onClose,
  date,
  shiftName,
  operatorName,
  status,
  entries,
}: PostProductionPrintPreviewModalProps) {
  if (!open) return null;

  const docDate = (date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `TP-PP-${docDate}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const totalPlannedKg = entries.reduce((s, e) => s + (Number(e.plannedProductionKg) || 0), 0);
  const totalDoneKg = entries.reduce((s, e) => s + (Number(e.productionDoneKg) || 0), 0);
  const totalGapKg = totalPlannedKg - totalDoneKg;
  const totalWasteKg = entries.reduce((s, e) => s + (Number(e.wasteKg) || 0), 0);
  const totalNetKg = totalDoneKg - totalWasteKg;
  const overallEfficiency = totalPlannedKg > 0 ? Math.round((totalNetKg / totalPlannedKg) * 100) : 0;
  const totalWastePercent = totalDoneKg > 0 ? ((totalWasteKg / totalDoneKg) * 100).toFixed(1) : "0.0";

  const printData: PostProductionPrintData = {
    date,
    shiftName,
    operatorName,
    status,
    entries,
  };

  const handlePrint = () => {
    printTapePlantPostProductionSheet(printData);
  };

  const handleExportExcel = () => {
    try {
      exportTapePlantPostProductionExcel(printData);
      toast.success("Excel report exported successfully");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel report");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Tape Plant Post Production Report Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    status === "SUBMITTED"
                      ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/40"
                      : "bg-blue-900/40 text-blue-300 border-blue-500/40"
                  }`}
                >
                  {status || "SAVED"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {shiftName} • {date} • Operator: {operatorName || "—"} • {entries.length} Recipe Run(s) logged
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-900 transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-900" />
              <span>Print Document</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/80">
          <div className="max-w-[950px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 font-sans text-slate-900">
            {/* Standard Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="w-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="Flexicom Logo"
                    className="h-11 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="text-center flex-1">
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-950">
                    FLEXICOM INDUSTRIES PVT. LIMITED
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • TAPE EXTRUSION DIVISION
                  </p>
                  <div className="inline-block mt-1">
                    <span className="inline-block border border-slate-900 bg-slate-50 px-3.5 py-0.5 text-xs font-black uppercase tracking-wider">
                      DAILY TAPE PLANT POST-PRODUCTION REPORT
                    </span>
                  </div>
                </div>
                <div className="w-16" aria-hidden="true" />
              </div>

              {/* Document Metadata Strip */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2.5 text-[11px] text-slate-600 border-t border-slate-200 pt-2">
                <span>DOC REF: <strong className="text-slate-900 font-mono">{docRef}</strong></span>
                <span>•</span>
                <span>DATE: <strong className="text-slate-900">{date || "—"}</strong></span>
                <span>•</span>
                <span>SHIFT: <strong className="text-slate-900">{shiftName || "—"}</strong></span>
                <span>•</span>
                <span>OPERATOR: <strong className="text-slate-900">{operatorName || "—"}</strong></span>
                <span>•</span>
                <span>RUNS: <strong className="text-slate-900">{entries.length}</strong></span>
                <span>•</span>
                <span>STATUS: <strong className="text-slate-900">{status || "SAVED"}</strong></span>
                <span>•</span>
                <span>GENERATED: <strong className="text-slate-900">{genTimestamp}</strong></span>
              </div>
            </div>

            {/* 6-Metric KPI Summary Row matching on-screen design */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                  <Scale className="h-3 w-3 text-slate-400" /> Total Planned
                </div>
                <div className="font-mono text-sm font-extrabold text-slate-900">
                  {totalPlannedKg.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">KG</span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-700 uppercase mb-0.5">
                  <TrendingUp className="h-3 w-3 text-blue-500" /> Total Done
                </div>
                <div className="font-mono text-sm font-extrabold text-blue-950">
                  {totalDoneKg.toLocaleString()} <span className="text-[10px] font-normal text-blue-600">KG</span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-200 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-700 uppercase mb-0.5">
                  <AlertCircle className="h-3 w-3 text-amber-500" /> Total Gap
                </div>
                <div className={`font-mono text-sm font-extrabold ${totalGapKg <= 0 ? "text-emerald-800" : "text-amber-900"}`}>
                  {totalGapKg.toLocaleString()} <span className="text-[10px] font-normal text-amber-600">KG</span>
                </div>
              </div>

              <div className="p-2.5 bg-red-50/60 rounded-lg border border-red-200 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-red-700 uppercase mb-0.5">
                  <Percent className="h-3 w-3 text-red-500" /> Total Waste
                </div>
                <div className="font-mono text-sm font-extrabold text-red-950">
                  {totalWasteKg.toLocaleString()} <span className="text-[10px] font-normal text-red-600">KG</span>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-800 uppercase mb-0.5">
                  <PackageCheck className="h-3 w-3 text-emerald-600" /> Net Output
                </div>
                <div className="font-mono text-sm font-black text-emerald-950">
                  {totalNetKg.toLocaleString()} <span className="text-[10px] font-normal text-emerald-700">KG</span>
                </div>
              </div>

              <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-200 text-center">
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-700 uppercase mb-0.5">
                  <Layers className="h-3 w-3 text-indigo-500" /> Efficiency
                </div>
                <div className="font-mono text-sm font-extrabold text-indigo-950">
                  {overallEfficiency}%
                </div>
              </div>
            </div>

            {/* Main Output Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-2 px-2 text-center font-bold w-10 border-r border-slate-700">#</th>
                    <th className="py-2 px-3 text-left font-bold border-r border-slate-700">Recipe / Quality</th>
                    <th className="py-2 px-3 text-right font-bold w-24 border-r border-slate-700">Planned (KG)</th>
                    <th className="py-2 px-3 text-right font-bold w-24 border-r border-slate-700 bg-sky-950/60">Done (KG)</th>
                    <th className="py-2 px-3 text-right font-bold w-20 border-r border-slate-700">Gap (KG)</th>
                    <th className="py-2 px-3 text-right font-bold w-20 border-r border-slate-700 text-red-300">Waste (KG)</th>
                    <th className="py-2 px-2 text-right font-bold w-16 border-r border-slate-700 text-red-300">Waste %</th>
                    <th className="py-2 px-3 text-right font-bold w-24 border-r border-slate-700 bg-emerald-950/60 text-emerald-300">Net Output</th>
                    <th className="py-2 px-2 text-center font-bold w-16 border-r border-slate-700">Eff %</th>
                    <th className="py-2 px-3 text-left font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 italic">
                        No recipe entries recorded for this shift.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry, index) => {
                      const planned = Number(entry.plannedProductionKg) || 0;
                      const done = Number(entry.productionDoneKg) || 0;
                      const gap = planned - done;
                      const waste = Number(entry.wasteKg) || 0;
                      const wastePct = done > 0 ? ((waste / done) * 100).toFixed(1) : (Number(entry.wastePercent) || 0).toFixed(1);
                      const net = done - waste;
                      const eff = planned > 0 ? Math.round((net / planned) * 100) : (done > 0 ? 100 : 0);

                      return (
                        <tr
                          key={entry.id || `row-${index}`}
                          className={index % 2 === 1 ? "bg-slate-50/70" : "bg-white"}
                        >
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                            {index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200">
                            {entry.recipeQuality || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 border-r border-slate-200">
                            {planned > 0 ? planned.toLocaleString() : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-700 bg-blue-50/40 border-r border-slate-200">
                            {done > 0 ? done.toLocaleString() : "0"}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold border-r border-slate-200 ${
                              gap <= 0 ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {gap !== 0 ? (gap > 0 ? `+${gap.toLocaleString()}` : gap.toLocaleString()) : "0"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600 border-r border-slate-200">
                            {waste > 0 ? waste.toLocaleString() : "0"}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-red-600 border-r border-slate-200">
                            {wastePct}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 bg-emerald-50/40 border-r border-slate-200">
                            {net > 0 ? net.toLocaleString() : "0"}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-center font-mono font-bold border-r border-slate-200 ${
                              eff >= 85 ? "text-emerald-700" : eff >= 70 ? "text-amber-700" : "text-red-600"
                            }`}
                          >
                            {eff}%
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px] truncate max-w-[150px]">
                            {entry.remarks || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                    <td colSpan={2} className="py-2.5 px-3 text-right font-extrabold uppercase border-r border-slate-300">
                      Shift Totals:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold border-r border-slate-300">
                      {totalPlannedKg.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-blue-900 border-r border-slate-300">
                      {totalDoneKg.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-extrabold border-r border-slate-300 ${
                        totalGapKg <= 0 ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {totalGapKg.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-red-700 border-r border-slate-300">
                      {totalWasteKg.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-red-700 border-r border-slate-300">
                      {totalWastePercent}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-900 border-r border-slate-300">
                      {totalNetKg.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-black border-r border-slate-300">
                      {overallEfficiency}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-normal text-[11px]">
                      {entries.length} Recipe Run(s)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Verification Sign-offs */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-200">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-8">
                  Shift Operator (Data Entry)
                </p>
                <div className="border-t border-dashed border-slate-400 pt-1">
                  <span className="text-xs font-semibold text-slate-800">{operatorName || "Name & Signature"}</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-8">
                  Shift Supervisor / In-Charge
                </p>
                <div className="border-t border-dashed border-slate-400 pt-1">
                  <span className="text-xs font-semibold text-slate-500">Signature & Date</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-8">
                  Plant Manager / Authorized Signatory
                </p>
                <div className="border-t border-dashed border-slate-400 pt-1">
                  <span className="text-xs font-semibold text-slate-500">Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
