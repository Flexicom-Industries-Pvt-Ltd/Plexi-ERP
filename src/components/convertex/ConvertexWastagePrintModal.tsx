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
  const docRef = `CVX-WS-${docDate}-${(data.shiftName || "SHIFT")
    .toUpperCase()
    .replace(/\s+/g, "")}-${(data.machineNo || "M1").replace(/[^a-zA-Z0-9]/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

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
                  CONVERTEX WASTAGE & SCRAP ACCOUNTING REPORT
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[10px] text-slate-600 mt-0.5">
                  <span>Doc Ref: <strong className="text-slate-900 font-mono">{docRef}</strong></span>
                  <span>Date: <strong className="text-slate-900">{data.date}</strong></span>
                  <span>Shift: <strong className="text-slate-900">{data.shiftName}</strong></span>
                  <span>Machine: <strong className="text-slate-900">{data.machineNo || "Convertex-1"}</strong></span>
                  <span>Supervisor: <strong className="text-slate-900">{data.supervisorName || "—"}</strong></span>
                  <span>Operator: <strong className="text-slate-900">{data.operatorName || "—"}</strong></span>
                  <span>Generated: <strong className="text-slate-900">{genTimestamp}</strong></span>
                </div>
              </div>
              <div className="w-16 text-right">
                <span className="text-[9px] font-bold border border-slate-300 px-1.5 py-0.5 rounded-sm bg-slate-50 text-slate-500">
                  A4 LANDSCAPE
                </span>
              </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-10 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4 text-center">
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Total Rolls</div>
                <div className="text-sm font-black text-slate-900 font-mono">{data.entries.length}</div>
              </div>
              <div className="bg-teal-50 rounded p-1">
                <div className="text-[8px] uppercase tracking-wider text-teal-700 font-bold">Gross (Kg)</div>
                <div className="text-sm font-black text-teal-800 font-mono">{totals.totalProductionKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Loom Waste</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalLoomWasteKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Lam Waste</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalLamWasteKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Print Waste</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalPrintWasteKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Machine Waste</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalMachineWasteKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Cover Waste</div>
                <div className="text-sm font-black text-indigo-700 font-mono">{totals.totalCoverPatchWasteKg.toFixed(1)}</div>
              </div>
              <div className="bg-rose-50 rounded p-1">
                <div className="text-[8px] uppercase tracking-wider text-rose-700 font-bold">Total Waste</div>
                <div className="text-sm font-black text-rose-800 font-mono">{totals.totalWastageKg.toFixed(1)}</div>
              </div>
              <div className="bg-amber-50 rounded p-1">
                <div className="text-[8px] uppercase tracking-wider text-amber-700 font-bold">Waste %</div>
                <div className="text-sm font-black text-amber-800 font-mono">{totals.totalWastagePct.toFixed(2)}%</div>
              </div>
              <div className="bg-emerald-50 rounded p-1">
                <div className="text-[8px] uppercase tracking-wider text-emerald-700 font-bold">Net Prod (Kg)</div>
                <div className="text-sm font-black text-emerald-800 font-mono">{totals.totalNetProductionKg.toFixed(1)}</div>
              </div>
            </div>

            {/* Data Table */}
            <div className="border border-slate-400 overflow-x-auto mb-4">
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-black uppercase text-[8px]">
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center">Sl</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-left bg-amber-50 text-slate-900">Quality</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center">Roll No</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right bg-teal-50 text-teal-800">Prod (Kg)</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Loom Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Lam Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Print Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Machine Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Cover Patch Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center bg-rose-50 text-rose-900">Total Waste</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right bg-emerald-50 text-emerald-800">Net Prod (Kg)</th>
                    <th rowSpan={2} className="p-1.5 text-left">Remarks</th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-bold text-[7.5px] uppercase">
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                    <th className="p-1 border-r border-slate-300 text-right bg-rose-50/70 text-rose-900">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right bg-rose-50/70 text-rose-900">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.length > 0 ? (
                    data.entries.map((entry, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-200 ${
                          idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"
                        }`}
                      >
                        <td className="p-1 border-r border-slate-200 text-center font-bold text-slate-500">
                          {entry.sequence || idx + 1}
                        </td>
                        <td className="p-1 border-r border-slate-200 font-bold text-slate-900 bg-amber-50/30 truncate max-w-[100px]">
                          {entry.quality || "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                          {entry.rollNumber || "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-teal-800 bg-teal-50/30">
                          {entry.productionKg ? Number(entry.productionKg).toFixed(1) : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-800">
                          {entry.loomWasteKg ? Number(entry.loomWasteKg).toFixed(2) : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-[8px] text-slate-500">
                          {entry.loomWastePct ? `${Number(entry.loomWastePct).toFixed(2)}%` : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-800">
                          {entry.lamWasteKg ? Number(entry.lamWasteKg).toFixed(2) : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-[8px] text-slate-500">
                          {entry.lamWastePct ? `${Number(entry.lamWastePct).toFixed(2)}%` : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-800">
                          {entry.printWasteKg ? Number(entry.printWasteKg).toFixed(2) : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-[8px] text-slate-500">
                          {entry.printWastePct ? `${Number(entry.printWastePct).toFixed(2)}%` : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-800">
                          {entry.machineWasteKg ? Number(entry.machineWasteKg).toFixed(2) : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-[8px] text-slate-500">
                          {entry.machineWastePct ? `${Number(entry.machineWastePct).toFixed(2)}%` : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-indigo-700">
                          {entry.coverPatchWasteKg ? Number(entry.coverPatchWasteKg).toFixed(2) : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-[8px] text-indigo-500">
                          {entry.coverPatchWastePct ? `${Number(entry.coverPatchWastePct).toFixed(2)}%` : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-rose-800 bg-rose-50/40">
                          {entry.totalWasteKg ? Number(entry.totalWasteKg).toFixed(2) : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-amber-700 bg-amber-50/40">
                          {entry.totalWastePct ? `${Number(entry.totalWastePct).toFixed(2)}%` : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">
                          {entry.netProductionKg ? Number(entry.netProductionKg).toFixed(1) : "—"}
                        </td>
                        <td className="p-1 text-slate-500 truncate max-w-[80px]">
                          {entry.remarks || ""}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={18} className="p-6 text-center text-slate-400 italic">
                        No wastage records entered for this shift.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-900 text-slate-900 text-[9px]">
                    <td className="p-1 text-center">Σ</td>
                    <td colSpan={2} className="p-1 text-left uppercase">
                      Totals / Overall Wastage:
                    </td>
                    <td className="p-1 text-right font-mono text-teal-800 font-black">
                      {totals.totalProductionKg > 0 ? `${totals.totalProductionKg.toFixed(1)} kg` : "—"}
                    </td>
                    <td className="p-1 text-right font-mono">
                      {totals.totalLoomWasteKg > 0 ? totals.totalLoomWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-[8px] text-slate-500">
                      {totals.totalLoomWastePct > 0 ? `${totals.totalLoomWastePct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-1 text-right font-mono">
                      {totals.totalLamWasteKg > 0 ? totals.totalLamWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-[8px] text-slate-500">
                      {totals.totalLamWastePct > 0 ? `${totals.totalLamWastePct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-1 text-right font-mono">
                      {totals.totalPrintWasteKg > 0 ? totals.totalPrintWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-[8px] text-slate-500">
                      {totals.totalPrintWastePct > 0 ? `${totals.totalPrintWastePct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-1 text-right font-mono">
                      {totals.totalMachineWasteKg > 0 ? totals.totalMachineWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-[8px] text-slate-500">
                      {totals.totalMachineWastePct > 0 ? `${totals.totalMachineWastePct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-indigo-700">
                      {totals.totalCoverPatchWasteKg > 0 ? totals.totalCoverPatchWasteKg.toFixed(2) : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-[8px] text-indigo-500">
                      {totals.totalCoverPatchWastePct > 0 ? `${totals.totalCoverPatchWastePct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-rose-800 font-black bg-rose-100/50">
                      {totals.totalWastageKg > 0 ? `${totals.totalWastageKg.toFixed(2)} kg` : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-amber-800 font-bold bg-amber-100/50">
                      {totals.totalWastagePct > 0 ? `${totals.totalWastagePct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-emerald-800 font-black bg-emerald-100/50">
                      {totals.totalNetProductionKg > 0 ? `${totals.totalNetProductionKg.toFixed(1)} kg` : "—"}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Standard 4-Block Signatures Strip */}
            <div className="flex justify-between items-end mt-8 pt-4 px-4">
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Operator Signature
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">{data.operatorName || "_______________"}</div>
              </div>
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Supervisor Signature
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">{data.supervisorName || "_______________"}</div>
              </div>
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Quality In-Charge
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">_______________</div>
              </div>
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Plant Head / Manager
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
