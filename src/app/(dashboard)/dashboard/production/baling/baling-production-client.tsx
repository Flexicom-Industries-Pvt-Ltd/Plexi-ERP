"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Package, Plus, Search } from "lucide-react";

type BagItem = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
};

type BaleItem = {
  id: string;
  code: string;
  name: string;
};

type Bale = {
  id: string;
  baleNumber: string;
  bagsPerBale: number;
  quantity: number;
  productionBatch: string | null;
  qualityStatus: string;
  baledAt: string;
  product: BagItem;
  baleItem?: BaleItem | null;
  shift: { id: string; name: string };
  createdBy?: { name: string } | null;
};

const qualityStyles: Record<string, string> = {
  PENDING_QC: "bg-amber-100 text-amber-800 border-amber-200",
  PASSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  REWORK: "bg-orange-100 text-orange-800 border-orange-200",
  ON_HOLD: "bg-slate-100 text-slate-700 border-slate-200",
};

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function BalingProductionClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bales, setBales] = useState<Bale[]>([]);
  const [bagItems, setBagItems] = useState<BagItem[]>([]);
  const [baleItems, setBaleItems] = useState<BaleItem[]>([]);
  const [shifts, setShifts] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterQuality, setFilterQuality] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    productId: "",
    baleItemId: "",
    bagsPerBale: 0,
    quantity: 0,
    productionBatch: "",
    qualityStatus: "PASSED",
    shiftId: "",
  });

  const selectedBag = useMemo(
    () => bagItems.find((item) => item.id === form.productId),
    [bagItems, form.productId],
  );

  const baleCount = useMemo(() => {
    if (!form.bagsPerBale || !form.quantity) return 0;
    if (form.quantity % form.bagsPerBale !== 0) return 0;
    return form.quantity / form.bagsPerBale;
  }, [form.bagsPerBale, form.quantity]);

  useEffect(() => {
    fetch("/api/settings/master-data/shift")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setShifts(data);
        if (data.length) setForm((f) => ({ ...f, shiftId: f.shiftId || data[0].id }));
      });
    fetch("/api/production/baling/bag-items")
      .then((r) => (r.ok ? r.json() : []))
      .then(setBagItems);
    fetch("/api/production/baling/bale-items")
      .then((r) => (r.ok ? r.json() : []))
      .then(setBaleItems);
  }, []);

  const fetchBales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) {
        params.set("dateFrom", filterDate);
        params.set("dateTo", filterDate);
      }
      if (filterQuality) params.set("qualityStatus", filterQuality);
      if (search) params.set("search", search);
      const qs = params.toString();
      const res = await fetch(`/api/production/baling${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load bales");
      setBales(await res.json());
    } catch {
      toast.error("Failed to load bales");
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterQuality, search]);

  useEffect(() => {
    fetchBales();
  }, [fetchBales]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.shiftId || !form.bagsPerBale || !form.quantity) {
      toast.error("Fill in all required fields");
      return;
    }
    if (form.quantity % form.bagsPerBale !== 0) {
      toast.error("Total bags must be a multiple of bags per bale");
      return;
    }
    if (selectedBag && form.quantity > selectedBag.currentStock) {
      toast.error("Quantity exceeds available bag stock");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/production/baling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          baleItemId: form.baleItemId || null,
          bagsPerBale: form.bagsPerBale,
          quantity: form.quantity,
          productionBatch: form.productionBatch || null,
          qualityStatus: form.qualityStatus,
          shiftId: form.shiftId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create bale");

      const label =
        data.baleNumber ??
        (data.created ? `${data.created} bales created` : "Bale created");
      toast.success(typeof label === "string" && label.startsWith("BL-") ? `Bale ${label} created` : label);
      setShowForm(false);
      setForm({
        productId: "",
        baleItemId: "",
        bagsPerBale: 0,
        quantity: 0,
        productionBatch: "",
        qualityStatus: "PASSED",
        shiftId: shifts[0]?.id ?? "",
      });
      fetchBales();
      fetch("/api/production/baling/bag-items")
        .then((r) => (r.ok ? r.json() : []))
        .then(setBagItems);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Package className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Production</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Baling</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Bundle approved finished bags into bales with batch traceability, shift, and quality status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Create Bale
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-black/5 md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-slate-900">New bale from finished bags</h2>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Bag product *</span>
            <select
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              required
            >
              <option value="">Select finished bag item</option>
              {bagItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name} ({item.currentStock} available)
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Bale output item</span>
            <select
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3"
              value={form.baleItemId}
              onChange={(e) => setForm({ ...form, baleItemId: e.target.value })}
            >
              <option value="">Optional — select bales stock item</option>
              {baleItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Bags per bale *</span>
            <input
              type="number"
              min={1}
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3"
              value={form.bagsPerBale || ""}
              onChange={(e) => setForm({ ...form, bagsPerBale: Number(e.target.value) })}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Total bags to bale *</span>
            <input
              type="number"
              min={1}
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3"
              value={form.quantity || ""}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              required
            />
            {baleCount > 0 && (
              <span className="text-xs text-muted-foreground">Creates {baleCount} bale(s)</span>
            )}
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Production batch</span>
            <input
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3"
              value={form.productionBatch}
              onChange={(e) => setForm({ ...form, productionBatch: e.target.value })}
              placeholder="Batch / lot reference"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Shift *</span>
            <select
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3"
              value={form.shiftId}
              onChange={(e) => setForm({ ...form, shiftId: e.target.value })}
              required
            >
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Quality status</span>
            <select
              className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3"
              value={form.qualityStatus}
              onChange={(e) => setForm({ ...form, qualityStatus: e.target.value })}
            >
              <option value="PASSED">Passed</option>
              <option value="PENDING_QC">Pending QC</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="REWORK">Rework</option>
              <option value="FAILED">Failed</option>
            </select>
          </label>

          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Create Bale
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-black/5 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm"
            placeholder="Search bale number, batch, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          value={filterQuality}
          onChange={(e) => setFilterQuality(e.target.value)}
        >
          <option value="">All quality</option>
          <option value="PENDING_QC">Pending QC</option>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
          <option value="REWORK">Rework</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
        <input
          type="date"
          className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm md:col-span-1"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading bales...
          </div>
        ) : bales.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No bales yet. Create a bale from approved finished bag stock.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Bale #</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Bags</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Shift</th>
                  <th className="px-4 py-3 font-semibold">Quality</th>
                  <th className="px-4 py-3 font-semibold">Baled at</th>
                </tr>
              </thead>
              <tbody>
                {bales.map((bale) => (
                  <tr key={bale.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">{bale.baleNumber}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {bale.product.code} — {bale.product.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {bale.quantity} bags ({bale.bagsPerBale}/bale)
                    </td>
                    <td className="px-4 py-3 text-slate-600">{bale.productionBatch || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{bale.shift.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${qualityStyles[bale.qualityStatus] ?? ""}`}
                      >
                        {statusLabel(bale.qualityStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(new Date(bale.baledAt), "dd MMM yyyy HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
