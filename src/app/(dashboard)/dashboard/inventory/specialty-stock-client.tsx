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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
          <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          No items in this stock category yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
      )}

      <Link href="/dashboard/inventory/items" className="text-sm text-primary hover:underline">
        View all inventory items →
      </Link>
    </div>
  );
}
