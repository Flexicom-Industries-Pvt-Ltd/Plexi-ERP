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

type CuttingMachine = {
  id: string;
  name: string;
  machineStatus: "IDLE" | "RUNNING" | "MAINTENANCE" | "INACTIVE";
  make: string | null;
  model: string | null;
  activeRun: {
    id: string;
    inputRoll: { rollNumber: string; rollType: string };
    operator: { name: string };
  } | null;
};

type PlanLine = {
  id: string;
  phase: string;
  targetQty: number;
  machine?: { id: string; name: string };
  operator?: { id: string; name: string };
  plan: { planNumber: string; planDate: string; shift?: { id: string; name: string } };
};

type InputRoll = {
  id: string;
  rollNumber: string;
  rollType: string;
  weight: number | null;
  sourcePhase: string;
  qualityStatus: string;
};

type CutMaterialItem = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
};

type CuttingRun = {
  id: string;
  cuttingSpec: string | null;
  inputQty: number;
  outputMaterialQty: number;
  cuttingMachine: { id: string; name: string };
  operator: { id: string; name: string };
  inputRoll: InputRoll;
  outputItem?: CutMaterialItem | null;
  productionRun: {
    id: string;
    targetQty: number;
    endedAt: string | null;
    planLine: PlanLine;
  };
};

const statusStyles: Record<string, string> = {
  IDLE: "bg-slate-100 text-slate-600 border-slate-200",
  RUNNING: "bg-emerald-100 text-emerald-700 border-emerald-200",
  MAINTENANCE: "bg-amber-100 text-amber-700 border-amber-200",
  INACTIVE: "bg-red-50 text-red-600 border-red-200",
};

