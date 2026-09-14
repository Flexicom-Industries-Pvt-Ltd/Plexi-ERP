"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, Plus, Edit2, Trash2, Package, AlertTriangle, X, Activity } from "lucide-react";
import { ItemType } from "@/generated/prisma";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
      url.searchParams.set("includeMovement", "true");

      const [resItems, resCat, resSub, resUom, resLoc] = await Promise.all([
        fetch(url).then(r => r.json()),
        fetch("/api/settings/master-data/category").then(r => r.json()),
        fetch("/api/settings/master-data/subCategory").then(r => r.json()),
        fetch("/api/settings/master-data/unitOfMeasurement").then(r => r.json()),
        fetch("/api/settings/master-data/location").then(r => r.json()),
      ]);

      const itemsList = Array.isArray(resItems)
        ? resItems
        : resItems?.data && Array.isArray(resItems.data)
        ? resItems.data
        : [];

      setItems(itemsList);
      setCategories(Array.isArray(resCat) ? resCat : resCat?.data || []);
      setSubCategories(Array.isArray(resSub) ? resSub : resSub?.data || []);
      setUoms(Array.isArray(resUom) ? resUom : resUom?.data || []);
      setLocations(Array.isArray(resLoc) ? resLoc : resLoc?.data || []);
    } catch {
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

  const handleOpenDelete = (item: { id: string; name: string }) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/inventory/items/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete item");
      }
      toast.success("Item deleted successfully");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSubCategories = subCategories.filter(sc => sc.categoryId === formData.categoryId);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between">
        <div className="flex flex-col sm:flex-row flex-1 gap-2.5 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs sm:text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="">All Item Types</option>
            {Object.values(ItemType).map(t => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        {canCreate && (
          <button
            onClick={() => handleOpenModal("CREATE")}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-primary text-white text-xs sm:text-sm font-bold rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
          >
            <Plus className="h-4 w-4" /> New Item
          </button>
        )}
      </div>

      {/* ── Main Container: Desktop Table & Mobile Cards ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Mobile View (Cards) */}
        <div className="block md:hidden divide-y divide-slate-100 p-2 sm:p-3 space-y-2.5 sm:space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse flex flex-col items-center">
              <Package className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs font-medium">
              No inventory items found.
            </div>
          ) : (
            items.map((item) => {
              const isLowStock = item.currentStock <= item.minimumStock && item.minimumStock > 0;
              const availableQty = item.movementSummary?.available ?? item.currentStock;
              const reservedQty = item.movementSummary?.reserved ?? item.reservedStock ?? 0;
              const consumedQty = item.movementSummary?.consumed ?? 0;

              return (
                <div key={item.id} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                  {/* Header: Item Code, Type pill, Status */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="font-mono font-black text-slate-900 text-sm block truncate">
                        {item.code}
                      </span>
                      <span className="text-xs text-slate-600 font-medium block truncate mt-0.5">
                        {item.name}
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shrink-0">
                      {item.itemType.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Category & Location Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-200/60 rounded text-slate-700 font-medium">
                      {item.category?.name || "Uncategorized"}
                    </span>
                    {item.location?.name && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded font-medium">
                        📍 {item.location.name}
                      </span>
                    )}
                  </div>
                  
                  {/* 3-Column Stock Breakdown */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 bg-white rounded-lg border border-slate-200/80 text-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Available</span>
                      <span className={`text-sm font-black block ${isLowStock ? "text-red-600" : "text-emerald-600"}`}>
                        {availableQty}
                      </span>
                      <span className="text-[9px] text-slate-400 block">{item.uom?.abbreviation}</span>
                    </div>
                    <div className="border-x border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Reserved</span>
                      <span className="text-sm font-black text-amber-600 block">
                        {reservedQty}
                      </span>
                      <span className="text-[9px] text-slate-400 block">{item.uom?.abbreviation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Consumed</span>
                      <span className="text-sm font-black text-slate-700 block">
                        {consumedQty}
                      </span>
                      <span className="text-[9px] text-slate-400 block">{item.uom?.abbreviation}</span>
                    </div>
                  </div>

                  {isLowStock && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Low Stock Alert (Min threshold: {item.minimumStock} {item.uom?.abbreviation})</span>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenModal("ADJUST", item)}
                        className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Activity className="h-3.5 w-3.5" /> Adjust
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenModal("EDIT", item)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleOpenDelete({ id: item.id, name: item.name })}
                        className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View (Table - 100% Intact) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code & Name</th>
                <th className="px-4 py-3 font-medium">Type & Category</th>
                <th className="px-4 py-3 font-medium text-right">Available</th>
                <th className="px-4 py-3 font-medium text-right">Reserved</th>
                <th className="px-4 py-3 font-medium text-right">Consumed</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <Package className="h-8 w-8 text-slate-300 mb-2" />
                      <p>Loading items...</p>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
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
                          {item.movementSummary?.available ?? item.currentStock} <span className="text-sm font-medium text-slate-500">{item.uom?.abbreviation}</span>
                        </div>
                        {isLowStock && (
                          <div className="text-[10px] text-red-500 font-medium flex items-center justify-end gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3" /> Low Stock (Min: {item.minimumStock})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 font-medium">
                        {item.movementSummary?.reserved ?? item.reservedStock ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 font-medium">
                        {item.movementSummary?.consumed ?? 0}
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
                              onClick={() => handleOpenDelete({ id: item.id, name: item.name })}
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

      {/* Item Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 sticky top-0 bg-white z-10">
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                {modalMode === "CREATE" ? "Create New Item" : modalMode === "EDIT" ? "Edit Item" : "Manual Stock Adjustment"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto">
              {modalMode === "ADJUST" ? (
                <form id="adjustForm" onSubmit={handleAdjustSubmit} className="space-y-4">
                  <div className="p-3.5 bg-amber-50 text-amber-900 text-xs sm:text-sm rounded-lg border border-amber-200">
                    <AlertTriangle className="h-4 w-4 inline mr-1.5 -mt-0.5 text-amber-600" />
                    <strong>Warning:</strong> Manual adjustments bypass Gate and Production workflows and are logged for auditing.
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider block">Item</label>
                    <div className="mt-1 font-bold text-slate-800">{selectedItem?.code} - {selectedItem?.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-medium">Current Stock: {selectedItem?.currentStock} {selectedItem?.uom?.abbreviation}</div>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider block">Adjustment Quantity (+/-) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={adjustForm.quantity}
                      onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-bold"
                      placeholder="e.g. -5 to write off, 10 to add"
                    />
                    <p className="text-xs text-slate-500 mt-1">New Stock will be: {selectedItem?.currentStock + adjustForm.quantity} {selectedItem?.uom?.abbreviation}</p>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider block">Reason / Remarks *</label>
                    <textarea
                      required
                      value={adjustForm.remarks}
                      onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm min-h-[80px] resize-none"
                      placeholder="Explain why this manual adjustment is needed..."
                    />
                  </div>
                </form>
              ) : (
                <form id="itemForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-mono font-bold"
                    placeholder="e.g. RM-001"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium"
                    placeholder="e.g. Polypropylene Granules"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    placeholder="Optional description"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Item Type *</label>
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

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Unit of Measurement (UOM) *</label>
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

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Category</label>
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

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Sub-Category</label>
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

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Default Location</label>
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

                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Minimum Stock Level</label>
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

                <div className="md:col-span-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                    />
                    <span className="text-xs sm:text-sm font-bold text-slate-700">Active (Available for use)</span>
                  </label>
                </div>
              </form>
              )}
            </div>
            
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form={modalMode === "ADJUST" ? "adjustForm" : "itemForm"}
                disabled={submitting}
                className={`px-5 py-2 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors ${
                  modalMode === "ADJUST" ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary/90"
                }`}
              >
                {submitting ? "Saving..." : modalMode === "CREATE" ? "Create Item" : modalMode === "EDIT" ? "Save Changes" : "Confirm Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Inventory Item"
        itemName={deleteTarget?.name}
        itemType="inventory item"
        isLoading={isDeleting}
      />
    </div>
  );
}
