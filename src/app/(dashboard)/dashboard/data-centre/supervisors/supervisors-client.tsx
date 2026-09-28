"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Building,
  SlidersHorizontal,
  X,
  Plus,
  Briefcase,
  FileText,
  Clock,
  Shield,
} from "lucide-react";

export interface SupervisorItem {
  id: string;
  name: string;
  code: string | null;
  department: string;
  phone: string | null;
  email: string | null;
  shiftPreference: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEPARTMENTS = [
  { value: "ALL", label: "All Departments" },
  { value: "LOOM", label: "Loom Section" },
  { value: "TAPE_PLANT", label: "Tape Plant" },
  { value: "LAMINATION", label: "Lamination" },
  { value: "PRINTING", label: "Printing" },
  { value: "CUTTING", label: "Cutting" },
  { value: "FINISHING", label: "Finishing & Baling" },
  { value: "RECYCLING", label: "Recycling" },
  { value: "QUALITY_CONTROL", label: "Quality Control" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

const SHIFTS = [
  { value: "ALL", label: "Any Shift / Rotating" },
  { value: "Day Shift", label: "Day Shift (08:00 - 20:00)" },
  { value: "Night Shift", label: "Night Shift (20:00 - 08:00)" },
  { value: "Shift A", label: "Shift A" },
  { value: "Shift B", label: "Shift B" },
  { value: "General Shift", label: "General Shift" },
];

export function SupervisorsClient() {
  const [supervisors, setSupervisors] = useState<SupervisorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [showInactive, setShowInactive] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<SupervisorItem | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDepartment, setFormDepartment] = useState("LOOM");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formShiftPreference, setFormShiftPreference] = useState("ALL");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchSupervisors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (deptFilter !== "ALL") params.set("department", deptFilter);
      if (showInactive) params.set("activeOnly", "false");

      const res = await fetch(`/api/data-centre/supervisors?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load supervisors");
      const json = await res.json();
      setSupervisors(json);
    } catch (err: any) {
      toast.error(err.message || "Failed to load supervisors");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, deptFilter, showInactive]);

  useEffect(() => {
    fetchSupervisors();
  }, [fetchSupervisors]);

  const handleOpenCreateModal = () => {
    setEditingSupervisor(null);
    setFormName("");
    setFormCode("");
    setFormDepartment("LOOM");
    setFormPhone("");
    setFormEmail("");
    setFormShiftPreference("ALL");
    setFormNotes("");
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (sup: SupervisorItem) => {
    setEditingSupervisor(sup);
    setFormName(sup.name);
    setFormCode(sup.code || "");
    setFormDepartment(sup.department || "LOOM");
    setFormPhone(sup.phone || "");
    setFormEmail(sup.email || "");
    setFormShiftPreference(sup.shiftPreference || "ALL");
    setFormNotes(sup.notes || "");
    setFormIsActive(sup.isActive);
    setModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Supervisor name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim() || undefined,
        department: formDepartment,
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        shiftPreference: formShiftPreference || null,
        notes: formNotes.trim() || null,
        isActive: formIsActive,
      };

      if (editingSupervisor) {
        const res = await fetch(`/api/data-centre/supervisors/${editingSupervisor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update supervisor");
        toast.success(`Supervisor '${formName}' updated successfully`);
      } else {
        const res = await fetch("/api/data-centre/supervisors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create supervisor");
        toast.success(`Supervisor '${formName}' created successfully`);
      }

      setModalOpen(false);
      fetchSupervisors();
    } catch (err: any) {
      toast.error(err.message || "Failed to save supervisor");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (sup: SupervisorItem) => {
    try {
      const res = await fetch(`/api/data-centre/supervisors/${sup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !sup.isActive }),
      });
      if (!res.ok) throw new Error("Failed to change status");
      toast.success(
        `Supervisor '${sup.name}' marked as ${!sup.isActive ? "Active" : "Inactive"}`
      );
      fetchSupervisors();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleDelete = async (sup: SupervisorItem) => {
    if (
      !window.confirm(
        `Are you sure you want to delete supervisor "${sup.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/data-centre/supervisors/${sup.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete supervisor");
      }
      toast.success(`Supervisor '${sup.name}' deleted successfully`);
      fetchSupervisors();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete supervisor");
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = supervisors.length;
    const active = supervisors.filter((s) => s.isActive).length;
    const loom = supervisors.filter((s) => s.department === "LOOM" || s.department === "ALL").length;
    const inactive = total - active;
    return { total, active, loom, inactive };
  }, [supervisors]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Supervisors
            </span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">{kpis.total}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Master records</div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Active In-Charge
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {kpis.active}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Available for floor sheets</div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Loom Department
            </span>
            <Shield className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-2">
            {kpis.loom}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Loom & plant supervisors</div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Inactive
            </span>
            <XCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            {kpis.inactive}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Archived / disabled</div>
        </div>
      </div>

      {/* Action & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card shadow-xs">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, code, phone, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border text-primary focus:ring-primary/20 cursor-pointer"
            />
            Show Inactive
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchSupervisors()}
            disabled={loading}
            title="Refresh List"
            className="p-2 text-xs font-semibold rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Supervisor
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/50 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-28">Code</th>
                <th className="py-3 px-4">Supervisor Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Shift Preference</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading supervisors...
                  </td>
                </tr>
              ) : supervisors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No supervisors found matching criteria.
                  </td>
                </tr>
              ) : (
                supervisors.map((sup) => (
                  <tr key={sup.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      <span className="px-2 py-0.5 rounded bg-muted text-foreground border text-[11px]">
                        {sup.code || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {sup.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{sup.name}</div>
                          {sup.notes && (
                            <div className="text-[10px] text-muted-foreground font-normal line-clamp-1">
                              {sup.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        {sup.department}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-medium">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{sup.shiftPreference || "Any Shift"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      <div className="space-y-0.5">
                        {sup.phone ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {sup.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                        {sup.email && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate max-w-[160px]">
                            <Mail className="w-3 h-3" />
                            {sup.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(sup)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer transition-colors ${
                          sup.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            sup.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                          }`}
                        />
                        {sup.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(sup)}
                          title="Edit Supervisor"
                          className="p-1.5 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sup)}
                          title="Delete Supervisor"
                          className="p-1.5 rounded-lg border bg-background hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border bg-card shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {editingSupervisor ? "Edit Supervisor" : "Add New Supervisor"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Floor supervisor master record for shift attribution and sign-off.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Supervisor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ravinder Kumar"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Code <span className="text-muted-foreground font-normal">(Auto if blank)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SUP-001"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Department
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
                  >
                    {DEPARTMENTS.filter((d) => d.value !== "ALL").map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                    <option value="ALL">All Departments</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Shift Preference
                  </label>
                  <select
                    value={formShiftPreference}
                    onChange={(e) => setFormShiftPreference(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
                  >
                    {SHIFTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Email Address <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. supervisor@flexicom.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Remarks / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional notes, qualifications, or shift responsibilities..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveSupervisor"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border text-primary focus:ring-primary/20 cursor-pointer"
                  />
                  <label htmlFor="isActiveSupervisor" className="text-xs font-medium text-foreground cursor-pointer">
                    Active Supervisor (Available for floor sheets and attribution)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingSupervisor ? "Save Changes" : "Create Supervisor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
