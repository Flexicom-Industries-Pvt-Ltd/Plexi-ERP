"use client";

import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  FlaskConical,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  Sparkles,
  Layers,
  Database,
  X,
  AlertCircle,
  FileSpreadsheet,
  Copy,
  Users,
  Info,
  Palette,
  Building2,
  Download,
  AlertTriangle,
} from "lucide-react";
import {
  normalizeRpMode,
  RecipeRpMode,
} from "@/lib/tape-plant/material-names";
import {
  calculateActualAshContent,
  calculatePermissibleTapeAsh,
  calculateProfileTotal,
  createEmptyBlendProfile,
  RecipeBlendProfile,
  resolveRecipeProfileForMode,
} from "@/lib/tape-plant/recipe-formulation";
import { exportTapelineMasterExcel } from "@/lib/tape-plant/master-export";

export interface TapePlantRecipeRecord {
  id: string;
  code: string;
  vendor: string | null;
  tapeType: string;
  rpMode: RecipeRpMode;
  denier: number | null;
  tapeWidth: number | null;
  strength: number | null;
  eloPercent: number | null;
  bobbinMarking: string | null;
  colour: string | null;
  spacerSize: number | null;
  requiredAsh: number | null;
  ashPercent: number | null;
  permissibleFabAsh: number | null;
  permissibleTapeAsh: number | null;
  ppPercent: number | null;
  ccPercent: number | null;
  ldpePercent: number | null;
  mbPercent: number | null;
  rp1Percent: number | null;
  rp2Percent: number | null;
  hdrpPercent: number | null;
  omega: number | null;
  vistamaxPercent: number | null;
  tptPercent: number | null;
  tptFillerPercent: number | null;
  totalPercent: number | null;
  withRpComposition?: RecipeBlendProfile | null;
  withoutRpComposition?: RecipeBlendProfile | null;
  defaultQtyKg: number | null;
  colorGroup: string | null;
  recipeGroup: string | null;
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

type RecipeFormState = Omit<
  TapePlantRecipeRecord,
  "id" | "createdAt" | "updatedAt" | "sharedQualities" | "withRpComposition" | "withoutRpComposition"
> & {
  withRpComposition: RecipeBlendProfile;
  withoutRpComposition: RecipeBlendProfile;
};

function buildInitialForm(): RecipeFormState {
  const withRp: RecipeBlendProfile = {
    ppPercent: 75,
    ccPercent: 4,
    ldpePercent: 1,
    mbPercent: 0,
    rp1Percent: 20,
    rp2Percent: 0,
    hdrpPercent: 0,
    tptPercent: 0,
    tptFillerPercent: 0,
    totalPercent: 100,
    actualAshPercent: 5.6,
  };
  const withoutRp: RecipeBlendProfile = {
    ppPercent: 92,
    ccPercent: 7,
    ldpePercent: 1,
    mbPercent: 0,
    rp1Percent: 0,
    rp2Percent: 0,
    hdrpPercent: 0,
    tptPercent: 0,
    tptFillerPercent: 0,
    totalPercent: 100,
    actualAshPercent: 5.6,
  };
  return {
    code: "",
    vendor: "",
    tapeType: "PP",
    rpMode: "WITH_RP",
    denier: 500,
    tapeWidth: 2.45,
    strength: 5.0,
    eloPercent: 24,
    bobbinMarking: "",
    colour: "White",
    spacerSize: 6.15,
    permissibleFabAsh: 5.5,
    permissibleTapeAsh: 5.5,
    requiredAsh: 5.5,
    ashPercent: 5.6,
    ppPercent: withRp.ppPercent,
    ccPercent: withRp.ccPercent,
    ldpePercent: withRp.ldpePercent,
    mbPercent: withRp.mbPercent,
    rp1Percent: withRp.rp1Percent,
    rp2Percent: withRp.rp2Percent,
    hdrpPercent: withRp.hdrpPercent,
    omega: null,
    vistamaxPercent: null,
    tptPercent: withRp.tptPercent,
    tptFillerPercent: withRp.tptFillerPercent ?? 0,
    totalPercent: 100,
    withRpComposition: withRp,
    withoutRpComposition: withoutRp,
    defaultQtyKg: 2500,
    colorGroup: "White",
    recipeGroup: "",
    copiedFromCode: null,
    remarks: "",
    isActive: true,
  };
}

function renderBlendChips(profile: RecipeBlendProfile) {
  const chips = [
    { label: "PP", val: profile.ppPercent, cls: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "CC", val: profile.ccPercent, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    { label: "LDPE 040", val: profile.ldpePercent, cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    { label: "MB", val: profile.mbPercent, cls: "bg-purple-50 text-purple-700 border-purple-200" },
    { label: "RP White", val: profile.rp1Percent, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { label: "RP Yellow", val: profile.rp2Percent, cls: "bg-yellow-50 text-yellow-800 border-yellow-300" },
    { label: "Mixed RP", val: profile.hdrpPercent, cls: "bg-rose-50 text-rose-700 border-rose-200" },
    { label: "Natural RP", val: profile.tptPercent, cls: "bg-slate-100 text-slate-700 border-slate-300" },
    { label: "TPT Filler", val: profile.tptFillerPercent, cls: "bg-stone-100 text-stone-700 border-stone-300" },
  ].filter((c) => c.val !== null && c.val !== undefined && Number(c.val) > 0);

  if (chips.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold">
        <Info className="h-3 w-3 text-amber-600" />
        Pending Formulation
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {chips.map((c) => (
        <span
          key={c.label}
          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${c.cls}`}
        >
          {c.label}: {c.val}%
        </span>
      ))}
    </div>
  );
}

const BLEND_FIELDS: { key: keyof RecipeBlendProfile; label: string; hint: string }[] = [
  { key: "ppPercent", label: "PP % (Virgin)", hint: "e.g. 75.4" },
  { key: "ccPercent", label: "CC % (Calcium)", hint: "e.g. 3.6" },
  { key: "ldpePercent", label: "LDPE 040 %", hint: "e.g. 1.0" },
  { key: "mbPercent", label: "MB % (Masterbatch)", hint: "e.g. 1.5" },
  { key: "rp1Percent", label: "RP White %", hint: "e.g. 20" },
  { key: "rp2Percent", label: "RP Yellow %", hint: "e.g. 10" },
  { key: "hdrpPercent", label: "Mixed RP %", hint: "e.g. 3" },
  { key: "tptPercent", label: "Natural RP %", hint: "e.g. 0" },
  { key: "tptFillerPercent", label: "TPT Filler %", hint: "e.g. 0" },
];

export function TapePlantRecipeClient() {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<TapePlantRecipeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [tapeTypeFilter, setTapeTypeFilter] = useState("ALL");
  const [blendViewMode, setBlendViewMode] = useState<"WITH_RP" | "WITHOUT_RP" | "BOTH">("WITH_RP");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [colorGroupFilter, setColorGroupFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RecipeFormState>(buildInitialForm);
  const [activeModalTab, setActiveModalTab] = useState<RecipeRpMode>("WITH_RP");
  const [formSaving, setFormSaving] = useState(false);
  const [cloneSourceCode, setCloneSourceCode] = useState<string>("");

  // Shared Qualities Modal State
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
    if (!confirm("Sync the canonical 27 Tapeline Master recipes (With RP & Without RP) into database?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/data-centre/tape-plant-recipes/seed", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync recipes");
      toast.success(data.message || "Tapeline Master synced successfully");
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync recipes");
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setCloneSourceCode("");
    setActiveModalTab("WITH_RP");
    setFormData(buildInitialForm());
    setIsModalOpen(true);
  };

  const toModalStateFromRecord = (
    source: TapePlantRecipeRecord,
    overrides?: Partial<RecipeFormState>
  ): RecipeFormState => {
    const withRp = resolveRecipeProfileForMode(source, "WITH_RP");
    const withoutRp = resolveRecipeProfileForMode(source, "WITHOUT_RP");
    const tapeType = source.tapeType || "PP";
    const fabAsh = source.permissibleFabAsh ?? source.requiredAsh ?? null;
    const tapeAsh =
      source.permissibleTapeAsh ??
      calculatePermissibleTapeAsh(tapeType, fabAsh) ??
      source.requiredAsh ??
      null;

    return {
      code: source.code,
      vendor: source.vendor || "",
      tapeType,
      rpMode: normalizeRpMode(source.rpMode),
      denier: source.denier,
      tapeWidth: source.tapeWidth,
      strength: source.strength,
      eloPercent: source.eloPercent,
      bobbinMarking: source.bobbinMarking || "",
      colour: source.colour || "",
      spacerSize: source.spacerSize,
      permissibleFabAsh: fabAsh,
      permissibleTapeAsh: tapeAsh,
      requiredAsh: source.requiredAsh ?? tapeAsh,
      ashPercent: withRp.actualAshPercent ?? source.ashPercent,
      ppPercent: withRp.ppPercent,
      ccPercent: withRp.ccPercent,
      ldpePercent: withRp.ldpePercent,
      mbPercent: withRp.mbPercent,
      rp1Percent: withRp.rp1Percent,
      rp2Percent: withRp.rp2Percent,
      hdrpPercent: withRp.hdrpPercent,
      omega: source.omega,
      vistamaxPercent: source.vistamaxPercent,
      tptPercent: withRp.tptPercent,
      tptFillerPercent: withRp.tptFillerPercent ?? 0,
      totalPercent: withRp.totalPercent ?? 100,
      withRpComposition: withRp,
      withoutRpComposition: withoutRp,
      defaultQtyKg: source.defaultQtyKg,
      colorGroup: source.colorGroup || "White",
      recipeGroup: source.recipeGroup || "",
      copiedFromCode: source.copiedFromCode,
      remarks: source.remarks || "",
      isActive: source.isActive,
      ...overrides,
    };
  };

  const handleCopyRecipeToNew = (sourceRecipe: TapePlantRecipeRecord) => {
    setEditingId(null);
    setCloneSourceCode(sourceRecipe.code);
    setActiveModalTab("WITH_RP");
    setFormData(
      toModalStateFromRecord(sourceRecipe, {
        code: "",
        copiedFromCode: sourceRecipe.code,
        remarks: `Cloned formulation from ${sourceRecipe.code}`,
        isActive: true,
      })
    );
    setIsModalOpen(true);
  };

  const handleApplyCloneSource = (sourceCode: string) => {
    setCloneSourceCode(sourceCode);
    if (!sourceCode) return;
    const source = recipes.find((r) => r.code === sourceCode);
    if (!source) return;

    setFormData((prev) =>
      toModalStateFromRecord(source, {
        code: prev.code,
        bobbinMarking: prev.bobbinMarking || source.bobbinMarking || "",
        colour: prev.colour || source.colour || "",
        copiedFromCode: source.code,
        remarks: prev.remarks || `Cloned formulation from ${source.code}`,
        isActive: prev.isActive,
      })
    );
    toast.info(`Dual formulation copied from ${source.code}`);
  };

  const handleOpenEditModal = (recipe: TapePlantRecipeRecord) => {
    setEditingId(recipe.id);
    setCloneSourceCode(recipe.copiedFromCode || "");
    setActiveModalTab(normalizeRpMode(recipe.rpMode));
    setFormData(toModalStateFromRecord(recipe));
    setIsModalOpen(true);
  };

  const updateActiveBlendField = (
    mode: RecipeRpMode,
    field: keyof RecipeBlendProfile,
    rawVal: string
  ) => {
    const val = rawVal === "" ? null : Number(rawVal);
    setFormData((prev) => {
      const targetKey = mode === "WITHOUT_RP" ? "withoutRpComposition" : "withRpComposition";
      const nextProfile: RecipeBlendProfile = {
        ...(prev[targetKey] || createEmptyBlendProfile()),
        [field]: val !== null && Number.isFinite(val) ? val : null,
      };
      nextProfile.totalPercent = calculateProfileTotal(nextProfile);
      nextProfile.actualAshPercent = calculateActualAshContent(nextProfile, mode);

      const syncFlat =
        mode === normalizeRpMode(prev.rpMode)
          ? {
              ppPercent: nextProfile.ppPercent,
              ccPercent: nextProfile.ccPercent,
              ldpePercent: nextProfile.ldpePercent,
              mbPercent: nextProfile.mbPercent,
              rp1Percent: nextProfile.rp1Percent,
              rp2Percent: nextProfile.rp2Percent,
              hdrpPercent: nextProfile.hdrpPercent,
              tptPercent: nextProfile.tptPercent,
              tptFillerPercent: nextProfile.tptFillerPercent ?? 0,
              totalPercent: nextProfile.totalPercent ?? 100,
              ashPercent: nextProfile.actualAshPercent ?? prev.ashPercent,
            }
          : {};

      return {
        ...prev,
        [targetKey]: nextProfile,
        ...syncFlat,
      };
    });
  };

  const handleCopyProfileBetweenModes = (from: RecipeRpMode, to: RecipeRpMode) => {
    setFormData((prev) => {
      const source =
        from === "WITHOUT_RP" ? prev.withoutRpComposition : prev.withRpComposition;
      const cloned: RecipeBlendProfile = {
        ...source,
        actualAshPercent: calculateActualAshContent(source, to),
        totalPercent: calculateProfileTotal(source),
      };
      const targetKey = to === "WITHOUT_RP" ? "withoutRpComposition" : "withRpComposition";
      return {
        ...prev,
        [targetKey]: cloned,
      };
    });
    toast.info(
      `Copied ${from === "WITHOUT_RP" ? "Without RP" : "With RP"} blend into ${
        to === "WITHOUT_RP" ? "Without RP" : "With RP"
      }`
    );
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error("Recipe code / quality is required");
      return;
    }

    setFormSaving(true);
    try {
      const activeProfile =
        normalizeRpMode(formData.rpMode) === "WITHOUT_RP"
          ? formData.withoutRpComposition
          : formData.withRpComposition;

      const payload = {
        ...formData,
        ppPercent: activeProfile.ppPercent,
        ccPercent: activeProfile.ccPercent,
        ldpePercent: activeProfile.ldpePercent,
        mbPercent: activeProfile.mbPercent,
        rp1Percent: activeProfile.rp1Percent,
        rp2Percent: activeProfile.rp2Percent,
        hdrpPercent: activeProfile.hdrpPercent,
        tptPercent: activeProfile.tptPercent,
        tptFillerPercent: activeProfile.tptFillerPercent ?? 0,
        totalPercent: calculateProfileTotal(activeProfile),
        ashPercent: calculateActualAshContent(activeProfile, formData.rpMode),
        requiredAsh: formData.permissibleTapeAsh ?? formData.requiredAsh,
      };

      const url = editingId
        ? `/api/data-centre/tape-plant-recipes/${editingId}`
        : "/api/data-centre/tape-plant-recipes";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  // Distinct vendor list from active (or all) recipes
  const statusScopedRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (statusFilter === "ACTIVE") return r.isActive;
      if (statusFilter === "INACTIVE") return !r.isActive;
      return true;
    });
  }, [recipes, statusFilter]);

  const availableVendors = useMemo(() => {
    const set = new Set<string>();
    statusScopedRecipes.forEach((r) => {
      if (r.vendor && r.vendor.trim()) set.add(r.vendor.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [statusScopedRecipes]);

  const filteredRecipes = useMemo(() => {
    return statusScopedRecipes.filter((r) => {
      const matchesVendor =
        vendorFilter === "ALL" ||
        (r.vendor || "").trim().toUpperCase() === vendorFilter.toUpperCase();

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
        r.vendor?.toLowerCase().includes(q) ||
        r.colour?.toLowerCase().includes(q) ||
        r.bobbinMarking?.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q) ||
        r.tapeType?.toLowerCase().includes(q) ||
        r.recipeGroup?.toLowerCase().includes(q);

      return matchesVendor && matchesType && matchesColorGroup && matchesSearch;
    });
  }, [statusScopedRecipes, vendorFilter, tapeTypeFilter, colorGroupFilter, searchTerm]);

  // Metrics based on active catalog
  const activeCatalog = useMemo(() => recipes.filter((r) => r.isActive), [recipes]);
  const retiredCount = recipes.length - activeCatalog.length;
  const ppCount = activeCatalog.filter((r) => r.tapeType === "PP").length;
  const lppCount = activeCatalog.filter((r) => r.tapeType === "LPP").length;
  const vendorCount = new Set(activeCatalog.map((r) => r.vendor).filter(Boolean)).size;

  const activeModalProfile =
    activeModalTab === "WITHOUT_RP"
      ? formData.withoutRpComposition
      : formData.withRpComposition;
  const activeModalTotal = calculateProfileTotal(activeModalProfile);
  const activeModalActualAsh = calculateActualAshContent(activeModalProfile, activeModalTab);
  const permissibleTapeAshVal =
    formData.permissibleTapeAsh ??
    calculatePermissibleTapeAsh(formData.tapeType, formData.permissibleFabAsh);

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
            <div className="text-2xl font-bold text-slate-900">{activeCatalog.length}</div>
            <div className="text-xs text-slate-500 font-medium">Active Master Qualities</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{ppCount}</div>
            <div className="text-xs text-slate-500 font-medium">PP Dual Recipes</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{lppCount}</div>
            <div className="text-xs text-slate-500 font-medium">LPP Dual Recipes</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{vendorCount}</div>
            <div className="text-xs text-slate-500 font-medium">Vendors / Customers</div>
          </div>
        </div>
      </div>

      {/* Vendor + Color Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <Building2 className="h-3.5 w-3.5 text-primary" /> Filter by Vendor ({availableVendors.length})
          </span>
          <div className="flex items-center gap-2">
            {vendorFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setVendorFilter("ALL")}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Reset Vendor
              </button>
            )}
            {colorGroupFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setColorGroupFilter("ALL")}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Reset Color
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setVendorFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              vendorFilter === "ALL"
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
            }`}
          >
            All Vendors ({statusScopedRecipes.length})
          </button>
          {availableVendors.map((v) => {
            const count = statusScopedRecipes.filter(
              (r) => (r.vendor || "").trim().toUpperCase() === v
            ).length;
            const selected = vendorFilter === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVendorFilter(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  selected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                {v} <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider text-[10px] mr-1">
            <Palette className="h-3 w-3" /> Color:
          </span>
          {COLOR_GROUPS.map((cg) => {
            const isSelected = colorGroupFilter.toLowerCase() === cg.id.toLowerCase();
            const count =
              cg.id === "ALL"
                ? statusScopedRecipes.length
                : statusScopedRecipes.filter(
                    (r) => r.colorGroup?.toLowerCase() === cg.id.toLowerCase()
                  ).length;
            if (cg.id !== "ALL" && count === 0) return null;
            return (
              <button
                key={cg.id}
                type="button"
                onClick={() => setColorGroupFilter(cg.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : `${cg.bg} border-slate-200 text-slate-700 hover:border-slate-300`
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${cg.dot}`} />
                <span>{cg.label}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search quality, vendor, colour, marking..."
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            {["ALL", "PP", "LPP"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTapeTypeFilter(t)}
                className={`px-2.5 py-1 font-semibold rounded-md transition-all ${
                  tapeTypeFilter === t
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            {(
              [
                { id: "WITH_RP", label: "View: With RP" },
                { id: "WITHOUT_RP", label: "View: Without RP" },
                { id: "BOTH", label: "Both Blends" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBlendViewMode(opt.id)}
                className={`px-2.5 py-1 font-semibold rounded-md transition-all whitespace-nowrap ${
                  blendViewMode === opt.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {retiredCount > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              {(
                [
                  { id: "ACTIVE", label: `Active (${activeCatalog.length})` },
                  { id: "INACTIVE", label: `Retired (${retiredCount})` },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatusFilter(opt.id)}
                  className={`px-2.5 py-1 font-semibold rounded-md transition-all whitespace-nowrap ${
                    statusFilter === opt.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              exportTapelineMasterExcel(filteredRecipes);
              toast.success(`Exported ${filteredRecipes.length} recipes to Excel`);
            }}
            disabled={filteredRecipes.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
            title="Download dual-block Tapeline Master Excel"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            Export .xlsx
          </button>

          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
            title="Sync all 27 canonical Tapeline Master qualities and blends"
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
              {searchTerm || tapeTypeFilter !== "ALL" || vendorFilter !== "ALL" || colorGroupFilter !== "ALL"
                ? "Try adjusting your search query, vendor, or filters"
                : "Click '+ Add Quality' or 'Sync Master Qualities' to populate recipes."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[720px] scrollbar-thin scrollbar-thumb-slate-300">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/95 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-3">Vendor</th>
                  <th className="px-4 py-3">Actual Quality</th>
                  <th className="px-3 py-3">Colour / Specs</th>
                  <th className="px-3 py-3 text-center">Type</th>
                  <th className="px-3 py-3 text-right">Perm. Ash (Fab / Tape)</th>
                  <th className="px-3 py-3 text-right">Actual Ash</th>
                  <th className="px-4 py-3">
                    {blendViewMode === "BOTH"
                      ? "Dual Composition (Without RP & With RP)"
                      : blendViewMode === "WITHOUT_RP"
                      ? "Without RP Formulation (%)"
                      : "With RP Formulation (%)"}
                  </th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecipes.map((r) => {
                  const withProfile = resolveRecipeProfileForMode(r, "WITH_RP");
                  const withoutProfile = resolveRecipeProfileForMode(r, "WITHOUT_RP");
                  const activeProfile =
                    blendViewMode === "WITHOUT_RP" ? withoutProfile : withProfile;

                  const permFab = r.permissibleFabAsh;
                  const permTape =
                    r.permissibleTapeAsh ??
                    calculatePermissibleTapeAsh(r.tapeType, permFab) ??
                    r.requiredAsh;

                  const withAsh = calculateActualAshContent(withProfile, "WITH_RP");
                  const withoutAsh = calculateActualAshContent(withoutProfile, "WITHOUT_RP");
                  const activeAsh = blendViewMode === "WITHOUT_RP" ? withoutAsh : withAsh;
                  const overLimit =
                    permTape !== null && permTape !== undefined && activeAsh > permTape + 0.01;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !r.isActive ? "opacity-65 bg-slate-50/40" : ""
                      }`}
                    >
                      {/* Vendor */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {r.vendor ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[10px] text-slate-800 uppercase">
                            {r.vendor}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actual Quality */}
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{r.code}</span>
                          {!r.isActive && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-slate-200 text-slate-600 rounded">
                              Retired
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {r.sharedQualities && r.sharedQualities.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveSharedModal(r)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                              title="View all qualities sharing this recipe"
                            >
                              <Users className="h-3 w-3" />
                              Family ({r.sharedQualities.length + 1})
                            </button>
                          )}
                          {getColorBadge(r.colorGroup)}
                        </div>
                      </td>

                      {/* Colour / Specs */}
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {r.colour || "—"}
                        </div>
                        {(r.denier || r.tapeWidth || r.bobbinMarking) && (
                          <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                            {[
                              r.denier ? `${r.denier}D` : null,
                              r.tapeWidth ? `${r.tapeWidth}mm` : null,
                              r.bobbinMarking || null,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
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

                      {/* Permissible Ash */}
                      <td className="px-3 py-3 text-right whitespace-nowrap font-mono">
                        {permTape !== null && permTape !== undefined ? (
                          <div>
                            <div className="font-bold text-slate-900">Tape: {permTape}%</div>
                            {permFab !== null && permFab !== undefined && (
                              <div className="text-[10px] text-slate-500">Fab: {permFab}%</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actual Ash */}
                      <td className="px-3 py-3 text-right whitespace-nowrap font-mono">
                        {blendViewMode === "BOTH" ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div className="font-semibold text-amber-800">
                              No RP: {withoutAsh}%
                            </div>
                            <div className="font-bold text-sky-800">
                              With RP: {withAsh}%
                            </div>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold text-[11px] ${
                              overLimit
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "text-slate-900"
                            }`}
                            title={
                              overLimit
                                ? `Actual ash (${activeAsh}%) exceeds Permissible Tape Ash (${permTape}%)`
                                : `Within Permissible Tape Ash limit`
                            }
                          >
                            {overLimit && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                            {activeAsh}%
                          </span>
                        )}
                      </td>

                      {/* Composition */}
                      <td className="px-4 py-3 min-w-[290px]">
                        {blendViewMode === "BOTH" ? (
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-1.5">
                              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-50 text-amber-800 border border-amber-200">
                                Without RP
                              </span>
                              {renderBlendChips(withoutProfile)}
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-sky-50 text-sky-800 border border-sky-200">
                                With RP
                              </span>
                              {renderBlendChips(withProfile)}
                            </div>
                          </div>
                        ) : (
                          renderBlendChips(activeProfile)
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyRecipeToNew(r)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Copy Dual Formulation to New Quality"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(r)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Quality / Dual Formulations"
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
                    Vendor / Recipe Cluster
                  </h3>
                  <p className="text-xs text-slate-500">
                    Group:{" "}
                    <span className="font-semibold text-purple-700">
                      {activeSharedModal.recipeGroup || "Shared Cluster"}
                    </span>
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
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {activeSharedModal.code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                    Selected
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
                            {matchedRecipe.vendor || "—"} | {matchedRecipe.colour || "—"}
                          </div>
                        )}
                      </div>
                      {matchedRecipe && getColorBadge(matchedRecipe.colorGroup)}
                    </div>
                  );
                })}
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingId ? "Edit Quality & Dual Formulations" : "Add New Quality / Dual Recipe"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure Vendor, Permissible Fab/Tape Ash, and both Without RP & With RP blends.
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
              {/* Clone / Copy from Existing Quality */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
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
                <select
                  value={cloneSourceCode}
                  onChange={(e) => handleApplyCloneSource(e.target.value)}
                  className="w-full text-xs font-mono font-medium px-3 py-2 bg-white border border-purple-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <option value="">-- Choose Quality to Copy Both Formulations From --</option>
                  {activeCatalog.map((r) => (
                    <option key={r.id} value={r.code}>
                      {r.vendor ? `[${r.vendor}] ` : ""}{r.code} ({r.tapeType} | {r.colour})
                    </option>
                  ))}
                </select>
              </div>

              {/* Section 1: Identification & Ash Spec */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Quality Identification & Ash Spec
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Actual Quality Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. AMB-NVCO/LPP/WHT/500/64/S1"
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={formData.vendor || ""}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value.toUpperCase() })}
                      placeholder="e.g. ADANI, CCI, UTCL, WONDER"
                      className="w-full px-3 py-2 text-xs font-bold uppercase border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Tape Type
                    </label>
                    <select
                      value={formData.tapeType}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        const nextTapeAsh = calculatePermissibleTapeAsh(
                          nextType,
                          formData.permissibleFabAsh
                        );
                        setFormData({
                          ...formData,
                          tapeType: nextType,
                          permissibleTapeAsh: nextTapeAsh,
                          requiredAsh: nextTapeAsh,
                        });
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="PP">PP (Tape Ash = Fab Ash)</option>
                      <option value="LPP">LPP (Tape Ash = Fab Ash / 0.75)</option>
                      <option value="HDPE">HDPE</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Colour
                    </label>
                    <input
                      type="text"
                      value={formData.colour || ""}
                      onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                      placeholder="e.g. White, Yellow, Red, Orange"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Permissible Ash in Fab (%)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.permissibleFabAsh ?? ""}
                      onChange={(e) => {
                        const fab = e.target.value ? Number(e.target.value) : null;
                        const tapeAsh = calculatePermissibleTapeAsh(formData.tapeType, fab);
                        setFormData({
                          ...formData,
                          permissibleFabAsh: fab,
                          permissibleTapeAsh: tapeAsh,
                          requiredAsh: tapeAsh,
                        });
                      }}
                      placeholder="e.g. 4.0"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Permissible Ash in Tape (%)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.permissibleTapeAsh ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setFormData({
                          ...formData,
                          permissibleTapeAsh: val,
                          requiredAsh: val,
                        });
                      }}
                      placeholder="Auto-computed"
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Default RP Mode (Planning Default)
                    </label>
                    <select
                      value={formData.rpMode}
                      onChange={(e) =>
                        setFormData({ ...formData, rpMode: normalizeRpMode(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="WITH_RP">With RP (Default)</option>
                      <option value="WITHOUT_RP">Without RP (Default)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Color Group
                    </label>
                    <select
                      value={formData.colorGroup || "White"}
                      onChange={(e) => setFormData({ ...formData, colorGroup: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="Yellow">Yellow</option>
                      <option value="White">White</option>
                      <option value="Light Green">Light Green (860D)</option>
                      <option value="Dark Green">Dark Green</option>
                      <option value="Grey">Grey (Mix / Transition)</option>
                      <option value="Light Blue">Light Blue</option>
                      <option value="Dark Blue">Dark Blue</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Bobbin / Edge Marking
                    </label>
                    <input
                      type="text"
                      value={formData.bobbinMarking || ""}
                      onChange={(e) => setFormData({ ...formData, bobbinMarking: e.target.value })}
                      placeholder="e.g. RED, BLUE, BLK/GRN"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Dual Formulation Editor (WITHOUT RP / WITH RP) */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                    {(
                      [
                        { id: "WITH_RP", label: "With RP Formulation" },
                        { id: "WITHOUT_RP", label: "Without RP Formulation" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveModalTab(tab.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                          activeModalTab === tab.id
                            ? tab.id === "WITH_RP"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "bg-amber-600 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyProfileBetweenModes(
                          activeModalTab === "WITH_RP" ? "WITHOUT_RP" : "WITH_RP",
                          activeModalTab
                        )
                      }
                      className="text-[11px] font-semibold px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                    >
                      Copy from {activeModalTab === "WITH_RP" ? "Without RP" : "With RP"}
                    </button>

                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                        Math.abs(activeModalTotal - 100) < 0.05 || activeModalTotal === 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      Total: {activeModalTotal.toFixed(2)}%
                    </span>

                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                        permissibleTapeAshVal !== null &&
                        activeModalActualAsh > permissibleTapeAshVal + 0.01
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      Actual Ash: {activeModalActualAsh.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
                  {BLEND_FIELDS.map((f) => (
                    <div key={f.key}>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        {f.label}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={activeModalProfile[f.key] ?? ""}
                        onChange={(e) =>
                          updateActiveBlendField(activeModalTab, f.key, e.target.value)
                        }
                        placeholder={f.hint}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Physical / Machine Parameters (Optional) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-primary" /> Physical & Extrusion Parameters
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
                      onChange={(e) =>
                        setFormData({ ...formData, denier: e.target.value ? Number(e.target.value) : null })
                      }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tapeWidth: e.target.value ? Number(e.target.value) : null,
                        })
                      }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          strength: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Elongation (ELO %)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.eloPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          eloPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          spacerSize: e.target.value ? Number(e.target.value) : null,
                        })
                      }
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultQtyKg: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Omega
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.omega ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          omega: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Vistamax %
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.vistamaxPercent ?? ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vistamaxPercent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
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
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
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
