"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { OperatorMultiSelect } from "@/components/production/OperatorMultiSelect";
import {
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle,
  Box,
  AlertTriangle,
} from "lucide-react";

type BcsMachine = {
  id: string;
  name: string;
  machineStatus: "IDLE" | "RUNNING" | "MAINTENANCE" | "INACTIVE";
  activeRun: {
    id: string;
    inputsSummary: string;
    operator: { name: string };
  } | null;
};

type PlanLine = {
  id: string;
  phase: string;
  finishingRoute?: string | null;
  targetQty: number;
  machine?: { id: string; name: string };
  operator?: { id: string; name: string };
  plan: { planNumber: string; planDate: string; shift?: { id: string; name: string } };
};

type MaterialItem = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
};

type InputRoll = {
  id: string;
  rollNumber: string;
  rollType: string;
  weight: number;
  sourcePhase: string;
};

type BcsRules = {
  minTeamMembers: number;
  maxTeamMembers: number;
  requireRollInput: boolean;
  requireYarnInput: boolean;
};

type BcsInputs = {
  inputRollId?: string | null;
  rollQty: number;
  yarnItemId?: string | null;
  yarnQty: number;
  ppItemId?: string | null;
  ppQty: number;
  lppItemId?: string | null;
  lppQty: number;
};

type BcsRun = {
  id: string;
  inputs: BcsInputs;
  teamMemberIds: string[];
  outputBagQty: number;
  bcsMachine: { id: string; name: string };
  operator: { id: string; name: string };
  outputItem?: MaterialItem | null;
  productionRun: {
    id: string;
    targetQty: number;
    endedAt: string | null;
    planLine: PlanLine;
  };
};

const emptyInputs = (): BcsInputs => ({
  inputRollId: "",
  rollQty: 0,
  yarnItemId: "",
  yarnQty: 0,
  ppItemId: "",
  ppQty: 0,
  lppItemId: "",
  lppQty: 0,
});

const statusStyles: Record<string, string> = {
  IDLE: "bg-slate-100 text-slate-600 border-slate-200",
  RUNNING: "bg-emerald-100 text-emerald-700 border-emerald-200",
  MAINTENANCE: "bg-amber-100 text-amber-700 border-amber-200",
  INACTIVE: "bg-red-50 text-red-600 border-red-200",
};

