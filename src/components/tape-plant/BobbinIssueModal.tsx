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
  ArrowRight,
  Printer,
  Sparkles,
  Layers,
  AlertTriangle,
  Info,
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
      .catch(() => {});
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
      const selectedShiftObj = shifts.find((s) => s.id === shiftId);
      const shiftName = selectedShiftObj ? selectedShiftObj.name : shiftId;

      const res = await fetch("/api/production/tape-plant/bobbin-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          shiftId,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Issue Bobbins to Loom</h2>
              <p className="text-xs text-slate-400">
                Dispense crates to circular looms • Auto-calculates bobbins and weight in KG
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date & Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Issue Date *
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Shift *
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  required
                  className="w-full text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recipe Quality Name *
              </label>
              {selectedQualityStock && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Stock: <strong>{selectedQualityStock.availableCrates.toFixed(1)}</strong> crates (
                  {selectedQualityStock.availableKg.toFixed(1)} kg)
                </span>
              )}
            </div>

            {availableStock.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={recipeQuality}
                  onChange={(e) => setRecipeQuality(e.target.value)}
                  required
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Select Available Recipe Quality --</option>
                  {availableStock.map((s) => (
                    <option key={s.recipeQuality} value={s.recipeQuality}>
                      {s.recipeQuality} (Available: {s.availableCrates.toFixed(1)} crates / {s.availableKg.toFixed(0)} kg)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <input
                type="text"
                value={recipeQuality}
                onChange={(e) => setRecipeQuality(e.target.value)}
                placeholder="e.g. AMB/PP/WH/500/76/S1"
                required
                className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500"
              />
            )}
          </div>

          {/* Destination Loom Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Loom # (1 - 91)
              </label>
              <select
                value={loomNumber}
                onChange={(e) => setLoomNumber(e.target.value)}
                className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="">-- Select Loom No --</option>
                {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    Loom #{num}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Custom Loom / Shed Label
              </label>
              <input
                type="text"
                value={customLoom}
                onChange={(e) => setCustomLoom(e.target.value)}
                placeholder="e.g. Loom 14 / Shed B"
                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Crates Input & Live Conversion Card */}
          <div className="bg-gradient-to-br from-blue-50 via-slate-50 to-purple-50 p-4 rounded-xl border border-blue-200 space-y-3">
            <div>
              <label className="block text-xs font-extrabold text-blue-900 uppercase tracking-wider mb-1">
                Number of Crates to Issue *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={crateCountInput}
                  onChange={(e) => setCrateCountInput(e.target.value)}
                  required
                  placeholder="Enter crates (e.g. 5)"
                  className="w-full text-lg font-black text-slate-900 bg-white border-2 border-blue-400 rounded-lg pl-3 pr-20 py-2 outline-none focus:border-blue-600 shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-800 uppercase">
                  Crates
                </span>
              </div>
            </div>

            {/* Real-time Computed Values */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-200">
              <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-xs">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  Calculated Bobbins (@ 8/crate)
                </span>
                <span className="text-xl font-black font-mono text-blue-950">
                  {bobbinCount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-bold text-blue-600">PCS</span>
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Calculated Weight (@ 12.8 kg/crate)
                </span>
                <span className="text-xl font-black font-mono text-emerald-950">
                  {weightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-bold text-emerald-600">KG</span>
                </span>
              </div>
            </div>

            {isStockWarning && (
              <div className="flex items-center gap-2 p-2 bg-amber-100 text-amber-900 rounded border border-amber-300 text-xs font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Issued By (Tape Plant)
              </label>
              <input
                type="text"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                placeholder="Operator / Supervisor name"
                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Received By (Loom)
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Loom operator / Receiver name"
                className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Remarks / Issue Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Urgent changeover bobbins for Loom 6"
              className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || crateCount <= 0 || !recipeQuality}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>{submitting ? "Recording Issue..." : "Issue Bobbins & Print Slip"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
