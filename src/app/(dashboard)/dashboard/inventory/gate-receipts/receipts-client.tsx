"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Truck, PackageCheck, AlertCircle, ArrowRight, Check } from "lucide-react";
import { format } from "date-fns";

export function GateReceiptsClient({ canCreate }: { canCreate: boolean }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // We will track the commitment form state per GateEntry
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [commitForm, setCommitForm] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resEntries, resItems] = await Promise.all([
        fetch("/api/inventory/gate-receipts").then(r => r.json()),
        fetch("/api/inventory/items").then(r => r.json()),
      ]);

      setEntries(Array.isArray(resEntries) ? resEntries : []);
      setInventoryItems(Array.isArray(resItems) ? resItems : []);
    } catch (err) {
      toast.error("Failed to load gate receipts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCommit = (entry: any) => {
    setActiveEntryId(entry.id);
    const initialForm: any = {};
    entry.stockDetails.forEach((sd: any) => {
      if (sd.actualQuantity === null) {
        // Try to match inventory item by name as default
        const match = inventoryItems.find(i => i.name.toLowerCase() === sd.materialName.toLowerCase());
        initialForm[sd.id] = {
          itemId: match ? match.id : "",
          actualQuantity: sd.expectedQuantity || 0,
        };
      }
    });
    setCommitForm(initialForm);
  };

  const handleCommitSubmit = async (entryId: string) => {
    const commits = Object.keys(commitForm).map(stockDetailId => ({
      stockDetailId,
      itemId: commitForm[stockDetailId].itemId,
      actualQuantity: Number(commitForm[stockDetailId].actualQuantity),
    }));

    if (commits.some(c => !c.itemId)) {
      return toast.error("Please select an Inventory Item for all materials.");
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
        <p>Loading pending receipts...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500 shadow-sm">
        <PackageCheck className="h-10 w-10 text-slate-300 mb-3" />
        <p className="font-medium text-slate-600">No Pending Receipts</p>
        <p className="text-sm mt-1 text-center max-w-sm">
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
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{entry.entryNumber}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {entry.truckNumber} • {entry.supplierCustomer || "Unknown Supplier"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                  {entry.status}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Arrived: {format(new Date(entry.arrivalTime), "MMM d, HH:mm")}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Pending Verification
              </div>
              
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Material Declared at Gate</th>
                      <th className="px-4 py-3 font-medium text-right w-40">Expected Qty</th>
                      {isCommitting && (
                        <>
                          <th className="px-4 py-3 font-medium text-right w-40">Actual Qty Received</th>
                          <th className="px-4 py-3 font-medium w-64">Map to Inventory Item</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingDetails.map((sd: any) => (
                      <tr key={sd.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{sd.materialName}</div>
                          <div className="text-xs text-slate-500">Batch: {sd.batchLot || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {sd.expectedQuantity} <span className="text-slate-400 text-xs">{sd.unit}</span>
                        </td>
                        {isCommitting && (
                          <>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24 px-2 py-1 text-right border border-slate-300 rounded focus:ring-primary focus:border-primary text-sm"
                                value={commitForm[sd.id]?.actualQuantity ?? ""}
                                onChange={(e) => setCommitForm({
                                  ...commitForm,
                                  [sd.id]: { ...commitForm[sd.id], actualQuantity: e.target.value }
                                })}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                className="w-full px-2 py-1.5 border border-slate-300 rounded focus:ring-primary focus:border-primary text-sm bg-white"
                                value={commitForm[sd.id]?.itemId ?? ""}
                                onChange={(e) => setCommitForm({
                                  ...commitForm,
                                  [sd.id]: { ...commitForm[sd.id], itemId: e.target.value }
                                })}
                              >
                                <option value="">Select Item...</option>
                                {inventoryItems.map(item => (
                                  <option key={item.id} value={item.id}>{item.code} - {item.name}</option>
                                ))}
                              </select>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Bar */}
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
                      className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      {submitting ? "Committing..." : "Commit to Inventory"}
                    </button>
                  </div>
                ) : (
                  canCreate && (
                    <button
                      onClick={() => handleOpenCommit(entry)}
                      className="px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 shadow-sm transition-colors flex items-center gap-2"
                    >
                      Verify & Receive <ArrowRight className="h-4 w-4" />
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
