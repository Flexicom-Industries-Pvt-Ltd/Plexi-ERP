"use client";

import React, { useMemo } from "react";
import {
  PrintingRawMaterialReportData,
  computePrintingRawMaterialTotals,
} from "@/lib/printing/printing-types";
import { printPrintingRawMaterialReport } from "@/lib/printing/print-printing-raw-materials";
import { Droplets, Printer, X, Scale, Gauge, Percent } from "lucide-react";

interface PrintingRawMaterialPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PrintingRawMaterialReportData;
}

export function PrintingRawMaterialPrintModal({
  open,
  onOpenChange,
  data,
}: PrintingRawMaterialPrintModalProps) {
  const { totals, calculatedEntries } = useMemo(
    () => computePrintingRawMaterialTotals(data.entries, data.totalPrintMtrs),
    [data.entries, data.totalPrintMtrs]
  );

  if (!open) return null;

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `PRN-RM-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Printing Raw Material Consumption Report Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    data.status === "APPROVED"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                      : data.status === "SUBMITTED"
                      ? "bg-blue-500/20 text-blue-300 border-blue-400/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-400/40"
                  }`}
                >
                  {data.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {docRef} · {data.date} · {data.shiftName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => printPrintingRawMaterialReport(data)}
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

        {/* Preview Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {/* Header Summary Card */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{data.date}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Shift</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{data.shiftName}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Operator</span>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{data.operatorName || "—"}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supervisor</span>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{data.supervisorName || "—"}</p>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Printed Metres</span>
              <div className="text-2xl font-black text-blue-700 font-mono mt-1">
                {totals.totalPrintMtrs.toLocaleString()} <span className="text-xs font-normal">m</span>
              </div>
              <span className="text-xs text-slate-500">Base production length</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Consumed (L)</span>
              <div className="text-2xl font-black text-indigo-700 font-mono mt-1">
                {totals.totalConsumedLitre.toFixed(2)} <span className="text-xs font-normal">L</span>
              </div>
              <span className="text-xs text-slate-500">Liquid volume</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Consumed (Kg)</span>
              <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
                {totals.totalConsumedKg.toFixed(2)} <span className="text-xs font-normal">kg</span>
              </div>
              <span className="text-xs text-slate-500">x 0.82 density conversion</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Overall Mileage</span>
              <div className="text-2xl font-black text-purple-700 font-mono mt-1">
                {totals.overallMileage.toLocaleString()} <span className="text-xs font-normal">m/kg</span>
              </div>
              <span className="text-xs text-slate-500">Total output per kg</span>
            </div>
          </div>

          {/* Consumption Entries Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/60 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Raw Material Consumption Breakdown
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {calculatedEntries.length} Items recorded
              </span>
            </div>

            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 text-center w-10">#</th>
                  <th className="px-3 py-2.5">Material Name</th>
                  <th className="px-3 py-2.5 text-center">Unit</th>
                  <th className="px-3 py-2.5 text-right">Consumed (L)</th>
                  <th className="px-3 py-2.5 text-center">Factor</th>
                  <th className="px-3 py-2.5 text-right">Consumed (Kg)</th>
                  <th className="px-3 py-2.5 text-right">Ratio (%)</th>
                  <th className="px-3 py-2.5 text-right">Mileage (m/kg)</th>
                  <th className="px-3 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calculatedEntries.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.materialName}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                        {row.unit || "LITRE"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-blue-700 font-medium">
                      {(Number(row.consumedLitre) || 0) > 0 ? Number(row.consumedLitre).toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-500">
                      {(Number(row.conversionFactor) || 0.82).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                      {(Number(row.consumedKg) || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-purple-700">
                      {(Number(row.ratioPercent) || 0) > 0 ? `${Number(row.ratioPercent).toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-blue-800">
                      {(Number(row.mileage) || 0) > 0 ? `${Number(row.mileage).toLocaleString()} m/kg` : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-[11px]">{row.remarks || "—"}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <td colSpan={3} className="px-3 py-2 text-right uppercase tracking-wider text-slate-800">
                    Totals:
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-blue-700">
                    {totals.totalConsumedLitre.toFixed(2)} L
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-slate-500">—</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-800 text-sm">
                    {totals.totalConsumedKg.toFixed(2)} kg
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-purple-800">
                    {totals.totalConsumedKg > 0 ? "100.0%" : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-blue-900 text-sm">
                    {totals.overallMileage.toLocaleString()} m/kg
                  </td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
