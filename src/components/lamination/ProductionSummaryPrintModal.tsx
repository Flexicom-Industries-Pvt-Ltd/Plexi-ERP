"use client";

import React from "react";
import { ProductionSummaryPrintData, printProductionSummary } from "@/lib/lamination/print-production-summary";
import { exportProductionSummaryExcel } from "@/lib/lamination/production-summary-export";
import { FileText, Printer, FileSpreadsheet, X } from "lucide-react";

interface ProductionSummaryPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProductionSummaryPrintData | null;
}

export function ProductionSummaryPrintModal({
  isOpen,
  onClose,
  data,
}: ProductionSummaryPrintModalProps) {
  if (!isOpen || !data) return null;

  const { overall, contractorSummary, operatorSummary, qualitySummary, filters } = data;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printProductionSummary(data);
  };

  const handleExcelExport = () => {
    exportProductionSummaryExcel(
      overall,
      contractorSummary,
      operatorSummary,
      qualitySummary,
      { from: filters.dateFrom, to: filters.dateTo }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Lamination Production Summary Preview
              </h2>
              <p className="text-xs text-slate-400">
                Period: {filters.dateFrom} to {filters.dateTo} • {overall.totalShifts} Shift(s) • {overall.totalRolls} Roll(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExcelExport}
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
          <div className="max-w-[1240px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 font-sans text-slate-900">
            {/* Standard Company Letterhead */}
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
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • LAMINATION DIVISION
                  </div>
                  <div className="inline-block border border-slate-900 bg-slate-50 px-4 py-0.5 text-xs font-black tracking-wider text-slate-900 mt-1 uppercase">
                    LAMINATION PRODUCTION SUMMARY REPORT
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
                <div>Period: <strong className="text-slate-900">{filters.dateFrom}</strong> to <strong className="text-slate-900">{filters.dateTo}</strong></div>
                <div>Shift Filter: <strong className="text-slate-900">{filters.shiftFilter || "ALL"}</strong></div>
                <div>Contractor Filter: <strong className="text-slate-900">{filters.contractorFilter || "ALL"}</strong></div>
                <div>Total Shifts: <strong className="text-slate-900">{overall.totalShifts}</strong></div>
                <div>Generated: <strong className="text-slate-900">{genTimestamp}</strong></div>
              </div>
            </div>

            {/* Bento KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mb-5">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Shifts</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{overall.totalShifts}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rolls Processed</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{overall.totalRolls}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Input Net Wt</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{overall.totalNetWtBefore.toFixed(1)} Kg</div>
              </div>
              <div className="p-2.5 rounded-lg border border-sky-200 bg-sky-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Output Prod Mtrs</div>
                <div className="text-base font-black text-sky-700 mt-0.5">{overall.totalProductionMtrs.toLocaleString()} M</div>
              </div>
              <div className="p-2.5 rounded-lg border border-sky-200 bg-sky-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Output Net Wt</div>
                <div className="text-base font-black text-sky-700 mt-0.5">{overall.totalNetWtAfter.toFixed(1)} Kg</div>
              </div>
              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Avg Coating</div>
                <div className="text-base font-black text-emerald-700 mt-0.5">{overall.avgCoating.toFixed(1)} g/m</div>
              </div>
            </div>

            {/* 1. Contractor Summary Breakdown */}
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 border-l-2 border-sky-600 pl-2">
                1. Contractor Production Breakdown
              </h3>
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase border-b border-slate-300">
                      <th className="p-2 text-left border-r border-slate-300">Contractor Name</th>
                      <th className="p-2 text-center border-r border-slate-300 w-24">Shifts</th>
                      <th className="p-2 text-center border-r border-slate-300 w-24">Rolls</th>
                      <th className="p-2 text-right border-r border-slate-300 w-36 text-sky-800">Production (Mtrs)</th>
                      <th className="p-2 text-right border-r border-slate-300 w-36">Output Wt (kg)</th>
                      <th className="p-2 text-right w-32 bg-emerald-50 text-emerald-800">Avg Coating (g/m)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {contractorSummary.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-400 italic">No contractor data</td></tr>
                    ) : (
                      contractorSummary.map((c, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{c.contractorName}</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">{c.shifts}</td>
                          <td className="p-2 text-center font-mono font-bold border-r border-slate-200">{c.rolls}</td>
                          <td className="p-2 text-right font-mono font-bold text-sky-700 border-r border-slate-200">{c.totalProductionMtrs.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 border-r border-slate-200">{c.totalNetWtAfter.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">{c.avgCoating.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                      <td className="p-2 text-right pr-4 uppercase text-[11px]">Total:</td>
                      <td className="p-2 text-center font-mono border-r border-slate-300">{overall.totalShifts}</td>
                      <td className="p-2 text-center font-mono border-r border-slate-300">{overall.totalRolls}</td>
                      <td className="p-2 text-right font-mono text-sky-700 border-r border-slate-300">{overall.totalProductionMtrs.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">{overall.totalNetWtAfter.toFixed(1)}</td>
                      <td className="p-2 text-right font-mono text-emerald-700">{overall.avgCoating.toFixed(1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Quality-Wise Summary Breakdown */}
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 border-l-2 border-sky-600 pl-2">
                2. Quality-Wise Production Summary
              </h3>
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase border-b border-slate-300">
                      <th className="p-2 text-left border-r border-slate-300">Quality Name</th>
                      <th className="p-2 text-center border-r border-slate-300 w-24">Rolls</th>
                      <th className="p-2 text-right border-r border-slate-300 w-32">Input Roll (Mtrs)</th>
                      <th className="p-2 text-right border-r border-slate-300 w-36 text-sky-800">Output Prod (Mtrs)</th>
                      <th className="p-2 text-right border-r border-slate-300 w-32">Output Wt (kg)</th>
                      <th className="p-2 text-right w-32 bg-emerald-50 text-emerald-800">Avg Coating (g/m)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {qualitySummary.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-400 italic">No quality data</td></tr>
                    ) : (
                      qualitySummary.map((q, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{q.quality}</td>
                          <td className="p-2 text-center font-mono font-bold border-r border-slate-200">{q.rolls}</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200">{q.totalRollMtrs.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono font-bold text-sky-700 border-r border-slate-200">{q.totalProductionMtrs.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono border-r border-slate-200">{q.totalNetWtAfter.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">{q.avgCoating.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="flex justify-between items-end mt-10 pt-4 px-8">
              <div className="text-center w-44">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Prepared By</div>
              </div>
              <div className="text-center w-44">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Production Manager</div>
              </div>
              <div className="text-center w-44">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">General Manager / Plant Head</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
