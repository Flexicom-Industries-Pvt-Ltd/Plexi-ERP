"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, Loader2, ScrollText, Search } from "lucide-react";

type ProductionRoll = {
  id: string;
  rollNumber: string;
  rollType: string;
  weight: number | null;
  length: number | null;
  batchLot: string | null;
  qualityStatus: string;
  sourcePhase: string;
  createdAt: string;
  location?: { name: string; code: string } | null;
  inventoryItem?: { code: string; name: string } | null;
  loomProductionRun?: {
    loomMachine: { name: string };
    operator: { name: string };
  } | null;
  productionRun?: {
    planLine: {
      plan: { planNumber: string; planDate: string };
    };
  } | null;
};

const qualityStyles: Record<string, string> = {
  PENDING_QC: "bg-amber-100 text-amber-800 border-amber-200",
  PASSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  REWORK: "bg-orange-100 text-orange-800 border-orange-200",
  ON_HOLD: "bg-slate-100 text-slate-700 border-slate-200",
};

const rollTypeStyles: Record<string, string> = {
  PP: "bg-sky-100 text-sky-800 border-sky-200",
  LPP: "bg-violet-100 text-violet-800 border-violet-200",
};

function statusLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function RollsClient() {
  const [rolls, setRolls] = useState<ProductionRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRollType, setFilterRollType] = useState("");
  const [filterQuality, setFilterQuality] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (filterRollType) params.set("rollType", filterRollType);
    if (filterQuality) params.set("qualityStatus", filterQuality);
    if (filterSource) params.set("sourcePhase", filterSource);
    if (search) params.set("search", search);
    if (filterDate) {
      params.set("dateFrom", filterDate);
      params.set("dateTo", filterDate);
    }
    const qs = params.toString();
    return `/api/production/rolls${qs ? `?${qs}` : ""}`;
  }, [filterRollType, filterQuality, filterSource, filterDate, search]);

  const fetchRolls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildQuery());
      if (!res.ok) throw new Error("Failed to load rolls");
      setRolls(await res.json());
    } catch {
      toast.error("Failed to load production rolls");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchRolls();
  }, [fetchRolls]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <ScrollText className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Production</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Roll Stock</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          PP and LPP roll output catalog with quality status, batch traceability, and loom run linkage.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-black/5 md:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm"
            placeholder="Search roll number, batch, item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          value={filterRollType}
          onChange={(e) => setFilterRollType(e.target.value)}
        >
          <option value="">All types</option>
          <option value="PP">PP</option>
          <option value="LPP">LPP</option>
        </select>
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
          className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Loading rolls...
          </div>
        ) : rolls.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No production rolls found. Rolls are created when loom runs are completed with roll output.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Roll #</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Weight / Length</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Quality</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {rolls.map((roll) => (
                  <tr key={roll.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-medium text-slate-900">{roll.rollNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${rollTypeStyles[roll.rollType] ?? ""}`}>
                        {roll.rollType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {roll.weight != null ? `${roll.weight} kg` : "—"}
                      {roll.length != null ? ` · ${roll.length} m` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{roll.batchLot || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${qualityStyles[roll.qualityStatus] ?? ""}`}>
                        {statusLabel(roll.qualityStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {roll.productionRun?.planLine.plan.planNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {format(new Date(roll.createdAt), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/production/rolls/${roll.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-primary hover:bg-primary/10"
                      >
                        <Eye className="size-4" />
                        View
                      </Link>
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
