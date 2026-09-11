"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Truck,
  User,
  Phone,
  Briefcase,
  FileText,
  Package,
  PlusCircle,
  ArrowLeft,
  Search,
  X,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { GatePurpose } from "@/generated/prisma";
import { cn } from "@/lib/utils";

const MATERIAL_TYPE_OPTIONS = [
  { label: "Raw materials", value: "RAW_MATERIALS" },
  { label: "Bobbins", value: "BOBBINS" },
  { label: "PP rolls", value: "PP_ROLLS" },
  { label: "LPP rolls", value: "LPP_ROLLS" },
  { label: "Laminated rolls", value: "LAMINATED_ROLLS" },
  { label: "Printed rolls", value: "PRINTED_ROLLS" },
  { label: "Cut material", value: "CUT_MATERIAL" },
  { label: "Work-in-progress", value: "WORK_IN_PROGRESS" },
  { label: "Finished bags", value: "FINISHED_BAGS" },
  { label: "Bales", value: "BALES" },
  { label: "Scrap", value: "SCRAP" },
  { label: "RP granules", value: "RP_GRANULES" },
  { label: "External materials", value: "EXTERNAL_MATERIALS" },
];

const COMMON_UNITS = ["kg", "ton", "bag", "pcs", "meter", "roll", "bale", "box"];

interface StockItemRowData {
  id: string;
  stockId: string;
  materialName: string;
  materialType: string;
  quantity: string;
  unit: string;
  batchLot: string;
}

const createEmptyStockItem = (): StockItemRowData => ({
  id: Math.random().toString(36).slice(2, 9),
  stockId: "",
  materialName: "",
  materialType: "RAW_MATERIALS",
  quantity: "",
  unit: "kg",
  batchLot: "",
});

