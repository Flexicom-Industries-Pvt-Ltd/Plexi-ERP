"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, CheckCircle, Loader2, PackageCheck, ShieldCheck, Plus, Sparkles } from "lucide-react";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";

interface QualityCheckRow {
  time: string;
  colour: string;
  denier: number | string;
  width: number | string;
  strength: number | string;
  eloPercent: number | string;
  spacerWidth: number | string;
  remarks: string;
}

const DEFAULT_QC_SCHEDULE: QualityCheckRow[] = [
  { time: "12:00 PM", colour: "", denier: "", width: "", strength: "", eloPercent: "", spacerWidth: "", remarks: "" },
  { time: "02:00 PM", colour: "", denier: "", width: "", strength: "", eloPercent: "", spacerWidth: "", remarks: "" },
  { time: "04:00 PM", colour: "", denier: "", width: "", strength: "", eloPercent: "", spacerWidth: "", remarks: "" },
  { time: "06:00 PM", colour: "", denier: "", width: "", strength: "", eloPercent: "", spacerWidth: "", remarks: "" },
  { time: "08:00 PM", colour: "", denier: "", width: "", strength: "", eloPercent: "", spacerWidth: "", remarks: "" },
];

const qcColumns: ColumnDef<QualityCheckRow>[] = [
  { key: "time", label: "Check Time", width: "110px", minWidth: 100, sticky: true, placeholder: "HH:MM AM/PM" },
  { key: "colour", label: "Colour", width: "130px", minWidth: 120, placeholder: "Visual Check" },
  { key: "denier", label: "Denier", width: "90px", minWidth: 85, type: "number", align: "right", placeholder: "D" },
  { key: "width", label: "Width (mm)", width: "100px", minWidth: 95, type: "number", align: "right", placeholder: "mm" },
  { key: "strength", label: "Strength (gpd)", width: "110px", minWidth: 100, type: "number", align: "right", placeholder: "gpd" },
  { key: "eloPercent", label: "ELO %", width: "90px", minWidth: 85, type: "number", align: "right", placeholder: "%" },
  { key: "spacerWidth", label: "Spacer Width", width: "110px", minWidth: 105, type: "number", align: "right", placeholder: "mm" },
  { key: "remarks", label: "QC Remarks", width: "180px", minWidth: 160, placeholder: "Pass / Observation" },
];

