"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Truck,
  Clock,
  User,
  Phone,
  Briefcase,
  FileText,
  MapPin,
  CheckCircle,
  XCircle,
  Package,
  Upload,
  RefreshCw,
  ChevronDown,
  Search,
  X,
  Plus,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  Printer,
  History,
  Calendar,
  Trash2,
  Eye,
  Camera,
  RotateCw,
} from "lucide-react";
import { GateEntryStatus } from "@/generated/prisma";
import { TransportSlipModal } from "@/components/gate/TransportSlipModal";
import { printTransportSlip } from "@/lib/gate/print-transport-slip";
import { GateBlockerModal, GateBlockerModalData } from "@/components/gate/GateBlockerModal";
import { GateDocumentUploadModal } from "@/components/gate/GateDocumentUploadModal";
import { GateDocumentLightbox } from "@/components/gate/GateDocumentLightbox";

const LIFECYCLE_STEPS = [
  { id: "ARRIVED", label: "Arrived" },
  { id: "DOCUMENT_VERIFICATION", label: "Verification" },
  { id: "PARKING", label: "Parking" },
  { id: "LOADING", label: "Loading/Unloading" },
  { id: "GATE_OUT", label: "Gate Out" },
];

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

const EMPTY_STOCK_FORM = {
  stockId: "",
  materialName: "",
  materialType: "RAW_MATERIALS",
  quantity: "",
  unit: "kg",
  batchLot: "",
  expectedQuantity: "",
};

function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

