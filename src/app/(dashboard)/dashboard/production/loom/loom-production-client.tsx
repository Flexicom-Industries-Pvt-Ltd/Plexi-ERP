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
  Factory,
  Users,
  AlertTriangle,
} from "lucide-react";

type LoomMachine = {
  id: string;
  name: string;
  status: string;
  serialNumber: string | null;
  section: { name: string; code: string };
  loomStatus: "IDLE" | "RUNNING" | "MAINTENANCE" | "INACTIVE";
  assignedOperator: { operatorId: string; operatorName: string } | null;
  activeRun: {
    id: string;
    productionRunId: string;
    targetQty: number;
    startedAt: string;
    operator: { id: string; name: string };
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

type LoomRun = {
  id: string;
  bobbinIssueQty: number;
  rollOutputQty: number;
  rollType: string | null;
  loomMachine: { id: string; name: string };
  operator: { id: string; name: string };
  bobbinItem?: { id: string; code: string; name: string } | null;
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

export function LoomProductionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [machines, setMachines] = useState<LoomMachine[]>([]);
  const [planLines, setPlanLines] = useState<PlanLine[]>([]);
  const [activeRuns, setActiveRuns] = useState<LoomRun[]>([]);
  const [bobbins, setBobbins] = useState<any[]>([]);
  const [ppRolls, setPpRolls] = useState<any[]>([]);
  const [lppRolls, setLppRolls] = useState<any[]>([]);
  const [loomsPerOperator, setLoomsPerOperator] = useState(4);

  const [shiftId, setShiftId] = useState("");
  const [assignOperatorId, setAssignOperatorId] = useState("");
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);

  const [startForm, setStartForm] = useState({
    planLineId: "",
    loomMachineId: "",
    operatorId: "",
    targetQty: 0,
    bobbinItemId: "",
    bobbinIssueQty: 0,
    rollType: "PP" as "PP" | "LPP",
  });

  const [completingRun, setCompletingRun] = useState<LoomRun | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    reworkQty: 0,
    scrapQty: 0,
    downtimeMinutes: 0,
    bobbinIssueQty: 0,
    rollOutputQty: 0,
    rollType: "PP" as "PP" | "LPP",
    rollItemId: "",
    bobbinItemId: "",
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
    fetch("/api/production/loom/items")
      .then((r) => (r.ok ? r.json() : { bobbins: [], ppRolls: [], lppRolls: [] }))
      .then((data: { bobbins?: any[]; ppRolls?: any[]; lppRolls?: any[] }) => {
        setBobbins(data.bobbins || []);
        setPpRolls(data.ppRolls || []);
        setLppRolls(data.lppRolls || []);
      });
    fetch("/api/production/manpower-rules")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.loomsPerOperator) setLoomsPerOperator(data.loomsPerOperator);
      });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const machineUrl = shiftId
        ? `/api/production/loom/machines?shiftId=${shiftId}&assignmentDate=${selectedDate}`
        : "/api/production/loom/machines";
      const [machinesRes, plansRes, runsRes] = await Promise.all([
        fetch(machineUrl),
        fetch(`/api/production/plans?phase=LOOM&dateFrom=${selectedDate}&dateTo=${selectedDate}`),
        fetch("/api/production/loom/runs?activeOnly=true"),
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
            if (line.phase === "LOOM") {
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
      }
      if (runsRes.ok) setActiveRuns(await runsRes.json());
    } catch {
      toast.error("Failed to load loom production data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, shiftId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleMachine = (machineId: string) => {
    setSelectedMachineIds((prev) =>
      prev.includes(machineId) ? prev.filter((id) => id !== machineId) : [...prev, machineId],
    );
  };

  const handleAssignment = async (forceOverride = false) => {
    if (!shiftId || !assignOperatorId || !selectedMachineIds.length) {
      toast.error("Select shift, operator, and at least one loom");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/production/loom/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          operatorId: assignOperatorId,
          assignmentDate: selectedDate,
          machineIds: selectedMachineIds,
          forceOverride,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.canOverride && (res.status === 422 || res.status === 409)) {
          const proceed = window.confirm(
            `${data.error}\n\n${(data.warnings || []).join("\n")}\n\nOverride and save anyway?`,
          );
          if (proceed) {
            setSaving(false);
            return handleAssignment(true);
          }
          return;
        }
        throw new Error(data.error || "Failed to save assignment");
      }
      if (data.warnings?.length) toast.warning(data.warnings.join(" "));
      else toast.success("Loom assignment saved");
      setSelectedMachineIds([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startForm.planLineId || !startForm.loomMachineId || !startForm.operatorId) {
      toast.error("Select plan line, loom, and operator");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/production/loom/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...startForm,
          bobbinItemId: startForm.bobbinItemId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start run");
      }
      toast.success("Loom run started");
      setStartForm({
        planLineId: "",
        loomMachineId: "",
        operatorId: "",
        targetQty: 0,
        bobbinItemId: "",
        bobbinIssueQty: 0,
        rollType: "PP",
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (run: LoomRun) => {
    setCompletingRun(run);
    setCompleteForm({
      actualQty: run.productionRun.targetQty,
      acceptedQty: run.productionRun.targetQty,
      rejectedQty: 0,
      reworkQty: 0,
      scrapQty: 0,
      downtimeMinutes: 0,
      bobbinIssueQty: run.bobbinIssueQty,
      rollOutputQty: run.rollOutputQty || run.productionRun.targetQty,
      rollType: (run.rollType as "PP" | "LPP") || "PP",
      rollItemId: "",
      bobbinItemId: run.bobbinItem?.id || "",
    });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRun) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/production/loom/runs/${completingRun.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          ...completeForm,
          rollItemId: completeForm.rollItemId || null,
          bobbinItemId: completeForm.bobbinItemId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete run");
      }
      const result = await res.json();
      toast.success(result.inventory?.message || "Loom run completed");
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
      loomMachineId: line?.machine?.id || startForm.loomMachineId,
      operatorId: line?.operator?.id || startForm.operatorId,
    });
  };

  const rollItems = completeForm.rollType === "LPP" ? lppRolls : ppRolls;

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
              Loom Production
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Assign looms to operators, track loom status, and record bobbin issue and roll output.
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

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Factory className="h-4 w-4 text-primary" /> Loom Grid ({machines.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {machines.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleMachine(m.id)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                selectedMachineIds.includes(m.id) ? "border-primary ring-2 ring-primary/20" : "border-slate-200"
              } ${statusStyles[m.loomStatus]}`}
            >
              <p className="font-medium text-sm truncate">{m.name}</p>
              <p className="text-[10px] uppercase tracking-wide mt-1">{m.loomStatus}</p>
              {m.assignedOperator && (
                <p className="text-[10px] mt-1 truncate">{m.assignedOperator.operatorName}</p>
              )}
              {m.activeRun && (
                <p className="text-[10px] mt-1">Run: {m.activeRun.operator.name}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Loom Assignment
          </h2>
          <p className="text-xs text-slate-500 flex items-start gap-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            Limit: {loomsPerOperator} loom(s) per operator (configurable in Data Centre → Manpower Rules).
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={assignOperatorId} onChange={(e) => setAssignOperatorId(e.target.value)}>
                <option value="">Select operator…</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>{op.name} {op.employeeId ? `(${op.employeeId})` : ""}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">{selectedMachineIds.length} loom(s) selected from grid</p>
            <button
              type="button"
              onClick={() => handleAssignment(false)}
              disabled={saving || !selectedMachineIds.length}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Save Assignment
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Start Loom Run
          </h2>
          <form onSubmit={handleStart} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plan Line</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.planLineId} onChange={(e) => onPlanLineSelect(e.target.value)} required>
                <option value="">Select approved loom line…</option>
                {planLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.plan.planNumber} · {line.machine?.name ?? "No loom"} · target {line.targetQty}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Loom</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.loomMachineId} onChange={(e) => setStartForm({ ...startForm, loomMachineId: e.target.value })} required>
                  <option value="">Select loom…</option>
                  {machines.filter((m) => m.loomStatus !== "RUNNING" && m.loomStatus !== "MAINTENANCE").map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.operatorId} onChange={(e) => setStartForm({ ...startForm, operatorId: e.target.value })} required>
                  <option value="">Select operator…</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Target Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.targetQty} onChange={(e) => setStartForm({ ...startForm, targetQty: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Roll Type</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.rollType} onChange={(e) => setStartForm({ ...startForm, rollType: e.target.value as "PP" | "LPP" })}>
                  <option value="PP">PP</option>
                  <option value="LPP">LPP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bobbin Issue Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.bobbinIssueQty} onChange={(e) => setStartForm({ ...startForm, bobbinIssueQty: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Bobbin (from inventory)</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.bobbinItemId} onChange={(e) => setStartForm({ ...startForm, bobbinItemId: e.target.value })}>
                <option value="">Select bobbin…</option>
                {bobbins.map((item) => (
                  <option key={item.id} value={item.id}>{item.code} — {item.name} (stock: {item.currentStock})</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Run
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Active Runs ({activeRuns.length})</h2>
        {activeRuns.length === 0 ? (
          <p className="text-sm text-slate-500">No active loom runs.</p>
        ) : (
          <div className="space-y-3">
            {activeRuns.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-100 rounded-lg p-4">
                <div>
                  <p className="font-medium text-slate-800">{run.loomMachine.name} · {run.operator.name}</p>
                  <p className="text-xs text-slate-500">
                    {run.productionRun.planLine.plan.planNumber} · Target {run.productionRun.targetQty} · {run.rollType ?? "—"}
                  </p>
                  {run.bobbinItem && (
                    <p className="text-xs text-slate-600 mt-1">Bobbin: {run.bobbinItem.code} × {run.bobbinIssueQty}</p>
                  )}
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
              <h3 className="font-semibold text-slate-800">Complete Loom Run</h3>
              <p className="text-sm text-slate-500 mt-1">
                {completingRun.loomMachine.name} · {completingRun.productionRun.planLine.plan.planNumber}
              </p>
            </div>
            <form onSubmit={handleComplete} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Bobbin Issue Qty", key: "bobbinIssueQty" as const },
                  { label: "Roll Output Qty", key: "rollOutputQty" as const },
                  { label: "Actual Qty", key: "actualQty" as const },
                  { label: "Accepted Qty", key: "acceptedQty" as const },
                  { label: "Rejected Qty", key: "rejectedQty" as const },
                  { label: "Rework Qty", key: "reworkQty" as const },
                  { label: "Scrap Qty", key: "scrapQty" as const },
                  { label: "Downtime (mins)", key: "downtimeMinutes" as const },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm[field.key]} onChange={(e) => setCompleteForm({ ...completeForm, [field.key]: parseFloat(e.target.value) || 0 })} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Roll Type</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm.rollType} onChange={(e) => setCompleteForm({ ...completeForm, rollType: e.target.value as "PP" | "LPP", rollItemId: "" })}>
                    <option value="PP">PP</option>
                    <option value="LPP">LPP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Output Roll Item</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm.rollItemId} onChange={(e) => setCompleteForm({ ...completeForm, rollItemId: e.target.value })}>
                    <option value="">Select roll SKU…</option>
                    {rollItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bobbin Issued</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm.bobbinItemId} onChange={(e) => setCompleteForm({ ...completeForm, bobbinItemId: e.target.value })}>
                  <option value="">Select bobbin…</option>
                  {bobbins.map((item) => (
                    <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
                  ))}
                </select>
              </div>
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
