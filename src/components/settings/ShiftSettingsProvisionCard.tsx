"use client";

import React, { useState, useEffect } from "react";
import { Clock, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ShiftSettingsProvisionCard() {
  const [allowDayNight, setAllowDayNight] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/settings/production-shifts-config")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setAllowDayNight(res.allowDayNight);
        }
      })
      .catch((err) => {
        console.error("Failed to load shift provision config:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleToggle = async () => {
    const nextVal = !allowDayNight;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/production-shifts-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowDayNight: nextVal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update configuration");

      setAllowDayNight(nextVal);
      toast.success(
        nextVal
          ? "24-Hour (Day+Night) Combined Shift provision enabled for production modules"
          : "24-Hour (Day+Night) Combined Shift provision disabled"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update shift provision");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 shrink-0 mt-0.5">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                24-Hour (Day+Night) Combined Shift Provision
              </h3>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  allowDayNight
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {loading ? "Checking…" : allowDayNight ? "Enabled in Production" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Provides an authoritative <strong>Day + Night (24h)</strong> continuous shift option across factory floor modules
              (Tape Plant, Circular Loom, Extrusion Lamination, Printing, Valvomatic, Convertex). When disabled, only the
              discrete shifts defined in the Shift Master table below will appear in production dropdowns.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <button
            type="button"
            disabled={loading || saving}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
              allowDayNight ? "bg-primary" : "bg-slate-200"
            }`}
            role="switch"
            aria-checked={allowDayNight}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                allowDayNight ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs font-semibold text-slate-700 w-16">
            {saving ? (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving
              </span>
            ) : allowDayNight ? (
              "Enabled"
            ) : (
              "Disabled"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ShiftSettingsProvisionCard;

