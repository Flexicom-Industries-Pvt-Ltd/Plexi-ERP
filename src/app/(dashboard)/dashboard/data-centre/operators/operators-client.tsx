"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone,
  Shield,
  Layers,
  Sparkles,
  SlidersHorizontal,
  X,
  Plus,
  Briefcase,
  Clock,
  Building,
} from "lucide-react";

export interface OperatorItem {
  id: string;
  name: string;
  code: string | null;
  section: string;
  sectionName: string | null;
  phone: string | null;
  shiftPreference: string | null;
  designation: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PLANT_SECTIONS = [
  { value: "ALL", label: "All Sections", badgeColor: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "TAPE_PLANT", label: "Tape Plant", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "LOOM", label: "Circular Loom", badgeColor: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "LAMINATION", label: "Extrusion Lamination", badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { value: "PRINTING", label: "Flexo Printing", badgeColor: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "CUTTING", label: "Cutting & Stitching", badgeColor: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "QUALITY_CONTROL", label: "Quality Control", badgeColor: "bg-rose-100 text-rose-800 border-rose-200" },
  { value: "RECYCLING_PLANT", label: "Recycling Plant", badgeColor: "bg-teal-100 text-teal-800 border-teal-200" },
  { value: "MAINTENANCE", label: "Maintenance", badgeColor: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "SECURITY_GATE", label: "Security & Gate", badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { value: "DISPATCH", label: "Dispatch & Warehouse", badgeColor: "bg-violet-100 text-violet-800 border-violet-200" },
];

export function getSectionMeta(sectionValue: string) {
  const s = PLANT_SECTIONS.find((p) => p.value.toUpperCase() === (sectionValue || "").toUpperCase());
  return s || {
    value: sectionValue,
    label: sectionValue?.replace(/_/g, " ") || "General",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
  };
}

export function OperatorsClient() {
  const [operators, setOperators] = useState<OperatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [activeSection, setActiveSection] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorItem | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formSection, setFormSection] = useState("TAPE_PLANT");
  const [formSectionName, setFormSectionName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formDesignation, setFormDesignation] = useState("Operator");
  const [formShift, setFormShift] = useState("A");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeSection !== "ALL") params.set("section", activeSection);
      if (searchQuery) params.set("search", searchQuery);
      if (showInactive) params.set("activeOnly", "false");

      const res = await fetch(`/api/data-centre/operators?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load operators");
      const json = await res.json();
      setOperators(json);
    } catch (err: any) {
      toast.error(err.message || "Failed to load operators");
    } finally {
      setLoading(false);
    }
  }, [activeSection, searchQuery, showInactive]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const handleOpenCreateModal = () => {
    setEditingOperator(null);
    setFormName("");
    setFormCode("");
    setFormSection(activeSection !== "ALL" ? activeSection : "TAPE_PLANT");
    setFormSectionName("");
    setFormPhone("");
    setFormDesignation("Operator");
    setFormShift("A");
    setFormNotes("");
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (op: OperatorItem) => {
    setEditingOperator(op);
    setFormName(op.name || "");
    setFormCode(op.code || "");
    setFormSection(op.section || "TAPE_PLANT");
    setFormSectionName(op.sectionName || "");
    setFormPhone(op.phone || "");
    setFormDesignation(op.designation || "Operator");
    setFormShift(op.shiftPreference || "A");
    setFormNotes(op.notes || "");
    setFormIsActive(op.isActive);
    setModalOpen(true);
  };

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Operator name is required");
      return;
    }
    if (!formSection.trim()) {
      toast.error("Please select a plant section");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim() ? formCode.trim().toUpperCase() : null,
        section: formSection.trim().toUpperCase(),
        sectionName: formSectionName.trim() || undefined,
        phone: formPhone.trim() || null,
        designation: formDesignation.trim() || "Operator",
        shiftPreference: formShift.trim() || null,
        notes: formNotes.trim() || null,
        isActive: formIsActive,
      };

      const url = editingOperator
        ? `/api/data-centre/operators/${editingOperator.id}`
        : "/api/data-centre/operators";
      const method = editingOperator ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save operator");
      }

      toast.success(
        editingOperator
          ? `Updated operator ${payload.name}`
          : `Registered operator ${payload.name}`
      );
      setModalOpen(false);
      fetchOperators();
    } catch (err: any) {
      toast.error(err.message || "Failed to save operator");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOperator = async (op: OperatorItem) => {
    if (!confirm(`Are you sure you want to delete operator "${op.name}"?`)) return;

    try {
      const res = await fetch(`/api/data-centre/operators/${op.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete operator");

      toast.success(`Operator ${op.name} deleted`);
      fetchOperators();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete operator");
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/data-centre/operators/seed", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to seed operators");

      toast.success(json.message || "Standard operators seeded successfully");
      fetchOperators();
    } catch (err: any) {
      toast.error(err.message || "Failed to seed operators");
    } finally {
      setSeeding(false);
    }
  };

