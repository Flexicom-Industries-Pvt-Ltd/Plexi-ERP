"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { GateEntryStatus } from "@/generated/prisma";

const LIFECYCLE_STEPS = [
  { id: "ARRIVED", label: "Arrived" },
  { id: "DOCUMENT_VERIFICATION", label: "Verification" },
  { id: "PARKING", label: "Parking" },
  { id: "LOADING", label: "Loading/Unloading" },
  { id: "GATE_OUT", label: "Gate Out" },
];

export function GateDetailsClient({ entryId }: { entryId: string }) {
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Modals & Menus state
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms state
  const [stockForm, setStockForm] = useState({ materialName: "", materialType: "", quantity: "", unit: "kg", batchLot: "", expectedQuantity: "" });
  const [docForm, setDocForm] = useState({ documentType: "", remarks: "" });

  const fetchEntry = useCallback(async () => {
    try {
      const res = await fetch(`/api/gate/${entryId}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setEntry(data);
    } catch (err) {
      toast.error("Failed to fetch entry details");
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const updateStatus = async (newStatus: string) => {
    if (newStatus === entry.status) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/gate/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      await fetchEntry();
      toast.success("Status updated");
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
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

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/gate/${entryId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stockForm),
      });
      if (!res.ok) throw new Error();
      await fetchEntry();
      setShowStockModal(false);
      setStockForm({ materialName: "", materialType: "", quantity: "", unit: "kg", batchLot: "", expectedQuantity: "" });
      toast.success("Stock detail added");
    } catch (err) {
      toast.error("Failed to add stock detail");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/gate/${entryId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Dummy fileUrl for now since we aren't using S3
        body: JSON.stringify({ ...docForm, fileUrl: "local-check" }),
      });
      if (!res.ok) throw new Error();
      await fetchEntry();
      setShowDocModal(false);
      setDocForm({ documentType: "", remarks: "" });
      toast.success("Document added");
    } catch (err) {
      toast.error("Failed to add document");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading details...</div>;
  if (!entry) return <div className="text-center py-12 text-red-500">Entry not found</div>;

  const nextStatus = entry ? getNextStatus(entry.status, entry.purpose) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          {nextStatus && entry.status !== "GATE_OUT" && entry.status !== "CANCELLED" && (
            <button 
              onClick={() => updateStatus(nextStatus)}
              disabled={updating}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 shadow-sm disabled:opacity-50 transition-colors"
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

      {/* Lifecycle Stepper */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
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

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center border-b border-slate-100 px-2 overflow-x-auto">
          {["overview", "stock", "documents"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-semibold capitalize whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Arrival Information</h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                  <DetailRow icon={<Clock />} label="Arrived At" value={new Date(entry.arrivalTime).toLocaleString()} />
                  <DetailRow icon={<User />} label="Driver" value={entry.driverName} />
                  <DetailRow icon={<Phone />} label="Driver Contact" value={entry.driverContact || "—"} />
                  <DetailRow icon={<Briefcase />} label="Transporter" value={entry.transporter || "—"} />
                  <DetailRow icon={<MapPin />} label="Party" value={entry.supplierCustomer || "—"} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Consignment / Purpose</h3>
                <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                  <DetailRow icon={<FileText />} label="Purpose" value={entry.purpose} />
                  <DetailRow icon={<Package />} label="Expected Material" value={entry.expectedMaterial || "—"} />
                  <DetailRow icon={<RefreshCw />} label="Expected Quantity" value={entry.expectedQuantity ? `${entry.expectedQuantity}` : "—"} />
                  <DetailRow icon={<User />} label="Logged By" value={entry.user?.name || entry.createdBy || "System"} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "stock" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Stock Details</h3>
                <button 
                  onClick={() => setShowStockModal(true)}
                  disabled={entry.status === "GATE_OUT"}
                  title={entry.status === "GATE_OUT" ? "Cannot add stock after Gate Out" : ""}
                  className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md ${
                    entry.status === "GATE_OUT" 
                      ? "text-slate-400 bg-slate-100 cursor-not-allowed" 
                      : "text-primary hover:underline bg-primary/5"
                  }`}
                >
                  <Package className="h-3.5 w-3.5" /> Add Stock Item
                </button>
              </div>
              {entry.stockDetails?.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Batch/Lot</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entry.stockDetails.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-800">{item.materialName}</td>
                          <td className="px-4 py-3 text-slate-500">{item.materialType || "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{item.batchLot || "—"}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700 text-right">{item.quantity} {item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-slate-500 text-sm">
                  No stock details added yet.
                </div>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Documents</h3>
                <button 
                  onClick={() => setShowDocModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline bg-primary/5 px-3 py-1.5 rounded-md"
                >
                  <Upload className="h-3.5 w-3.5" /> Add Document
                </button>
              </div>
              {entry.documents?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {entry.documents.map((doc: any) => (
                    <div key={doc.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-start gap-4">
                       <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                         <FileText className="h-6 w-6" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between gap-2 mb-1">
                           <h4 className="font-semibold text-slate-800 truncate">{doc.documentType}</h4>
                           <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                             doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                             doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                             'bg-amber-100 text-amber-700'
                           }`}>
                             {doc.status}
                           </span>
                         </div>
                         <p className="text-xs text-slate-500 truncate mb-2">{doc.remarks || "No remarks"}</p>
                         {doc.fileUrl && (
                           <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View File</a>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-slate-500 text-sm flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-slate-300" />
                  No documents uploaded.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Add Stock Detail</h3>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddStock} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Material Name *</label>
                <input required type="text" value={stockForm.materialName} onChange={e => setStockForm({...stockForm, materialName: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="e.g. PP Granules" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
                  <input required type="number" step="0.01" value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unit *</label>
                  <select value={stockForm.unit} onChange={e => setStockForm({...stockForm, unit: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm">
                    <option value="kg">kg</option>
                    <option value="tons">tons</option>
                    <option value="pcs">pcs</option>
                    <option value="bales">bales</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batch / Lot (Optional)</label>
                <input type="text" value={stockForm.batchLot} onChange={e => setStockForm({...stockForm, batchLot: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="e.g. LOT-1234" />
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90">{submitting ? "Saving..." : "Save Stock"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Add Document</h3>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddDoc} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Document Type *</label>
                <select required value={docForm.documentType} onChange={e => setDocForm({...docForm, documentType: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm">
                  <option value="">Select Type</option>
                  <option value="Weighbridge Slip">Weighbridge Slip</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Delivery Challan">Delivery Challan</option>
                  <option value="Purchase Order">Purchase Order</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Remarks / Reference No.</label>
                <textarea value={docForm.remarks} onChange={e => setDocForm({...docForm, remarks: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="e.g. Challan #12345" rows={3}></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setShowDocModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90">{submitting ? "Saving..." : "Add Document"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-slate-400 [&>svg]:h-4 [&>svg]:w-4 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
