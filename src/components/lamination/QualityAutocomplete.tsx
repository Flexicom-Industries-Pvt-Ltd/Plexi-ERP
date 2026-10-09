"use client";

import React from "react";
import { UniversalQualityInput, UniversalQualityOption } from "@/components/ui/UniversalQualityInput";

export interface QualityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  qualities?: string[] | UniversalQualityOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function QualityAutocomplete({
  value,
  onChange,
  qualities,
  placeholder = "— Select / Type Quality —",
  className = "",
  disabled = false,
}: QualityAutocompleteProps) {
  return (
    <UniversalQualityInput
      value={value}
      onChange={(val) => onChange(val)}
      options={qualities}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      allowManualTyping={true}
      compact={true}
      inputClassName="h-8 font-semibold"
    />
  );
}

export default QualityAutocomplete;
