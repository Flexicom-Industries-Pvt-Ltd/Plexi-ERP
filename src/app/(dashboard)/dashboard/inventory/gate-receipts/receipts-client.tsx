"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Truck, PackageCheck, AlertCircle, ArrowRight, Check } from "lucide-react";
import { format } from "date-fns";

type StockOption = {
  id: string;
  code: string;
  name: string;
  uom?: { abbreviation?: string };
};

export function GateReceiptsClient({ canCreate }: { canCreate: boolean }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<StockOption[]>([]);

  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [commitForm, setCommitForm] = useState<Record<string, { stockId: string; actualQuantity: string | number }>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resEntries, resStocks] = await Promise.all([
        fetch("/api/inventory/gate-receipts"),
        fetch("/api/stocks"),
      ]);

      if (!resEntries.ok) throw new Error("Failed to load gate receipts");
      if (!resStocks.ok) throw new Error("Failed to load stock catalog");

      const [entriesData, stocksData] = await Promise.all([
        resEntries.json(),
        resStocks.json(),
      ]);

      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setStocks(Array.isArray(stocksData) ? stocksData : []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load gate receipts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCommit = (entry: any) => {
    setActiveEntryId(entry.id);
    const initialForm: Record<string, { stockId: string; actualQuantity: string | number }> = {};

    entry.stockDetails.forEach((sd: any) => {
      if (sd.actualQuantity === null) {
        const matchByStockId = sd.stockId
          ? stocks.find((s) => s.id === sd.stockId)
          : undefined;
        const matchByName = stocks.find(
          (s) => s.name.toLowerCase() === sd.materialName.toLowerCase()
        );
        const match = matchByStockId ?? matchByName;

        const expectedQty = sd.expectedQuantity ?? sd.quantity ?? 0;

        initialForm[sd.id] = {
          stockId: match?.id ?? "",
          actualQuantity: expectedQty,
        };
      }
    });

    setCommitForm(initialForm);
  };

  const handleCommitSubmit = async (entryId: string) => {
    const commits = Object.keys(commitForm).map((stockDetailId) => ({
      stockDetailId,
      stockId: commitForm[stockDetailId].stockId,
      actualQuantity: Number(commitForm[stockDetailId].actualQuantity),
    }));

    if (commits.some((c) => !c.stockId)) {
      return toast.error("Please select a stock item for all materials.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/gate-receipts/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateEntryId: entryId, commits }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to commit");
      }

      toast.success("Stock committed to inventory successfully");
      setActiveEntryId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500 shadow-sm">
        <PackageCheck className="h-8 w-8 text-slate-300 mb-3 animate-pulse" />
        <p className="text-sm font-medium">Loading pending receipts...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500 shadow-sm">
        <PackageCheck className="h-10 w-10 text-slate-300 mb-3" />
        <p className="font-semibold text-slate-700">No Pending Receipts</p>
        <p className="text-xs text-slate-500 mt-1 text-center max-w-sm">
          All unloaded trucks have been fully verified and committed to inventory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {entries.map((entry) => {
        const pendingDetails = entry.stockDetails.filter((sd: any) => sd.actualQuantity === null);
        if (pendingDetails.length === 0) return null;

        const isCommitting = activeEntryId === entry.id;

        return (
          <div key={entry.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{entry.entryNumber}</h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-bold">
                      {entry.truckNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {entry.supplierCustomer || "Unknown Supplier"} • {entry.transporter || "Direct"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                  {entry.status}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Arrived: {format(new Date(entry.arrivalTime), "MMM d, HH:mm")}
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Declared Consignment Items ({pendingDetails.length})
                </div>
                {entry.stockDetails.length > pendingDetails.length && (
                  <span className="text-xs text-emerald-600 font-medium">
                    {entry.stockDetails.length - pendingDetails.length} items already received
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Material Declared at Gate</th>
                      <th className="px-4 py-3 text-right w-36">Expected Qty</th>
                      {isCommitting && (
                        <>
                          <th className="px-4 py-3 text-right w-40">Actual Received</th>
                          <th className="px-4 py-3 text-center w-28">Variance</th>
                          <th className="px-4 py-3 w-64">Map to Stock Catalog</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingDetails.map((sd: any) => {
                      const expectedQty = sd.expectedQuantity ?? sd.quantity ?? 0;
                      const actualQty = isCommitting && commitForm[sd.id]?.actualQuantity !== undefined
                        ? Number(commitForm[sd.id]?.actualQuantity)
                        : expectedQty;
                      const variance = actualQty - expectedQty;
                      const unitStr = sd.unit || sd.stock?.uom?.abbreviation || "kg";

                      return (
                        <tr key={sd.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{sd.materialName}</div>
                            <div className="text-xs text-slate-500 font-mono">
                              {sd.materialType ? sd.materialType.replace(/_/g, " ") : "Consignment"}
                              {sd.batchLot && ` • Batch: ${sd.batchLot}`}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">
                            {expectedQty} <span className="text-slate-400 text-xs font-normal">{unitStr}</span>
                          </td>
                          {isCommitting && (
                            <>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className="w-28 px-2.5 py-1.5 text-right border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-bold bg-white"
                                  value={commitForm[sd.id]?.actualQuantity ?? ""}
                                  onChange={(e) =>
                                    setCommitForm({
                                      ...commitForm,
                                      [sd.id]: { ...commitForm[sd.id], actualQuantity: e.target.value },
                                    })
                                  }
                                />
                              </td>
                              <td className="px-4 py-3 text-center">
                                {variance === 0 ? (
                                  <span className="text-[11px] font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                                    Exact
                                  </span>
                                ) : variance < 0 ? (
                                  <span className="text-[11px] font-bold text-rose-700 px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                                    {variance} {unitStr}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                                    +{variance} {unitStr}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs font-medium bg-white"
                                  value={commitForm[sd.id]?.stockId ?? ""}
                                  onChange={(e) =>
                                    setCommitForm({
                                      ...commitForm,
                                      [sd.id]: { ...commitForm[sd.id], stockId: e.target.value },
                                    })
                                  }
                                >
                                  <option value="">Select catalog stock...</option>
                                  {stocks.map((stock) => (
                                    <option key={stock.id} value={stock.id}>
                                      {stock.code} - {stock.name} ({stock.uom?.abbreviation || "unit"})
                                    </option>
                                  ))}
                                </select>
                                {stocks.length === 0 && (
                                  <p className="text-[11px] text-amber-600 mt-1">
                                    No stocks in catalog. Add items under Data Centre → Stocks.
                                  </p>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                {isCommitting ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setActiveEntryId(null)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleCommitSubmit(entry.id)}
                      disabled={submitting}
                      className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      {submitting ? "Committing to Inventory..." : "Commit to Inventory Ledger"}
                    </button>
                  </div>
                ) : (
                  canCreate && (
                    <button
                      onClick={() => handleOpenCommit(entry)}
                      className="px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 shadow-sm transition-colors flex items-center gap-2"
                    >
                      Verify & Receive Consignment <ArrowRight className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
