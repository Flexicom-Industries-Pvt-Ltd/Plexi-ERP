"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, CheckCircle, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";

interface MaterialRow {
  material: string;
  quantity: number | string;
  percentage: number | string;
}

const DEFAULT_MATERIALS: MaterialRow[] = [
  { material: "PP", quantity: "", percentage: "" },
  { material: "CC", quantity: "", percentage: "" },
  { material: "MB", quantity: "", percentage: "" },
  { material: "RP1", quantity: "", percentage: "" },
  { material: "RP2", quantity: "", percentage: "" },
  { material: "HD RP", quantity: "", percentage: "" },
  { material: "TPT", quantity: "", percentage: "" },
];

const materialColumns: ColumnDef<MaterialRow>[] = [
  { key: "material", label: "Raw Material", width: "180px", minWidth: 160, sticky: true },
  { key: "quantity", label: "Quantity (KG)", width: "160px", minWidth: 140, type: "number", align: "right", placeholder: "0.0" },
  { key: "percentage", label: "Composition (%)", width: "160px", minWidth: 140, type: "number", align: "right", placeholder: "0.0%" },
];

interface TapePlantPlanningSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function TapePlantPlanningSection({ date, shiftId, shiftName }: TapePlantPlanningSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [recipeQuality, setRecipeQuality] = useState("S1");
  const [tapeType, setTapeType] = useState("PP");
  const [denier, setDenier] = useState<number | string>("");
  const [tapeWidth, setTapeWidth] = useState<number | string>("");
  const [strength, setStrength] = useState<number | string>("");
  const [eloPercent, setEloPercent] = useState<number | string>("");
  const [bobbinMarking, setBobbinMarking] = useState("");
  const [colour, setColour] = useState("");
  const [spacerSize, setSpacerSize] = useState("");
  const [requiredAsh, setRequiredAsh] = useState<number | string>("");
  const [ashPercent, setAshPercent] = useState<number | string>("");
  const [plannedQtyKg, setPlannedQtyKg] = useState<number | string>("");
  const [omega, setOmega] = useState("");
  const [vistPercent, setVistPercent] = useState<number | string>("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [materials, setMaterials] = useState<MaterialRow[]>(DEFAULT_MATERIALS);

  useEffect(() => {
    if (!date || !shiftId) return;
    setLoading(true);
    fetch(`/api/production/tape-plant/planning?date=${date}&shiftId=${shiftId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setRecipeQuality(data.recipeQuality || "S1");
          setTapeType(data.tapeType || "PP");
          setDenier(data.denier ?? "");
          setTapeWidth(data.tapeWidth ?? "");
          setStrength(data.strength ?? "");
          setEloPercent(data.eloPercent ?? "");
          setBobbinMarking(data.bobbinMarking || "");
          setColour(data.colour || "");
          setSpacerSize(data.spacerSize || "");
          setRequiredAsh(data.requiredAsh ?? "");
          setAshPercent(data.ashPercent ?? "");
          setPlannedQtyKg(data.plannedQtyKg ?? "");
          setOmega(data.omega || "");
          setVistPercent(data.vistPercent ?? "");
          setRemarks(data.remarks || "");
          setStatus(data.status || "DRAFT");
          if (Array.isArray(data.materials) && data.materials.length > 0) {
            setMaterials(data.materials);
          } else {
            setMaterials(DEFAULT_MATERIALS);
          }
        } else {
          // Reset to clean defaults
          setRecipeQuality("S1");
          setTapeType("PP");
          setDenier("");
          setTapeWidth("");
          setStrength("");
          setEloPercent("");
          setBobbinMarking("");
          setColour("");
          setSpacerSize("");
          setRequiredAsh("");
          setAshPercent("");
          setPlannedQtyKg("");
          setOmega("");
          setVistPercent("");
          setRemarks("");
          setStatus("DRAFT");
          setMaterials(DEFAULT_MATERIALS);
        }
      })
      .catch(() => toast.error("Failed to load Tape Plant plan"))
      .finally(() => setLoading(false));
  }, [date, shiftId]);

  const handleSave = async (submitStatus: "DRAFT" | "SUBMITTED") => {
    if (!recipeQuality.trim()) {
      toast.error("Recipe / Quality code is required (e.g. S1, HC)");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        shiftId,
        recipeQuality: recipeQuality.trim(),
        tapeType,
        denier: denier !== "" ? Number(denier) : null,
        tapeWidth: tapeWidth !== "" ? Number(tapeWidth) : null,
        strength: strength !== "" ? Number(strength) : null,
        eloPercent: eloPercent !== "" ? Number(eloPercent) : null,
        bobbinMarking,
        colour,
        spacerSize,
        requiredAsh: requiredAsh !== "" ? Number(requiredAsh) : null,
        ashPercent: ashPercent !== "" ? Number(ashPercent) : null,
        plannedQtyKg: plannedQtyKg !== "" ? Number(plannedQtyKg) : 0,
        omega,
        vistPercent: vistPercent !== "" ? Number(vistPercent) : null,
        remarks,
        materials,
        status: submitStatus,
      };

      const res = await fetch("/api/production/tape-plant/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save plan");
      }

      setStatus(submitStatus);
      toast.success(submitStatus === "SUBMITTED" ? "Tape Plant plan submitted successfully" : "Plan saved as draft");
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const totalMaterialQty = materials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  const totalPercentage = materials.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Tape Plant Planning data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">1. Tape Plant Planning</h2>
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
              Target production specifications and material recipe for {shiftName} ({date}).
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
            Submit Plan
          </button>
        </div>
      </div>

      {/* Basic Planning Specifications Table / Spreadsheet View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Shift Specifications & Quality Parameters
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 divide-x divide-y divide-slate-200 border-b border-slate-200 text-xs">
          {/* Recipe / Quality */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Recipe / Quality <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={recipeQuality}
              placeholder="e.g. S1, HC"
              onChange={(e) => setRecipeQuality(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* PP / LPP */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">PP / LPP</label>
            <select
              value={tapeType}
              onChange={(e) => setTapeType(e.target.value)}
              className="w-full h-8 px-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="PP">PP</option>
              <option value="LPP">LPP</option>
            </select>
          </div>

          {/* Denier */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Denier</label>
            <input
              type="number"
              value={denier}
              placeholder="e.g. 800"
              onChange={(e) => setDenier(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
            />
          </div>

          {/* Tape Width */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tape Width (mm)</label>
            <input
              type="number"
              step="0.01"
              value={tapeWidth}
              placeholder="e.g. 2.5"
              onChange={(e) => setTapeWidth(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
            />
          </div>

          {/* Strength */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Strength (gpd)</label>
            <input
              type="number"
              step="0.01"
              value={strength}
              placeholder="e.g. 4.8"
              onChange={(e) => setStrength(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
            />
          </div>

          {/* ELO % */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ELO %</label>
            <input
              type="number"
              step="0.1"
              value={eloPercent}
              placeholder="e.g. 22.5"
              onChange={(e) => setEloPercent(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
            />
          </div>

          {/* Bobbin Marking */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bobbin Marking</label>
            <input
              type="text"
              value={bobbinMarking}
              placeholder="e.g. Red Strip"
              onChange={(e) => setBobbinMarking(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Colour */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Colour</label>
            <input
              type="text"
              value={colour}
              placeholder="e.g. Milky White"
              onChange={(e) => setColour(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Spacer Size */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Spacer Size</label>
            <input
              type="text"
              value={spacerSize}
              placeholder="e.g. 3.0 mm"
              onChange={(e) => setSpacerSize(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Required Ash */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Required Ash</label>
            <input
              type="number"
              step="0.01"
              value={requiredAsh}
              placeholder="e.g. 1.2"
              onChange={(e) => setRequiredAsh(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
            />
          </div>

          {/* Ash % */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ash %</label>
            <input
              type="number"
              step="0.01"
              value={ashPercent}
              placeholder="e.g. 1.15"
              onChange={(e) => setAshPercent(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
            />
          </div>

          {/* Planned Quantity (KG) */}
          <div className="p-3 bg-blue-50/40">
            <label className="block text-[11px] font-extrabold text-blue-700 uppercase mb-1">
              Planned Qty (KG)
            </label>
            <input
              type="number"
              value={plannedQtyKg}
              placeholder="e.g. 5000"
              onChange={(e) => setPlannedQtyKg(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-extrabold text-blue-900 bg-white border border-blue-200 rounded focus:ring-2 focus:ring-primary outline-none text-right shadow-sm"
            />
          </div>

          {/* Omega */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Omega</label>
            <input
              type="text"
              value={omega}
              placeholder="Omega code"
              onChange={(e) => setOmega(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          {/* Vist % */}
          <div className="p-3 bg-white">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Vist... %</label>
            <input
              type="number"
              step="0.1"
              value={vistPercent}
              placeholder="%"
              onChange={(e) => setVistPercent(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
            />
          </div>

          {/* Remarks */}
          <div className="p-3 bg-white md:col-span-2 lg:col-span-4">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Remarks</label>
            <input
              type="text"
              value={remarks}
              placeholder="Shift notes or special instructions"
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full h-8 px-2.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </div>

      {/* Material Composition Spreadsheet Table */}
      <SpreadsheetTable<MaterialRow>
        title="Material Composition (Recipe Formula)"
        subtitle="Specify exact raw material requirements and blend percentages for this shift."
        columns={materialColumns}
        data={materials}
        onChange={setMaterials}
        allowAddRow={true}
        onAddRow={() => setMaterials([...materials, { material: "New Material", quantity: "", percentage: "" }])}
        allowDeleteRow={true}
        onDeleteRow={(idx) => setMaterials(materials.filter((_, i) => i !== idx))}
        actions={
          <div className="flex items-center gap-4 text-xs font-bold text-slate-700 mr-2">
            <span>
              Total Qty: <strong className="text-primary font-mono">{totalMaterialQty.toLocaleString()} KG</strong>
            </span>
            <span>
              Total %: <strong className="text-blue-600 font-mono">{totalPercentage.toFixed(1)}%</strong>
            </span>
          </div>
        }
      />
    </div>
  );
}
