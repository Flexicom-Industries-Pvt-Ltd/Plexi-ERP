"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Activity, Filter, FileText, Package } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export function TransactionsClient() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [itemFilter, setItemFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/inventory/transactions", window.location.origin);
      if (typeFilter) url.searchParams.set("type", typeFilter);
      if (itemFilter) url.searchParams.set("itemId", itemFilter);

      const [resTx, resItems] = await Promise.all([
        fetch(url).then(r => r.json()),
        fetch("/api/inventory/items").then(r => r.json()),
      ]);

      setTransactions(Array.isArray(resTx) ? resTx : []);
      setItems(Array.isArray(resItems) ? resItems : []);
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, itemFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filters Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between">
        <div className="flex flex-col sm:flex-row flex-1 gap-2.5 sm:gap-4">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs sm:text-sm bg-white"
            >
              <option value="">All Inventory Items</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.code} - {i.name}</option>
              ))}
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="">All Movement Types</option>
            <option value="IN">Stock IN (+)</option>
            <option value="OUT">Stock OUT (-)</option>
            <option value="ADJUSTMENT">Adjustments</option>
          </select>
        </div>
      </div>

      {/* Main Container: Desktop Table & Mobile Cards */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Mobile View (Cards) */}
        <div className="block md:hidden divide-y divide-slate-100 p-2 sm:p-3 space-y-2.5">
          {loading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse flex flex-col items-center">
              <Activity className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Loading ledger records...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs font-medium">
              No transactions found for the selected filters.
            </div>
          ) : (
            transactions.map((tx) => {
              const isPositive = tx.type === "IN" || (tx.type === "ADJUSTMENT" && tx.quantity > 0);

              return (
                <div key={tx.id} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                        tx.type === "IN"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : tx.type === "OUT"
                          ? "bg-blue-100 text-blue-800 border-blue-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}
                    >
                      {tx.type === "IN" ? (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      ) : tx.type === "OUT" ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                      <span>{tx.type}</span>
                    </span>

                    <span className="text-[11px] text-slate-400 font-medium">
                      {format(new Date(tx.createdAt), "dd MMM, HH:mm")}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-slate-900 text-sm block truncate">
                        {tx.item.code}
                      </span>
                      <span className="text-xs text-slate-600 block truncate mt-0.5">
                        {tx.item.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-black text-base block ${isPositive ? "text-emerald-600" : "text-slate-900"}`}>
                        {isPositive ? "+" : ""}
                        {tx.quantity} {tx.item.uom?.abbreviation}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <div>
                      {tx.referenceType === "GATE_ENTRY" ? (
                        <Link
                          href={`/dashboard/gate/${tx.gateEntryNumber ?? tx.referenceId}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-xs"
                        >
                          <FileText className="h-3.5 w-3.5" /> {tx.remarks || "Gate Entry"}
                        </Link>
                      ) : (
                        <span className="text-slate-600 text-xs">{tx.remarks || "—"}</span>
                      )}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      By {tx.user?.name || "System"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View (Table - 100% Intact) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date & Time</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Item Code & Name</th>
                <th className="px-4 py-3 font-medium text-right">Quantity</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <Activity className="h-8 w-8 text-slate-300 mb-2" />
                      <p>Loading ledger...</p>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.type === "IN" || (tx.type === "ADJUSTMENT" && tx.quantity > 0);
                  
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">
                          {format(new Date(tx.createdAt), "dd MMM yyyy")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {format(new Date(tx.createdAt), "HH:mm:ss")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          tx.type === "IN" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                          tx.type === "OUT" ? "bg-blue-100 text-blue-700 border-blue-200" :
                          "bg-amber-100 text-amber-700 border-amber-200"
                        }`}>
                          {tx.type === "IN" ? <ArrowDownRight className="h-3 w-3" /> :
                           tx.type === "OUT" ? <ArrowUpRight className="h-3 w-3" /> :
                           <Activity className="h-3 w-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{tx.item.code}</div>
                        <div className="text-xs text-slate-500">{tx.item.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`font-bold text-base ${isPositive ? "text-emerald-600" : "text-slate-800"}`}>
                          {isPositive ? "+" : ""}{tx.quantity} <span className="text-xs font-medium text-slate-500">{tx.item.uom?.abbreviation}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tx.referenceType === "GATE_ENTRY" ? (
                          <Link href={`/dashboard/gate/${tx.gateEntryNumber ?? tx.referenceId}`} className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs">
                            <FileText className="h-3.5 w-3.5" /> {tx.remarks || "Gate Entry"}
                          </Link>
                        ) : (
                          <span className="text-slate-600 text-xs">{tx.remarks || "—"}</span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">{tx.referenceType?.replace(/_/g, " ")}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 font-medium text-xs">{tx.user?.name || "System"}</div>
                        {tx.user?.employeeId && (
                          <div className="text-[10px] text-slate-500">{tx.user.employeeId}</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
