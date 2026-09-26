"use client";

import React from "react";
import { X, Printer, FileText } from "lucide-react";
import { BobbinInwardSlipData, printBobbinInwardSlip } from "@/lib/tape-plant/print-bobbin-inward-slip";

interface BobbinInwardSlipModalProps {
  open: boolean;
  onClose: () => void;
  data: BobbinInwardSlipData | null;
}

export function BobbinInwardSlipModal({ open, onClose, data }: BobbinInwardSlipModalProps) {
  if (!open || !data) return null;

  const printTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printBobbinInwardSlip(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Minimalist Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-900 tracking-tight">Inward Production Slip</h3>
              <p className="text-[11px] text-slate-500 font-mono">{data.referenceNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Minimalist Paper Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/60">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs text-slate-900 space-y-4 text-xs">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Flexicom Industries Pvt. Ltd.</h2>
                  <p className="text-[10px] text-slate-500">Tape Plant Extrusion • Production Inward</p>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-600 font-mono">
                <div><span className="text-slate-400">REF:</span> <strong className="text-slate-900">{data.referenceNo}</strong></div>
                <div><span className="text-slate-400">DATE:</span> {data.date}</div>
                <div><span className="text-slate-400">SHIFT:</span> {data.shiftName}</div>
              </div>
            </div>

            {/* Quality Banner */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider block">Produced Quality</span>
              <span className="text-xs font-bold text-slate-900 font-mono block">{data.recipeQuality}</span>
            </div>

            {/* Metrics */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-medium uppercase text-slate-600">
                  <tr>
                    <th className="p-2 border-r border-slate-200">Gross</th>
                    <th className="p-2 border-r border-slate-200">Waste</th>
                    <th className="p-2 border-r border-slate-200">Net Output</th>
                    <th className="p-2 border-r border-slate-200">Bobbins (@ 1.6)</th>
                    <th className="p-2">Crates (@ 12.8)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-mono font-bold text-xs bg-white">
                    <td className="p-2.5 border-r border-slate-100 text-slate-600">{data.grossKg.toFixed(2)} kg</td>
                    <td className="p-2.5 border-r border-slate-100 text-rose-600">{data.wasteKg.toFixed(2)} kg</td>
                    <td className="p-2.5 border-r border-slate-100 text-slate-900">{data.netKg.toFixed(2)} kg</td>
                    <td className="p-2.5 border-r border-slate-100 text-slate-900">{data.bobbins.toFixed(1)} pcs</td>
                    <td className="p-2.5 text-slate-900">{data.crates.toFixed(1)} crates</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {data.remarks && (
              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <strong className="text-slate-700">Remarks:</strong> {data.remarks}
              </div>
            )}

            {/* Signatures */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-3 text-center text-[10px]">
              <div>
                <div className="font-medium text-slate-800 mb-3">{data.operatorName || "________________"}</div>
                <div className="border-t border-slate-300 pt-1 font-medium text-slate-500 uppercase">Plant Operator</div>
              </div>
              <div>
                <div className="font-medium text-slate-800 mb-3">________________</div>
                <div className="border-t border-slate-300 pt-1 font-medium text-slate-500 uppercase">Quality Control</div>
              </div>
              <div>
                <div className="font-medium text-slate-800 mb-3">________________</div>
                <div className="border-t border-slate-300 pt-1 font-medium text-slate-500 uppercase">Store In-Charge</div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 font-mono">
              <span>Flexicom ERP • Inward Slip</span>
              <span>Printed: {printTimestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
