"use client";

import React from "react";
import { PrintingWastageReportData, calculatePrintingWastage } from "@/lib/printing/printing-types";
import { printPrintingWastageReport } from "@/lib/printing/print-printing-wastage";
import { Trash2, Printer, X, ShieldAlert, Scale, Percent } from "lucide-react";

interface PrintingWastagePrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PrintingWastageReportData;
}

export function PrintingWastagePrintModal({
  open,
  onOpenChange,
  data,
}: PrintingWastagePrintModalProps) {
  if (!open) return null;

  const calc = calculatePrintingWastage(
    data.totalProductionKg,
    data.laminationFabricWasteKg,
    data.printFabricWasteKg
  );

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `PRN-WST-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  let assessmentColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  let assessmentText = "Within Acceptable Limit";
  if (calc.totalWastagePct > 3.0) {
    assessmentColor = "text-red-700 bg-red-50 border-red-200";
    assessmentText = "Exceeded Factory Limit";
  } else if (calc.totalWastagePct > 1.8) {
    assessmentColor = "text-amber-700 bg-amber-50 border-amber-200";
    assessmentText = "Attention Required";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Printing Wastage Report Preview
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
              onClick={() => printPrintingWastageReport(data)}
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

        {/* Scrollable Content */}
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

          {/* KPI Summary Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Base Production</span>
              <div className="text-2xl font-black text-blue-700 font-mono mt-1">
                {(Number(data.totalProductionKg) || 0).toLocaleString()} <span className="text-xs font-normal">kg</span>
              </div>
              <span className="text-xs text-slate-500">{(Number(data.totalProductionMtrs) || 0).toLocaleString()} m</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Lamination Waste</span>
              <div className="text-2xl font-black text-amber-700 font-mono mt-1">
                {(Number(data.laminationFabricWasteKg) || 0).toFixed(2)} <span className="text-xs font-normal">kg</span>
              </div>
              <span className="text-xs font-bold text-amber-700">{calc.laminationFabricWastePct.toFixed(2)}%</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Print Fabric Waste</span>
              <div className="text-2xl font-black text-purple-700 font-mono mt-1">
                {(Number(data.printFabricWasteKg) || 0).toFixed(2)} <span className="text-xs font-normal">kg</span>
              </div>
              <span className="text-xs font-bold text-purple-700">{calc.printFabricWastePct.toFixed(2)}%</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Wastage</span>
              <div className="text-2xl font-black text-red-700 font-mono mt-1">
                {calc.totalWastageKg.toFixed(2)} <span className="text-xs font-normal">kg</span>
              </div>
              <span className="text-xs font-black text-red-700">{calc.totalWastagePct.toFixed(2)}%</span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/60 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Wastage Calculation Table (Calculated from Total Production {data.totalProductionKg.toLocaleString()} kg)
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${assessmentColor}`}>
                {assessmentText}
              </span>
            </div>

            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Wastage Stream</th>
                  <th className="px-4 py-3 text-right">Quantity (Kg)</th>
                  <th className="px-4 py-3 text-right">Percentage (%)</th>
                  <th className="px-4 py-3 text-center">Standard Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 text-center font-bold text-slate-400">1</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">Lamination Fabric Waste</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-700 text-sm">
                    {(Number(data.laminationFabricWasteKg) || 0).toFixed(2)} kg
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-700 text-sm">
                    {calc.laminationFabricWastePct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">≤ 1.50%</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="px-4 py-3 text-center font-bold text-slate-400">2</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">Printing Fabric Waste</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-purple-700 text-sm">
                    {(Number(data.printFabricWasteKg) || 0).toFixed(2)} kg
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-purple-700 text-sm">
                    {calc.printFabricWastePct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">≤ 1.50%</td>
                </tr>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider text-slate-800">
                    Total Wastage:
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-700 text-base font-black">
                    {calc.totalWastageKg.toFixed(2)} kg
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-700 text-base font-black">
                    {calc.totalWastagePct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700 font-mono font-bold text-xs">≤ 3.00%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Remarks */}
          {data.remarks && (
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Root Cause & Observation Notes
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">{data.remarks}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
