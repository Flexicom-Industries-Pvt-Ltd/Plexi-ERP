"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Play } from "lucide-react";
import { phaseLabel, statusLabel } from "@/lib/production/phases";
import { achievementPercent } from "@/lib/production/achievement";
import { PlanFormModal, formToPayload, planToFormDefaults } from "@/components/production/PlanFormModal";
import { PlannedVsActualSummary } from "@/components/production/PlannedVsActualSummary";
import { CompleteRunModal } from "@/components/production/CompleteRunModal";

export function PlanDetailClient({ planNumber }: { planNumber: string }) {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [completingRun, setCompletingRun] = useState<any>(null);
  const [startingLineId, setStartingLineId] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/plans/${planNumber}`);
      if (!res.ok) throw new Error("Plan not found");
      setPlan(await res.json());
    } catch {
      toast.error("Failed to load plan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [planNumber]);

  const runAction = async (action: "approve" | "cancel") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/production/plans/${planNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.details?.join?.(", ") || data.error || `Failed to ${action}`;
        throw new Error(msg);
      }
      toast.success(action === "approve" ? "Plan approved" : "Plan cancelled");
      setPlan(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (data: Parameters<typeof formToPayload>[0]) => {
    const res = await fetch(`/api/production/plans/${planNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(data)),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update plan");
    }
    toast.success("Plan updated");
    setEditing(false);
    fetchPlan();
  };

  const startRun = async (lineId: string, targetQty: number) => {
    setStartingLineId(lineId);
    try {
      const res = await fetch("/api/production/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planLineId: lineId, targetQty }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start run");
      }
      toast.success("Production run started");
      fetchPlan();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setStartingLineId(null);
    }
  };

  if (loading) {
    return <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>;
  }

  if (!plan) {
    return <p className="text-slate-500">Plan not found.</p>;
  }

  const statusColor: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    APPROVED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-600",
  };

  const canRun = ["APPROVED", "IN_PROGRESS"].includes(plan.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/production/plans" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary mb-2">
            <ArrowLeft className="h-4 w-4" /> Shift Plans
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{plan.planNumber}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[plan.status]}`}>
              {statusLabel(plan.status)}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {format(new Date(plan.planDate), "dd MMM yyyy")} · {plan.shift?.name ?? "No shift"} · Created by {plan.createdBy?.name ?? "—"}
          </p>
        </div>

        <div className="flex gap-2">
          {plan.status === "DRAFT" && (
            <>
              <button onClick={() => setEditing(true)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                Edit
              </button>
              <button
                onClick={() => runAction("approve")}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" /> Approve
              </button>
            </>
          )}
          {["DRAFT", "APPROVED"].includes(plan.status) && (
            <button
              onClick={() => runAction("cancel")}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      </div>

      {plan.notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-800">
          {plan.notes}
        </div>
      )}

      {plan.lines?.length > 0 && (
        <PlannedVsActualSummary lines={plan.lines} />
      )}

      <div className="space-y-4">
        {plan.lines?.map((line: any, index: number) => {
          const activeRun = line.runs?.find((r: any) => !r.endedAt);
          const completedRuns = line.runs?.filter((r: any) => r.endedAt) ?? [];
          const lineAccepted = completedRuns.reduce((s: number, r: any) => s + (r.acceptedQty ?? 0), 0);
          const lineAchievement = achievementPercent(lineAccepted, line.targetQty);

          return (
            <div key={line.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="font-semibold text-slate-800">
                  Line {index + 1}: {phaseLabel(line.phase)}
                </h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500">Target: {line.targetQty}</span>
                  <span className="text-slate-500">Accepted: {lineAccepted}</span>
                  <span className={`font-medium ${lineAchievement >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                    {lineAchievement}% achievement
                  </span>
                  {canRun && !activeRun && (
                    <button
                      onClick={() => startRun(line.id, line.targetQty)}
                      disabled={startingLineId === line.id}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      {startingLineId === line.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                      Start Run
                    </button>
                  )}
                  {activeRun && (
                    <button
                      onClick={() => setCompletingRun(activeRun)}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium"
                    >
                      Complete Run
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-xs text-slate-500">Machine</p>
                  <p className="font-medium">{line.machine?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Product</p>
                  <p className="font-medium">{line.inventoryItem ? `${line.inventoryItem.code} — ${line.inventoryItem.name}` : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Operators</p>
                  <p className="font-medium">
                    {line.operators?.length
                      ? line.operators.map((o: any) => o.user?.name || o.user?.email).join(", ")
                      : line.operator?.name ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Instructions</p>
                  <p className="font-medium">{line.instructions || "—"}</p>
                </div>
              </div>

              {line.characteristics?.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Characteristics</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {line.characteristics.map((c: any) => (
                      <div key={c.id} className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-500">{c.definition?.label ?? c.definitionId}</p>
                        <p className="text-sm font-medium text-slate-800">{c.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {line.runs?.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Production Runs</p>
                  <div className="space-y-2">
                    {line.runs.map((run: any) => (
                      <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-600">
                          {format(new Date(run.startedAt), "dd MMM HH:mm")}
                          {run.endedAt ? ` → ${format(new Date(run.endedAt), "HH:mm")}` : " · In progress"}
                        </span>
                        <span className="text-slate-700">
                          Target {run.targetQty} · Actual {run.actualQty} · Accepted {run.acceptedQty}
                          {run.endedAt && ` · ${achievementPercent(run.acceptedQty, run.targetQty)}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PlanFormModal
        open={editing}
        title={`Edit ${plan.planNumber}`}
        submitLabel="Save Changes"
        {...planToFormDefaults(plan)}
        onClose={() => setEditing(false)}
        onSubmit={handleEdit}
      />

      {completingRun && (
        <CompleteRunModal
          run={completingRun}
          open={!!completingRun}
          onClose={() => setCompletingRun(null)}
          onCompleted={fetchPlan}
        />
      )}
    </div>
  );
}
