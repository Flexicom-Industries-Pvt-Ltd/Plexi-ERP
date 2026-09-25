"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Save,
  CheckCircle,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Layers,
  Check,
  AlertCircle,
  FlaskConical,
  Eye,
  FileSpreadsheet,
  Printer,
  SunMedium,
  Moon,
} from "lucide-react";
import { SpreadsheetTable, ColumnDef } from "./SpreadsheetTable";
import { RecipeQualityInput } from "./RecipeQualityInput";
import { RecipeQualityBadge } from "./RecipeQualityBadge";
import { PlanningPrintPreviewModal } from "./PlanningPrintPreviewModal";
import { generateTapePlantPlanningExcel } from "@/lib/tape-plant/planning-export";
import { DEFAULT_RECIPE_STRING, parseRecipeQuality } from "@/lib/tape-plant/recipe-format";

export interface MaterialRow {
  material: string;
  quantity: number | string;
  percentage: number | string;
}

export const DEFAULT_MATERIALS: MaterialRow[] = [
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

export interface RecipePlanItem {
  id: string;
  recipeQuality: string;
  tapeType: "PP" | "LPP" | string;
  denier: number | string;
  tapeWidth: number | string;
  strength: number | string;
  eloPercent: number | string;
  bobbinMarking: string;
  colour: string;
  spacerSize: string;
  requiredAsh: number | string;
  ashPercent: number | string;
  plannedQtyKg: number | string;
  omega: string;
  vistPercent: number | string;
  remarks: string;
  materials: MaterialRow[];
  isDayNight?: boolean;
  carriedOverFromShift?: string;
}

export const createEmptyRecipePlan = (index: number = 1): RecipePlanItem => {
  const parts = parseRecipeQuality(DEFAULT_RECIPE_STRING);
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recipeQuality: DEFAULT_RECIPE_STRING,
    tapeType: "LPP",
    denier: "",
    tapeWidth: "500",
    strength: "",
    eloPercent: "",
    bobbinMarking: "",
    colour: "YL (Yellow)",
    spacerSize: "",
    requiredAsh: "",
    ashPercent: "",
    plannedQtyKg: "",
    omega: "",
    vistPercent: "",
    remarks: "",
    materials: JSON.parse(JSON.stringify(DEFAULT_MATERIALS)),
    isDayNight: false,
  };
};

interface TapePlantPlanningSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
}

