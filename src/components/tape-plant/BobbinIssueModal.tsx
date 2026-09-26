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
  ArrowRight,
} from "lucide-react";
import {
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
} from "@/lib/tape-plant/bobbin-stock";
import { BobbinIssueSlipData } from "@/lib/tape-plant/print-bobbin-issue-slip";

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
  const [loomNumber, setLoomNumber] = useState<string>("");
  const [customLoom, setCustomLoom] = useState("");
  const [crateCountInput, setCrateCountInput] = useState<string>("1");
  const [issuedBy, setIssuedBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [remarks, setRemarks] = useState("");

  // Sync defaultRecipeQuality when modal opens
  useEffect(() => {
    if (open && defaultRecipeQuality) {
      setRecipeQuality(defaultRecipeQuality);
    }
  }, [open, defaultRecipeQuality]);

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

  // Calculations
  const crateCount = Number(crateCountInput) || 0;
  const bobbinCount = Number((crateCount * BOBBINS_PER_CRATE).toFixed(2));
  const weightKg = Number((crateCount * CRATE_WEIGHT_KG).toFixed(2));

  const isStockWarning =
    selectedQualityStock &&
    selectedQualityStock.availableCrates > 0 &&
    crateCount > selectedQualityStock.availableCrates;

  const handleQuickAdd = (amount: number) => {
    const current = Number(crateCountInput) || 0;
    const nextVal = Math.max(1, current + amount);
    setCrateCountInput(String(nextVal));
  };

  const handleSetMax = () => {
    if (selectedQualityStock && selectedQualityStock.availableCrates > 0) {
      setCrateCountInput(String(Math.floor(selectedQualityStock.availableCrates)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipeQuality.trim()) {
      toast.error("Please select or enter recipe quality");
      return;
    }

    if (crateCount <= 0) {
      toast.error("Please enter a valid number of crates (greater than 0)");
      return;
    }

    setSubmitting(true);
    try {
      const selectedShiftObj = shifts.find((s) => s.id === shiftId || s.name === shiftId);
      const shiftName = selectedShiftObj ? selectedShiftObj.name : shiftId;

      const res = await fetch("/api/production/tape-plant/bobbin-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          shiftId,
          shiftName,
          recipeQuality: recipeQuality.trim(),
          loomNumber: loomNumber ? Number(loomNumber) : null,
          loomIdentifier: customLoom.trim() ? customLoom.trim() : loomNumber ? `Loom #${loomNumber}` : "Loom Shed",
          crateCount,
          issuedBy: issuedBy.trim() || undefined,
          receivedBy: receivedBy.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }),
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Sleek Minimal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">Issue Bobbins to Loom</h2>
              <p className="text-[11px] text-slate-500 font-normal">
                Dispense crates to circular looms with live KG conversion
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-slate-600">
                Recipe Quality *
              </label>
              {selectedQualityStock && (
                <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/70">
                  Stock: <strong className="text-slate-900">{selectedQualityStock.availableCrates.toFixed(1)}</strong> crates (
                  {selectedQualityStock.availableKg.toFixed(0)} kg)
                </span>
              )}
            </div>

            {availableStock.length > 0 ? (
              <select
                value={recipeQuality}
                onChange={(e) => setRecipeQuality(e.target.value)}
                required
                className="w-full text-xs font-medium text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-800 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="">-- Select Available Recipe Quality --</option>
                {availableStock.map((s) => (
                  <option key={s.recipeQuality} value={s.recipeQuality}>
                    {s.recipeQuality} (Available: {s.availableCrates.toFixed(1)} crates / {s.availableKg.toFixed(0)} kg)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={recipeQuality}
                onChange={(e) => setRecipeQuality(e.target.value)}
                placeholder="e.g. AMB/PP/WH/500/76/S1"
                required
                className="w-full text-xs font-medium text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            )}
          </div>

          {/* Destination Loom Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Target Loom # (1 - 91)
              </label>
              <select
                value={loomNumber}
                onChange={(e) => setLoomNumber(e.target.value)}
                className="w-full text-xs font-medium text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-800 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="">-- Loom Shed / General --</option>
                {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    Loom #{num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Custom Loom / Shed Label
              </label>
              <input
                type="text"
                value={customLoom}
                onChange={(e) => setCustomLoom(e.target.value)}
                placeholder="e.g. Loom 14 / Shed B"
                className="w-full text-xs font-medium text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-800 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Minimalist Crates Input & Live Conversion Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider">
                Number of Crates to Issue *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickAdd(5)}
                  className="px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(10)}
                  className="px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(25)}
                  className="px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                >
                  +25
                </button>
                {selectedQualityStock && selectedQualityStock.availableCrates > 0 && (
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="px-2 py-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  >
                    Max
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={crateCountInput}
                onChange={(e) => setCrateCountInput(e.target.value)}
                required
                placeholder="Enter crates (e.g. 5)"
                className="w-full text-base font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-lg pl-3 pr-16 py-2 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 uppercase font-mono">
                Crates
              </span>
            </div>

            {/* Calculated Values Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                  Bobbins (@ 8/crate)
                </span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {bobbinCount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                  <span className="text-[10px] font-normal text-slate-500">pcs</span>
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block">
                  Weight (@ 12.8 kg/crate)
                </span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {weightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-[10px] font-normal text-slate-500">kg</span>
                </span>
              </div>
            </div>

            {isStockWarning && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 text-[11px] font-medium">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  Warning: Requested ({crateCount} crates) exceeds recorded available stock (
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
              placeholder="e.g. Urgent changeover bobbins for Loom 6"
              className="w-full text-xs font-medium text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-800 focus:bg-white transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || crateCount <= 0 || !recipeQuality}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-medium rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{submitting ? "Recording..." : "Issue & Print Slip"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
