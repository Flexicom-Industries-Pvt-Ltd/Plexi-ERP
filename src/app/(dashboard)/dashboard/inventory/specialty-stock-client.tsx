"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Search, Package } from "lucide-react";
import Link from "next/link";

type SpecialtyStockViewProps = {
  title: string;
  description: string;
  materialTypes: string[];
};

export function SpecialtyStockView({ title, description, materialTypes }: SpecialtyStockViewProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        materialTypes.map((mt) =>
          fetch(`/api/inventory/items?materialType=${mt}&includeMovement=true`)
            .then((r) => (r.ok ? r.json() : []))
        )
      );
      const merged = results.flat();
      const unique = Array.from(new Map(merged.map((i: { id: string }) => [i.id, i])).values());
      setItems(unique);
    } catch {
      toast.error("Failed to load stock");
    } finally {
      setLoading(false);
    }
  }, [materialTypes]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = items.filter(
    (item) =>
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">{description}</p>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs font-medium">Loading stock data...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 sm:py-16 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200 p-6">
          <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-sm">No items in this stock category yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Mobile View (Cards) */}
          <div className="block md:hidden divide-y divide-slate-100 p-2 sm:p-3 space-y-2.5">
            {filtered.map((item) => (
              <div key={item.id} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-slate-900 text-sm block truncate">
                      {item.code}
                    </span>
                    <span className="text-xs text-slate-600 block truncate mt-0.5">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shrink-0">
                    {item.stock?.materialType?.replace(/_/g, " ") || "Specialty"}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500">
                  <span>Location: </span>
                  <span className="font-medium text-slate-700">{item.location?.name || "Unassigned"}</span>
                </div>

                {/* 3-Column Stock Breakdown */}
                <div className="grid grid-cols-3 gap-1.5 p-2 bg-white rounded-lg border border-slate-200/80 text-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Available</span>
                    <span className="text-sm font-black text-emerald-600 block">
                      {item.movementSummary?.available ?? item.currentStock}
                    </span>
                    <span className="text-[9px] text-slate-400 block">{item.uom?.abbreviation}</span>
                  </div>
                  <div className="border-x border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Reserved</span>
                    <span className="text-sm font-black text-amber-600 block">
                      {item.movementSummary?.reserved ?? item.reservedStock ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block">{item.uom?.abbreviation}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Consumed</span>
                    <span className="text-sm font-black text-slate-700 block">
                      {item.movementSummary?.consumed ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block">{item.uom?.abbreviation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View (Table - 100% Intact) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Material Type</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-right">Available</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right">Consumed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{item.code}</div>
                      <div className="text-xs text-slate-500">{item.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.stock?.materialType?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.location?.name || "Unassigned"}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      {item.movementSummary?.available ?? item.currentStock} {item.uom?.abbreviation}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600">
                      {item.movementSummary?.reserved ?? item.reservedStock ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.movementSummary?.consumed ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <Link href="/dashboard/inventory/items" className="text-xs sm:text-sm text-primary font-bold hover:underline inline-flex items-center gap-1">
          <span>View all inventory items</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
