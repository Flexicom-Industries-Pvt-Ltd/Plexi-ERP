"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Package, AlertTriangle, ArrowRight, ArrowDownRight, ArrowUpRight, Activity, Clock, MapPin, Layers } from "lucide-react";
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
    } catch (err) {
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
        <p>Loading inventory metrics...</p>
      </div>
    );
  }

  const { stats, lowStockItems, recentTransactions } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/inventory/items" className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700">All Items</Link>
        <Link href="/dashboard/inventory/bobbins" className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700">Bobbin Stock</Link>
        <Link href="/dashboard/inventory/rolls" className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700">Roll Stock</Link>
        <Link href="/dashboard/inventory/transactions" className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700">Ledger</Link>
        <Link href="/dashboard/inventory/gate-receipts" className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700">Gate Receipts</Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Tracked Items</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.totalItems}</h3>
            </div>
          </div>
          <Link href="/dashboard/inventory/items" className="mt-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            Manage Items <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stats.lowStockCount > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.lowStockCount}</h3>
            </div>
          </div>
          <Link href="/dashboard/inventory/items" className="mt-4 flex items-center text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
            View Low Stock <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stats.pendingReceipts > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"}`}>
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pending Gate Receipts</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.pendingReceipts}</h3>
            </div>
          </div>
          <Link href="/dashboard/inventory/gate-receipts" className="mt-4 flex items-center text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors">
            Review Queue <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Items Below Minimum Stock
            </h2>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            {lowStockItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p>No low stock alerts. All inventory levels are healthy.</p>
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
                        <span className="font-bold text-red-600">{item.currentStock}</span> <span className="text-xs text-slate-400">{item.uom?.abbreviation}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 font-medium">
                        {item.minimumStock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" /> Recent Movements
            </h2>
            <Link href="/dashboard/inventory/transactions" className="text-sm font-medium text-blue-600 hover:underline">
              View Ledger
            </Link>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            {recentTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p>No recent transactions.</p>
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
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${isPositive ? "text-emerald-600" : "text-slate-800"}`}>
                            {isPositive ? "+" : ""}{tx.quantity}
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-500" /> Stock by Location
            </h2>
          </div>
          <div className="p-0 max-h-[360px] overflow-y-auto">
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
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Layers className="h-5 w-5 text-violet-500" /> Active Batches / Lots
            </h2>
          </div>
          <div className="p-0 max-h-[360px] overflow-y-auto">
            {batches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No batch records yet. Batches are created when gate receipts are committed.</div>
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
        </div>
      </div>
    </div>
  );
}
