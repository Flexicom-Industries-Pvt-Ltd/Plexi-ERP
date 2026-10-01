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

  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const periodText = dateRange || "All Active Records";
  const totalWaste = data.wastage.totalWasteKg || 1;
  const wasteStreams = [
    { label: "Loom Wastage", kg: data.wastage.loomWasteKg, share: totalWaste > 0 ? (data.wastage.loomWasteKg / totalWaste) * 100 : 0 },
    { label: "Lamination Wastage", kg: data.wastage.lamWasteKg, share: totalWaste > 0 ? (data.wastage.lamWasteKg / totalWaste) * 100 : 0 },
    { label: "Printing Wastage", kg: data.wastage.printWasteKg, share: totalWaste > 0 ? (data.wastage.printWasteKg / totalWaste) * 100 : 0 },
    { label: "Machine Wastage", kg: data.wastage.machineWasteKg, share: totalWaste > 0 ? (data.wastage.machineWasteKg / totalWaste) * 100 : 0 },
    { label: "Cover Patch Wastage", kg: data.wastage.coverPatchWasteKg, share: totalWaste > 0 ? (data.wastage.coverPatchWasteKg / totalWaste) * 100 : 0 },
  ];

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
                A4 Landscape Formal Enterprise Printout • Period: {periodText}
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
          <div className="bg-white shadow-xl border border-slate-300 w-full max-w-6xl p-6 text-slate-900 font-sans text-xs">
            {/* Header Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-3">
              <div className="w-16">
                <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex-1 text-center">
                <div className="text-base font-black tracking-tight text-slate-950 uppercase">
                  FLEXICOM INDUSTRIES PVT. LIMITED
                </div>
                <div className="text-[10px] text-slate-500 font-semibold tracking-wide mt-0.5">
                  SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CONVERTEX DIVISION
                </div>
                <div className="inline-block border border-slate-900 bg-slate-50 px-4 py-0.5 text-[11px] font-black tracking-wider uppercase mt-1 mb-1">
                  CONVERTEX PRODUCTION & WASTAGE EXECUTIVE SUMMARY
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[10px] text-slate-600 mt-0.5">
                  <span>Period: <strong className="text-slate-900">{periodText}</strong></span>
                  <span>Division: <strong className="text-slate-900">Convertex Bag Making</strong></span>
                  <span>Generated: <strong className="text-slate-900">{genTimestamp}</strong></span>
                </div>
              </div>
              <div className="w-16 text-right">
                <span className="text-[9px] font-bold border border-slate-300 px-1.5 py-0.5 rounded-sm bg-slate-50 text-slate-500">
                  A4 LANDSCAPE
                </span>
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4 text-center">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total Rolls</div>
                <div className="text-sm font-black text-slate-900 font-mono">{data.overall.totalRolls}</div>
              </div>
              <div className="bg-emerald-50 rounded p-1">
                <div className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold">Total Bags (Pcs)</div>
                <div className="text-sm font-black text-emerald-800 font-mono">
                  {data.overall.totalProductionPcs.toLocaleString()}
                </div>
              </div>
              <div className="bg-teal-50 rounded p-1">
                <div className="text-[9px] uppercase tracking-wider text-teal-700 font-bold">Gross (Kg)</div>
                <div className="text-sm font-black text-teal-800 font-mono">
                  {data.overall.totalProductionKg.toFixed(1)}
                </div>
              </div>
              <div className="bg-rose-50 rounded p-1">
                <div className="text-[9px] uppercase tracking-wider text-rose-700 font-bold">Total Waste</div>
                <div className="text-sm font-black text-rose-800 font-mono">
                  {data.overall.totalWastageKg.toFixed(1)} kg
                </div>
              </div>
              <div className="bg-amber-50 rounded p-1">
                <div className="text-[9px] uppercase tracking-wider text-amber-700 font-bold">Scrap Rate</div>
                <div className="text-sm font-black text-amber-800 font-mono">
                  {data.overall.totalWastagePct.toFixed(2)}%
                </div>
              </div>
              <div className="bg-emerald-50 rounded p-1">
                <div className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold">Net Good (Kg)</div>
                <div className="text-sm font-black text-emerald-800 font-mono">
                  {data.overall.totalNetProductionKg.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Quality Summary Table */}
            <div className="mb-4">
              <h3 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-sky-600 inline-block rounded-xs"></span>
                1. Quality-Wise Production & Wastage Breakdown
              </h3>
              <div className="overflow-x-auto border border-slate-400">
                <table className="w-full text-left border-collapse text-[9px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-black uppercase text-[8px]">
                      <th className="p-1 border-r border-slate-300 text-center">#</th>
                      <th className="p-1 border-r border-slate-300 bg-amber-50 text-slate-900">Quality</th>
                      <th className="p-1 border-r border-slate-300 text-center">Rolls</th>
                      <th className="p-1 border-r border-slate-300 text-right bg-emerald-50 text-emerald-800">Bags (Pcs)</th>
                      <th className="p-1 border-r border-slate-300 text-right bg-teal-50 text-teal-800">Gross (Kg)</th>
                      <th className="p-1 border-r border-slate-300 text-right">Meters</th>
                      <th className="p-1 border-r border-slate-300 text-right">Net Wt</th>
                      <th className="p-1 border-r border-slate-300 text-right">Avg (g/m)</th>
                      <th className="p-1 border-r border-slate-300 text-right text-indigo-700">Cover OS</th>
                      <th className="p-1 border-r border-slate-300 text-right text-indigo-700">Cover DS</th>
                      <th className="p-1 border-r border-slate-300 text-right text-indigo-900">Valve</th>
                      <th className="p-1 border-r border-slate-300 text-right bg-rose-50 text-rose-800">Waste (Kg)</th>
                      <th className="p-1 border-r border-slate-300 text-right bg-amber-50 text-amber-800">Waste %</th>
                      <th className="p-1 text-right bg-emerald-50 text-emerald-800">Net Prod (Kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.qualities.length > 0 ? (
                      data.qualities.map((q, idx) => (
                        <tr key={idx} className={`border-b border-slate-200 ${idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}`}>
                          <td className="p-1 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-1 border-r border-slate-200 font-bold text-slate-900 bg-amber-50/30">{q.quality}</td>
                          <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-sky-700">{q.rollsCount}</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                            {q.productionPcs.toLocaleString()}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-teal-800 bg-teal-50/30">
                            {q.productionKg.toFixed(1)}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-700">{q.totalRollMtr.toLocaleString()}</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-700">{q.totalNetWt.toFixed(1)}</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-sky-700">{q.avgGsm.toFixed(1)}</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-indigo-700">{q.coverPatchOs}</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-indigo-700">{q.coverPatchDs}</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-indigo-900 font-bold">{q.valvePatch}</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-rose-800 bg-rose-50/30">{q.totalWasteKg.toFixed(2)}</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-amber-800 bg-amber-50/30">{q.totalWastePct.toFixed(2)}%</td>
                          <td className="p-1 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">{q.netProductionKg.toFixed(1)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={14} className="p-6 text-center text-slate-400 italic">
                          No quality records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-900 text-slate-900 text-[9px]">
                      <td className="p-1 text-center">Σ</td>
                      <td className="p-1 uppercase">Totals:</td>
                      <td className="p-1 text-center font-mono text-sky-700">{data.overall.totalRolls}</td>
                      <td className="p-1 text-right font-mono text-emerald-800 font-black">{data.overall.totalProductionPcs.toLocaleString()}</td>
                      <td className="p-1 text-right font-mono text-teal-800 font-black">{data.overall.totalProductionKg.toFixed(1)} kg</td>
                      <td className="p-1 text-right font-mono">{data.overall.totalRollMtr.toLocaleString()}</td>
                      <td className="p-1 text-right font-mono">{data.overall.totalNetWt.toFixed(1)}</td>
                      <td className="p-1 text-right font-mono text-sky-800">{data.overall.avgGsm.toFixed(1)}</td>
                      <td className="p-1 text-right font-mono text-indigo-700">{data.overall.totalCoverPatchOs}</td>
                      <td className="p-1 text-right font-mono text-indigo-700">{data.overall.totalCoverPatchDs}</td>
                      <td className="p-1 text-right font-mono text-indigo-900">{data.overall.totalValvePatch}</td>
                      <td className="p-1 text-right font-mono text-rose-800 font-black">{data.overall.totalWastageKg.toFixed(2)} kg</td>
                      <td className="p-1 text-right font-mono text-amber-800 font-bold">{data.overall.totalWastagePct.toFixed(2)}%</td>
                      <td className="p-1 text-right font-mono text-emerald-800 font-black">{data.overall.totalNetProductionKg.toFixed(1)} kg</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Scrap Stream Table */}
            <div className="mb-4">
              <h3 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-rose-600 inline-block rounded-xs"></span>
                2. Granular Scrap Stream Breakdown
              </h3>
              <div className="overflow-x-auto border border-slate-400 max-w-2xl">
                <table className="w-full text-left border-collapse text-[9px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-black uppercase text-[8px]">
                      <th className="p-1 border-r border-slate-300 text-center w-8">#</th>
                      <th className="p-1 border-r border-slate-300">Scrap Stream / Category</th>
                      <th className="p-1 border-r border-slate-300 text-right">Waste (Kg)</th>
                      <th className="p-1 border-r border-slate-300 text-right">Share of Scrap (%)</th>
                      <th className="p-1 text-right">% of Gross Output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wasteStreams.map((w, idx) => {
                      const pctOfGross = data.overall.totalProductionKg > 0 ? (w.kg / data.overall.totalProductionKg) * 100 : 0;
                      return (
                        <tr key={idx} className={`border-b border-slate-200 ${idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}`}>
                          <td className="p-1 border-r border-slate-200 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-1 border-r border-slate-200 font-semibold text-slate-900">{w.label}</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-rose-800">{w.kg.toFixed(2)} kg</td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-purple-700 bg-purple-50/30">{w.share.toFixed(1)}%</td>
                          <td className="p-1 text-right font-mono text-slate-600">{pctOfGross.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-900 text-slate-900 text-[9px]">
                      <td className="p-1 text-center">Σ</td>
                      <td className="p-1 uppercase">Total Scrap Recorded:</td>
                      <td className="p-1 text-right font-mono text-rose-800 font-black">{data.overall.totalWastageKg.toFixed(2)} kg</td>
                      <td className="p-1 text-right font-mono text-purple-700 font-black">100.0%</td>
                      <td className="p-1 text-right font-mono text-amber-800 font-black">{data.overall.totalWastagePct.toFixed(2)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Standard 4-Block Signatures Strip */}
            <div className="flex justify-between items-end mt-8 pt-4 px-4">
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Prepared By
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">_______________</div>
              </div>
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Production In-Charge
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">_______________</div>
              </div>
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Quality Head
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">_______________</div>
              </div>
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Plant Head / GM
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">_______________</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
