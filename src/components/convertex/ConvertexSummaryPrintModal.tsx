"use client";

import React from "react";
import { ConvertexSummaryResult } from "@/lib/convertex/convertex-types";
import { printConvertexSummaryReport } from "@/lib/convertex/print-convertex-summary";
import { exportConvertexSummaryExcel } from "@/lib/convertex/convertex-export";
import { FileText, Printer, FileSpreadsheet, X } from "lucide-react";

interface ConvertexSummaryPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ConvertexSummaryResult;
  dateRange: string;
}

export function ConvertexSummaryPrintModal({
  open,
  onOpenChange,
  data,
  dateRange,
}: ConvertexSummaryPrintModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Convertex Executive Summary Preview
              </h2>
              <p className="text-xs text-slate-400">
                A4 Landscape Formal Enterprise Printout • Period: {dateRange}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportConvertexSummaryExcel(data, dateRange)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Download Excel
            </button>
            <button
              onClick={() => printConvertexSummaryReport(data, dateRange)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Sheet
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Paper Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md border border-slate-300 w-full max-w-[1100px] text-xs space-y-4">
            {/* Header */}
            <div className="text-center border-b pb-3 border-slate-200">
              <h1 className="text-lg font-black text-slate-900">
                FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA
              </h1>
              <h2 className="text-sm font-bold text-sky-700 uppercase tracking-wide">
                Convertex Production & Wastage Executive Summary
              </h2>
              <div className="text-[11px] text-slate-500 mt-1">
                Period: <strong className="text-slate-800">{dateRange}</strong>
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-sky-50 border border-sky-200 rounded">
                <div className="text-[10px] uppercase text-sky-700 font-bold">Total Rolls</div>
                <div className="text-sm font-bold font-mono text-sky-900 mt-0.5">
                  {data.overall.totalRolls}
                </div>
              </div>
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
                <div className="text-[10px] uppercase text-emerald-700 font-bold">Total Production</div>
                <div className="text-sm font-bold font-mono text-emerald-900 mt-0.5">
                  {data.overall.totalProductionPcs.toLocaleString()} pcs ({data.overall.totalProductionKg.toFixed(1)} kg)
                </div>
              </div>
              <div className="p-2 bg-rose-50 border border-rose-200 rounded">
                <div className="text-[10px] uppercase text-rose-700 font-bold">Total Waste</div>
                <div className="text-sm font-bold font-mono text-rose-900 mt-0.5">
                  {data.overall.totalWastageKg.toFixed(1)} kg ({data.overall.totalWastagePct.toFixed(2)}%)
                </div>
              </div>
              <div className="p-2 bg-teal-50 border border-teal-200 rounded">
                <div className="text-[10px] uppercase text-teal-700 font-bold">Net Production</div>
                <div className="text-sm font-bold font-mono text-teal-900 mt-0.5">
                  {data.overall.totalNetProductionKg.toFixed(1)} kg
                </div>
              </div>
            </div>

            {/* Quality Summary Table */}
            <div>
              <h3 className="font-bold text-slate-800 mb-1.5 uppercase text-[11px]">
                Quality Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[10px]">
                      <th className="p-1.5 border border-slate-700 text-center">#</th>
                      <th className="p-1.5 border border-slate-700">Quality</th>
                      <th className="p-1.5 border border-slate-700 text-center">Rolls</th>
                      <th className="p-1.5 border border-slate-700 text-right">Meters</th>
                      <th className="p-1.5 border border-slate-700 text-right">Net Wt</th>
                      <th className="p-1.5 border border-slate-700 text-right">Avg (g/m)</th>
                      <th className="p-1.5 border border-slate-700 text-right bg-emerald-950">Prod (Pcs)</th>
                      <th className="p-1.5 border border-slate-700 text-right bg-teal-950">Prod (Kg)</th>
                      <th className="p-1.5 border border-slate-700 text-right">Cover OS</th>
                      <th className="p-1.5 border border-slate-700 text-right">Cover DS</th>
                      <th className="p-1.5 border border-slate-700 text-right">Valve</th>
                      <th className="p-1.5 border border-slate-700 text-right bg-red-950">Waste (Kg)</th>
                      <th className="p-1.5 border border-slate-700 text-right bg-amber-950">Waste %</th>
                      <th className="p-1.5 border border-slate-700 text-right bg-emerald-950">Net Prod (Kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.qualities.map((q, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                        <td className="p-1.5 border border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-1.5 border border-slate-200 font-semibold text-slate-900">{q.quality}</td>
                        <td className="p-1.5 border border-slate-200 text-center font-mono font-bold text-sky-700">{q.rollsCount}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono">{q.totalRollMtr.toLocaleString()}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono">{q.totalNetWt.toFixed(1)}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono text-sky-800 bg-sky-50/30">{q.avgGsm.toFixed(1)}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">{q.productionPcs.toLocaleString()}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-teal-800 bg-teal-50/30">{q.productionKg.toFixed(1)}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono text-indigo-700">{q.coverPatchOs}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono text-indigo-700">{q.coverPatchDs}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono text-indigo-900">{q.valvePatch}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono text-red-700">{q.totalWasteKg.toFixed(1)}</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono text-amber-700">{q.totalWastePct.toFixed(2)}%</td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-emerald-900 bg-emerald-50/30">{q.netProductionKg.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                      <td colSpan={2} className="p-1.5 text-right uppercase">Total:</td>
                      <td className="p-1.5 text-center font-mono text-sky-800">{data.overall.totalRolls}</td>
                      <td className="p-1.5 text-right font-mono">{data.overall.totalRollMtr.toLocaleString()}</td>
                      <td className="p-1.5 text-right font-mono">{data.overall.totalNetWt.toFixed(1)}</td>
                      <td className="p-1.5 text-right font-mono text-sky-800">{data.overall.avgGsm.toFixed(1)}</td>
                      <td className="p-1.5 text-right font-mono text-emerald-800 font-black">{data.overall.totalProductionPcs.toLocaleString()}</td>
                      <td className="p-1.5 text-right font-mono text-teal-800 font-black">{data.overall.totalProductionKg.toFixed(1)}</td>
                      <td className="p-1.5 text-right font-mono text-indigo-800">{data.overall.totalCoverPatchOs}</td>
                      <td className="p-1.5 text-right font-mono text-indigo-800">{data.overall.totalCoverPatchDs}</td>
                      <td className="p-1.5 text-right font-mono text-indigo-900">{data.overall.totalValvePatch}</td>
                      <td className="p-1.5 text-right font-mono text-red-800">{data.overall.totalWastageKg.toFixed(1)}</td>
                      <td className="p-1.5 text-right font-mono text-amber-800">{data.overall.totalWastagePct.toFixed(2)}%</td>
                      <td className="p-1.5 text-right font-mono text-emerald-800 font-black">{data.overall.totalNetProductionKg.toFixed(1)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Wastage Breakdown Table */}
            <div>
              <h3 className="font-bold text-slate-800 mb-1.5 uppercase text-[11px]">
                Wastage Breakdown
              </h3>
              <div className="overflow-x-auto max-w-lg">
                <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[10px]">
                      <th className="p-1.5 border border-slate-700">Wastage Stream</th>
                      <th className="p-1.5 border border-slate-700 text-right">Quantity (Kg)</th>
                      <th className="p-1.5 border border-slate-700 text-right">Percentage (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1.5 border border-slate-200">Loom Fabric Wastage</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.loomWasteKg.toFixed(2)} kg</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.loomWastePct.toFixed(2)}%</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-1.5 border border-slate-200">Lamination Fabric Wastage</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.lamWasteKg.toFixed(2)} kg</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.lamWastePct.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border border-slate-200">Print Fabric Wastage</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.printWasteKg.toFixed(2)} kg</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.printWastePct.toFixed(2)}%</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-1.5 border border-slate-200">Machine Operational Wastage</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.machineWasteKg.toFixed(2)} kg</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.machineWastePct.toFixed(2)}%</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border border-slate-200">Cover Patch Wastage</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.coverPatchWasteKg.toFixed(2)} kg</td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">{data.wastage.coverPatchWastePct.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-red-50 font-bold border-t-2 border-slate-900 text-red-900">
                      <td className="p-1.5 uppercase">Total Wastage:</td>
                      <td className="p-1.5 text-right font-mono">{data.wastage.totalWasteKg.toFixed(2)} kg</td>
                      <td className="p-1.5 text-right font-mono">{data.wastage.totalWastePct.toFixed(2)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
