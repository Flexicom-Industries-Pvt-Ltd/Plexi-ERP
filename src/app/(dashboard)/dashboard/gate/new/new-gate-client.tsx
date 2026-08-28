"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Truck, User, Phone, Briefcase, FileText, Package, PlusCircle, ArrowLeft, Search, X } from "lucide-react";
import Link from "next/link";
import { GatePurpose } from "@/generated/prisma";

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
    expectedMaterial: string;
    expectedQuantity: string;
  }>({
    truckNumber: "",
    driverName: "",
    driverContact: "",
    driverLicenseNumber: "",
    transporter: "",
    supplierCustomer: "",
    purpose: GatePurpose.LOADING,
    expectedMaterial: "",
    expectedQuantity: "",
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.truckNumber || !formData.driverName) {
      toast.error("Truck number and driver name are required");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) throw new Error("Failed to create entry");
      const data = await res.json();
      toast.success("Gate entry created successfully");
      router.push(`/dashboard/gate/${data.entryNumber}`);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while creating the entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Truck Arrival Form
        </h2>
        <Link href="/dashboard/gate" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Truck Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4" /> Vehicle Info
            </h3>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Truck Number *</label>
              <input
                type="text"
                placeholder="e.g. WB11A1234"
                value={formData.truckNumber}
                onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Transporter</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Transport Company"
                  value={formData.transporter}
                  onChange={(e) => setFormData({ ...formData, transporter: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Driver Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" /> Driver Info
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
                  className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-50 disabled:text-slate-500"
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
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestedDrivers.map((driver) => (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => handleSelectDriver(driver)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex flex-col transition-colors border-b border-slate-100 last:border-0"
                    >
                      <span className="font-medium text-slate-900">{driver.phone}</span>
                      <span className="text-sm text-slate-500">{driver.name}</span>
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
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Purpose & Material */}
          <div className="space-y-4 md:col-span-2 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4" /> Purpose & Consignment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Purpose</label>
                <div className="flex gap-4">
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
                      <span className="text-sm font-medium text-slate-700">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Supplier / Customer</label>
                <input
                  type="text"
                  placeholder="Party Name"
                  value={formData.supplierCustomer}
                  onChange={(e) => setFormData({ ...formData, supplierCustomer: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Expected Material (Optional)</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="E.g. PP Granules"
                    value={formData.expectedMaterial}
                    onChange={(e) => setFormData({ ...formData, expectedMaterial: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Expected Quantity (Optional)</label>
                <input
                  type="number"
                  placeholder="E.g. 25000"
                  value={formData.expectedQuantity}
                  onChange={(e) => setFormData({ ...formData, expectedQuantity: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
          <Link
            href="/dashboard/gate"
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? <span className="animate-spin text-lg block h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <PlusCircle className="h-4 w-4" />}
            Create Gate Entry
          </button>
        </div>
      </form>
    </div>
  );
}
