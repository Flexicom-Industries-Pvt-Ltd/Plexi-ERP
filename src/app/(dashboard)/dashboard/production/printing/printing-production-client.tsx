"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle,
  Printer,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";

import { OperatorMultiSelect } from "@/components/production/OperatorMultiSelect";

type PrintingMachine = {
  id: string;
  name: string;
  status: string;
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

type InkMaterial = { name: string; qty: number; unit: string };

type PrintingRun = {
  id: string;
  brand: string | null;
  colour: string | null;
  artworkRef: string | null;
  inkMaterials: InkMaterial[] | null;
  inputQty: number;
  outputQty: number;
  printingMachine: { id: string; name: string };
  operator: { id: string; name: string };
  inputRoll: InputRoll;
  helpers: { user: { id: string; name: string } }[];
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

const emptyInkRow = (): InkMaterial => ({ name: "", qty: 0, unit: "kg" });

export function PrintingProductionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [shifts, setShifts] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [machines, setMachines] = useState<PrintingMachine[]>([]);
  const [planLines, setPlanLines] = useState<PlanLine[]>([]);
  const [activeRuns, setActiveRuns] = useState<PrintingRun[]>([]);
  const [inputRolls, setInputRolls] = useState<InputRoll[]>([]);
  const [hasPrintingPlans, setHasPrintingPlans] = useState(true);
  const [requiredHelpers, setRequiredHelpers] = useState(2);
  const [shiftId, setShiftId] = useState("");

  const [startForm, setStartForm] = useState({
    planLineId: "",
    printingMachineId: "",
    operatorId: "",
    targetQty: 0,
    inputRollId: "",
    inputQty: 0,
    brand: "",
    colour: "",
    artworkRef: "",
    helperUserIds: [] as string[],
    inkMaterials: [emptyInkRow(), emptyInkRow()] as InkMaterial[],
  });

  const [completingRun, setCompletingRun] = useState<PrintingRun | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualQty: 0,
    acceptedQty: 0,
    rejectedQty: 0,
    reworkQty: 0,
    scrapQty: 0,
    downtimeMinutes: 0,
    inputQty: 0,
    outputQty: 0,
    brand: "",
    colour: "",
    artworkRef: "",
    inkMaterials: [] as InkMaterial[],
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
    fetch("/api/production/printing/config")
      .then((r) => (r.ok ? r.json() : { helpersPerOperator: 2 }))
      .then((data) => setRequiredHelpers(data.helpersPerOperator ?? 2));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const machineUrl = shiftId
        ? `/api/production/printing/machines?shiftId=${shiftId}&assignmentDate=${selectedDate}`
        : "/api/production/printing/machines";
      const [machinesRes, plansRes, runsRes, rollsRes, configRes] = await Promise.all([
        fetch(machineUrl),
        fetch(`/api/production/plans?phase=PRINTING&dateFrom=${selectedDate}&dateTo=${selectedDate}`),
        fetch("/api/production/printing/runs?activeOnly=true"),
        fetch("/api/production/printing/input-rolls"),
        fetch("/api/production/printing/config"),
      ]);

      if (configRes.ok) {
        const cfg = await configRes.json();
        setRequiredHelpers(cfg.helpersPerOperator ?? 2);
      }
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
            if (line.phase === "PRINTING") {
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
        setHasPrintingPlans(lines.length > 0);
      }
      if (runsRes.ok) setActiveRuns(await runsRes.json());
      if (rollsRes.ok) setInputRolls(await rollsRes.json());
    } catch {
      toast.error("Failed to load printing production data");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, shiftId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const helperOptions = operators.filter((op) => op.id !== startForm.operatorId);

  const handleStart = async (forceOverride = false) => {
    if (!startForm.planLineId || !startForm.printingMachineId || !startForm.operatorId || !startForm.inputRollId) {
      toast.error("Select plan line, machine, operator, and input roll");
      return;
    }
    if (!forceOverride && startForm.helperUserIds.length !== requiredHelpers) {
      toast.error(`Select exactly ${requiredHelpers} helper(s)`);
      return;
    }
    setSaving(true);
    try {
      const inkMaterials = startForm.inkMaterials.filter((m) => m.name.trim() && m.qty > 0);
      const res = await fetch("/api/production/printing/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...startForm,
          inkMaterials: inkMaterials.length ? inkMaterials : undefined,
          forceOverride,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.canOverride && res.status === 422) {
          const proceed = window.confirm(
            `${data.error}\n\nOverride manpower rules and start run anyway? (Supervisor permission required)`,
          );
          if (proceed) {
            setSaving(false);
            return handleStart(true);
          }
          return;
        }
        throw new Error(data.error || "Failed to start run");
      }
      toast.success("Printing run started");
      setStartForm({
        planLineId: "",
        printingMachineId: "",
        operatorId: "",
        targetQty: 0,
        inputRollId: "",
        inputQty: 0,
        brand: "",
        colour: "",
        artworkRef: "",
        helperUserIds: [],
        inkMaterials: [emptyInkRow(), emptyInkRow()],
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openComplete = (run: PrintingRun) => {
    const inks = Array.isArray(run.inkMaterials) ? run.inkMaterials : [];
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
      brand: run.brand || "",
      colour: run.colour || "",
      artworkRef: run.artworkRef || "",
      inkMaterials: inks.length ? inks : [emptyInkRow()],
    });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingRun) return;
    setSaving(true);
    try {
      const inkMaterials = completeForm.inkMaterials.filter((m) => m.name.trim() && m.qty > 0);
      const res = await fetch(`/api/production/printing/runs/${completingRun.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          ...completeForm,
          inkMaterials: inkMaterials.length ? inkMaterials : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete run");
      }
      const result = await res.json();
      toast.success(result.inventory?.message || "Printing run completed");
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
      printingMachineId: line?.machine?.id || startForm.printingMachineId,
      operatorId: line?.operator?.id || startForm.operatorId,
      helperUserIds: startForm.helperUserIds.filter((id) => id !== line?.operator?.id),
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

  const updateInk = (index: number, field: keyof InkMaterial, value: string | number) => {
    setStartForm((prev) => {
      const inkMaterials = [...prev.inkMaterials];
      inkMaterials[index] = { ...inkMaterials[index], [field]: value };
      return { ...prev, inkMaterials };
    });
  };

  const updateCompleteInk = (index: number, field: keyof InkMaterial, value: string | number) => {
    setCompleteForm((prev) => {
      const inkMaterials = [...prev.inkMaterials];
      inkMaterials[index] = { ...inkMaterials[index], [field]: value };
      return { ...prev, inkMaterials };
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
              <Printer className="h-6 w-6 text-primary" />
              Printing Production
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Pelican 6/8 colour printing — input roll, brand, artwork, ink/reducer, operator + {requiredHelpers} helpers.
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

      {!hasPrintingPlans && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">No printing required today</p>
            <p className="text-sm text-amber-800 mt-1">
              No approved shift plan includes a PRINTING phase for {selectedDate}.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Printer className="h-4 w-4 text-primary" /> Printing Machines ({machines.length})
        </h2>
        {machines.length === 0 ? (
          <p className="text-sm text-slate-500">No printing machines found. Add machines under a Printing section.</p>
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
            <Play className="h-4 w-4 text-primary" /> Start Printing Run
          </h2>
          <p className="text-xs text-slate-500">
            Requires exactly {requiredHelpers} helper(s). Configure in Data Centre → Manpower Rules.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); handleStart(); }} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plan Line</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.planLineId} onChange={(e) => onPlanLineSelect(e.target.value)} required disabled={!hasPrintingPlans}>
                <option value="">{hasPrintingPlans ? "Select approved printing line…" : "Printing not required on plan"}</option>
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
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.printingMachineId} onChange={(e) => setStartForm({ ...startForm, printingMachineId: e.target.value })} required disabled={!hasPrintingPlans}>
                  <option value="">Select machine…</option>
                  {machines.filter((m) => m.machineStatus !== "RUNNING" && m.machineStatus !== "MAINTENANCE").map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Operator</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.operatorId} onChange={(e) => setStartForm({ ...startForm, operatorId: e.target.value, helperUserIds: startForm.helperUserIds.filter((id) => id !== e.target.value) })} required disabled={!hasPrintingPlans}>
                  <option value="">Select operator…</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Helpers ({startForm.helperUserIds.length}/{requiredHelpers})
              </label>
              <OperatorMultiSelect
                users={helperOptions}
                value={startForm.helperUserIds}
                onChange={(ids) => {
                  if (ids.length <= requiredHelpers) {
                    setStartForm({ ...startForm, helperUserIds: ids });
                  } else {
                    toast.error(`Maximum ${requiredHelpers} helpers allowed`);
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Input Roll</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50" value={startForm.inputRollId} onChange={(e) => onInputRollSelect(e.target.value)} required disabled={!hasPrintingPlans}>
                <option value="">Select available roll…</option>
                {inputRolls.map((roll) => (
                  <option key={roll.id} value={roll.id}>
                    {roll.rollNumber} · {roll.rollType} · {roll.sourcePhase} · {roll.weight ?? "—"} kg
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Brand / Customer</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.brand} onChange={(e) => setStartForm({ ...startForm, brand: e.target.value })} disabled={!hasPrintingPlans} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Colour</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.colour} onChange={(e) => setStartForm({ ...startForm, colour: e.target.value })} disabled={!hasPrintingPlans} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Artwork Ref</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.artworkRef} onChange={(e) => setStartForm({ ...startForm, artworkRef: e.target.value })} disabled={!hasPrintingPlans} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ink / Reducer / Materials</label>
              <div className="space-y-2">
                {startForm.inkMaterials.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input placeholder="Material" className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm" value={row.name} onChange={(e) => updateInk(i, "name", e.target.value)} disabled={!hasPrintingPlans} />
                    <input type="number" min={0} placeholder="Qty" className="w-20 px-2 py-1.5 border border-slate-200 rounded text-sm" value={row.qty} onChange={(e) => updateInk(i, "qty", parseFloat(e.target.value) || 0)} disabled={!hasPrintingPlans} />
                    <input placeholder="Unit" className="w-16 px-2 py-1.5 border border-slate-200 rounded text-sm" value={row.unit} onChange={(e) => updateInk(i, "unit", e.target.value)} disabled={!hasPrintingPlans} />
                    {startForm.inkMaterials.length > 1 && (
                      <button type="button" onClick={() => setStartForm({ ...startForm, inkMaterials: startForm.inkMaterials.filter((_, j) => j !== i) })} className="text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setStartForm({ ...startForm, inkMaterials: [...startForm.inkMaterials, emptyInkRow()] })} className="text-xs text-primary flex items-center gap-1" disabled={!hasPrintingPlans}>
                  <Plus className="h-3 w-3" /> Add material
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Target Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.targetQty} onChange={(e) => setStartForm({ ...startForm, targetQty: parseFloat(e.target.value) || 0 })} required disabled={!hasPrintingPlans} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Input Qty</label>
                <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={startForm.inputQty} onChange={(e) => setStartForm({ ...startForm, inputQty: parseFloat(e.target.value) || 0 })} disabled={!hasPrintingPlans} />
              </div>
            </div>
            <button type="submit" disabled={saving || !hasPrintingPlans} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Run
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Available Input Rolls ({inputRolls.length})</h2>
          {inputRolls.length === 0 ? (
            <p className="text-sm text-slate-500">No loom or laminated rolls ready for printing.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {inputRolls.map((roll) => (
                <div key={roll.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{roll.rollNumber}</p>
                    <p className="text-xs text-slate-500">{roll.rollType} · {roll.sourcePhase} · {roll.weight ?? "—"} kg</p>
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
          <p className="text-sm text-slate-500">No active printing runs.</p>
        ) : (
          <div className="space-y-3">
            {activeRuns.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-100 rounded-lg p-4">
                <div>
                  <p className="font-medium text-slate-800">{run.printingMachine.name} · {run.operator.name}</p>
                  <p className="text-xs text-slate-500">
                    {run.productionRun.planLine.plan.planNumber} · {run.inputRoll.rollNumber}
                    {run.brand ? ` · ${run.brand}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    Helpers: {run.helpers.map((h) => h.user.name).join(", ") || "—"}
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
              <h3 className="font-semibold text-slate-800">Complete Printing Run</h3>
              <p className="text-sm text-slate-500 mt-1">{completingRun.printingMachine.name} · {completingRun.inputRoll.rollNumber}</p>
            </div>
            <form onSubmit={handleComplete} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["actualQty", "Actual Qty"],
                  ["acceptedQty", "Accepted Qty"],
                  ["rejectedQty", "Rejected Qty"],
                  ["scrapQty", "Scrap Qty"],
                  ["inputQty", "Input Qty"],
                  ["outputQty", "Output Qty"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input type="number" min={0} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={completeForm[key as keyof typeof completeForm] as number} onChange={(e) => setCompleteForm({ ...completeForm, [key]: parseFloat(e.target.value) || 0 })} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="Brand" className="px-2 py-1.5 border border-slate-200 rounded text-sm" value={completeForm.brand} onChange={(e) => setCompleteForm({ ...completeForm, brand: e.target.value })} />
                <input placeholder="Colour" className="px-2 py-1.5 border border-slate-200 rounded text-sm" value={completeForm.colour} onChange={(e) => setCompleteForm({ ...completeForm, colour: e.target.value })} />
                <input placeholder="Artwork" className="px-2 py-1.5 border border-slate-200 rounded text-sm" value={completeForm.artworkRef} onChange={(e) => setCompleteForm({ ...completeForm, artworkRef: e.target.value })} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600">Final ink / material consumption</p>
                {completeForm.inkMaterials.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <input placeholder="Material" className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm" value={row.name} onChange={(e) => updateCompleteInk(i, "name", e.target.value)} />
                    <input type="number" min={0} className="w-20 px-2 py-1.5 border border-slate-200 rounded text-sm" value={row.qty} onChange={(e) => updateCompleteInk(i, "qty", parseFloat(e.target.value) || 0)} />
                  </div>
                ))}
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
