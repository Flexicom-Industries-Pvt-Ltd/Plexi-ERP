"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NumericCellInputProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Spreadsheet-grade decimal input that preserves intermediate states like "55."
 * while committing clean finite numbers upstream without cursor jumps.
 */
export function NumericCellInput({
  value,
  onChange,
  disabled = false,
  placeholder = "0",
  className,
  ariaLabel,
}: NumericCellInputProps) {
  const [text, setText] = useState<string>(value ? String(value) : "");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(value ? String(value) : "");
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
      setText(raw);
      const parsed = raw === "" || raw === "." ? 0 : parseFloat(raw);
      if (Number.isFinite(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = text === "" || text === "." ? 0 : parseFloat(text);
    const finalVal = Number.isFinite(parsed) ? parsed : 0;
    onChange(finalVal);
    setText(finalVal ? String(finalVal) : "");
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      disabled={disabled}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={handleBlur}
      onChange={handleChange}
      className={cn(
        "w-full h-7 px-1.5 text-right font-mono text-xs tabular-nums rounded border border-transparent bg-slate-50/70 text-slate-900 placeholder:text-slate-300 transition-colors focus:bg-white focus:border-slate-400 focus:outline-none disabled:bg-transparent disabled:text-slate-400",
        className
      )}
    />
  );
}
