"use client";

import React, { useState } from "react";
import { parseRecipeQuality, isStandardRecipeFormat, STANDARD_COLOURS } from "@/lib/tape-plant/recipe-format";
import { Sparkles, Info } from "lucide-react";

interface RecipeQualityBadgeProps {
  value?: string | null;
  className?: string;
  showBreakdown?: boolean;
}

export function RecipeQualityBadge({ value, className = "", showBreakdown = false }: RecipeQualityBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!value || value === "—") {
    return <span className="text-slate-400 font-mono text-xs">—</span>;
  }

  const parts = parseRecipeQuality(value);
  const isStandard = isStandardRecipeFormat(value);
  const colourObj = STANDARD_COLOURS.find((c) => c.code.toUpperCase() === parts.colour?.toUpperCase());

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-mono font-bold tracking-wide shadow-xs cursor-help transition-all hover:bg-slate-800"
      >
        <span className="text-blue-300 font-semibold">{parts.company}</span>
        <span className="text-slate-500">/</span>
        <span className="text-emerald-300 font-semibold">{parts.tapeType}</span>
        <span className="text-slate-500">/</span>
        <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
          {colourObj && <span className={`h-1.5 w-1.5 rounded-full ${colourObj.dotColor}`} />}
          {parts.colour}
        </span>
        <span className="text-slate-500">/</span>
        <span className="text-purple-300 font-semibold">{parts.sizeMm}</span>
        <span className="text-slate-500">/</span>
        <span className="text-pink-300 font-semibold">{parts.weightPerMetre}</span>
        <span className="text-slate-500">/</span>
        <span className="text-cyan-300 font-bold">{parts.grade}</span>
      </div>

      {/* Floating Info Tooltip */}
      {(showTooltip || showBreakdown) && isStandard && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-72 bg-slate-950 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-[11px] space-y-1.5 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" /> Recipe Breakdown
            </span>
            <span className="font-mono text-cyan-400 font-bold">{value}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div>
              <span className="text-slate-400 block">Company:</span>
              <span className="font-bold text-slate-100">{parts.company}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Type (PP/LPP):</span>
              <span className="font-bold text-slate-100">{parts.tapeType}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Colour:</span>
              <span className="font-bold text-amber-300">
                {parts.colour} {colourObj ? `(${colourObj.name})` : ""}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Size:</span>
              <span className="font-bold text-slate-100">{parts.sizeMm} mm</span>
            </div>
            <div>
              <span className="text-slate-400 block">Weight / Metre:</span>
              <span className="font-bold text-slate-100">{parts.weightPerMetre} g/m</span>
            </div>
            <div>
              <span className="text-slate-400 block">Grade:</span>
              <span className="font-bold text-cyan-300">
                {parts.grade === "HC" ? "High Corona (HC)" : parts.grade === "S1" ? "Standard 1 (S1)" : parts.grade}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
