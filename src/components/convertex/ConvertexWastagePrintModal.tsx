"use client";

import React, { useMemo } from "react";
import {
  ConvertexWastageReportData,
  computeConvertexWastageTotals,
} from "@/lib/convertex/convertex-types";
import { printConvertexWastageReport } from "@/lib/convertex/print-convertex-wastage";
import { exportConvertexWastageReportExcel } from "@/lib/convertex/convertex-export";
import { FileText, Printer, FileSpreadsheet, X } from "lucide-react";

interface ConvertexWastagePrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ConvertexWastageReportData;
}

export function ConvertexWastagePrintModal({
  open,
  onOpenChange,
  data,
}: ConvertexWastagePrintModalProps) {
  const totals = useMemo(
    () => computeConvertexWastageTotals(data.entries),
    [data.entries]
  );

  if (!open) return null;

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(
    /[^a-zA-Z0-9]/g,
    ""
  );
  const docRef = `CVX-WST-${docDate}-${(data.shiftName || "SHIFT")
    .toUpperCase()
    .replace(/\s+/g, "")}-${(data.machineNo || "M1").replace(/[^a-zA-Z0-9]/g, "")}`;

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
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Convertex Wastage Report Preview
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
              <p className="text-xs text-slate-400">
                A4 Landscape Formal Enterprise Printout • Ref: {docRef}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportConvertexWastageReportExcel(data)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Download Excel
            </button>
            <button
              onClick={() => printConvertexWastageReport(data)}
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
              <h2 className="text-sm font-bold text-rose-700 uppercase tracking-wide">
                Convertex Machine - Shift Wastage Report
              </h2>
              <div className="text-[11px] text-slate-500 mt-1">
                Date: <strong className="text-slate-800">{data.date}</strong> | Shift:{" "}
                <strong className="text-slate-800">{data.shiftName}</strong> | Machine:{" "}
                <strong className="text-slate-800">{data.machineNo || "Convertex-1"}</strong> | Operator:{" "}
                <strong className="text-slate-800">{data.operatorName || "—"}</strong>
              </div>
            </div>

            {/* KPI Summary strip */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-teal-50 border border-teal-200 rounded">
                <div className="text-[10px] uppercase text-teal-700 font-bold">Production (Kg)</div>
                <div className="text-sm font-bold font-mono text-teal-900 mt-0.5">
                  {totals.totalProductionKg.toFixed(1)} kg
                </div>
              </div>
              <div className="p-2 bg-rose-50 border border-rose-200 rounded">
                <div className="text-[10px] uppercase text-rose-700 font-bold">Total Waste (Kg)</div>
                <div className="text-sm font-bold font-mono text-rose-900 mt-0.5">
                  {totals.totalWastageKg.toFixed(2)} kg
                </div>
              </div>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                <div className="text-[10px] uppercase text-amber-700 font-bold">Waste %</div>
                <div className="text-sm font-bold font-mono text-amber-900 mt-0.5">
                  {totals.totalWastagePct.toFixed(2)}%
                </div>
              </div>
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
                <div className="text-[10px] uppercase text-emerald-700 font-bold">Net Production</div>
                <div className="text-sm font-bold font-mono text-emerald-900 mt-0.5">
                  {totals.totalNetProductionKg.toFixed(1)} kg
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10px]">
                    <th className="p-1.5 border border-slate-700 text-center">#</th>
                    <th className="p-1.5 border border-slate-700">Quality</th>
                    <th className="p-1.5 border border-slate-700 text-center">Roll No</th>
                    <th className="p-1.5 border border-slate-700 text-right bg-teal-950">Prod (Kg)</th>
                    <th className="p-1.5 border border-slate-700 text-right">Loom (Kg)</th>
                    <th className="p-1.5 border border-slate-700 text-right">Lam (Kg)</th>
                    <th className="p-1.5 border border-slate-700 text-right">Print (Kg)</th>
                    <th className="p-1.5 border border-slate-700 text-right">Mach (Kg)</th>
                    <th className="p-1.5 border border-slate-700 text-right">Cover Patch (Kg)</th>
                    <th className="p-1.5 border border-slate-700 text-right bg-red-950">Total (Kg)</th>
                    <th className="p-1.5 border border-slate-700 text-right bg-amber-950">Waste %</th>
                    <th className="p-1.5 border border-slate-700 text-right bg-emerald-950">Net Prod (Kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.entries.map((e, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                      <td className="p-1.5 border border-slate-200 text-center font-bold text-slate-500">
                        {e.sequence || idx + 1}
                      </td>
                      <td className="p-1.5 border border-slate-200 font-semibold text-slate-900">
                        {e.quality || "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-center font-mono font-bold text-slate-900">
                        {e.rollNumber || "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-teal-800 bg-teal-50/30">
                        {e.productionKg > 0 ? e.productionKg.toFixed(1) : "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">
                        {e.loomWasteKg > 0 ? e.loomWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">
                        {e.lamWasteKg > 0 ? e.lamWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">
                        {e.printWasteKg > 0 ? e.printWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono">
                        {e.machineWasteKg > 0 ? e.machineWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono text-indigo-700">
                        {e.coverPatchWasteKg > 0 ? e.coverPatchWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-red-700 bg-red-50/30">
                        {e.totalWasteKg > 0 ? e.totalWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-amber-700 bg-amber-50/30">
                        {e.totalWastePct > 0 ? `${e.totalWastePct.toFixed(2)}%` : "—"}
                      </td>
                      <td className="p-1.5 border border-slate-200 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30">
                        {e.netProductionKg > 0 ? e.netProductionKg.toFixed(1) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <td colSpan={3} className="p-1.5 text-right uppercase">
                      Shift Totals ({data.entries.length} Rolls):
                    </td>
                    <td className="p-1.5 text-right font-mono text-teal-900 bg-teal-100/50">
                      {totals.totalProductionKg > 0 ? totals.totalProductionKg.toFixed(1) : "—"}
                    </td>
                    <td className="p-1.5 text-right font-mono">
                      {totals.totalLoomWasteKg > 0 ? totals.totalLoomWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1.5 text-right font-mono">
                      {totals.totalLamWasteKg > 0 ? totals.totalLamWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1.5 text-right font-mono">
                      {totals.totalPrintWasteKg > 0 ? totals.totalPrintWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1.5 text-right font-mono">
                      {totals.totalMachineWasteKg > 0 ? totals.totalMachineWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1.5 text-right font-mono text-indigo-800">
                      {totals.totalCoverPatchWasteKg > 0 ? totals.totalCoverPatchWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1.5 text-right font-mono text-red-800 bg-red-100/50">
                      {totals.totalWastageKg > 0 ? totals.totalWastageKg.toFixed(2) : "0.00"}
                    </td>
                    <td className="p-1.5 text-right font-mono text-amber-800 bg-amber-100/50">
                      {totals.totalWastagePct > 0 ? `${totals.totalWastagePct.toFixed(2)}%` : "0.00%"}
                    </td>
                    <td className="p-1.5 text-right font-mono text-emerald-800 bg-emerald-100/50">
                      {totals.totalNetProductionKg > 0 ? totals.totalNetProductionKg.toFixed(1) : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Remarks */}
            {data.remarks && (
              <div className="p-2 bg-amber-50/50 border border-amber-200 rounded text-xs text-amber-900">
                <strong>Remarks:</strong> {data.remarks}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
