"use client";

import React, { useMemo } from "react";
import {
  PrintingRawMaterialReportData,
  computePrintingRawMaterialTotals,
} from "@/lib/printing/printing-types";
import { printPrintingRawMaterialReport } from "@/lib/printing/print-printing-raw-materials";
import { FileText, Printer, X } from "lucide-react";

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

  if (!open || !data) return null;

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `PRN-RM-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printPrintingRawMaterialReport(data);
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
                  Printing Raw Material Consumption Report Preview
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
                {data.shiftName} • {data.date} • Total: {totals.totalConsumedKg.toFixed(2)} Kg ({totals.overallMileage.toLocaleString()} m/kg) • Ref: {docRef}
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
                    PRINTING RAW MATERIAL CONSUMPTION & MILEAGE REPORT
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
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Printed Metres (Base)</div>
                <div className="text-base font-black text-sky-800 mt-0.5">
                  {totals.totalPrintMtrs.toLocaleString()} m
                </div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Volume</div>
                <div className="text-base font-black text-emerald-800 mt-0.5">
                  {totals.totalConsumedLitre.toFixed(2)} L
                </div>
              </div>

              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Total Consumed</div>
                <div className="text-base font-black text-purple-900 mt-0.5">
                  {totals.totalConsumedKg.toFixed(2)} Kg
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Overall Mileage</div>
                <div className="text-base font-black text-amber-900 mt-0.5">
                  {totals.overallMileage.toLocaleString()} m/kg
                </div>
              </div>
            </div>

            {/* High-Fidelity Data Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase border-b border-slate-300">
                    <th className="p-2.5 text-center border-r border-slate-300 w-10">#</th>
                    <th className="p-2.5 text-left border-r border-slate-300">Raw Material (Inks / Solvents)</th>
                    <th className="p-2.5 text-center border-r border-slate-300 w-16">Unit</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-28">Consumed (L)</th>
                    <th className="p-2.5 text-center border-r border-slate-300 w-16">Factor</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-28 bg-blue-50/60 text-blue-950 font-bold">Consumed (Kg)</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-20">Ratio %</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-28 bg-emerald-50/60 text-emerald-950 font-bold">Mileage</th>
                    <th className="p-2.5 text-left w-32">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {calculatedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-slate-400 italic">
                        No raw material consumption entries recorded.
                      </td>
                    </tr>
                  ) : (
                    calculatedEntries.map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                        <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-200">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900 border-r border-slate-200">{row.materialName}</td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-600 border-r border-slate-200">
                          {row.unit || "LITRE"}
                        </td>
                        <td className="p-2.5 text-right font-mono text-blue-700 border-r border-slate-200">
                          {(Number(row.consumedLitre) || 0) > 0 ? Number(row.consumedLitre).toFixed(2) : "—"}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-500 border-r border-slate-200">
                          {(Number(row.conversionFactor) || 0.82).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-900 bg-blue-50/30 border-r border-slate-200">
                          {(Number(row.consumedKg) || 0).toFixed(2)} kg
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-purple-700 border-r border-slate-200">
                          {(Number(row.ratioPercent) || 0) > 0 ? `${Number(row.ratioPercent).toFixed(1)}%` : "—"}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30 border-r border-slate-200">
                          {(Number(row.mileage) || 0) > 0 ? `${Number(row.mileage).toLocaleString()} m/kg` : "—"}
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px]">{row.remarks || "—"}</td>
                      </tr>
                    ))
                  )}

                  {/* Totals Row */}
                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                    <td colSpan={3} className="p-2.5 text-right pr-4 uppercase tracking-wider text-[11px]">
                      Totals:
                    </td>
                    <td className="p-2.5 text-right font-mono text-blue-700 border-r border-slate-300">
                      {totals.totalConsumedLitre.toFixed(2)} L
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-400 border-r border-slate-300">—</td>
                    <td className="p-2.5 text-right font-mono text-blue-900 bg-blue-100/50 border-r border-slate-300">
                      {totals.totalConsumedKg.toFixed(2)} kg
                    </td>
                    <td className="p-2.5 text-right font-mono text-purple-800 border-r border-slate-300">
                      {totals.totalConsumedKg > 0 ? "100.0%" : "—"}
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-900 bg-emerald-100/50 border-r border-slate-300">
                      {totals.overallMileage.toLocaleString()} m/kg
                    </td>
                    <td className="p-2.5"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Remarks if any */}
            {data.remarks && (
              <div className="mt-4 p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-0.5">
                  Remarks / Notes:
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
