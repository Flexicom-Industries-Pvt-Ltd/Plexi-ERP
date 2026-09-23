"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  parseRecipeQuality,
  formatRecipeQuality,
  STANDARD_COLOURS,
  STANDARD_GRADES,
  COMMON_RECIPE_PRESETS,
  RecipeQualityParts,
} from "@/lib/tape-plant/recipe-format";
import {
  Sparkles,
  ChevronDown,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Palette,
  Ruler,
  Weight,
  ShieldCheck,
  Building,
} from "lucide-react";

interface RecipeQualityInputProps {
  value: string;
  onChange: (newValue: string) => void;
  onSyncSpecifications?: (specs: {
    tapeType: "PP" | "LPP" | string;
    colour: string;
    tapeWidth: number;
    grade: string;
  }) => void;
  label?: string;
  required?: boolean;
  compact?: boolean;
}

export function RecipeQualityInput({
  value,
  onChange,
  onSyncSpecifications,
  label = "Recipe / Quality ID",
  required = false,
  compact = false,
}: RecipeQualityInputProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [parts, setParts] = useState<RecipeQualityParts>(() => parseRecipeQuality(value));
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize internal parts when external value changes
  useEffect(() => {
    setParts(parseRecipeQuality(value));
  }, [value]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPresets(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdatePart = (key: keyof RecipeQualityParts, val: string) => {
    const updated = {
      ...parts,
      [key]: val.toUpperCase(),
    };
    setParts(updated);
    const formatted = formatRecipeQuality(updated);
    onChange(formatted);
  };

  const handleSelectPreset = (code: string) => {
    onChange(code);
    setParts(parseRecipeQuality(code));
    setShowPresets(false);
  };

  const handleDirectInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    onChange(raw);
    setParts(parseRecipeQuality(raw));
  };

  const handleSync = () => {
    if (!onSyncSpecifications) return;
    const selectedColour = STANDARD_COLOURS.find(
      (c) => c.code.toUpperCase() === parts.colour?.toUpperCase()
    );
    onSyncSpecifications({
      tapeType: parts.tapeType || "LPP",
      colour: selectedColour ? `${selectedColour.name} (${parts.colour})` : parts.colour,
      tapeWidth: Number(parts.sizeMm) || 500,
      grade: parts.grade || "HC",
    });
  };

  const selectedColour = STANDARD_COLOURS.find(
    (c) => c.code.toUpperCase() === parts.colour?.toUpperCase()
  );

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
          >
            <span>Presets</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setShowBuilder(!showBuilder)}
            className={`text-[11px] font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded transition-all ${
              showBuilder
                ? "bg-primary text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            <span>{showBuilder ? "Close Builder" : "Recipe Builder"}</span>
          </button>
        </div>
      </div>

      {/* Main Formatted Input Bar */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleDirectInputChange}
          placeholder="STYM/LPP/YL/500/64/HC"
          className="w-full h-9 px-3 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-xs"
        />

        {/* Quick Presets Dropdown */}
        {showPresets && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 divide-y divide-slate-100 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Standard Quality Recipes
            </div>
            {COMMON_RECIPE_PRESETS.map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => handleSelectPreset(p.code)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  value === p.code ? "bg-primary/10 text-primary font-bold" : "text-slate-700"
                }`}
              >
                <div>
                  <span className="block font-bold">{p.code}</span>
                  <span className="text-[11px] text-slate-400 font-sans">{p.label}</span>
                </div>
                {value === p.code && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Format Legend Subtitle */}
      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 px-0.5 gap-1">
        <div className="flex items-center gap-1 font-mono">
          <span className="text-blue-600 font-semibold">Company</span>
          <span>/</span>
          <span className="text-emerald-600 font-semibold">PP|LPP</span>
          <span>/</span>
          <span className="text-amber-600 font-semibold">Colour</span>
          <span>/</span>
          <span className="text-purple-600 font-semibold">Size(mm)</span>
          <span>/</span>
          <span className="text-pink-600 font-semibold">Wt/m</span>
          <span>/</span>
          <span className="text-cyan-600 font-semibold">HC|S1</span>
        </div>
        {onSyncSpecifications && (
          <button
            type="button"
            onClick={handleSync}
            className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" /> Sync with Specs
          </button>
        )}
      </div>

      {/* Interactive 6-Segment Builder Panel */}
      {showBuilder && (
        <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-3 mt-2 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Interactive Recipe Builder
            </span>
            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
              {formatRecipeQuality(parts)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* 1. Company Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Building className="h-3 w-3 text-blue-500" /> Company
              </label>
              <input
                type="text"
                value={parts.company}
                placeholder="STYM"
                onChange={(e) => handleUpdatePart("company", e.target.value)}
                className="w-full h-8 px-2 text-xs font-mono font-bold uppercase bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* 2. PP / LPP */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Layers className="h-3 w-3 text-emerald-500" /> Type
              </label>
              <div className="grid grid-cols-2 gap-1 h-8">
                {["PP", "LPP"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleUpdatePart("tapeType", t)}
                    className={`text-xs font-bold rounded-lg border transition-all ${
                      parts.tapeType === t
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Colour */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Palette className="h-3 w-3 text-amber-500" /> Colour
              </label>
              <select
                value={parts.colour}
                onChange={(e) => handleUpdatePart("colour", e.target.value)}
                className="w-full h-8 px-2 text-xs font-bold uppercase bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary outline-none cursor-pointer"
              >
                {STANDARD_COLOURS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
                {!STANDARD_COLOURS.some((c) => c.code === parts.colour) && (
                  <option value={parts.colour}>{parts.colour} (Custom)</option>
                )}
              </select>
            </div>

            {/* 4. Size in mm */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Ruler className="h-3 w-3 text-purple-500" /> Size (mm)
              </label>
              <input
                type="number"
                value={parts.sizeMm}
                placeholder="500"
                onChange={(e) => handleUpdatePart("sizeMm", e.target.value)}
                className="w-full h-8 px-2 text-xs font-mono font-bold text-right bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* 5. Weight per metre */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Weight className="h-3 w-3 text-pink-500" /> Wt / m
              </label>
              <input
                type="number"
                value={parts.weightPerMetre}
                placeholder="64"
                onChange={(e) => handleUpdatePart("weightPerMetre", e.target.value)}
                className="w-full h-8 px-2 text-xs font-mono font-bold text-right bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {/* 6. Grade (HC / S1) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-cyan-500" /> Grade
              </label>
              <div className="grid grid-cols-2 gap-1 h-8">
                {["HC", "S1"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleUpdatePart("grade", g)}
                    className={`text-xs font-bold rounded-lg border transition-all ${
                      parts.grade === g
                        ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
