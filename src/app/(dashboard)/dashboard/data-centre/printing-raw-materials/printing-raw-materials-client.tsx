"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Droplets,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  Gauge,
  Percent,
  SlidersHorizontal,
  X,
  Layers,
  Scale,
} from "lucide-react";
import { PrintingRawMaterialMasterItem } from "@/lib/printing/printing-types";

export function PrintingRawMaterialsClient() {
  const [items, setItems] = useState<PrintingRawMaterialMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [showInactive, setShowInactive] = useState(false);

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PrintingRawMaterialMasterItem | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("INK");
  const [unit, setUnit] = useState("LITRE");
  const [conversionFactor, setConversionFactor] = useState<number | string>(0.82);
  const [defaultRatio, setDefaultRatio] = useState<number | string>("");
  const [targetMileage, setTargetMileage] = useState<number | string>("");
  const [remarks, setRemarks] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (showInactive) params.set("activeOnly", "false");

      const res = await fetch(`/api/data-centre/printing-raw-materials?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load printing raw materials");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load printing raw materials");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showInactive]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openAddModal = () => {
    setEditingItem(null);
    setName("");
    setCode("");
    setCategory("INK");
    setUnit("LITRE");
    setConversionFactor(0.82);
    setDefaultRatio("");
    setTargetMileage("");
    setRemarks("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (item: PrintingRawMaterialMasterItem) => {
    setEditingItem(item);
    setName(item.name || "");
    setCode(item.code || "");
    setCategory(item.category || "INK");
    setUnit(item.unit || "LITRE");
    setConversionFactor(item.conversionFactor ?? 0.82);
    setDefaultRatio(item.defaultRatio ?? "");
    setTargetMileage(item.targetMileage ?? "");
    setRemarks(item.remarks || "");
    setIsActive(item.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Material Name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingItem?.id,
        name: name.trim(),
        code: code.trim() || null,
        category,
        unit,
        conversionFactor: Number(conversionFactor) > 0 ? Number(conversionFactor) : 0.82,
        defaultRatio: defaultRatio !== "" ? Number(defaultRatio) : null,
        targetMileage: targetMileage !== "" ? Number(targetMileage) : null,
        remarks: remarks.trim() || null,
        isActive,
      };

      const res = await fetch("/api/data-centre/printing-raw-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save raw material");
      }

      toast.success(
        editingItem ? "Raw material updated successfully" : "Raw material registered successfully"
      );
      setModalOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to save raw material");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, matName: string) => {
    if (!confirm(`Are you sure you want to delete "${matName}"?`)) return;

    try {
      const res = await fetch(`/api/data-centre/printing-raw-materials?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete raw material");
      }
      toast.success("Raw material deleted");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete raw material");
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [items, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const inks = items.filter((i) => i.category === "INK").length;
    const solvents = items.filter((i) => i.category === "SOLVENT").length;
    const litreItems = items.filter((i) => (i.unit || "LITRE").toUpperCase() === "LITRE").length;
    return { total, inks, solvents, litreItems };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Materials</span>
            <Droplets className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-1">Configured in master</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Inks & Shades</span>
            <Tag className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2">{stats.inks}</div>
          <div className="text-xs text-slate-500 mt-1">Flexo print inks</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Solvents & Thinners</span>
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{stats.solvents}</div>
          <div className="text-xs text-slate-500 mt-1">Ethyl Acetate, Methanol</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>0.82 L to Kg Rule</span>
            <Scale className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700 mt-2">{stats.litreItems}</div>
          <div className="text-xs text-slate-500 mt-1">Automated conversion</div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by material name, code, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={() => fetchItems()}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-md hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center border border-slate-200 rounded-md p-0.5 bg-slate-50 text-xs">
            {["ALL", "INK", "SOLVENT", "ADDITIVE"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-sm font-medium transition-all ${
                  categoryFilter === cat
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat === "ALL" ? "All Categories" : cat}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded-sm border-slate-300 text-primary focus:ring-primary/20"
            />
            Show Inactive
          </label>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-md text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Raw Material
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-600 tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">#</th>
                <th className="px-4 py-3.5">Material Name</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5 text-center">Unit</th>
                <th className="px-4 py-3.5 text-center">Density Factor (L to Kg)</th>
                <th className="px-4 py-3.5 text-right">Default Ratio</th>
                <th className="px-4 py-3.5 text-right">Target Mileage</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading printing raw materials...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <Droplets className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No printing raw materials found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      !item.isActive ? "opacity-60 bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-center text-xs font-semibold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      {item.code && (
                        <div className="text-xs font-mono text-slate-500 mt-0.5">{item.code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          item.category === "INK"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : item.category === "SOLVENT"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm">
                        {item.unit || "LITRE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs font-bold text-blue-700">
                      {(item.conversionFactor ?? 0.82).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-purple-700 font-semibold">
                      {item.defaultRatio !== null && item.defaultRatio !== undefined
                        ? `${item.defaultRatio}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-emerald-700 font-semibold">
                      {item.targetMileage !== null && item.targetMileage !== undefined
                        ? `${item.targetMileage.toLocaleString()} m/kg`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 hover:text-slate-900 transition-colors"
                        title="Edit material"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-1.5 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-slate-900">
                  {editingItem ? "Edit Printing Raw Material" : "Register Printing Raw Material"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Material Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solvent Ink Red, Ethyl Acetate, Primer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Material Code (SKU)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INK-RED-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="INK">INK</option>
                    <option value="SOLVENT">SOLVENT</option>
                    <option value="ADDITIVE">ADDITIVE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Unit of Measurement
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    <option value="LITRE">LITRE (L)</option>
                    <option value="KG">KG (Kilograms)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Litre to Kg Factor (0.82)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="5"
                      value={conversionFactor}
                      onChange={(e) => setConversionFactor(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                      x 0.82
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    1 Litre = 0.82 Kg density conversion
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Default Ratio (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="e.g. 25.0"
                      value={defaultRatio}
                      onChange={(e) => setDefaultRatio(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Target Mileage (m/kg)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 15000"
                      value={targetMileage}
                      onChange={(e) => setTargetMileage(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                    />
                    <Gauge className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Remarks / Application Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Specific viscosity, dilution guidelines, or manufacturer notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveMat"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded-sm border-slate-300 text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="isActiveMat" className="text-sm font-medium text-slate-700 cursor-pointer">
                    Active for daily production & consumption entry
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-xs transition-colors flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {editingItem ? "Update Material" : "Save Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