  // Metric stats
  const metrics = useMemo(() => {
    const total = operators.length;
    const active = operators.filter((o) => o.isActive).length;
    const tapePlant = operators.filter((o) => o.section.toUpperCase() === "TAPE_PLANT").length;
    const loom = operators.filter((o) => o.section.toUpperCase() === "LOOM").length;
    const printing = operators.filter((o) => o.section.toUpperCase() === "PRINTING").length;

    return { total, active, tapePlant, loom, printing };
  }, [operators]);

  return (
    <div className="space-y-6 font-sans">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{metrics.total}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Operators ({metrics.active} Active)
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{metrics.tapePlant}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tape Plant Operators
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{metrics.loom}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Circular Loom
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{metrics.printing}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Printing & Other
            </div>
          </div>
        </div>
      </div>

      {/* Main Section Filter Tabs & Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search & Inactive toggle */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search operator by name, code, phone, designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold inline-flex items-center gap-1.5 transition-colors ${
                showInactive
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{showInactive ? "Showing Inactive" : "Active Only"}</span>
            </button>

            <button
              type="button"
              onClick={fetchOperators}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedDefaults}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{seeding ? "Seeding..." : "Seed Plant Operators"}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="text-xs px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>Register Operator</span>
            </button>
          </div>
        </div>

        {/* Section Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar border-t border-slate-100 pt-3">
          {PLANT_SECTIONS.map((sec) => {
            const isActive = activeSection === sec.value;
            return (
              <button
                key={sec.value}
                onClick={() => setActiveSection(sec.value)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all text-xs flex items-center gap-1.5 border ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Operators List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span>Loading registered plant operators...</span>
          </div>
        ) : operators.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No operators found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No operators match your current filter. You can register new operators or seed the standard plant catalog.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={handleSeedDefaults}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700"
              >
                Seed Default Operators
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-bold"
              >
                Register First Operator
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Operator Name</th>
                  <th className="py-3 px-4">Code / Badge</th>
                  <th className="py-3 px-4">Plant Section</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Shift Pref</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operators.map((op) => {
                  const meta = getSectionMeta(op.section);
                  return (
                    <tr key={op.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {op.name ? op.name.slice(0, 2).toUpperCase() : "OP"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{op.name}</div>
                            {op.notes && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">{op.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {op.code ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                            {op.code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.badgeColor}`}
                        >
                          {op.sectionName || meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {op.designation || "Operator"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <Clock className="h-3 w-3 text-slate-400" />
                          Shift {op.shiftPreference || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {op.phone ? (
                          <span className="inline-flex items-center gap-1 font-mono text-slate-700">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {op.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {op.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(op)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-primary hover:bg-slate-100 transition-colors"
                            title="Edit Operator"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOperator(op)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Operator"
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

      {/* Modal Dialog for Registering / Editing Operator */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingOperator ? "Edit Operator Details" : "Register New Plant Operator"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign section, designation, and shift information
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOperator} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Operator Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Employee / Badge Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OP-TP-01"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Plant Section <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    {PLANT_SECTIONS.filter((s) => s.value !== "ALL").map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Extrusion Operator"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Shift Preference
                  </label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="A">Shift A (Morning)</option>
                    <option value="B">Shift B (Evening)</option>
                    <option value="C">Shift C (Night)</option>
                    <option value="GENERAL">General Shift</option>
                    <option value="ALL">Rotational / All Shifts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formIsActive ? "true" : "false"}
                    onChange={(e) => setFormIsActive(e.target.value === "true")}
                    className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Notes & Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Expert in PP formulation, line speed tuning..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-all shadow-xs"
                >
                  {saving ? "Saving..." : editingOperator ? "Update Operator" : "Register Operator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
