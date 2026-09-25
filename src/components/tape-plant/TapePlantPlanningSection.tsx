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
  const totalShiftPlannedKg = recipePlans
    .filter((p) => !p.isDayNight)
    .reduce((sum, p) => sum + (Number(p.plannedQtyKg) || 0), 0);
  const totalDayNightPlannedKg = recipePlans
    .filter((p) => p.isDayNight)
    .reduce((sum, p) => sum + (Number(p.plannedQtyKg) || 0), 0);
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
    <div className="space-y-4 w-full min-w-0 max-w-full">
      {/* Top Header & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-2xs min-w-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Tape Plant Planning</h2>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  status === "SUBMITTED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
              <span className="font-sans font-semibold text-slate-700">{shiftName}</span>
              <span className="text-slate-300">•</span>
              <span>{date}</span>
            </div>
          </div>
        </div>

        {/* Aggregate Stats & Submit Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 border-r border-slate-200 pr-3">
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Shift Planned</span>
              <span className="text-sm font-bold font-mono text-slate-900">
                {totalShiftPlannedKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">KG</span>
              </span>
            </div>
            {totalDayNightPlannedKg > 0 && (
              <div className="flex flex-col text-right pl-3 border-l border-slate-200">
                <span className="text-[10px] uppercase font-bold text-amber-600 flex items-center justify-end gap-1 tracking-wider">
                  <SunMedium className="h-3 w-3" /> Day+Night
                </span>
                <span className="text-sm font-bold font-mono text-amber-700">
                  {totalDayNightPlannedKg.toLocaleString()} <span className="text-xs font-normal text-amber-600/70">KG</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all active:scale-95 h-8 cursor-pointer"
              title="Preview printable planning document and print"
            >
              <Eye className="h-3.5 w-3.5 text-slate-500" />
              <span>Preview & Print</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all active:scale-95 h-8 cursor-pointer"
              title="Download full multi-recipe planning Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("DRAFT")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-slate-500" />}
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("SUBMITTED")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 disabled:opacity-50 h-8 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Submit Plan
            </button>
          </div>
        </div>
      </div>

      {/* Qualities Vertical List & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Qualities ({recipePlans.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDuplicateCurrentRecipe}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
              title="Duplicate current quality specs to a new entry"
            >
              <Copy className="h-3 w-3" /> Duplicate Quality
            </button>
            <button
              type="button"
              onClick={handleAddRecipe}
              className="text-[11px] font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Quality
            </button>
          </div>
        </div>

        {/* Vertical List of Qualities (Down by Down) */}
        <div className="flex flex-col gap-1.5">
          {recipePlans.map((plan, index) => {
            const isSelected = activeRecipeIndex === index;
            return (
              <div
                key={plan.id}
                onClick={() => setActiveRecipeIndex(index)}
                className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-mono font-bold text-xs sm:text-sm tracking-tight truncate">
                    {plan.recipeQuality || `Quality #${index + 1}`}
                  </span>
                  {plan.isDayNight && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                        isSelected
                          ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      Day+Night
                    </span>
                  )}
                  {plan.carriedOverFromShift && (
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.2 rounded border shrink-0 ${
                        isSelected
                          ? "bg-white/10 text-slate-300 border-white/20"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      From {plan.carriedOverFromShift}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                      isSelected ? "text-slate-100" : "text-slate-700"
                    }`}
                  >
                    {Number(plan.plannedQtyKg) ? `${Number(plan.plannedQtyKg).toLocaleString()} KG` : "0 KG"}
                  </span>

                  {recipePlans.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRecipe(index);
                      }}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isSelected
                          ? "text-slate-400 hover:text-red-300 hover:bg-white/10"
                          : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                      }`}
                      title="Remove this quality"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Recipe Configuration Card */}
      <div className="space-y-4 w-full min-w-0 max-w-full">
        {/* Day + Night 2-Shift Run Minimalist Strip */}
        <div className={`px-3.5 py-2 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-2.5 ${
          currentPlan.isDayNight
            ? "bg-amber-50/60 border-amber-200"
            : "bg-white border-slate-200"
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <SunMedium className={`h-4 w-4 shrink-0 ${currentPlan.isDayNight ? "text-amber-600" : "text-slate-400"}`} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">
                2-Shift Continuous Run (Day + Night)
              </span>
              {currentPlan.isDayNight && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  24h Continuous
                </span>
              )}
              {currentPlan.carriedOverFromShift && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  From {currentPlan.carriedOverFromShift}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextVal = !currentPlan.isDayNight;
              updateCurrentPlan({ isDayNight: nextVal });
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border ${
              currentPlan.isDayNight
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-500 font-bold shadow-2xs"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            {currentPlan.isDayNight ? (
              <>
                <Check className="h-3 w-3" />
                <span>Active Across Shifts</span>
              </>
            ) : (
              <span>Enable Day + Night</span>
            )}
          </button>
        </div>

        {/* 1. Recipe / Quality ID Selection & Master Quick Pick */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Quality ID — Run #{activeRecipeIndex + 1}
              </span>
              {matchingMaster ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                  <Check className="h-3 w-3" /> Master Synced
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-medium">
                  Custom
                </span>
              )}
            </div>

            {/* Quick Master Catalog Select */}
            {masterRecipes.length > 0 && (
              <div className="flex items-center gap-2 max-w-full">
                <span className="text-[11px] font-medium text-slate-500 shrink-0">Master Recipe:</span>
                <select
                  value={matchingMaster ? matchingMaster.code : ""}
                  onChange={(e) => {
                    const selected = masterRecipes.find((r) => r.code === e.target.value);
                    if (selected) applyRecipeMaster(selected);
                  }}
                  className="h-7 px-2 text-xs font-mono font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg hover:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all cursor-pointer max-w-[240px] sm:max-w-xs md:max-w-sm truncate"
                >
                  <option value="">— Select Recipe Master —</option>
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
            label="Standard Code"
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden min-w-0">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Specifications & Parameters
              </h3>
              <RecipeQualityBadge value={currentPlan.recipeQuality} />
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Planned: <strong className="text-slate-900 font-bold">{Number(currentPlan.plannedQtyKg).toLocaleString() || 0} KG</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 divide-x divide-y divide-slate-200 border-b border-slate-200 text-xs min-w-0">
            {/* PP / LPP */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PP / LPP</label>
              <select
                value={currentPlan.tapeType}
                onChange={(e) => updateCurrentPlan({ tapeType: e.target.value })}
                className="w-full h-8 px-2 text-xs font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none cursor-pointer"
              >
                <option value="PP">PP</option>
                <option value="LPP">LPP</option>
              </select>
            </div>

            {/* Denier */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Denier</label>
              <input
                type="number"
                value={currentPlan.denier}
                placeholder="e.g. 800"
                onChange={(e) => updateCurrentPlan({ denier: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none text-right"
              />
            </div>

            {/* Tape Width */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tape Width (mm)</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.tapeWidth}
                placeholder="e.g. 2.5"
                onChange={(e) => updateCurrentPlan({ tapeWidth: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none text-right"
              />
            </div>

            {/* Strength */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Strength (gpd)</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.strength}
                placeholder="e.g. 4.8"
                onChange={(e) => updateCurrentPlan({ strength: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none text-right"
              />
            </div>

            {/* ELO % */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ELO %</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.eloPercent}
                placeholder="e.g. 22.5"
                onChange={(e) => updateCurrentPlan({ eloPercent: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none text-right"
              />
            </div>

            {/* Bobbin Marking */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bobbin Marking</label>
              <input
                type="text"
                value={currentPlan.bobbinMarking}
                placeholder="e.g. Red Strip"
                onChange={(e) => updateCurrentPlan({ bobbinMarking: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none"
              />
            </div>

            {/* Colour */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Colour</label>
              <input
                type="text"
                value={currentPlan.colour}
                placeholder="e.g. Yellow"
                onChange={(e) => updateCurrentPlan({ colour: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none"
              />
            </div>

            {/* Spacer Size */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Spacer Size</label>
              <input
                type="text"
                value={currentPlan.spacerSize}
                placeholder="e.g. 3.0 mm"
                onChange={(e) => updateCurrentPlan({ spacerSize: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none"
              />
            </div>

            {/* Required Ash */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Required Ash</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.requiredAsh}
                placeholder="e.g. 1.2"
                onChange={(e) => updateCurrentPlan({ requiredAsh: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none text-right"
              />
            </div>

            {/* Ash % */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ash %</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.ashPercent}
                placeholder="e.g. 1.15"
                onChange={(e) => updateCurrentPlan({ ashPercent: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none text-right"
              />
            </div>

            {/* Planned QTY (KG) */}
            <div className="p-2.5 bg-slate-50/70 border-2 border-slate-800/10">
              <label className="block text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-1">
                Planned Qty (KG) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={currentPlan.plannedQtyKg}
                placeholder="0"
                onChange={(e) => handlePlannedQtyChange(e.target.value)}
                className="w-full h-8 px-2.5 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 outline-none text-right shadow-2xs"
              />
            </div>

            {/* Omega */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Omega</label>
              <input
                type="text"
                value={currentPlan.omega}
                placeholder="Code"
                onChange={(e) => updateCurrentPlan({ omega: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none"
              />
            </div>

            {/* Vist % */}
            <div className="p-2.5 bg-white">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vist... %</label>
              <input
                type="number"
                step="0.01"
                value={currentPlan.vistPercent}
                placeholder="%"
                onChange={(e) => updateCurrentPlan({ vistPercent: e.target.value })}
                className="w-full h-8 px-2.5 text-xs font-mono font-semibold text-slate-800 bg-slate-50/50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none text-right"
              />
            </div>
          </div>

          {/* Remarks Row */}
          <div className="p-2.5 bg-slate-50/50 flex items-center gap-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Remarks</label>
            <input
              type="text"
              value={currentPlan.remarks}
              placeholder="Optional notes or shift instructions"
              onChange={(e) => updateCurrentPlan({ remarks: e.target.value })}
              className="flex-1 h-7 px-2.5 text-xs text-slate-800 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-slate-400 outline-none"
            />
          </div>
        </div>

        {/* 3. Material Composition Formula Spreadsheet */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-slate-600" />
              Material Composition (Formula #{activeRecipeIndex + 1})
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500 font-medium">
                Total Qty: <strong className="font-mono text-slate-900 font-bold">{totalActiveMaterialQty.toLocaleString()} KG</strong>
              </span>
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded font-bold border ${
                  totalActivePercentage === 100
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : totalActivePercentage > 100
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {totalActivePercentage.toFixed(1)}%
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
