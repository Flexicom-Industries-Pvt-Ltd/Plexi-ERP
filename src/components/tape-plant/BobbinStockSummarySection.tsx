"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Boxes,
  Package,
  Layers,
  Scale,
  Download,
  Printer,
  RefreshCw,
  Search,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Info,
  Calendar,
  Clock,
  TrendingUp,
} from "lucide-react";
import { RecipeQualityBadge } from "./RecipeQualityBadge";
import {
  BobbinStockItem,
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
  computeNetProductionKg,
  computeBobbinStockCount,
  computeCrateStockCount,
  computeBobbinStockTotals,
  exportBobbinStockExcel,
  printBobbinStockSummary,
} from "@/lib/tape-plant/bobbin-stock";

interface BobbinStockSummarySectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
  onNavigateToPostProduction?: () => void;
}

export function BobbinStockSummarySection({
  date,
  shiftId,
  shiftName,
  onNavigateToPostProduction,
}: BobbinStockSummarySectionProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rawEntries, setRawEntries] = useState<any[]>([]);
  const [postProductionStatus, setPostProductionStatus] = useState<string>("SAVED");
  const [operatorName, setOperatorName] = useState<string>("");

  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (!date || !shiftId) return;
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetch(
          `/api/production/tape-plant/post-production?date=${date}&shiftId=${shiftId}&_t=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Pragma: "no-cache",
              "Cache-Control": "no-cache",
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch post-production records");
        const data = await res.json();

        const postProd = data.postProduction;
        setPostProductionStatus(postProd?.status === "SUBMITTED" ? "SUBMITTED" : "SAVED");
        setOperatorName(postProd?.operatorName || "");

        const entries = Array.isArray(data.entries) ? data.entries : [];
        setRawEntries(entries);

        if (isManualRefresh) {
          toast.success("Bobbin stock summary refreshed successfully");
        }
      } catch (err) {
        console.error("Error fetching bobbin stock summary data:", err);
        toast.error("Failed to load bobbin stock summary data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date, shiftId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Convert raw post-production entries into BobbinStockItems
  const processedItems: BobbinStockItem[] = useMemo(() => {
    return rawEntries
      .map((entry, idx) => {
        const quality = entry.recipeQuality || `Recipe ${idx + 1}`;
        const grossDone = Number(entry.productionDoneKg) || 0;
        const waste = Number(entry.wasteKg) || 0;
        const netKg = computeNetProductionKg(grossDone, waste);
        const bobbinStock = computeBobbinStockCount(netKg);
        const crateStock = computeCrateStockCount(netKg);

        return {
          slNo: idx + 1,
          id: entry.id || entry.planId || String(idx),
          recipeQuality: quality,
          productionDoneKg: grossDone,
          wasteKg: waste,
          netProductionKg: netKg,
          bobbinStock,
          crateStock,
          shiftName: entry.shiftName || shiftName,
          remarks: entry.remarks || "",
        };
      })
      .filter((item) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          item.recipeQuality.toLowerCase().includes(q) ||
          (item.shiftName && item.shiftName.toLowerCase().includes(q)) ||
          (item.remarks && item.remarks.toLowerCase().includes(q))
        );
      });
  }, [rawEntries, shiftName, searchTerm]);

  // Totals for all items (or filtered)
  const totals = useMemo(() => {
    return computeBobbinStockTotals(processedItems);
  }, [processedItems]);

  const handleExportExcel = () => {
    if (processedItems.length === 0) {
      toast.error("No bobbin stock entries to export");
      return;
    }
    exportBobbinStockExcel({
      date,
      shiftName,
      items: processedItems,
      totals,
    });
    toast.success("Excel report generated & downloaded");
  };

  const handlePrint = () => {
    if (processedItems.length === 0) {
      toast.error("No bobbin stock entries to print");
      return;
    }
    printBobbinStockSummary({
      date,
      shiftName,
      items: processedItems,
      totals,
    });
  };

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Bento Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Output Done (kg) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Net Production Done
            </span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Scale className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${totals.totalNetProductionKg.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} kg`
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
              <span>Gross: {totals.totalGrossDoneKg.toFixed(1)} kg</span>
              <span className="text-slate-300">•</span>
              <span className="text-rose-600">Waste: {totals.totalWasteKg.toFixed(1)} kg</span>
            </p>
          </div>
        </div>

        {/* Bobbin Stock (@ 1.6 kg) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Stock of Bobbins
            </span>
            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-blue-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${totals.totalBobbinStock.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} pcs`
              )}
            </div>
            <p className="text-[11px] font-medium text-blue-700/80 mt-1">
              Derived at standard <strong className="text-blue-900">{BOBBIN_WEIGHT_KG} kg</strong> / bobbin
            </p>
          </div>
        </div>

        {/* Crate Stock (@ 12.8 kg) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
              Stock of Crates
            </span>
            <div className="p-2.5 bg-purple-500/10 text-purple-600 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-purple-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${totals.totalCrateStock.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} crates`
              )}
            </div>
            <p className="text-[11px] font-medium text-purple-700/80 mt-1">
              Standard <strong className="text-purple-900">{CRATE_WEIGHT_KG} kg</strong> ({BOBBINS_PER_CRATE} bobbins/crate)
            </p>
          </div>
        </div>

        {/* Active Qualities */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Active Qualities
            </span>
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {loading ? (
                <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                `${totals.uniqueQualitiesCount} Recipe(s)`
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              Operator: <span className="font-semibold text-slate-700">{operatorName || "General / Shift Operator"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Control Header */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Bobbin & Crate Stock Summary Table</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                Post-Production Linked
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculates bobbin and crate inventory per recipe quality directly from Net Output (Gross Production − Wastage).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Live Search Input */}
            <div className="relative flex-1 md:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by quality..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-sm transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : "text-slate-500"}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={processedItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 shadow-sm transition-colors disabled:opacity-50"
              title="Print Summary Sheet"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={processedItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              title="Export Bobbin Stock to Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4 w-14 text-center">#</th>
                <th className="py-3 px-4">Quality Name</th>
                <th className="py-3 px-4 text-right">Gross Prod (kg)</th>
                <th className="py-3 px-4 text-right">Wastage (kg)</th>
                <th className="py-3 px-4 text-right bg-emerald-50/50 text-emerald-900 border-x border-emerald-100/80">
                  Production Done in KG <span className="text-[9px] font-medium text-emerald-700 block normal-case">(Net Output)</span>
                </th>
                <th className="py-3 px-4 text-right bg-blue-50/50 text-blue-900 border-r border-blue-100/80">
                  Stock of Bobbins <span className="text-[9px] font-medium text-blue-700 block normal-case">(Net kg ÷ 1.6 kg)</span>
                </th>
                <th className="py-3 px-4 text-right bg-purple-50/50 text-purple-900 border-r border-purple-100/80">
                  Stock of Crates <span className="text-[9px] font-medium text-purple-700 block normal-case">(Net kg ÷ 12.8 kg)</span>
                </th>
                <th className="py-3 px-4 text-center">Shift</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      <span className="font-semibold">Loading Bobbin Stock summary...</span>
                    </div>
                  </td>
                </tr>
              ) : processedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center p-4">
                      <div className="p-3 bg-slate-100 text-slate-400 rounded-full mb-3">
                        <Boxes className="h-8 w-8" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">No Post-Production Data Found</h3>
                      <p className="text-xs text-slate-500 mt-1 text-center">
                        {searchTerm
                          ? `No recipes match "${searchTerm}". Try clearing your search.`
                          : "No recipe outputs have been recorded in Post Production for this shift & date yet."}
                      </p>
                      {onNavigateToPostProduction && !searchTerm && (
                        <button
                          type="button"
                          onClick={onNavigateToPostProduction}
                          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all"
                        >
                          <span>Open Post Production Sheet</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                processedItems.map((item) => (
                  <tr
                    key={item.id || item.slNo}
                    className="hover:bg-slate-50/80 transition-colors group font-medium"
                  >
                    {/* Serial Number */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-500">
                      {item.slNo}
                    </td>

                    {/* Quality Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <RecipeQualityBadge value={item.recipeQuality} />
                      </div>
                    </td>

                    {/* Gross Production Done in KG */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                      {item.productionDoneKg.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    {/* Wastage in KG */}
                    <td className="py-3.5 px-4 text-right font-medium text-rose-600">
                      {item.wasteKg > 0 ? (
                        item.wasteKg.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      ) : (
                        <span className="text-slate-300">0.00</span>
                      )}
                    </td>

                    {/* Net Production Done in KG */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-800 bg-emerald-50/30 border-x border-emerald-100/60">
                      {item.netProductionKg.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-semibold text-emerald-600">kg</span>
                    </td>

                    {/* Stock of Bobbins (Net Output / 1.6) */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-blue-900 bg-blue-50/30 border-r border-blue-100/60">
                      {item.bobbinStock.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-semibold text-blue-600">pcs</span>
                    </td>

                    {/* Stock of Crates (Net Output / 12.8) */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-purple-900 bg-purple-50/30 border-r border-purple-100/60">
                      {item.crateStock.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      <span className="text-[10px] font-semibold text-purple-600">crates</span>
                    </td>

                    {/* Shift */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {item.shiftName}
                      </span>
                    </td>

                    {/* Remarks */}
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {item.remarks || <span className="text-slate-300">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer with Grand Totals */}
            {processedItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-xs text-slate-900">
                  <td colSpan={2} className="py-3.5 px-4 text-right uppercase tracking-wider">
                    Grand Total:
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-700">
                    {totals.totalGrossDoneKg.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-rose-600">
                    {totals.totalWasteKg.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-800 bg-emerald-100/70 border-x border-emerald-200">
                    {totals.totalNetProductionKg.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] font-bold text-emerald-700">kg</span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-blue-900 bg-blue-100/70 border-r border-blue-200">
                    {totals.totalBobbinStock.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] font-bold text-blue-700">pcs</span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-purple-900 bg-purple-100/70 border-r border-purple-200">
                    {totals.totalCrateStock.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-[10px] font-bold text-purple-700">crates</span>
                  </td>
                  <td colSpan={2} className="py-3.5 px-4 text-center text-slate-400 font-normal">
                    —
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Calculation Info Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong>Formulas:</strong> Bobbins = Net Output (kg) ÷ <strong>1.6 kg</strong> • Crates = Net Output (kg) ÷ <strong>12.8 kg</strong> (8 bobbins/crate).
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Auto-synchronized with Tape Plant Post-Production Sheet
          </div>
        </div>
      </div>
    </div>
  );
}
