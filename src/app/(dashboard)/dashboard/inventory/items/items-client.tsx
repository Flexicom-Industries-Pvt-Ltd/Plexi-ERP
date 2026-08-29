"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, Plus, Edit2, Trash2, Package, AlertTriangle, ArrowRight, X, Activity } from "lucide-react";
import Link from "next/link";
import { ItemType } from "@/generated/prisma";

export function InventoryItemsClient({ 
  canCreate, 
  canUpdate, 
  canDelete 
}: { 
  canCreate: boolean; 
  canUpdate: boolean; 
  canDelete: boolean; 
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT" | "ADJUST">("CREATE");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Adjustment form state
  const [adjustForm, setAdjustForm] = useState({ quantity: 0, remarks: "" });
  
  // Reference data for dropdowns
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    itemType: "RAW_MATERIAL",
    categoryId: "",
    subCategoryId: "",
    uomId: "",
    locationId: "",
    minimumStock: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/inventory/items", window.location.origin);
      if (search) url.searchParams.set("search", search);
      if (typeFilter) url.searchParams.set("type", typeFilter);

      const [resItems, resCat, resSub, resUom, resLoc] = await Promise.all([
        fetch(url).then(r => r.json()),
        fetch("/api/settings/master-data/category").then(r => r.json()),
        fetch("/api/settings/master-data/subcategory").then(r => r.json()),
        fetch("/api/settings/master-data/unitofmeasurement").then(r => r.json()),
        fetch("/api/settings/master-data/location").then(r => r.json()),
      ]);

      setItems(Array.isArray(resItems) ? resItems : []);
      setCategories(Array.isArray(resCat) ? resCat : []);
      setSubCategories(Array.isArray(resSub) ? resSub : []);
      setUoms(Array.isArray(resUom) ? resUom : []);
      setLocations(Array.isArray(resLoc) ? resLoc : []);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (mode: "CREATE" | "EDIT" | "ADJUST", item?: any) => {
    setModalMode(mode);
    setSelectedItem(item || null);
    if (mode === "EDIT" && item) {
      setFormData({
        code: item.code,
        name: item.name,
        description: item.description || "",
        itemType: item.itemType,
        categoryId: item.categoryId || "",
        subCategoryId: item.subCategoryId || "",
        uomId: item.uomId,
        locationId: item.locationId || "",
        minimumStock: item.minimumStock,
        isActive: item.isActive,
      });
    } else if (mode === "ADJUST" && item) {
      setAdjustForm({ quantity: 0, remarks: "" });
    } else {
      setFormData({
        code: "", name: "", description: "", itemType: "RAW_MATERIAL",
        categoryId: "", subCategoryId: "", uomId: uoms[0]?.id || "", locationId: "",
        minimumStock: 0, isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.quantity || adjustForm.quantity === 0) return toast.error("Quantity cannot be 0");
    if (!adjustForm.remarks) return toast.error("Remarks are required for manual adjustments");

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/transactions/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItem.id,
          adjustmentQuantity: Number(adjustForm.quantity),
          remarks: adjustForm.remarks,
        }),
      });

      if (!res.ok) throw new Error("Failed to adjust stock");
      toast.success("Stock adjusted successfully");
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name || !formData.uomId) {
      return toast.error("Please fill required fields (Code, Name, UOM)");
    }
    setSubmitting(true);
    try {
      const url = modalMode === "CREATE" ? "/api/inventory/items" : `/api/inventory/items/${selectedItem.id}`;
      const method = modalMode === "CREATE" ? "POST" : "PATCH";
      
      const payload = {
        ...formData,
        minimumStock: Number(formData.minimumStock)
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save item");
      }

      toast.success(`Item ${modalMode === "CREATE" ? "created" : "updated"} successfully`);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/inventory/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      toast.success("Item deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredSubCategories = subCategories.filter(sc => sc.categoryId === formData.categoryId);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="">All Types</option>
            {Object.values(ItemType).map(t => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        {canCreate && (
          <button
            onClick={() => handleOpenModal("CREATE")}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" /> New Item
          </button>
        )}
      </div>

      {/* ── Desktop Table & Mobile Cards ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Mobile View (Cards) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse flex flex-col items-center">
              <Package className="h-8 w-8 text-slate-300 mb-2" />
              <p>Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No inventory items found.
            </div>
          ) : (
            items.map((item) => {
              const isLowStock = item.currentStock <= item.minimumStock && item.minimumStock > 0;
              return (
                <div key={item.id} className="p-4 flex flex-col gap-3 active:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800 text-base">{item.code}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">{item.name}</div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      {item.itemType.replace(/_/g, " ")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="text-xs text-slate-500">
                      <div>{item.category?.name || "Uncategorized"}</div>
                      <div className="mt-1">{item.location?.name || "No Location"}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-lg ${isLowStock ? "text-red-600" : "text-slate-800"}`}>
                        {item.currentStock} <span className="text-sm font-medium text-slate-500">{item.uom?.abbreviation}</span>
                      </div>
                      {isLowStock && (
                        <div className="text-[10px] text-red-500 font-medium flex items-center justify-end gap-1 mt-0.5">
                          <AlertTriangle className="h-3 w-3" /> Low Stock
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenModal("ADJUST", item)}
                        className="p-2 text-slate-400 hover:text-amber-600 rounded-md hover:bg-amber-50 transition-colors"
                        title="Manual Adjust Stock"
                      >
                        <Activity className="h-4 w-4" />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenModal("EDIT", item)}
                        className="p-2 text-slate-400 hover:text-primary rounded-md hover:bg-primary/10 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code & Name</th>
                <th className="px-4 py-3 font-medium">Type & Category</th>
                <th className="px-4 py-3 font-medium text-right">Current Stock</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <Package className="h-8 w-8 text-slate-300 mb-2" />
                      <p>Loading items...</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLowStock = item.currentStock <= item.minimumStock && item.minimumStock > 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.code}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{item.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 mb-1 block w-max">
                          {item.itemType.replace(/_/g, " ")}
                        </span>
                        <div className="text-slate-500 text-xs">
                          {item.category?.name || "Uncategorized"} {item.subCategory ? `› ${item.subCategory.name}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`font-bold text-base ${isLowStock ? "text-red-600" : "text-slate-800"}`}>
                          {item.currentStock} <span className="text-sm font-medium text-slate-500">{item.uom?.abbreviation}</span>
                        </div>
                        {isLowStock && (
                          <div className="text-[10px] text-red-500 font-medium flex items-center justify-end gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3" /> Low Stock (Min: {item.minimumStock})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.location?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate && (
                            <button
                              onClick={() => handleOpenModal("ADJUST", item)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-md hover:bg-amber-50 transition-colors"
                              title="Manual Adjust Stock"
                            >
                              <Activity className="h-4 w-4" />
                            </button>
                          )}
                          {canUpdate && (
                            <button
                              onClick={() => handleOpenModal("EDIT", item)}
                              className="p-1.5 text-slate-400 hover:text-primary rounded-md hover:bg-primary/10 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                {modalMode === "CREATE" ? "Create New Item" : modalMode === "EDIT" ? "Edit Item" : "Manual Stock Adjustment"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {modalMode === "ADJUST" ? (
                <form id="adjustForm" onSubmit={handleAdjustSubmit} className="space-y-4">
                  <div className="p-4 bg-amber-50 text-amber-800 text-sm rounded-lg border border-amber-200">
                    <AlertTriangle className="h-4 w-4 inline mr-2 -mt-0.5" />
                    <strong>Warning:</strong> Manual adjustments skip the normal Gate/Production workflows and are deeply logged for auditing.
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Item</label>
                    <div className="mt-1 font-medium text-slate-800">{selectedItem?.code} - {selectedItem?.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Current Stock: {selectedItem?.currentStock} {selectedItem?.uom?.abbreviation}</div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Adjustment Quantity (+/-) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={adjustForm.quantity}
                      onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                      placeholder="e.g. -5 to write off, 10 to add"
                    />
                    <p className="text-xs text-slate-500 mt-1">New Stock will be: {selectedItem?.currentStock + adjustForm.quantity} {selectedItem?.uom?.abbreviation}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Reason/Remarks *</label>
                    <textarea
                      required
                      value={adjustForm.remarks}
                      onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm min-h-[80px]"
                      placeholder="Explain why this manual adjustment is needed..."
                    />
                  </div>
                </form>
              ) : (
                <form id="itemForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    placeholder="e.g. RM-001"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    placeholder="e.g. Polypropylene Granules"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    placeholder="Optional description"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Item Type *</label>
                  <select
                    required
                    value={formData.itemType}
                    onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                  >
                    {Object.values(ItemType).map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Unit of Measurement (UOM) *</label>
                  <select
                    required
                    value={formData.uomId}
                    onChange={(e) => setFormData({ ...formData, uomId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                  >
                    <option value="">Select UOM...</option>
                    {uoms.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value, subCategoryId: "" })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                  >
                    <option value="">None</option>
                    {categories.filter(c => c.itemType === formData.itemType).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Sub-Category</label>
                  <select
                    value={formData.subCategoryId}
                    onChange={(e) => setFormData({ ...formData, subCategoryId: e.target.value })}
                    disabled={!formData.categoryId || filteredSubCategories.length === 0}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">None</option>
                    {filteredSubCategories.map(sc => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Default Location</label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
                  >
                    <option value="">None</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Minimum Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  />
                  <p className="text-[10px] text-slate-500">Alert triggers if stock falls below this number.</p>
                </div>

                <div className="md:col-span-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-slate-700">Active (Available for use)</span>
                  </label>
                </div>
              </form>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form={modalMode === "ADJUST" ? "adjustForm" : "itemForm"}
                disabled={submitting}
                className={`px-6 py-2 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors ${
                  modalMode === "ADJUST" ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary/90"
                }`}
              >
                {submitting ? "Saving..." : modalMode === "CREATE" ? "Create Item" : modalMode === "EDIT" ? "Save Changes" : "Confirm Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
