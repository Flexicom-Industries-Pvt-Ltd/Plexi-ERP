"use client";

import React from "react";
import { PrintingProductionSummaryResult } from "@/lib/printing/printing-types";
import { printPrintingSummaryReport } from "@/lib/printing/print-printing-summary";
import { FileText, Printer, X } from "lucide-react";

interface PrintingSummaryPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PrintingProductionSummaryResult;
}

export function PrintingSummaryPrintModal({
  open,
  onOpenChange,
  data,
}: PrintingSummaryPrintModalProps) {
  if (!open || !data) return null;

  const periodText =
    data.startDate && data.endDate
      ? `${data.startDate} to ${data.endDate}`
      : "All Active Records";

  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printPrintingSummaryReport(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Printing Production Summary & Analytics Preview
              </h2>
              <p className="text-xs text-slate-400">
                Period: {periodText} • Total Print: {data.overall.totalPrintMtrs.toLocaleString()} Metres • {data.customers.length} Customers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-900 transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-900" />
              <span>Print Document</span>
            </button>

            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/80">
          <div className="max-w-[1080px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 font-sans text-slate-900">
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
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • PRINTING DIVISION
                  </div>
                  <div className="inline-block border border-slate-900 bg-slate-50 px-4 py-0.5 text-xs font-black tracking-wider text-slate-900 mt-1 uppercase">
                    PRINTING PRODUCTION SUMMARY & ANALYTICS REPORT
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
                <div>Period: <strong className="text-slate-900">{periodText}</strong></div>
                <div>Shifts Recorded: <strong className="text-slate-900">{data.overall.totalReports}</strong></div>
                <div>Total Rolls: <strong className="text-slate-900">{data.overall.totalRolls}</strong></div>
                <div>Avg Fabric GSM: <strong className="text-slate-900">{data.overall.avgGsm.toFixed(1)}</strong></div>
                <div>Generated: <strong className="text-slate-900">{genTimestamp}</strong></div>
              </div>
            </div>

            {/* Bento KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Total Printed Metres</div>
                <div className="text-base font-black text-sky-800 mt-0.5">
                  {data.overall.totalPrintMtrs.toLocaleString()} m
                </div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Net Weight</div>
                <div className="text-base font-black text-emerald-800 mt-0.5">
                  {data.overall.totalNetWeightKg.toLocaleString()} Kg
                </div>
              </div>

              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Variance vs Target</div>
                <div className="text-base font-black text-purple-800 mt-0.5">
                  {data.overall.varianceMtrs >= 0 ? "+" : ""}{data.overall.varianceMtrs.toLocaleString()} m
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Overall Efficiency</div>
                <div className="text-base font-black text-amber-900 mt-0.5">
                  {data.overall.overallEfficiency.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* 1. Customer-Wise Printing Table */}
            <div className="mb-6">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                1. Customer-Wise Printing Distribution ({data.customers.length} Parties)
              </div>
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase border-b border-slate-300">
                      <th className="p-2 text-center border-r border-slate-300 w-10">#</th>
                      <th className="p-2 text-left border-r border-slate-300">Customer Name</th>
                      <th className="p-2 text-left border-r border-slate-300">Unit</th>
                      <th className="p-2 text-center border-r border-slate-300 w-16">Rolls</th>
                      <th className="p-2 text-right border-r border-slate-300 w-24">Target (m)</th>
                      <th className="p-2 text-right border-r border-slate-300 w-28 bg-blue-50/60 text-blue-950 font-bold">Printed (m)</th>
                      <th className="p-2 text-right border-r border-slate-300 w-24">Fabric (m)</th>
                      <th className="p-2 text-right border-r border-slate-300 w-24">Net Wt (Kg)</th>
                      <th className="p-2 text-center border-r border-slate-300 w-16">GSM</th>
                      <th className="p-2 text-right w-20">Share %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.customers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-3 text-center text-slate-400 italic">No customer records.</td>
                      </tr>
                    ) : (
                      data.customers.map((c, i) => (
                        <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                          <td className="p-2 text-center font-bold text-slate-400 border-r border-slate-200">{i + 1}</td>
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{c.companyName}</td>
                          <td className="p-2 text-slate-600 border-r border-slate-200">{c.unitName || "—"}</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">{c.totalRolls}</td>
                          <td className="p-2 text-right font-mono text-slate-600 border-r border-slate-200">{c.targetMtrs.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono font-bold text-blue-900 bg-blue-50/30 border-r border-slate-200">{c.printMtrs.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-200">{c.productionMtrs.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-slate-900 font-semibold border-r border-slate-200">{c.netWeightKg.toLocaleString()} kg</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">{c.avgGsm.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono font-bold text-purple-700">{c.sharePercent.toFixed(1)}%</td>
                        </tr>
                      ))
                    )}
                    {/* Totals Row */}
                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                      <td colSpan={3} className="p-2 text-right pr-4 uppercase tracking-wider text-[11px]">Totals:</td>
                      <td className="p-2 text-center font-mono border-r border-slate-300">{data.overall.totalRolls}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">{data.overall.totalTargetMtrs.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono text-blue-900 bg-blue-100/50 border-r border-slate-300">{data.overall.totalPrintMtrs.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">{data.overall.totalProductionMtrs.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">{data.overall.totalNetWeightKg.toLocaleString()} kg</td>
                      <td className="p-2 text-center font-mono border-r border-slate-300">{data.overall.avgGsm.toFixed(1)}</td>
                      <td className="p-2 text-right font-mono text-purple-900">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Quality-Wise Printing Table */}
            <div className="mb-6">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                2. Quality-Wise Printing Breakdown ({data.qualities.length} Qualities)
              </div>
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase border-b border-slate-300">
                      <th className="p-2 text-center border-r border-slate-300 w-10">#</th>
                      <th className="p-2 text-left border-r border-slate-300">Fabric Quality</th>
                      <th className="p-2 text-center border-r border-slate-300 w-20">Total Rolls</th>
                      <th className="p-2 text-right border-r border-slate-300 w-32 bg-blue-50/60 text-blue-950 font-bold">Printed (m)</th>
                      <th className="p-2 text-right border-r border-slate-300 w-28">Fabric (m)</th>
                      <th className="p-2 text-right border-r border-slate-300 w-28">Net Weight (Kg)</th>
                      <th className="p-2 text-center border-r border-slate-300 w-20">Avg GSM</th>
                      <th className="p-2 text-right w-24">Share %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.qualities.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-3 text-center text-slate-400 italic">No quality records.</td>
                      </tr>
                    ) : (
                      data.qualities.map((q, i) => (
                        <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                          <td className="p-2 text-center font-bold text-slate-400 border-r border-slate-200">{i + 1}</td>
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{q.quality}</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">{q.totalRolls}</td>
                          <td className="p-2 text-right font-mono font-bold text-blue-900 bg-blue-50/30 border-r border-slate-200">{q.printMtrs.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-slate-700 border-r border-slate-200">{q.productionMtrs.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-slate-900 font-semibold border-r border-slate-200">{q.netWeightKg.toLocaleString()} kg</td>
                          <td className="p-2 text-center font-mono border-r border-slate-200">{q.avgGsm.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-700">{q.sharePercent.toFixed(1)}%</td>
                        </tr>
                      ))
                    )}
                    {/* Totals Row */}
                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                      <td colSpan={2} className="p-2 text-right pr-4 uppercase tracking-wider text-[11px]">Total Quality Print:</td>
                      <td className="p-2 text-center font-mono border-r border-slate-300">{data.overall.totalRolls}</td>
                      <td className="p-2 text-right font-mono text-blue-900 bg-blue-100/50 border-r border-slate-300">{data.overall.totalPrintMtrs.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">{data.overall.totalProductionMtrs.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono border-r border-slate-300">{data.overall.totalNetWeightKg.toLocaleString()} kg</td>
                      <td className="p-2 text-center font-mono border-r border-slate-300">{data.overall.avgGsm.toFixed(1)}</td>
                      <td className="p-2 text-right font-mono text-emerald-900">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Signatures Strip */}
            <div className="flex justify-between items-end mt-12 pt-4 px-4">
              <div className="text-center w-40">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Printing Supervisor</div>
              </div>
              <div className="text-center w-40">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Quality Manager</div>
              </div>
              <div className="text-center w-40">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Commercial In-Charge</div>
              </div>
              <div className="text-center w-40">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Plant Head / Manager</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