export function CuttingProductionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [machines, setMachines] = useState<CuttingMachine[]>([]);
  const [planLines, setPlanLines] = useState<PlanLine[]>([]);
  const [activeRuns, setActiveRuns] = useState<CuttingRun[]>([]);
  const [inputRolls, setInputRolls] = useState<InputRoll[]>([]);
  const [cutMaterials, setCutMaterials] = useState<CutMaterialItem[]>([]);
  const [hasCuttingPlans, setHasCuttingPlans] = useState(true);
  const [shiftId, setShiftId] = useState("");

  const [startForm, setStartForm] = useState({
    planLineId: "",
    cuttingMachineId: "",
    operatorId: "",
    targetQty: 0,
    inputRollId: "",
    inputQty: 0,
    cuttingSpec: "",
  });

  const [completingRun, setCompletingRun] = useState<CuttingRun | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    reworkQty: 0,
    scrapQty: 0,
    downtimeMinutes: 0,
    inputQty: 0,
    outputMaterialQty: 0,
    cuttingSpec: "",
    outputItemId: "",
  });

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
    fetch("/api/production/cutting/items")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCutMaterials);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const machineUrl = `/api/production/cutting/machines`;
      const [machinesRes, plansRes, runsRes, rollsRes] = await Promise.all([
        fetch(machineUrl),
        fetch(`/api/production/plans?phase=CUTTING&dateFrom=${selectedDate}&dateTo=${selectedDate}`),
        fetch("/api/production/cutting/runs?activeOnly=true"),
        fetch("/api/production/cutting/input-rolls"),
      ]);

      if (machinesRes.ok) {
        const data = await machinesRes.json();
        setMachines(data.machines || []);
      }
      if (plansRes.ok) {
        const plans = await plansRes.json();
        const lines: PlanLine[] = [];
        for (const plan of plans) {
          if (!["APPROVED", "IN_PROGRESS"].includes(plan.status)) continue;
          for (const line of plan.lines || []) {
            if (line.phase === "CUTTING") {
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
        setHasCuttingPlans(lines.length > 0);
      }
      if (runsRes.ok) setActiveRuns(await runsRes.json());
      if (rollsRes.ok) setInputRolls(await rollsRes.json());
    } catch {
      toast.error("Failed to load cutting production data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startForm.planLineId || !startForm.cuttingMachineId || !startForm.operatorId || !startForm.inputRollId) {
      toast.error("Select plan line, machine, operator, and input roll");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/production/cutting/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start run");
      }
      toast.success("Cutting run started");
      setStartForm({
        planLineId: "",
        cuttingMachineId: "",
        operatorId: "",
        targetQty: 0,
        inputRollId: "",
        inputQty: 0,
        cuttingSpec: "",
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (run: CuttingRun) => {
    setCompletingRun(run);
    setCompleteForm({
      actualQty: run.productionRun.targetQty,
      acceptedQty: run.productionRun.targetQty,
      rejectedQty: 0,
      reworkQty: 0,
      scrapQty: 0,
      downtimeMinutes: 0,
      inputQty: run.inputQty || run.inputRoll.weight || run.productionRun.targetQty,
      outputMaterialQty: run.outputMaterialQty || run.productionRun.targetQty,
      cuttingSpec: run.cuttingSpec || "",
      outputItemId: run.outputItem?.id || "",
    });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRun) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/production/cutting/runs/${completingRun.id}`, {
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
      toast.success(result.inventory?.message || "Cutting run completed");
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
      cuttingMachineId: line?.machine?.id || startForm.cuttingMachineId,
      operatorId: line?.operator?.id || startForm.operatorId,
    });
  };

  const onInputRollSelect = (rollId: string) => {
    const roll = inputRolls.find((r) => r.id === rollId);
    setStartForm({
      ...startForm,
      inputRollId: rollId,
      inputQty: roll?.weight ?? startForm.targetQty,
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
              Cutting Production
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Printed roll to cut material — CUTTEX PLUS cutting spec, operator, and output qty.
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

      {!hasCuttingPlans && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">No cutting required today</p>
            <p className="text-sm text-amber-800 mt-1">
              No approved shift plan includes a CUTTING phase for {selectedDate}.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Scissors className="h-4 w-4 text-primary" /> Cutting Machines ({machines.length})
        </h2>
        {machines.length === 0 ? (
          <p className="text-sm text-slate-500">No cutting machines found. Add machines under a Cutting section (code CUT).</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {machines.map((m) => (
              <div key={m.id} className={`p-3 rounded-lg border ${statusStyles[m.machineStatus]}`}>
                <p className="font-medium text-sm truncate">{m.name}</p>
                <p className="text-[10px] uppercase tracking-wide mt-1">{m.machineStatus}</p>
                {m.activeRun && (
                  <p className="text-[10px] mt-1 truncate">{m.activeRun.inputRoll.rollNumber}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Start Cutting Run
          </h2>
          <form onSubmit={handleStart} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plan Line</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.planLineId} onChange={(e) => onPlanLineSelect(e.target.value)} required disabled={!hasCuttingPlans}>
                <option value="">{hasCuttingPlans ? "Select approved cutting line…" : "Cutting not required on plan"}</option>
                {planLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.plan.planNumber} · {line.machine?.name ?? "No machine"} · target {line.targetQty}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Machine</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.cuttingMachineId} onChange={(e) => setStartForm({ ...startForm, cuttingMachineId: e.target.value })} required disabled={!hasCuttingPlans}>
                  <option value="">Select machine…</option>
                  {machines.filter((m) => m.machineStatus !== "RUNNING" && m.machineStatus !== "MAINTENANCE").map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.operatorId} onChange={(e) => setStartForm({ ...startForm, operatorId: e.target.value })} required disabled={!hasCuttingPlans}>
                  <option value="">Select operator…</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Input Roll (printed)</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.inputRollId} onChange={(e) => onInputRollSelect(e.target.value)} required disabled={!hasCuttingPlans}>
                <option value="">Select printed roll…</option>
                {inputRolls.map((roll) => (
                  <option key={roll.id} value={roll.id}>
                    {roll.rollNumber} · {roll.rollType} · {roll.weight ?? "—"} kg
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Cutting Spec</label>
              <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" rows={2} value={startForm.cuttingSpec} onChange={(e) => setStartForm({ ...startForm, cuttingSpec: e.target.value })} placeholder="Dimensions, bag size, die ref…" disabled={!hasCuttingPlans} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Target Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.targetQty} onChange={(e) => setStartForm({ ...startForm, targetQty: parseFloat(e.target.value) || 0 })} required disabled={!hasCuttingPlans} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Input Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.inputQty} onChange={(e) => setStartForm({ ...startForm, inputQty: parseFloat(e.target.value) || 0 })} disabled={!hasCuttingPlans} />
              </div>
            </div>
            <button type="submit" disabled={saving || !hasCuttingPlans} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Run
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Printed Rolls Available ({inputRolls.length})</h2>
          {inputRolls.length === 0 ? (
            <p className="text-sm text-slate-500">No printed rolls ready for cutting.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {inputRolls.map((roll) => (
                <div key={roll.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{roll.rollNumber}</p>
                    <p className="text-xs text-slate-500">{roll.rollType} · {roll.weight ?? "—"} kg · {roll.qualityStatus}</p>
                  </div>
                  <Link href={`/dashboard/production/rolls/${roll.id}`} className="text-xs text-primary hover:underline">View</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Active Runs ({activeRuns.length})</h2>
        {activeRuns.length === 0 ? (
          <p className="text-sm text-slate-500">No active cutting runs.</p>
        ) : (
          <div className="space-y-3">
            {activeRuns.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-100 rounded-lg p-4">
                <div>
                  <p className="font-medium text-slate-800">{run.cuttingMachine.name} · {run.operator.name}</p>
                  <p className="text-xs text-slate-500">
                    {run.productionRun.planLine.plan.planNumber} · {run.inputRoll.rollNumber}
                    {run.cuttingSpec ? ` · ${run.cuttingSpec}` : ""}
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
              <h3 className="font-semibold text-slate-800">Complete Cutting Run</h3>
              <p className="text-sm text-slate-500 mt-1">{completingRun.cuttingMachine.name} · {completingRun.inputRoll.rollNumber}</p>
            </div>
            <form onSubmit={handleComplete} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["actualQty", "Actual Qty"],
                  ["acceptedQty", "Accepted Qty"],
                  ["rejectedQty", "Rejected Qty"],
                  ["scrapQty", "Scrap Qty"],
                  ["inputQty", "Input Qty"],
                  ["outputMaterialQty", "Output Material Qty"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm[key as keyof typeof completeForm] as number} onChange={(e) => setCompleteForm({ ...completeForm, [key]: parseFloat(e.target.value) || 0 })} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cutting Spec</label>
                <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={2} value={completeForm.cuttingSpec} onChange={(e) => setCompleteForm({ ...completeForm, cuttingSpec: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Output Cut Material</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm.outputItemId} onChange={(e) => setCompleteForm({ ...completeForm, outputItemId: e.target.value })}>
                  <option value="">Select CUT_MATERIAL item…</option>
                  {cutMaterials.map((item) => (
                    <option key={item.id} value={item.id}>{item.code} — {item.name} (stock: {item.currentStock})</option>
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
