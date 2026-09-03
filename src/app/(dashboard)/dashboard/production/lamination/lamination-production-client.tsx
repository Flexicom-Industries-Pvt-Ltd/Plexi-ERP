"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle,
  Layers,
  AlertTriangle,
} from "lucide-react";

type LaminationMachine = {
  id: string;
  name: string;
  status: string;
  serialNumber: string | null;
  make: string | null;
  model: string | null;
  section: { name: string; code: string };
  machineStatus: "IDLE" | "RUNNING" | "MAINTENANCE" | "INACTIVE";
  assignedOperator: { operatorId: string; operatorName: string } | null;
  activeRun: {
    id: string;
    productionRunId: string;
    targetQty: number;
    startedAt: string;
    operator: { id: string; name: string };
    inputRoll: { id: string; rollNumber: string; rollType: string };
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
  length: number | null;
  batchLot: string | null;
  qualityStatus: string;
};

type LaminationRun = {
  id: string;
  inputQty: number;
  outputQty: number;
  laminationMachine: { id: string; name: string };
  operator: { id: string; name: string };
  inputRoll: InputRoll;
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

export function LaminationProductionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [machines, setMachines] = useState<LaminationMachine[]>([]);
  const [planLines, setPlanLines] = useState<PlanLine[]>([]);
  const [activeRuns, setActiveRuns] = useState<LaminationRun[]>([]);
  const [inputRolls, setInputRolls] = useState<InputRoll[]>([]);
  const [hasLaminationPlans, setHasLaminationPlans] = useState(true);

  const [shiftId, setShiftId] = useState("");

  const [startForm, setStartForm] = useState({
    planLineId: "",
    laminationMachineId: "",
    operatorId: "",
    targetQty: 0,
    inputRollId: "",
    inputQty: 0,
  });

  const [completingRun, setCompletingRun] = useState<LaminationRun | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    reworkQty: 0,
    scrapQty: 0,
    downtimeMinutes: 0,
    inputQty: 0,
    outputQty: 0,
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
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const machineUrl = shiftId
        ? `/api/production/lamination/machines?shiftId=${shiftId}&assignmentDate=${selectedDate}`
        : "/api/production/lamination/machines";
      const [machinesRes, plansRes, runsRes, rollsRes] = await Promise.all([
        fetch(machineUrl),
        fetch(`/api/production/plans?phase=LAMINATION&dateFrom=${selectedDate}&dateTo=${selectedDate}`),
        fetch("/api/production/lamination/runs?activeOnly=true"),
        fetch("/api/production/lamination/input-rolls"),
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
            if (line.phase === "LAMINATION") {
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
        setHasLaminationPlans(lines.length > 0);
      }
      if (runsRes.ok) setActiveRuns(await runsRes.json());
      if (rollsRes.ok) setInputRolls(await rollsRes.json());
    } catch {
      toast.error("Failed to load lamination production data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, shiftId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startForm.planLineId || !startForm.laminationMachineId || !startForm.operatorId || !startForm.inputRollId) {
      toast.error("Select plan line, machine, operator, and input roll");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/production/lamination/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start run");
      }
      toast.success("Lamination run started");
      setStartForm({
        planLineId: "",
        laminationMachineId: "",
        operatorId: "",
        targetQty: 0,
        inputRollId: "",
        inputQty: 0,
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (run: LaminationRun) => {
    setCompletingRun(run);
    setCompleteForm({
      actualQty: run.productionRun.targetQty,
      acceptedQty: run.productionRun.targetQty,
      rejectedQty: 0,
      reworkQty: 0,
      scrapQty: 0,
      downtimeMinutes: 0,
      inputQty: run.inputQty || run.inputRoll.weight || run.productionRun.targetQty,
      outputQty: run.outputQty || run.productionRun.targetQty,
    });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRun) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/production/lamination/runs/${completingRun.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          ...completeForm,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete run");
      }
      const result = await res.json();
      toast.success(result.inventory?.message || "Lamination run completed");
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
      laminationMachineId: line?.machine?.id || startForm.laminationMachineId,
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
              <Layers className="h-6 w-6 text-primary" />
              Lamination Production
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Feed loom rolls into lamination (ECOTEX), track input consumption, and produce laminated rolls.
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

      {!hasLaminationPlans && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">No lamination required today</p>
            <p className="text-sm text-amber-800 mt-1">
              No approved shift plan includes a LAMINATION phase for {selectedDate}. Lamination runs are only available when the production plan requires it.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Lamination Machines ({machines.length})
        </h2>
        {machines.length === 0 ? (
          <p className="text-sm text-slate-500">No lamination machines found. Add machines under a Lamination section (code LAM).</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {machines.map((m) => (
              <div
                key={m.id}
                className={`text-left p-3 rounded-lg border ${statusStyles[m.machineStatus]}`}
              >
                <p className="font-medium text-sm truncate">{m.name}</p>
                <p className="text-[10px] uppercase tracking-wide mt-1">{m.machineStatus}</p>
                {m.make && (
                  <p className="text-[10px] mt-1 truncate">{m.make} {m.model ?? ""}</p>
                )}
                {m.activeRun && (
                  <p className="text-[10px] mt-1 truncate">
                    {m.activeRun.inputRoll.rollNumber} · {m.activeRun.operator.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Start Lamination Run
          </h2>
          <form onSubmit={handleStart} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plan Line</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-400"
                value={startForm.planLineId}
                onChange={(e) => onPlanLineSelect(e.target.value)}
                required
                disabled={!hasLaminationPlans}
              >
                <option value="">{hasLaminationPlans ? "Select approved lamination line…" : "Lamination not required on plan"}</option>
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
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                  value={startForm.laminationMachineId}
                  onChange={(e) => setStartForm({ ...startForm, laminationMachineId: e.target.value })}
                  required
                  disabled={!hasLaminationPlans}
                >
                  <option value="">Select machine…</option>
                  {machines.filter((m) => m.machineStatus !== "RUNNING" && m.machineStatus !== "MAINTENANCE").map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                  value={startForm.operatorId}
                  onChange={(e) => setStartForm({ ...startForm, operatorId: e.target.value })}
                  required
                  disabled={!hasLaminationPlans}
                >
                  <option value="">Select operator…</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Input Roll (from loom stock)</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                value={startForm.inputRollId}
                onChange={(e) => onInputRollSelect(e.target.value)}
                required
                disabled={!hasLaminationPlans}
              >
                <option value="">Select available roll…</option>
                {inputRolls.map((roll) => (
                  <option key={roll.id} value={roll.id}>
                    {roll.rollNumber} · {roll.rollType} · {roll.weight ?? "—"} kg
                  </option>
                ))}
              </select>
              {hasLaminationPlans && inputRolls.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No unconsumed loom rolls available.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Target Qty</label>
                <input
                  type="number"
                  min={0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                  value={startForm.targetQty}
                  onChange={(e) => setStartForm({ ...startForm, targetQty: parseFloat(e.target.value) || 0 })}
                  required
                  disabled={!hasLaminationPlans}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Input Qty</label>
                <input
                  type="number"
                  min={0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50"
                  value={startForm.inputQty}
                  onChange={(e) => setStartForm({ ...startForm, inputQty: parseFloat(e.target.value) || 0 })}
                  disabled={!hasLaminationPlans}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving || !hasLaminationPlans}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Run
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Available Input Rolls ({inputRolls.length})</h2>
          {inputRolls.length === 0 ? (
            <p className="text-sm text-slate-500">No loom rolls ready for lamination.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {inputRolls.map((roll) => (
                <div key={roll.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{roll.rollNumber}</p>
                    <p className="text-xs text-slate-500">{roll.rollType} · {roll.weight ?? "—"} kg · {roll.qualityStatus}</p>
                  </div>
                  <Link href={`/dashboard/production/rolls/${roll.id}`} className="text-xs text-primary hover:underline">
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Active Runs ({activeRuns.length})</h2>
        {activeRuns.length === 0 ? (
          <p className="text-sm text-slate-500">No active lamination runs.</p>
        ) : (
          <div className="space-y-3">
            {activeRuns.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-100 rounded-lg p-4">
                <div>
                  <p className="font-medium text-slate-800">{run.laminationMachine.name} · {run.operator.name}</p>
                  <p className="text-xs text-slate-500">
                    {run.productionRun.planLine.plan.planNumber} · Input {run.inputRoll.rollNumber} · Target {run.productionRun.targetQty}
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
              <h3 className="font-semibold text-slate-800">Complete Lamination Run</h3>
              <p className="text-sm text-slate-500 mt-1">
                {completingRun.laminationMachine.name} · {completingRun.inputRoll.rollNumber}
              </p>
            </div>
            <form onSubmit={handleComplete} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["actualQty", "Actual Qty"],
                  ["acceptedQty", "Accepted Qty"],
                  ["rejectedQty", "Rejected Qty"],
                  ["reworkQty", "Rework Qty"],
                  ["scrapQty", "Scrap Qty"],
                  ["downtimeMinutes", "Downtime (min)"],
                  ["inputQty", "Input Qty"],
                  ["outputQty", "Output Qty"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      value={completeForm[key as keyof typeof completeForm]}
                      onChange={(e) =>
                        setCompleteForm({
                          ...completeForm,
                          [key]: parseFloat(e.target.value) || 0,
                        })
                      }
                      required={key === "actualQty" || key === "acceptedQty" || key === "inputQty" || key === "outputQty"}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setCompletingRun(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">
                  Cancel
                </button>
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
