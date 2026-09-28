"use client";

import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Layers,
  FlaskConical,
  Eye,
  FileSpreadsheet,
  SunMedium,
} from "lucide-react";
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
  shiftId?: string;
  shiftName?: string;
}

export const createEmptyRecipePlan = (
  index: number = 1,
  defaultShiftId?: string,
  defaultShiftName?: string
): RecipePlanItem => {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    recipeQuality: "",
    tapeType: "PP",
    denier: "",
    tapeWidth: "",
    strength: "",
    eloPercent: "",
    bobbinMarking: "",
    colour: "",
    spacerSize: "",
    requiredAsh: "",
    ashPercent: "",
    plannedQtyKg: "",
    omega: "",
    vistPercent: "",
    remarks: "",
    materials: DEFAULT_MATERIALS.map((m) => ({ material: m.material, quantity: "", percentage: "" })),
    isDayNight: false,
    shiftId: defaultShiftId,
    shiftName: defaultShiftName,
  };
};

interface TapePlantPlanningSectionProps {
  date: string;
  shiftId: string;
  shiftName: string;
  shifts?: { id: string; name: string; startTime?: string; endTime?: string }[];
}

export function TapePlantPlanningSection({ date, shiftId, shiftName, shifts }: TapePlantPlanningSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);
  const isInitialLoadedRef = useRef(false);
  const lastSavedPayloadRef = useRef("");
  const [status, setStatus] = useState("SAVED");
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Available shifts
  const [availableShifts, setAvailableShifts] = useState<{ id: string; name: string }[]>(shifts || []);

  useEffect(() => {
    if (shifts && shifts.length > 0) {
      setAvailableShifts(shifts);
    } else {
      fetch("/api/settings/master-data/shift")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setAvailableShifts(data);
          } else {
            setAvailableShifts([
              { id: "shift_day", name: "Day Shift" },
              { id: "shift_night", name: "Night Shift" },
            ]);
          }
        })
        .catch(() => {});
    }
  }, [shifts]);

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
    isInitialLoadedRef.current = false;
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
            shiftId: p.shiftId || undefined,
            shiftName: p.shiftName || (p.shift?.name) || undefined,
            recipeQuality: p.recipeQuality || "",
            tapeType: p.tapeType || "PP",
            denier: p.denier ?? "",
            tapeWidth: p.tapeWidth ?? "",
            strength: p.strength ?? "",
            eloPercent: p.eloPercent ?? "",
            bobbinMarking: p.bobbinMarking || "",
            colour: p.colour || "",
            spacerSize: p.spacerSize || "",
            requiredAsh: p.requiredAsh ?? "",
            ashPercent: p.ashPercent ?? "",
            plannedQtyKg: p.plannedQtyKg ?? "",
            omega: p.omega || "",
            vistPercent: p.vistPercent ?? "",
            remarks: p.remarks || "",
            materials: Array.isArray(p.materials) && p.materials.length > 0 ? p.materials : DEFAULT_MATERIALS.map((m) => ({ material: m.material, quantity: "", percentage: "" })),
            isDayNight: Boolean(p.isDayNight),
            carriedOverFromShift: p.carriedOverFromShift || undefined,
          }));
          setRecipePlans(loaded);
          const currentStatus = data.plans[0]?.status === "SUBMITTED" ? "SUBMITTED" : "SAVED";
          setStatus(currentStatus);
          setActiveRecipeIndex(0);
          lastSavedPayloadRef.current = JSON.stringify({
            date,
            shiftId,
            status: currentStatus,
            plans: loaded.map((p: any) => ({
              id: p.id,
              recipeQuality: (p.recipeQuality || "").trim(),
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
              shiftId: p.shiftId || (shiftId !== "ALL" ? shiftId : undefined),
              status: currentStatus,
            })),
          });
        } else if (data && data.recipeQuality) {
          // Backward compatibility with single record
          const single: RecipePlanItem = {
            id: data.id || `temp-${Date.now()}`,
            shiftId: data.shiftId || undefined,
            shiftName: data.shiftName || (data.shift?.name) || undefined,
            recipeQuality: data.recipeQuality || "",
            tapeType: data.tapeType || "PP",
            denier: data.denier ?? "",
            tapeWidth: data.tapeWidth ?? "",
            strength: data.strength ?? "",
            eloPercent: data.eloPercent ?? "",
            bobbinMarking: data.bobbinMarking || "",
            colour: data.colour || "",
            spacerSize: data.spacerSize || "",
            requiredAsh: data.requiredAsh ?? "",
            ashPercent: data.ashPercent ?? "",
            plannedQtyKg: data.plannedQtyKg ?? "",
            omega: data.omega || "",
            vistPercent: data.vistPercent ?? "",
            remarks: data.remarks || "",
            materials: Array.isArray(data.materials) && data.materials.length > 0 ? data.materials : DEFAULT_MATERIALS.map((m) => ({ material: m.material, quantity: "", percentage: "" })),
            isDayNight: Boolean(data.isDayNight),
            carriedOverFromShift: data.carriedOverFromShift || undefined,
          };
          setRecipePlans([single]);
          const currentStatus = data.status === "SUBMITTED" ? "SUBMITTED" : "SAVED";
          setStatus(currentStatus);
          setActiveRecipeIndex(0);
          lastSavedPayloadRef.current = JSON.stringify({
            date,
            shiftId,
            status: currentStatus,
            plans: [{
              id: single.id,
              recipeQuality: (single.recipeQuality || "").trim(),
              tapeType: single.tapeType,
              denier: single.denier !== "" ? Number(single.denier) : null,
              tapeWidth: single.tapeWidth !== "" ? Number(single.tapeWidth) : null,
              strength: single.strength !== "" ? Number(single.strength) : null,
              eloPercent: single.eloPercent !== "" ? Number(single.eloPercent) : null,
              bobbinMarking: single.bobbinMarking,
              colour: single.colour,
              spacerSize: single.spacerSize,
              requiredAsh: single.requiredAsh !== "" ? Number(single.requiredAsh) : null,
              ashPercent: single.ashPercent !== "" ? Number(single.ashPercent) : null,
              plannedQtyKg: single.plannedQtyKg !== "" ? Number(single.plannedQtyKg) : 0,
              omega: single.omega,
              vistPercent: single.vistPercent !== "" ? Number(single.vistPercent) : null,
              remarks: single.remarks,
              materials: single.materials,
              isDayNight: Boolean(single.isDayNight),
              shiftId: single.shiftId || (shiftId !== "ALL" ? shiftId : undefined),
              status: currentStatus,
            }],
          });
        } else {
          const defaultShift = availableShifts[0];
          const empty = [createEmptyRecipePlan(1, defaultShift?.id, defaultShift?.name)];
          setRecipePlans(empty);
          setStatus("SAVED");
          setActiveRecipeIndex(0);
          lastSavedPayloadRef.current = "";
        }
      })
      .catch(() => toast.error("Failed to load Tape Plant plan"))
      .finally(() => {
        setLoading(false);
        isInitialLoadedRef.current = true;
      });
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
    const defaultShift = availableShifts[0];
    const newPlan = createEmptyRecipePlan(nextNum, defaultShift?.id, defaultShift?.name);
    setRecipePlans((prev) => [...prev, newPlan]);
    setActiveRecipeIndex(recipePlans.length);
    toast.info(`Added Quality Row #${nextNum}`);
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

  // Debounced Auto-Save
  useEffect(() => {
    if (!isInitialLoadedRef.current || !date || !shiftId) return;

    const hasValidRecipe = recipePlans.some((p) => p.recipeQuality && p.recipeQuality.trim() !== "");
    if (!hasValidRecipe) return;

    const payload = {
      date,
      shiftId,
      status: status === "SUBMITTED" ? "SUBMITTED" : "SAVED",
      plans: recipePlans.map((p) => ({
        id: p.id,
        recipeQuality: (p.recipeQuality || "").trim(),
        tapeType: p.tapeType,
        denier: p.denier !== "" && p.denier !== null && p.denier !== undefined ? Number(p.denier) : null,
        tapeWidth: p.tapeWidth !== "" && p.tapeWidth !== null && p.tapeWidth !== undefined ? Number(p.tapeWidth) : null,
        strength: p.strength !== "" && p.strength !== null && p.strength !== undefined ? Number(p.strength) : null,
        eloPercent: p.eloPercent !== "" && p.eloPercent !== null && p.eloPercent !== undefined ? Number(p.eloPercent) : null,
        bobbinMarking: p.bobbinMarking,
        colour: p.colour,
        spacerSize: p.spacerSize,
        requiredAsh: p.requiredAsh !== "" && p.requiredAsh !== null && p.requiredAsh !== undefined ? Number(p.requiredAsh) : null,
        ashPercent: p.ashPercent !== "" && p.ashPercent !== null && p.ashPercent !== undefined ? Number(p.ashPercent) : null,
        plannedQtyKg: p.plannedQtyKg !== "" && p.plannedQtyKg !== null && p.plannedQtyKg !== undefined ? Number(p.plannedQtyKg) : 0,
        omega: p.omega,
        vistPercent: p.vistPercent !== "" && p.vistPercent !== null && p.vistPercent !== undefined ? Number(p.vistPercent) : null,
        remarks: p.remarks,
        materials: p.materials,
        isDayNight: Boolean(p.isDayNight),
        shiftId: p.shiftId || (shiftId !== "ALL" ? shiftId : undefined),
        status: status === "SUBMITTED" ? "SUBMITTED" : "SAVED",
      })),
    };

    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedPayloadRef.current) return;

    const timer = setTimeout(async () => {
      setAutoSaving(true);
      try {
        const res = await fetch("/api/production/tape-plant/planning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        });
        if (res.ok) {
          const resData = await res.json();
          lastSavedPayloadRef.current = serialized;
          setLastAutoSavedAt(new Date());
          if (Array.isArray(resData.plans)) {
            setRecipePlans((prev) =>
              prev.map((p, i) => {
                const match = resData.plans[i];
                return match && match.id ? { ...p, id: match.id } : p;
              })
            );
          }
        }
      } catch (err) {
        console.error("Auto-save error:", err);
      } finally {
        setAutoSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [recipePlans, date, shiftId, status]);

  const handleSave = async (submitStatus: "SAVED" | "SUBMITTED") => {
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
          shiftId: p.shiftId || (shiftId !== "ALL" ? shiftId : undefined),
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
      lastSavedPayloadRef.current = JSON.stringify(payload);
      setLastAutoSavedAt(new Date());

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
            shiftId: p.shiftId,
            shiftName: p.shiftName || p.shift?.name,
          }))
        );
      }

      setStatus(submitStatus);
      toast.success(
        submitStatus === "SUBMITTED"
          ? `Shift plan with ${recipePlans.length} recipe(s) submitted successfully`
          : `Shift plan saved (${recipePlans.length} recipes)`
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

  // Shift selection helper for individual rows
  const getRowShiftValue = (plan: RecipePlanItem) => {
    if (plan.isDayNight) return "BOTH";
    if (plan.shiftId) return plan.shiftId;
    const name = (plan.shiftName || "").toLowerCase();
    if (name.includes("night")) {
      const nightShift = availableShifts.find((s) => s.name.toLowerCase().includes("night") || s.id.includes("night"));
      return nightShift ? nightShift.id : "shift_night";
    }
    const dayShift = availableShifts.find((s) => s.name.toLowerCase().includes("day") || s.id.includes("day"));
    return dayShift ? dayShift.id : (availableShifts[0]?.id || "shift_day");
  };

  const handleRowShiftChange = (index: number, value: string) => {
    if (value === "BOTH") {
      updatePlanAt(index, {
        isDayNight: true,
        shiftName: "Day + Night (24h)",
      });
    } else {
      const match = availableShifts.find((s) => s.id === value);
      updatePlanAt(index, {
        isDayNight: false,
        shiftId: value,
        shiftName: match?.name || value,
      });
    }
  };

  // ── Excel-like 2D Arrow Key Grid Navigation ──
  const TOTAL_GRID_COLS = 16;

  const handleGridKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    colIndex: number
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const isInput = target instanceof HTMLInputElement;
    const isSelect = target instanceof HTMLSelectElement;

    const focusCell = (r: number, c: number) => {
      if (r < 0 || r >= recipePlans.length || c < 0 || c >= TOTAL_GRID_COLS) return;
      const el = document.querySelector(`[data-grid-cell="${r}-${c}"]`) as HTMLElement;
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) {
          el.select();
        }
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        setActiveRecipeIndex(r);
      }
    };

    if (e.key === "ArrowDown") {
      if (isSelect && e.altKey) return;
      e.preventDefault();
      if (rowIndex < recipePlans.length - 1) {
        focusCell(rowIndex + 1, colIndex);
      }
    } else if (e.key === "ArrowUp") {
      if (isSelect && e.altKey) return;
      e.preventDefault();
      if (rowIndex > 0) {
        focusCell(rowIndex - 1, colIndex);
      }
    } else if (e.key === "ArrowRight") {
      const isAllSelected = isInput && target.selectionStart === 0 && target.selectionEnd === target.value.length;
      const isAtEnd = isInput && target.selectionEnd === target.value.length;
      const isEmpty = target.value === "";

      if (isSelect || isAllSelected || isAtEnd || isEmpty) {
        if (colIndex < TOTAL_GRID_COLS - 1) {
          e.preventDefault();
          focusCell(rowIndex, colIndex + 1);
        } else if (rowIndex < recipePlans.length - 1) {
          e.preventDefault();
          focusCell(rowIndex + 1, 0);
        }
      }
    } else if (e.key === "ArrowLeft") {
      const isAllSelected = isInput && target.selectionStart === 0 && target.selectionEnd === target.value.length;
      const isAtStart = isInput && target.selectionStart === 0;
      const isEmpty = target.value === "";

      if (isSelect || isAllSelected || isAtStart || isEmpty) {
        if (colIndex > 0) {
          e.preventDefault();
          focusCell(rowIndex, colIndex - 1);
        } else if (rowIndex > 0) {
          e.preventDefault();
          focusCell(rowIndex - 1, TOTAL_GRID_COLS - 1);
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rowIndex < recipePlans.length - 1) {
        focusCell(rowIndex + 1, colIndex);
      }
    }
  };

  // Track which rows have expanded material sub-rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpand = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Helper to update a specific plan by index (for inline grid editing)
  const updatePlanAt = (index: number, updates: Partial<RecipePlanItem>) => {
    setRecipePlans((prev) =>
      prev.map((plan, idx) => (idx === index ? { ...plan, ...updates } : plan))
    );
  };

  // Handle planned qty change for a specific row (recalculates materials)
  const handlePlannedQtyChangeForRow = (index: number, newQtyStr: string) => {
    const qty = Number(newQtyStr) || 0;
    const plan = recipePlans[index];
    const updatedMaterials = plan.materials.map((m) => {
      const pct = Number(m.percentage);
      return {
        ...m,
        quantity: pct && qty > 0 ? Number(((qty * pct) / 100).toFixed(2)) : m.quantity,
      };
    });
    updatePlanAt(index, { plannedQtyKg: newQtyStr, materials: updatedMaterials });
  };

  // Handle recipe code change for a specific row
  const handleRecipeCodeChangeForRow = (index: number, newCode: string) => {
    if (!newCode || !newCode.trim()) {
      updatePlanAt(index, {
        recipeQuality: "",
        tapeType: "PP",
        denier: "",
        tapeWidth: "",
        strength: "",
        eloPercent: "",
        bobbinMarking: "",
        colour: "",
        spacerSize: "",
        requiredAsh: "",
        ashPercent: "",
        plannedQtyKg: "",
        omega: "",
        vistPercent: "",
        remarks: "",
        materials: DEFAULT_MATERIALS.map((m) => ({ material: m.material, quantity: "", percentage: "" })),
      });
      return;
    }

    updatePlanAt(index, { recipeQuality: newCode });
    const match = masterRecipes.find(
      (r) => r.code?.toUpperCase() === newCode?.trim().toUpperCase()
    );
    if (match) {
      applyRecipeMasterForRow(index, match);
    }
  };

  // Apply master recipe to a specific row
  const applyRecipeMasterForRow = (index: number, recipe: any) => {
    const plan = recipePlans[index];
    const plannedQty = plan.plannedQtyKg ? Number(plan.plannedQtyKg) : recipe.defaultQtyKg || 2500;

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

    updatePlanAt(index, {
      recipeQuality: recipe.code,
      tapeType: recipe.tapeType || "PP",
      denier: recipe.denier ?? "",
      tapeWidth: recipe.tapeWidth ?? "",
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

  // Handle materials change for a specific row
  const handleMaterialsChangeForRow = (index: number, newMaterials: MaterialRow[]) => {
    const plan = recipePlans[index];
    const plannedQty = Number(plan.plannedQtyKg) || 0;
    const processed = newMaterials.map((m) => {
      const pct = m.percentage !== "" && m.percentage !== null && m.percentage !== undefined ? Number(m.percentage) : null;
      const qty = m.quantity !== "" && m.quantity !== null && m.quantity !== undefined ? Number(m.quantity) : null;
      let finalQty = m.quantity;
      if (pct !== null && plannedQty > 0 && (qty === null || qty === 0)) {
        finalQty = Number(((plannedQty * pct) / 100).toFixed(2));
      }
      return { ...m, quantity: finalQty };
    });
    updatePlanAt(index, { materials: processed });
  };

  // Cell input classes for the grid (comfortably sized for shop-floor legibility)
  const cellInputClass =
    "w-full h-8.5 px-2 text-xs font-mono font-medium text-slate-800 bg-transparent border-0 outline-none focus:bg-sky-50 focus:ring-1 focus:ring-sky-300 rounded transition-colors";
  const cellInputNumClass = `${cellInputClass} text-right tabular-nums`;
  const cellSelectClass =
    "w-full h-8.5 px-2 text-xs font-semibold text-slate-800 bg-transparent border-0 outline-none focus:bg-sky-50 focus:ring-1 focus:ring-sky-300 rounded cursor-pointer transition-colors";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-slate-500">Loading Tape Plant Planning data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full min-w-0 max-w-full">
      {/* ── Compact Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Tape Plant Planning</h2>
              <span
                className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                  status === "SUBMITTED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {status === "SUBMITTED" ? "SUBMITTED" : "SAVED"}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1">
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">{date}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono font-bold text-slate-900">{recipePlans.length} Qualities</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono font-bold text-slate-900">{totalShiftPlannedKg.toLocaleString()} KG</span>
              {totalDayNightPlannedKg > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono font-bold text-amber-700">
                    <SunMedium className="h-3.5 w-3.5 inline mr-0.5" />
                    D+N {totalDayNightPlannedKg.toLocaleString()} KG
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Auto-save indicator */}
          {autoSaving ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium rounded-lg h-8">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="hidden sm:inline">Saving…</span>
            </div>
          ) : lastAutoSavedAt ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg h-8">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ) : null}

          <button type="button" onClick={handleAddRecipe}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all h-8 cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> Add Quality
          </button>
          <button type="button" onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all h-8 cursor-pointer">
            <Eye className="h-3.5 w-3.5 text-slate-500" /> Print
          </button>
          <button type="button" onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all h-8 cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> Excel
          </button>
          <button type="button" disabled={saving} onClick={() => handleSave("SUBMITTED")}
            className="inline-flex items-center gap-2 px-3.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 h-8 cursor-pointer">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Submit
          </button>
        </div>
      </div>

      {/* ── Excel-Like Data Grid ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1450px]">
            {/* Column Headers */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-30 bg-slate-50 border-r border-slate-200 px-2 py-2.5 text-center font-bold text-slate-600 uppercase tracking-wider w-10">#</th>
                <th className="sticky left-10 z-30 bg-slate-50 border-r border-slate-200 px-2.5 py-2.5 text-left font-bold text-slate-600 uppercase tracking-wider min-w-[240px]">Quality / Recipe</th>
                <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[110px]">Shift</th>
                <th className="px-2 py-2.5 text-center font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[75px]">Type</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[80px]">Denier</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[90px]">Width mm</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[80px]">Str gpd</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[75px]">ELO %</th>
                <th className="px-2.5 py-2.5 text-left font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[100px]">Bobbin</th>
                <th className="px-2.5 py-2.5 text-left font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[95px]">Colour</th>
                <th className="px-2.5 py-2.5 text-left font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[80px]">Spacer</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[75px]">Req Ash</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[75px]">Ash %</th>
                <th className="px-2.5 py-2.5 text-right font-bold text-slate-900 uppercase tracking-wider border-r border-slate-200 w-[110px] bg-slate-100">Plan KG</th>
                <th className="px-2 py-2.5 text-left font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[75px]">Omega</th>
                <th className="px-2 py-2.5 text-right font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 w-[75px]">Vist %</th>
                <th className="px-2.5 py-2.5 text-left font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200 min-w-[140px]">Remarks</th>
                <th className="px-2.5 py-2.5 text-center font-bold text-slate-600 uppercase tracking-wider w-[100px]">Actions</th>
              </tr>
            </thead>

            <tbody>
              {recipePlans.map((plan, index) => {
                const isActive = activeRecipeIndex === index;
                const isExpanded = expandedRows.has(index);
                const rowBg = isActive ? "bg-sky-50/50" : index % 2 === 0 ? "bg-white" : "bg-slate-50/40";
                const rowMaterialTotalQty = plan.materials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
                const rowMaterialTotalPct = plan.materials.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0);

                return (
                  <React.Fragment key={plan.id}>
                    {/* ── Main Row ── */}
                    <tr
                      className={`${rowBg} border-b border-slate-100 hover:bg-sky-50/30 transition-colors ${isActive ? "ring-1 ring-inset ring-sky-200" : ""}`}
                      onClick={() => setActiveRecipeIndex(index)}
                    >
                      {/* # */}
                      <td className={`sticky left-0 z-20 ${isActive ? "bg-sky-50" : index % 2 === 0 ? "bg-white" : "bg-slate-50"} border-r border-slate-200 px-2 py-1.5 text-center`}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleRowExpand(index); }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer mx-auto ${
                            isActive
                              ? "bg-sky-500 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title={isExpanded ? "Collapse materials" : "Expand materials"}
                        >
                          {isExpanded ? "▾" : index + 1}
                        </button>
                      </td>

                      {/* Col 0: Quality / Recipe */}
                      <td className={`sticky left-10 z-20 ${isActive ? "bg-sky-50" : index % 2 === 0 ? "bg-white" : "bg-slate-50"} border-r border-slate-200 px-1 py-1`}>
                        <select
                          value={plan.recipeQuality}
                          onChange={(e) => handleRecipeCodeChangeForRow(index, e.target.value)}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={`${cellSelectClass} font-bold ${
                            !plan.recipeQuality ? "text-slate-400 italic font-normal" : "text-slate-900"
                          }`}
                          data-grid-cell={`${index}-0`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 0)}
                        >
                          <option value="">— Select Quality / Recipe —</option>
                          {masterRecipes.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.code} {r.tapeType ? `(${r.tapeType}${r.colour ? ` • ${r.colour}` : ""})` : ""}
                            </option>
                          ))}
                          {plan.recipeQuality && !masterRecipes.some((r) => r.code?.toUpperCase() === plan.recipeQuality?.toUpperCase()) && (
                            <option value={plan.recipeQuality}>{plan.recipeQuality}</option>
                          )}
                        </select>
                      </td>

                      {/* Col 1: Shift */}
                      <td className="border-r border-slate-200 px-1 py-1 text-center">
                        <select
                          value={getRowShiftValue(plan)}
                          onChange={(e) => handleRowShiftChange(index, e.target.value)}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={`w-full h-8.5 px-2 text-xs font-bold rounded border cursor-pointer transition-colors outline-none focus:ring-1 ${
                            plan.isDayNight
                              ? "bg-amber-50 text-amber-900 border-amber-300 focus:ring-amber-400"
                              : (plan.shiftName || "").toLowerCase().includes("night") || plan.shiftId?.toLowerCase().includes("night")
                              ? "bg-purple-50 text-purple-800 border-purple-200 focus:ring-purple-400"
                              : "bg-blue-50 text-blue-800 border-blue-200 focus:ring-blue-400"
                          }`}
                          data-grid-cell={`${index}-1`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 1)}
                        >
                          {availableShifts.map((s) => {
                            const shortName = s.name.replace(/Shift/i, "").replace(/\(.*?\)/g, "").trim() || s.name;
                            return (
                              <option key={s.id} value={s.id}>
                                {shortName}
                              </option>
                            );
                          })}
                          <option value="BOTH">Both (D+N)</option>
                        </select>
                      </td>

                      {/* Col 2: Type (PP / LPP) */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <select
                          value={plan.tapeType}
                          onChange={(e) => updatePlanAt(index, { tapeType: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellSelectClass}
                          data-grid-cell={`${index}-2`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 2)}
                        >
                          <option value="PP">PP</option>
                          <option value="LPP">LPP</option>
                        </select>
                      </td>

                      {/* Col 3: Denier */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="number" value={plan.denier} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { denier: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputNumClass}
                          data-grid-cell={`${index}-3`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 3)} />
                      </td>

                      {/* Col 4: Width mm */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="number" step="0.01" value={plan.tapeWidth} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { tapeWidth: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputNumClass}
                          data-grid-cell={`${index}-4`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 4)} />
                      </td>

                      {/* Col 5: Str gpd */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="number" step="0.01" value={plan.strength} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { strength: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputNumClass}
                          data-grid-cell={`${index}-5`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 5)} />
                      </td>

                      {/* Col 6: ELO % */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="number" step="0.01" value={plan.eloPercent} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { eloPercent: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputNumClass}
                          data-grid-cell={`${index}-6`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 6)} />
                      </td>

                      {/* Col 7: Bobbin Marking */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="text" value={plan.bobbinMarking} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { bobbinMarking: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputClass}
                          data-grid-cell={`${index}-7`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 7)} />
                      </td>

                      {/* Col 8: Colour */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="text" value={plan.colour} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { colour: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputClass}
                          data-grid-cell={`${index}-8`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 8)} />
                      </td>

                      {/* Col 9: Spacer Size */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="text" value={plan.spacerSize} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { spacerSize: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputClass}
                          data-grid-cell={`${index}-9`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 9)} />
                      </td>

                      {/* Col 10: Required Ash */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="number" step="0.01" value={plan.requiredAsh} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { requiredAsh: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputNumClass}
                          data-grid-cell={`${index}-10`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 10)} />
                      </td>

                      {/* Col 11: Ash % */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="number" step="0.01" value={plan.ashPercent} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { ashPercent: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputNumClass}
                          data-grid-cell={`${index}-11`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 11)} />
                      </td>

                      {/* Col 12: Planned KG — highlighted */}
                      <td className="border-r border-slate-200 px-1 py-1 bg-slate-50">
                        <input type="number" value={plan.plannedQtyKg} placeholder="0"
                          onChange={(e) => handlePlannedQtyChangeForRow(index, e.target.value)}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={`${cellInputNumClass} font-bold text-slate-900 bg-white border border-slate-200 rounded`}
                          data-grid-cell={`${index}-12`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 12)} />
                      </td>

                      {/* Col 13: Omega */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="text" value={plan.omega} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { omega: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputClass}
                          data-grid-cell={`${index}-13`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 13)} />
                      </td>

                      {/* Col 14: Vist % */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="number" step="0.01" value={plan.vistPercent} placeholder="—"
                          onChange={(e) => updatePlanAt(index, { vistPercent: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputNumClass}
                          data-grid-cell={`${index}-14`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 14)} />
                      </td>

                      {/* Col 15: Remarks */}
                      <td className="border-r border-slate-200 px-1 py-1">
                        <input type="text" value={plan.remarks} placeholder="Notes…"
                          onChange={(e) => updatePlanAt(index, { remarks: e.target.value })}
                          onFocus={() => setActiveRecipeIndex(index)}
                          className={cellInputClass}
                          data-grid-cell={`${index}-15`}
                          onKeyDown={(e) => handleGridKeyDown(e, index, 15)} />
                      </td>

                      {/* Actions */}
                      <td className="px-1.5 py-1">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={(e) => { e.stopPropagation(); toggleRowExpand(index); }}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${isExpanded ? "text-sky-600 bg-sky-50" : "text-slate-400 hover:text-sky-600 hover:bg-sky-50"}`}
                            title="Toggle material formula">
                            <FlaskConical className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); const dup = { ...JSON.parse(JSON.stringify(plan)), id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }; setRecipePlans((prev) => [...prev.slice(0, index + 1), dup, ...prev.slice(index + 1)]); setActiveRecipeIndex(index + 1); toast.info(`Duplicated quality as row #${index + 2}`); }}
                            className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Duplicate row">
                            <Copy className="h-4 w-4" />
                          </button>
                          {recipePlans.length > 1 && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveRecipe(index); }}
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove row">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Expandable Materials Sub-Row ── */}
                    {isExpanded && (
                      <tr className={`${isActive ? "bg-sky-50/20" : "bg-slate-50/50"} border-b border-slate-200`}>
                        <td className="sticky left-0 z-10 bg-inherit border-r border-slate-200"></td>
                        <td colSpan={17} className="px-3 py-2.5">
                          <div className="flex flex-wrap items-start gap-4">
                            {/* Material mini-table */}
                            <div className="flex-1 min-w-[320px]">
                              <div className="flex items-center gap-2 mb-1.5">
                                <FlaskConical className="h-3.5 w-3.5 text-slate-500" />
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                  Material Composition — {plan.recipeQuality || `#${index + 1}`}
                                </span>
                                <span
                                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                                    rowMaterialTotalPct === 100
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : rowMaterialTotalPct > 100
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {rowMaterialTotalPct.toFixed(1)}%
                                </span>
                                <span className="text-xs font-mono text-slate-500">
                                  = {rowMaterialTotalQty.toLocaleString()} KG
                                </span>
                              </div>
                              <table className="w-full text-xs border-collapse border border-slate-200 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-slate-100">
                                    <th className="px-2.5 py-1.5 text-left font-bold text-slate-600 border-r border-slate-200 w-[120px]">Material</th>
                                    <th className="px-2.5 py-1.5 text-right font-bold text-slate-600 border-r border-slate-200 w-[120px]">Qty (KG)</th>
                                    <th className="px-2.5 py-1.5 text-right font-bold text-slate-600 w-[90px]">%</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {plan.materials.map((m, mIdx) => (
                                    <tr key={mIdx} className="border-t border-slate-100 hover:bg-sky-50/30">
                                      <td className="px-2 py-1 border-r border-slate-200">
                                        <input type="text" value={m.material}
                                          onChange={(e) => {
                                            const newMats = [...plan.materials];
                                            newMats[mIdx] = { ...newMats[mIdx], material: e.target.value };
                                            handleMaterialsChangeForRow(index, newMats);
                                          }}
                                          className="w-full h-7 px-1.5 text-xs font-semibold text-slate-800 bg-transparent outline-none focus:bg-sky-50 rounded" />
                                      </td>
                                      <td className="px-2 py-1 border-r border-slate-200">
                                        <input type="number" value={m.quantity} placeholder="0"
                                          onChange={(e) => {
                                            const newMats = [...plan.materials];
                                            newMats[mIdx] = { ...newMats[mIdx], quantity: e.target.value };
                                            handleMaterialsChangeForRow(index, newMats);
                                          }}
                                          className="w-full h-7 px-1.5 text-xs font-mono text-slate-800 bg-transparent outline-none focus:bg-sky-50 rounded text-right" />
                                      </td>
                                      <td className="px-2 py-1">
                                        <input type="number" value={m.percentage} placeholder="0"
                                          onChange={(e) => {
                                            const newMats = [...plan.materials];
                                            newMats[mIdx] = { ...newMats[mIdx], percentage: e.target.value };
                                            handleMaterialsChangeForRow(index, newMats);
                                          }}
                                          className="w-full h-7 px-1.5 text-xs font-mono text-slate-800 bg-transparent outline-none focus:bg-sky-50 rounded text-right" />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="flex items-center gap-2 mt-1.5">
                                <button type="button" onClick={() => updatePlanAt(index, { materials: [...plan.materials, { material: "", quantity: "", percentage: "" }] })}
                                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded transition-colors cursor-pointer inline-flex items-center gap-1 border border-slate-200 bg-white shadow-sm">
                                  <Plus className="h-3 w-3" /> Add Material
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* Footer row — Add Quality */}
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50/50">
                <td className="sticky left-0 z-20 bg-slate-50 border-r border-slate-200"></td>
                <td colSpan={17} className="px-3.5 py-2.5">
                  <button type="button" onClick={handleAddRecipe}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 bg-white transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm">
                    <Plus className="h-3.5 w-3.5" /> Add Quality Row
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Print Preview Modal (untouched) */}
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
