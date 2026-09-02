"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

interface Props {
  run: {
    id: string;
    targetQty: number;
    planLine?: { machine?: { name: string } };
  };
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export function CompleteRunModal({ run, open, onClose, onCompleted }: Props) {
  const [saving, setSaving] = useState(false);
  const [actualQty, setActualQty] = useState(0);
  const [acceptedQty, setAcceptedQty] = useState(0);
  const [rejectedQty, setRejectedQty] = useState(0);
  const [reworkQty, setReworkQty] = useState(0);
  const [scrapQty, setScrapQty] = useState(0);
  const [downtimeMinutes, setDowntimeMinutes] = useState(0);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/production/runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualQty,
          acceptedQty,
          rejectedQty,
          reworkQty,
          scrapQty,
          downtimeMinutes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete run");
      }
      toast.success("Run completed");
      onCompleted();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-slate-800">Complete Production Run</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-500">Target: {run.targetQty} {run.planLine?.machine?.name ? `· ${run.planLine.machine.name}` : ""}</p>
          {[
            { label: "Actual Qty", value: actualQty, set: setActualQty },
            { label: "Accepted Qty", value: acceptedQty, set: setAcceptedQty },
            { label: "Rejected Qty", value: rejectedQty, set: setRejectedQty },
            { label: "Rework Qty", value: reworkQty, set: setReworkQty },
            { label: "Scrap Qty", value: scrapQty, set: setScrapQty },
            { label: "Downtime (mins)", value: downtimeMinutes, set: setDowntimeMinutes },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
              <input
                type="number"
                min={0}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={field.value}
                onChange={(e) => field.set(parseFloat(e.target.value) || 0)}
                required={field.label.includes("Actual") || field.label.includes("Accepted")}
              />
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Complete Run
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