export function TapePlantPlanningSection({ date, shiftId, shiftName }: TapePlantPlanningSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("DRAFT");
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Multi-recipe state
  const [recipePlans, setRecipePlans] = useState<RecipePlanItem[]>([createEmptyRecipePlan(1)]);
  const [activeRecipeIndex, setActiveRecipeIndex] = useState<number>(0);
  const [masterRecipes, setMasterRecipes] = useState<any[]>([]);

  const handleExportExcel = () => {
    try {
      generateTapePlantPlanningExcel({
        date,
        shiftName,
        status,
        plans: recipePlans,
      });
      toast.success("Excel plan downloaded successfully");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel file");
    }
  };

  // Load Data Centre master recipes
  useEffect(() => {
    fetch("/api/data-centre/tape-plant-recipes?activeOnly=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setMasterRecipes(data);
      })
      .catch((err) => console.error("Error loading master recipes:", err));
  }, []);

  // Load plans for the shift
  useEffect(() => {
    if (!date || !shiftId) return;
    setLoading(true);
    fetch(`/api/production/tape-plant/planning?date=${date}&shiftId=${shiftId}&_t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.plans) && data.plans.length > 0) {
          const loaded = data.plans.map((p: any) => ({
            id: p.id,
            recipeQuality: p.recipeQuality || DEFAULT_RECIPE_STRING,
            tapeType: p.tapeType || "LPP",
            denier: p.denier ?? "",
            tapeWidth: p.tapeWidth ?? "500",
            strength: p.strength ?? "",
            eloPercent: p.eloPercent ?? "",
            bobbinMarking: p.bobbinMarking || "",
            colour: p.colour || "YL (Yellow)",
            spacerSize: p.spacerSize || "",
            requiredAsh: p.requiredAsh ?? "",
            ashPercent: p.ashPercent ?? "",
            plannedQtyKg: p.plannedQtyKg ?? "",
            omega: p.omega || "",
            vistPercent: p.vistPercent ?? "",
            remarks: p.remarks || "",
            materials: Array.isArray(p.materials) && p.materials.length > 0 ? p.materials : DEFAULT_MATERIALS,
            isDayNight: Boolean(p.isDayNight),
            carriedOverFromShift: p.carriedOverFromShift || undefined,
          }));
          setRecipePlans(loaded);
          setStatus(data.plans[0]?.status || "DRAFT");
          setActiveRecipeIndex(0);
        } else if (data && data.recipeQuality) {
          // Backward compatibility with single record
          const single: RecipePlanItem = {
            id: data.id || `temp-${Date.now()}`,
            recipeQuality: data.recipeQuality || DEFAULT_RECIPE_STRING,
            tapeType: data.tapeType || "LPP",
            denier: data.denier ?? "",
            tapeWidth: data.tapeWidth ?? "500",
            strength: data.strength ?? "",
            eloPercent: data.eloPercent ?? "",
            bobbinMarking: data.bobbinMarking || "",
            colour: data.colour || "YL (Yellow)",
            spacerSize: data.spacerSize || "",
            requiredAsh: data.requiredAsh ?? "",
            ashPercent: data.ashPercent ?? "",
            plannedQtyKg: data.plannedQtyKg ?? "",
            omega: data.omega || "",
            vistPercent: data.vistPercent ?? "",
            remarks: data.remarks || "",
            materials: Array.isArray(data.materials) && data.materials.length > 0 ? data.materials : DEFAULT_MATERIALS,
            isDayNight: Boolean(data.isDayNight),
            carriedOverFromShift: data.carriedOverFromShift || undefined,
          };
          setRecipePlans([single]);
          setStatus(data.status || "DRAFT");
          setActiveRecipeIndex(0);
        } else {
          setRecipePlans([createEmptyRecipePlan(1)]);
          setStatus("DRAFT");
          setActiveRecipeIndex(0);
        }
      })
      .catch(() => toast.error("Failed to load Tape Plant plan"))
      .finally(() => setLoading(false));
  }, [date, shiftId]);

  // Active plan helper
  const currentPlan = recipePlans[activeRecipeIndex] || recipePlans[0] || createEmptyRecipePlan(1);

  const updateCurrentPlan = (updates: Partial<RecipePlanItem>) => {
    setRecipePlans((prev) =>
      prev.map((plan, idx) => (idx === activeRecipeIndex ? { ...plan, ...updates } : plan))
    );
  };

  // Auto-fetch and apply master recipe
  const applyRecipeMaster = (recipe: any) => {
    const plannedQty = currentPlan.plannedQtyKg
      ? Number(currentPlan.plannedQtyKg)
      : recipe.defaultQtyKg || 2500;

    const computeQty = (percent: number | null | undefined) => {
      if (!percent || !plannedQty) return "";
      return Number(((plannedQty * Number(percent)) / 100).toFixed(2));
    };

    const updatedMaterials: MaterialRow[] = [
      { material: "PP", percentage: recipe.ppPercent ?? "", quantity: computeQty(recipe.ppPercent) },
      { material: "CC", percentage: recipe.ccPercent ?? "", quantity: computeQty(recipe.ccPercent) },
      { material: "MB", percentage: recipe.mbPercent ?? "", quantity: computeQty(recipe.mbPercent) },
      { material: "RP1", percentage: recipe.rp1Percent ?? "", quantity: computeQty(recipe.rp1Percent) },
      { material: "RP2", percentage: recipe.rp2Percent ?? "", quantity: computeQty(recipe.rp2Percent) },
      { material: "HD RP", percentage: recipe.hdrpPercent ?? "", quantity: computeQty(recipe.hdrpPercent) },
      { material: "TPT", percentage: recipe.tptPercent ?? "", quantity: computeQty(recipe.tptPercent) },
    ];

    updateCurrentPlan({
      recipeQuality: recipe.code,
      tapeType: recipe.tapeType || "PP",
      denier: recipe.denier ?? "",
      tapeWidth: recipe.tapeWidth ?? "500",
      strength: recipe.strength ?? "",
      eloPercent:
        recipe.eloPercent !== null && recipe.eloPercent !== undefined
          ? typeof recipe.eloPercent === "number" && recipe.eloPercent < 1
            ? (recipe.eloPercent * 100).toFixed(0)
            : recipe.eloPercent
          : "",
      bobbinMarking: recipe.bobbinMarking || "",
      colour: recipe.colour || "",
      spacerSize: recipe.spacerSize ? String(recipe.spacerSize) : "",
      requiredAsh: recipe.requiredAsh ?? "",
      ashPercent: recipe.ashPercent ?? "",
      plannedQtyKg: plannedQty,
      vistPercent: recipe.vistamaxPercent ?? "",
      remarks: recipe.remarks || "",
      materials: updatedMaterials,
    });

    toast.success(`Auto-fetched parameters & formulation for ${recipe.code}`);
  };

  const handleRecipeCodeChange = (newCode: string) => {
    updateCurrentPlan({ recipeQuality: newCode });
    const match = masterRecipes.find(
      (r) => r.code?.toUpperCase() === newCode?.trim().toUpperCase()
    );
    if (match) {
      applyRecipeMaster(match);
    }
  };

  const handlePlannedQtyChange = (newQtyStr: string) => {
    const qty = Number(newQtyStr) || 0;
    const updatedMaterials = currentPlan.materials.map((m) => {
      const pct = Number(m.percentage);
      return {
        ...m,
        quantity: pct && qty > 0 ? Number(((qty * pct) / 100).toFixed(2)) : m.quantity,
      };
    });
    updateCurrentPlan({
      plannedQtyKg: newQtyStr,
      materials: updatedMaterials,
    });
  };

  const handleMaterialsChange = (newMaterials: MaterialRow[]) => {
    const plannedQty = Number(currentPlan.plannedQtyKg) || 0;
    const processed = newMaterials.map((m) => {
      const pct = m.percentage !== "" && m.percentage !== null && m.percentage !== undefined ? Number(m.percentage) : null;
      const qty = m.quantity !== "" && m.quantity !== null && m.quantity !== undefined ? Number(m.quantity) : null;

      let finalQty = m.quantity;
      if (pct !== null && plannedQty > 0 && (qty === null || qty === 0)) {
        finalQty = Number(((plannedQty * pct) / 100).toFixed(2));
      }
      return {
        ...m,
        quantity: finalQty,
      };
    });
    updateCurrentPlan({ materials: processed });
  };

  const handleAddRecipe = () => {
    const nextNum = recipePlans.length + 1;
    const newPlan = createEmptyRecipePlan(nextNum);
    setRecipePlans((prev) => [...prev, newPlan]);
    setActiveRecipeIndex(recipePlans.length);
    toast.info(`Added Recipe #${nextNum} to shift plan`);
  };

  const handleDuplicateCurrentRecipe = () => {
    const duplicated: RecipePlanItem = {
      ...JSON.parse(JSON.stringify(currentPlan)),
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      materials: JSON.parse(JSON.stringify(currentPlan.materials)),
    };
    setRecipePlans((prev) => [...prev, duplicated]);
    setActiveRecipeIndex(recipePlans.length);
    toast.success(`Duplicated recipe plan specs as Run #${recipePlans.length + 1}`);
  };

  const handleRemoveRecipe = (indexToRemove: number) => {
    if (recipePlans.length <= 1) {
      toast.error("A shift plan must contain at least 1 recipe.");
      return;
    }
    const removedPlan = recipePlans[indexToRemove];
    setRecipePlans((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setActiveRecipeIndex((prev) => (prev >= indexToRemove && prev > 0 ? prev - 1 : 0));
    toast.info(`Removed recipe run from shift`);
  };

  const handleSave = async (submitStatus: "DRAFT" | "SUBMITTED") => {
    // Validate each recipe
    for (let i = 0; i < recipePlans.length; i++) {
      const p = recipePlans[i];
      if (!p.recipeQuality || !p.recipeQuality.trim()) {
        toast.error(`Recipe #${i + 1} is missing a Recipe / Quality ID`);
        setActiveRecipeIndex(i);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        date,
        shiftId,
        status: submitStatus,
        plans: recipePlans.map((p) => ({
          id: p.id,
          recipeQuality: p.recipeQuality.trim(),
          tapeType: p.tapeType,
          denier: p.denier !== "" ? Number(p.denier) : null,
          tapeWidth: p.tapeWidth !== "" ? Number(p.tapeWidth) : null,
          strength: p.strength !== "" ? Number(p.strength) : null,
          eloPercent: p.eloPercent !== "" ? Number(p.eloPercent) : null,
          bobbinMarking: p.bobbinMarking,
          colour: p.colour,
          spacerSize: p.spacerSize,
          requiredAsh: p.requiredAsh !== "" ? Number(p.requiredAsh) : null,
          ashPercent: p.ashPercent !== "" ? Number(p.ashPercent) : null,
          plannedQtyKg: p.plannedQtyKg !== "" ? Number(p.plannedQtyKg) : 0,
          omega: p.omega,
          vistPercent: p.vistPercent !== "" ? Number(p.vistPercent) : null,
          remarks: p.remarks,
          materials: p.materials,
          isDayNight: Boolean(p.isDayNight),
          status: submitStatus,
        })),
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

      const resData = await res.json();
      if (Array.isArray(resData.plans)) {
        setRecipePlans(
          resData.plans.map((p: any) => ({
            id: p.id,
            recipeQuality: p.recipeQuality || DEFAULT_RECIPE_STRING,
            tapeType: p.tapeType || "LPP",
            denier: p.denier ?? "",
            tapeWidth: p.tapeWidth ?? "500",
            strength: p.strength ?? "",
            eloPercent: p.eloPercent ?? "",
            bobbinMarking: p.bobbinMarking || "",
            colour: p.colour || "YL (Yellow)",
            spacerSize: p.spacerSize || "",
            requiredAsh: p.requiredAsh ?? "",
            ashPercent: p.ashPercent ?? "",
            plannedQtyKg: p.plannedQtyKg ?? "",
            omega: p.omega || "",
            vistPercent: p.vistPercent ?? "",
            remarks: p.remarks || "",
            materials: Array.isArray(p.materials) && p.materials.length > 0 ? p.materials : DEFAULT_MATERIALS,
            isDayNight: Boolean(p.isDayNight),
          }))
        );
      }

      setStatus(submitStatus);
      toast.success(
        submitStatus === "SUBMITTED"
          ? `Shift plan with ${recipePlans.length} recipe(s) submitted successfully`
          : `Shift plan saved as draft (${recipePlans.length} recipes)`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  // Shift Aggregates
  const totalShiftPlannedKg = recipePlans.reduce((sum, p) => sum + (Number(p.plannedQtyKg) || 0), 0);
  const totalActiveMaterialQty = currentPlan.materials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  const totalActivePercentage = currentPlan.materials.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);

  // Check if current recipe matches master catalog
  const matchingMaster = masterRecipes.find(
    (r) => r.code?.toUpperCase() === currentPlan.recipeQuality?.trim().toUpperCase()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Tape Plant Planning data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Top Header & Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-w-0">
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
              Production specifications and recipes planned for <span className="font-semibold text-slate-700">{shiftName}</span> ({date}).
            </p>
          </div>
        </div>

        {/* Aggregate Stats & Submit Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right border-r border-slate-200 pr-3">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Shift Planned</span>
            <span className="text-sm font-black font-mono text-slate-900">
              {totalShiftPlannedKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">KG</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all active:scale-95 h-8 cursor-pointer"
              title="Preview printable planning document and print"
            >
              <Eye className="h-3.5 w-3.5 text-slate-600" />
              <span>Preview & Print</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition-all active:scale-95 h-8 cursor-pointer shadow-2xs"
              title="Download full multi-recipe planning Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("DRAFT")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("SUBMITTED")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Submit Plan
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Recipe Shift Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Shift Recipe Runs ({recipePlans.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDuplicateCurrentRecipe}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
              title="Duplicate current recipe specs to a new run"
            >
              <Copy className="h-3 w-3" /> Duplicate Run
            </button>
            <button
              type="button"
              onClick={handleAddRecipe}
              className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded-lg transition-colors inline-flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Recipe to Shift
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {recipePlans.map((plan, index) => {
            const isSelected = activeRecipeIndex === index;
            return (
              <div
                key={plan.id}
                onClick={() => setActiveRecipeIndex(index)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all border shrink-0 ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected ? "bg-primary text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-mono font-bold">{plan.recipeQuality || `Recipe #${index + 1}`}</span>
                  {plan.isDayNight && (
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border ${
                      isSelected
                        ? "bg-amber-400 text-slate-950 border-amber-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}>
                      Day+Night
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                      isSelected ? "bg-white/20 text-cyan-200" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {Number(plan.plannedQtyKg) ? `${Number(plan.plannedQtyKg).toLocaleString()} KG` : "0 KG"}
                  </span>
                </div>

                {recipePlans.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRecipe(index);
                    }}
                    className={`p-1 rounded-md transition-colors ${
                      isSelected
                        ? "text-slate-400 hover:text-red-400 hover:bg-white/10"
                        : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                    }`}
                    title="Remove this recipe run"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Recipe Configuration Card */}
      <div className="space-y-6 w-full min-w-0 max-w-full">
        {/* Day + Night Multi-Shift 2-Shift Run Banner */}
        <div className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          currentPlan.isDayNight
            ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-200"
            : "bg-white border-slate-200 shadow-2xs"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              currentPlan.isDayNight
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "bg-slate-100 text-slate-500"
            }`}>
              <SunMedium className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  2-Shift Continuous Run (Day + Night)
                </span>
                {currentPlan.isDayNight && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-400">
                    24-Hour Continuous Batch
                  </span>
                )}
                {currentPlan.carriedOverFromShift && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Carried over from {currentPlan.carriedOverFromShift}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {currentPlan.carriedOverFromShift
                  ? `Continuous quality active from ${currentPlan.carriedOverFromShift}. Both Day & Night shift operators record output against this quality. You can also add more shift recipes below.`
                  : currentPlan.isDayNight
                  ? "Running across Day & Night shifts. Both shift operators will see and log against this recipe."
                  : "Enable for high-volume qualities running across both Day and Night shifts. Both shift operators will see and log against this recipe."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextVal = !currentPlan.isDayNight;
              updateCurrentPlan({ isDayNight: nextVal });
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
              currentPlan.isDayNight
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs font-black"
                : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
            }`}
          >
            {currentPlan.isDayNight ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Spanning Day + Night (Active)</span>
              </>
            ) : (
              <span>Enable Day + Night Run</span>
            )}
          </button>
        </div>

        {/* 1. Recipe / Quality ID Input & Master Quick Pick */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recipe Selection for Run #{activeRecipeIndex + 1}
              </span>
              {matchingMaster ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                  <Check className="h-3 w-3" /> Auto-Mapped from Master Data
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-[10px] font-medium">
                  Custom / Manual Entry
                </span>
              )}
            </div>

            {/* Quick Master Catalog Select */}
            {masterRecipes.length > 0 && (
              <div className="flex items-center gap-2 max-w-full">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">Pick Master Recipe:</span>
                <select
                  value={matchingMaster ? matchingMaster.code : ""}
                  onChange={(e) => {
                    const selected = masterRecipes.find((r) => r.code === e.target.value);
                    if (selected) applyRecipeMaster(selected);
                  }}
                  className="h-8 px-2.5 text-xs font-mono font-bold text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer max-w-[240px] sm:max-w-xs md:max-w-sm truncate"
                >
                  <option value="">— Select from {masterRecipes.length} Master Recipes —</option>
                  {masterRecipes.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code} ({r.tapeType} • {r.colour || ""} • {r.bobbinMarking || ""})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <RecipeQualityInput
            value={currentPlan.recipeQuality}
            onChange={handleRecipeCodeChange}
            masterPresets={masterRecipes.map((r) => ({
              code: r.code,
              label: `${r.tapeType} • ${r.colour || ""} • ${r.bobbinMarking || ""}`,
            }))}
            label={`Recipe Run #${activeRecipeIndex + 1} Quality ID (Standard Format)`}
            required
            onSyncSpecifications={({ tapeType: synType, colour: synColour, tapeWidth: synWidth }) => {
              updateCurrentPlan({
                ...(synType === "PP" || synType === "LPP" ? { tapeType: synType } : {}),
                ...(synColour ? { colour: synColour } : {}),
                ...(synWidth ? { tapeWidth: synWidth } : {}),
              });
              toast.success(`Synchronized specifications for Recipe Run #${activeRecipeIndex + 1}`);
            }}
          />
        </div>

        {/* 2. Shift Specifications & Parameters Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Run #{activeRecipeIndex + 1} Specifications & Parameters
              </h3>
              <RecipeQualityBadge value={currentPlan.recipeQuality} />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">
              Planned Qty: <strong className="text-slate-800 font-mono">{Number(currentPlan.plannedQtyKg).toLocaleString() || 0} KG</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 divide-x divide-y divide-slate-200 border-b border-slate-200 text-xs min-w-0">
            {/* PP / LPP */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">PP / LPP</label>
              <select
                value={currentPlan.tapeType}
                onChange={(e) => updateCurrentPlan({ tapeType: e.target.value })}
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
                value={currentPlan.denier}
                placeholder="e.g. 800"
                onChange={(e) => updateCurrentPlan({ denier: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
              />
            </div>

            {/* Tape Width */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tape Width (mm)</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.tapeWidth}
                placeholder="e.g. 2.5"
                onChange={(e) => updateCurrentPlan({ tapeWidth: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
              />
            </div>

            {/* Strength */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Strength (gpd)</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.strength}
                placeholder="e.g. 4.8"
                onChange={(e) => updateCurrentPlan({ strength: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
              />
            </div>

            {/* ELO % */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">ELO %</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.eloPercent}
                placeholder="e.g. 22.5"
                onChange={(e) => updateCurrentPlan({ eloPercent: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
              />
            </div>

            {/* Bobbin Marking */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bobbin Marking</label>
              <input
                type="text"
                value={currentPlan.bobbinMarking}
                placeholder="e.g. Red Strip"
                onChange={(e) => updateCurrentPlan({ bobbinMarking: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Colour */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Colour</label>
              <input
                type="text"
                value={currentPlan.colour}
                placeholder="e.g. Yellow, Natural"
                onChange={(e) => updateCurrentPlan({ colour: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Spacer Size */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Spacer Size</label>
              <input
                type="text"
                value={currentPlan.spacerSize}
                placeholder="e.g. 3.0 mm"
                onChange={(e) => updateCurrentPlan({ spacerSize: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Required Ash */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Required Ash</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.requiredAsh}
                placeholder="e.g. 1.2"
                onChange={(e) => updateCurrentPlan({ requiredAsh: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
              />
            </div>

            {/* Ash % */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ash %</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.ashPercent}
                placeholder="e.g. 1.15"
                onChange={(e) => updateCurrentPlan({ ashPercent: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
              />
            </div>

            {/* Planned QTY (KG) */}
            <div className="p-3 bg-blue-50/40">
              <label className="block text-[11px] font-extrabold text-blue-700 uppercase mb-1">
                Planned Qty (KG) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={currentPlan.plannedQtyKg}
                placeholder="e.g. 5000"
                onChange={(e) => handlePlannedQtyChange(e.target.value)}
                className="w-full h-8 px-2.5 text-xs font-extrabold text-blue-900 bg-white border border-blue-200 rounded focus:ring-2 focus:ring-primary outline-none text-right shadow-xs"
              />
            </div>

            {/* Omega */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Omega</label>
              <input
                type="text"
                value={currentPlan.omega}
                placeholder="Omega code"
                onChange={(e) => updateCurrentPlan({ omega: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* Vist % */}
            <div className="p-3 bg-white">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Vist... %</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.vistPercent}
                placeholder="%"
                onChange={(e) => updateCurrentPlan({ vistPercent: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-primary outline-none text-right"
              />
            </div>
          </div>

          {/* Remarks Row */}
          <div className="p-3 bg-slate-50/50">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Remarks</label>
            <input
              type="text"
              value={currentPlan.remarks}
              placeholder="Shift notes or special instructions for this recipe run"
              onChange={(e) => updateCurrentPlan({ remarks: e.target.value })}
              className="w-full h-8 px-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* 3. Material Composition Formula Spreadsheet */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Material Composition (Formula for Run #{activeRecipeIndex + 1})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify raw material blend percentages and planned kilograms for this specific recipe run.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-600">
                Total Qty: <strong className="font-mono text-slate-900">{totalActiveMaterialQty.toLocaleString()} KG</strong>
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded ${
                  totalActivePercentage === 100
                    ? "bg-emerald-50 text-emerald-700 font-bold"
                    : totalActivePercentage > 100
                    ? "bg-red-50 text-red-700 font-bold"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Total %: {totalActivePercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <SpreadsheetTable<MaterialRow>
            data={currentPlan.materials}
            columns={materialColumns}
            onChange={handleMaterialsChange}
            allowAddRow={true}
            allowDeleteRow={true}
            onAddRow={() =>
              updateCurrentPlan({
                materials: [...currentPlan.materials, { material: "", quantity: "", percentage: "" }],
              })
            }
            onDeleteRow={(idx) =>
              updateCurrentPlan({
                materials: currentPlan.materials.filter((_, i) => i !== idx),
              })
            }
            title="Material Formula"
          />
        </div>
      </div>

      {/* Interactive Print & Preview Document Modal */}
      <PlanningPrintPreviewModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        date={date}
        shiftName={shiftName}
        status={status}
        plans={recipePlans}
      />
    </div>
  );
}
