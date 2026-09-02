"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, ClipboardList, X } from "lucide-react";
import { format } from "date-fns";
import { PRODUCTION_PHASES, statusLabel } from "@/lib/production/phases";
import { DynamicCharacteristicsForm, CharacteristicValueInput } from "@/components/production/DynamicCharacteristicsForm";
import type { ProductionCharacteristicDefinition } from "@/generated/prisma";

interface PlanLine {
  phase: string;
  machineId: string;
  operatorId: string;
  targetQty: number;
  priority: number;
  instructions: string;
  characteristics: CharacteristicValueInput[];
}

const emptyLine = (): PlanLine => ({
  phase: "LOOM",
  machineId: "",
  operatorId: "",
  targetQty: 0,
  priority: 0,
  instructions: "",
  characteristics: [],
});

export function ProductionPlansClient() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [shifts, setShifts] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<ProductionCharacteristicDefinition[]>([]);

  const [shiftId, setShiftId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PlanLine[]>([emptyLine()]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production/plans");
      if (!res.ok) throw new Error("Failed to load plans");
      setPlans(await res.json());
    } catch {
      toast.error("Failed to load production plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openForm = async () => {
    setShowForm(true);
    setShiftId("");
    setNotes("");
    setLines([emptyLine()]);

    const [shiftRes, machineRes, userRes, defRes] = await Promise.all([
      fetch("/api/settings/master-data/shift"),
      fetch("/api/settings/master-data/machine"),
      fetch("/api/production/operators"),
      fetch("/api/production/characteristics/definitions"),
    ]);

    if (shiftRes.ok) setShifts(await shiftRes.json());
    if (machineRes.ok) setMachines(await machineRes.json());
    if (userRes.ok) {
      setUsers(await userRes.json());
    }
    if (defRes.ok) setDefinitions(await defRes.json());
  };

  const updateLine = (index: number, patch: Partial<PlanLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/production/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId: shiftId || null,
          notes: notes || null,
          status: "DRAFT",
          lines: lines.map((l, i) => ({
            phase: l.phase,
            machineId: l.machineId || null,
            operatorId: l.operatorId || null,
            targetQty: l.targetQty,
            priority: l.priority,
            instructions: l.instructions || null,
            sortOrder: i,
            characteristics: l.characteristics.filter((c) => c.value !== ""),
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create plan");
      }

      toast.success("Production plan created");
      setShowForm(false);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Shift Plans</h2>
          <p className="text-sm text-slate-500">Create and manage production shift plans with phase characteristics.</p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Plan
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No plans yet</h3>
          <p className="text-sm text-slate-500 mb-6">Create your first shift plan to get started.</p>
          <button
            onClick={openForm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Create Plan
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Plan #</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Shift</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Lines</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-primary">{plan.planNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{format(new Date(plan.planDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3 text-slate-600">{plan.shift?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{plan.lines?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(plan.status)}`}>
                      {statusLabel(plan.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{plan.createdBy?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">New Production Plan</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Shift</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                  >
                    <option value="">No shift</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <input
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Plan Lines</h4>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => [...prev, emptyLine()])}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    + Add Line
                  </button>
                </div>

                {lines.map((line, index) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Line {index + 1}</span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Phase *</label>
                        <select
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          value={line.phase}
                          onChange={(e) => updateLine(index, { phase: e.target.value, characteristics: [] })}
                          required
                        >
                          {PRODUCTION_PHASES.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Target Qty</label>
                        <input
                          type="number"
                          min={0}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          value={line.targetQty}
                          onChange={(e) => updateLine(index, { targetQty: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Machine</label>
                        <select
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          value={line.machineId}
                          onChange={(e) => updateLine(index, { machineId: e.target.value })}
                        >
                          <option value="">None</option>
                          {machines.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
                        <select
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          value={line.operatorId}
                          onChange={(e) => updateLine(index, { operatorId: e.target.value })}
                        >
                          <option value="">None</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          value={line.priority}
                          onChange={(e) => updateLine(index, { priority: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Instructions</label>
                        <input
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          value={line.instructions}
                          onChange={(e) => updateLine(index, { instructions: e.target.value })}
                          placeholder="Operator instructions"
                        />
                      </div>
                    </div>

                    <DynamicCharacteristicsForm
                      phase={line.phase}
                      definitions={definitions}
                      values={line.characteristics}
                      onChange={(chars) => updateLine(index, { characteristics: chars })}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
