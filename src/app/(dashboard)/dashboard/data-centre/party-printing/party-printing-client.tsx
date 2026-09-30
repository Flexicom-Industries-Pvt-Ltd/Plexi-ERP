"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Printer,
  Building,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  Gauge,
  SlidersHorizontal,
  X,
  Layers,
  MapPin,
} from "lucide-react";
import { PartyPrintingDetailItem } from "@/lib/printing/printing-types";

export function PartyPrintingClient() {
  const [items, setItems] = useState<PartyPrintingDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PartyPrintingDetailItem | null>(null);

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [unitName, setUnitName] = useState("");
  const [grade, setGrade] = useState("");
  const [drumSize, setDrumSize] = useState("");
  const [targetProductionMtrs, setTargetProductionMtrs] = useState<number | string>("");
  const [quality, setQuality] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (showInactive) params.set("activeOnly", "false");

      const res = await fetch(`/api/data-centre/party-printing-details?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load party printing details");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load party printing details");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showInactive]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openAddModal = () => {
    setEditingItem(null);
    setCompanyName("");
    setUnitName("");
    setGrade("");
    setDrumSize("");
    setTargetProductionMtrs("");
    setQuality("");
    setRemarks("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (item: PartyPrintingDetailItem) => {
    setEditingItem(item);
    setCompanyName(item.companyName || "");
    setUnitName(item.unitName || "");
    setGrade(item.grade || "");
    setDrumSize(item.drumSize || "");
    setTargetProductionMtrs(item.targetProductionMtrs ?? "");
    setQuality(item.quality || "");
    setRemarks(item.remarks || "");
    setIsActive(item.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("Company Name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingItem?.id,
        companyName: companyName.trim(),
        unitName: unitName.trim() || null,
        grade: grade.trim() || null,
        drumSize: drumSize.trim() || null,
        targetProductionMtrs: targetProductionMtrs ? Number(targetProductionMtrs) : null,
        quality: quality.trim() || null,
        remarks: remarks.trim() || null,
        isActive,
      };

      const res = await fetch("/api/data-centre/party-printing-details", {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save record");

      toast.success(editingItem ? "Party printing detail updated" : "New party printing detail added");
      setModalOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Error saving record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete printing details for "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/data-centre/party-printing-details?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete record");

      toast.success("Party printing detail deleted");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    }
  };

  // KPIs
  const totalParties = useMemo(() => {
    const unique = new Set(items.map((i) => i.companyName.toLowerCase().trim()));
    return unique.size;
  }, [items]);

  const activeCount = useMemo(() => items.filter((i) => i.isActive).length, [items]);

  const uniqueUnits = useMemo(() => {
    const units = new Set(items.map((i) => (i.unitName || "").toLowerCase().trim()).filter(Boolean));
    return units.size;
  }, [items]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{totalParties}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unique Companies</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{activeCount}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Specs</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{uniqueUnits}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plant Units</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Printer className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{items.length}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Records</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, unit, grade, or drum size..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 whitespace-nowrap cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300 text-primary focus:ring-primary"
            />
            Show Inactive
          </label>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={fetchItems}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Party Details
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Unit Name</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Drum Size / Cut Length</th>
                <th className="py-3 px-4 text-right">Target Prod (m)</th>
                <th className="py-3 px-4">Quality</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading party printing details...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No party printing details found. Click &quot;Add Party Details&quot; to create one.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-400 text-xs">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-primary shrink-0" />
                        <span>{item.companyName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {item.unitName || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {item.grade ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {item.grade}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {item.drumSize || <span className="text-slate-400 font-sans">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                      {item.targetProductionMtrs ? Number(item.targetProductionMtrs).toLocaleString() : <span className="text-slate-400 font-sans">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {item.quality || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.companyName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">
                    {editingItem ? "Edit Party Printing Detail" : "Add Party Printing Detail"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Register company, unit specifications, grade, and cylinder drum size
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ambuja, UltraTech"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ropar, Unit-1, Darlaghat"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Grade
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PPC, OPC 53, Super"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Drum Size / Cut Length
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20mm, 380mm, D-14"
                    value={drumSize}
                    onChange={(e) => setDrumSize(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Production (in Metre)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2500, 5000"
                    value={targetProductionMtrs}
                    onChange={(e) => setTargetProductionMtrs(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Default Quality
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ambuja, Ambuja PPC"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Remarks / Specifications Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional ink specs, cylinder marks, or customer instructions..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active in Printing autocomplete & reports
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                >
                  {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {editingItem ? "Update Details" : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
