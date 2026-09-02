"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle,
  Package,
  Factory,
} from "lucide-react";
import { phaseLabel } from "@/lib/production/phases";

type PlanLine = {
  id: string;
  phase: string;
  targetQty: number;
  machine?: { name: string };
  operator?: { name: string };
  inventoryItem?: { id: string; code: string; name: string };
  plan: { id: string; planNumber: string; planDate: string; status: string; shift?: { name: string } };
};

type BobbinRun = {
  id: string;
  inputQty: number;
  outputQty: number;
  rawMaterialItem: { id: string; code: string; name: string };
  outputItem?: { id: string; code: string; name: string } | null;
  productionRun: {
    id: string;
    targetQty: number;
    actualQty: number;
    acceptedQty: number;
    rejectedQty: number;
    scrapQty: number;
    endedAt: string | null;
    startedAt: string;
    planLine: PlanLine;
  };
};

export function BobbinProductionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planLines, setPlanLines] = useState<PlanLine[]>([]);
  const [runs, setRuns] = useState<BobbinRun[]>([]);
  const [rawMaterials, setRawMaterials] = useState<{ id: string; code: string; name: string; currentStock: number }[]>([]);
  const [bobbins, setBobbins] = useState<{ id: string; code: string; name: string; currentStock: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const [startForm, setStartForm] = useState({
    planLineId: "",
    targetQty: 0,
    rawMaterialItemId: "",
    outputItemId: "",
    inputQty: 0,
  });

  const [completingRun, setCompletingRun] = useState<BobbinRun | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    reworkQty: 0,
    scrapQty: 0,
    downtimeMinutes: 0,
    inputQty: 0,
    outputQty: 0,
    outputItemId: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, runsRes, itemsRes] = await Promise.all([
        fetch(`/api/production/plans?phase=BOBBIN&dateFrom=${selectedDate}&dateTo=${selectedDate}`),
        fetch("/api/production/bobbin/runs?activeOnly=true"),
        fetch("/api/production/bobbin/items"),
      ]);

      if (plansRes.ok) {
        const plans = await plansRes.json();
        const lines: PlanLine[] = [];
        for (const plan of plans) {
          if (!["APPROVED", "IN_PROGRESS"].includes(plan.status)) continue;
          for (const line of plan.lines || []) {
            if (line.phase === "BOBBIN") {
              lines.push({ ...line, plan: { id: plan.id, planNumber: plan.planNumber, planDate: plan.planDate, status: plan.status, shift: plan.shift } });
            }
          }
        }
        setPlanLines(lines);
      }

      if (runsRes.ok) setRuns(await runsRes.json());
      if (itemsRes.ok) {
        const items = await itemsRes.json();
        setRawMaterials(items.rawMaterials || []);
        setBobbins(items.bobbins || []);
      }
    } catch {
      toast.error("Failed to load bobbin production data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startForm.planLineId || !startForm.rawMaterialItemId) {
      toast.error("Select a plan line and raw material");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/production/bobbin/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planLineId: startForm.planLineId,
          targetQty: startForm.targetQty,
          rawMaterialItemId: startForm.rawMaterialItemId,
          outputItemId: startForm.outputItemId || undefined,
          inputQty: startForm.inputQty,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start run");
      }
      toast.success("Bobbin run started");
      setStartForm({ planLineId: "", targetQty: 0, rawMaterialItemId: "", outputItemId: "", inputQty: 0 });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (run: BobbinRun) => {
    setCompletingRun(run);
    setCompleteForm({
      actualQty: run.productionRun.targetQty,
      acceptedQty: run.productionRun.targetQty,
      rejectedQty: 0,
      reworkQty: 0,
      scrapQty: 0,
      downtimeMinutes: 0,
      inputQty: run.inputQty,
      outputQty: run.outputQty || run.productionRun.targetQty,
      outputItemId: run.outputItem?.id || "",
    });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRun) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/production/bobbin/runs/${completingRun.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          ...completeForm,
          outputItemId: completeForm.outputItemId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete run");
      }
      const result = await res.json();
      toast.success(result.inventory?.message || "Bobbin run completed");
      setCompletingRun(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onPlanLineSelect = (lineId: string) => {
    const line = planLines.find((l) => l.id === lineId);
    setStartForm({
      planLineId: lineId,
      targetQty: line?.targetQty ?? 0,
      rawMaterialItemId: line?.inventoryItem?.id || startForm.rawMaterialItemId,
      outputItemId: startForm.outputItemId,
      inputQty: startForm.inputQty,
    });
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/production" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-2">
          <ArrowLeft className="h-4 w-4" /> Production
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Factory className="h-6 w-6 text-primary" />
              Bobbin Production
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Record raw material consumption, bobbin output, scrap, and quality per approved shift plan line.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Plan Date</label>
            <input
              type="date"
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Start Bobbin Run
          </h2>
          <form onSubmit={handleStart} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plan Line</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={startForm.planLineId}
                onChange={(e) => onPlanLineSelect(e.target.value)}
                required
              >
                <option value="">Select approved bobbin line…</option>
                {planLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.plan.planNumber} · {line.machine?.name ?? "No machine"} · target {line.targetQty}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Target Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.targetQty} onChange={(e) => setStartForm({ ...startForm, targetQty: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Planned Input Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.inputQty} onChange={(e) => setStartForm({ ...startForm, inputQty: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Raw Material</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.rawMaterialItemId} onChange={(e) => setStartForm({ ...startForm, rawMaterialItemId: e.target.value })} required>
                <option value="">Select raw material…</option>
                {rawMaterials.map((item) => (
                  <option key={item.id} value={item.id}>{item.code} — {item.name} (stock: {item.currentStock})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Output Bobbin Item (optional)</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.outputItemId} onChange={(e) => setStartForm({ ...startForm, outputItemId: e.target.value })}>
                <option value="">Select bobbin SKU…</option>
                {bobbins.map((item) => (
                  <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={saving || !planLines.length} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Run
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Active Runs ({runs.length})
          </h2>
          {runs.length === 0 ? (
            <p className="text-sm text-slate-500">No active bobbin runs. Start one from an approved plan line.</p>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => {
                const line = run.productionRun.planLine;
                return (
                  <div key={run.id} className="border border-slate-100 rounded-lg p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-800">{line.plan.planNumber}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(line.plan.planDate), "dd MMM yyyy")} · {line.plan.shift?.name ?? "No shift"} · {phaseLabel(line.phase)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {line.machine?.name ?? "—"} · {line.operator?.name ?? "—"}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">
                          Raw: {run.rawMaterialItem.code} · Target {run.productionRun.targetQty}
                        </p>
                      </div>
                      <button
                        onClick={() => openComplete(run)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Complete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {completingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-slate-800">Complete Bobbin Run</h3>
              <p className="text-sm text-slate-500 mt-1">
                {completingRun.productionRun.planLine.plan.planNumber} · Target {completingRun.productionRun.targetQty}
              </p>
            </div>
            <form onSubmit={handleComplete} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Input Consumed", key: "inputQty" as const },
                  { label: "Output Bobbins", key: "outputQty" as const },
                  { label: "Actual Qty", key: "actualQty" as const },
                  { label: "Accepted Qty", key: "acceptedQty" as const },
                  { label: "Rejected Qty", key: "rejectedQty" as const },
                  { label: "Rework Qty", key: "reworkQty" as const },
                  { label: "Scrap Qty", key: "scrapQty" as const },
                  { label: "Downtime (mins)", key: "downtimeMinutes" as const },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      value={completeForm[field.key]}
                      onChange={(e) => setCompleteForm({ ...completeForm, [field.key]: parseFloat(e.target.value) || 0 })}
                      required={field.key === "actualQty" || field.key === "acceptedQty" || field.key === "inputQty" || field.key === "outputQty"}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Output Bobbin Item</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  value={completeForm.outputItemId}
                  onChange={(e) => setCompleteForm({ ...completeForm, outputItemId: e.target.value })}
                >
                  <option value="">Select bobbin SKU…</option>
                  {bobbins.map((item) => (
                    <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Inventory movements (raw material OUT, bobbin IN) are logged as a stub until P36 integration.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCompletingRun(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Complete Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
