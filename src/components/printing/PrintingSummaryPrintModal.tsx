"use client";

import React from "react";
import { PrintingProductionSummaryResult } from "@/lib/printing/printing-types";
import { printPrintingSummaryReport } from "@/lib/printing/print-printing-summary";
import { BarChart3, Printer, X, Users, Award, Gauge } from "lucide-react";

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
  if (!open) return null;

  const periodText =
    data.startDate && data.endDate
      ? `${data.startDate} to ${data.endDate}`
      : "All Records";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Printing Production Summary & Analytics Preview
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Period: {periodText} · Customer & Quality Distribution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => printPrintingSummaryReport(data)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Printed Metres</span>
              <div className="text-2xl font-black text-blue-700 font-mono mt-1">
                {data.overall.totalPrintMtrs.toLocaleString()} <span className="text-xs font-normal">m</span>
              </div>
              <span className="text-xs text-slate-500">{data.overall.totalRolls} total rolls</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Net Weight</span>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                {data.overall.totalNetWeightKg.toLocaleString()} <span className="text-xs font-normal">kg</span>
              </div>
              <span className="text-xs text-slate-500">Avg GSM: {data.overall.avgGsm.toFixed(1)}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Variance vs Target</span>
              <div className="text-2xl font-black font-mono mt-1 text-purple-700">
                {data.overall.varianceMtrs >= 0 ? "+" : ""}{data.overall.varianceMtrs.toLocaleString()} <span className="text-xs font-normal">m</span>
              </div>
              <span className="text-xs text-slate-500">Target: {data.overall.totalTargetMtrs.toLocaleString()} m</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Overall Efficiency</span>
              <div className="text-2xl font-black font-mono mt-1 text-amber-700">
                {data.overall.overallEfficiency.toFixed(1)}%
              </div>
              <span className="text-xs text-slate-500">Across {data.overall.totalReports} shifts</span>
            </div>
          </div>

          {/* 1. Customer-Wise Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/70 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. Customer-Wise Printing Performance
              </h3>
            </div>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 text-center w-10">#</th>
                  <th className="px-3 py-2.5">Customer Name</th>
                  <th className="px-3 py-2.5">Unit</th>
                  <th className="px-3 py-2.5 text-center">Rolls</th>
                  <th className="px-3 py-2.5 text-right">Target (m)</th>
                  <th className="px-3 py-2.5 text-right">Printed (m)</th>
                  <th className="px-3 py-2.5 text-right">Fabric (m)</th>
                  <th className="px-3 py-2.5 text-right">Net Wt (Kg)</th>
                  <th className="px-3 py-2.5 text-center">Avg GSM</th>
                  <th className="px-3 py-2.5 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.customers.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-center font-bold text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{c.companyName}</td>
                    <td className="px-3 py-2 text-slate-600">{c.unitName || "—"}</td>
                    <td className="px-3 py-2 text-center font-mono font-bold">{c.totalRolls}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">{c.targetMtrs.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">{c.printMtrs.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">{c.productionMtrs.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">{c.netWeightKg.toLocaleString()} kg</td>
                    <td className="px-3 py-2 text-center font-mono">{c.avgGsm.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-purple-700">{c.sharePercent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. Quality-Wise Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/70 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. Quality-Wise Printing Breakdown
              </h3>
            </div>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 text-center w-10">#</th>
                  <th className="px-3 py-2.5">Fabric Quality</th>
                  <th className="px-3 py-2.5 text-center">Total Rolls</th>
                  <th className="px-3 py-2.5 text-right">Printed (m)</th>
                  <th className="px-3 py-2.5 text-right">Fabric (m)</th>
                  <th className="px-3 py-2.5 text-right">Net Weight (Kg)</th>
                  <th className="px-3 py-2.5 text-center">Avg GSM</th>
                  <th className="px-3 py-2.5 text-right">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.qualities.map((q, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-center font-bold text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{q.quality}</td>
                    <td className="px-3 py-2 text-center font-mono font-bold">{q.totalRolls}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">{q.printMtrs.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono">{q.productionMtrs.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">{q.netWeightKg.toLocaleString()} kg</td>
                    <td className="px-3 py-2 text-center font-mono">{q.avgGsm.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{q.sharePercent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
