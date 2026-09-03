"use client";

import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { PRODUCTION_PHASES } from "@/lib/production/phases";
import {
  FINISHING_ROUTES,
  isFinishingPhase,
  phaseForFinishingRoute,
  finishingRouteDescription,
} from "@/lib/production/finishing-routes";
import { DynamicCharacteristicsForm, CharacteristicValueInput } from "@/components/production/DynamicCharacteristicsForm";
import { OperatorMultiSelect } from "@/components/production/OperatorMultiSelect";
import type { ProductionCharacteristicDefinition } from "@/generated/prisma";

export interface PlanLineForm {
  phase: string;
  finishingRoute: string;
  machineId: string;
  operatorIds: string[];
  inventoryItemId: string;
  targetQty: number;
  priority: number;
  instructions: string;
  characteristics: CharacteristicValueInput[];
}

export const emptyPlanLine = (): PlanLineForm => ({
  phase: "LOOM",
  finishingRoute: "",
  machineId: "",
  operatorIds: [],
  inventoryItemId: "",
  targetQty: 0,
  priority: 0,
  instructions: "",
  characteristics: [],
});

interface Props {
  open: boolean;
  title: string;
  submitLabel: string;
  initialShiftId?: string;
  initialPlanDate?: string;
  initialNotes?: string;
  initialLines?: PlanLineForm[];
  onClose: () => void;
  onSubmit: (data: {
    shiftId: string;
    planDate: string;
    notes: string;
    lines: PlanLineForm[];
  }) => Promise<void>;
}

export function PlanFormModal({
  open,
  title,
  submitLabel,
  initialShiftId = "",
  initialPlanDate = "",
  initialNotes = "",
  initialLines,
  onClose,
  onSubmit,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<ProductionCharacteristicDefinition[]>([]);

  const [shiftId, setShiftId] = useState(initialShiftId);
  const [planDate, setPlanDate] = useState(initialPlanDate || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(initialNotes);
  const [lines, setLines] = useState<PlanLineForm[]>(initialLines || [emptyPlanLine()]);

  useEffect(() => {
    if (!open) return;
    setShiftId(initialShiftId);
    setPlanDate(initialPlanDate || new Date().toISOString().slice(0, 10));
    setNotes(initialNotes);
    setLines(initialLines?.length ? initialLines : [emptyPlanLine()]);

    setLoading(true);
    Promise.all([
      fetch("/api/settings/master-data/shift"),
      fetch("/api/settings/master-data/machine"),
      fetch("/api/production/operators"),
      fetch("/api/inventory/items?type=SEMI_FINISHED_GOOD"),
      fetch("/api/inventory/items?type=FINISHED_GOOD"),
      fetch("/api/production/characteristics/definitions"),
    ]).then(async ([shiftRes, machineRes, userRes, semiRes, finishedRes, defRes]) => {
      if (shiftRes.ok) setShifts(await shiftRes.json());
      if (machineRes.ok) setMachines(await machineRes.json());
      if (userRes.ok) setUsers(await userRes.json());
      const semi = semiRes.ok ? await semiRes.json() : [];
      const finished = finishedRes.ok ? await finishedRes.json() : [];
      setProducts([...semi, ...finished]);
      if (defRes.ok) setDefinitions(await defRes.json());
    }).finally(() => setLoading(false));
  }, [open, initialShiftId, initialPlanDate, initialNotes, initialLines]);

  const updateLine = (index: number, patch: Partial<PlanLineForm>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const applyFinishingRoute = (index: number, route: string) => {
    const phase = phaseForFinishingRoute(route);
    updateLine(index, { finishingRoute: route, phase, characteristics: [] });
  };

  const onPhaseChange = (index: number, phase: string) => {
    const patch: Partial<PlanLineForm> = { phase, characteristics: [] };
    if (isFinishingPhase(phase)) {
      patch.finishingRoute = phase;
    } else {
      patch.finishingRoute = "";
    }
    updateLine(index, patch);
  };

  const onProductChange = async (index: number, inventoryItemId: string, productsList: any[]) => {
    updateLine(index, { inventoryItemId });
    if (!inventoryItemId) return;
    const product = productsList.find((p) => p.id === inventoryItemId);
    const categoryId = product?.categoryId || product?.category?.id;
    if (!categoryId) return;
    try {
      const res = await fetch(`/api/production/finishing/defaults?categoryId=${categoryId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.route) {
        applyFinishingRoute(index, data.route);
      }
    } catch {
      // optional default — ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ shiftId, planDate, notes, lines });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan Date *</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Shift *</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                >
                  <option value="">Select shift</option>
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
                  onClick={() => setLines((prev) => [...prev, emptyPlanLine()])}
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
                        onChange={(e) => onPhaseChange(index, e.target.value)}
                        required
                      >
                        {PRODUCTION_PHASES.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Product</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        value={line.inventoryItemId}
                        onChange={(e) => onProductChange(index, e.target.value, products)}
                      >
                        <option value="">None</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                        ))}
                      </select>
                    </div>
                    {isFinishingPhase(line.phase) && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Finishing Route *</label>
                        <select
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          value={line.finishingRoute || line.phase}
                          onChange={(e) => applyFinishingRoute(index, e.target.value)}
                          required
                        >
                          {FINISHING_ROUTES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                          {finishingRouteDescription(line.finishingRoute || line.phase)}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Target Qty *</label>
                      <input
                        type="number"
                        min={0}
                        required
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

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Operators / Team</label>
                    <OperatorMultiSelect
                      users={users}
                      value={line.operatorIds}
                      onChange={(ids) => updateLine(index, { operatorIds: ids })}
                    />
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
                onClick={onClose}
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
                {submitLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function planLineToForm(line: any): PlanLineForm {
  return {
    phase: line.phase,
    finishingRoute: line.finishingRoute || (isFinishingPhase(line.phase) ? line.phase : ""),
    machineId: line.machineId || "",
    operatorIds: line.operators?.map((o: any) => o.userId) || (line.operatorId ? [line.operatorId] : []),
    inventoryItemId: line.inventoryItemId || "",
    targetQty: line.targetQty,
    priority: line.priority,
    instructions: line.instructions || "",
    characteristics: line.characteristics?.map((c: any) => ({
      definitionId: c.definitionId,
      value: c.value,
    })) || [],
  };
}

export function planToFormDefaults(plan: any) {
  return {
    initialShiftId: plan.shiftId || "",
    initialPlanDate: plan.planDate ? new Date(plan.planDate).toISOString().slice(0, 10) : "",
    initialNotes: plan.notes || "",
    initialLines: plan.lines?.map(planLineToForm) || [emptyPlanLine()],
  };
}

export function formToPayload(data: {
  shiftId: string;
  planDate: string;
  notes: string;
  lines: PlanLineForm[];
}) {
  return {
    shiftId: data.shiftId || null,
    planDate: data.planDate,
    notes: data.notes || null,
    lines: data.lines.map((l, i) => ({
      phase: l.phase,
      finishingRoute: l.finishingRoute || (isFinishingPhase(l.phase) ? l.phase : null),
      machineId: l.machineId || null,
      operatorIds: l.operatorIds,
      inventoryItemId: l.inventoryItemId || null,
      targetQty: l.targetQty,
      priority: l.priority,
      instructions: l.instructions || null,
      sortOrder: i,
      characteristics: l.characteristics.filter((c) => c.value !== ""),
    })),
  };
}
