"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Edit2, Trash2, X } from "lucide-react";
import { PRODUCTION_PHASES, CHARACTERISTIC_FIELD_TYPES, phaseLabel } from "@/lib/production/phases";

interface Definition {
  id: string;
  phase: string;
  key: string;
  label: string;
  fieldType: string;
  options: { label: string; value: string }[] | null;
  required: boolean;
  sortOrder: number;
  isActive: boolean;
}

const emptyForm = () => ({
  phase: "LOOM",
  key: "",
  label: "",
  fieldType: "TEXT",
  options: "",
  required: false,
  sortOrder: 0,
  isActive: true,
});

export function CharacteristicDefinitionsClient() {
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Definition | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      const url = phaseFilter
        ? `/api/production/characteristics/definitions?phase=${phaseFilter}&activeOnly=false`
        : "/api/production/characteristics/definitions?activeOnly=false";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load");
      setDefinitions(await res.json());
    } catch {
      toast.error("Failed to load characteristic definitions");
    } finally {
      setLoading(false);
    }
  }, [phaseFilter]);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), phase: phaseFilter || "LOOM" });
    setShowForm(true);
  };

  const openEdit = (def: Definition) => {
    setEditing(def);
    setForm({
      phase: def.phase,
      key: def.key,
      label: def.label,
      fieldType: def.fieldType,
      options: def.options ? JSON.stringify(def.options, null, 2) : "",
      required: def.required,
      sortOrder: def.sortOrder,
      isActive: def.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let options = null;
      if (form.fieldType === "SELECT" && form.options.trim()) {
        options = JSON.parse(form.options);
      }

      const payload = editing
        ? { label: form.label, fieldType: form.fieldType, options, required: form.required, sortOrder: form.sortOrder, isActive: form.isActive }
        : { phase: form.phase, key: form.key, label: form.label, fieldType: form.fieldType, options, required: form.required, sortOrder: form.sortOrder, isActive: form.isActive };

      const res = await fetch(
        editing
          ? `/api/production/characteristics/definitions/${editing.id}`
          : "/api/production/characteristics/definitions",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }

      toast.success(editing ? "Definition updated" : "Definition created");
      setShowForm(false);
      fetchDefinitions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/production/characteristics/definitions/${deletingId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success("Definition deleted");
      setDeletingId(null);
      fetchDefinitions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
        >
          <option value="">All Phases</option>
          {PRODUCTION_PHASES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Definition
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Phase</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Key</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Label</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Required</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Order</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Active</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {definitions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No definitions found. Add defaults or create new ones.
                  </td>
                </tr>
              ) : definitions.map((def) => (
                <tr key={def.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{phaseLabel(def.phase)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{def.key}</td>
                  <td className="px-4 py-3">{def.label}</td>
                  <td className="px-4 py-3">{def.fieldType}</td>
                  <td className="px-4 py-3">{def.required ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{def.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${def.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {def.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(def)} className="p-1 text-slate-400 hover:text-primary"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => setDeletingId(def.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">{editing ? "Edit Definition" : "New Definition"}</h3>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phase *</label>
                    <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} required>
                      {PRODUCTION_PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Key * (snake_case)</label>
                    <input className="w-full px-3 py-2 border rounded-lg text-sm font-mono" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required pattern="^[a-z][a-z0-9_]*$" placeholder="e.g. roll_colour" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Label *</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Field Type *</label>
                <select className="w-full px-3 py-2 border rounded-lg text-sm" value={form.fieldType} onChange={(e) => setForm({ ...form, fieldType: e.target.value })}>
                  {CHARACTERISTIC_FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {form.fieldType === "SELECT" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Options (JSON array)</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg text-sm font-mono" rows={4} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder='[{"label":"Red","value":"red"}]' />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sort Order</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-end gap-4 pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
                    Required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50">
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold mb-2">Delete Definition?</h3>
            <p className="text-sm text-slate-500 mb-4">This cannot be undone. Definitions in use cannot be deleted.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
