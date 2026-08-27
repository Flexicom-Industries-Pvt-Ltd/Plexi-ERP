"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Search, 
  Plus, 
  Filter, 
  RefreshCw, 
  Truck, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Edit,
  Trash2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { GateEntryStatus, GatePurpose } from "@/generated/prisma";

export function GateClient() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [purposeFilter, setPurposeFilter] = useState<string>("");

  // Actions state
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editEntry, setEditEntry] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("truckNumber", search);
      if (statusFilter) params.set("status", statusFilter);
      if (purposeFilter) params.set("purpose", purposeFilter);

      const res = await fetch(`/api/gate?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch gate entries");
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, purposeFilter]);

  const handleDelete = async () => {
    if (!deleteEntryId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/gate/${deleteEntryId}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete");
      }
      toast.success("Gate entry deleted successfully");
      setDeleteEntryId(null);
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete gate entry");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry) return;
    setIsEditing(true);
    try {
      const res = await fetch(`/api/gate/${editEntry.entryNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckNumber: editEntry.truckNumber,
          driverName: editEntry.driverName,
          driverContact: editEntry.driverContact,
          transporter: editEntry.transporter,
          supplierCustomer: editEntry.supplierCustomer,
          purpose: editEntry.purpose,
          status: editEntry.status,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Gate entry updated successfully");
      setEditEntry(null);
      fetchEntries();
    } catch (err) {
      toast.error("Failed to update gate entry");
    } finally {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Derived stats
  const activeTrucks = entries.filter(e => e.status !== "GATE_OUT" && e.status !== "CANCELLED" && e.status !== "REJECTED").length;
  const waitingTrucks = entries.filter(e => e.status === "PARKING" || e.status === "READY").length;
  const inProgressTrucks = entries.filter(e => e.status === "LOADING" || e.status === "UNLOADING").length;

  return (
    <div className="space-y-6">
      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Inside" value={activeTrucks.toString()} icon={<Truck className="h-5 w-5" />} color="blue" />
        <StatCard label="Waiting / Parked" value={waitingTrucks.toString()} icon={<Clock className="h-5 w-5" />} color="orange" />
        <StatCard label="Loading / Unloading" value={inProgressTrucks.toString()} icon={<RefreshCw className="h-5 w-5" />} color="purple" />
        <StatCard label="Total Today" value={entries.length.toString()} icon={<ShieldCheck className="h-5 w-5" />} color="green" />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm justify-between items-center">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search truck number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50"
          >
            <option value="">All Statuses</option>
            {Object.values(GateEntryStatus).map(s => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>

          <select
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50"
          >
            <option value="">All Purposes</option>
            {Object.values(GatePurpose).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchEntries}
            disabled={loading}
            className="inline-flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/dashboard/gate/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Entry
          </Link>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Entry No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Truck No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Arrival Time</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Purpose</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Transporter</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Truck className="h-12 w-12 stroke-1" />
                      <div>
                        <p className="font-medium text-slate-600">No gate entries found</p>
                        <p className="text-sm">Create a new entry for arriving trucks.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3 font-medium text-primary">{entry.entryNumber}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{entry.truckNumber}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(entry.arrivalTime).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {entry.purpose}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{entry.transporter || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/gate/${entry.entryNumber}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-all"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => setEditEntry({ ...entry })}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteEntryId(entry.entryNumber)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Edit Modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Edit Gate Entry</h3>
              <button onClick={() => setEditEntry(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Truck Number *</label>
                  <input required type="text" value={editEntry.truckNumber} onChange={e => setEditEntry({...editEntry, truckNumber: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Purpose *</label>
                  <select required value={editEntry.purpose} onChange={e => setEditEntry({...editEntry, purpose: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm">
                    {Object.values(GatePurpose).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status *</label>
                  <select required value={editEntry.status} onChange={e => setEditEntry({...editEntry, status: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm">
                    {Object.values(GateEntryStatus).map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Driver Name *</label>
                  <input required type="text" value={editEntry.driverName} onChange={e => setEditEntry({...editEntry, driverName: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Driver Contact</label>
                  <input type="text" value={editEntry.driverContact} onChange={e => setEditEntry({...editEntry, driverContact: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Transporter</label>
                  <input type="text" value={editEntry.transporter || ""} onChange={e => setEditEntry({...editEntry, transporter: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Supplier / Customer</label>
                  <input type="text" value={editEntry.supplierCustomer || ""} onChange={e => setEditEntry({...editEntry, supplierCustomer: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setEditEntry(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200">Cancel</button>
                <button type="submit" disabled={isEditing} className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90">{isEditing ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Gate Entry</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete this gate entry ({deleteEntryId})? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteEntryId(null)} className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">{isDeleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: "from-blue-50 to-blue-100/50 border-blue-200 text-blue-700",
    green: "from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700",
    purple: "from-violet-50 to-violet-100/50 border-violet-200 text-violet-700",
    orange: "from-amber-50 to-amber-100/50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`flex items-center gap-4 p-5 rounded-2xl border bg-gradient-to-br ${colors[color]} transition-all shadow-sm`}>
      <div className="p-3 rounded-xl bg-white shadow-sm shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
        <p className="text-2xl font-bold leading-none">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ARRIVED: "bg-blue-100 text-blue-800 border-blue-200",
    DOCUMENT_VERIFICATION: "bg-purple-100 text-purple-800 border-purple-200",
    VERIFIED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PARKING: "bg-amber-100 text-amber-800 border-amber-200",
    READY: "bg-teal-100 text-teal-800 border-teal-200",
    LOADING: "bg-indigo-100 text-indigo-800 border-indigo-200",
    UNLOADING: "bg-indigo-100 text-indigo-800 border-indigo-200",
    COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    GATE_OUT: "bg-slate-100 text-slate-800 border-slate-200",
    ON_HOLD: "bg-red-100 text-red-800 border-red-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    CANCELLED: "bg-slate-100 text-slate-800 border-slate-200",
  };
  
  const className = styles[status] || "bg-slate-100 text-slate-800 border-slate-200";
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}>
      {status.replace("_", " ")}
    </span>
  );
}
