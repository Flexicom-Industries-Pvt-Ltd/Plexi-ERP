"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Package,
  AlertTriangle,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  Clock,
  MapPin,
  Layers,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export function InventoryDashboardClient() {
  const [data, setData] = useState<any>(null);
  const [locationStock, setLocationStock] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, locRes, batchRes] = await Promise.all([
        fetch("/api/inventory/dashboard"),
        fetch("/api/inventory/by-location"),
        fetch("/api/inventory/batches"),
      ]);
      if (!dashRes.ok) throw new Error("Failed to load dashboard");
      setData(await dashRes.json());
      if (locRes.ok) setLocationStock(await locRes.json());
      if (batchRes.ok) setBatches(await batchRes.json());
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Package className="h-10 w-10 animate-pulse mb-4" />
        <p className="font-medium text-sm">Loading inventory metrics...</p>
      </div>
    );
  }

  const { stats, lowStockItems, recentTransactions } = data;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick Navigation Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs sm:text-sm">
        <Link
          href="/dashboard/inventory/items"
          className="font-bold px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-primary/40 text-slate-700 shadow-xs whitespace-nowrap active:bg-slate-50"
        >
          All Items
        </Link>
        <Link
          href="/dashboard/inventory/bobbins"
          className="font-bold px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-primary/40 text-slate-700 shadow-xs whitespace-nowrap active:bg-slate-50"
        >
          Bobbin Stock
        </Link>
        <Link
          href="/dashboard/inventory/rolls"
          className="font-bold px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-primary/40 text-slate-700 shadow-xs whitespace-nowrap active:bg-slate-50"
        >
          Roll Stock
        </Link>
        <Link
          href="/dashboard/inventory/transactions"
          className="font-bold px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-primary/40 text-slate-700 shadow-xs whitespace-nowrap active:bg-slate-50"
        >
          Ledger
        </Link>
        <Link
          href="/dashboard/inventory/gate-receipts"
          className="font-bold px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary shadow-xs whitespace-nowrap active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Gate Receipts</span>
          {stats.pendingReceipts > 0 && (
            <span className="h-5 min-w-[20px] px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
              {stats.pendingReceipts}
            </span>
          )}
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 sm:h-12 sm:w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Tracked Items</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{stats.totalItems}</h3>
            </div>
          </div>
          <Link
            href="/dashboard/inventory/items"
            className="mt-4 flex items-center text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors pt-2 border-t border-slate-100"
          >
            Manage Items <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 ${
                stats.lowStockCount > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {stats.lowStockCount > 0 ? (
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
              ) : (
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Low Stock Alerts</p>
              <h3 className={`text-xl sm:text-2xl font-black mt-0.5 ${stats.lowStockCount > 0 ? "text-red-600" : "text-slate-800"}`}>
                {stats.lowStockCount}
              </h3>
            </div>
          </div>
          <Link
            href="/dashboard/inventory/items"
            className={`mt-4 flex items-center text-xs sm:text-sm font-bold pt-2 border-t border-slate-100 transition-colors ${
              stats.lowStockCount > 0 ? "text-red-600 hover:text-red-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            View Low Stock <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col justify-between sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-3.5">
            <div
              className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0 ${
                stats.pendingReceipts > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"
              }`}
            >
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Gate Receipts</p>
              <h3 className={`text-xl sm:text-2xl font-black mt-0.5 ${stats.pendingReceipts > 0 ? "text-amber-600" : "text-slate-800"}`}>
                {stats.pendingReceipts}
              </h3>
            </div>
          </div>
          <Link
            href="/dashboard/inventory/gate-receipts"
            className="mt-4 flex items-center text-xs sm:text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors pt-2 border-t border-slate-100"
          >
            Review Queue <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      </div>

      {/* Low Stock & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Low Stock Items Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Items Below Minimum Stock
            </h2>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
              {lowStockItems.length} items
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block p-0 overflow-y-auto max-h-[400px]">
            {lowStockItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p className="font-medium text-sm">No low stock alerts. All inventory levels are healthy.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium text-right">Current Stock</th>
                    <th className="px-4 py-3 font-medium text-right">Min Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockItems.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.code}</div>
                        <div className="text-xs text-slate-500">{item.name}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-red-600">{item.currentStock}</span>{" "}
                        <span className="text-xs text-slate-400">{item.uom?.abbreviation}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 font-medium">{item.minimumStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden divide-y divide-slate-100 p-2 overflow-y-auto max-h-[360px]">
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-medium">
                No low stock alerts. All inventory levels are healthy.
              </div>
            ) : (
              lowStockItems.map((item: any) => (
                <div key={item.id} className="p-3 bg-red-50/30 rounded-lg mb-2 border border-red-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-slate-900 text-xs block truncate">{item.code}</span>
                    <span className="text-[11px] text-slate-600 block truncate">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-sm text-red-600 block">
                      {item.currentStock} {item.uom?.abbreviation}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Min: {item.minimumStock}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Movements Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" /> Recent Movements
            </h2>
            <Link href="/dashboard/inventory/transactions" className="text-xs font-bold text-blue-600 hover:underline">
              View Ledger
            </Link>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block p-0 overflow-y-auto max-h-[400px]">
            {recentTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p className="font-medium text-sm">No recent transactions.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium text-right">Quantity</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTransactions.map((tx: any) => {
                    const isPositive = tx.type === "IN" || (tx.type === "ADJUSTMENT" && tx.quantity > 0);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              tx.type === "IN"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : tx.type === "OUT"
                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}
                          >
                            {tx.type === "IN" ? (
                              <ArrowDownRight className="h-3 w-3" />
                            ) : tx.type === "OUT" ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <Activity className="h-3 w-3" />
                            )}
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{tx.item.code}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${isPositive ? "text-emerald-600" : "text-slate-800"}`}>
                            {isPositive ? "+" : ""}
                            {tx.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {format(new Date(tx.createdAt), "dd MMM, HH:mm")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden divide-y divide-slate-100 p-2 overflow-y-auto max-h-[360px]">
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-medium">No recent transactions.</div>
            ) : (
              recentTransactions.map((tx: any) => {
                const isPositive = tx.type === "IN" || (tx.type === "ADJUSTMENT" && tx.quantity > 0);
                return (
                  <div key={tx.id} className="p-3 bg-slate-50/70 rounded-lg mb-2 border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span
                        className={`inline-flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold shrink-0 border ${
                          tx.type === "IN"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : tx.type === "OUT"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}
                      >
                        {tx.type === "IN" ? (
                          <ArrowDownRight className="h-4 w-4" />
                        ) : tx.type === "OUT" ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-slate-900 text-xs block truncate">{tx.item.code}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {format(new Date(tx.createdAt), "dd MMM, HH:mm")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-black text-sm block ${isPositive ? "text-emerald-600" : "text-slate-800"}`}>
                        {isPositive ? "+" : ""}
                        {tx.quantity}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tx.type}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Stock by Location & Active Batches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Stock by Location */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" /> Stock by Location
            </h2>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block p-0 max-h-[360px] overflow-y-auto">
            {locationStock.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No location data.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-right">Items</th>
                    <th className="px-4 py-3 text-right">Total Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locationStock.map((group) => (
                    <tr key={group.locationId || "unassigned"} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{group.locationName}</div>
                        <div className="text-xs text-slate-500">{group.locationCode}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{group.itemCount}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">{group.totalStock.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden divide-y divide-slate-100 p-2 overflow-y-auto max-h-[300px]">
            {locationStock.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No location data.</div>
            ) : (
              locationStock.map((group) => (
                <div key={group.locationId || "unassigned"} className="p-3 bg-slate-50/70 rounded-lg mb-2 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">{group.locationName}</span>
                    <span className="text-[10px] text-slate-500 block font-mono">{group.locationCode || "Unassigned"}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-slate-800 block">{group.totalStock.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 block">{group.itemCount} items</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Batches */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-500" /> Active Batches / Lots
            </h2>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block p-0 max-h-[360px] overflow-y-auto">
            {batches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No batch records yet. Batches are created when gate receipts are committed.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Batch / Lot</th>
                    <th className="px-4 py-3 text-left">Item</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.slice(0, 20).map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{batch.batchLot}</td>
                      <td className="px-4 py-3 text-slate-600">{batch.item?.code}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {batch.quantity} {batch.item?.uom?.abbreviation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden divide-y divide-slate-100 p-2 overflow-y-auto max-h-[300px]">
            {batches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No active batches recorded.</div>
            ) : (
              batches.slice(0, 20).map((batch) => (
                <div key={batch.id} className="p-3 bg-slate-50/70 rounded-lg mb-2 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-slate-800 text-xs block">{batch.batchLot}</span>
                    <span className="text-[10px] text-slate-500 block">{batch.item?.code}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-emerald-600 block">
                      {batch.quantity} {batch.item?.uom?.abbreviation}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
