"use client";

import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  RefreshCw,
  Edit2,
  Trash2,
  Info,
  X,
  Sliders,
  Cpu,
  Hash,
  Activity,
  Maximize2,
  AlertTriangle,
} from "lucide-react";

export interface LoomMachineMappingRecord {
  id: string;
  qualityCode: string;
  tapePlantRecipeId?: string | null;
  colorGroup?: string | null;
  colour?: string | null;
  denier?: number | null;
  tapeWidth?: number | null;
  bobbinMarking?: string | null;
  loomNumbers: number[];
  totalLooms: number;
  reedSpaceCm?: number | null;
  mesh?: string | null;
  targetPpm?: number | null;
  remarks?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLOR_GROUPS = [
  { id: "ALL", label: "All Colors", dot: "bg-slate-400", bg: "bg-slate-50", badge: "bg-slate-100 text-slate-800" },
  { id: "Yellow", label: "Yellow", dot: "bg-amber-400", bg: "bg-amber-50/50", badge: "bg-amber-100 text-amber-900 border-amber-200" },
  { id: "White", label: "White", dot: "bg-slate-300", bg: "bg-slate-50/50", badge: "bg-slate-100 text-slate-800 border-slate-300" },
  { id: "Light Green", label: "Light Green (860D)", dot: "bg-emerald-400", bg: "bg-emerald-50/50", badge: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  { id: "Dark Green", label: "Dark Green", dot: "bg-emerald-700", bg: "bg-emerald-900/10", badge: "bg-emerald-800 text-emerald-100 border-emerald-900" },
  { id: "Grey", label: "Grey (Transition)", dot: "bg-slate-500", bg: "bg-slate-100", badge: "bg-slate-200 text-slate-800 border-slate-400" },
  { id: "Light Blue", label: "Light Blue", dot: "bg-sky-400", bg: "bg-sky-50/50", badge: "bg-sky-100 text-sky-900 border-sky-200" },
  { id: "Dark Blue", label: "Dark Blue (BIS)", dot: "bg-indigo-600", bg: "bg-indigo-50/50", badge: "bg-indigo-100 text-indigo-900 border-indigo-200" },
];

const TOTAL_FACTORY_LOOMS = 91;

const EMPTY_MAPPING_FORM = {
  qualityCode: "",
  colorGroup: "Yellow",
  colour: "YELLOW",
  denier: 850 as number | null,
  tapeWidth: 2.45 as number | null,
  bobbinMarking: "",
  loomNumbersText: "",
  selectedLooms: [] as number[],
  reedSpaceCm: null as number | null,
  mesh: "",
  targetPpm: null as number | null,
  remarks: "",
  isActive: true,
};

export function LoomMachineMappingClient() {
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<LoomMachineMappingRecord[]>([]);
  const [tapePlantRecipes, setTapePlantRecipes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [colorGroupFilter, setColorGroupFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ALLOCATED" | "UNALLOCATED">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<typeof EMPTY_MAPPING_FORM>(EMPTY_MAPPING_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [showMatrixSelector, setShowMatrixSelector] = useState(true);

  // View Modal for Loom Numbers
  const [viewingMapping, setViewingMapping] = useState<LoomMachineMappingRecord | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Seeding State
  const [seeding, setSeeding] = useState(false);

  // Fetch Loom Mappings
  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data-centre/loom-mappings?activeOnly=false");
      if (!res.ok) throw new Error("Failed to load Loom Machine Mappings");
      const data = await res.json();
      setMappings(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load Loom Machine Mappings");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Tape Plant Recipes for Quality Dropdown autocomplete
  const fetchTapeRecipes = async () => {
    try {
      const res = await fetch("/api/data-centre/tape-plant-recipes?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setTapePlantRecipes(data || []);
      }
    } catch (err) {
      console.warn("Could not fetch tape plant recipes for autocomplete", err);
    }
  };

  useEffect(() => {
    fetchMappings();
    fetchTapeRecipes();
  }, []);

  // Map of which loom numbers are assigned to which quality codes
  const occupiedLoomsMap = useMemo(() => {
    const map = new Map<number, { qualityCode: string; id: string }>();
    mappings.forEach((m) => {
      (m.loomNumbers || []).forEach((loomNo) => {
        map.set(loomNo, { qualityCode: m.qualityCode, id: m.id });
      });
    });
    return map;
  }, [mappings]);

  // Handle Master Data Sync / Seed
  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/data-centre/loom-mappings/seed", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync Loom Master Data");
      toast.success(data.message || "Synced Loom Machine Mappings successfully");
      await fetchMappings();
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSeeding(false);
    }
  };

  // Filtered Mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      // Color Group Filter
      if (colorGroupFilter !== "ALL") {
        if (m.colorGroup?.toLowerCase() !== colorGroupFilter.toLowerCase()) return false;
      }

      // Status Filter
      if (statusFilter === "ALLOCATED" && (m.totalLooms || 0) === 0) return false;
      if (statusFilter === "UNALLOCATED" && (m.totalLooms || 0) > 0) return false;

      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesCode = m.qualityCode?.toLowerCase().includes(q);
        const matchesColour = m.colour?.toLowerCase().includes(q);
        const matchesMarking = m.bobbinMarking?.toLowerCase().includes(q);
        const matchesRemarks = m.remarks?.toLowerCase().includes(q);
        const matchesColorGroup = m.colorGroup?.toLowerCase().includes(q);
        const matchesLooms = (m.loomNumbers || []).some((loom) => String(loom) === q || `loom ${loom}` === q);
        return matchesCode || matchesColour || matchesMarking || matchesRemarks || matchesColorGroup || matchesLooms;
      }

      return true;
    });
  }, [mappings, colorGroupFilter, statusFilter, searchTerm]);

  // Overall Statistics
  const totalQualities = mappings.length;
  const totalAssignedLooms = mappings.reduce((acc, curr) => acc + (curr.totalLooms || 0), 0);
  const totalAllocatedQualities = mappings.filter((m) => (m.totalLooms || 0) > 0).length;
  const totalUnallocatedQualities = mappings.filter((m) => (m.totalLooms || 0) === 0).length;

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_MAPPING_FORM,
      selectedLooms: [],
      loomNumbersText: "",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (mapping: LoomMachineMappingRecord) => {
    setEditingId(mapping.id);
    setFormData({
      qualityCode: mapping.qualityCode,
      colorGroup: mapping.colorGroup || "Yellow",
      colour: mapping.colour || "YELLOW",
      denier: mapping.denier || 850,
      tapeWidth: mapping.tapeWidth || 2.45,
      bobbinMarking: mapping.bobbinMarking || "",
      loomNumbersText: (mapping.loomNumbers || []).join(", "),
      selectedLooms: mapping.loomNumbers || [],
      reedSpaceCm: mapping.reedSpaceCm || null,
      mesh: mapping.mesh || "",
      targetPpm: mapping.targetPpm || null,
      remarks: mapping.remarks || "",
      isActive: mapping.isActive,
    });
    setIsModalOpen(true);
  };

  // Handle Quality Selection from Tape Plant Master
  const handleQualitySelect = (selectedCode: string) => {
    const matched = tapePlantRecipes.find((r) => r.code === selectedCode);
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        qualityCode: matched.code,
        colorGroup: matched.colorGroup || prev.colorGroup,
        colour: matched.colour || prev.colour,
        denier: matched.denier || prev.denier,
        tapeWidth: matched.tapeWidth || prev.tapeWidth,
        bobbinMarking: matched.bobbinMarking || prev.bobbinMarking,
        remarks: matched.remarks || prev.remarks,
      }));
    } else {
      setFormData((prev) => ({ ...prev, qualityCode: selectedCode }));
    }
  };

  // Toggle a single loom in selectedLooms array
  const handleToggleLoomNumber = (num: number) => {
    setFormData((prev) => {
      let updated: number[];
      if (prev.selectedLooms.includes(num)) {
        updated = prev.selectedLooms.filter((n) => n !== num);
      } else {
        updated = [...prev.selectedLooms, num].sort((a, b) => a - b);
      }
      return {
        ...prev,
        selectedLooms: updated,
        loomNumbersText: updated.join(", "),
      };
    });
  };

  // Update loom numbers from manual text input
  const handleLoomTextChange = (text: string) => {
    const parts = text.split(/[\s,]+/).filter(Boolean);
    const nums: number[] = Array.from(
      new Set(
        parts
          .map((p) => parseInt(p, 10))
          .filter((n) => !isNaN(n) && n > 0 && n <= 200)
      )
    ).sort((a, b) => a - b);

    setFormData((prev) => ({
      ...prev,
      loomNumbersText: text,
      selectedLooms: nums,
    }));
  };

  // Save Mapping
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.qualityCode.trim()) {
      toast.error("Quality Code is required");
      return;
    }

    setFormSaving(true);
    try {
      const payload = {
        qualityCode: formData.qualityCode.trim(),
        colorGroup: formData.colorGroup,
        colour: formData.colour,
        denier: formData.denier ? Number(formData.denier) : null,
        tapeWidth: formData.tapeWidth ? Number(formData.tapeWidth) : null,
        bobbinMarking: formData.bobbinMarking,
        loomNumbers: formData.selectedLooms,
        reedSpaceCm: formData.reedSpaceCm ? Number(formData.reedSpaceCm) : null,
        mesh: formData.mesh,
        targetPpm: formData.targetPpm ? Number(formData.targetPpm) : null,
        remarks: formData.remarks,
        isActive: formData.isActive,
      };

      const url = editingId
        ? `/api/data-centre/loom-mappings/${editingId}`
        : "/api/data-centre/loom-mappings";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save Loom Mapping");

      toast.success(editingId ? "Loom Mapping updated" : "Loom Mapping created");
      setIsModalOpen(false);
      await fetchMappings();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setFormSaving(false);
    }
  };

  // Delete Mapping
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/data-centre/loom-mappings/${deletingId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Loom mapping deleted");
      setDeleteConfirmOpen(false);
      await fetchMappings();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Data Centre Master
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> 91 Looms Online
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
              <Sparkles className="h-3 w-3 text-indigo-500" /> Auto-Synced with Tape Recipes
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Loom Machine Mapping Master
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Assign Loom machine numbers to quality recipes, manage reed widths, denier, and track factory loom allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seeding || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
            title="Sync all 27 qualities & 91 loom assignments from Master Data sheet"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${seeding ? "animate-spin text-emerald-600" : "text-slate-600"}`} />
            {seeding ? "Syncing..." : "Sync Master Looms"}
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:shadow"
          >
            <Plus className="h-3.5 w-3.5" />
            + Add Quality / Loom Mapping
          </button>
        </div>
      </div>

      {/* KPI Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalQualities}</div>
            <div className="text-xs font-medium text-slate-500">Registered Qualities</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {totalAssignedLooms}{" "}
              <span className="text-xs font-normal text-slate-400">/ {TOTAL_FACTORY_LOOMS}</span>
            </div>
            <div className="text-xs font-medium text-slate-500">Active Looms Allocated</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalAllocatedQualities}</div>
            <div className="text-xs font-medium text-slate-500">Qualities in Production</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalUnallocatedQualities}</div>
            <div className="text-xs font-medium text-slate-500">Unallocated (0 Looms)</div>
          </div>
        </div>
      </div>

      {/* 7-Color Group Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>FILTER BY COLOR GROUP (7 CATEGORIES FROM MASTER DATA)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {COLOR_GROUPS.map((cg) => {
            const isSelected = colorGroupFilter.toLowerCase() === cg.id.toLowerCase();
            const count =
              cg.id === "ALL"
                ? mappings.length
                : mappings.filter((m) => m.colorGroup?.toLowerCase() === cg.id.toLowerCase()).length;

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

      {/* Search & Status Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by quality, loom # (e.g. 14), colour, marking..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                statusFilter === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({mappings.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ALLOCATED")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                statusFilter === "ALLOCATED"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Allocated ({totalAllocatedQualities})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("UNALLOCATED")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                statusFilter === "UNALLOCATED"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unallocated ({totalUnallocatedQualities})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
            Loading Loom Machine Mappings...
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Cpu className="h-10 w-10 mx-auto text-slate-300" />
            <div className="text-base font-semibold text-slate-700">No loom mappings found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click &apos;+ Add Quality / Loom Mapping&apos; or &apos;Sync Master Looms&apos; to load all 27 qualities and 91 loom assignments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3">Quality / Code</th>
                  <th className="px-3 py-3 text-center">Color Group</th>
                  <th className="px-3 py-3 text-center">Denier / TW</th>
                  <th className="px-3 py-3 text-center">Colour / Marking</th>
                  <th className="px-4 py-3">Assigned Loom Numbers</th>
                  <th className="px-3 py-3 text-center">Total Looms</th>
                  <th className="px-3 py-3 text-center">Reed (cm)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMappings.map((m, idx) => {
                  const looms = m.loomNumbers || [];
                  const isAllocated = looms.length > 0;
                  const colorConfig = COLOR_GROUPS.find(
                    (cg) => cg.id.toLowerCase() === (m.colorGroup || "").toLowerCase()
                  );

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Quality Code */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                              colorConfig?.dot || "bg-slate-400"
                            }`}
                          />
                          <span className="hover:underline cursor-pointer" onClick={() => handleOpenEdit(m)}>
                            {m.qualityCode}
                          </span>
                        </div>
                        {m.remarks && <div className="text-[10px] font-sans font-normal text-slate-400 mt-0.5">{m.remarks}</div>}
                      </td>

                      {/* Color Group */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            colorConfig?.badge || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {m.colorGroup || "—"}
                        </span>
                      </td>

                      {/* Denier & TW */}
                      <td className="px-3 py-3 text-center">
                        <div className="font-semibold text-slate-800">
                          {m.denier ? `${m.denier}D` : "MIX"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {m.tapeWidth ? `${m.tapeWidth}mm` : "—"}
                        </div>
                      </td>

                      {/* Colour / Bobbin Marking */}
                      <td className="px-3 py-3 text-center">
                        <div className="font-semibold text-slate-700">{m.colour || "—"}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {m.bobbinMarking ? `Mark: ${m.bobbinMarking}` : "—"}
                        </div>
                      </td>

                      {/* Assigned Looms */}
                      <td className="px-4 py-3">
                        {isAllocated ? (
                          <div className="flex flex-wrap items-center gap-1 max-w-md">
                            {looms.slice(0, 10).map((loomNo) => (
                              <span
                                key={loomNo}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold shadow-2xs"
                              >
                                #{loomNo}
                              </span>
                            ))}
                            {looms.length > 10 && (
                              <button
                                type="button"
                                onClick={() => setViewingMapping(m)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold hover:bg-indigo-200 transition-colors"
                              >
                                +{looms.length - 10} more
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium italic">
                            No looms assigned
                          </span>
                        )}
                      </td>

                      {/* Total Looms */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            m.totalLooms > 0
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {m.totalLooms} {m.totalLooms === 1 ? "Loom" : "Looms"}
                        </span>
                      </td>

                      {/* Reed Space */}
                      <td className="px-3 py-3 text-center font-mono text-slate-700">
                        {m.reedSpaceCm ? `${m.reedSpaceCm} cm` : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Edit Loom Mapping"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingId(m.id);
                              setDeleteConfirmOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Delete Loom Mapping"
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

      {/* Viewing All Looms Popover Modal */}
      {viewingMapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Loom Machine Allocations
                </div>
                <h3 className="text-lg font-bold font-mono text-slate-900">
                  {viewingMapping.qualityCode}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingMapping(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Total Looms: {viewingMapping.totalLooms}</span>
                <span className="text-slate-400">Color Group: {viewingMapping.colorGroup}</span>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-72 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {(viewingMapping.loomNumbers || []).map((num) => (
                  <div
                    key={num}
                    className="py-1.5 px-2 bg-slate-900 text-white font-mono text-center font-bold text-xs rounded-lg shadow-2xs"
                  >
                    #{num}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingMapping(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Loom Mapping Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl my-8 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {editingId ? "Edit Loom Machine Mapping" : "Add Quality / Loom Allocation"}
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingId ? formData.qualityCode : "New Quality to Loom Mapping"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Quality & Color Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quality Code / Name <span className="text-rose-500">*</span>
                  </label>
                  {tapePlantRecipes.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={formData.qualityCode}
                        onChange={(e) => handleQualitySelect(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                      >
                        <option value="">-- Select or type below --</option>
                        {tapePlantRecipes.map((r) => (
                          <option key={r.id} value={r.code}>
                            {r.code} ({r.colorGroup || "Uncategorized"} - {r.denier}D)
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Or custom quality name..."
                        value={formData.qualityCode}
                        onChange={(e) => setFormData({ ...formData, qualityCode: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. wOND/LPP/WH/500/67/S1"
                      value={formData.qualityCode}
                      onChange={(e) => setFormData({ ...formData, qualityCode: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Color Group (7 Categories)
                  </label>
                  <select
                    value={formData.colorGroup}
                    onChange={(e) => setFormData({ ...formData, colorGroup: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                  >
                    {COLOR_GROUPS.filter((cg) => cg.id !== "ALL").map((cg) => (
                      <option key={cg.id} value={cg.id}>
                        {cg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Technical Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Denier</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.denier ?? ""}
                    onChange={(e) => setFormData({ ...formData, denier: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    placeholder="e.g. 850"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tape Width (mm)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.tapeWidth ?? ""}
                    onChange={(e) => setFormData({ ...formData, tapeWidth: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    placeholder="e.g. 2.45 or 3.0"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Colour</label>
                  <input
                    type="text"
                    value={formData.colour}
                    onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="e.g. WHITE, YELLOW"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bobbin Marking</label>
                  <input
                    type="text"
                    value={formData.bobbinMarking}
                    onChange={(e) => setFormData({ ...formData, bobbinMarking: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="e.g. RED, Black"
                  />
                </div>
              </div>

              {/* Reed Space & Mesh */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reed Space (cm)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.reedSpaceCm ?? ""}
                    onChange={(e) => setFormData({ ...formData, reedSpaceCm: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    placeholder="e.g. 67.0"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mesh</label>
                  <input
                    type="text"
                    value={formData.mesh}
                    onChange={(e) => setFormData({ ...formData, mesh: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="e.g. 10x10, 12x12"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target PPM</label>
                  <input
                    type="number"
                    value={formData.targetPpm ?? ""}
                    onChange={(e) => setFormData({ ...formData, targetPpm: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    placeholder="e.g. 850"
                  />
                </div>
              </div>

              {/* Loom Numbers Section */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-900">
                      Assigned Loom Numbers (1 to {TOTAL_FACTORY_LOOMS})
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Type comma-separated numbers or click below to toggle loom assignments.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900 text-white font-mono">
                    {formData.selectedLooms.length} Looms Selected
                  </span>
                </div>

                {/* Comma-separated input */}
                <input
                  type="text"
                  placeholder="e.g. 6, 7, 8, 12, 14, 16, 20..."
                  value={formData.loomNumbersText}
                  onChange={(e) => handleLoomTextChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                />

                {/* Interactive Loom Grid 1 to 91 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Interactive Loom Matrix:</span>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Selected
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-slate-200" /> Available
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-400" /> Occupied by Other
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 sm:grid-cols-13 gap-1 p-2 bg-white rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                    {Array.from({ length: TOTAL_FACTORY_LOOMS }, (_, i) => i + 1).map((loomNo) => {
                      const isSelected = formData.selectedLooms.includes(loomNo);
                      const occupiedInfo = occupiedLoomsMap.get(loomNo);
                      const isOccupiedByOther =
                        occupiedInfo && (!editingId || occupiedInfo.id !== editingId);

                      return (
                        <button
                          key={loomNo}
                          type="button"
                          onClick={() => handleToggleLoomNumber(loomNo)}
                          title={
                            isOccupiedByOther
                              ? `Loom #${loomNo} currently allocated to ${occupiedInfo.qualityCode}`
                              : `Loom #${loomNo}`
                          }
                          className={`py-1 text-[11px] font-mono font-bold rounded transition-all ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700"
                              : isOccupiedByOther
                              ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {loomNo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. High volume production line, contract order..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSaving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  {formSaving ? "Saving..." : editingId ? "Update Mapping" : "Create Mapping"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Loom Mapping</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove this quality-to-loom machine mapping?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
