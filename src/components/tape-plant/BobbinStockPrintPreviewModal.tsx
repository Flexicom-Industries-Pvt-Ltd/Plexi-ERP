"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  FileText,
  Boxes,
  Package,
  Scale,
  Layers,
} from "lucide-react";
import {
  BobbinStockItem,
  BobbinStockTotals,
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
  exportBobbinStockExcel,
  printBobbinStockSummary,
} from "@/lib/tape-plant/bobbin-stock";

interface BobbinStockPrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  dateDescription: string;
  shiftDescription: string;
  items: BobbinStockItem[];
  totals: BobbinStockTotals;
}

export function BobbinStockPrintPreviewModal({
  open,
  onClose,
  dateDescription,
  shiftDescription,
  items,
  totals,
}: BobbinStockPrintPreviewModalProps) {
  if (!open) return null;

  const docDate = new Date().toISOString().split("T")[0];
  const docRef = `TP-BSTK-${docDate.replace(/-/g, "")}`;
  const printTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handleDirectPrint = () => {
    printBobbinStockSummary({
      dateDescription,
      shiftDescription,
      items,
      totals,
    });
  };

  const handleExportExcel = () => {
    exportBobbinStockExcel({
      dateDescription,
      shiftDescription,
      items,
      totals,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Bobbin & Crate Stock Summary Preview
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border bg-emerald-900/40 text-emerald-300 border-emerald-500/40">
                  {shiftDescription}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {dateDescription} • {items.length} Active Qualities •{" "}
                <span className="font-mono text-white font-bold">
                  {totals.totalNetProductionKg.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  KG Net Output
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
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-slate-300 text-slate-900 space-y-5">
            {/* Main Header with Top-Left Corner Vivid Flexicom Logo */}
            <div className="border-b-2 border-slate-900 pb-3 text-center">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Top-Left Corner Logo */}
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
                      Bobbin & Crate Stock Summary Report
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
                <span>Period: <strong className="text-slate-900">{dateDescription}</strong></span>
                <span>•</span>
                <span>Shift: <strong className="text-slate-900">{shiftDescription}</strong></span>
                <span>•</span>
                <span>Active Qualities: <strong className="text-slate-900">{items.length}</strong></span>
                <span>•</span>
                <span>Printed: <strong className="text-slate-900">{printTimestamp}</strong></span>
              </div>
            </div>

            {/* Key KPI Summary Strip (4 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-300 text-xs text-center">
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Total Net Output
                </span>
                <span className="text-base font-black font-mono text-emerald-800">
                  {totals.totalNetProductionKg.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-xs font-normal">KG</span>
                </span>
              </div>

              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Available Crates (@ 12.8)
                </span>
                <span className="text-base font-black font-mono text-emerald-900">
                  {(totals.totalAvailableCrateStock ?? totals.totalCrateStock).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-xs font-normal">CRATES</span>
                </span>
              </div>

              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Available Bobbins (KG)
                </span>
                <span className="text-base font-black font-mono text-blue-900">
                  {(totals.totalAvailableKg ?? totals.totalNetProductionKg).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-xs font-normal">KG</span>
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Issued to Looms
                </span>
                <span className="text-base font-black font-mono text-purple-900">
                  {(totals.totalIssuedKg ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  <span className="text-xs font-normal">KG</span>
                </span>
              </div>
            </div>

            {/* Box 1: FINISHED BOBBIN & CRATE STOCK SUMMARY */}
            <div className="space-y-1.5">
              <div className="bg-slate-200 border border-slate-300 border-b-0 py-1 px-3 text-center">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  1. FINISHED BOBBIN & CRATE STOCK SUMMARY (PRODUCED − ISSUED)
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-b">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                      <th className="p-2 border-r border-slate-300">Quality Name / Recipe Code</th>
                      <th className="p-2 border-r border-slate-300 text-right w-20">Gross (KG)</th>
                      <th className="p-2 border-r border-slate-300 text-right w-16">Waste (KG)</th>
                      <th className="p-2 border-r border-slate-300 text-right font-bold text-emerald-900 w-24">
                        Produced Net
                      </th>
                      <th className="p-2 border-r border-slate-300 text-right font-bold bg-emerald-50 text-emerald-900 w-28">
                        Avail Crates (@ 12.8)
                      </th>
                      <th className="p-2 border-r border-slate-300 text-right font-bold bg-blue-50 text-blue-900 w-28">
                        Avail Bobbins (KG)
                      </th>
                      <th className="p-2 border-slate-300 text-right font-bold bg-purple-50 text-purple-900 w-28">
                        Issued to Looms
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-500 italic">
                          No bobbin stock records found for the selected period.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const availCrates = item.availableCrates !== undefined ? item.availableCrates : item.crateStock;
                        const availKg = item.availableKg !== undefined ? item.availableKg : item.netProductionKg - (item.issuedKg || 0);
                        const issuedCrates = item.issuedCrates || 0;
                        const issuedKg = item.issuedKg || 0;

                        return (
                          <tr key={item.id || item.slNo} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-500">
                              {item.slNo}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900">
                              {item.recipeQuality}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600">
                              {item.productionDoneKg.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono text-rose-600 font-semibold">
                              {item.wasteKg.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                              {item.netProductionKg.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="text-[10px] font-medium text-slate-500">KG</span>
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-emerald-900 bg-emerald-50/50">
                              {availCrates.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="text-[10px] font-medium text-emerald-600">CRATES</span>
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono font-extrabold text-blue-900 bg-blue-50/50">
                              {availKg.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="text-[10px] font-medium text-blue-600">KG</span>
                            </td>
                            <td className="p-2 border-slate-200 text-right font-mono font-bold text-purple-900 bg-purple-50/40">
                              {issuedCrates.toLocaleString(undefined, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="text-[10px] font-medium text-purple-600">crates</span>
                              <span className="block text-[9px] text-purple-500">({issuedKg.toFixed(1)} kg)</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {items.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <td colSpan={2} className="p-2 text-right uppercase tracking-wider text-[10px]">
                          Grand Total:
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-700">
                          {totals.totalGrossDoneKg.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-rose-600">
                          {totals.totalWasteKg.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {totals.totalNetProductionKg.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          KG
                        </td>
                        <td className="p-2 text-right font-mono font-black text-emerald-950 bg-emerald-100">
                          {(totals.totalAvailableCrateStock ?? totals.totalCrateStock).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          CRATES
                        </td>
                        <td className="p-2 text-right font-mono font-black text-blue-950 bg-blue-100">
                          {(totals.totalAvailableKg ?? totals.totalNetProductionKg).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          KG
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-purple-900 bg-purple-100">
                          {totals.totalIssuedCrates.toLocaleString(undefined, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 2,
                          })}{" "}
                          crates
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Authorizations & Signatures Footer (3 columns) */}
            <div className="pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
              <div className="space-y-6">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-bold uppercase tracking-wider text-[10px]">
                  Prepared By (Shift Operator / In-Charge)
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

            {/* Document Bottom Meta Note */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <span>Flexicom ERP • Tape Plant Extrusion System • Document: {docRef}</span>
              <span>Printed: {printTimestamp} • Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
