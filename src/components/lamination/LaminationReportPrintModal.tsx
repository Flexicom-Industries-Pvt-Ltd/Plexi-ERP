"use client";

import React, { useMemo } from "react";
import { LaminationProductionReportData, computeLaminationReportTotals } from "@/lib/lamination/lamination-types";
import { printLaminationReport } from "@/lib/lamination/print-lamination-report";
import { exportLaminationReportExcel } from "@/lib/lamination/lamination-report-export";
import { FileText, Printer, FileSpreadsheet, X } from "lucide-react";

interface LaminationReportPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: LaminationProductionReportData;
}

export function LaminationReportPrintModal({
  open,
  onOpenChange,
  data,
}: LaminationReportPrintModalProps) {
  const totals = useMemo(() => computeLaminationReportTotals(data.entries), [data.entries]);

  if (!open) return null;

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LAM-PR-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printLaminationReport(data);
  };

  const handleExportExcel = () => {
    exportLaminationReportExcel(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar (Standard Enterprise Dark Theme) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Daily Lamination Product Report Preview
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
                {data.shiftName} • {data.date} • {data.entries.length} Roll(s) logged • Ref: {docRef}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </button>

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
          <div className="max-w-[1240px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 font-sans text-slate-900">
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
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • LAMINATION DIVISION
                  </div>
                  <div className="inline-block border border-slate-900 bg-slate-50 px-4 py-0.5 text-xs font-black tracking-wider text-slate-900 mt-1 uppercase">
                    DAILY LAMINATION PRODUCT REPORT
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
                <div>Doc Ref: <strong className="text-slate-900">{docRef}</strong></div>
                <div>Date: <strong className="text-slate-900">{data.date}</strong></div>
                <div>Shift: <strong className="text-slate-900">{data.shiftName}</strong></div>
                <div>Supervisor: <strong className="text-slate-900">{data.supervisorName || "—"}</strong></div>
                <div>Operator: <strong className="text-slate-900">{data.operatorName || "—"}</strong></div>
                <div>Total Rolls: <strong className="text-slate-900">{data.entries.length}</strong></div>
                <div>Generated: <strong className="text-slate-900">{genTimestamp}</strong></div>
              </div>
            </div>

            {/* Bento KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 mb-4">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Rolls</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{data.entries.length}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Input Roll Mtrs</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{totals.totalRollMtrs.toLocaleString()} M</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Input Net Wt</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{totals.totalNetWtBefore.toFixed(1)} Kg</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Input Wt</div>
                <div className="text-base font-black text-slate-700 mt-0.5">{totals.avgWtBefore.toFixed(1)} g/m</div>
              </div>
              <div className="p-2.5 rounded-lg border border-sky-200 bg-sky-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Output Prod Mtrs</div>
                <div className="text-base font-black text-sky-700 mt-0.5">{totals.totalProductionMtrs.toLocaleString()} M</div>
              </div>
              <div className="p-2.5 rounded-lg border border-sky-200 bg-sky-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Output Net Wt</div>
                <div className="text-base font-black text-sky-700 mt-0.5">{totals.totalNetWtAfter.toFixed(1)} Kg</div>
              </div>
              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Avg Coating</div>
                <div className="text-base font-black text-emerald-700 mt-0.5">{totals.avgCoating.toFixed(1)} g/m</div>
              </div>
            </div>

            {/* High-Fidelity Data Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase border-b border-slate-300">
                    <th rowSpan={2} className="p-2 text-center border-r border-slate-300 w-10">Seq</th>
                    <th rowSpan={2} className="p-2 text-left border-r border-slate-300">Quality Name</th>
                    <th rowSpan={2} className="p-2 text-center border-r border-slate-300 w-14">Size</th>
                    <th rowSpan={2} className="p-2 text-center border-r border-slate-300 w-16">Loom#</th>
                    <th rowSpan={2} className="p-2 text-center border-r border-slate-300 w-24">Roll Number</th>
                    <th colSpan={3} className="p-1.5 text-center border-r border-slate-300 bg-slate-200/70 text-slate-700">
                      Raw Fabric (Before)
                    </th>
                    <th colSpan={3} className="p-1.5 text-center border-r border-slate-300 bg-sky-100/70 text-sky-800">
                      Laminated Fabric (After)
                    </th>
                    <th rowSpan={2} className="p-2 text-right border-r border-slate-300 bg-emerald-50 text-emerald-800 w-20">
                      Coating (g/m)
                    </th>
                    <th rowSpan={2} className="p-2 text-left w-28">Remarks</th>
                  </tr>
                  <tr className="bg-slate-50 text-[10px] font-semibold text-slate-600 border-b border-slate-300">
                    <th className="p-1.5 text-right border-r border-slate-200 w-16">Mtr</th>
                    <th className="p-1.5 text-right border-r border-slate-200 w-16">Net (kg)</th>
                    <th className="p-1.5 text-right border-r border-slate-300 w-16">Avg (g/m)</th>
                    <th className="p-1.5 text-right border-r border-slate-200 bg-sky-50/50 w-16">Mtr</th>
                    <th className="p-1.5 text-right border-r border-slate-200 bg-sky-50/50 w-16">Net (kg)</th>
                    <th className="p-1.5 text-right border-r border-slate-300 bg-sky-50/50 w-16">Avg (g/m)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.entries.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-slate-400 italic">
                        No production rolls logged.
                      </td>
                    </tr>
                  ) : (
                    data.entries.map((e, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="p-1.5 text-center font-bold text-slate-500 border-r border-slate-200">{e.sequence || idx + 1}</td>
                        <td className="p-1.5 font-bold text-slate-900 border-r border-slate-200">{e.quality || "—"}</td>
                        <td className="p-1.5 text-center font-mono text-slate-700 border-r border-slate-200">{e.size || "—"}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-sky-700 border-r border-slate-200">#{e.loomNumber || "—"}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-slate-900 bg-slate-50 border-r border-slate-200">{e.rollNumber || "—"}</td>
                        <td className="p-1.5 text-right font-mono text-slate-700 border-r border-slate-200">{e.rollMeter > 0 ? e.rollMeter.toLocaleString() : "—"}</td>
                        <td className="p-1.5 text-right font-mono text-slate-700 border-r border-slate-200">{e.netWeightBefore > 0 ? e.netWeightBefore.toFixed(1) : "—"}</td>
                        <td className="p-1.5 text-right font-mono text-slate-500 bg-slate-50 border-r border-slate-200">{e.avgWeightBefore > 0 ? e.avgWeightBefore.toFixed(1) : "—"}</td>
                        <td className="p-1.5 text-right font-mono font-bold text-sky-700 bg-sky-50/30 border-r border-slate-200">{e.productionMeter > 0 ? e.productionMeter.toLocaleString() : "—"}</td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900 bg-sky-50/30 border-r border-slate-200">{e.netWeightAfter > 0 ? e.netWeightAfter.toFixed(1) : "—"}</td>
                        <td className="p-1.5 text-right font-mono font-bold text-sky-800 bg-sky-50/50 border-r border-slate-200">{e.avgWeightAfter > 0 ? e.avgWeightAfter.toFixed(1) : "—"}</td>
                        <td className="p-1.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/50 border-r border-slate-200">{e.coating !== 0 ? e.coating.toFixed(1) : "—"}</td>
                        <td className="p-1.5 text-slate-500 truncate max-w-[120px]">{e.remarks || ""}</td>
                      </tr>
                    ))
                  )}
                  {/* Totals Row */}
                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                    <td colSpan={5} className="p-2 text-right pr-4 uppercase tracking-wider text-[11px]">
                      Shift Totals:
                    </td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">{totals.totalRollMtrs.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">{totals.totalNetWtBefore.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-slate-600">{totals.avgWtBefore.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-sky-700">{totals.totalProductionMtrs.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300">{totals.totalNetWtAfter.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-sky-800">{totals.avgWtAfter.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono border-r border-slate-300 text-emerald-700">{totals.avgCoating.toFixed(1)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Signatures */}
            <div className="flex justify-between items-end mt-10 pt-4 px-8">
              <div className="text-center w-44">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Operator Signature</div>
              </div>
              <div className="text-center w-44">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Floor Supervisor</div>
              </div>
              <div className="text-center w-44">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Plant Head / QA Approved</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
