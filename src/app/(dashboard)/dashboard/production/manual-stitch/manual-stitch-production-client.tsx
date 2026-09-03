"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle,
  Scissors,
  AlertTriangle,
} from "lucide-react";
import { OperatorMultiSelect } from "@/components/production/OperatorMultiSelect";

type PlanLine = {
  id: string;
  phase: string;
  finishingRoute?: string | null;
  targetQty: number;
  operator?: { id: string; name: string };
  plan: { planNumber: string; planDate: string; shift?: { id: string; name: string } };
};

type MaterialItem = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
};

type ManualStitchRun = {
  id: string;
  inputQty: number;
  outputBagQty: number;
  workerIds: string[];
  operator: { id: string; name: string };
  inputMaterial: MaterialItem;
  outputItem?: MaterialItem | null;
  productionRun: {
    id: string;
    targetQty: number;
    endedAt: string | null;
    planLine: PlanLine;
  };
};

export function ManualStitchProductionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [planLines, setPlanLines] = useState<PlanLine[]>([]);
  const [activeRuns, setActiveRuns] = useState<ManualStitchRun[]>([]);
  const [inputMaterials, setInputMaterials] = useState<MaterialItem[]>([]);
  const [outputItems, setOutputItems] = useState<MaterialItem[]>([]);
  const [hasPlans, setHasPlans] = useState(true);
  const [shiftId, setShiftId] = useState("");

  const [startForm, setStartForm] = useState({
    planLineId: "",
    operatorId: "",
    workerIds: [] as string[],
    targetQty: 0,
    inputMaterialId: "",
    inputQty: 0,
  });

  const [completingRun, setCompletingRun] = useState<ManualStitchRun | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    reworkQty: 0,
    scrapQty: 0,
    downtimeMinutes: 0,
    workerIds: [] as string[],
    inputQty: 0,
    outputBagQty: 0,
    outputItemId: "",
  });

  const workerOptions = operators.filter((op) => op.id !== startForm.operatorId);

  useEffect(() => {
    fetch("/api/settings/master-data/shift")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setShifts(data);
        if (data.length) setShiftId(data[0].id);
      });
    fetch("/api/production/operators")
      .then((r) => (r.ok ? r.json() : []))
      .then(setOperators);
    fetch("/api/production/manual-stitch/input-materials")
      .then((r) => (r.ok ? r.json() : []))
      .then(setInputMaterials);
    fetch("/api/production/manual-stitch/output-items")
      .then((r) => (r.ok ? r.json() : []))
      .then(setOutputItems);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, runsRes] = await Promise.all([
        fetch(`/api/production/plans?phase=MANUAL_STITCH&dateFrom=${selectedDate}&dateTo=${selectedDate}`),
        fetch("/api/production/manual-stitch/runs?activeOnly=true"),
      ]);

      if (plansRes.ok) {
        const plans = await plansRes.json();
        const lines: PlanLine[] = [];
        for (const plan of plans) {
          if (!["APPROVED", "IN_PROGRESS"].includes(plan.status)) continue;
          for (const line of plan.lines || []) {
            if (line.phase === "MANUAL_STITCH" && (!line.finishingRoute || line.finishingRoute === "MANUAL_STITCH")) {
              lines.push({
                ...line,
                plan: {
                  planNumber: plan.planNumber,
                  planDate: plan.planDate,
                  shift: plan.shift,
                },
              });
            }
          }
        }
        setPlanLines(lines);
        setHasPlans(lines.length > 0);
      }
      if (runsRes.ok) setActiveRuns(await runsRes.json());
    } catch {
      toast.error("Failed to load manual stitch production data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const workerName = (id: string) => operators.find((o) => o.id === id)?.name || id;

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startForm.planLineId || !startForm.operatorId || !startForm.inputMaterialId) {
      toast.error("Select plan line, lead operator, and input material");
      return;
    }
    if (startForm.workerIds.length === 0) {
      toast.error("Assign at least one worker");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/production/manual-stitch/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start run");
      }
      toast.success("Manual stitch run started");
      setStartForm({
        planLineId: "",
        operatorId: "",
        workerIds: [],
        targetQty: 0,
        inputMaterialId: "",
        inputQty: 0,
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (run: ManualStitchRun) => {
    setCompletingRun(run);
    setCompleteForm({
      actualQty: run.productionRun.targetQty,
      acceptedQty: run.productionRun.targetQty,
      rejectedQty: 0,
      reworkQty: 0,
      scrapQty: 0,
      downtimeMinutes: 0,
      workerIds: Array.isArray(run.workerIds) ? run.workerIds : [],
      inputQty: run.inputQty || run.productionRun.targetQty,
      outputBagQty: run.outputBagQty || run.productionRun.targetQty,
      outputItemId: run.outputItem?.id || "",
    });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRun) return;
    if (completeForm.workerIds.length === 0) {
      toast.error("Assign at least one worker");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/production/manual-stitch/runs/${completingRun.id}`, {
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
      toast.success(result.inventory?.message || "Manual stitch run completed");
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
      ...startForm,
      planLineId: lineId,
      targetQty: line?.targetQty ?? 0,
      operatorId: line?.operator?.id || startForm.operatorId,
    });
  };

  const onInputMaterialSelect = (materialId: string) => {
    const material = inputMaterials.find((m) => m.id === materialId);
    setStartForm({
      ...startForm,
      inputMaterialId: materialId,
      inputQty: material?.currentStock
        ? Math.min(material.currentStock, startForm.targetQty || material.currentStock)
        : startForm.targetQty,
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
              <Scissors className="h-6 w-6 text-primary" />
              Manual Stitching Production
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Hand-stitched bag finishing — workers, cut material input, and finished bag output.
            </p>
          </div>
          <div className="flex gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Shift</label>
              <select className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input type="date" className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {!hasPlans && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">No Manual Stitch route on plan today</p>
            <p className="text-sm text-amber-800 mt-1">
              Add a MANUAL_STITCH plan line with finishing route Manual Stitching for {selectedDate}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Start Manual Stitch Run
          </h2>
          <form onSubmit={handleStart} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plan Line</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.planLineId} onChange={(e) => onPlanLineSelect(e.target.value)} required disabled={!hasPlans}>
                <option value="">{hasPlans ? "Select MANUAL_STITCH plan line…" : "No manual stitch plan today"}</option>
                {planLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.plan.planNumber} · target {line.targetQty}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Lead Operator</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.operatorId} onChange={(e) => setStartForm({ ...startForm, operatorId: e.target.value, workerIds: startForm.workerIds.filter((id) => id !== e.target.value) })} required disabled={!hasPlans}>
                <option value="">Select lead operator…</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Workers ({startForm.workerIds.length})</label>
              <OperatorMultiSelect
                users={workerOptions}
                value={startForm.workerIds}
                onChange={(ids) => setStartForm({ ...startForm, workerIds: ids })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Input Cut Material</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.inputMaterialId} onChange={(e) => onInputMaterialSelect(e.target.value)} required disabled={!hasPlans}>
                <option value="">Select cut material…</option>
                {inputMaterials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name} (stock: {item.currentStock})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Target Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.targetQty} onChange={(e) => setStartForm({ ...startForm, targetQty: parseFloat(e.target.value) || 0 })} required disabled={!hasPlans} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Input Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.inputQty} onChange={(e) => setStartForm({ ...startForm, inputQty: parseFloat(e.target.value) || 0 })} disabled={!hasPlans} />
              </div>
            </div>
            <button type="submit" disabled={saving || !hasPlans} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Run
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Cut Material Stock ({inputMaterials.length})</h2>
          {inputMaterials.length === 0 ? (
            <p className="text-sm text-slate-500">No cut material items in inventory.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {inputMaterials.map((item) => (
                <div key={item.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                  <p className="font-medium text-slate-800">{item.code} — {item.name}</p>
                  <p className="text-xs text-slate-500">Stock: {item.currentStock}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Active Runs ({activeRuns.length})</h2>
        {activeRuns.length === 0 ? (
          <p className="text-sm text-slate-500">No active manual stitch runs.</p>
        ) : (
          <div className="space-y-3">
            {activeRuns.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-100 rounded-lg p-4">
                <div>
                  <p className="font-medium text-slate-800">{run.operator.name}</p>
                  <p className="text-xs text-slate-500">
                    {run.productionRun.planLine.plan.planNumber} · {run.inputMaterial.code} · Workers:{" "}
                    {(Array.isArray(run.workerIds) ? run.workerIds : []).map(workerName).join(", ") || "—"}
                  </p>
                </div>
                <button onClick={() => openComplete(run)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium">
                  <CheckCircle className="h-3.5 w-3.5" /> Complete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {completingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-slate-800">Complete Manual Stitch Run</h3>
              <p className="text-sm text-slate-500 mt-1">{completingRun.inputMaterial.code} · {completingRun.operator.name}</p>
            </div>
            <form onSubmit={handleComplete} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Workers</label>
                <OperatorMultiSelect
                  users={operators.filter((op) => op.id !== completingRun.operator.id)}
                  value={completeForm.workerIds}
                  onChange={(ids) => setCompleteForm({ ...completeForm, workerIds: ids })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["actualQty", "Actual Qty"],
                  ["acceptedQty", "Accepted Qty"],
                  ["rejectedQty", "Rejected Qty"],
                  ["scrapQty", "Scrap Qty"],
                  ["inputQty", "Input Qty"],
                  ["outputBagQty", "Output Bags"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm[key as keyof typeof completeForm] as number} onChange={(e) => setCompleteForm({ ...completeForm, [key]: parseFloat(e.target.value) || 0 })} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Output Finished Bags</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm.outputItemId} onChange={(e) => setCompleteForm({ ...completeForm, outputItemId: e.target.value })}>
                  <option value="">Select FINISHED_BAGS item…</option>
                  {outputItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setCompletingRun(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
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