interface PostProductionSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function PostProductionSection({ date, shiftId, shiftName }: PostProductionSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [recipeQuality, setRecipeQuality] = useState("");
  const [plannedProductionKg, setPlannedProductionKg] = useState<number | string>(0);
  const [productionDoneKg, setProductionDoneKg] = useState<number | string>("");
  const [wasteKg, setWasteKg] = useState<number | string>("");
  const [wastePercent, setWastePercent] = useState<number | string>("");
  const [status, setStatus] = useState("DRAFT");
  const [qualityChecks, setQualityChecks] = useState<QualityCheckRow[]>(DEFAULT_QC_SCHEDULE);

  useEffect(() => {
    if (!date || !shiftId) return;
    setLoading(true);
    fetch(`/api/production/tape-plant/post-production?date=${date}&shiftId=${shiftId}`)
      .then((r) => (r.ok ? r.json() : { postProduction: null, plan: null }))
      .then((data) => {
        const p = data.postProduction;
        const plan = data.plan;

        if (p) {
          setRecipeQuality(p.recipeQuality || plan?.recipeQuality || "S1");
          setPlannedProductionKg(p.plannedProductionKg || plan?.plannedProductionKg || 0);
          setProductionDoneKg(p.productionDoneKg ?? "");
          setWasteKg(p.wasteKg ?? "");
          setWastePercent(p.wastePercent ?? "");
          setStatus(p.status || "DRAFT");
          if (Array.isArray(p.qualityChecks) && p.qualityChecks.length > 0) {
            setQualityChecks(p.qualityChecks);
          } else {
            setQualityChecks(DEFAULT_QC_SCHEDULE);
          }
        } else {
          setRecipeQuality(plan?.recipeQuality || "S1");
          setPlannedProductionKg(plan?.plannedProductionKg || 0);
          setProductionDoneKg("");
          setWasteKg("");
          setWastePercent("");
          setStatus("DRAFT");
          setQualityChecks(DEFAULT_QC_SCHEDULE);
        }
      })
      .catch(() => toast.error("Failed to load post-production data"))
      .finally(() => setLoading(false));
  }, [date, shiftId]);

  // Exact formulas confirmed in PRD:
  // Gap = Planned - Done
  // Net Production = Done - Waste
  const planned = Number(plannedProductionKg) || 0;
  const done = Number(productionDoneKg) || 0;
  const gap = planned - done;
  const waste = Number(wasteKg) || 0;
  const netProduction = done - waste;

  const handleSave = async (submitStatus: "DRAFT" | "SUBMITTED") => {
    setSaving(true);
    try {
      const payload = {
        date,
        shiftId,
        recipeQuality: recipeQuality.trim(),
        plannedProductionKg: planned,
        productionDoneKg: done,
        gapKg: gap,
        wasteKg: waste,
        wastePercent: wastePercent !== "" ? Number(wastePercent) : null,
        netProductionKg: netProduction,
        qualityChecks,
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
          ? "Post-production & QC record submitted successfully"
          : "Post-production saved as draft"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to save post-production");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQcRow = () => {
    setQualityChecks([
      ...qualityChecks,
      {
        time: "New Time",
        colour: "",
        denier: "",
        width: "",
        strength: "",
        eloPercent: "",
        spacerWidth: "",
        remarks: "",
      },
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Post Production Data...</span>
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
              <h2 className="text-base font-bold text-slate-900">5. Post Production Entry & QC</h2>
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
              Compare planned vs actual production output, record shift waste, and log 2-hourly QC checks for {shiftName} ({date}).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("DRAFT")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("SUBMITTED")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Submit Output
          </button>
        </div>
      </div>

      {/* Production Output Spreadsheet Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Shift Production Comparison (Planned vs Actual)
          </h3>
          <span className="text-[11px] font-semibold text-slate-500">
            Net Production = Production Done − Waste
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 divide-x divide-y divide-slate-200 border-b border-slate-200 text-xs">
          {/* Recipe / Quality */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Recipe / Quality</label>
            <input
              type="text"
              value={recipeQuality}
              placeholder="e.g. S1"
              onChange={(e) => setRecipeQuality(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Planned Production KG */}
          <div className="p-3 bg-slate-50/50">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Planned (KG)</label>
            <input
              type="number"
              value={plannedProductionKg}
              placeholder="0.0"
              onChange={(e) => setPlannedProductionKg(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-primary outline-none text-right"
            />
          </div>

          {/* Production Done KG */}
          <div className="p-3 bg-blue-50/30">
            <label className="block text-[11px] font-extrabold text-blue-700 uppercase mb-1">
              Production Done (KG) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={productionDoneKg}
              placeholder="e.g. 4800"
              onChange={(e) => setProductionDoneKg(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-extrabold text-blue-900 bg-white border border-blue-200 rounded focus:ring-2 focus:ring-primary outline-none text-right shadow-sm"
            />
          </div>

          {/* Gap KG (Planned - Done) */}
          <div className="p-3 bg-slate-100/70">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Gap (KG)</label>
            <div className="h-8 px-2.5 flex items-center justify-end font-mono font-extrabold text-xs text-amber-700 bg-white border border-slate-200 rounded">
              {gap.toLocaleString()} KG
            </div>
          </div>

          {/* Waste KG */}
          <div className="p-3 bg-red-50/30">
            <label className="block text-[11px] font-extrabold text-red-700 uppercase mb-1">Waste (KG)</label>
            <input
              type="number"
              value={wasteKg}
              placeholder="e.g. 100"
              onChange={(e) => setWasteKg(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-extrabold text-red-900 bg-white border border-red-200 rounded focus:ring-2 focus:ring-red-500 outline-none text-right shadow-sm"
            />
          </div>

          {/* Waste % */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Waste %</label>
            <input
              type="number"
              step="0.01"
              value={wastePercent}
              placeholder="%"
              onChange={(e) => setWastePercent(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
            />
          </div>

          {/* Net Production KG (Done - Waste) */}
          <div className="p-3 bg-emerald-50/40">
            <label className="block text-[11px] font-extrabold text-emerald-800 uppercase mb-1">
              Net Production (KG)
            </label>
            <div className="h-8 px-2.5 flex items-center justify-end font-mono font-black text-sm text-emerald-800 bg-white border border-emerald-300 rounded shadow-sm">
              {netProduction.toLocaleString()} KG
            </div>
          </div>
        </div>
      </div>

      {/* 2-Hourly Quality Check Table */}
      <SpreadsheetTable<QualityCheckRow>
        title="Periodic Quality Inspection Schedule (~Every 2 Hours)"
        subtitle="Operator physical quality verification records: 12 PM, 2 PM, 4 PM, 6 PM, 8 PM."
        columns={qcColumns}
        data={qualityChecks}
        onChange={setQualityChecks}
        allowAddRow={true}
        onAddRow={handleAddQcRow}
        allowDeleteRow={true}
        onDeleteRow={(idx) => setQualityChecks(qualityChecks.filter((_, i) => i !== idx))}
      />
    </div>
  );
}
