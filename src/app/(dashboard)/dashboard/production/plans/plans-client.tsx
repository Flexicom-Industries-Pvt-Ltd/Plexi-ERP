"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, ClipboardList, Copy, Edit2, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { PRODUCTION_PHASES, PRODUCTION_PLAN_STATUSES, statusLabel } from "@/lib/production/phases";
import { PlanFormModal, formToPayload, planToFormDefaults } from "@/components/production/PlanFormModal";

export function ProductionPlansClient() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filterDate, setFilterDate] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [shifts, setShifts] = useState<any[]>([]);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filterDate) {
      params.set("dateFrom", filterDate);
      params.set("dateTo", filterDate);
    }
    if (filterShift) params.set("shiftId", filterShift);
    if (filterPhase) params.set("phase", filterPhase);
    if (filterStatus) params.set("status", filterStatus);
    const qs = params.toString();
    return `/api/production/plans${qs ? `?${qs}` : ""}`;
  }, [filterDate, filterShift, filterPhase, filterStatus]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildQuery());
      if (!res.ok) throw new Error("Failed to load plans");
      setPlans(await res.json());
    } catch {
      toast.error("Failed to load production plans");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetch("/api/settings/master-data/shift")
      .then((r) => r.ok ? r.json() : [])
      .then(setShifts)
      .catch(() => {});
  }, []);

  const handleCreate = async (data: Parameters<typeof formToPayload>[0]) => {
    const res = await fetch("/api/production/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(data)),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create plan");
    }
    toast.success("Production plan created");
    fetchPlans();
  };

  const handleEdit = async (data: Parameters<typeof formToPayload>[0]) => {
    if (!editingPlan) return;
    const res = await fetch(`/api/production/plans/${editingPlan.planNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(data)),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update plan");
    }
    toast.success("Plan updated");
    setEditingPlan(null);
    fetchPlans();
  };

  const handleDuplicate = async (plan: any) => {
    try {
      const res = await fetch(`/api/production/plans/${plan.planNumber}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to duplicate");
      }
      const dup = await res.json();
      toast.success(`Duplicated as ${dup.planNumber}`);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const plan = plans.find((p) => p.id === deletingId);
      const res = await fetch(`/api/production/plans/${plan?.planNumber}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Plan deleted");
      setDeletingId(null);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: "bg-slate-100 text-slate-600",
      APPROVED: "bg-blue-100 text-blue-700",
      IN_PROGRESS: "bg-amber-100 text-amber-700",
      COMPLETED: "bg-emerald-100 text-emerald-700",
      CANCELLED: "bg-red-100 text-red-600",
    };
    return map[status] || "bg-slate-100 text-slate-600";
  };

  const editDefaults = editingPlan ? planToFormDefaults(editingPlan) : {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Shift Plans</h2>
          <p className="text-sm text-slate-500">Create, edit, approve, and duplicate shift production plans.</p>
        </div>
        <button
          onClick={() => setFormMode("create")}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Plan
        </button>
      </div>

      <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
          <input type="date" className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Shift</label>
          <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
            <option value="">All</option>
            {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Phase</label>
          <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" value={filterPhase} onChange={(e) => setFilterPhase(e.target.value)}>
            <option value="">All</option>
            {PRODUCTION_PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
          <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            {PRODUCTION_PLAN_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {(filterDate || filterShift || filterPhase || filterStatus) && (
          <button
            onClick={() => { setFilterDate(""); setFilterShift(""); setFilterPhase(""); setFilterStatus(""); }}
            className="text-xs text-primary self-end pb-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-slate-400"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No plans found</h3>
          <p className="text-sm text-slate-500 mb-6">Create a shift plan or adjust your filters.</p>
          <button onClick={() => setFormMode("create")} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
            <Plus className="h-4 w-4" /> Create Plan
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Plan #</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Shift</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Lines</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Created By</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-primary">
                    <Link href={`/dashboard/production/plans/${plan.planNumber}`}>{plan.planNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{format(new Date(plan.planDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3 text-slate-600">{plan.shift?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{plan.lines?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(plan.status)}`}>
                      {statusLabel(plan.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{plan.createdBy?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/production/plans/${plan.planNumber}`} className="p-1.5 text-slate-400 hover:text-primary" title="View">
                        <Eye className="h-4 w-4" />
                      </Link>
                      {plan.status === "DRAFT" && (
                        <button onClick={() => setEditingPlan(plan)} className="p-1.5 text-slate-400 hover:text-primary" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleDuplicate(plan)} className="p-1.5 text-slate-400 hover:text-primary" title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </button>
                      {plan.status === "DRAFT" && (
                        <button onClick={() => setDeletingId(plan.id)} className="p-1.5 text-slate-400 hover:text-red-500" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PlanFormModal
        open={formMode === "create"}
        title="New Production Plan"
        submitLabel="Create Plan"
        onClose={() => setFormMode(null)}
        onSubmit={handleCreate}
      />

      <PlanFormModal
        open={!!editingPlan}
        title={`Edit ${editingPlan?.planNumber ?? "Plan"}`}
        submitLabel="Save Changes"
        {...editDefaults}
        onClose={() => setEditingPlan(null)}
        onSubmit={handleEdit}
      />

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">Delete draft plan?</h3>
            <p className="text-sm text-slate-500 mb-4">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
