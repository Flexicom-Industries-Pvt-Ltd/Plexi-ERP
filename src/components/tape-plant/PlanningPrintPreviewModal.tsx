"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  Layers,
  FlaskConical,
  FileText,
  Boxes,
} from "lucide-react";
import { RecipePlanItem } from "./TapePlantPlanningSection";
import { generateTapePlantPlanningExcel } from "@/lib/tape-plant/planning-export";
import { printTapePlantPlanningSheet } from "@/lib/tape-plant/print-planning-sheet";

interface PlanningPrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  shiftName: string;
  status: string;
  plans: RecipePlanItem[];
}

function normalizeMaterialKey(mat: string): string {
  const clean = (mat || "").trim().toUpperCase().replace(/[\s\-_]/g, "");
  if (clean === "PP") return "PP";
  if (clean === "CC") return "CC";
  if (clean === "MB") return "MB";
  if (clean === "RP1") return "RP1";
  if (clean === "RP2") return "RP2";
  if (clean === "HDRP") return "HD RP";
  if (clean === "TPT") return "TPT";
  return (mat || "").trim().toUpperCase();
}

function formatKg(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "" || val === 0) return "—";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return Number.isInteger(num)
    ? num.toLocaleString()
    : num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function formatPct(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "" || val === 0) return "—";
  const num = Number(val);
  if (isNaN(num)) return `${val}%`;
  return Number.isInteger(num) ? `${num}%` : `${num.toFixed(1)}%`;
}

function getShiftLabel(p: RecipePlanItem, defaultShiftName?: string): string {
  if (p.isDayNight) return "DAY+NIGHT";
  if (p.shiftName) {
    const s = p.shiftName.toUpperCase();
    if (s.includes("NIGHT")) return "NIGHT";
    if (s.includes("DAY")) return "DAY";
    return p.shiftName.replace(/Shift/i, "").trim().toUpperCase();
  }
  if (p.shiftId) {
    if (p.shiftId.toLowerCase().includes("night")) return "NIGHT";
    if (p.shiftId.toLowerCase().includes("day")) return "DAY";
    return p.shiftId.toUpperCase();
  }
  if (defaultShiftName && defaultShiftName.toUpperCase() !== "ALL" && !defaultShiftName.toUpperCase().includes("ALL")) {
    if (defaultShiftName.toUpperCase().includes("NIGHT")) return "NIGHT";
    if (defaultShiftName.toUpperCase().includes("DAY")) return "DAY";
    return defaultShiftName.replace(/Shift/i, "").trim().toUpperCase();
  }
  return "DAY";
}

