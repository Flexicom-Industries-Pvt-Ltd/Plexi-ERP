"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Factory, Loader2, MapPin, Package, ScrollText } from "lucide-react";
import { ProductionInventoryMovements } from "@/components/production/ProductionInventoryMovements";

const qualityOptions = [
  { value: "PENDING_QC", label: "Pending QC" },
  { value: "PASSED", label: "Passed" },
  { value: "FAILED", label: "Failed" },
  { value: "REWORK", label: "Rework" },
  { value: "ON_HOLD", label: "On Hold" },
];

export function RollDetailClient({ rollId }: { rollId: string }) {
  const [roll, setRoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [form, setForm] = useState({
    qualityStatus: "",
    weight: "",
    length: "",
    batchLot: "",
    locationId: "",
    remarks: "",
  });

  const fetchRoll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/rolls/${rollId}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setRoll(data);
      setForm({
        qualityStatus: data.qualityStatus,
        weight: data.weight?.toString() ?? "",
        length: data.length?.toString() ?? "",
        batchLot: data.batchLot ?? "",
        locationId: data.locationId ?? "",
        remarks: data.remarks ?? "",
      });
    } catch {
      toast.error("Failed to load roll details");
    } finally {
      setLoading(false);
    }
  }, [rollId]);

  useEffect(() => {
    fetchRoll();
    fetch("/api/settings/master-data/location")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLocations)
      .catch(() => {});
  }, [fetchRoll]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/production/rolls/${rollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualityStatus: form.qualityStatus,
          weight: form.weight ? Number(form.weight) : undefined,
          length: form.length ? Number(form.length) : undefined,
          batchLot: form.batchLot || null,
          locationId: form.locationId || null,
          remarks: form.remarks || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
      const updated = await res.json();
      setRoll(updated);
      toast.success("Roll updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update roll");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading roll...
      </div>
    );
  }

  if (!roll) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Roll not found.</p>
        <Link href="/dashboard/production/rolls" className="mt-4 inline-block text-primary hover:underline">
          Back to roll catalog
        </Link>
      </div>
    );
  }

  const plan = roll.productionRun?.planLine?.plan;
  const loom = roll.loomProductionRun;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/dashboard/production/rolls"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Roll catalog
          </Link>
          <div className="flex items-center gap-3">
            <ScrollText className="size-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{roll.rollNumber}</h1>
              <p className="text-sm text-muted-foreground">
                {roll.rollType} roll · {roll.sourcePhase} output · Created {format(new Date(roll.createdAt), "dd MMM yyyy HH:mm")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Roll identity</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Inventory item</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {roll.inventoryItem ? `${roll.inventoryItem.code} — ${roll.inventoryItem.name}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Location</dt>
                <dd className="mt-1 flex items-center gap-1 font-medium text-slate-900">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {roll.location ? `${roll.location.code} — ${roll.location.name}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Weight</dt>
                <dd className="mt-1 font-medium text-slate-900">{roll.weight != null ? `${roll.weight} kg` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Length</dt>
                <dd className="mt-1 font-medium text-slate-900">{roll.length != null ? `${roll.length} m` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Batch / lot</dt>
                <dd className="mt-1 font-medium text-slate-900">{roll.batchLot || "—"}</dd>
              </div>
            </dl>
            {roll.characteristics && Object.keys(roll.characteristics).length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Characteristics</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(roll.characteristics as Record<string, unknown>).map(([key, value]) => (
                    <div key={key} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{key}: </span>
                      <span className="font-medium text-slate-800">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Factory className="size-4" />
              Traceability
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Production plan</dt>
                <dd className="mt-1">
                  {plan ? (
                    <Link href={`/dashboard/production/plans/${plan.id}`} className="font-medium text-primary hover:underline">
                      {plan.planNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Plan date / shift</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {plan ? `${format(new Date(plan.planDate), "dd MMM yyyy")}${plan.shift ? ` · ${plan.shift.name}` : ""}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Loom machine</dt>
                <dd className="mt-1 font-medium text-slate-900">{loom?.loomMachine?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Operator</dt>
                <dd className="mt-1 font-medium text-slate-900">{loom?.operator?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Bobbin consumed</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {loom?.bobbinItem ? `${loom.bobbinItem.code} — ${loom.bobbinItem.name}` : "—"}
                </dd>
              </div>
            </dl>
            {loom && (
              <Link
                href="/dashboard/production/loom"
                className="mt-4 inline-flex text-sm text-primary hover:underline"
              >
                View loom production screen
              </Link>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Package className="size-4" />
              Update roll
            </h2>
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-slate-600">
                Quality status
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
                  value={form.qualityStatus}
                  onChange={(e) => setForm((f) => ({ ...f, qualityStatus: e.target.value }))}
                >
                  {qualityOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Weight (kg)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Length (m)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
                  value={form.length}
                  onChange={(e) => setForm((f) => ({ ...f, length: e.target.value }))}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Batch / lot
                <input
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
                  value={form.batchLot}
                  onChange={(e) => setForm((f) => ({ ...f, batchLot: e.target.value }))}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Location
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
                  value={form.locationId}
                  onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.code} — {loc.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Remarks
                <textarea
                  className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                />
              </label>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
              </button>
            </div>
          </section>
        </div>
      </div>

      {roll.productionRun?.id && (
        <ProductionInventoryMovements referenceId={roll.productionRun.id} />
      )}
    </div>
  );
}
