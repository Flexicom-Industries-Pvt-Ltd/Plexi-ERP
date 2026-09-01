"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Search, Activity, Filter, FileText } from "lucide-react";
import { format } from "date-fns";
import { TransactionType } from "@/generated/prisma";
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
    } catch (err) {
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, itemFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm bg-white"
            >
              <option value="">All Items</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.code} - {i.name}</option>
              ))}
            </select>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          >
            <option value="">All Types</option>
            <option value="IN">Stock IN (+)</option>
            <option value="OUT">Stock OUT (-)</option>
            <option value="ADJUSTMENT">Adjustments</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
