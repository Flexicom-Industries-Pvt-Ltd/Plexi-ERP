"use client";

import { useEffect, useState } from "react";
import { Factory, ClipboardList, Settings2, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ProductionDashboardClient() {
  const [stats, setStats] = useState({ total: 0, draft: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/production/plans")
      .then((r) => r.ok ? r.json() : [])
      .then((plans: { status: string }[]) => {
        setStats({
          total: plans.length,
          draft: plans.filter((p) => p.status === "DRAFT").length,
          inProgress: plans.filter((p) => p.status === "IN_PROGRESS").length,
          completed: plans.filter((p) => p.status === "COMPLETED").length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/production/plans"
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700"
        >
          Shift Plans
        </Link>
        <Link
          href="/dashboard/production/handovers"
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700"
        >
          Shift Handover
        </Link>
        <Link
          href="/dashboard/data-centre/production-characteristics"
          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700"
        >
          Phase Characteristics
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Plans", value: stats.total, icon: ClipboardList, bg: "bg-blue-100", text: "text-blue-600" },
          { label: "Draft", value: stats.draft, icon: Factory, bg: "bg-slate-100", text: "text-slate-600" },
          { label: "In Progress", value: stats.inProgress, icon: Settings2, bg: "bg-amber-100", text: "text-amber-600" },
          { label: "Completed", value: stats.completed, icon: Factory, bg: "bg-emerald-100", text: "text-emerald-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 ${card.bg} ${card.text} rounded-xl flex items-center justify-center`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {loading ? "—" : card.value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Factory className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Production Planning</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Create shift plans with phase-specific characteristics. Operators receive exact roll specs, colours, grades, and customer requirements from approved plans.
        </p>
        <Link
          href="/dashboard/production/plans"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          View Shift Plans <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