export function PlanningPrintPreviewModal({
  open,
  onClose,
  date,
  shiftName,
  status,
  plans,
}: PlanningPrintPreviewModalProps) {
  if (!open) return null;

  const totalShiftPlannedKg = plans
    .filter((p) => !p.isDayNight)
    .reduce((acc, p) => acc + (Number(p.plannedQtyKg) || 0), 0);

  const totalDayNightPlannedKg = plans
    .filter((p) => p.isDayNight)
    .reduce((acc, p) => acc + (Number(p.plannedQtyKg) || 0), 0);

  // Pre-calculate aggregate raw material sums across all recipe plans
  let totalPPSum = 0;
  let totalCCSum = 0;
  let totalMBSum = 0;
  let totalRP1Sum = 0;
  let totalRP2Sum = 0;
  let totalHDRPSum = 0;
  let totalTPTSum = 0;
  let totalOtherSum = 0;
  let totalBatchSum = 0;

  plans.forEach((p) => {
    let runMatQty = 0;
    (p.materials || []).forEach((m) => {
      const key = normalizeMaterialKey(m.material);
      const q = Number(m.quantity) || 0;
      runMatQty += q;
      if (key === "PP") totalPPSum += q;
      else if (key === "CC") totalCCSum += q;
      else if (key === "MB") totalMBSum += q;
      else if (key === "RP1") totalRP1Sum += q;
      else if (key === "RP2") totalRP2Sum += q;
      else if (key === "HD RP") totalHDRPSum += q;
      else if (key === "TPT") totalTPTSum += q;
      else totalOtherSum += q;
    });
    totalBatchSum += (runMatQty || Number(p.plannedQtyKg) || 0);
  });

  const totalAllMaterialsKg = totalBatchSum;

  const handleDirectPrint = () => {
    printTapePlantPlanningSheet({ date, shiftName, status, plans });
  };

  const handleExportExcel = () => {
    generateTapePlantPlanningExcel({ date, shiftName, status, plans });
  };

  const docDate = date || new Date().toISOString().split("T")[0];
  const docRef = `TP-PLN-${docDate.replace(/-/g, "")}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Tape Plant Shift Plan Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    status === "SUBMITTED"
                      ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-900/40 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {shiftName} • {date} • {plans.length} Recipe Run(s) •{" "}
                <span className="font-mono text-white font-bold">
                  {totalShiftPlannedKg.toLocaleString()} KG Shift Plan
                </span>
                {totalDayNightPlannedKg > 0 && (
                  <span className="text-amber-400 font-bold ml-1.5 font-mono text-[11px]">
                    (+ {totalDayNightPlannedKg.toLocaleString()} KG 24h Day+Night Batch)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <div className="max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-slate-300 text-slate-900 space-y-5">
            {/* Main Header with Top-Left Corner Vivid Flexicom Logo */}
            <div className="border-b-2 border-slate-900 pb-3 text-center">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Top-Left Corner Logo - Bigger and Vivid */}
                <div className="w-16 sm:w-24 text-left shrink-0 flex items-center">
                  <img
                    src="/logo.png"
                    alt="Flexicom Logo"
                    className="h-12 sm:h-16 w-auto object-contain shrink-0 filter contrast-125 saturate-125 drop-shadow-sm"
                  />
                </div>

                {/* Centered Document Header */}
                <div className="flex-1 text-center space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                    Flexicom Industries Pvt. Ltd.
                  </h1>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-600">
                    Tape Plant Extrusion & Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)
                  </p>
                  <div>
                    <div className="inline-block my-0.5 px-3 py-0.5 bg-slate-100 text-slate-900 font-extrabold text-xs uppercase tracking-wider border border-slate-400">
                      Tape Plant Production Plan
                    </div>
                  </div>
                </div>

                {/* Right Balance Spacer */}
                <div className="w-16 sm:w-24 shrink-0 hidden sm:block" aria-hidden="true" />
              </div>

              {/* Meta strip */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 pt-1">
                <span>Doc Ref: <strong className="text-slate-900 font-mono">{docRef}</strong></span>
                <span>•</span>
                <span>Date: <strong className="text-slate-900">{date}</strong></span>
                <span>•</span>
                <span>Shift: <strong className="text-slate-900">{shiftName}</strong></span>
                <span>•</span>
                <span>Status: <strong className="text-slate-900">{status}</strong></span>
              </div>
            </div>

            {/* Key Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-300 text-xs text-center">
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Shift Planned Output
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {totalShiftPlannedKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
                </span>
                {totalDayNightPlannedKg > 0 && (
                  <span className="text-[10px] text-amber-700 font-bold block mt-0.5 font-mono">
                    + {totalDayNightPlannedKg.toLocaleString()} KG (24h Batch)
                  </span>
                )}
              </div>
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Total Qualities / Runs
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {plans.length} <span className="text-xs font-normal">Qualities</span>
                </span>
              </div>
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Total Material Demand
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {formatKg(totalAllMaterialsKg)} <span className="text-xs font-normal">KG</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Approval Status
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {status}
                </span>
              </div>
            </div>

            {/* Box 1: QUALITY NAME AND SPECIFICATION */}
            <div className="space-y-1.5">
              <div className="bg-slate-200 border border-slate-300 border-b-0 py-1 px-3 text-center">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  1. QUALITY NAME AND SPECIFICATION
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-b">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                      <th className="p-2 border-r border-slate-300">Quality Name / Recipe Code</th>
                      <th className="p-2 border-r border-slate-300 text-center w-16">Shift</th>
                      <th className="p-2 border-r border-slate-300 text-center">Type</th>
                      <th className="p-2 border-r border-slate-300 text-right">Denier</th>
                      <th className="p-2 border-r border-slate-300 text-right">Width (mm)</th>
                      <th className="p-2 border-r border-slate-300 text-right">Strength</th>
                      <th className="p-2 border-r border-slate-300 text-right">ELO %</th>
                      <th className="p-2 border-r border-slate-300">Colour</th>
                      <th className="p-2 border-r border-slate-300">Bobbin Mark</th>
                      <th className="p-2 border-r border-slate-300">Spacer</th>
                      <th className="p-2 border-r border-slate-300 text-right">Ash %</th>
                      <th className="p-2 border-r border-slate-300">Omega</th>
                      <th className="p-2 border-r border-slate-300 text-right font-bold bg-slate-50">
                        Planned (KG)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {plans.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900">
                          {p.recipeQuality}
                          {p.isDayNight && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              Day+Night (24h)
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-[10px] uppercase text-slate-700">
                          {getShiftLabel(p, shiftName)}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-medium">
                          {p.tapeType}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono">
                          {p.denier || "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono">
                          {p.tapeWidth || "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono">
                          {p.strength || "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono">
                          {p.eloPercent ? `${p.eloPercent}%` : "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {p.colour || "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {p.bobbinMarking || "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {p.spacerSize || "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono">
                          {p.ashPercent ? `${p.ashPercent}%` : "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {p.omega || "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-slate-50/70">
                          {formatKg(p.plannedQtyKg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={13} className="p-2 text-right uppercase tracking-wider text-[10px]">
                        Total Shift Planned Output{totalDayNightPlannedKg > 0 ? " (Single-Shift Runs)" : ""}:
                      </td>
                      <td className="p-2 text-right font-mono font-black text-slate-900 bg-slate-200">
                        {totalShiftPlannedKg.toLocaleString()} KG
                      </td>
                    </tr>
                    {totalDayNightPlannedKg > 0 && (
                      <tr className="bg-amber-50 font-bold border-t border-amber-200 text-amber-900">
                        <td colSpan={13} className="p-2 text-right uppercase tracking-wider text-[10px] text-amber-800">
                          + 24-Hour Continuous Batch (Day+Night Run):
                        </td>
                        <td className="p-2 text-right font-mono font-black text-amber-950 bg-amber-100">
                          {totalDayNightPlannedKg.toLocaleString()} KG
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Box 2: RAW MATERIAL RECIPE AND QUANTITY */}
            <div className="space-y-1.5">
              <div className="bg-slate-200 border border-slate-300 border-b-0 py-1 px-3 text-center">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  2. RAW MATERIAL RECIPE AND QUANTITY
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-b">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th rowSpan={2} className="p-2 border-r border-slate-300 text-center w-8">#</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-300 min-w-[130px]">Quality Name</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-300 text-center w-16">Shift</th>
                      <th colSpan={2} className="p-1 border-r border-slate-300 text-center">PP</th>
                      <th colSpan={2} className="p-1 border-r border-slate-300 text-center">CC</th>
                      <th colSpan={2} className="p-1 border-r border-slate-300 text-center">MB</th>
                      <th colSpan={2} className="p-1 border-r border-slate-300 text-center">RP1</th>
                      <th colSpan={2} className="p-1 border-r border-slate-300 text-center">RP2</th>
                      <th colSpan={2} className="p-1 border-r border-slate-300 text-center">HD RP</th>
                      <th colSpan={2} className="p-1 border-r border-slate-300 text-center">TPT</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-300 text-right w-14">Other</th>
                      <th rowSpan={2} className="p-2 border-r border-slate-300 text-right font-bold bg-slate-50 w-24">
                        Batch Total
                      </th>
                      <th rowSpan={2} className="p-2 border-r border-slate-300 text-right w-14">Total %</th>
                    </tr>
                    <tr className="bg-slate-100/80 text-slate-700 text-[9px] font-bold border-b border-slate-300">
                      <th className="p-1 border-r border-slate-300 text-right">KG</th>
                      <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                      <th className="p-1 border-r border-slate-300 text-right">KG</th>
                      <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                      <th className="p-1 border-r border-slate-300 text-right">KG</th>
                      <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                      <th className="p-1 border-r border-slate-300 text-right">KG</th>
                      <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                      <th className="p-1 border-r border-slate-300 text-right">KG</th>
                      <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                      <th className="p-1 border-r border-slate-300 text-right">KG</th>
                      <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                      <th className="p-1 border-r border-slate-300 text-right">KG</th>
                      <th className="p-1 border-r border-slate-300 text-right text-slate-500">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {plans.map((p, idx) => {
                      const getMatRaw = (name: string) => {
                        const match = (p.materials || []).find(
                          (m) => normalizeMaterialKey(m.material) === name
                        );
                        return {
                          qty: match && Number(match.quantity) ? Number(match.quantity) : 0,
                          pct: match && Number(match.percentage) ? Number(match.percentage) : 0,
                        };
                      };

                      const pp = getMatRaw("PP");
                      const cc = getMatRaw("CC");
                      const mb = getMatRaw("MB");
                      const rp1 = getMatRaw("RP1");
                      const rp2 = getMatRaw("RP2");
                      const hdrp = getMatRaw("HD RP");
                      const tpt = getMatRaw("TPT");

                      let otherQty = 0;
                      let totalBlendPct = 0;
                      let runBatchQty = 0;

                      (p.materials || []).forEach((m) => {
                        const q = Number(m.quantity) || 0;
                        const pct = Number(m.percentage) || 0;
                        runBatchQty += q;
                        totalBlendPct += pct;
                        const key = normalizeMaterialKey(m.material);
                        if (!["PP", "CC", "MB", "RP1", "RP2", "HD RP", "TPT"].includes(key)) {
                          otherQty += q;
                        }
                      });

                      const rowBatchTotal = runBatchQty || Number(p.plannedQtyKg) || 0;

                      return (
                        <tr key={`mat-${p.id}`} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {p.recipeQuality}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-[10px] uppercase text-slate-700">
                            {getShiftLabel(p, shiftName)}
                          </td>
                          {/* PP */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold">{formatKg(pp.qty)}</td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-500 bg-slate-50/50">{formatPct(pp.pct)}</td>
                          {/* CC */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold">{formatKg(cc.qty)}</td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-500 bg-slate-50/50">{formatPct(cc.pct)}</td>
                          {/* MB */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold">{formatKg(mb.qty)}</td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-500 bg-slate-50/50">{formatPct(mb.pct)}</td>
                          {/* RP1 */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold">{formatKg(rp1.qty)}</td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-500 bg-slate-50/50">{formatPct(rp1.pct)}</td>
                          {/* RP2 */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold">{formatKg(rp2.qty)}</td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-500 bg-slate-50/50">{formatPct(rp2.pct)}</td>
                          {/* HD RP */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold">{formatKg(hdrp.qty)}</td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-500 bg-slate-50/50">{formatPct(hdrp.pct)}</td>
                          {/* TPT */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-semibold">{formatKg(tpt.qty)}</td>
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-500 bg-slate-50/50">{formatPct(tpt.pct)}</td>
                          {/* Other */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono">{formatKg(otherQty)}</td>
                          {/* Batch Total */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-slate-50/70">
                            {formatKg(rowBatchTotal)} KG
                          </td>
                          {/* Total % */}
                          <td className="p-1.5 border-r border-slate-200 text-right font-mono text-[11px] font-bold">
                            {totalBlendPct > 0 ? `${totalBlendPct.toFixed(1)}%` : "100%"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={3} className="p-2 text-right uppercase tracking-wider text-[10px]">
                        Total Formulations:
                      </td>
                      {/* PP */}
                      <td className="p-1.5 text-right font-mono">{formatKg(totalPPSum)}</td>
                      <td className="p-1.5 text-right font-mono text-[10px] text-slate-500">{totalBatchSum > 0 && totalPPSum > 0 ? `${((totalPPSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      {/* CC */}
                      <td className="p-1.5 text-right font-mono">{formatKg(totalCCSum)}</td>
                      <td className="p-1.5 text-right font-mono text-[10px] text-slate-500">{totalBatchSum > 0 && totalCCSum > 0 ? `${((totalCCSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      {/* MB */}
                      <td className="p-1.5 text-right font-mono">{formatKg(totalMBSum)}</td>
                      <td className="p-1.5 text-right font-mono text-[10px] text-slate-500">{totalBatchSum > 0 && totalMBSum > 0 ? `${((totalMBSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      {/* RP1 */}
                      <td className="p-1.5 text-right font-mono">{formatKg(totalRP1Sum)}</td>
                      <td className="p-1.5 text-right font-mono text-[10px] text-slate-500">{totalBatchSum > 0 && totalRP1Sum > 0 ? `${((totalRP1Sum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      {/* RP2 */}
                      <td className="p-1.5 text-right font-mono">{formatKg(totalRP2Sum)}</td>
                      <td className="p-1.5 text-right font-mono text-[10px] text-slate-500">{totalBatchSum > 0 && totalRP2Sum > 0 ? `${((totalRP2Sum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      {/* HD RP */}
                      <td className="p-1.5 text-right font-mono">{formatKg(totalHDRPSum)}</td>
                      <td className="p-1.5 text-right font-mono text-[10px] text-slate-500">{totalBatchSum > 0 && totalHDRPSum > 0 ? `${((totalHDRPSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      {/* TPT */}
                      <td className="p-1.5 text-right font-mono">{formatKg(totalTPTSum)}</td>
                      <td className="p-1.5 text-right font-mono text-[10px] text-slate-500">{totalBatchSum > 0 && totalTPTSum > 0 ? `${((totalTPTSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      {/* Other */}
                      <td className="p-1.5 text-right font-mono">{formatKg(totalOtherSum)}</td>
                      {/* Total */}
                      <td className="p-1.5 text-right font-mono font-black text-slate-900 bg-slate-200">
                        {formatKg(totalBatchSum)} KG
                      </td>
                      <td className="p-1.5 text-right font-mono text-[11px]">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Box 3: RAW MATERIAL SUMMARY */}
            <div className="space-y-1.5">
              <div className="bg-slate-200 border border-slate-300 border-b-0 py-1 px-3 text-center">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  3. RAW MATERIAL SUMMARY
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-b">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-left min-w-[130px]">Metric / Material</th>
                      <th className="p-2 border-r border-slate-300">PP</th>
                      <th className="p-2 border-r border-slate-300">CC</th>
                      <th className="p-2 border-r border-slate-300">MB</th>
                      <th className="p-2 border-r border-slate-300">RP1</th>
                      <th className="p-2 border-r border-slate-300">RP2</th>
                      <th className="p-2 border-r border-slate-300">HD RP</th>
                      <th className="p-2 border-r border-slate-300">TPT</th>
                      {totalOtherSum > 0 && <th className="p-2 border-r border-slate-300">Other</th>}
                      <th className="p-2 border-r border-slate-300 font-extrabold bg-slate-200">Total Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-bold text-left text-slate-700 bg-slate-50">
                        Total Quantity (KG)
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold">{totalPPSum ? `${formatKg(totalPPSum)} KG` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold">{totalCCSum ? `${formatKg(totalCCSum)} KG` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold">{totalMBSum ? `${formatKg(totalMBSum)} KG` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold">{totalRP1Sum ? `${formatKg(totalRP1Sum)} KG` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold">{totalRP2Sum ? `${formatKg(totalRP2Sum)} KG` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold">{totalHDRPSum ? `${formatKg(totalHDRPSum)} KG` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold">{totalTPTSum ? `${formatKg(totalTPTSum)} KG` : "—"}</td>
                      {totalOtherSum > 0 && <td className="p-2 border-r border-slate-200 font-mono font-bold">{formatKg(totalOtherSum)} KG</td>}
                      <td className="p-2 border-r border-slate-200 font-mono font-black text-slate-900 bg-slate-100">
                        {formatKg(totalBatchSum)} KG
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-bold text-left text-slate-700 bg-slate-50">
                        Overall Percentage (%)
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono font-semibold text-emerald-800">{totalBatchSum > 0 && totalPPSum > 0 ? `${((totalPPSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-semibold text-emerald-800">{totalBatchSum > 0 && totalCCSum > 0 ? `${((totalCCSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-semibold text-emerald-800">{totalBatchSum > 0 && totalMBSum > 0 ? `${((totalMBSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-semibold text-emerald-800">{totalBatchSum > 0 && totalRP1Sum > 0 ? `${((totalRP1Sum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-semibold text-emerald-800">{totalBatchSum > 0 && totalRP2Sum > 0 ? `${((totalRP2Sum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-semibold text-emerald-800">{totalBatchSum > 0 && totalHDRPSum > 0 ? `${((totalHDRPSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-semibold text-emerald-800">{totalBatchSum > 0 && totalTPTSum > 0 ? `${((totalTPTSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>
                      {totalOtherSum > 0 && <td className="p-2 border-r border-slate-200 font-mono font-semibold text-emerald-800">{totalBatchSum > 0 ? `${((totalOtherSum / totalBatchSum) * 100).toFixed(1)}%` : "—"}</td>}
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-emerald-900 bg-slate-100">
                        100.0%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Authorizations & Signatures Footer */}
            <div className="pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
              <div className="space-y-6">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-bold uppercase tracking-wider text-[10px]">
                  Prepared By (Operator / In-Charge)
                </span>
              </div>
              <div className="space-y-6">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-bold uppercase tracking-wider text-[10px]">
                  Verified By (Quality Control / Lab)
                </span>
              </div>
              <div className="space-y-6">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-bold uppercase tracking-wider text-[10px]">
                  Approved By (Plant Supervisor / Manager)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