export function BcsProductionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [machines, setMachines] = useState<BcsMachine[]>([]);
  const [planLines, setPlanLines] = useState<PlanLine[]>([]);
  const [activeRuns, setActiveRuns] = useState<BcsRun[]>([]);
  const [bcsRules, setBcsRules] = useState<BcsRules>({
    minTeamMembers: 0,
    maxTeamMembers: 6,
    requireRollInput: false,
    requireYarnInput: false,
  });
  const [inputRolls, setInputRolls] = useState<InputRoll[]>([]);
  const [yarnItems, setYarnItems] = useState<MaterialItem[]>([]);
  const [ppItems, setPpItems] = useState<MaterialItem[]>([]);
  const [lppItems, setLppItems] = useState<MaterialItem[]>([]);
  const [outputItems, setOutputItems] = useState<MaterialItem[]>([]);
  const [hasBcsPlans, setHasBcsPlans] = useState(true);
  const [shiftId, setShiftId] = useState("");

  const [startForm, setStartForm] = useState({
    planLineId: "",
    bcsMachineId: "",
    operatorId: "",
    teamMemberIds: [] as string[],
    targetQty: 0,
    inputs: emptyInputs(),
  });

  const [completingRun, setCompletingRun] = useState<BcsRun | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    reworkQty: 0,
    scrapQty: 0,
    downtimeMinutes: 0,
    teamMemberIds: [] as string[],
    inputs: emptyInputs(),
    outputBagQty: 0,
    outputItemId: "",
  });

  const teamOptions = operators.filter((op) => op.id !== startForm.operatorId);

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
    fetch("/api/production/bcs/rules")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setBcsRules(data);
      });
    fetch("/api/production/bcs/input-rolls")
      .then((r) => (r.ok ? r.json() : []))
      .then(setInputRolls);
    fetch("/api/production/bcs/input-materials?type=yarn")
      .then((r) => (r.ok ? r.json() : []))
      .then(setYarnItems);
    fetch("/api/production/bcs/input-materials?type=pp")
      .then((r) => (r.ok ? r.json() : []))
      .then(setPpItems);
    fetch("/api/production/bcs/input-materials?type=lpp")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLppItems);
    fetch("/api/production/bcs/output-items")
      .then((r) => (r.ok ? r.json() : []))
      .then(setOutputItems);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [machinesRes, plansRes, runsRes] = await Promise.all([
        fetch("/api/production/bcs/machines"),
        fetch(`/api/production/plans?phase=BCS&dateFrom=${selectedDate}&dateTo=${selectedDate}`),
        fetch("/api/production/bcs/runs?activeOnly=true"),
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
            if (line.phase === "BCS" && (!line.finishingRoute || line.finishingRoute === "BCS")) {
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
        setHasBcsPlans(lines.length > 0);
      }
      if (runsRes.ok) setActiveRuns(await runsRes.json());
    } catch {
      toast.error("Failed to load BCS production data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startForm.planLineId || !startForm.bcsMachineId || !startForm.operatorId) {
      toast.error("Select plan line, machine, and operator");
      return;
    }
    if (startForm.teamMemberIds.length < bcsRules.minTeamMembers) {
      toast.error(`Select at least ${bcsRules.minTeamMembers} team member(s)`);
      return;
    }
    if (startForm.teamMemberIds.length > bcsRules.maxTeamMembers) {
      toast.error(`Maximum ${bcsRules.maxTeamMembers} team member(s) allowed`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/production/bcs/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planLineId: startForm.planLineId,
          bcsMachineId: startForm.bcsMachineId,
          operatorId: startForm.operatorId,
          teamMemberIds: startForm.teamMemberIds,
          targetQty: startForm.targetQty,
          inputs: {
            ...startForm.inputs,
            inputRollId: startForm.inputs.inputRollId || null,
            yarnItemId: startForm.inputs.yarnItemId || null,
            ppItemId: startForm.inputs.ppItemId || null,
            lppItemId: startForm.inputs.lppItemId || null,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start run");
      }
      toast.success("BCS run started");
      setStartForm({
        planLineId: "",
        bcsMachineId: "",
        operatorId: "",
        teamMemberIds: [],
        targetQty: 0,
        inputs: emptyInputs(),
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (run: BcsRun) => {
    setCompletingRun(run);
    setCompleteForm({
      actualQty: run.productionRun.targetQty,
      acceptedQty: run.productionRun.targetQty,
      rejectedQty: 0,
      reworkQty: 0,
      scrapQty: 0,
      downtimeMinutes: 0,
      teamMemberIds: Array.isArray(run.teamMemberIds) ? run.teamMemberIds : [],
      inputs: { ...emptyInputs(), ...(run.inputs || {}) },
      outputBagQty: run.outputBagQty || run.productionRun.targetQty,
      outputItemId: run.outputItem?.id || "",
    });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRun) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/production/bcs/runs/${completingRun.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          ...completeForm,
          inputs: {
            ...completeForm.inputs,
            inputRollId: completeForm.inputs.inputRollId || null,
            yarnItemId: completeForm.inputs.yarnItemId || null,
            ppItemId: completeForm.inputs.ppItemId || null,
            lppItemId: completeForm.inputs.lppItemId || null,
          },
          outputItemId: completeForm.outputItemId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete run");
      }
      const result = await res.json();
      toast.success(result.inventory?.message || "BCS run completed");
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
      bcsMachineId: line?.machine?.id || startForm.bcsMachineId,
      operatorId: line?.operator?.id || startForm.operatorId,
    });
  };

  const onRollSelect = (rollId: string) => {
    const roll = inputRolls.find((r) => r.id === rollId);
    setStartForm({
      ...startForm,
      inputs: {
        ...startForm.inputs,
        inputRollId: rollId,
        rollQty: roll?.weight ?? startForm.targetQty,
      },
    });
  };

  const updateStartInputs = (patch: Partial<BcsInputs>) => {
    setStartForm({ ...startForm, inputs: { ...startForm.inputs, ...patch } });
  };

  const updateCompleteInputs = (patch: Partial<BcsInputs>) => {
    setCompleteForm({ ...completeForm, inputs: { ...completeForm.inputs, ...patch } });
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
              <Box className="h-6 w-6 text-primary" />
              BCS Production
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              BCS bag finishing — roll, yarn, PP/LPP, operator + team, configurable rules.
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

      {!hasBcsPlans && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">No BCS route on plan today</p>
            <p className="text-sm text-amber-800 mt-1">
              Add a BCS plan line with finishing route BCS for {selectedDate}.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">BCS Machines ({machines.length})</h2>
        {machines.length === 0 ? (
          <p className="text-sm text-slate-500">No BCS machines found. Add machines under a BCS section.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {machines.map((m) => (
              <div key={m.id} className={`p-3 rounded-lg border ${statusStyles[m.machineStatus]}`}>
                <p className="font-medium text-sm truncate">{m.name}</p>
                <p className="text-[10px] uppercase tracking-wide mt-1">{m.machineStatus}</p>
                {m.activeRun && (
                  <p className="text-[10px] mt-1 truncate">{m.activeRun.inputsSummary}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Start BCS Run
          </h2>
          <p className="text-xs text-slate-500">
            Team size: {bcsRules.minTeamMembers}–{bcsRules.maxTeamMembers} members (config: BCS_PRODUCTION_RULES).
          </p>
          <form onSubmit={handleStart} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plan Line</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.planLineId} onChange={(e) => onPlanLineSelect(e.target.value)} required disabled={!hasBcsPlans}>
                <option value="">{hasBcsPlans ? "Select BCS plan line…" : "No BCS plan today"}</option>
                {planLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.plan.planNumber} · target {line.targetQty}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Machine</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.bcsMachineId} onChange={(e) => setStartForm({ ...startForm, bcsMachineId: e.target.value })} required disabled={!hasBcsPlans}>
                  <option value="">Select machine…</option>
                  {machines.filter((m) => m.machineStatus !== "RUNNING" && m.machineStatus !== "MAINTENANCE").map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.operatorId} onChange={(e) => setStartForm({ ...startForm, operatorId: e.target.value, teamMemberIds: startForm.teamMemberIds.filter((id) => id !== e.target.value) })} required disabled={!hasBcsPlans}>
                  <option value="">Select operator…</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Team Members ({startForm.teamMemberIds.length}/{bcsRules.maxTeamMembers})
              </label>
              <OperatorMultiSelect
                users={teamOptions}
                value={startForm.teamMemberIds}
                onChange={(ids) => {
                  if (ids.length <= bcsRules.maxTeamMembers) {
                    setStartForm({ ...startForm, teamMemberIds: ids });
                  } else {
                    toast.error(`Maximum ${bcsRules.maxTeamMembers} team members allowed`);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Target Qty (bags)</label>
              <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.targetQty} onChange={(e) => setStartForm({ ...startForm, targetQty: parseFloat(e.target.value) || 0 })} required disabled={!hasBcsPlans} />
            </div>

            <div className="border border-slate-100 rounded-lg p-3 space-y-3 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Multi-input materials</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Input Roll</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={startForm.inputs.inputRollId || ""} onChange={(e) => onRollSelect(e.target.value)} disabled={!hasBcsPlans}>
                    <option value="">Optional roll…</option>
                    {inputRolls.map((roll) => (
                      <option key={roll.id} value={roll.id}>
                        {roll.rollNumber} ({roll.rollType}) — {roll.weight} kg
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Roll Qty</label>
                  <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={startForm.inputs.rollQty} onChange={(e) => updateStartInputs({ rollQty: parseFloat(e.target.value) || 0 })} disabled={!hasBcsPlans} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Yarn (Bobbin)</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={startForm.inputs.yarnItemId || ""} onChange={(e) => updateStartInputs({ yarnItemId: e.target.value })} disabled={!hasBcsPlans}>
                    <option value="">Optional yarn…</option>
                    {yarnItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.code} — stock {item.currentStock}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Yarn Qty</label>
                  <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={startForm.inputs.yarnQty} onChange={(e) => updateStartInputs({ yarnQty: parseFloat(e.target.value) || 0 })} disabled={!hasBcsPlans} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">PP Material</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={startForm.inputs.ppItemId || ""} onChange={(e) => updateStartInputs({ ppItemId: e.target.value })} disabled={!hasBcsPlans}>
                    <option value="">Optional PP…</option>
                    {ppItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.code} — stock {item.currentStock}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">PP Qty</label>
                  <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={startForm.inputs.ppQty} onChange={(e) => updateStartInputs({ ppQty: parseFloat(e.target.value) || 0 })} disabled={!hasBcsPlans} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">LPP Material</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={startForm.inputs.lppItemId || ""} onChange={(e) => updateStartInputs({ lppItemId: e.target.value })} disabled={!hasBcsPlans}>
                    <option value="">Optional LPP…</option>
                    {lppItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.code} — stock {item.currentStock}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">LPP Qty</label>
                  <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={startForm.inputs.lppQty} onChange={(e) => updateStartInputs({ lppQty: parseFloat(e.target.value) || 0 })} disabled={!hasBcsPlans} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving || !hasBcsPlans} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Run
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Available Input Rolls ({inputRolls.length})</h2>
          {inputRolls.length === 0 ? (
            <p className="text-sm text-slate-500">No rolls available for bcs input.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {inputRolls.slice(0, 20).map((roll) => (
                <div key={roll.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                  <p className="font-medium text-slate-800">{roll.rollNumber} ({roll.rollType})</p>
                  <p className="text-xs text-slate-500">{roll.sourcePhase} · {roll.weight} kg</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Active Runs ({activeRuns.length})</h2>
        {activeRuns.length === 0 ? (
          <p className="text-sm text-slate-500">No active bcs runs.</p>
        ) : (
          <div className="space-y-3">
            {activeRuns.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-100 rounded-lg p-4">
                <div>
                  <p className="font-medium text-slate-800">{run.bcsMachine.name} · {run.operator.name}</p>
                  <p className="text-xs text-slate-500">
                    {run.productionRun.planLine.plan.planNumber} · Target {run.productionRun.targetQty} bags
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-slate-800">Complete Bcs Run</h3>
              <p className="text-sm text-slate-500 mt-1">{completingRun.bcsMachine.name}</p>
            </div>
            <form onSubmit={handleComplete} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["actualQty", "Actual Qty"],
                  ["acceptedQty", "Accepted Qty"],
                  ["rejectedQty", "Rejected Qty"],
                  ["scrapQty", "Scrap Qty"],
                  ["outputBagQty", "Output Bags"],
                  ["downtimeMinutes", "Downtime (min)"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm[key as keyof typeof completeForm] as number} onChange={(e) => setCompleteForm({ ...completeForm, [key]: parseFloat(e.target.value) || 0 })} />
                  </div>
                ))}
              </div>

              <div className="border border-slate-100 rounded-lg p-3 space-y-3 bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Final input quantities</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Roll Qty</label>
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={completeForm.inputs.rollQty} onChange={(e) => updateCompleteInputs({ rollQty: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Yarn Qty</label>
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={completeForm.inputs.yarnQty} onChange={(e) => updateCompleteInputs({ yarnQty: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">PP Qty</label>
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={completeForm.inputs.ppQty} onChange={(e) => updateCompleteInputs({ ppQty: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">LPP Qty</label>
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" value={completeForm.inputs.lppQty} onChange={(e) => updateCompleteInputs({ lppQty: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
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
