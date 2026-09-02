"use client";

import { useState } from "react";
import type { ProductionCharacteristicDefinition } from "@/generated/prisma";

export interface CharacteristicValueInput {
  definitionId: string;
  value: string;
}

interface Props {
  phase: string;
  definitions: ProductionCharacteristicDefinition[];
  values: CharacteristicValueInput[];
  onChange: (values: CharacteristicValueInput[]) => void;
}

export function DynamicCharacteristicsForm({ phase, definitions, values, onChange }: Props) {
  const phaseDefs = definitions
    .filter((d) => d.phase === phase && d.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (phaseDefs.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic py-2">
        No characteristics configured for this phase.
      </p>
    );
  }

  const getValue = (definitionId: string) =>
    values.find((v) => v.definitionId === definitionId)?.value ?? "";

  const setValue = (definitionId: string, value: string) => {
    const existing = values.filter((v) => v.definitionId !== definitionId);
    if (value !== "") {
      onChange([...existing, { definitionId, value }]);
    } else {
      onChange(existing);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
      <p className="col-span-full text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Phase Characteristics
      </p>
      {phaseDefs.map((def) => (
        <CharacteristicField
          key={def.id}
          definition={def}
          value={getValue(def.id)}
          onChange={(v) => setValue(def.id, v)}
        />
      ))}
    </div>
  );
}

function CharacteristicField({
  definition,
  value,
  onChange,
}: {
  definition: ProductionCharacteristicDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const options = Array.isArray(definition.options)
    ? (definition.options as { label: string; value: string }[])
    : [];

  const inputClass =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {definition.label}
        {definition.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {definition.fieldType === "SELECT" && options.length > 0 ? (
        <select
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={definition.required}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : definition.fieldType === "BOOLEAN" ? (
        <select
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={definition.required}
        >
          <option value="">Select...</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : definition.fieldType === "NUMBER" ? (
        <input
          type="number"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={definition.required}
        />
      ) : definition.fieldType === "DATE" ? (
        <input
          type="date"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={definition.required}
        />
      ) : (
        <input
          type="text"
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={definition.required}
        />
      )}
    </div>
  );
}
