"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Save,
  CheckCircle,
  Loader2,
  PackageCheck,
  AlertCircle,
  Layers,
  Scale,
  TrendingUp,
  Percent,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import { RecipeQualityBadge } from "./RecipeQualityBadge";
import { OperatorSelect } from "./OperatorSelect";

export interface RecipePostProductionEntry {
  id: string;
  planId?: string;
  recipeQuality: string;
  plannedProductionKg: number | string;
  productionDoneKg: number | string;
  gapKg?: number | string;
  wasteKg: number | string;
  wastePercent: number | string;
  netProductionKg?: number | string;
  remarks?: string;
}

interface PostProductionSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function PostProductionSection({ date, shiftId, shiftName }: PostProductionSectionProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("DRAFT");
  const [operatorName, setOperatorName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [entries, setEntries] = useState<RecipePostProductionEntry[]>([]);

  const fetchPostProductionData = useCallback(
    async (showSyncToast = false) => {
      if (!date || !shiftId) return;
      if (showSyncToast) setRefreshing(true);
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

        if (!res.ok) throw new Error("Failed to fetch post-production");
        const data = await res.json();

        const postProd = data.postProduction;
        setStatus(postProd?.status || "DRAFT");
        setOperatorName(postProd?.operatorName || "");
        setOperatorId(postProd?.operatorId || "");

        if (Array.isArray(data.entries) && data.entries.length > 0) {
          setEntries(data.entries);
          if (showSyncToast) {
            toast.success(`Synchronized ${data.entries.length} recipe(s) from planning`);
          }
        } else {
          setEntries([]);
          if (showSyncToast) {
            toast.info("No planned recipes found for this shift in Planning");
          }
        }
      } catch {
        toast.error("Failed to load post-production data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date, shiftId]
  );

  useEffect(() => {
    fetchPostProductionData();
  }, [fetchPostProductionData]);

  const updateEntryField = (index: number, field: keyof RecipePostProductionEntry, value: any) => {
    setEntries((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      // Auto compute wastePercent when waste or done changes if user hasn't explicitly entered a percent
      if (field === "productionDoneKg" || field === "wasteKg") {
        const done = Number(field === "productionDoneKg" ? value : item.productionDoneKg) || 0;
        const waste = Number(field === "wasteKg" ? value : item.wasteKg) || 0;
        if (done > 0) {
          item.wastePercent = Number(((waste / done) * 100).toFixed(2));
        } else {
          item.wastePercent = 0;
        }
      }

      copy[index] = item;
      return copy;
    });
  };

  // Aggregated shift summary statistics
  const totalPlannedKg = entries.reduce((acc, e) => acc + (Number(e.plannedProductionKg) || 0), 0);
  const totalDoneKg = entries.reduce((acc, e) => acc + (Number(e.productionDoneKg) || 0), 0);
  const totalWasteKg = entries.reduce((acc, e) => acc + (Number(e.wasteKg) || 0), 0);
  const totalGapKg = totalPlannedKg - totalDoneKg;
  const totalNetKg = totalDoneKg - totalWasteKg;
  const overallEfficiency = totalPlannedKg > 0 ? ((totalDoneKg / totalPlannedKg) * 100).toFixed(1) : "0";

  const handleSave = async (submitStatus: "DRAFT" | "SUBMITTED") => {
    if (entries.length === 0) {
      toast.error("No recipe plans found for this shift. Please add plans first.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        shiftId,
        operatorName,
        operatorId,
        entries,
        status: submitStatus,
      };

      const res = await fetch("/api/production/tape-plant/post-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save post-production");
      }

      setStatus(submitStatus);
      toast.success(
        submitStatus === "SUBMITTED"
          ? "Post-production record submitted successfully"
          : "Post-production saved as draft"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to save post-production");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Post-Production Data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">5. Post Production Entry</h2>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  status === "SUBMITTED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Record actual production done, waste, and net output for planned recipes in {shiftName} ({date}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <OperatorSelect
            value={operatorName}
            operatorId={operatorId}
            onChange={(name, id) => {
              setOperatorName(name);
              setOperatorId(id || "");
            }}
            section="TAPE_PLANT"
          />

          <button
            type="button"
            disabled={loading || refreshing || saving}
            onClick={() => fetchPostProductionData(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 h-8"
            title="Reload latest recipes from Planning"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            Sync Planning
          </button>
          <button
            type="button"
            disabled={saving || entries.length === 0}
            onClick={() => handleSave("DRAFT")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 h-8"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving || entries.length === 0}
            onClick={() => handleSave("SUBMITTED")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 h-8"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Submit Output
          </button>
        </div>
      </div>

      {/* Empty State when no plans exist for shift */}
      {entries.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 shadow-sm space-y-4">
          <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-full">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No Planned Recipes Found for This Shift</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Before entering post-production quantities, please define and save recipe runs in the <strong>1. Planning</strong> submodule. Once saved, all planned recipes will immediately appear here.
            </p>
          </div>
          <div>
            <button
              type="button"
              disabled={refreshing}
              onClick={() => fetchPostProductionData(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh from Planning
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Shift Aggregate Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase">Total Planned</span>
                <Scale className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="text-base font-extrabold text-slate-900 font-mono">
                {totalPlannedKg.toLocaleString()} <span className="text-xs font-medium text-slate-400">KG</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[11px] font-extrabold uppercase">Total Done</span>
                <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="text-base font-extrabold text-blue-950 font-mono">
                {totalDoneKg.toLocaleString()} <span className="text-xs font-medium text-blue-600">KG</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[11px] font-bold uppercase">Total Gap</span>
                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="text-base font-extrabold text-amber-900 font-mono">
                {totalGapKg.toLocaleString()} <span className="text-xs font-medium text-amber-600">KG</span>
              </div>
            </div>

            <div className="p-3 bg-red-50/50 rounded-xl border border-red-200 shadow-sm">
              <div className="flex items-center justify-between text-red-700 mb-1">
                <span className="text-[11px] font-extrabold uppercase">Total Waste</span>
                <Percent className="h-3.5 w-3.5 text-red-500" />
              </div>
              <div className="text-base font-extrabold text-red-950 font-mono">
                {totalWasteKg.toLocaleString()} <span className="text-xs font-medium text-red-600">KG</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-[11px] font-extrabold uppercase">Net Output</span>
                <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div className="text-base font-black text-emerald-950 font-mono">
                {totalNetKg.toLocaleString()} <span className="text-xs font-semibold text-emerald-700">KG</span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 shadow-sm">
              <div className="flex items-center justify-between text-indigo-700 mb-1">
                <span className="text-[11px] font-bold uppercase">Efficiency</span>
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="text-base font-extrabold text-indigo-950 font-mono">
                {overallEfficiency}%
              </div>
            </div>
          </div>

          {/* Per-Recipe Output Cards / Table */}
          <div className="space-y-4">
            {entries.map((entry, index) => {
              const planned = Number(entry.plannedProductionKg) || 0;
              const done = Number(entry.productionDoneKg) || 0;
              const gap = planned - done;
              const waste = Number(entry.wasteKg) || 0;
              const net = done - waste;

              return (
                <div
                  key={entry.id || `entry-${index}`}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Header Row for Recipe Run */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">
                        Run #{index + 1}
                      </span>
                      <RecipeQualityBadge value={entry.recipeQuality} />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500">
                        Planned Target: <strong className="text-slate-800 font-mono font-bold">{planned.toLocaleString()} KG</strong>
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="text-emerald-700 font-semibold">
                        Net Output: <strong className="text-emerald-800 font-mono font-black">{net.toLocaleString()} KG</strong>
                      </span>
                    </div>
                  </div>

                  {/* Input Grid for this Recipe */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-y md:divide-y-0 divide-slate-200 text-xs">
                    {/* Planned KG (Read-only reference from planning) */}
                    <div className="p-3 bg-slate-50/50">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Planned (KG)
                      </label>
                      <div className="h-8 px-2.5 flex items-center justify-end font-mono font-bold text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded">
                        {planned.toLocaleString()} KG
                      </div>
                    </div>

                    {/* Production Done KG (Input) */}
                    <div className="p-3 bg-blue-50/30">
                      <label className="block text-[11px] font-extrabold text-blue-700 uppercase mb-1">
                        Production Done (KG) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={entry.productionDoneKg}
                        placeholder="e.g. 3000"
                        onChange={(e) => updateEntryField(index, "productionDoneKg", e.target.value)}
                        className="w-full h-8 px-2.5 text-xs font-extrabold text-blue-900 bg-white border border-blue-300 rounded focus:ring-2 focus:ring-primary outline-none text-right shadow-sm"
                      />
                    </div>

                    {/* Gap KG (Auto-calculated: Planned - Done) */}
                    <div className="p-3 bg-slate-100/70">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Gap (KG)
                      </label>
                      <div
                        className={`h-8 px-2.5 flex items-center justify-end font-mono font-extrabold text-xs bg-white border rounded ${
                          gap <= 0 ? "text-emerald-700 border-emerald-300" : "text-amber-700 border-amber-200"
                        }`}
                      >
                        {gap.toLocaleString()} KG
                      </div>
                    </div>

                    {/* Waste KG (Input) */}
                    <div className="p-3 bg-red-50/30">
                      <label className="block text-[11px] font-extrabold text-red-700 uppercase mb-1">
                        Waste (KG)
                      </label>
                      <input
                        type="number"
                        value={entry.wasteKg}
                        placeholder="e.g. 50"
                        onChange={(e) => updateEntryField(index, "wasteKg", e.target.value)}
                        className="w-full h-8 px-2.5 text-xs font-extrabold text-red-900 bg-white border border-red-300 rounded focus:ring-2 focus:ring-red-500 outline-none text-right shadow-sm"
                      />
                    </div>

                    {/* Waste % (Auto-calculated / Editable) */}
                    <div className="p-3 bg-white">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Waste %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.wastePercent}
                        placeholder="%"
                        onChange={(e) => updateEntryField(index, "wastePercent", e.target.value)}
                        className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
                      />
                    </div>

                    {/* Net Production KG (Auto-calculated: Done - Waste) */}
                    <div className="p-3 bg-emerald-50/40">
                      <label className="block text-[11px] font-extrabold text-emerald-800 uppercase mb-1">
                        Net Production (KG)
                      </label>
                      <div className="h-8 px-2.5 flex items-center justify-end font-mono font-black text-sm text-emerald-800 bg-white border border-emerald-300 rounded shadow-sm">
                        {net.toLocaleString()} KG
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
