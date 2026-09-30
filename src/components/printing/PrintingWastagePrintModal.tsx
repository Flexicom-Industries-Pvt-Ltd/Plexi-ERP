"use client";

import React from "react";
import { PrintingWastageReportData, calculatePrintingWastage } from "@/lib/printing/printing-types";
import { printPrintingWastageReport } from "@/lib/printing/print-printing-wastage";
import { FileText, Printer, X } from "lucide-react";

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
  if (!open || !data) return null;

  const calc = calculatePrintingWastage(
    data.totalProductionKg,
    data.laminationFabricWasteKg,
    data.printFabricWasteKg
  );

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `PRN-WS-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  let assessmentText = "OPTIMAL";
  let assessmentColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (calc.totalWastagePct > 3.0) {
    assessmentText = "EXCEEDED LIMIT";
    assessmentColor = "text-rose-700 bg-rose-50 border-rose-200";
  } else if (calc.totalWastagePct > 1.8) {
    assessmentText = "MONITOR";
    assessmentColor = "text-amber-700 bg-amber-50 border-amber-200";
  }

  const handlePrint = () => {
    printPrintingWastageReport(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Daily Printing Wastage Report Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    data.status === "SUBMITTED" || data.status === "APPROVED"
                      ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-900/40 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {data.status || "DRAFT"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {data.shiftName} • {data.date} • Total: {calc.totalWastageKg.toFixed(2)} Kg ({calc.totalWastagePct.toFixed(2)}%) • Ref: {docRef}
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
          <div className="max-w-[960px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 font-sans text-slate-900">
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
                    DAILY PRINTING WASTAGE REPORT
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    A4 PORTRAIT
                  </span>
                </div>
              </div>

              {/* Metadata strip */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium">
                <div>Doc Ref: <strong className="text-slate-900">{docRef}</strong></div>
                <div>Date: <strong className="text-slate-900">{data.date}</strong></div>
                <div>Shift: <strong className="text-slate-900">{data.shiftName}</strong></div>
                <div>Operator: <strong className="text-slate-900">{data.operatorName || "—"}</strong></div>
                <div>Supervisor: <strong className="text-slate-900">{data.supervisorName || "—"}</strong></div>
                <div>Generated: <strong className="text-slate-900">{genTimestamp}</strong></div>
              </div>
            </div>

            {/* Bento KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Production Net Wt</div>
                <div className="text-base font-black text-sky-800 mt-0.5">
                  {(Number(data.totalProductionKg) || 0).toLocaleString()} Kg
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {(Number(data.totalProductionMtrs) || 0).toLocaleString()} Metres
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Lamination Waste</div>
                <div className="text-base font-black text-amber-900 mt-0.5">
                  {(Number(data.laminationFabricWasteKg) || 0).toFixed(2)} Kg
                </div>
                <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                  {calc.laminationFabricWastePct.toFixed(2)}% of base
                </div>
              </div>

              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Print Fabric Waste</div>
                <div className="text-base font-black text-purple-900 mt-0.5">
                  {(Number(data.printFabricWasteKg) || 0).toFixed(2)} Kg
                </div>
                <div className="text-[10px] font-bold text-purple-700 mt-0.5">
                  {calc.printFabricWastePct.toFixed(2)}% of base
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${calc.totalWastagePct > 3 ? "border-rose-200 bg-rose-50/50" : calc.totalWastagePct > 1.8 ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/50"}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${calc.totalWastagePct > 3 ? "text-rose-700" : calc.totalWastagePct > 1.8 ? "text-amber-700" : "text-emerald-700"}`}>
                  Total Wastage ({assessmentText})
                </div>
                <div className={`text-base font-black ${calc.totalWastagePct > 3 ? "text-rose-900" : calc.totalWastagePct > 1.8 ? "text-amber-900" : "text-emerald-900"} mt-0.5`}>
                  {calc.totalWastageKg.toFixed(2)} Kg
                </div>
                <div className="text-[10px] font-extrabold text-slate-800 mt-0.5">
                  {calc.totalWastagePct.toFixed(2)}% of total
                </div>
              </div>
            </div>

            {/* High-Fidelity Data Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase border-b border-slate-300">
                    <th className="p-2.5 text-center border-r border-slate-300 w-12">S.No.</th>
                    <th className="p-2.5 text-left border-r border-slate-300">Wastage Category / Stream</th>
                    <th className="p-2.5 text-left border-r border-slate-300">Base Origin Material</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-36">Base Weight (kg)</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-36 bg-amber-50/60 text-amber-950">Wastage Qty (kg)</th>
                    <th className="p-2.5 text-right w-36">Wastage %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-white">
                    <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-200">1</td>
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                      Lamination Fabric Waste
                    </td>
                    <td className="p-2.5 text-slate-600 border-r border-slate-200">
                      Daily Production Total Net Weight
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-800 border-r border-slate-200">
                      {(Number(data.totalProductionKg) || 0).toLocaleString()} kg
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-amber-900 bg-amber-50/30 border-r border-slate-200">
                      {(Number(data.laminationFabricWasteKg) || 0).toFixed(2)} kg
                    </td>
                    <td className={`p-2.5 text-right font-mono font-bold ${calc.laminationFabricWastePct > 2 ? "text-rose-700 bg-rose-50/30" : "text-emerald-700 bg-emerald-50/30"}`}>
                      {calc.laminationFabricWastePct.toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-200">2</td>
                    <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">
                      Printing Fabric Waste
                    </td>
                    <td className="p-2.5 text-slate-600 border-r border-slate-200">
                      Daily Production Total Net Weight
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-800 border-r border-slate-200">
                      {(Number(data.totalProductionKg) || 0).toLocaleString()} kg
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-purple-900 bg-purple-50/30 border-r border-slate-200">
                      {(Number(data.printFabricWasteKg) || 0).toFixed(2)} kg
                    </td>
                    <td className={`p-2.5 text-right font-mono font-bold ${calc.printFabricWastePct > 2 ? "text-rose-700 bg-rose-50/30" : "text-emerald-700 bg-emerald-50/30"}`}>
                      {calc.printFabricWastePct.toFixed(2)}%
                    </td>
                  </tr>

                  {/* Totals Row */}
                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                    <td colSpan={3} className="p-2.5 text-right pr-4 uppercase tracking-wider text-[11px]">
                      Combined Shift Total:
                    </td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">
                      {(Number(data.totalProductionKg) || 0).toLocaleString()} kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-900 bg-amber-100/50 border-r border-slate-300">
                      {calc.totalWastageKg.toFixed(2)} kg
                    </td>
                    <td className={`p-2.5 text-right font-mono ${calc.totalWastagePct > 3 ? "text-rose-700 bg-rose-100/50" : "text-emerald-700 bg-emerald-100/50"}`}>
                      {calc.totalWastagePct.toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Remarks if any */}
            {data.remarks && (
              <div className="mt-4 p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-0.5">
                  Supervisor Remarks:
                </span>
                <p className="text-slate-800">{data.remarks}</p>
              </div>
            )}

            {/* Official Signatures Strip */}
            <div className="flex justify-between items-end mt-12 pt-4 px-4">
              <div className="text-center w-40">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Operator Signature</div>
              </div>
              <div className="text-center w-40">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Supervisor Signature</div>
              </div>
              <div className="text-center w-40">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Quality In-Charge</div>
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