export function NewGateClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    truckNumber: string;
    driverName: string;
    driverContact: string;
    driverLicenseNumber: string;
    transporter: string;
    supplierCustomer: string;
    purpose: GatePurpose;
  }>({
    truckNumber: "",
    driverName: "",
    driverContact: "",
    driverLicenseNumber: "",
    transporter: "",
    supplierCustomer: "",
    purpose: GatePurpose.LOADING,
  });

  const [stockItems, setStockItems] = useState<StockItemRowData[]>([createEmptyStockItem()]);

  const [driverSearchTerm, setDriverSearchTerm] = useState("");
  const [suggestedDrivers, setSuggestedDrivers] = useState<any[]>([]);
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [isDriverLocked, setIsDriverLocked] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      if (driverSearchTerm.length < 2) {
        setSuggestedDrivers([]);
        return;
      }
      try {
        const res = await fetch(`/api/drivers/search?q=${encodeURIComponent(driverSearchTerm)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestedDrivers(data);
        }
      } catch (err) {
        console.error("Failed to fetch drivers", err);
      }
    };
    
    const timeout = setTimeout(fetchDrivers, 300);
    return () => clearTimeout(timeout);
  }, [driverSearchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDriverSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDriver = (driver: any) => {
    setFormData({
      ...formData,
      driverName: driver.name,
      driverContact: driver.phone,
      driverLicenseNumber: driver.licenseNumber || "",
    });
    setDriverSearchTerm(driver.phone);
    setIsDriverLocked(true);
    setShowDriverSuggestions(false);
  };

  const handleClearDriver = () => {
    setFormData({ ...formData, driverName: "", driverContact: "", driverLicenseNumber: "" });
    setDriverSearchTerm("");
    setIsDriverLocked(false);
  };

  // Stock Row Handlers
  const handleAddStockItem = () => {
    setStockItems((prev) => [...prev, createEmptyStockItem()]);
  };

  const handleRemoveStockItem = (id: string) => {
    setStockItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const handleUpdateStockItem = (id: string, updates: Partial<StockItemRowData>) => {
    setStockItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.truckNumber || !formData.driverName) {
      toast.error("Truck number and driver name are required");
      return;
    }

    // Filter valid stock items
    const validStockItems = stockItems
      .filter((item) => item.materialName.trim() && item.quantity !== "")
      .map((item) => ({
        stockId: item.stockId || undefined,
        materialName: item.materialName.trim(),
        materialType: item.materialType,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || "kg",
        batchLot: item.batchLot.trim() || undefined,
      }));

    if (
      (formData.purpose === GatePurpose.LOADING || formData.purpose === GatePurpose.UNLOADING) &&
      validStockItems.length === 0
    ) {
      toast.error("Please add at least one consignment stock item with material name and quantity.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          stockItems: validStockItems,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create entry");
      }
      const data = await res.json();
      toast.success("Gate entry created successfully with consignment stock items");
      router.push(`/dashboard/gate/${data.entryNumber}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while creating the entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Truck Arrival & Gate Registration
        </h2>
        <Link href="/dashboard/gate" className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Vehicle & Driver Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Truck Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Vehicle Info
            </h3>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Truck Number *</label>
              <input
                type="text"
                placeholder="e.g. WB11A1234"
                value={formData.truckNumber}
                onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono font-bold uppercase"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Transporter</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Transport Company / Fleet"
                  value={formData.transporter}
                  onChange={(e) => setFormData({ ...formData, transporter: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Driver Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Driver Info
            </h3>
            
            <div className="space-y-1 relative" ref={dropdownRef}>
              <label className="text-sm font-medium text-slate-700">Driver Contact *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={driverSearchTerm}
                  onChange={(e) => {
                    setDriverSearchTerm(e.target.value);
                    setFormData({ ...formData, driverContact: e.target.value });
                    setShowDriverSuggestions(true);
                  }}
                  onFocus={() => setShowDriverSuggestions(true)}
                  disabled={isDriverLocked}
                  className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-50 disabled:text-slate-500 font-mono"
                  required
                />
                {isDriverLocked && (
                  <button 
                    type="button" 
                    onClick={handleClearDriver}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {showDriverSuggestions && suggestedDrivers.length > 0 && !isDriverLocked && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {suggestedDrivers.map((driver) => (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => handleSelectDriver(driver)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex flex-col transition-colors border-b border-slate-100 last:border-0"
                    >
                      <span className="font-mono font-bold text-slate-900">{driver.phone}</span>
                      <span className="text-xs text-slate-500">{driver.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Driver Name *</label>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                disabled={isDriverLocked}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-50 disabled:text-slate-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Driver License Number</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. DL-14-2020-0012345"
                  value={formData.driverLicenseNumber}
                  onChange={(e) => setFormData({ ...formData, driverLicenseNumber: e.target.value.toUpperCase() })}
                  disabled={isDriverLocked && !!formData.driverLicenseNumber}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-50 disabled:text-slate-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Purpose & Party */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Purpose & Party Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Purpose *</label>
              <div className="flex gap-4 pt-1">
                {Object.values(GatePurpose).map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="purpose"
                      value={p}
                      checked={formData.purpose === p}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value as GatePurpose })}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-slate-700">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Supplier / Customer</label>
              <input
                type="text"
                placeholder="Party Name / Client"
                value={formData.supplierCustomer}
                onChange={(e) => setFormData({ ...formData, supplierCustomer: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        {/* Consignment Stock Items (Multi-Item Dynamic Builder) */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Consignment Stock Items
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Declare all materials arriving on this truck. Each item will sync into inventory receiving.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStockItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Stock Item
            </button>
          </div>

          <div className="space-y-3">
            {stockItems.map((item, index) => (
              <StockItemRow
                key={item.id}
                index={index}
                item={item}
                canDelete={stockItems.length > 1}
                onUpdate={(updates) => handleUpdateStockItem(item.id, updates)}
                onDelete={() => handleRemoveStockItem(item.id)}
              />
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Total Declared Items:{" "}
            <span className="font-bold text-slate-800">
              {stockItems.filter((s) => s.materialName && s.quantity).length}
            </span>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/gate"
              className="px-5 py-2.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin text-lg block h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              Create Gate Entry
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function StockItemRow({
  index,
  item,
  canDelete,
  onUpdate,
  onDelete,
}: {
  index: number;
  item: StockItemRowData;
  canDelete: boolean;
  onUpdate: (updates: Partial<StockItemRowData>) => void;
  onDelete: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState(item.materialName);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocked, setIsLocked] = useState(Boolean(item.stockId));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLocked || searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchTerm)}`);
        if (res.ok) {
          setSuggestions(await res.json());
        }
      } catch (err) {
        console.error("Failed to search stocks", err);
      }
    };

    const timeout = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, isLocked]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCatalog = (catalog: any) => {
    onUpdate({
      stockId: catalog.id,
      materialName: catalog.name,
      materialType: catalog.materialType || item.materialType,
      unit: catalog.uom?.abbreviation || item.unit,
    });
    setSearchTerm(catalog.name);
    setIsLocked(true);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onUpdate({ stockId: "", materialName: "" });
    setSearchTerm("");
    setIsLocked(false);
  };

  return (
    <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col md:flex-row gap-3 items-start md:items-center relative transition-all hover:bg-slate-50">
      <div className="flex items-center gap-2 w-full md:w-auto">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
          {index + 1}
        </span>
      </div>

      {/* Material Name / Autocomplete */}
      <div className="flex-1 w-full min-w-[200px] relative" ref={containerRef}>
        <label className="block text-[11px] font-bold text-slate-500 uppercase md:hidden mb-1">
          Material Name *
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Material Name (e.g. PP Granules 1110MAS)"
            value={searchTerm}
            disabled={isLocked}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onUpdate({ materialName: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white disabled:bg-slate-100 disabled:text-slate-600"
            required
          />
          {isLocked ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
              title="Unlock to change material"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && !isLocked && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
            {suggestions.map((stock) => (
              <button
                key={stock.id}
                type="button"
                onClick={() => handleSelectCatalog(stock)}
                className="w-full text-left px-3 py-2 hover:bg-primary/5 flex items-center justify-between text-xs border-b border-slate-100 last:border-0"
              >
                <div>
                  <span className="font-bold text-slate-800 block">{stock.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{stock.code}</span>
                </div>
                <span className="text-[10px] font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded">
                  {stock.materialType?.replace(/_/g, " ")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Material Type */}
      <div className="w-full md:w-44">
        <label className="block text-[11px] font-bold text-slate-500 uppercase md:hidden mb-1">
          Material Type
        </label>
        <select
          value={item.materialType}
          onChange={(e) => onUpdate({ materialType: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-xs font-medium"
        >
          {MATERIAL_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quantity */}
      <div className="w-full md:w-28">
        <label className="block text-[11px] font-bold text-slate-500 uppercase md:hidden mb-1">
          Declared Qty *
        </label>
        <input
          type="number"
          step="any"
          min="0"
          placeholder="Quantity"
          value={item.quantity}
          onChange={(e) => onUpdate({ quantity: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-right font-semibold"
          required
        />
      </div>

      {/* Unit */}
      <div className="w-full md:w-24">
        <label className="block text-[11px] font-bold text-slate-500 uppercase md:hidden mb-1">
          Unit
        </label>
        <select
          value={item.unit}
          onChange={(e) => onUpdate({ unit: e.target.value })}
          className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-xs font-medium"
        >
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* Batch / Lot */}
      <div className="w-full md:w-36">
        <label className="block text-[11px] font-bold text-slate-500 uppercase md:hidden mb-1">
          Batch / Lot (Optional)
        </label>
        <input
          type="text"
          placeholder="Batch / Invoice #"
          value={item.batchLot}
          onChange={(e) => onUpdate({ batchLot: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-xs"
        />
      </div>

      {/* Delete button */}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 self-end md:self-center"
          title="Remove Item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
