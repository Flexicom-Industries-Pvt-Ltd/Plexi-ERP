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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full max-w-full min-w-0">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <span>Truck Arrival Registration</span>
        </h2>
        <Link
          href="/dashboard/gate"
          className="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Vehicle & Driver Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Truck Details */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Vehicle Info
            </h3>
            
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Truck Number *</label>
              <input
                type="text"
                placeholder="e.g. WB11A1234"
                value={formData.truckNumber}
                onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 sm:py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono font-bold uppercase text-sm sm:text-base tracking-wider bg-slate-50/50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Transporter</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Transport Company / Fleet"
                  value={formData.transporter}
                  onChange={(e) => setFormData({ ...formData, transporter: e.target.value })}
                  className="w-full pl-9 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Driver Details */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Driver Info
            </h3>
            
            <div className="space-y-1 relative" ref={dropdownRef}>
              <label className="text-xs sm:text-sm font-medium text-slate-700">Driver Contact *</label>
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
                  className="w-full pl-9 pr-9 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-100 disabled:text-slate-600 font-mono bg-slate-50/50"
                  required
                />
                {isDriverLocked && (
                  <button 
                    type="button" 
                    onClick={handleClearDriver}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-1"
                    title="Unlock driver"
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
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex flex-col transition-colors border-b border-slate-100 last:border-0"
                    >
                      <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{driver.phone}</span>
                      <span className="text-[11px] text-slate-500">{driver.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Driver Name *</label>
              <input
                type="text"
                placeholder="Full Name"
                value={formData.driverName}
                onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                disabled={isDriverLocked}
                className="w-full px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-100 disabled:text-slate-600 bg-slate-50/50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Driver License Number</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. DL-14-2020-0012345"
                  value={formData.driverLicenseNumber}
                  onChange={(e) => setFormData({ ...formData, driverLicenseNumber: e.target.value.toUpperCase() })}
                  disabled={isDriverLocked && !!formData.driverLicenseNumber}
                  className="w-full pl-9 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-100 disabled:text-slate-600 font-mono bg-slate-50/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Purpose & Party */}
        <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Purpose & Party Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Purpose *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(GatePurpose).map((p) => {
                  const isSelected = formData.purpose === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({ ...formData, purpose: p as GatePurpose })}
                      className={cn(
                        "py-2.5 px-3 rounded-lg border text-xs sm:text-sm font-bold transition-all text-center touch-manipulation",
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                          : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium text-slate-700">Supplier / Customer</label>
              <input
                type="text"
                placeholder="Party Name / Client"
                value={formData.supplierCustomer}
                onChange={(e) => setFormData({ ...formData, supplierCustomer: e.target.value })}
                className="w-full px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-slate-50/50"
              />
            </div>
          </div>
        </div>

        {/* Consignment Stock Items (Multi-Item Dynamic Builder) */}
        <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Consignment Stock Items
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Declare all materials arriving on this truck. Each item will sync into inventory receiving.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStockItem}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors shrink-0 self-start sm:self-auto touch-manipulation"
            >
              <Plus className="h-4 w-4" /> Add Stock Item
            </button>
          </div>

          {/* Desktop Column Header */}
          <div className="hidden md:flex flex-row gap-2.5 items-center w-full px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            <span className="w-6 shrink-0 text-center">#</span>
            <span className="flex-1 min-w-[130px]">Material Name</span>
            <span className="w-36 lg:w-44 shrink-0">Category / Type</span>
            <span className="w-24 lg:w-28 shrink-0 text-right pr-1">Quantity</span>
            <span className="w-16 lg:w-20 shrink-0">Unit</span>
            <span className="w-28 lg:w-36 shrink-0">Batch / Lot #</span>
            <span className="w-8 shrink-0" />
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
        <div className="pt-4 sm:pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Total Declared Items:{" "}
            <span className="font-bold text-slate-800">
              {stockItems.filter((s) => s.materialName && s.quantity).length}
            </span>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Link
              href="/dashboard/gate"
              className="min-h-[42px] px-5 flex items-center justify-center text-xs sm:text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 touch-manipulation"
            >
              {loading ? (
                <span className="animate-spin text-lg block h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              <span>Create Gate Entry</span>
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
    <div className="p-3 sm:p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl relative transition-all hover:bg-slate-50 overflow-hidden">
      {/* ── Mobile Layout (Structured Card) ── */}
      <div className="flex md:hidden flex-col gap-2.5">
        {/* Card Header: Item badge + Delete button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
              {index + 1}
            </span>
            <span className="text-xs font-bold text-slate-700">
              Item #{index + 1}
            </span>
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Remove Item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Material Name Autocomplete */}
        <div className="relative" ref={containerRef}>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
            Material Name *
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. PP Granules 1110MAS"
              value={searchTerm}
              disabled={isLocked}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onUpdate({ materialName: e.target.value });
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full pl-8 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white disabled:bg-slate-100 disabled:text-slate-600"
              required
            />
            {isLocked && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-0.5"
                title="Unlock to change material"
              >
                <X className="h-3.5 w-3.5" />
              </button>
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

        {/* Row 2: Quantity & Unit */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Quantity *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={item.quantity}
              onChange={(e) => onUpdate({ quantity: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-right font-semibold"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Unit
            </label>
            <select
              value={item.unit}
              onChange={(e) => onUpdate({ unit: e.target.value })}
              className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium"
            >
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Material Type & Batch/Lot */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Type
            </label>
            <select
              value={item.materialType}
              onChange={(e) => onUpdate({ materialType: e.target.value })}
              className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium truncate"
            >
              {MATERIAL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Batch / Lot
            </label>
            <input
              type="text"
              placeholder="Optional"
              value={item.batchLot}
              onChange={(e) => onUpdate({ batchLot: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            />
          </div>
        </div>
      </div>

      {/* ── Desktop Layout (1-Row Proportional Flex) ── */}
      <div className="hidden md:flex flex-row gap-2.5 items-center w-full min-w-0">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
          {index + 1}
        </span>

        {/* Material Name / Autocomplete (Search icon on left, no text collision) */}
        <div className="flex-1 min-w-[130px] relative" ref={containerRef}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search or enter material..."
              value={searchTerm}
              disabled={isLocked}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onUpdate({ materialName: e.target.value });
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full pl-8 pr-7 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white disabled:bg-slate-100 disabled:text-slate-600 truncate"
              required
            />
            {isLocked && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-0.5"
                title="Unlock to change material"
              >
                <X className="h-3.5 w-3.5" />
              </button>
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
        <div className="w-36 lg:w-44 shrink-0 min-w-0">
          <select
            value={item.materialType}
            onChange={(e) => onUpdate({ materialType: e.target.value })}
            className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium truncate"
          >
            {MATERIAL_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="w-24 lg:w-28 shrink-0 min-w-0">
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={item.quantity}
            onChange={(e) => onUpdate({ quantity: e.target.value })}
            className="w-full px-2.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-right font-semibold"
            required
          />
        </div>

        {/* Unit */}
        <div className="w-16 lg:w-20 shrink-0 min-w-0">
          <select
            value={item.unit}
            onChange={(e) => onUpdate({ unit: e.target.value })}
            className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white font-medium"
          >
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Batch / Lot */}
        <div className="w-28 lg:w-36 shrink-0 min-w-0">
          <input
            type="text"
            placeholder="Batch/Lot #"
            value={item.batchLot}
            onChange={(e) => onUpdate({ batchLot: e.target.value })}
            className="w-full px-2.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white truncate"
          />
        </div>

        {/* Delete button */}
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title="Remove Item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <div className="w-7 shrink-0" />
        )}
      </div>
    </div>
  );
}
