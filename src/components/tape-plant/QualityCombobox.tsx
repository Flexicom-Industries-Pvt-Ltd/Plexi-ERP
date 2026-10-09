"use client";

import React from "react";
import {
  UniversalQualityInput,
  UniversalQualityInputProps,
  UniversalQualityOption,
} from "@/components/ui/UniversalQualityInput";

export interface QualityComboboxProps {
  value: string;
  onChange: (newCode: string) => void;
  recipes?: any[];
  gridCellId?: string;
  rowIndex?: number;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onGridKeyDown?: (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function QualityCombobox({
  value,
  onChange,
  recipes,
  gridCellId,
  rowIndex = 0,
  onFocus,
  onBlur,
  onGridKeyDown,
  placeholder = "— Select / Search Quality —",
  className = "",
  disabled = false,
}: QualityComboboxProps) {
  return (
    <UniversalQualityInput
      value={value}
      onChange={(code) => onChange(code)}
      options={recipes}
      gridCellId={gridCellId}
      rowIndex={rowIndex}
      colIndex={0}
      onFocus={onFocus}
      onBlur={onBlur}
      onGridKeyDown={onGridKeyDown}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      allowManualTyping={true}
    />
  );
}

export default QualityCombobox;
