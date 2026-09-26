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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-950 text-white border-b border-emerald-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Inward Production Slip Preview</h3>
              <p className="text-[11px] text-emerald-300 font-mono">{data.referenceNo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm text-slate-900 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-emerald-900 pb-3">
              <div className="w-16">
                <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex-1 text-center">
                <h2 className="text-sm font-black text-slate-900 uppercase">Flexicom Industries Pvt. Ltd.</h2>
                <p className="text-[10px] text-slate-500">Tape Plant Extrusion • Finished Bobbin Inward Receipt</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-800 text-white text-[10px] font-extrabold uppercase rounded">
                  INWARD PRODUCTION SLIP
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <div>REF: <strong className="font-mono text-slate-900">{data.referenceNo}</strong></div>
                <div>DATE: <strong className="text-slate-900">{data.date}</strong></div>
                <div>SHIFT: <strong className="text-slate-900">{data.shiftName}</strong></div>
              </div>
            </div>

            {/* Quality Banner */}
            <div className="p-3 bg-emerald-50 rounded border border-emerald-200 border-l-4 border-l-emerald-600">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Produced Quality</span>
              <span className="text-sm font-extrabold text-emerald-950 font-mono block">{data.recipeQuality}</span>
            </div>

            {/* Metrics */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-300">Gross (KG)</th>
                    <th className="p-2 border-r border-slate-300">Wastage (KG)</th>
                    <th className="p-2 border-r border-slate-300 bg-emerald-50 text-emerald-900">Net Inward (KG)</th>
                    <th className="p-2 border-r border-slate-300 bg-blue-50 text-blue-900">Bobbins (@ 1.6 KG)</th>
                    <th className="p-2 bg-purple-50 text-purple-900">Crates (@ 12.8 KG)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-mono font-black text-xs">
                    <td className="p-3 border-r border-slate-200 text-slate-600">{data.grossKg.toFixed(2)}</td>
                    <td className="p-3 border-r border-slate-200 text-rose-600">{data.wasteKg.toFixed(2)}</td>
                    <td className="p-3 border-r border-slate-200 text-emerald-800 bg-emerald-50/40 font-extrabold text-sm">{data.netKg.toFixed(2)} KG</td>
                    <td className="p-3 border-r border-slate-200 text-blue-900 bg-blue-50/40">{data.bobbins.toFixed(2)} PCS</td>
                    <td className="p-3 text-purple-900 bg-purple-50/40">{data.crates.toFixed(2)} CRATES</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {data.remarks && (
              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <strong>Batch Remarks:</strong> {data.remarks}
              </div>
            )}

            {/* Signatures */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-[10px]">
              <div>
                <div className="font-bold text-slate-800 mb-4">{data.operatorName || "________________"}</div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-600 uppercase">Plant Operator</div>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-4">________________</div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-600 uppercase">Quality Control</div>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-4">________________</div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-600 uppercase">Store In-Charge</div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1">
              <span>Flexicom ERP • Tape Plant Inward Receipt</span>
              <span>Printed: {printTimestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
