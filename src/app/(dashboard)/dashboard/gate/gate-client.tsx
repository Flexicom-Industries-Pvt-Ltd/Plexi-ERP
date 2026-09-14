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
  ChevronDown,
  Edit,
  Trash2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { GateEntryStatus, GatePurpose } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type GateClientProps = {
  initialEntries?: any[];
  initialStats?: {
    inside: number;
    waiting: number;
    loading: number;
    unloading: number;
    verificationPending: number;
    onHold: number;
    gateOutToday: number;
  };
};

export function GateClient({
  initialEntries = [],
  initialStats = {
    inside: 0,
    waiting: 0,
    loading: 0,
    unloading: 0,
    verificationPending: 0,
    onHold: 0,
    gateOutToday: 0,
  },
}: GateClientProps) {
  const [entries, setEntries] = useState<any[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(initialStats);
  
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

      const [res, statsRes] = await Promise.all([
        fetch(`/api/gate?${params.toString()}`),
        fetch("/api/gate/stats"),
      ]);
      if (!res.ok) throw new Error("Failed to fetch gate entries");
      const data = await res.json();
      const entriesList = Array.isArray(data)
        ? data
        : data?.data && Array.isArray(data.data)
        ? data.data
        : [];
      setEntries(entriesList);
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, purposeFilter]);

  // Only refetch when user changes search or filter controls
  const isFirstMount = useState(true);
  useEffect(() => {
    if (isFirstMount[0]) {
      isFirstMount[1](false);
      if (!search && !statusFilter && !purposeFilter && initialEntries.length > 0) {
        return;
      }
    }
    fetchEntries();
  }, [search, statusFilter, purposeFilter, fetchEntries]);

  // Optimistic Delete
  const handleDelete = async () => {
    if (!deleteEntryId) return;
    const targetId = deleteEntryId;
    const prevEntries = [...entries];
    
    // 0ms Optimistic UI update
    setEntries((prev) => prev.filter((e) => e.id !== targetId && e.entryNumber !== targetId));
    setDeleteEntryId(null);
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/gate/${targetId}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete");
      }
      toast.success("Gate entry deleted successfully");
      // Sync stats in background
      fetch("/api/gate/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => s && setStats(s))
        .catch(() => {});
    } catch (err: any) {
      setEntries(prevEntries);
      toast.error(err.message || "Failed to delete gate entry");
    } finally {
      setIsDeleting(false);
    }
  };

  // Optimistic Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry) return;
    const target = { ...editEntry };
    const prevEntries = [...entries];

    // 0ms Optimistic UI update
    setEntries((prev) =>
      prev.map((item) => (item.entryNumber === target.entryNumber ? { ...item, ...target } : item)),
    );
    setEditEntry(null);
    setIsEditing(true);

    try {
      const res = await fetch(`/api/gate/${target.entryNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truckNumber: target.truckNumber,
          driverName: target.driverName,
          driverContact: target.driverContact,
          transporter: target.transporter,
          supplierCustomer: target.supplierCustomer,
          purpose: target.purpose,
          status: target.status,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Gate entry updated successfully");
      fetch("/api/gate/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => s && setStats(s))
        .catch(() => {});
    } catch {
      setEntries(prevEntries);
      toast.error("Failed to update gate entry");
    } finally {
      setIsEditing(false);
    }
  };

  // Optimistic Quick Status Advance
  const handleQuickStatusUpdate = async (entryNumber: string, newStatus: string) => {
    const prevEntries = [...entries];
    
    // 0ms Optimistic UI update
    setEntries((prev) =>
      prev.map((item) => (item.entryNumber === entryNumber ? { ...item, status: newStatus } : item)),
    );

    try {
      const res = await fetch(`/api/gate/${entryNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to advance status");
      }
      toast.success("Status advanced successfully");
      fetch("/api/gate/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => s && setStats(s))
        .catch(() => {});
    } catch (err: unknown) {
      setEntries(prevEntries);
      toast.error(err instanceof Error ? err.message : "Failed to advance status");
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

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-full min-w-0">
      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3 w-full">
        <StatCard label="Inside Factory" value={stats.inside.toString()} icon={<Truck className="h-4 w-4 sm:h-5 sm:w-5" />} color="blue" />
        <StatCard label="Waiting / Parked" value={stats.waiting.toString()} icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />} color="orange" />
        <StatCard label="Loading" value={stats.loading.toString()} icon={<RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />} color="purple" />
        <StatCard label="Unloading" value={stats.unloading.toString()} icon={<RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />} color="indigo" />
        <StatCard label="Doc Verification" value={stats.verificationPending.toString()} icon={<AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />} color="amber" />
        <StatCard label="On Hold" value={stats.onHold.toString()} icon={<XCircle className="h-4 w-4 sm:h-5 sm:w-5" />} color="red" />
        <StatCard label="Gate Out Today" value={stats.gateOutToday.toString()} icon={<ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />} color="green" />
      </div>

      {/* ── Desktop Toolbar ── */}
      <div className="hidden md:flex flex-row gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative min-w-[240px]">
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

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEntries}
            disabled={loading}
            className="inline-flex items-center justify-center p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white disabled:opacity-50"
            title="Refresh"
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

      {/* ── Mobile Toolbar Card ── */}
      <div className="flex md:hidden flex-col gap-2.5 p-3 bg-white rounded-xl border border-slate-200 shadow-sm w-full">
        {/* Top Row: Search + Refresh + New Entry */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search truck..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={fetchEntries}
            disabled={loading}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 bg-white disabled:opacity-50 shrink-0"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/dashboard/gate/new"
            className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-xs shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </Link>
        </div>

        {/* Second Row: Filters Grid */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 text-slate-700 truncate"
          >
            <option value="">All Statuses</option>
            {Object.values(GateEntryStatus).map(s => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>

          <select
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 text-slate-700 truncate"
          >
            <option value="">All Purposes</option>
            {Object.values(GatePurpose).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Mobile Quick Status Filter Chips (Horizontal Scroll) ── */}
      <div className="flex md:hidden overflow-x-auto gap-1.5 pb-1 no-scrollbar w-full">
        {[
          { label: "All", value: "" },
          { label: "Arrived", value: "ARRIVED" },
          { label: "Doc Verification", value: "DOCUMENT_VERIFICATION" },
          { label: "Verified", value: "VERIFIED" },
          { label: "Parking", value: "PARKING" },
          { label: "Ready", value: "READY" },
          { label: "Loading", value: "LOADING" },
          { label: "Unloading", value: "UNLOADING" },
          { label: "Completed", value: "COMPLETED" },
          { label: "Gate Out", value: "GATE_OUT" },
          { label: "On Hold", value: "ON_HOLD" },
        ].map((chip) => {
          const isActive = statusFilter === chip.value;
          return (
            <button
              key={chip.label}
              onClick={() => setStatusFilter(chip.value)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all touch-manipulation",
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 active:bg-slate-100"
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ── Table (Desktop) & Cards (Mobile) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
        {/* Mobile View (Touch-Optimized App-Like Cards) */}
        <div className="block md:hidden divide-y divide-slate-100 bg-slate-50/50">
          {loading && entries.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-medium text-xs">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center gap-3 text-slate-400">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <Truck className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm">No gate entries found</p>
                <p className="text-xs text-slate-500 mt-0.5">Arriving trucks will appear here in real-time.</p>
              </div>
            </div>
          ) : (
            entries.map((entry) => {
              const nextStatus = getNextStatus(entry.status, entry.purpose);
              const materialsSummary = entry.stockDetails && entry.stockDetails.length > 0
                ? entry.stockDetails.map((s: any) => `${s.materialName} (${s.actualQuantity ?? s.quantity} ${s.unit || "kg"})`).join(", ")
                : entry.expectedMaterial
                ? `${entry.expectedMaterial}${entry.expectedQuantity ? ` (${entry.expectedQuantity})` : ""}`
                : null;

              return (
                <div
                  key={entry.id}
                  className="p-3.5 bg-white flex flex-col gap-2.5 active:bg-slate-50/80 transition-colors"
                >
                  {/* Top: License Badge + Purpose + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="inline-flex items-center px-2 py-0.5 rounded bg-slate-950 text-amber-300 font-mono text-xs font-black tracking-wider border border-slate-800 shadow-2xs">
                        {entry.truckNumber}
                      </div>
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {entry.purpose}
                      </span>
                    </div>
                    <StatusBadge status={entry.status} />
                  </div>

                  {/* Subtitle: Entry number + Arrival time */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono text-primary font-medium">{entry.entryNumber}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {new Date(entry.arrivalTime).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Driver</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {entry.driverName || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Transporter</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {entry.transporter || "—"}
                      </span>
                    </div>
                    {entry.supplierCustomer && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Supplier / Customer</span>
                        <span className="font-medium text-slate-800 truncate block">
                          {entry.supplierCustomer}
                        </span>
                      </div>
                    )}
                    {materialsSummary && (
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-600 flex items-start gap-1">
                        <span className="font-semibold text-slate-700 shrink-0">📦 Items:</span>
                        <span className="truncate">{materialsSummary}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {nextStatus ? (
                      <button
                        onClick={() => handleQuickStatusUpdate(entry.entryNumber, nextStatus)}
                        className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold active:scale-[0.98] transition-transform shadow-xs touch-manipulation"
                      >
                        <span>Advance to {nextStatus.replace(/_/g, " ")}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    ) : (
                      <div className="flex-1 min-h-[40px] flex items-center justify-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Completed / Gate Out
                      </div>
                    )}

                    <Link
                      href={`/dashboard/gate/${entry.entryNumber}`}
                      className="min-h-[40px] px-3 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors text-xs font-semibold shrink-0"
                      title="Manage Truck"
                    >
                      Manage
                    </Link>

                    <button
                      onClick={() => setEditEntry({ ...entry })}
                      className="min-h-[40px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors shrink-0"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteEntryId(entry.entryNumber)}
                      className="min-h-[40px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
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
                      <div className="flex items-center gap-2">
                        <StatusBadge status={entry.status} />
                        {(() => {
                          const next = getNextStatus(entry.status, entry.purpose);
                          if (!next) return null;
                          return (
                            <button
                              onClick={() => handleQuickStatusUpdate(entry.entryNumber, next)}
                              className="flex items-center justify-center p-1 rounded-full text-slate-400 hover:text-white hover:bg-primary transition-all shadow-sm border border-transparent hover:border-primary"
                              title={`Advance to ${next.replace(/_/g, " ")}`}
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          );
                        })()}
                      </div>
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-semibold text-slate-800 text-sm sm:text-base">Edit Gate Entry</h3>
              <button onClick={() => setEditEntry(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  <input type="text" value={editEntry.driverContact || ""} onChange={e => setEditEntry({...editEntry, driverContact: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Transporter</label>
                  <input type="text" value={editEntry.transporter || ""} onChange={e => setEditEntry({...editEntry, transporter: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Supplier / Customer</label>
                  <input type="text" value={editEntry.supplierCustomer || ""} onChange={e => setEditEntry({...editEntry, supplierCustomer: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
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
              <button
                type="button"
                onClick={() => setDeleteEntryId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) */}
      <Link
        href="/dashboard/gate/new"
        className="fixed bottom-6 right-5 z-40 md:hidden inline-flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 active:scale-95 transition-all text-sm font-bold touch-manipulation border border-white/20"
        aria-label="New Gate Entry"
      >
        <Plus className="h-5 w-5" />
        <span>New Truck</span>
      </Link>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string; iconText: string }> = {
    blue: { bg: "bg-blue-50/70", border: "border-blue-200/80", text: "text-blue-900", iconBg: "bg-blue-100", iconText: "text-blue-600" },
    orange: { bg: "bg-amber-50/70", border: "border-amber-200/80", text: "text-amber-900", iconBg: "bg-amber-100", iconText: "text-amber-600" },
    purple: { bg: "bg-purple-50/70", border: "border-purple-200/80", text: "text-purple-900", iconBg: "bg-purple-100", iconText: "text-purple-600" },
    indigo: { bg: "bg-indigo-50/70", border: "border-indigo-200/80", text: "text-indigo-900", iconBg: "bg-indigo-100", iconText: "text-indigo-600" },
    amber: { bg: "bg-yellow-50/70", border: "border-yellow-200/80", text: "text-yellow-900", iconBg: "bg-yellow-100", iconText: "text-yellow-600" },
    red: { bg: "bg-rose-50/70", border: "border-rose-200/80", text: "text-rose-900", iconBg: "bg-rose-100", iconText: "text-rose-600" },
    green: { bg: "bg-emerald-50/70", border: "border-emerald-200/80", text: "text-emerald-900", iconBg: "bg-emerald-100", iconText: "text-emerald-600" },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className={cn("flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl border shadow-xs transition-all hover:shadow-sm min-w-0", scheme.bg, scheme.border)}>
      <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg shadow-2xs", scheme.iconBg, scheme.iconText)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate" title={label}>
          {label}
        </p>
        <p className={cn("text-lg sm:text-2xl font-extrabold tracking-tight leading-none mt-0.5 sm:mt-1", scheme.text)}>
          {value}
        </p>
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
      {status.replace(/_/g, " ")}
    </span>
  );
}
