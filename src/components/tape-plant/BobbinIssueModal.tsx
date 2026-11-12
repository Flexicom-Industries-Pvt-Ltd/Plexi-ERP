"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  X,
  Package,
  Boxes,
  Scale,
  Calendar,
  Clock,
  Printer,
  AlertTriangle,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import {
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
} from "@/lib/tape-plant/bobbin-stock";
import { BobbinIssueSlipData, LoomAllocationItem } from "@/lib/tape-plant/print-bobbin-issue-slip";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";

interface StockQualityOption {
  recipeQuality: string;
  availableCrates: number;
  availableBobbins: number;
  availableKg: number;
}

interface BobbinIssueModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (issueData: BobbinIssueSlipData) => void;
  defaultDate?: string;
  defaultShiftId?: string;
  defaultRecipeQuality?: string;
  availableStock?: StockQualityOption[];
}

interface LoomRowItem {
  id: string;
  loomNumber: string;
  customLoom: string;
  crateCount: string;
}

export function BobbinIssueModal({
  open,
  onClose,
  onSuccess,
  defaultDate,
  defaultShiftId,
  defaultRecipeQuality,
  availableStock = [],
}: BobbinIssueModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(() => defaultDate || new Date().toISOString().slice(0, 10));
  const [shiftId, setShiftId] = useState(() => defaultShiftId || "shift_day");
  const [shifts, setShifts] = useState<{ id: string; name: string }[]>([]);

  const [recipeQuality, setRecipeQuality] = useState(() => defaultRecipeQuality || "");
  const [loomRows, setLoomRows] = useState<LoomRowItem[]>([
    { id: "loom-1", loomNumber: "", customLoom: "", crateCount: "1" },
  ]);

  const [issuedBy, setIssuedBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [remarks, setRemarks] = useState("");

  // Sync defaultRecipeQuality when modal opens
  useEffect(() => {
    if (open && defaultRecipeQuality) {
      setRecipeQuality(defaultRecipeQuality);
    }
  }, [open, defaultRecipeQuality]);

  // Reset rows when modal opens if empty
  useEffect(() => {
    if (open && loomRows.length === 0) {
      setLoomRows([{ id: "loom-1", loomNumber: "", customLoom: "", crateCount: "1" }]);
    }
  }, [open, loomRows.length]);

  // Fetch available shifts
  useEffect(() => {
    fetch("/api/settings/master-data/shift")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setShifts(data);
          if (!shiftId) setShiftId(data[0].id);
        } else {
          setShifts([
            { id: "shift_day", name: "Day Shift (08:00 - 20:00)" },
            { id: "shift_night", name: "Night Shift (20:00 - 08:00)" },
            { id: "shift-a", name: "Shift A (06:00 - 14:00)" },
            { id: "shift-b", name: "Shift B (14:00 - 22:00)" },
            { id: "shift-c", name: "Shift C (22:00 - 06:00)" },
          ]);
        }
      })
      .catch(() => {
        setShifts([
          { id: "shift_day", name: "Day Shift (08:00 - 20:00)" },
          { id: "shift_night", name: "Night Shift (20:00 - 08:00)" },
        ]);
      });
  }, [shiftId]);

  // Set default quality when opened if none selected
  useEffect(() => {
    if (open && availableStock.length > 0 && !recipeQuality) {
      setRecipeQuality(defaultRecipeQuality || availableStock[0].recipeQuality);
    }
  }, [open, availableStock, recipeQuality, defaultRecipeQuality]);

  // Selected quality stock balance
  const selectedQualityStock = useMemo(() => {
    return availableStock.find(
      (s) => s.recipeQuality.trim().toUpperCase() === recipeQuality.trim().toUpperCase()
    );
  }, [availableStock, recipeQuality]);

  // Row Manipulation
  const handleAddLoomRow = () => {
    const newId = `loom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setLoomRows((prev) => [...prev, { id: newId, loomNumber: "", customLoom: "", crateCount: "1" }]);
  };

  const handleRemoveLoomRow = (id: string) => {
    if (loomRows.length <= 1) return;
    setLoomRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateLoomRow = (id: string, field: keyof LoomRowItem, value: string) => {
    setLoomRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Grand Totals Calculation
  const grandTotalCrates = useMemo(() => {
    return loomRows.reduce((sum, r) => sum + (Number(r.crateCount) || 0), 0);
  }, [loomRows]);

  const grandTotalBobbins = Number((grandTotalCrates * BOBBINS_PER_CRATE).toFixed(2));
  const grandTotalWeightKg = Number((grandTotalCrates * CRATE_WEIGHT_KG).toFixed(2));

  const isStockWarning =
    selectedQualityStock &&
    selectedQualityStock.availableCrates > 0 &&
    grandTotalCrates > selectedQualityStock.availableCrates;

  const handleQuickAddActive = (amount: number) => {
    if (loomRows.length === 0) return;
    const lastRow = loomRows[loomRows.length - 1];
    const current = Number(lastRow.crateCount) || 0;
    handleUpdateLoomRow(lastRow.id, "crateCount", String(Math.max(1, current + amount)));
  };

  const handleSetMax = () => {
    if (selectedQualityStock && selectedQualityStock.availableCrates > 0 && loomRows.length > 0) {
      if (loomRows.length === 1) {
        handleUpdateLoomRow(loomRows[0].id, "crateCount", String(Math.floor(selectedQualityStock.availableCrates)));
      } else {
        toast.info(`Total available stock is ${selectedQualityStock.availableCrates.toFixed(1)} crates`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipeQuality.trim()) {
      toast.error("Please select or enter recipe quality");
      return;
    }

    if (grandTotalCrates <= 0) {
      toast.error("Please enter a valid number of crates (greater than 0)");
      return;
    }

    // Prepare allocations payload
    const allocationsPayload: LoomAllocationItem[] = loomRows
      .filter((r) => (Number(r.crateCount) || 0) > 0)
      .map((r) => {
        const cCount = Number(r.crateCount) || 0;
        const lNum = r.loomNumber ? Number(r.loomNumber) : null;
        const lIdent = r.customLoom.trim() ? r.customLoom.trim() : lNum ? `Loom #${lNum}` : "Loom Shed";
        return {
          loomNumber: lNum,
          loomIdentifier: lIdent,
          crateCount: cCount,
          bobbinCount: Number((cCount * BOBBINS_PER_CRATE).toFixed(2)),
          weightKg: Number((cCount * CRATE_WEIGHT_KG).toFixed(2)),
        };
      });

    if (allocationsPayload.length === 0) {
      toast.error("Please specify at least one loom allocation with > 0 crates");
      return;
    }

    setSubmitting(true);
    try {
      const selectedShiftObj = shifts.find((s) => s.id === shiftId || s.name === shiftId);
      const shiftName = selectedShiftObj ? selectedShiftObj.name : shiftId;

      const firstLoom = allocationsPayload[0];
      const isMulti = allocationsPayload.length > 1;

      const payload = {
        date,
        shiftId,
        shiftName,
        recipeQuality: recipeQuality.trim(),
        loomNumber: isMulti ? null : firstLoom.loomNumber,
        loomIdentifier: isMulti
          ? `${allocationsPayload.length} Looms (${allocationsPayload.map((a) => a.loomIdentifier).slice(0, 3).join(", ")}${allocationsPayload.length > 3 ? "..." : ""})`
          : firstLoom.loomIdentifier,
        loomAllocations: allocationsPayload,
        crateCount: grandTotalCrates,
        issuedBy: issuedBy.trim() || undefined,
        receivedBy: receivedBy.trim() || undefined,
        remarks: remarks.trim() || undefined,
      };

      const res = await fetch("/api/production/tape-plant/bobbin-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record bobbin issue");
      }

      toast.success(`Bobbin issue ${data.issue.slipNumber} recorded successfully!`);

      // Pass created issue data to trigger slip preview/print
      onSuccess({
        slipNumber: data.issue.slipNumber,
        date: data.issue.date,
        shiftName: data.issue.shiftName || shiftName,
        recipeQuality: data.issue.recipeQuality,
        loomNumber: data.issue.loomNumber,
        loomIdentifier: data.issue.loomIdentifier,
        allocations: allocationsPayload,
        crateCount: data.issue.crateCount,
        bobbinCount: data.issue.bobbinCount,
        weightKg: data.issue.weightKg,
        issuedBy: data.issue.issuedBy,
        receivedBy: data.issue.receivedBy,
        remarks: data.issue.remarks,
      });

      onClose();
    } catch (err: any) {
      console.error("Error creating bobbin issue:", err);
      toast.error(err.message || "Failed to issue bobbins");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/45 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Sleek Minimal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Issue Bobbins to Looms</h2>
              <p className="text-[11px] text-slate-500 font-normal">
                Multi-loom dispatch schedule with live crate-to-KG conversion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Date & Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Issue Date *
              </label>
              <div className="flex items-center gap-2 bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-slate-800 focus-within:bg-white transition-colors">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full text-xs font-medium text-slate-900 bg-transparent outline-none cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Shift *
              </label>
              <div className="flex items-center gap-2 bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-slate-800 focus-within:bg-white transition-colors">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  required
                  className="w-full text-xs font-medium text-slate-900 bg-transparent outline-none cursor-pointer"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quality Selection */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
              <label className="text-[11px] font-medium text-slate-600">
                Recipe Quality *
              </label>
              {selectedQualityStock && (
                <span className="text-[10px] sm:text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                  Avail: <strong>{selectedQualityStock.availableCrates.toFixed(1)}</strong> crates ({selectedQualityStock.availableKg.toFixed(0)} kg)
                </span>
              )}
            </div>

            <UniversalQualityInput
              value={recipeQuality}
              onChange={(val) => setRecipeQuality(val)}
              options={availableStock.map((s) => ({
                code: s.recipeQuality,
                label: `Stock: ${s.availableCrates.toFixed(1)} crates (${s.availableKg.toFixed(0)} kg)`,
              }))}
              placeholder="— Select / Type Recipe Quality —"
              inputClassName="h-9 font-semibold"
            />
          </div>

          {/* Multi-Loom Allocation Schedule (BUG-016 Streamlined) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                Loom Allocations ({loomRows.length})
              </label>
              <button
                type="button"
                onClick={handleAddLoomRow}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Loom</span>
              </button>
            </div>

            {/* Desktop Allocation Table Layout (Hidden on Mobile) */}
            <div className="hidden sm:block rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span className="col-span-4">Loom #</span>
                <span className="col-span-3">Custom / Shed</span>
                <span className="col-span-3">Crates</span>
                <span className="col-span-2 text-right">Net Wt</span>
              </div>

              <div className="divide-y divide-slate-100">
                {loomRows.map((row) => {
                  const rowCrates = Number(row.crateCount) || 0;
                  const rowKg = Number((rowCrates * CRATE_WEIGHT_KG).toFixed(1));

                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Loom Number */}
                      <div className="col-span-4">
                        <select
                          value={row.loomNumber}
                          onChange={(e) => handleUpdateLoomRow(row.id, "loomNumber", e.target.value)}
                          className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-slate-800 transition-colors cursor-pointer"
                        >
                          <option value="">Select Loom...</option>
                          {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={num}>
                              Loom #{num}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom / Shed */}
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={row.customLoom}
                          onChange={(e) => handleUpdateLoomRow(row.id, "customLoom", e.target.value)}
                          placeholder="e.g. Shed B"
                          className="w-full text-xs text-slate-800 bg-slate-50/60 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-slate-800 focus:bg-white transition-colors"
                        />
                      </div>

                      {/* Crates Input */}
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={row.crateCount}
                          onChange={(e) => handleUpdateLoomRow(row.id, "crateCount", e.target.value)}
                          required
                          placeholder="Crates"
                          className="w-full text-xs font-bold font-mono text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-slate-900 transition-all text-center"
                        />
                      </div>

                      {/* Calculated Weight & Delete */}
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        <span className="text-[11px] font-mono font-semibold text-slate-700 whitespace-nowrap">
                          {rowKg} kg
                        </span>
                        {loomRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLoomRow(row.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Remove this loom"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Touch-Friendly Allocation Cards (< sm) */}
            <div className="block sm:hidden space-y-2.5">
              {loomRows.map((row, idx) => {
                const rowCrates = Number(row.crateCount) || 0;
                const rowKg = Number((rowCrates * CRATE_WEIGHT_KG).toFixed(1));
                const rowBobbins = Number((rowCrates * BOBBINS_PER_CRATE).toFixed(0));

                return (
                  <div
                    key={row.id}
                    className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                        {row.loomNumber ? `Loom #${row.loomNumber}` : `Allocation #${idx + 1}`}
                      </span>
                      {loomRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLoomRow(row.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Loom Number *
                        </label>
                        <select
                          value={row.loomNumber}
                          onChange={(e) => handleUpdateLoomRow(row.id, "loomNumber", e.target.value)}
                          className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-800 transition-colors cursor-pointer"
                        >
                          <option value="">Select Loom...</option>
                          {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
                            <option key={num} value={num}>
                              Loom #{num}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Custom / Shed
                        </label>
                        <input
                          type="text"
                          value={row.customLoom}
                          onChange={(e) => handleUpdateLoomRow(row.id, "customLoom", e.target.value)}
                          placeholder="e.g. Shed B"
                          className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-800 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Crates
                        </label>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              const curr = Number(row.crateCount) || 0;
                              if (curr > 0.5) handleUpdateLoomRow(row.id, "crateCount", String(Math.max(0.5, curr - 0.5)));
                            }}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-l-lg hover:bg-slate-100 text-slate-700 font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={row.crateCount}
                            onChange={(e) => handleUpdateLoomRow(row.id, "crateCount", e.target.value)}
                            required
                            className="w-full text-center text-xs font-mono font-bold text-slate-900 bg-white border-y border-slate-200 py-1 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const curr = Number(row.crateCount) || 0;
                              handleUpdateLoomRow(row.id, "crateCount", String(curr + 0.5));
                            }}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-r-lg hover:bg-slate-100 text-slate-700 font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 text-right">
                        <span className="block text-[10px] font-medium text-slate-500">Calculated Weight</span>
                        <span className="block text-xs font-mono font-bold text-emerald-700">
                          {rowKg} kg
                        </span>
                        <span className="block text-[10px] font-mono text-slate-400">
                          ({rowBobbins} bobbins)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inline Total Summary Bar (Responsive) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-2.5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-lg border border-slate-200/80 p-2 shadow-2xs">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Crates</span>
                <span className="block text-sm font-mono font-bold text-slate-900">
                  {grandTotalCrates.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-white rounded-lg border border-slate-200/80 p-2 shadow-2xs">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Bobbins</span>
                <span className="block text-sm font-mono font-bold text-slate-900">
                  {grandTotalBobbins.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="bg-white rounded-lg border border-slate-200/80 p-2 shadow-2xs">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Total Wt</span>
                <span className="block text-sm font-mono font-bold text-emerald-700">
                  {grandTotalWeightKg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg
                </span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-[11px] font-medium text-slate-500">Quick adjust:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickAddActive(5)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddActive(10)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  +10
                </button>
                {selectedQualityStock && selectedQualityStock.availableCrates > 0 && (
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors shadow-2xs"
                  >
                    Max
                  </button>
                )}
              </div>
            </div>

            {isStockWarning && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 text-[11px] font-medium">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  Warning: Total requested ({grandTotalCrates} crates) exceeds available stock (
                  {selectedQualityStock?.availableCrates.toFixed(1)} crates).
                </span>
              </div>
            )}
          </div>

          {/* Issuer and Receiver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Issued By (Tape Plant)
              </label>
              <input
                type="text"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                placeholder="Operator / Supervisor"
                className="w-full text-xs font-medium text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Received By (Loom)
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Loom Operator / Receiver"
                className="w-full text-xs font-medium text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Remarks / Issue Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Multi-loom warp/weft allocation"
              className="w-full text-xs font-medium text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-800 focus:bg-white transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl sm:rounded-lg border border-slate-200 sm:border-transparent text-center transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || grandTotalCrates <= 0 || !recipeQuality}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-semibold rounded-xl sm:rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Printer className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span>{submitting ? "Recording..." : "Issue & Print Slip"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
