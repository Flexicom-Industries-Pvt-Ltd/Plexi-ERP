"use client";

import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Layers,
  Database,
  X,
  AlertCircle,
  FileSpreadsheet,
  Copy,
  Users,
  Info,
  ChevronRight,
  Palette,
} from "lucide-react";

export interface TapePlantRecipeRecord {
  id: string;
  code: string;
  tapeType: string;
  denier: number | null;
  tapeWidth: number | null;
  strength: number | null;
  eloPercent: number | null;
  bobbinMarking: string | null;
  colour: string | null;
  spacerSize: number | null;
  requiredAsh: number | null;
  ashPercent: number | null;
  ppPercent: number | null;
  ccPercent: number | null;
  mbPercent: number | null;
  rp1Percent: number | null;
  rp2Percent: number | null;
  hdrpPercent: number | null;
  omega: number | null;
  vistamaxPercent: number | null;
  tptPercent: number | null;
  totalPercent: number | null;
  defaultQtyKg: number | null;
  colorGroup: string | null; // "Yellow" | "White" | "Light Green" | "Dark Green" | "Grey" | "Dark Blue" | "Light Blue"
  recipeGroup: string | null; // e.g. "860D PP Family", "900D LPP White"
  copiedFromCode: string | null;
  sharedQualities?: string[];
  remarks: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const COLOR_GROUPS = [
  { id: "ALL", label: "All Colors", dot: "bg-slate-400", border: "border-slate-300", bg: "bg-slate-50" },
  { id: "Yellow", label: "Yellow", dot: "bg-amber-400", border: "border-amber-300", bg: "bg-amber-50 text-amber-900" },
  { id: "White", label: "White", dot: "bg-slate-200 border border-slate-400", border: "border-slate-300", bg: "bg-slate-100 text-slate-800" },
  { id: "Light Green", label: "Light Green (860D)", dot: "bg-emerald-400", border: "border-emerald-300", bg: "bg-emerald-50 text-emerald-900" },
  { id: "Dark Green", label: "Dark Green", dot: "bg-emerald-700", border: "border-emerald-600", bg: "bg-emerald-100 text-emerald-950" },
  { id: "Grey", label: "Grey (Transition)", dot: "bg-slate-500", border: "border-slate-400", bg: "bg-slate-200 text-slate-900" },
  { id: "Light Blue", label: "Light Blue", dot: "bg-sky-400", border: "border-sky-300", bg: "bg-sky-50 text-sky-900" },
  { id: "Dark Blue", label: "Dark Blue", dot: "bg-blue-700", border: "border-blue-600", bg: "bg-blue-100 text-blue-950" },
];

const EMPTY_RECIPE_FORM: Omit<TapePlantRecipeRecord, "id" | "createdAt" | "updatedAt" | "sharedQualities"> = {
  code: "",
  tapeType: "PP",
  denier: 840,
  tapeWidth: 2.45,
  strength: 4.75,
  eloPercent: 0.22,
  bobbinMarking: "",
  colour: "YELLOW",
  spacerSize: 6.15,
  requiredAsh: null,
  ashPercent: null,
  ppPercent: 80,
  ccPercent: 15,
  mbPercent: 2,
  rp1Percent: 3,
  rp2Percent: null,
  hdrpPercent: null,
  omega: null,
  vistamaxPercent: null,
  tptPercent: null,
  totalPercent: 100,
  defaultQtyKg: 2500,
  colorGroup: "Yellow",
  recipeGroup: "",
  copiedFromCode: null,
  remarks: "",
  isActive: true,
};

export function TapePlantRecipeClient() {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<TapePlantRecipeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tapeTypeFilter, setTapeTypeFilter] = useState("ALL");
  const [colorGroupFilter, setColorGroupFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<typeof EMPTY_RECIPE_FORM>(EMPTY_RECIPE_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [cloneSourceCode, setCloneSourceCode] = useState<string>("");

  // Shared Qualities Popover / View State
  const [activeSharedModal, setActiveSharedModal] = useState<TapePlantRecipeRecord | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Seeding State
  const [seeding, setSeeding] = useState(false);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data-centre/tape-plant-recipes?activeOnly=false");
      if (!res.ok) throw new Error("Failed to load recipes");
      const data = await res.json();
      setRecipes(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load Tape Plant Recipes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const handleSeedDefaults = async () => {
    if (!confirm("Seed / sync all 27 Loom Qualities and shared recipe master data into database?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/data-centre/tape-plant-recipes/seed", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to seed recipes");
      toast.success(data.message || "Master recipes synced successfully");
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || "Failed to seed recipes");
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setCloneSourceCode("");
    setFormData(EMPTY_RECIPE_FORM);
    setIsModalOpen(true);
  };

  const handleCopyRecipeToNew = (sourceRecipe: TapePlantRecipeRecord) => {
    setEditingId(null);
    setCloneSourceCode(sourceRecipe.code);
    setFormData({
      code: "", // Blank so user can type the new quality code
      tapeType: sourceRecipe.tapeType || "PP",
      denier: sourceRecipe.denier,
      tapeWidth: sourceRecipe.tapeWidth,
      strength: sourceRecipe.strength,
      eloPercent: sourceRecipe.eloPercent,
      bobbinMarking: sourceRecipe.bobbinMarking || "",
      colour: sourceRecipe.colour || "",
      spacerSize: sourceRecipe.spacerSize,
      requiredAsh: sourceRecipe.requiredAsh,
      ashPercent: sourceRecipe.ashPercent,
      ppPercent: sourceRecipe.ppPercent,
      ccPercent: sourceRecipe.ccPercent,
      mbPercent: sourceRecipe.mbPercent,
      rp1Percent: sourceRecipe.rp1Percent,
      rp2Percent: sourceRecipe.rp2Percent,
      hdrpPercent: sourceRecipe.hdrpPercent,
      omega: sourceRecipe.omega,
      vistamaxPercent: sourceRecipe.vistamaxPercent,
      tptPercent: sourceRecipe.tptPercent,
      totalPercent: sourceRecipe.totalPercent || 100,
      defaultQtyKg: sourceRecipe.defaultQtyKg,
      colorGroup: sourceRecipe.colorGroup || "Yellow",
      recipeGroup: sourceRecipe.recipeGroup || `${sourceRecipe.denier}D ${sourceRecipe.tapeType} Shared`,
      copiedFromCode: sourceRecipe.code,
      remarks: `Cloned formulation from ${sourceRecipe.code}`,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleApplyCloneSource = (sourceCode: string) => {
    setCloneSourceCode(sourceCode);
    if (!sourceCode) return;
    const source = recipes.find((r) => r.code === sourceCode);
    if (!source) return;

    setFormData((prev) => ({
      ...prev,
      tapeType: source.tapeType || prev.tapeType,
      denier: source.denier ?? prev.denier,
      tapeWidth: source.tapeWidth ?? prev.tapeWidth,
      strength: source.strength ?? prev.strength,
      eloPercent: source.eloPercent ?? prev.eloPercent,
      spacerSize: source.spacerSize ?? prev.spacerSize,
      requiredAsh: source.requiredAsh ?? prev.requiredAsh,
      ashPercent: source.ashPercent ?? prev.ashPercent,
      ppPercent: source.ppPercent,
      ccPercent: source.ccPercent,
      mbPercent: source.mbPercent,
      rp1Percent: source.rp1Percent,
      rp2Percent: source.rp2Percent,
      hdrpPercent: source.hdrpPercent,
      omega: source.omega,
      vistamaxPercent: source.vistamaxPercent,
      tptPercent: source.tptPercent,
      totalPercent: source.totalPercent || 100,
      defaultQtyKg: source.defaultQtyKg ?? prev.defaultQtyKg,
      colorGroup: source.colorGroup || prev.colorGroup,
      recipeGroup: source.recipeGroup || prev.recipeGroup,
      copiedFromCode: source.code,
      remarks: prev.remarks || `Cloned formulation from ${source.code}`,
    }));
    toast.info(`Formulation copied from ${source.code}`);
  };

  const handleOpenEditModal = (recipe: TapePlantRecipeRecord) => {
    setEditingId(recipe.id);
    setCloneSourceCode(recipe.copiedFromCode || "");
    setFormData({
      code: recipe.code,
      tapeType: recipe.tapeType || "PP",
      denier: recipe.denier,
      tapeWidth: recipe.tapeWidth,
      strength: recipe.strength,
      eloPercent: recipe.eloPercent,
      bobbinMarking: recipe.bobbinMarking || "",
      colour: recipe.colour || "",
      spacerSize: recipe.spacerSize,
      requiredAsh: recipe.requiredAsh,
      ashPercent: recipe.ashPercent,
      ppPercent: recipe.ppPercent,
      ccPercent: recipe.ccPercent,
      mbPercent: recipe.mbPercent,
      rp1Percent: recipe.rp1Percent,
      rp2Percent: recipe.rp2Percent,
      hdrpPercent: recipe.hdrpPercent,
      omega: recipe.omega,
      vistamaxPercent: recipe.vistamaxPercent,
      tptPercent: recipe.tptPercent,
      totalPercent: recipe.totalPercent || 100,
      defaultQtyKg: recipe.defaultQtyKg,
      colorGroup: recipe.colorGroup || "Yellow",
      recipeGroup: recipe.recipeGroup || "",
      copiedFromCode: recipe.copiedFromCode,
      remarks: recipe.remarks || "",
      isActive: recipe.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error("Recipe code / quality is required");
      return;
    }

    setFormSaving(true);
    try {
      const url = editingId
        ? `/api/data-centre/tape-plant-recipes/${editingId}`
        : "/api/data-centre/tape-plant-recipes";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save recipe");

      toast.success(editingId ? "Recipe updated successfully" : "Recipe created successfully");
      setIsModalOpen(false);
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || "Failed to save recipe");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/data-centre/tape-plant-recipes/${deletingId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete recipe");

      toast.success(data.message || "Recipe deleted");
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete recipe");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchesType =
        tapeTypeFilter === "ALL" ||
        r.tapeType?.toUpperCase() === tapeTypeFilter.toUpperCase();

      const matchesColorGroup =
        colorGroupFilter === "ALL" ||
        r.colorGroup?.toLowerCase() === colorGroupFilter.toLowerCase();

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        r.code?.toLowerCase().includes(q) ||
        r.colour?.toLowerCase().includes(q) ||
        r.bobbinMarking?.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q) ||
        r.recipeGroup?.toLowerCase().includes(q) ||
        r.colorGroup?.toLowerCase().includes(q);

      return matchesType && matchesColorGroup && matchesSearch;
    });
  }, [recipes, tapeTypeFilter, colorGroupFilter, searchTerm]);

  // Composition calculation
  const totalComposition = useMemo(() => {
    const p = (val: number | null | undefined) => (val ? Number(val) : 0);
    return (
      p(formData.ppPercent) +
      p(formData.ccPercent) +
      p(formData.mbPercent) +
      p(formData.rp1Percent) +
      p(formData.rp2Percent) +
      p(formData.hdrpPercent) +
      p(formData.tptPercent) +
      p(formData.vistamaxPercent) +
      p(formData.omega)
    );
  }, [
    formData.ppPercent,
    formData.ccPercent,
    formData.mbPercent,
    formData.rp1Percent,
    formData.rp2Percent,
    formData.hdrpPercent,
    formData.tptPercent,
    formData.vistamaxPercent,
    formData.omega,
  ]);

  // Metrics
  const totalCount = recipes.length;
  const ppCount = recipes.filter((r) => r.tapeType === "PP").length;
  const lppCount = recipes.filter((r) => r.tapeType === "LPP").length;
  const sharedGroupsCount = new Set(recipes.map((r) => r.recipeGroup).filter(Boolean)).size;

  const getColorBadge = (cg: string | null) => {
    if (!cg) return null;
    const match = COLOR_GROUPS.find((c) => c.id.toLowerCase() === cg.toLowerCase());
    if (!match) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          {cg}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${match.border} ${match.bg}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${match.dot}`} />
        {match.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
            <div className="text-xs text-slate-500 font-medium">Total Qualities</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{ppCount}</div>
            <div className="text-xs text-slate-500 font-medium">PP Formulations</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{lppCount}</div>
            <div className="text-xs text-slate-500 font-medium">LPP Formulations</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{sharedGroupsCount}</div>
            <div className="text-xs text-slate-500 font-medium">Shared Recipe Families</div>
          </div>
        </div>
      </div>

      {/* 7-Color Group Filter Tabs */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <Palette className="h-3.5 w-3.5 text-primary" /> Filter by Color Group (7 Categories)
          </span>
          {colorGroupFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => setColorGroupFilter("ALL")}
              className="text-[11px] text-primary hover:underline font-semibold"
            >
              Reset Color Filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {COLOR_GROUPS.map((cg) => {
            const isSelected = colorGroupFilter.toLowerCase() === cg.id.toLowerCase();
            const count = cg.id === "ALL" 
              ? recipes.length 
              : recipes.filter((r) => r.colorGroup?.toLowerCase() === cg.id.toLowerCase()).length;

            return (
              <button
                key={cg.id}
                type="button"
                onClick={() => setColorGroupFilter(cg.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : `${cg.bg} border-slate-200 text-slate-700 hover:border-slate-300`
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${cg.dot}`} />
                <span>{cg.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by quality code, colour, marking, family..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            {["ALL", "PP", "LPP"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTapeTypeFilter(t)}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  tapeTypeFilter === t
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
            title="Seed/Sync default 27 Loom Qualities and shared master recipes"
          >
            {seeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            )}
            Sync Master Qualities
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Quality / Recipe
          </button>
        </div>
      </div>

      {/* Recipes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-sm font-medium text-slate-500">Loading Recipe Master...</span>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <FlaskConical className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No qualities found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm || tapeTypeFilter !== "ALL" || colorGroupFilter !== "ALL"
                ? "Try adjusting your search query or color filters"
                : "Click '+ Add Quality' or 'Sync Master Qualities' to populate recipes."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[720px] scrollbar-thin scrollbar-thumb-slate-300">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/95 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Quality Code & Family</th>
                  <th className="px-3 py-3 text-center">Color Group</th>
                  <th className="px-3 py-3 text-center">Type</th>
                  <th className="px-3 py-3 text-right">Denier</th>
                  <th className="px-3 py-3 text-right">Width (mm)</th>
                  <th className="px-3 py-3 text-right">Strength</th>
                  <th className="px-3 py-3 text-right">ELO %</th>
                  <th className="px-3 py-3">Marking / Colour</th>
                  <th className="px-3 py-3 text-right">Spacer</th>
                  <th className="px-3 py-3 text-right">Ash %</th>
                  <th className="px-4 py-3">Composition (%)</th>
                  <th className="px-3 py-3 text-right">Default Qty</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecipes.map((r) => {
                  const hasComposition =
                    r.ppPercent !== null ||
                    r.ccPercent !== null ||
                    r.mbPercent !== null ||
                    r.rp1Percent !== null;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Quality Code & Shared Group */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {r.code}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {r.recipeGroup && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              {r.recipeGroup}
                            </span>
                          )}
                          {r.sharedQualities && r.sharedQualities.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveSharedModal(r)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                              title="Click to view all qualities sharing this recipe"
                            >
                              <Users className="h-3 w-3" />
                              Shared by {r.sharedQualities.length + 1}
                            </button>
                          )}
                          {r.copiedFromCode && (
                            <span className="text-[9px] text-slate-400">
                              via {r.copiedFromCode}
                            </span>
                          )}
                        </div>
                        {r.remarks && (
                          <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">
                            {r.remarks}
                          </div>
                        )}
                      </td>

                      {/* Color Group */}
                      <td className="px-3 py-3 text-center">
                        {getColorBadge(r.colorGroup)}
                      </td>

                      {/* Type */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 font-bold text-[10px] rounded uppercase ${
                            r.tapeType === "PP"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.tapeType === "LPP"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {r.tapeType}
                        </span>
                      </td>

                      {/* Denier */}
                      <td className="px-3 py-3 text-right font-medium">{r.denier ?? "—"}</td>

                      {/* Tape Width */}
                      <td className="px-3 py-3 text-right font-medium">{r.tapeWidth ?? "—"}</td>

                      {/* Strength */}
                      <td className="px-3 py-3 text-right font-medium">{r.strength ?? "—"}</td>

                      {/* ELO% */}
                      <td className="px-3 py-3 text-right font-medium">
                        {r.eloPercent !== null && r.eloPercent !== undefined
                          ? typeof r.eloPercent === "number" && r.eloPercent < 1
                            ? `${(r.eloPercent * 100).toFixed(0)}%`
                            : `${r.eloPercent}%`
                          : "—"}
                      </td>

                      {/* Marking & Colour */}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {r.bobbinMarking || "—"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          {r.colour || "—"}
                        </div>
                      </td>

                      {/* Spacer */}
                      <td className="px-3 py-3 text-right font-medium">{r.spacerSize ?? "—"}</td>

                      {/* Ash % */}
                      <td className="px-3 py-3 text-right">
                        <div className="font-medium text-slate-800">
                          {r.ashPercent ? `${r.ashPercent}%` : "—"}
                        </div>
                        {r.requiredAsh && (
                          <div className="text-[10px] text-slate-400">
                            Req: {r.requiredAsh}%
                          </div>
                        )}
                      </td>

                      {/* Composition */}
                      <td className="px-4 py-3">
                        {hasComposition ? (
                          <div className="flex flex-wrap items-center gap-1 max-w-xs">
                            {r.ppPercent ? (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 text-[10px] font-semibold">
                                PP: {r.ppPercent}%
                              </span>
                            ) : null}
                            {r.ccPercent ? (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 text-[10px] font-semibold">
                                CC: {r.ccPercent}%
                              </span>
                            ) : null}
                            {r.mbPercent ? (
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 text-[10px] font-semibold">
                                MB: {r.mbPercent}%
                              </span>
                            ) : null}
                            {r.rp1Percent ? (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 text-[10px] font-semibold">
                                RP1: {r.rp1Percent}%
                              </span>
                            ) : null}
                            {r.rp2Percent ? (
                              <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded border border-teal-200 text-[10px] font-semibold">
                                RP2: {r.rp2Percent}%
                              </span>
                            ) : null}
                            {r.hdrpPercent ? (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200 text-[10px] font-semibold">
                                HD RP: {r.hdrpPercent}%
                              </span>
                            ) : null}
                            {r.tptPercent ? (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[10px] font-semibold">
                                TPT: {r.tptPercent}%
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
                            <Info className="h-3 w-3 text-amber-600" />
                            Pending Formulation
                          </span>
                        )}
                      </td>

                      {/* Default Qty */}
                      <td className="px-3 py-3 text-right font-medium">
                        {r.defaultQtyKg ? `${r.defaultQtyKg.toLocaleString()} kg` : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyRecipeToNew(r)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Copy Recipe Formulation to New Quality"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(r)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Quality / Recipe"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingId(r.id);
                              setDeleteConfirmOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Quality"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shared Qualities Modal */}
      {activeSharedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Shared Recipe Formulation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Family: <span className="font-semibold text-purple-700">{activeSharedModal.recipeGroup || "Shared Cluster"}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSharedModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Identical Tape Plant Formulation
                </div>
                <p className="text-slate-600 text-[11px]">
                  All circular looms weaving these qualities consume bobbins with the exact same chemical formulation and extrusion parameters:
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Qualities Sharing This Recipe ({(activeSharedModal.sharedQualities?.length || 0) + 1}):
                </span>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {activeSharedModal.code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                      (Selected)
                    </span>
                  </div>
                  {activeSharedModal.sharedQualities?.map((code) => {
                    const matchedRecipe = recipes.find((r) => r.code === code);
                    return (
                      <div
                        key={code}
                        className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between hover:bg-slate-50"
                      >
                        <div>
                          <div className="font-mono font-bold text-xs text-slate-900">{code}</div>
                          {matchedRecipe && (
                            <div className="text-[10px] text-slate-400">
                              Colour: {matchedRecipe.colour || "—"} | Marking: {matchedRecipe.bobbinMarking || "—"}
                            </div>
                          )}
                        </div>
                        {matchedRecipe && getColorBadge(matchedRecipe.colorGroup)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveSharedModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Recipe Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingId ? "Edit Quality / Recipe" : "Add New Quality / Recipe"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure specifications, mechanical tolerances, and formulation composition.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveRecipe} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Clone / Copy from Existing Quality Selector */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Copy Formulation from Existing Quality
                  </span>
                  {cloneSourceCode && (
                    <span className="text-[10px] text-purple-700 bg-purple-100 font-bold px-2 py-0.5 rounded">
                      Copied from: {cloneSourceCode}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-purple-800/80">
                  Select an existing quality to copy all material composition percentages (PP%, CC%, MB%, RP1%, RP2%, Ash%, Spacer) instantly:
                </p>
                <select
                  value={cloneSourceCode}
                  onChange={(e) => handleApplyCloneSource(e.target.value)}
                  className="w-full text-xs font-mono font-medium px-3 py-2 bg-white border border-purple-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">-- Choose Quality to Copy Recipe From --</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.code} ({r.tapeType} | {r.denier}D | {r.colour} | {r.recipeGroup || "No Family"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Section 1: Identification & Classification */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Quality Identification & Family
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Quality / Recipe Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. wOND/LPP/WH/500/67/S1"
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tape Type
                    </label>
                    <select
                      value={formData.tapeType}
                      onChange={(e) => setFormData({ ...formData, tapeType: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="PP">PP (Polypropylene Standard)</option>
                      <option value="LPP">LPP (Laminated / Liner PP)</option>
                      <option value="HDPE">HDPE (High Density)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Color Group (7 Classifications)
                    </label>
                    <select
                      value={formData.colorGroup || "Yellow"}
                      onChange={(e) => setFormData({ ...formData, colorGroup: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="Yellow">🟡 Yellow (High-Volume / Priority)</option>
                      <option value="White">⚪ White (Standard Base Lines)</option>
                      <option value="Light Green">🟢 Light Green (860D Shared Family)</option>
                      <option value="Dark Green">🌲 Dark Green (Specialty Contract)</option>
                      <option value="Grey">🔘 Grey (Transition / Grade B)</option>
                      <option value="Light Blue">🩵 Light Blue</option>
                      <option value="Dark Blue">🔵 Dark Blue</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Shared Recipe Family / Cluster
                    </label>
                    <input
                      type="text"
                      value={formData.recipeGroup || ""}
                      onChange={(e) => setFormData({ ...formData, recipeGroup: e.target.value })}
                      placeholder="e.g. 860D PP Shared Formulation"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Base Tape Colour
                    </label>
                    <input
                      type="text"
                      value={formData.colour || ""}
                      onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                      placeholder="e.g. WHITE, YELLOW, WH+RED, ORANGE"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Bobbin / Edge Marking
                    </label>
                    <input
                      type="text"
                      value={formData.bobbinMarking || ""}
                      onChange={(e) => setFormData({ ...formData, bobbinMarking: e.target.value })}
                      placeholder="e.g. RED, BLUE, GREEN, BLK/GRN"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Physical Specifications */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-primary" /> Physical & Mechanical Specs
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Denier (D)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.denier ?? ""}
                      onChange={(e) => setFormData({ ...formData, denier: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 840"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Tape Width (mm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.tapeWidth ?? ""}
                      onChange={(e) => setFormData({ ...formData, tapeWidth: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 2.45"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Strength (g/den)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.strength ?? ""}
                      onChange={(e) => setFormData({ ...formData, strength: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 4.75"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Elongation (ELO)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.eloPercent ?? ""}
                      onChange={(e) => setFormData({ ...formData, eloPercent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 0.22"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Spacer Size (mm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.spacerSize ?? ""}
                      onChange={(e) => setFormData({ ...formData, spacerSize: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 6.15"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Required Ash %
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.requiredAsh ?? ""}
                      onChange={(e) => setFormData({ ...formData, requiredAsh: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 6.0"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Ash %
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.ashPercent ?? ""}
                      onChange={(e) => setFormData({ ...formData, ashPercent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 5.45"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Default Qty (kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.defaultQtyKg ?? ""}
                      onChange={(e) => setFormData({ ...formData, defaultQtyKg: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 2500"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Material Composition (%) */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5 text-primary" /> Formulation Composition (%)
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Total:</span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        totalComposition === 100 || totalComposition === 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {totalComposition.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">PP % (Virgin)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.ppPercent ?? ""}
                      onChange={(e) => setFormData({ ...formData, ppPercent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 88.75"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">CC % (Calcium)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.ccPercent ?? ""}
                      onChange={(e) => setFormData({ ...formData, ccPercent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 6.25"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">MB % (Masterbatch)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.mbPercent ?? ""}
                      onChange={(e) => setFormData({ ...formData, mbPercent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 1.0"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">RP1 % (Reprocessed 1)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.rp1Percent ?? ""}
                      onChange={(e) => setFormData({ ...formData, rp1Percent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 3.0"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">RP2 % (Reprocessed 2)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.rp2Percent ?? ""}
                      onChange={(e) => setFormData({ ...formData, rp2Percent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 2.0"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">HD RP %</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.hdrpPercent ?? ""}
                      onChange={(e) => setFormData({ ...formData, hdrpPercent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 2.0"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">TPT %</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.tptPercent ?? ""}
                      onChange={(e) => setFormData({ ...formData, tptPercent: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 1.0"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Omega %</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.omega ?? ""}
                      onChange={(e) => setFormData({ ...formData, omega: e.target.value ? Number(e.target.value) : null })}
                      placeholder="e.g. 0.5"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Remarks / Formulation Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.remarks || ""}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Special MB ratio or quality parameters..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded text-primary focus:ring-primary border-slate-300"
                  />
                  Active in Planning Dropdowns
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {formSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {editingId ? "Save Changes" : "Create Quality"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delete Recipe?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this recipe from the Data Centre catalog?
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeletingId(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRecipe}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
