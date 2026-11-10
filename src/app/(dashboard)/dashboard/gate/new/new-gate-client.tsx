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
  PlusCircle,
  ArrowLeft,
  X,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { GatePurpose } from "@/generated/prisma";
import { cn } from "@/lib/utils";

export function NewGateClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const isSubmittingRef = useRef(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const [driverSearchTerm, setDriverSearchTerm] = useState("");
  const [suggestedDrivers, setSuggestedDrivers] = useState<any[]>([]);
  const [showDriverSuggestions, setShowDriverSuggestions] = useState(false);
  const [isDriverLocked, setIsDriverLocked] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

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
    if (isSubmittingRef.current || loading || redirecting) {
      return;
    }

    const trimmedTruck = (formData.truckNumber || "").trim().toUpperCase();
    const trimmedDriverName = (formData.driverName || "").trim();
    const trimmedDriverContact = (formData.driverContact || driverSearchTerm || "").trim();

    if (!trimmedTruck) {
      toast.error("Truck number is required");
      return;
    }

    if (!trimmedDriverName) {
      toast.error("Driver name is required");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    const submissionPayload = {
      ...formData,
      truckNumber: trimmedTruck,
      driverName: trimmedDriverName,
      driverContact: trimmedDriverContact,
    };

    const idempotencyKey = `gate-entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(submissionPayload),
      });

      const responseJson = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          responseJson?.error?.message ||
          (typeof responseJson?.error === "string" ? responseJson.error : null) ||
          responseJson?.message ||
          "Failed to create gate entry";
        throw new Error(message);
      }

      const entryNum = responseJson?.data?.entryNumber || responseJson?.entryNumber;
      if (!entryNum) {
        throw new Error("Gate entry was registered, but did not return a valid entry number.");
      }

      toast.success(`Gate entry ${entryNum} created successfully`);
      setRedirecting(true);

      // Trigger router navigation to the gate entry details view
      router.refresh();
      router.push(`/dashboard/gate/${entryNum}`);

      // Fallback timer to guarantee redirection even if client RSC transition stalls
      navigationTimeoutRef.current = setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname !== `/dashboard/gate/${entryNum}`) {
          window.location.href = `/dashboard/gate/${entryNum}`;
        }
      }, 2500);
    } catch (err: any) {
      console.error("[NewGateEntry] Submission error:", err);
      toast.error(err.message || "An error occurred while creating the entry");
      setLoading(false);
      setRedirecting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full max-w-full min-w-0">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
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
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                  {suggestedDrivers.map((driver) => (
                    <button
                      key={driver.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectDriver(driver);
                      }}
                      onClick={() => handleSelectDriver(driver)}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex flex-col transition-colors border-b border-slate-100 last:border-0 cursor-pointer"
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
              <p className="text-[11px] text-slate-500 mt-1">
                {formData.purpose === GatePurpose.LOADING && (
                  <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 inline shrink-0" />
                    Loading dispatch entry. Stock items can be added and managed in the vehicle management screen.
                  </span>
                )}
                {formData.purpose === GatePurpose.UNLOADING && (
                  <span className="text-blue-700 font-medium inline-flex items-center gap-1">
                    <Info className="h-3 w-3 inline shrink-0" />
                    Unloading receiving entry. Consignment materials can be recorded in the vehicle management screen.
                  </span>
                )}
              </p>
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

        {/* Submit Actions */}
        <div className="pt-4 sm:pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Link
              href="/dashboard/gate"
              className="min-h-[42px] px-5 flex items-center justify-center text-xs sm:text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || redirecting}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 touch-manipulation cursor-pointer disabled:cursor-not-allowed"
            >
              {redirecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Opening Gate Entry...</span>
                </>
              ) : loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Registering Entry...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Gate Entry</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
