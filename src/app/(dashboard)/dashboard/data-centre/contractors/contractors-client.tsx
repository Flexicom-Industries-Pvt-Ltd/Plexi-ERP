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
} from "lucide-react";

export interface ContractorItem {
  id: string;
  name: string;
  code: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  section: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ContractorsClient() {
  const [contractors, setContractors] = useState<ContractorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [showInactive, setShowInactive] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<ContractorItem | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formSection, setFormSection] = useState("LOOM");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (sectionFilter !== "ALL") params.set("section", sectionFilter);
      if (showInactive) params.set("activeOnly", "false");

      const res = await fetch(`/api/data-centre/contractors?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load contractors");
      const json = await res.json();
      setContractors(json);
    } catch (err: any) {
      toast.error(err.message || "Failed to load contractors");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sectionFilter, showInactive]);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  const handleOpenCreateModal = () => {
    setEditingContractor(null);
    setFormName("");
    setFormCode("");
    setFormContactPerson("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormSection("LOOM");
    setFormNotes("");
    setFormIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (c: ContractorItem) => {
    setEditingContractor(c);
    setFormName(c.name);
    setFormCode(c.code || "");
    setFormContactPerson(c.contactPerson || "");
    setFormPhone(c.phone || "");
    setFormEmail(c.email || "");
    setFormAddress(c.address || "");
    setFormSection(c.section || "LOOM");
    setFormNotes(c.notes || "");
    setFormIsActive(c.isActive);
    setModalOpen(true);
  };

  const handleSaveContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Contractor name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim() ? formCode.trim().toUpperCase() : undefined,
        contactPerson: formContactPerson.trim() || null,
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        address: formAddress.trim() || null,
        section: formSection,
        notes: formNotes.trim() || null,
        isActive: formIsActive,
      };

      let res: Response;
      if (editingContractor) {
        res = await fetch(`/api/data-centre/contractors/${editingContractor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/data-centre/contractors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save contractor");

      toast.success(editingContractor ? "Contractor updated successfully" : "Contractor registered successfully");
      setModalOpen(false);
      fetchContractors();
    } catch (err: any) {
      toast.error(err.message || "Failed to save contractor");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate contractor "${name}"?`)) return;

    try {
      const res = await fetch(`/api/data-centre/contractors/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to deactivate contractor");

      toast.success(`Contractor "${name}" deactivated`);
      fetchContractors();
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate contractor");
    }
  };

  const filteredContractors = useMemo(() => {
    return contractors.filter((c) => {
      if (!showInactive && !c.isActive) return false;
      if (sectionFilter !== "ALL" && c.section !== "ALL" && c.section !== sectionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.section && c.section.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [contractors, showInactive, sectionFilter, searchQuery]);

  const activeCount = useMemo(() => contractors.filter((c) => c.isActive).length, [contractors]);

  return (
    <div className="space-y-6">
      {/* Top Bento Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Registered
            </span>
            <Building className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">
            {contractors.length}
          </div>
          <span className="text-[11px] text-muted-foreground">All labour and work agencies</span>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Contractors
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {activeCount}
          </div>
          <span className="text-[11px] text-muted-foreground">Available for floor allocation</span>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Circular Loom Ready
            </span>
            <Briefcase className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-2">
            {contractors.filter((c) => c.isActive && (c.section === "LOOM" || c.section === "ALL")).length}
          </div>
          <span className="text-[11px] text-muted-foreground">Assigned to loom roll cutting</span>
        </div>
      </div>

      {/* Action Controls & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by contractor name, code, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
            />
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
          >
            <option value="ALL">All Sections</option>
            <option value="LOOM">Circular Loom</option>
            <option value="TAPE_PLANT">Tape Plant</option>
            <option value="LAMINATION">Lamination</option>
            <option value="PRINTING">Printing</option>
            <option value="CUTTING">Cutting & Stitching</option>
          </select>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
            />
            Show Inactive
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchContractors()}
            className="p-2 rounded-lg border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            Add Contractor
          </button>
        </div>
      </div>

      {/* Contractors Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/70 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="p-3 text-center border-r w-12">S.No</th>
                <th className="p-3 border-r w-28">Code</th>
                <th className="p-3 border-r min-w-[200px]">Contractor / Agency Name</th>
                <th className="p-3 border-r w-32">Section</th>
                <th className="p-3 border-r min-w-[150px]">Contact Person</th>
                <th className="p-3 border-r w-32">Phone</th>
                <th className="p-3 border-r min-w-[160px]">Notes</th>
                <th className="p-3 border-r text-center w-24">Status</th>
                <th className="p-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {filteredContractors.length > 0 ? (
                filteredContractors.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-center border-r font-mono text-muted-foreground font-bold">
                      {idx + 1}
                    </td>
                    <td className="p-3 border-r font-mono font-bold text-primary">
                      {c.code || "—"}
                    </td>
                    <td className="p-3 border-r font-semibold text-foreground">
                      {c.name}
                    </td>
                    <td className="p-3 border-r">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20">
                        {c.section}
                      </span>
                    </td>
                    <td className="p-3 border-r text-muted-foreground">
                      {c.contactPerson || "—"}
                    </td>
                    <td className="p-3 border-r font-mono text-muted-foreground">
                      {c.phone || "—"}
                    </td>
                    <td className="p-3 border-r text-muted-foreground max-w-xs truncate">
                      {c.notes || "—"}
                    </td>
                    <td className="p-3 border-r text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          c.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1 rounded text-muted-foreground hover:text-sky-600 hover:bg-sky-500/10 transition-colors cursor-pointer"
                          title="Edit contractor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {c.isActive && (
                          <button
                            onClick={() => handleDeactivate(c.id, c.name)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Deactivate contractor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <Building className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">No contractors found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Register labour contractors to associate roll cuts and floor tasks.
                    </p>
                    <button
                      onClick={handleOpenCreateModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer mt-3"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Contractor
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Contractor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-card text-card-foreground rounded-xl border shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
              <div className="flex items-center gap-2.5">
                <Building className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  {editingContractor ? "Edit Contractor" : "Register New Contractor"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContractor} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  Contractor / Agency Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma Enterprise / Maa Tara"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CON-001"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full text-xs font-mono uppercase px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Section
                  </label>
                  <select
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
                  >
                    <option value="LOOM">Circular Loom</option>
                    <option value="TAPE_PLANT">Tape Plant</option>
                    <option value="LAMINATION">Lamination</option>
                    <option value="PRINTING">Printing</option>
                    <option value="CUTTING">Cutting & Stitching</option>
                    <option value="ALL">All Sections</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional operational notes..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="contractor-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                />
                <label htmlFor="contractor-active" className="text-xs font-medium text-foreground cursor-pointer">
                  Active (Available for floor entry)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingContractor ? "Update Contractor" : "Register Contractor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
