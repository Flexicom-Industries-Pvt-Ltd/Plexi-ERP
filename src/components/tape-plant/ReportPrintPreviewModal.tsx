"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  BarChart3,
  Scale,
  TrendingUp,
  AlertCircle,
  Percent,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { TapePlantReportDataset, exportTapePlantReportsExcel } from "@/lib/tape-plant/reports-export";
import { printTapePlantReport } from "@/lib/tape-plant/print-report-sheet";
import { toast } from "sonner";

interface ReportPrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  data: TapePlantReportDataset | null;
  dateFrom: string;
  dateTo: string;
  activeTab: "shift" | "summary";
  filterShiftName?: string;
  filterOperatorName?: string;
  filterRecipeQuality?: string;
}

export function ReportPrintPreviewModal({
  open,
  onClose,
  data,
  dateFrom,
  dateTo,
  activeTab,
  filterShiftName,
  filterOperatorName,
  filterRecipeQuality,
}: ReportPrintPreviewModalProps) {
  if (!open || !data) return null;

  const totals = data.totals;
  const dateRangeLabel = `${dateFrom} to ${dateTo}`;
  const docRef = `TP-RPT-${dateFrom.replace(/-/g, "")}-${dateTo.replace(/-/g, "")}-${activeTab.toUpperCase()}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const docTitle =
    activeTab === "shift"
      ? "TAPE PLANT PRODUCTION SHIFT-WISE ANALYSIS"
      : "TAPE PLANT DETAILED PRODUCTION LOG REGISTER";

  const handlePrint = () => {
    printTapePlantReport({
      data,
      dateFrom,
      dateTo,
      mode: activeTab === "summary" ? "summary" : "shift",
      filterShiftName,
      filterOperatorName,
      filterRecipeQuality,
    });
  };

  const handleExportExcel = () => {
    try {
      exportTapePlantReportsExcel({
        data,
        dateFrom,
        dateTo,
        mode: activeTab === "summary" ? "summary" : "shift",
      });
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
            <div className="p-2 bg-cyan-500/20 text-cyan-300 rounded-lg">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Tape Plant Performance Report Preview
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border bg-cyan-950/50 text-cyan-300 border-cyan-500/40">
                  {activeTab === "shift" ? "SHIFT ANALYSIS" : "BATCH LOGS"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Period: {dateRangeLabel} • Generated: {genTimestamp}
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
              <span>Print Sheet</span>
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
          <div className="max-w-[950px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 font-sans text-slate-900 space-y-4">
            {/* Standard Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-3 text-center">
              <div className="flex items-center justify-between gap-4">
                <div className="w-16 sm:w-20 text-left shrink-0 flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="Flexicom Logo"
                    className="h-12 sm:h-14 w-auto object-contain shrink-0 filter contrast-125 saturate-125 drop-shadow-sm"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>

                <div className="text-center flex-1 space-y-0.5">
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-950">
                    FLEXICOM INDUSTRIES PVT. LTD.
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Tape Plant Extrusion &amp; Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&amp;K)
                  </p>
                  <div>
                    <span className="inline-block mt-0.5 border border-slate-900 bg-slate-50 px-3 py-0.5 text-xs font-black uppercase tracking-wider">
                      {docTitle}
                    </span>
                  </div>
                </div>

                <div className="w-16 sm:w-20 shrink-0 hidden sm:block" aria-hidden="true" />
              </div>

              {/* Document Metadata Strip */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2.5 text-[11px] text-slate-600 border-t border-slate-200 pt-2">
                <span>DOC REF: <strong className="text-slate-900 font-mono">{docRef}</strong></span>
                <span>•</span>
                <span>PERIOD: <strong className="text-slate-900">{dateRangeLabel}</strong></span>
                {filterShiftName && (
                  <>
                    <span>•</span>
                    <span>SHIFT: <strong className="text-slate-900">{filterShiftName}</strong></span>
                  </>
                )}
                {filterOperatorName && (
                  <>
                    <span>•</span>
                    <span>OPERATOR: <strong className="text-slate-900">{filterOperatorName}</strong></span>
                  </>
                )}
                {filterRecipeQuality && (
                  <>
                    <span>•</span>
                    <span>RECIPE: <strong className="text-slate-900">{filterRecipeQuality}</strong></span>
                  </>
                )}
                <span>•</span>
                <span>GENERATED: <strong className="text-slate-900">{genTimestamp}</strong></span>
              </div>
            </div>

            {/* 5-Metric KPI Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 p-2.5 rounded border border-slate-300 text-xs text-center">
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Total Planned Target
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-slate-900">
                  {totals.totalPlannedKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
                </span>
              </div>

              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Total Actual Output
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-slate-900">
                  {totals.totalActualKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
                </span>
              </div>

              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Variance / Gap
                </span>
                <span className={`text-sm sm:text-base font-black font-mono ${totals.totalGapKg <= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                  {totals.totalGapKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
                </span>
              </div>

              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Factory Waste
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-rose-700">
                  {totals.totalWasteKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
                  <span className="text-[10px] text-slate-500 block font-normal">
                    ({totals.avgWastePercent.toFixed(2)}%)
                  </span>
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Plant Efficiency
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-blue-700">
                  {totals.avgEfficiencyPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* View 1: Shift Performance Breakdown Table */}
            {activeTab === "shift" && (
              <div>
                <div className="bg-slate-200 text-slate-900 font-black text-xs uppercase px-3 py-1.5 border border-slate-400 border-b-0 text-center tracking-wider">
                  1. PRODUCTION &amp; PERFORMANCE BREAKDOWN (SHIFT-WISE)
                </div>
                <div className="overflow-x-auto border border-slate-300">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300">
                        <th className="py-2 px-2.5 text-center w-8 border-r border-slate-300">#</th>
                        <th className="py-2 px-2.5 border-r border-slate-300">Shift Name</th>
                        <th className="py-2 px-2.5 text-center border-r border-slate-300">Batches</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-300">Planned (KG)</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-300">Actual (KG)</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-300">Gap (KG)</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-300">Waste (KG)</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-300">Waste %</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-300">Net Output</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-300">Efficiency</th>
                        <th className="py-2 px-2.5 text-right border-r border-slate-300">Share %</th>
                        <th className="py-2 px-2.5">Active Operators</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.shiftWise.map((s, idx) => (
                        <tr key={s.shiftId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="py-1.5 px-2.5 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900 border-r border-slate-200">{s.shiftName}</td>
                          <td className="py-1.5 px-2.5 text-center font-mono border-r border-slate-200">{s.recordCount}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono border-r border-slate-200">{s.plannedKg.toLocaleString()}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border-r border-slate-200">{s.actualKg.toLocaleString()}</td>
                          <td className={`py-1.5 px-2.5 text-right font-mono border-r border-slate-200 ${s.gapKg > 0 ? "text-amber-700" : "text-emerald-700"}`}>{s.gapKg.toLocaleString()}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-rose-700 border-r border-slate-200">{s.wasteKg.toLocaleString()}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono border-r border-slate-200">{s.wastePercent.toFixed(2)}%</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-800 border-r border-slate-200">{s.netKg.toLocaleString()}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-blue-700 border-r border-slate-200">{s.efficiencyPercent.toFixed(1)}%</td>
                          <td className="py-1.5 px-2.5 text-right font-mono border-r border-slate-200">{s.productionShare.toFixed(1)}%</td>
                          <td className="py-1.5 px-2.5 text-[10px] text-slate-600 truncate max-w-[150px]">{s.operators.join(", ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                        <td colSpan={2} className="py-2 px-2.5 text-center border-r border-slate-300">TOTAL / PLANT AVG:</td>
                        <td className="py-2 px-2.5 text-center font-mono border-r border-slate-300">{totals.recordCount}</td>
                        <td className="py-2 px-2.5 text-right font-mono border-r border-slate-300">{totals.totalPlannedKg.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-right font-mono font-black border-r border-slate-300">{totals.totalActualKg.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-right font-mono border-r border-slate-300">{totals.totalGapKg.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-rose-700 border-r border-slate-300">{totals.totalWasteKg.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-right font-mono border-r border-slate-300">{totals.avgWastePercent.toFixed(2)}%</td>
                        <td className="py-2 px-2.5 text-right font-mono text-emerald-800 border-r border-slate-300">{totals.totalNetKg.toLocaleString()}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-blue-700 border-r border-slate-300">{totals.avgEfficiencyPercent.toFixed(1)}%</td>
                        <td className="py-2 px-2.5 text-right font-mono border-r border-slate-300">100%</td>
                        <td className="py-2 px-2.5 text-center">—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* View 2: Detailed Batch Logs Table */}
            {activeTab === "summary" && (
              <div>
                <div className="bg-slate-200 text-slate-900 font-black text-xs uppercase px-3 py-1.5 border border-slate-400 border-b-0 text-center tracking-wider">
                  1. DETAILED BATCH PRODUCTION REGISTER
                </div>
                <div className="overflow-x-auto border border-slate-300">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-300">
                        <th className="py-2 px-2 text-center w-8 border-r border-slate-300">#</th>
                        <th className="py-2 px-2 border-r border-slate-300">Date</th>
                        <th className="py-2 px-2 border-r border-slate-300">Shift</th>
                        <th className="py-2 px-2 border-r border-slate-300">Operator</th>
                        <th className="py-2 px-2 border-r border-slate-300">Quality / Recipe</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">Planned (KG)</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">Actual (KG)</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">Gap (KG)</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">Waste (KG)</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">Waste %</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">Net Output</th>
                        <th className="py-2 px-2 text-right border-r border-slate-300">Efficiency</th>
                        <th className="py-2 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {data.summary.map((r, idx) => (
                        <tr key={r.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="py-1.5 px-2 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="py-1.5 px-2 font-mono text-[10px] border-r border-slate-200">{r.date}</td>
                          <td className="py-1.5 px-2 text-[10px] border-r border-slate-200">{r.shiftName}</td>
                          <td className="py-1.5 px-2 font-medium text-slate-800 border-r border-slate-200">{r.operatorName}</td>
                          <td className="py-1.5 px-2 font-mono font-bold text-[10px] text-slate-900 border-r border-slate-200">{r.recipeQuality}</td>
                          <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200">{r.plannedKg.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 bg-slate-50 border-r border-slate-200">{r.actualKg.toLocaleString()}</td>
                          <td className={`py-1.5 px-2 text-right font-mono border-r border-slate-200 ${r.gapKg > 0 ? "text-amber-700" : "text-emerald-700"}`}>{r.gapKg.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right font-mono font-semibold text-rose-700 border-r border-slate-200">{r.wasteKg.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200">{r.wastePercent.toFixed(2)}%</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-800 border-r border-slate-200">{r.netKg.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-blue-700 border-r border-slate-200">{r.efficiencyPercent.toFixed(1)}%</td>
                          <td className="py-1.5 px-2 text-center text-[10px] font-bold text-emerald-700">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                        <td colSpan={5} className="py-2 px-2 text-center border-r border-slate-300">TOTAL SUMMARY:</td>
                        <td className="py-2 px-2 text-right font-mono border-r border-slate-300">{totals.totalPlannedKg.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono font-black border-r border-slate-300">{totals.totalActualKg.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono border-r border-slate-300">{totals.totalGapKg.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono text-rose-700 border-r border-slate-300">{totals.totalWasteKg.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono border-r border-slate-300">{totals.avgWastePercent.toFixed(2)}%</td>
                        <td className="py-2 px-2 text-right font-mono text-emerald-800 border-r border-slate-300">{totals.totalNetKg.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono text-blue-700 border-r border-slate-300">{totals.avgEfficiencyPercent.toFixed(1)}%</td>
                        <td className="py-2 px-2 text-center">{totals.recordCount} Runs</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Standard 3-Column Sign-Off Block */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-300 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="block text-[10px] font-bold uppercase text-slate-600 mb-8">
                  PREPARED BY (PRODUCTION DATA IN-CHARGE)
                </span>
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-500">
                  Signature &amp; Date
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="block text-[10px] font-bold uppercase text-slate-600 mb-8">
                  VERIFIED BY (PLANT QC &amp; QUALITY AUDIT)
                </span>
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-500">
                  Signature &amp; Stamp
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="block text-[10px] font-bold uppercase text-slate-600 mb-8">
                  APPROVED BY (PLANT MANAGER / DIRECTOR)
                </span>
                <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-500">
                  Signature &amp; Date
                </div>
              </div>
            </div>

            {/* Standard Footer Note */}
            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-200">
              <span>Flexicom ERP • Tape Plant Extrusion Production Systems</span>
              <span>Document Ref: {docRef}</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
