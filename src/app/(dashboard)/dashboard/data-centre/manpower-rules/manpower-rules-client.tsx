"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";

type ManpowerRules = {
  loomsPerOperator: number;
  printingHelpersPerOperator: number;
};

export function ManpowerRulesClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ManpowerRules>({
    loomsPerOperator: 4,
    printingHelpersPerOperator: 2,
  });

  useEffect(() => {
    fetch("/api/production/manpower-rules")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setForm(data);
      })
      .catch(() => toast.error("Failed to load manpower rules"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/production/manpower-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setForm(data);
      toast.success("Manpower rules updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading manpower rules...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-primary">
          <Users className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Data Centre</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Production Manpower Rules
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Configure loom operator limits and printing helper requirements. Rules are enforced at
          assignment time; supervisors with Production update access can override.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="max-w-xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">Looms per operator (LOOMS_PER_OPERATOR)</span>
          <input
            type="number"
            min={1}
            max={20}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3"
            value={form.loomsPerOperator}
            onChange={(e) =>
              setForm({ ...form, loomsPerOperator: Number(e.target.value) || 1 })
            }
            required
          />
          <span className="text-xs text-muted-foreground">
            Maximum looms one operator may be assigned per shift (PRD default: 3–4).
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-slate-700">
            Printing helpers per operator (PRINTING_HELPERS_PER_OPERATOR)
          </span>
          <input
            type="number"
            min={0}
            max={10}
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3"
            value={form.printingHelpersPerOperator}
            onChange={(e) =>
              setForm({ ...form, printingHelpersPerOperator: Number(e.target.value) || 0 })
            }
            required
          />
          <span className="text-xs text-muted-foreground">
            Required helpers per printing machine operator (PRD default: 2).
          </span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save rules
        </button>
      </form>
    </div>
  );
}
