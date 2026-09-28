"use client";

import React from "react";

interface RecipeQualityBadgeProps {
  value?: string | null;
  className?: string;
  showBreakdown?: boolean;
}

function SingleRecipeBadge({
  recipe,
  className = "",
}: {
  recipe: string;
  className?: string;
  showBreakdown?: boolean;
}) {
  if (!recipe || recipe === "—") {
    return <span className="text-slate-400 font-mono text-xs">—</span>;
  }

  // Format recipe with clean spacing if slashed
  const formattedRecipe = recipe.includes("/")
    ? recipe.split("/").map((s) => s.trim()).filter(Boolean).join(" / ")
    : recipe;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded-md text-xs font-mono font-medium tracking-tight whitespace-nowrap shadow-2xs ${className}`}
    >
      {formattedRecipe}
    </span>
  );
}

export function RecipeQualityBadge({
  value,
  className = "",
  showBreakdown = false,
}: RecipeQualityBadgeProps) {
  if (!value || value === "—") {
    return <span className="text-slate-400 font-mono text-xs">—</span>;
  }

  const recipes = value.split(",").map((s) => s.trim()).filter(Boolean);

  if (recipes.length <= 1) {
    return (
      <SingleRecipeBadge
        recipe={recipes[0] || value}
        className={className}
        showBreakdown={showBreakdown}
      />
    );
  }

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {recipes.map((r, i) => (
        <SingleRecipeBadge
          key={i}
          recipe={r}
          showBreakdown={showBreakdown}
        />
      ))}
    </div>
  );
}
