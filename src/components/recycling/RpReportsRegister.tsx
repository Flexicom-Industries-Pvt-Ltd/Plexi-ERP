"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Printer, FileSpreadsheet, ExternalLink, Recycle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  RpProductionReportData,
  RpWastageCollectionData,
} from "@/lib/recycling/rp-types";
import {
  exportRpProductionExcel,
  exportWastageCollectionExcel,
} from "@/lib/recycling/rp-export";
import {
  generateRpProductionHtml,
  generateWastageCollectionHtml,
  openPrintWindow,
} from "@/lib/recycling/print-rp-reports";

interface RpReportsRegisterProps {
  onOpenSheet: (tab: "wastage" | "production", date: string) => void;
}

export function RpReportsRegister({ onOpenSheet }: RpReportsRegisterProps) {
  const [view, setView] = useState<"wastage" | "production">("wastage");
  const [wastageList, setWastageList] = useState<RpWastageCollectionData[]>([]);
  const [productionList, setProductionList] = useState<RpProductionReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRegister = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([
        fetch(`/api/production/recycling-plant/wastage-collection?_t=${Date.now()}`),
        fetch(`/api/production/recycling-plant/production?_t=${Date.now()}`),
      ]);
      const [wJson, pJson] = await Promise.all([wRes.json(), pRes.json()]);
      if (wJson.success && Array.isArray(wJson.reports)) setWastageList(wJson.reports);
      if (pJson.success && Array.isArray(pJson.reports)) setProductionList(pJson.reports);
    } catch {
      toast.error("Failed to load Recycling Plant register");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegister();
  }, [loadRegister]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="inline-flex p-1 rounded-lg bg-slate-200/60">
          <button
            type="button"
            onClick={() => setView("wastage")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
              view === "wastage"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Wastage Collection ({wastageList.length})
          </button>
          <button
            type="button"
            onClick={() => setView("production")}
            className={cn(
              "px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
              view === "production"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            RP Plant Production ({productionList.length})
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadRegister}
          className="h-8 text-xs"
        >
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading register...</span>
        </div>
      ) : view === "wastage" ? (
        wastageList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Recycle className="h-8 w-8 mx-auto opacity-40" />
            <p className="text-sm font-medium text-slate-600">
              No Wastage Collection reports saved yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-4 text-left">Sl. No.</th>
                  <th className="py-2.5 px-4 text-left">Date</th>
                  <th className="py-2.5 px-4 text-left">Operator</th>
                  <th className="py-2.5 px-4 text-right">Summary (kg)</th>
                  <th className="py-2.5 px-4 text-right">Grand Total (kg)</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wastageList.map((r) => (
                  <tr key={r.id || r.date} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono font-bold text-rose-600">
                      {String(r.serialNo).padStart(3, "0")}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {r.date}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {r.operatorName || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {r.summaryTotalKg.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {r.grandTotalKg.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          r.status === "SUBMITTED" || r.status === "APPROVED"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        )}
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => onOpenSheet("wastage", r.date)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Open</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => openPrintWindow(generateWastageCollectionHtml(r))}
                          title="Print"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => exportWastageCollectionExcel(r)}
                          title="Export Excel"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : productionList.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <Recycle className="h-8 w-8 mx-auto opacity-40" />
          <p className="text-sm font-medium text-slate-600">
            No R.P. Plant Production reports saved yet
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-4 text-left">Sr. No.</th>
                <th className="py-2.5 px-4 text-left">Date</th>
                <th className="py-2.5 px-4 text-left">Operator</th>
                <th className="py-2.5 px-4 text-right">Opening (kg)</th>
                <th className="py-2.5 px-4 text-right">Prod (kg)</th>
                <th className="py-2.5 px-4 text-right">Issued TP (kg)</th>
                <th className="py-2.5 px-4 text-right">Closing (kg)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productionList.map((r) => (
                <tr key={r.id || r.date} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-4 font-mono font-bold text-rose-600">
                    {String(r.serialNo).padStart(3, "0")}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800">{r.date}</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {r.operatorName || "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {r.totalOpeningStock.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-700 font-semibold tabular-nums">
                    +{r.totalProductionOnDate.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-sky-700 tabular-nums">
                    -{r.totalIssuedToTapePlant.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {r.totalClosingStock.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        r.status === "SUBMITTED" || r.status === "APPROVED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      )}
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => onOpenSheet("production", r.date)}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => openPrintWindow(generateRpProductionHtml(r))}
                        title="Print"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => exportRpProductionExcel(r)}
                        title="Export Excel"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
