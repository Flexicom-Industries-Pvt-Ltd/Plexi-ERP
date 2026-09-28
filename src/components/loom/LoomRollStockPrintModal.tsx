"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { LoomRollStockItem, LoomRollStockSummary } from "@/lib/loom/loom-roll-stock-types";
import { exportLoomRollStockExcel } from "@/lib/loom/loom-roll-stock-export";
import { printLoomRollStock } from "@/lib/loom/print-loom-roll-stock";

interface LoomRollStockPrintModalProps {
  open: boolean;
  onClose: () => void;
  rolls: LoomRollStockItem[];
  summary: LoomRollStockSummary;
  filterLabel?: string;
}

export function LoomRollStockPrintModal({
  open,
  onClose,
  rolls,
  summary,
  filterLabel = "All Active Floor Stock",
}: LoomRollStockPrintModalProps) {
  if (!open) return null;

  const docDate = new Date().toISOString().slice(0, 10).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LM-STK-${docDate}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printLoomRollStock({ rolls, summary, filterLabel });
  };

  const handleExportExcel = () => {
    exportLoomRollStockExcel({ rolls, summary, filterLabel });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Loom Roll Stock Print Preview
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border bg-emerald-900/40 text-emerald-300 border-emerald-500/40">
                  {rolls.length} Rolls in Stock
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scope: {filterLabel} • Ref: {docRef} • {genTimestamp}
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
              <span>Print Sheet</span>
            </button>

            <button
              onClick={onClose}
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
            {/* Sheet Header */}
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
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CIRCULAR WEAVING DIVISION
                  </div>
                  <div className="text-xs font-extrabold text-sky-800 uppercase tracking-widest mt-1">
                    Floor Roll Stock & Inventory Register
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600 font-mono space-y-0.5">
                  <div>Ref: <strong className="text-slate-900">{docRef}</strong></div>
                  <div>Scope: <strong className="text-slate-900">{filterLabel}</strong></div>
                  <div>Date: <strong className="text-slate-900">{genTimestamp}</strong></div>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Rolls in Stock
                </div>
                <div className="text-xl font-black text-slate-950 font-mono">
                  {summary.totalRolls}{" "}
                  <span className="text-xs font-normal text-slate-600">Rolls</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {summary.uniqueLoomsCount} Active Looms Recorded
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Quantity (Length)
                </div>
                <div className="text-xl font-black text-slate-950 font-mono">
                  {summary.totalMeters.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-600">Meters</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Total linear fabric cut
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-300 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Total Quantity (Weight)
                </div>
                <div className="text-xl font-black text-emerald-800 font-mono">
                  {summary.totalNettWeightKg.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-emerald-700">KG Nett</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Gross: {summary.totalGrossWeightKg.toFixed(2)} kg
                </div>
              </div>

              <div className="bg-purple-50/60 border border-purple-300 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                  Qualities & Avg Linear Mass
                </div>
                <div className="text-xl font-black text-purple-900 font-mono">
                  {summary.uniqueQualitiesCount}{" "}
                  <span className="text-xs font-normal text-purple-700">Qualities</span>
                </div>
                <div className="text-[10px] text-purple-800">
                  Overall Avg: <strong>{summary.averageWeightPerMeter.toFixed(1)} g/m</strong>
                </div>
              </div>
            </div>

            {/* Quality Breakdown Table */}
            <div className="mb-6">
              <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-600"></span>
                <span>1. Quality-Wise Roll Stock Breakdown</span>
              </div>
              <div className="border border-slate-900 rounded overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-black border-b-2 border-slate-900">
                      <th className="py-2 px-2 text-center font-black w-10 border-r border-slate-400">S.No.</th>
                      <th className="py-2 px-3 text-left font-black border-r border-slate-400">Quality / Recipe Code</th>
                      <th className="py-2 px-2 text-center font-black w-24 border-r border-slate-400">Rolls Count</th>
                      <th className="py-2 px-3 text-right font-black w-28 border-r border-slate-400">Total Meters</th>
                      <th className="py-2 px-3 text-right font-black w-28 border-r border-slate-400">Gross Wt (kg)</th>
                      <th className="py-2 px-3 text-right font-black w-28 border-r border-slate-400">Nett Wt (kg)</th>
                      <th className="py-2 px-2 text-right font-black w-24 border-r border-slate-400">Avg (g/m)</th>
                      <th className="py-2 px-2 text-center font-black w-20">% Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {summary.qualityBreakdown.map((q, idx) => (
                      <tr key={q.qualityType} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-600 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200">
                          {q.qualityType}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                          {q.rollsCount}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900 border-r border-slate-200">
                          {q.totalMeters.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-slate-600 border-r border-slate-200">
                          {q.totalGrossWeightKg.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50 border-r border-slate-200">
                          {q.totalNettWeightKg.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold text-purple-700 border-r border-slate-200">
                          {q.avgWeightPerMeter.toFixed(1)}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-sky-700">
                          {q.percentageByWeight.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 text-black border-t-2 border-slate-900 font-mono font-bold">
                      <td colSpan={2} className="py-2 px-3 text-right font-sans font-black border-r border-slate-400">
                        TOTAL:
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-400">
                        {summary.totalRolls}
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-400">
                        {summary.totalMeters.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right border-r border-slate-400">
                        {summary.totalGrossWeightKg.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-800 border-r border-slate-400">
                        {summary.totalNettWeightKg.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right text-purple-900 border-r border-slate-400">
                        {summary.averageWeightPerMeter.toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-center">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Detailed Roll List */}
            <div>
              <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                  <span>2. Detailed Roll Inventory Register ({rolls.length} Rolls)</span>
                </div>
                <div className="text-[11px] font-normal text-slate-500 lowercase">
                  showing live cut rolls from circular loom
                </div>
              </div>
              <div className="border border-slate-900 rounded overflow-hidden">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200 text-black border-b-2 border-slate-900">
                      <th className="py-2 px-1 text-center font-black w-8 border-r border-slate-400">#</th>
                      <th className="py-2 px-2 text-center font-black w-24 border-r border-slate-400">Roll No.</th>
                      <th className="py-2 px-3 text-left font-black border-r border-slate-400">Quality</th>
                      <th className="py-2 px-2 text-right font-black w-20 border-r border-slate-400">Meters</th>
                      <th className="py-2 px-2 text-right font-black w-24 border-r border-slate-400">Nett Wt (kg)</th>
                      <th className="py-2 px-2 text-center font-black w-16 border-r border-slate-400">Loom #</th>
                      <th className="py-2 px-1 text-center font-black w-14 border-r border-slate-400">Size</th>
                      <th className="py-2 px-2 text-right font-black w-20 border-r border-slate-400">Gross Wt</th>
                      <th className="py-2 px-1 text-right font-black w-16 border-r border-slate-400">Tare Wt</th>
                      <th className="py-2 px-1 text-right font-black w-16 border-r border-slate-400">Avg (g/m)</th>
                      <th className="py-2 px-2 text-center font-black w-20 border-r border-slate-400">Cut Date</th>
                      <th className="py-2 px-2 text-center font-black w-16 border-r border-slate-400">Shift</th>
                      <th className="py-2 px-2 text-left font-black w-24 border-r border-slate-400">Contractor</th>
                      <th className="py-2 px-2 text-left font-black">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rolls.map((r, idx) => (
                      <tr key={r.id || idx} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                        <td className="py-1.5 px-1 text-center font-bold text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono font-black text-slate-900 bg-slate-50 border-r border-slate-200">
                          {r.rollNumber || "—"}
                        </td>
                        <td className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200 truncate max-w-[140px]">
                          {r.qualityType || "—"}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 bg-slate-50 border-r border-slate-200">
                          {r.meter !== undefined && r.meter !== null ? Number(r.meter).toLocaleString() : "0"}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-black text-emerald-700 bg-emerald-50/40 border-r border-slate-200">
                          {r.nettWeightKg !== undefined && r.nettWeightKg !== null ? Number(r.nettWeightKg).toFixed(2) : "0.00"}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-sky-700 border-r border-slate-200">
                          #{r.loomNumber}
                        </td>
                        <td className="py-1.5 px-1 text-center font-mono text-slate-700 border-r border-slate-200">
                          {r.size || "—"}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600 border-r border-slate-200">
                          {r.grossWeightKg !== undefined && r.grossWeightKg !== null ? Number(r.grossWeightKg).toFixed(2) : "0.00"}
                        </td>
                        <td className="py-1.5 px-1 text-right font-mono text-slate-500 border-r border-slate-200">
                          {r.tareWeightKg !== undefined && r.tareWeightKg !== null ? Number(r.tareWeightKg).toFixed(2) : "1.20"}
                        </td>
                        <td className="py-1.5 px-1 text-right font-mono font-semibold text-purple-700 border-r border-slate-200">
                          {r.avgWeightPerMeter !== undefined && r.avgWeightPerMeter !== null ? Number(r.avgWeightPerMeter).toFixed(1) : "0.0"}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-slate-600 border-r border-slate-200">
                          {r.date || "—"}
                        </td>
                        <td className="py-1.5 px-2 text-center font-medium text-slate-700 border-r border-slate-200">
                          {r.shiftName || "—"}
                        </td>
                        <td className="py-1.5 px-2 text-slate-700 border-r border-slate-200 truncate max-w-[90px]">
                          {r.contractor || "In-House"}
                        </td>
                        <td className="py-1.5 px-2 text-slate-500 truncate max-w-[90px]">
                          {r.remarks || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 text-black border-t-2 border-slate-900 font-mono font-bold">
                      <td colSpan={3} className="py-2 px-3 text-right font-sans font-black border-r border-slate-400">
                        TOTAL ({rolls.length} ROLLS):
                      </td>
                      <td className="py-2 px-2 text-right border-r border-slate-400">
                        {summary.totalMeters.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-800 border-r border-slate-400">
                        {summary.totalNettWeightKg.toFixed(2)}
                      </td>
                      <td colSpan={2} className="py-2 px-2 text-center border-r border-slate-400">
                        —
                      </td>
                      <td className="py-2 px-2 text-right border-r border-slate-400">
                        {summary.totalGrossWeightKg.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right border-r border-slate-400">
                        {summary.totalTareWeightKg.toFixed(2)}
                      </td>
                      <td className="py-2 px-1 text-right text-purple-900 border-r border-slate-400">
                        {summary.averageWeightPerMeter.toFixed(1)}
                      </td>
                      <td colSpan={4} className="py-2 px-2 text-center">
                        —
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-4 border-t-2 border-slate-900">
              <div className="text-center">
                <div className="h-10"></div>
                <div className="border-t border-slate-400 pt-1 text-xs font-bold text-slate-900 uppercase">
                  Prepared By (Data Entry)
                </div>
              </div>
              <div className="text-center">
                <div className="h-10"></div>
                <div className="border-t border-slate-400 pt-1 text-xs font-bold text-slate-900 uppercase">
                  Loom Supervisor
                </div>
              </div>
              <div className="text-center">
                <div className="h-10"></div>
                <div className="border-t border-slate-400 pt-1 text-xs font-bold text-slate-900 uppercase">
                  Factory / Store Manager
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
