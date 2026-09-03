"use client";

import { useEffect, useState } from "react";
import { Loader2, PackageSearch } from "lucide-react";

type InventoryTx = {
  id: string;
  type: string;
  quantity: number;
  batchLot: string | null;
  remarks: string | null;
  createdAt: string;
  item: { code: string; name: string };
};

type Props = {
  referenceId: string;
  referenceType?: "PRODUCTION_RUN" | "BALE";
  title?: string;
};

export function ProductionInventoryMovements({
  referenceId,
  referenceType = "PRODUCTION_RUN",
  title = "Inventory movements",
}: Props) {
  const [transactions, setTransactions] = useState<InventoryTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!referenceId) return;
    setLoading(true);
    fetch(
      `/api/production/runs/${referenceId}/inventory-transactions?referenceType=${referenceType}`,
    )
      .then((r) => (r.ok ? r.json() : []))
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [referenceId, referenceType]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="size-4 animate-spin" />
        Loading inventory movements...
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-sm text-muted-foreground">
        No inventory movements linked to this {referenceType === "BALE" ? "bale" : "run"} yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <PackageSearch className="size-4 text-primary" />
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-2 pr-4 font-semibold">Type</th>
              <th className="pb-2 pr-4 font-semibold">Item</th>
              <th className="pb-2 pr-4 font-semibold">Qty</th>
              <th className="pb-2 pr-4 font-semibold">Batch</th>
              <th className="pb-2 font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-4">
                  <span
                    className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${
                      tx.type === "IN"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800"
                    }`}
                  >
                    {tx.type}
                  </span>
                </td>
                <td className="py-2 pr-4 text-slate-700">
                  {tx.item.code} — {tx.item.name}
                </td>
                <td className="py-2 pr-4 font-mono text-slate-900">{tx.quantity}</td>
                <td className="py-2 pr-4 text-slate-600">{tx.batchLot || "—"}</td>
                <td className="py-2 text-slate-500">{tx.remarks || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