export function GateDetailsClient({ entryId }: { entryId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams?.get("tab") || "overview");

  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && ["overview", "stock", "documents", "statuses"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Modals & Menus state
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [defaultDocType, setDefaultDocType] = useState("Truck / Vehicle Photo");
  const [selectedLightboxDoc, setSelectedLightboxDoc] = useState<any | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockerModalData, setBlockerModalData] = useState<GateBlockerModalData | null>(null);
  const [showBlockerModal, setShowBlockerModal] = useState(false);

  // Forms state
  const [stockForm, setStockForm] = useState({ ...EMPTY_STOCK_FORM });
  const [docForm, setDocForm] = useState({ documentType: "", remarks: "" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [fileDragActive, setFileDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [suggestedStocks, setSuggestedStocks] = useState<any[]>([]);
  const [showStockSuggestions, setShowStockSuggestions] = useState(false);
  const [isStockLocked, setIsStockLocked] = useState(false);
  const stockDropdownRef = useRef<HTMLDivElement>(null);

  const fetchEntry = useCallback(async () => {
    try {
      const res = await fetch(`/api/gate/${entryId}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setEntry(data);
      if (data.entryNumber && data.entryNumber !== entryId) {
        router.replace(`/dashboard/gate/${data.entryNumber}`);
      }
    } catch (err) {
      toast.error("Failed to fetch entry details");
    } finally {
      setLoading(false);
    }
  }, [entryId, router]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  useEffect(() => {
    const fetchStocks = async () => {
      if (isStockLocked || stockSearchTerm.length < 2) {
        setSuggestedStocks([]);
        return;
      }
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(stockSearchTerm)}`);
        if (res.ok) {
          setSuggestedStocks(await res.json());
        }
      } catch (err) {
        console.error("Failed to search stocks", err);
      }
    };
    const timeout = setTimeout(fetchStocks, 300);
    return () => clearTimeout(timeout);
  }, [stockSearchTerm, isStockLocked]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stockDropdownRef.current && !stockDropdownRef.current.contains(event.target as Node)) {
        setShowStockSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateStatus = async (newStatus: string) => {
    if (newStatus === entry.status) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/gate/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.blockers) {
          setBlockerModalData({
            title: err.blockers.title,
            description: err.blockers.description,
            entryNumber: entry.entryNumber,
            truckNumber: entry.truckNumber,
            purpose: entry.purpose,
            message: err.error,
            unverifiedDocuments: err.blockers.unverifiedDocuments,
            uncommittedStock: err.blockers.uncommittedStock,
          });
          setShowBlockerModal(true);
          return;
        }
        throw new Error(err.error || "Failed to update status");
      }
      await fetchEntry();
      toast.success("Status updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const saveParkingDetails = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/gate/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parkingLocation: entry.parkingLocation || null,
          waitingReason: entry.waitingReason || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save parking details");
      toast.success("Parking details saved");
    } catch {
      toast.error("Failed to save parking details");
    } finally {
      setUpdating(false);
    }
  };

  const updateDocumentStatus = async (docId: string, status: string) => {
    try {
      const res = await fetch(`/api/gate/${entryId}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      await fetchEntry();
      toast.success(`Document ${status.toLowerCase()}`);
    } catch {
      toast.error("Failed to update document");
    }
  };

  const handleDeleteDocument = async (docId: string, docType: string) => {
    if (!confirm(`Are you sure you want to delete "${docType}"?`)) return;
    try {
      const res = await fetch(`/api/gate/${entryId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete document");
      }
      await fetchEntry();
      toast.success(`Document "${docType}" deleted successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  };

  const getNextStatus = (current: string, purpose: string) => {
    switch (current) {
      case "ARRIVED": return "DOCUMENT_VERIFICATION";
      case "DOCUMENT_VERIFICATION": return "VERIFIED";
      case "VERIFIED": return "PARKING";
      case "PARKING": return "READY";
      case "READY": return purpose === "LOADING" ? "LOADING" : "UNLOADING";
      case "LOADING":
      case "UNLOADING": return "COMPLETED";
      case "COMPLETED": return "GATE_OUT";
      default: return null;
    }
  };

  const handleSelectCatalogStock = (stock: any) => {
    setStockForm({
      ...stockForm,
      stockId: stock.id,
      materialName: stock.name,
      materialType: stock.materialType,
      unit: stock.uom?.abbreviation || stockForm.unit,
    });
    setStockSearchTerm(stock.name);
    setIsStockLocked(true);
    setShowStockSuggestions(false);
  };

  const handleClearCatalogStock = () => {
    setStockForm({ ...stockForm, stockId: "", materialName: "" });
    setStockSearchTerm("");
    setIsStockLocked(false);
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const materialName = stockForm.materialName || stockSearchTerm;
    if (!materialName) {
      toast.error("Material name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/gate/${entryId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...stockForm, materialName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add stock detail");
      }
      await fetchEntry();
      setShowStockModal(false);
      setStockForm({ ...EMPTY_STOCK_FORM });
      setStockSearchTerm("");
      setIsStockLocked(false);
      toast.success("Stock detail added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add stock detail");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.documentType) {
      toast.error("Please select a document type");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("documentType", docForm.documentType);
      if (docForm.remarks) {
        formData.append("remarks", docForm.remarks);
      }
      if (docFile) {
        formData.append("file", docFile);
      }

      const res = await fetch(`/api/gate/${entryId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add document");
      }

      await fetchEntry();
      setShowDocModal(false);
      setDocForm({ documentType: "", remarks: "" });
      setDocFile(null);
      toast.success("Document attached successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to add document");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500 font-medium">Loading details...</div>;
  if (!entry) return <div className="text-center py-12 text-red-500 font-medium">Entry not found</div>;

  const nextStatus = entry ? getNextStatus(entry.status, entry.purpose) : null;

  // Calculate lifecycle progress
  const currentStepIndex = LIFECYCLE_STEPS.findIndex(s => 
    s.id === entry.status || 
    (s.id === "LOADING" && entry.status === "UNLOADING") ||
    (s.id === "DOCUMENT_VERIFICATION" && entry.status === "VERIFIED") ||
    (s.id === "PARKING" && entry.status === "READY") ||
    (s.id === "LOADING" && entry.status === "COMPLETED")
  );
  const activeStepIdx = entry.status === "GATE_OUT" ? 4 : (currentStepIndex >= 0 ? currentStepIndex : 0);
  const activeStepLabel = entry.status === "GATE_OUT" 
    ? "Gate Out" 
    : (LIFECYCLE_STEPS[activeStepIdx]?.label || entry.status.replace("_", " "));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ========================================================================= */}
      {/* DESKTOP HEADER (Preserved 100% for desktop screens md and above)          */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/gate" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {entry.entryNumber}
              <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {entry.status.replace("_", " ")}
              </span>
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Truck className="h-4 w-4" /> {entry.truckNumber} • {entry.purpose}
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setShowSlipModal(true)}
            className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 text-sm font-semibold shadow-sm transition-all cursor-pointer"
            title="Export Transport Slip / Gate Pass (A4 PDF)"
          >
            <Printer className="h-4 w-4 text-emerald-600" />
            <span>Transport Slip (PDF)</span>
          </button>

          {nextStatus && entry.status !== "GATE_OUT" && entry.status !== "CANCELLED" && (
            <button 
              onClick={() => updateStatus(nextStatus)}
              disabled={updating}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
            >
              Advance to {nextStatus.replace("_", " ")}
            </button>
          )}
          
          {entry.status !== "GATE_OUT" && entry.status !== "CANCELLED" && (
            <div className="relative">
              <button 
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="px-3 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-1 text-sm font-medium shadow-sm transition-colors"
              >
                Edit Status <ChevronDown className="h-4 w-4" />
              </button>
              
              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl z-50 py-1 max-h-80 overflow-y-auto">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      Override Status
                    </div>
                    {Object.values(GateEntryStatus).map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setShowStatusMenu(false);
                          updateStatus(s);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${entry.status === s ? 'text-primary font-semibold bg-primary/5 border-l-2 border-primary' : 'text-slate-700 border-l-2 border-transparent'}`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE HERO HEADER (High-visibility, low-education friendly, no wrapping) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {/* Top Navigation Row */}
        <div className="flex items-center justify-between gap-2">
          <Link 
            href="/dashboard/gate" 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-sm active:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
              {entry.entryNumber}
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              entry.status === "GATE_OUT" ? "bg-slate-100 text-slate-700 border-slate-300" :
              entry.status === "COMPLETED" || entry.status === "VERIFIED" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
              "bg-primary/10 text-primary border-primary/20"
            }`}>
              {entry.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Truck Details Card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            {/* Number Plate Visual */}
            <div className="inline-flex items-center gap-2 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg border-2 border-amber-500 shadow-sm">
              <Truck className="h-4 w-4 text-slate-900" />
              <span className="font-mono font-black text-base tracking-wider uppercase">
                {entry.truckNumber}
              </span>
            </div>
            
            {/* Purpose Badge */}
            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider ${
              entry.purpose === "LOADING" ? "bg-blue-50 text-blue-700 border-blue-200" :
              entry.purpose === "UNLOADING" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
              "bg-slate-100 text-slate-700 border-slate-200"
            }`}>
              {entry.purpose}
            </span>
          </div>

          {/* Quick Info Bar */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Driver:</span>
              <span className="font-bold text-slate-800 truncate block">{entry.driverName || "—"}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Party / Supplier:</span>
              <span className="font-bold text-slate-800 truncate block">{entry.supplierCustomer || "—"}</span>
            </div>
          </div>

          {/* Mobile Big Action Button */}
          {nextStatus && entry.status !== "GATE_OUT" && entry.status !== "CANCELLED" && (
            <div className="pt-2">
              <button
                onClick={() => updateStatus(nextStatus)}
                disabled={updating}
                className="w-full py-3 px-4 bg-primary text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span>Advance to {nextStatus.replace("_", " ")}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Status Override Trigger */}
          {entry.status !== "GATE_OUT" && entry.status !== "CANCELLED" && (
            <div className="relative pt-1">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-between active:bg-slate-100"
              >
                <span>Change / Override Status</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>

              {showStatusMenu && (
                <>
                  <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs" onClick={() => setShowStatusMenu(false)} />
                  <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl p-4 max-h-[70vh] overflow-y-auto border-t border-slate-200 animate-in slide-in-from-bottom duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                      <h3 className="font-bold text-sm text-slate-800">Select Entry Status</h3>
                      <button onClick={() => setShowStatusMenu(false)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {Object.values(GateEntryStatus).map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setShowStatusMenu(false);
                            updateStatus(s);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors ${
                            entry.status === s ? 'text-primary bg-primary/10 border border-primary/20' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{s.replace("_", " ")}</span>
                          {entry.status === s && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobile Transport Slip PDF Action */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowSlipModal(true)}
              className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 active:bg-slate-100 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4 text-emerald-600" />
              <span>Export Transport Slip (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP LIFECYCLE STEPPER (Preserved 100% for desktop screens)            */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center min-w-[600px]">
          {LIFECYCLE_STEPS.map((step, idx) => {
            let state = "pending";
            const currentIndex = LIFECYCLE_STEPS.findIndex(s => 
              s.id === entry.status || 
              (s.id === "LOADING" && entry.status === "UNLOADING") ||
              (s.id === "DOCUMENT_VERIFICATION" && entry.status === "VERIFIED") ||
              (s.id === "PARKING" && entry.status === "READY") ||
              (s.id === "LOADING" && entry.status === "COMPLETED")
            );
            
            if (entry.status === "GATE_OUT" || entry.status === "COMPLETED") {
                state = "completed";
            } else if (idx < currentIndex) {
                state = "completed";
            } else if (idx === currentIndex) {
                state = "current";
            }

            return (
              <div key={step.id} className="flex-1 flex flex-col items-center relative group">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center relative z-10 font-bold text-sm transition-all duration-300 ${
                  state === "completed" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" :
                  state === "current" ? "bg-primary text-white shadow-md shadow-primary/20 ring-4 ring-primary/10" :
                  "bg-slate-100 text-slate-400 border border-slate-200"
                }`}>
                  {state === "completed" ? <CheckCircle className="h-5 w-5" /> : (idx + 1)}
                </div>
                <p className={`mt-3 text-xs font-semibold uppercase tracking-wider ${
                  state === "completed" ? "text-emerald-600" :
                  state === "current" ? "text-primary" :
                  "text-slate-400"
                }`}>
                  {step.label}
                </p>
                {/* Connecting Line */}
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div className={`absolute top-4 left-[50%] w-full h-[2px] -z-0 transition-colors duration-300 ${
                    state === "completed" ? "bg-emerald-500" : "bg-slate-100"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE LIFECYCLE STEPPER (Stage progress tracker card, crystal clear)      */}
      {/* ========================================================================= */}
      <div className="block md:hidden bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Stage {activeStepIdx + 1} of 5
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
            {activeStepLabel}
          </span>
        </div>

        {/* 5-Step Segmented Bar */}
        <div className="grid grid-cols-5 gap-1.5 h-2">
          {LIFECYCLE_STEPS.map((_, idx) => {
            const isDone = idx < activeStepIdx || entry.status === "GATE_OUT";
            const isCurrent = idx === activeStepIdx && entry.status !== "GATE_OUT";
            return (
              <div
                key={idx}
                className={`rounded-full h-full transition-all ${
                  isDone ? "bg-emerald-500" :
                  isCurrent ? "bg-primary ring-2 ring-primary/30" :
                  "bg-slate-200"
                }`}
              />
            );
          })}
        </div>

        {/* Step Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-[11px]">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isDone = idx < activeStepIdx || entry.status === "GATE_OUT";
            const isCurrent = idx === activeStepIdx && entry.status !== "GATE_OUT";
            return (
              <div
                key={step.id}
                className={`flex items-center gap-1 px-2 py-1 rounded-md whitespace-nowrap font-medium ${
                  isDone ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  isCurrent ? "bg-primary text-white font-bold shadow-xs" :
                  "bg-slate-50 text-slate-400 border border-slate-200"
                }`}
              >
                {isDone ? <Check className="h-3 w-3" /> : <span>{idx + 1}.</span>}
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABS CONTAINER                                                            */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Desktop Tab Bar */}
        <div className="hidden md:flex items-center border-b border-slate-100 px-2 overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            { id: "stock", label: `Stock Items (${entry.stockDetails?.length || 0})` },
            { id: "documents", label: `Documents (${entry.documents?.length || 0})` },
            { id: "statuses", label: `Statuses (${entry.statusLogs?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Segmented Tab Bar */}
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100 md:hidden m-3 rounded-xl border border-slate-200">
          {[
            { id: "overview", label: "Overview" },
            { id: "stock", label: `Stock (${entry.stockDetails?.length || 0})` },
            { id: "documents", label: `Docs (${entry.documents?.length || 0})` },
            { id: "statuses", label: `Status (${entry.statusLogs?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 text-[11px] font-bold rounded-lg transition-all text-center truncate cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="p-4 sm:p-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    Arrival Information
                  </h3>
                  {entry.status !== "GATE_OUT" && (
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultDocType("Truck / Vehicle Photo");
                        setShowDocModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 transition-all cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Take Photo</span>
                    </button>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 space-y-3 border border-slate-100">
                  {(() => {
                    const truckDoc = (entry.documents || []).find((d: any) => {
                      const norm = (d.documentType || "").toLowerCase();
                      return (norm.includes("truck") || norm.includes("vehicle")) && Boolean(d.fileUrl && d.fileUrl !== "local-check");
                    }) || (entry.documents || []).find((d: any) => {
                      const norm = (d.documentType || "").toLowerCase();
                      return norm.includes("photo") && Boolean(d.fileUrl && d.fileUrl !== "local-check");
                    });

                    if (truckDoc) {
                      return (
                        <div
                          onClick={() => setSelectedLightboxDoc(truckDoc)}
                          className="flex items-center gap-3 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-primary/40 hover:shadow-xs transition-all mb-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={truckDoc.fileUrl}
                            alt="Truck Photo"
                            className="w-16 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">Vehicle Photo</span>
                              <span
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                                  truckDoc.status === "VERIFIED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : truckDoc.status === "REJECTED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {truckDoc.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono block truncate">
                              {entry.truckNumber} • Tap to enlarge
                            </span>
                          </div>
                          <Eye className="h-4 w-4 text-slate-400 shrink-0" />
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <DetailRow icon={<Clock />} label="Arrived At" value={new Date(entry.arrivalTime).toLocaleString()} />
                  <DetailRow icon={<User />} label="Driver Name" value={entry.driverName} />
                  <DetailRow icon={<Phone />} label="Driver Contact" value={entry.driverContact || "—"} />
                  <DetailRow icon={<Briefcase />} label="Transporter" value={entry.transporter || "—"} />
                  <DetailRow icon={<MapPin />} label="Party / Supplier" value={entry.supplierCustomer || "—"} />
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-slate-400" />
                  Consignment & Material
                </h3>
                <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 space-y-3 border border-slate-100">
                  <DetailRow icon={<FileText />} label="Purpose" value={entry.purpose} />
                  <DetailRow icon={<User />} label="Logged By" value={entry.user?.name || entry.createdBy || "System"} />
                </div>
              </div>

              {["PARKING", "READY", "ON_HOLD", "LOADING", "UNLOADING", "COMPLETED"].includes(entry.status) && (
                <div className="col-span-1 md:col-span-2 space-y-3 sm:space-y-4">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">Parking & Waiting</h3>
                  <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 space-y-4 border border-slate-100">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Parking Location</label>
                      <input
                        type="text"
                        value={entry.parkingLocation || ""}
                        onChange={(e) => setEntry({ ...entry, parkingLocation: e.target.value })}
                        placeholder="e.g. Bay A-3, Waiting Zone 2"
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                        disabled={entry.status === "GATE_OUT"}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Waiting Reason</label>
                      <textarea
                        value={entry.waitingReason || ""}
                        onChange={(e) => setEntry({ ...entry, waitingReason: e.target.value })}
                        placeholder="Reason for waiting or hold..."
                        rows={2}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                        disabled={entry.status === "GATE_OUT"}
                      />
                    </div>
                    {entry.status !== "GATE_OUT" && (
                      <button
                        onClick={saveParkingDetails}
                        disabled={updating}
                        className="w-full sm:w-auto px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        Save Parking Details
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STOCK DETAILS */}
          {activeTab === "stock" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">
                  Stock Items ({entry.stockDetails?.length || 0})
                </h3>
                <button 
                  onClick={() => setShowStockModal(true)}
                  disabled={entry.status === "GATE_OUT"}
                  title={entry.status === "GATE_OUT" ? "Cannot add stock after Gate Out" : ""}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-xs ${
                    entry.status === "GATE_OUT" 
                      ? "text-slate-400 bg-slate-100 cursor-not-allowed" 
                      : "text-white bg-primary hover:bg-primary/90 active:scale-95"
                  }`}
                >
                  <Plus className="h-4 w-4" /> Add Stock Item
                </button>
              </div>

              {entry.stockDetails?.length > 0 ? (
                <>
                  {/* DESKTOP TABLE VIEW */}
                  <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Material</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Batch/Lot</th>
                          <th className="px-4 py-3 text-right">Declared Qty</th>
                          <th className="px-4 py-3 text-right">Inventory Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entry.stockDetails.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800">{item.materialName}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{item.materialType ? item.materialType.replace(/_/g, " ") : "—"}</td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.batchLot || "—"}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800 text-right">
                              {item.expectedQuantity ?? item.quantity} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.actualQuantity !== null && item.actualQuantity !== undefined ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Received {item.actualQuantity} {item.unit}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  Pending Inward
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARDS VIEW (High-contrast, easy to read for operators) */}
                  <div className="block md:hidden space-y-3">
                    {entry.stockDetails.map((item: any) => (
                      <div key={item.id} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{item.materialName}</h4>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {item.materialType ? item.materialType.replace(/_/g, " ") : "Raw Material"}
                            </span>
                          </div>
                          <span className="font-bold text-sm bg-white border border-slate-200 px-2.5 py-1 rounded-md text-slate-800 shadow-xs">
                            {item.expectedQuantity ?? item.quantity} {item.unit}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                          <div>
                            <span className="text-slate-400 block font-medium">Batch / Lot:</span>
                            <span className="font-mono font-semibold text-slate-700">{item.batchLot || "—"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">Inward Status:</span>
                            {item.actualQuantity !== null && item.actualQuantity !== undefined ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mt-0.5">
                                Received {item.actualQuantity} {item.unit}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 mt-0.5">
                                Pending Inward
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-slate-500 text-sm flex flex-col items-center gap-2">
                  <Package className="h-8 w-8 text-slate-300" />
                  <p className="font-medium">No stock items added yet.</p>
                  <p className="text-xs text-slate-400">Click &apos;Add Stock Item&apos; above to record declared materials.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Documents & Verification ({entry.documents?.length || 0})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Truck photos, weighbridge slips & challans with 3-day retention policy
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultDocType("Truck / Vehicle Photo");
                      setShowDocModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-2 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="h-4 w-4 text-primary" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultDocType("Gross Weighbridge Slip");
                      setShowDocModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3.5 py-2 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Attach Document</span>
                  </button>
                </div>
              </div>

              {entry.documents?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  {entry.documents.map((doc: any) => {
                    const isImg = doc.fileUrl && (/\.(jpg|jpeg|png|webp|gif|heic)/i.test(doc.fileUrl) || doc.fileUrl.startsWith("data:image/"));
                    const isPdf = doc.fileUrl && (/\.pdf/i.test(doc.fileUrl) || doc.fileUrl.startsWith("data:application/pdf"));

                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 sm:p-4 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          {/* Visual Media Thumbnail or Badge */}
                          <div
                            onClick={() => setSelectedLightboxDoc(doc)}
                            className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center cursor-pointer group hover:opacity-90 transition-all"
                            title="Click to view full image in lightbox"
                          >
                            {isImg ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={doc.fileUrl}
                                  alt={doc.documentType}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="h-5 w-5 text-white drop-shadow-md" />
                                </div>
                              </>
                            ) : isPdf ? (
                              <div className="p-2 text-center text-red-600 flex flex-col items-center justify-center">
                                <FileText className="h-6 w-6 mb-0.5" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">PDF</span>
                              </div>
                            ) : (
                              <div className="p-2 text-center text-slate-400 flex flex-col items-center justify-center">
                                <FileText className="h-6 w-6 mb-0.5" />
                                <span className="text-[8px] uppercase">Pruned</span>
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5 mb-1">
                              <h4
                                onClick={() => setSelectedLightboxDoc(doc)}
                                className="font-bold text-slate-900 text-sm truncate cursor-pointer hover:text-primary transition-colors"
                              >
                                {doc.documentType}
                              </h4>
                              <div className="flex items-center gap-1 shrink-0">
                                <span
                                  className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                    doc.status === "VERIFIED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : doc.status === "REJECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {doc.status}
                                </span>
                                {entry.status !== "GATE_OUT" && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc.id, doc.documentType)}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete Document"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 truncate mb-1">
                              {doc.remarks || "No remarks provided"}
                            </p>

                            {doc.verifier ? (
                              <p className="text-[10px] text-slate-400">
                                {doc.status === "VERIFIED" ? "Verified" : "Reviewed"} by {doc.verifier.name}
                                {doc.verifiedAt ? ` • ${new Date(doc.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400">
                                Added {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            )}

                            {/* View link / button */}
                            {doc.fileUrl && doc.fileUrl !== "local-check" && (
                              <button
                                type="button"
                                onClick={() => setSelectedLightboxDoc(doc)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 mt-1.5 cursor-pointer"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Inspect Fullscreen</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline Verification Controls */}
                        {entry.status !== "GATE_OUT" && (
                          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                            {doc.status !== "VERIFIED" && doc.status !== "REJECTED" ? (
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => updateDocumentStatus(doc.id, "VERIFIED")}
                                  className="text-[11px] px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold hover:bg-emerald-200 active:scale-95 transition-all cursor-pointer"
                                >
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateDocumentStatus(doc.id, "REJECTED")}
                                  className="text-[11px] px-2.5 py-1 bg-red-100 text-red-800 rounded-lg font-bold hover:bg-red-200 active:scale-95 transition-all cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateDocumentStatus(doc.id, "UNDER_VERIFICATION")}
                                  className="text-[11px] px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold hover:bg-amber-200 active:scale-95 transition-all cursor-pointer"
                                >
                                  Reviewing
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Status finalized</span>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedLightboxDoc(doc)}
                              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ml-auto"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 border-dashed text-slate-500 text-sm flex flex-col items-center gap-2.5">
                  <div className="p-3 bg-slate-100 text-slate-400 rounded-full">
                    <Camera className="h-7 w-7" />
                  </div>
                  <p className="font-bold text-slate-700">No documents or truck photos attached</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Snap a photo of the truck license plate, gross weighbridge slip, or attach the delivery challan.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultDocType("Truck / Vehicle Photo");
                        setShowDocModal(true);
                      }}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-xs hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Camera className="h-3.5 w-3.5" /> Take Truck Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STATUSES TIMELINE */}
          {activeTab === "statuses" && (
            <div className="space-y-5">
              {/* Header KPI Summary Card (Minimalist & Professional) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                      Lifecycle Movement Trail
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {formatStatus(entry.status)}
                    </span>
                    <span className="text-xs text-slate-400">
                      • {entry.statusLogs?.length || 1} Total Updates
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <History className="h-5 w-5 text-slate-700" />
                    Status Transition History & Timestamps
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chronological audit trail of all gate status changes with exact timestamps and operators
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => printTransportSlip(entry)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-emerald-400" />
                    <span>Print Transport Slip</span>
                  </button>
                  <button
                    onClick={() => setShowSlipModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>

              {/* Status Timeline Container */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 sm:p-6">
                <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6 ml-2 sm:ml-4">
                  {(entry.statusLogs && entry.statusLogs.length > 0
                    ? entry.statusLogs
                    : [
                        {
                          id: "synth-arr",
                          status: "ARRIVED",
                          timestamp: entry.arrivalTime,
                          remarks: "Initial truck arrival registered at gate",
                          user: entry.user,
                        },
                        ...(entry.status !== "ARRIVED"
                          ? [
                              {
                                id: "synth-curr",
                                status: entry.status,
                                timestamp: entry.exitTime || entry.updatedAt,
                                remarks:
                                  entry.status === "GATE_OUT"
                                    ? entry.finalRemarks || "Vehicle gated out and departed"
                                    : entry.parkingLocation
                                    ? `Parking bay allocated: ${entry.parkingLocation}`
                                    : `Status transition to ${formatStatus(entry.status)}`,
                                user: null,
                              },
                            ]
                          : []),
                      ]
                  ).map((log: any, idx: number, arr: any[]) => {
                    const isLatest = idx === arr.length - 1;
                    const logDate = new Date(log.timestamp);
                    const formattedDate = !isNaN(logDate.getTime())
                      ? logDate.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";
                    const formattedTime = !isNaN(logDate.getTime())
                      ? logDate.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })
                      : "—";

                    return (
                      <div key={log.id || idx} className="relative group">
                        {/* Timeline Step Circle */}
                        <div
                          className={`absolute -left-[31px] sm:-left-[39px] top-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                            isLatest
                              ? "bg-primary text-white ring-4 ring-primary/20 scale-105"
                              : "bg-white border-2 border-slate-300 text-slate-700"
                          }`}
                        >
                          {idx + 1}
                        </div>

                        {/* Status Card */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 transition-all hover:border-slate-300">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                  log.status === "ARRIVED"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : log.status === "GATE_OUT"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : log.status === "ON_HOLD" || log.status === "REJECTED" || log.status === "CANCELLED"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-slate-100 text-slate-800 border border-slate-200"
                                }`}
                              >
                                {formatStatus(log.status)}
                              </span>
                              {isLatest && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Current Status
                                </span>
                              )}
                            </div>

                            {/* Timestamp with Date & Time */}
                            <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-semibold text-slate-800">{formattedDate}</span>
                              </div>
                              <span className="text-slate-300">•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-bold text-slate-950">{formattedTime}</span>
                              </div>
                            </div>
                          </div>

                          {/* Operator & Remarks details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 block font-medium">Updated / Logged By:</span>
                              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                {log.user?.name || log.updatedBy || entry.user?.name || "System"}
                                {log.user?.email && (
                                  <span className="text-slate-400 text-[11px] font-normal">({log.user.email})</span>
                                )}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block font-medium">Remarks / Movement Notes:</span>
                              <span className="text-slate-700 font-medium block mt-0.5">
                                {log.remarks || "Status transition recorded"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STOCK MODAL                                                               */}
      {/* ========================================================================= */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-800 text-base">Add Stock Detail</h3>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddStock} className="p-5 space-y-4">
              <div ref={stockDropdownRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Material Name *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={isStockLocked ? stockForm.materialName : stockSearchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStockSearchTerm(value);
                      setStockForm({ ...stockForm, stockId: "", materialName: value });
                      setIsStockLocked(false);
                      setShowStockSuggestions(true);
                    }}
                    onFocus={() => stockSearchTerm.length >= 2 && setShowStockSuggestions(true)}
                    className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Search catalog or type a name"
                    disabled={isStockLocked}
                  />
                  {isStockLocked && (
                    <button type="button" onClick={handleClearCatalogStock} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {showStockSuggestions && suggestedStocks.length > 0 && !isStockLocked && (
                  <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto text-sm divide-y divide-slate-100">
                    {suggestedStocks.map((stock) => (
                      <li key={stock.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors"
                          onClick={() => handleSelectCatalogStock(stock)}
                        >
                          <span className="font-bold text-slate-800 block">{stock.name}</span>
                          <span className="text-xs text-slate-500">{stock.code} · {stock.uom?.abbreviation}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Material Type *</label>
                <select
                  required
                  value={stockForm.materialType}
                  onChange={(e) => setStockForm({ ...stockForm, materialType: e.target.value })}
                  disabled={isStockLocked}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {MATERIAL_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Quantity *</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={stockForm.quantity} 
                    onChange={e => setStockForm({...stockForm, quantity: e.target.value})} 
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Unit *</label>
                  <select
                    value={stockForm.unit}
                    onChange={e => setStockForm({...stockForm, unit: e.target.value})}
                    disabled={isStockLocked}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm disabled:bg-slate-50 focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="tons">tons</option>
                    <option value="pcs">pcs</option>
                    <option value="bales">bales</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Batch / Lot (Optional)</label>
                <input 
                  type="text" 
                  value={stockForm.batchLot} 
                  onChange={e => setStockForm({...stockForm, batchLot: e.target.value})} 
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" 
                  placeholder="e.g. LOT-1234" 
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowStockModal(false)} 
                  className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="px-4 py-2.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? "Saving..." : "Save Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GATE DOCUMENT & VEHICLE PHOTO UPLOAD MODAL                                 */}
      {/* ========================================================================= */}
      <GateDocumentUploadModal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        entryId={entryId}
        defaultDocumentType={defaultDocType}
        onSuccess={() => fetchEntry()}
      />

      {/* ========================================================================= */}
      {/* GATE DOCUMENT & VEHICLE PHOTO FULLSCREEN LIGHTBOX                          */}
      {/* ========================================================================= */}
      <GateDocumentLightbox
        isOpen={Boolean(selectedLightboxDoc)}
        onClose={() => setSelectedLightboxDoc(null)}
        document={selectedLightboxDoc}
        canVerify={entry?.status !== "GATE_OUT"}
        onUpdateStatus={async (docId, status) => {
          await updateDocumentStatus(docId, status);
          setSelectedLightboxDoc((prev: any) => (prev ? { ...prev, status } : null));
        }}
        onDelete={async (docId, docType) => {
          await handleDeleteDocument(docId, docType);
          setSelectedLightboxDoc(null);
        }}
      />

      {/* ========================================================================= */}
      {/* TRANSPORT SLIP / GATE PASS PRINT PREVIEW MODAL                            */}
      {/* ========================================================================= */}
      <TransportSlipModal
        open={showSlipModal}
        onClose={() => setShowSlipModal(false)}
        entry={entry}
      />

      <GateBlockerModal
        isOpen={showBlockerModal}
        onClose={() => setShowBlockerModal(false)}
        data={blockerModalData}
      />
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-slate-400 [&>svg]:h-4 [&>svg]:w-4 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
      </div>
    </div>
  );
}
