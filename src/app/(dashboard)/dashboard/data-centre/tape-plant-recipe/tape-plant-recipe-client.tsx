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
} from "lucide-react";
import { RecipeQualityBadge } from "@/components/tape-plant/RecipeQualityBadge";

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
  remarks: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const EMPTY_RECIPE_FORM: Omit<TapePlantRecipeRecord, "id" | "createdAt" | "updatedAt"> = {
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
  remarks: "",
  isActive: true,
};

export function TapePlantRecipeClient() {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<TapePlantRecipeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tapeTypeFilter, setTapeTypeFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<typeof EMPTY_RECIPE_FORM>(EMPTY_RECIPE_FORM);
  const [formSaving, setFormSaving] = useState(false);

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
    if (!confirm("Seed / sync default master recipes from Excel catalog?")) return;
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
    setFormData(EMPTY_RECIPE_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (recipe: TapePlantRecipeRecord) => {
    setEditingId(recipe.id);
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
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        r.code?.toLowerCase().includes(q) ||
        r.colour?.toLowerCase().includes(q) ||
        r.bobbinMarking?.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [recipes, tapeTypeFilter, searchTerm]);

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
  const activeCount = recipes.filter((r) => r.isActive).length;

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
            <div className="text-xs text-slate-500 font-medium">Total Recipes</div>
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
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
            <div className="text-xs text-slate-500 font-medium">Active Formulations</div>
          </div>
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
              placeholder="Search recipes by code, colour, marking..."
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
            title="Seed/Sync default recipes from Excel workbook"
          >
            {seeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            )}
            Sync Excel Catalog
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Recipe
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
            <p className="text-sm font-semibold text-slate-700">No recipes found</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchTerm || tapeTypeFilter !== "ALL"
                ? "Try adjusting your search query or filter"
                : "Click '+ Add Recipe' or 'Sync Excel Catalog' to add formulations."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[700px] scrollbar-thin scrollbar-thumb-slate-300">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/90 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Quality / Recipe Code</th>
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
                {filteredRecipes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Quality Code */}
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {r.code}
                      </div>
                      {r.remarks && (
                        <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">
                          {r.remarks}
                        </div>
                      )}
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
                      <div className="font-medium text-slate-800 text-[11px]">
                        {r.bobbinMarking || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">
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
                    </td>

                    {/* Default Qty */}
                    <td className="px-3 py-3 text-right font-medium">
                      {r.defaultQtyKg ? `${r.defaultQtyKg.toLocaleString()} kg` : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(r)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Recipe"
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
                          title="Delete Recipe"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                    {editingId ? "Edit Tape Plant Recipe" : "Add New Tape Plant Recipe"}
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

            {/* Form Content */}
            <form onSubmit={handleSaveRecipe} className="overflow-y-auto p-6 space-y-6 flex-1">
              {/* 1. Identification Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  1. Identification & Grade
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipe Quality Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AMB/PP/YL/74/500/S1"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tape Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.tapeType}
                      onChange={(e) => setFormData({ ...formData, tapeType: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="PP">PP (Polypropylene)</option>
                      <option value="LPP">LPP (Light Polypropylene)</option>
                      <option value="HDPE">HDPE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Colour
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. YELLOW, WHITE, GREEN"
                      value={formData.colour || ""}
                      onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bobbin Marking
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BLACK - GREEN, RED, Blue"
                      value={formData.bobbinMarking || ""}
                      onChange={(e) => setFormData({ ...formData, bobbinMarking: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Technical & Dimensional Specifications */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 text-primary" />
                  2. Physical & Technical Parameters
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Denier
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="840"
                      value={formData.denier ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          denier: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tape Width (mm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="2.45"
                      value={formData.tapeWidth ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tapeWidth: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Strength (g/den)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="4.75"
                      value={formData.strength ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          strength: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Elongation % (ELO)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.22"
                      value={formData.eloPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eloPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Spacer Size (mm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="6.15"
                      value={formData.spacerSize ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          spacerSize: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Req Ash %
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="5.5"
                      value={formData.requiredAsh ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requiredAsh: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ash Content %
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="5.42"
                      value={formData.ashPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ashPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Qty (kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="2500"
                      value={formData.defaultQtyKg ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultQtyKg: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Raw Material Composition Formulation */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    3. Raw Material Composition (%)
                  </h4>
                  <div
                    className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      Math.abs(totalComposition - 100) < 0.01
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    Total Composition: {totalComposition.toFixed(2)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      PP %
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="84.8"
                      value={formData.ppPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ppPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CC %
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="4.4"
                      value={formData.ccPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ccPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      MB % (Masterbatch)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.8"
                      value={formData.mbPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mbPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      RP1 %
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="8.0"
                      value={formData.rp1Percent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rp1Percent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      RP2 (MIX) %
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="2.0"
                      value={formData.rp2Percent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rp2Percent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      H.D RP %
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="2.0"
                      value={formData.hdrpPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hdrpPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      TPT %
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="1.0"
                      value={formData.tptPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tptPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vistamax %
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.0"
                      value={formData.vistamaxPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vistamaxPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 text-xs text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Remarks & Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Special Instructions / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. A. M.B 1.3 + UT MB 1, special heating parameters..."
                  value={formData.remarks || ""}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {formSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {editingId ? "Update Recipe" : "Save Recipe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-100">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Recipe?</h3>
                <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5">
              Are you sure you want to delete this master recipe record from the Data Centre catalog?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteRecipe}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
