"use client";

import React from "react";
import { Clock, Sun, Moon, Sparkles, Loader2 } from "lucide-react";
import { useProductionShifts, ProductionShift } from "@/hooks/useProductionShifts";

export interface UniversalShiftSelectorProps {
  value: string;
  onChange: (value: string, selectedShift?: ProductionShift) => void;
  mode?: "byName" | "byId";
  includeDayNight?: boolean;
  className?: string;
  selectClassName?: string;
  disabled?: boolean;
  compact?: boolean;
  showIcon?: boolean;
  label?: string;
  placeholder?: string;
}

export function UniversalShiftSelector({
  value,
  onChange,
  mode = "byName",
  includeDayNight = true,
  className = "",
  selectClassName = "",
  disabled = false,
  compact = false,
  showIcon = true,
  label,
  placeholder = "Select Shift",
}: UniversalShiftSelectorProps) {
  const { allOptions, loading, getShiftById, getShiftByName, formatShiftLabel } = useProductionShifts({
    includeDayNight,
  });

  const selectedShift = mode === "byId" ? getShiftById(value) : getShiftByName(value);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVal = e.target.value;
    const shift = mode === "byId" ? getShiftById(selectedVal) : getShiftByName(selectedVal);
    onChange(selectedVal, shift);
  };

  // Determine shift visual theme badge
  const isNight = selectedShift?.isNightShift || (selectedShift?.name || "").toLowerCase().includes("night");
  const isDayNight = selectedShift?.isDayNight || (selectedShift?.name || "").toLowerCase().includes("24h");

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
          {showIcon && <Clock className="h-3.5 w-3.5 text-slate-400" />}
          <span>{label}</span>
        </label>
      )}

      <div className="relative flex items-center">
        {showIcon && !label && (
          <div className="absolute left-2.5 pointer-events-none text-slate-400">
            {isDayNight ? (
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            ) : isNight ? (
              <Moon className="h-3.5 w-3.5 text-indigo-500" />
            ) : (
              <Sun className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>
        )}

        <select
          value={value}
          disabled={disabled || loading}
          onChange={handleChange}
          className={`w-full font-medium rounded-lg border border-slate-300 bg-white transition-all outline-none cursor-pointer focus:ring-2 focus:ring-sky-400/20 focus:border-sky-500 disabled:opacity-50 ${
            compact ? "h-7 text-xs" : "h-9 text-xs"
          } ${showIcon && !label ? "pl-8 pr-7" : "px-2.5 pr-7"} ${
            isDayNight
              ? "bg-amber-50/50 text-amber-950 font-bold border-amber-300"
              : isNight
              ? "text-indigo-950 font-semibold"
              : "text-slate-800 font-semibold"
          } ${selectClassName}`}
        >
          {loading ? (
            <option value="">Loading shifts...</option>
          ) : (
            <>
              {!value && <option value="">{placeholder}</option>}
              {allOptions.map((s) => {
                const optVal = mode === "byId" ? s.id : s.name;
                const optLabel = formatShiftLabel(s);
                return (
                  <option key={s.id} value={optVal}>
                    {optLabel}
                  </option>
                );
              })}
            </>
          )}
        </select>

        {loading && (
          <div className="absolute right-2 pointer-events-none">
            <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

export default UniversalShiftSelector;

