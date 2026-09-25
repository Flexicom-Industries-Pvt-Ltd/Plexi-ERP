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

export function PlanningPrintPreviewModal({
  open,
  onClose,
  date,
  shiftName,
  status,
  plans,
}: PlanningPrintPreviewModalProps) {
  if (!open) return null;

  const totalPlannedKg = plans.reduce(
    (acc, p) => acc + (Number(p.plannedQtyKg) || 0),
    0
  );

  // Material aggregates across all recipe runs
  const materialTotals: Record<string, { qty: number; count: number }> = {};
  plans.forEach((p) => {
    (p.materials || []).forEach((m) => {
      const name = m.material.trim().toUpperCase() || "UNKNOWN";
      const q = Number(m.quantity) || 0;
      if (!materialTotals[name]) {
        materialTotals[name] = { qty: 0, count: 0 };
      }
      materialTotals[name].qty += q;
      materialTotals[name].count += 1;
    });
  });

  const totalAllMaterialsKg = Object.values(materialTotals).reduce(
    (a, b) => a + b.qty,
    0
  );

  const handleDirectPrint = () => {
    printTapePlantPlanningSheet({ date, shiftName, status, plans });
  };

  const handleExportExcel = () => {
    generateTapePlantPlanningExcel({ date, shiftName, status, plans });
  };

  const KNOWN_MATS = ["PP", "CC", "MB", "RP1", "RP2", "HD RP", "TPT"];

  let totalPPSum = 0;
  let totalCCSum = 0;
  let totalMBSum = 0;
  let totalRP1Sum = 0;
  let totalRP2Sum = 0;
  let totalHDRPSum = 0;
  let totalTPTSum = 0;
  let totalOtherSum = 0;
  let totalBatchSum = 0;

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
                  {totalPlannedKg.toLocaleString()} KG
                </span>
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
            {/* Header / Letterhead */}
            <div className="border-b-2 border-slate-900 pb-3 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Flexicom Industries Pvt. Ltd.
                </h1>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Tape Plant Extrusion & Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&K)
                </p>
                <div className="inline-block mt-2 px-2.5 py-1 bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wide border border-slate-400">
                  Shift Production & Material Formulation Plan
                </div>
              </div>

              <div className="text-right text-xs space-y-1">
                <div className="font-mono text-slate-600">
                  Doc Ref: <strong className="text-slate-900">{docRef}</strong>
                </div>
                <div className="text-slate-600">
                  Date: <strong className="text-slate-900">{date}</strong> &nbsp;|&nbsp; Shift: <strong className="text-slate-900">{shiftName}</strong>
                </div>
                <div className="text-slate-600">
                  Status: <strong className="text-slate-900">{status}</strong>
                </div>
              </div>
            </div>

            {/* Key Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-300 text-xs">
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Total Planned Output
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {totalPlannedKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
                </span>
              </div>
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Total Recipe Runs
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {plans.length} <span className="text-xs font-normal">Runs</span>
                </span>
              </div>
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Total Material Demand
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {totalAllMaterialsKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
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

            {/* Table 1: Recipe Machine Parameters & Specifications */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  1. Recipe Run Specifications & Machine Parameters
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                      <th className="p-2 border-r border-slate-300">Recipe Quality Code</th>
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
                          {Number(p.plannedQtyKg) ? Number(p.plannedQtyKg).toLocaleString() : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={12} className="p-2 text-right uppercase tracking-wider text-[10px]">
                        Total Shift Planned Output:
                      </td>
                      <td className="p-2 text-right font-mono font-black text-slate-900 bg-slate-200">
                        {totalPlannedKg.toLocaleString()} KG
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table 2: Material Formulation Matrix per Recipe */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  2. Raw Material Blend & Composition Breakdown per Run
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                      <th className="p-2 border-r border-slate-300">Recipe Quality</th>
                      <th className="p-2 border-r border-slate-300 text-right">PP (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">CC (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">MB (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">RP1 (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">RP2 (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">HD RP (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">TPT (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">Other (KG)</th>
                      <th className="p-2 border-r border-slate-300 text-right font-bold bg-slate-50">
                        Total Batch (KG)
                      </th>
                      <th className="p-2 border-r border-slate-300 text-right">Blend %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {plans.map((p, idx) => {
                      const getMat = (name: string) => {
                        const m = p.materials?.find(
                          (x) => x.material.trim().toUpperCase() === name.toUpperCase()
                        );
                        if (!m || !Number(m.quantity)) return "—";
                        return `${Number(m.quantity).toLocaleString()} (${m.percentage || 0}%)`;
                      };

                      const getMatRaw = (name: string) => {
                        const match = (p.materials || []).find(
                          (m) => m.material.trim().toUpperCase() === name.toUpperCase()
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
                        if (!KNOWN_MATS.includes(m.material.trim().toUpperCase())) {
                          otherQty += q;
                        }
                      });

                      totalPPSum += pp.qty;
                      totalCCSum += cc.qty;
                      totalMBSum += mb.qty;
                      totalRP1Sum += rp1.qty;
                      totalRP2Sum += rp2.qty;
                      totalHDRPSum += hdrp.qty;
                      totalTPTSum += tpt.qty;
                      totalOtherSum += otherQty;
                      totalBatchSum += (runBatchQty || Number(p.plannedQtyKg) || 0);

                      return (
                        <tr key={`mat-${p.id}`} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900">
                            {p.recipeQuality}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{getMat("PP")}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{getMat("CC")}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{getMat("MB")}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{getMat("RP1")}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{getMat("RP2")}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{getMat("HD RP")}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{getMat("TPT")}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">{otherQty ? otherQty.toLocaleString() : "—"}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900 bg-slate-50/70">
                            {(runBatchQty || Number(p.plannedQtyKg) || 0).toLocaleString()} KG
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono text-[11px]">
                            {totalBlendPct > 0 ? `${totalBlendPct.toFixed(1)}%` : "100%"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <td colSpan={2} className="p-2 text-right uppercase tracking-wider text-[10px]">
                        Total Formulations:
                      </td>
                      <td className="p-2 text-right font-mono">{totalPPSum ? totalPPSum.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right font-mono">{totalCCSum ? totalCCSum.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right font-mono">{totalMBSum ? totalMBSum.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right font-mono">{totalRP1Sum ? totalRP1Sum.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right font-mono">{totalRP2Sum ? totalRP2Sum.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right font-mono">{totalHDRPSum ? totalHDRPSum.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right font-mono">{totalTPTSum ? totalTPTSum.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right font-mono">{totalOtherSum ? totalOtherSum.toLocaleString() : "—"}</td>
                      <td className="p-2 text-right font-mono font-black text-slate-900 bg-slate-200">
                        {totalBatchSum.toLocaleString()} KG
                      </td>
                      <td className="p-2 text-right font-mono text-[11px]">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table 3: Shift Consolidated Material Requirements */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Boxes className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  3. Shift Aggregate Raw Material Demands & Store Requisitions
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {Object.entries(materialTotals).map(([mat, data]) => (
                  <div
                    key={mat}
                    className="p-2 bg-slate-50 rounded border border-slate-300 flex flex-col justify-between"
                  >
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{mat}</span>
                    <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                      {data.qty.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">KG</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 text-right mt-1">
                      {totalAllMaterialsKg > 0
                        ? `${((data.qty / totalAllMaterialsKg) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                ))}
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
