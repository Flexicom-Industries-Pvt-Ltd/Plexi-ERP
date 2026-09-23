"use client";

import React, { useRef } from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  Layers,
  Calendar,
  Clock,
  FlaskConical,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { RecipePlanItem } from "./TapePlantPlanningSection";
import { generateTapePlantPlanningExcel } from "@/lib/tape-plant/planning-export";

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
  const printContentRef = useRef<HTMLDivElement>(null);

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
    window.print();
  };

  const handleExportExcel = () => {
    generateTapePlantPlanningExcel({ date, shiftName, status, plans });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      {/* Inline styles for Print Layout */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #planning-print-area,
          #planning-print-area * {
            visibility: visible !important;
          }
          #planning-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: white !important;
            color: black !important;
            font-size: 10pt !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-cyan-300 rounded-xl">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Tape Plant Shift Plan Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    status === "SUBMITTED"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {shiftName} • {date} • {plans.length} Recipe Run(s) •{" "}
                <span className="font-mono text-cyan-300 font-bold">
                  {totalPlannedKg.toLocaleString()} KG
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          <div
            id="planning-print-area"
            ref={printContentRef}
            className="max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-xs border border-slate-200 text-slate-800 space-y-6"
          >
            {/* Header / Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Flexicom Industries Pvt. Ltd.
                </h1>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 uppercase tracking-wider">
                  Plant: Kathua Unit • Section: Tape Plant (Extrusion & Winding)
                </p>
                <div className="inline-block mt-2 px-2.5 py-1 bg-slate-100 text-slate-900 rounded font-bold text-xs uppercase tracking-wide border border-slate-300">
                  Shift Production & Material Planning Sheet
                </div>
              </div>

              <div className="text-right text-xs space-y-1">
                <div className="font-mono text-slate-600">
                  Doc Ref: <strong className="text-slate-900">TP-PLN-{date.replace(/-/g, "")}</strong>
                </div>
                <div className="text-slate-500">
                  Date: <strong className="text-slate-900 font-semibold">{date}</strong>
                </div>
                <div className="text-slate-500">
                  Shift: <strong className="text-slate-900 font-semibold">{shiftName}</strong>
                </div>
                <div className="text-slate-500">
                  Status: <strong className="text-slate-900 font-semibold">{status}</strong>
                </div>
              </div>
            </div>

            {/* Shift Context Stats Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Total Planned Output
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {totalPlannedKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Total Recipe Runs
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {plans.length} <span className="text-xs font-normal">Runs</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Total Raw Material Demand
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {totalAllMaterialsKg.toLocaleString()} <span className="text-xs font-normal">KG</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Generated On
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            {/* Table 1: Recipe Machine Parameters & Specifications */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  1. Recipe Runs Specifications & Machine Parameters
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
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
                      <th className="p-2 border-r border-slate-300 text-right font-black bg-blue-50/70 text-blue-900">
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
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-semibold">
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
                        <td className="p-2 border-r border-slate-200 text-right font-mono font-black text-slate-900 bg-blue-50/40">
                          {Number(p.plannedQtyKg) ? Number(p.plannedQtyKg).toLocaleString() : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={12} className="p-2 text-right uppercase tracking-wider text-[11px]">
                        Total Shift Planned Output:
                      </td>
                      <td className="p-2 text-right font-mono font-black text-blue-900 bg-blue-100/80">
                        {totalPlannedKg.toLocaleString()} KG
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table 2: Material Formulation Matrix per Recipe */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  2. Raw Material Blend & Composition Breakdown per Run
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                      <th className="p-2 border-r border-slate-300">Recipe Quality</th>
                      <th className="p-2 border-r border-slate-300 text-right">PP (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">CC (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">MB (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">RP1 (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">RP2 (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">HD RP (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right">TPT (KG / %)</th>
                      <th className="p-2 border-r border-slate-300 text-right font-black bg-emerald-50/70 text-emerald-950">
                        Total Batch (KG)
                      </th>
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

                      const batchSum = (p.materials || []).reduce(
                        (acc, m) => acc + (Number(m.quantity) || 0),
                        0
                      );

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
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-black text-emerald-950 bg-emerald-50/30">
                            {batchSum ? batchSum.toLocaleString() : Number(p.plannedQtyKg).toLocaleString()} KG
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 3: Shift Consolidated Material Requirements */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                3. Shift Aggregate Raw Material Demands
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(materialTotals).map(([mat, data]) => (
                  <div
                    key={mat}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{mat}</span>
                      <div className="font-mono font-black text-slate-900 text-xs">
                        {data.qty.toLocaleString()} KG
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                      {totalAllMaterialsKg > 0
                        ? `${((data.qty / totalAllMaterialsKg) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Authorizations & Signatures Footer */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
              <div className="space-y-8">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-semibold uppercase tracking-wider text-[10px]">
                  Prepared By (Operator / Incharge)
                </span>
              </div>
              <div className="space-y-8">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-semibold uppercase tracking-wider text-[10px]">
                  Verified By (Quality Incharge)
                </span>
              </div>
              <div className="space-y-8">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-semibold uppercase tracking-wider text-[10px]">
                  Approved By (Plant Supervisor)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
