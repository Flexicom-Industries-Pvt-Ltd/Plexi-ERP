"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

export interface QualityComboboxProps {
  value: string;
  onChange: (newCode: string) => void;
  recipes: any[];
  gridCellId: string;
  rowIndex: number;
  onFocus?: () => void;
  onGridKeyDown?: (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
  placeholder?: string;
  className?: string;
}

export function QualityCombobox({
  value,
  onChange,
  recipes,
  gridCellId,
  rowIndex,
  onFocus,
  onGridKeyDown,
  placeholder = "— Select / Search Quality —",
  className = "",
}: QualityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync display search query with value when not typing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(value || "");
    }
  }, [value, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery(value || "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return recipes;
    }
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const code = (r.code || "").toLowerCase();
      const tapeType = (r.tapeType || "").toLowerCase();
      const colour = (r.colour || "").toLowerCase();
      const colorGroup = (r.colorGroup || "").toLowerCase();
      const denier = String(r.denier || "");
      const recipeGroup = (r.recipeGroup || "").toLowerCase();
      return (
        code.includes(q) ||
        tapeType.includes(q) ||
        colour.includes(q) ||
        colorGroup.includes(q) ||
        denier.includes(q) ||
        recipeGroup.includes(q)
      );
    });
  }, [recipes, searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedEl = listRef.current.querySelector(
        `[data-combobox-idx="${highlightedIndex}"]`
      ) as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectRecipe = (code: string) => {
    onChange(code);
    setSearchQuery(code);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((prev) =>
          filteredRecipes.length > 0 ? (prev + 1) % filteredRecipes.length : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((prev) =>
          filteredRecipes.length > 0
            ? (prev - 1 + filteredRecipes.length) % filteredRecipes.length
            : 0
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (filteredRecipes[highlightedIndex]) {
          handleSelectRecipe(filteredRecipes[highlightedIndex].code);
        } else if (searchQuery.trim()) {
          handleSelectRecipe(searchQuery.trim().toUpperCase());
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        setSearchQuery(value || "");
        return;
      }

      if (e.key === "Tab") {
        setIsOpen(false);
        setSearchQuery(value || "");
        return;
      }
    } else {
      // If dropdown is closed, ArrowDown / ArrowUp / Enter can open it or trigger grid navigation
      if (e.key === "Enter" || (e.altKey && e.key === "ArrowDown")) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
    }

    // Delegate to parent Excel-like grid navigation if dropdown is not open
    if (!isOpen && onGridKeyDown) {
      onGridKeyDown(e, rowIndex, 0);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? "z-50" : "z-10"} ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          data-grid-cell={gridCellId}
          placeholder={placeholder}
          onFocus={() => {
            onFocus?.();
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              setHighlightedIndex(0);
            }
          }}
          onChange={(e) => {
            const val = e.target.value;
            setSearchQuery(val);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
            if (!val.trim() && value) {
              onChange("");
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full h-8.5 pl-2.5 pr-14 text-xs rounded border transition-colors outline-none ${
            isOpen
              ? "border-sky-500 ring-2 ring-sky-400/20 bg-white"
              : "border-slate-300 hover:border-slate-400 bg-white"
          } ${
            !value && !searchQuery
              ? "text-slate-400 italic font-normal"
              : "text-slate-900 font-bold font-mono"
          }`}
        />

        <div className="absolute right-1.5 flex items-center gap-1">
          {searchQuery ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              title="Clear selection"
              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            title="Toggle suggestions"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 top-full mt-1 z-50 w-full min-w-[320px] max-w-[420px] max-h-72 overflow-y-auto bg-white rounded-lg border border-slate-300 shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t flex items-center justify-between mb-1 border-b pb-1">
            <span>Available Qualities ({filteredRecipes.length})</span>
            <span className="text-[9px] text-slate-400 font-normal">
              Type to filter • ↑↓ to navigate • Enter to pick
            </span>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="p-3 text-center text-slate-500">
              <p className="text-xs">No matching qualities found.</p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelectRecipe(searchQuery.trim().toUpperCase())}
                  className="mt-1.5 px-2.5 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded border border-sky-200 transition-colors cursor-pointer"
                >
                  Use &quot;{searchQuery.trim().toUpperCase()}&quot; as Custom Quality
                </button>
              )}
            </div>
          ) : (
            filteredRecipes.map((r, idx) => {
              const isSelected = value && r.code?.toUpperCase() === value.toUpperCase();
              const isHighlighted = idx === highlightedIndex;

              return (
                <div
                  key={r.code || idx}
                  data-combobox-idx={idx}
                  onClick={() => handleSelectRecipe(r.code)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-2.5 py-2 rounded-md flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-sky-600 text-white font-bold"
                      : isHighlighted
                      ? "bg-sky-50 text-slate-900 font-semibold"
                      : "text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-white shrink-0" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                    <span className="font-mono text-xs font-bold truncate">
                      {r.code}
                    </span>
                  </div>

                  <div
                    className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? "text-sky-100 bg-sky-700/60 border-sky-500"
                        : "text-slate-500 bg-slate-100 border-slate-200"
                    }`}
                  >
                    {r.tapeType || "PP"}
                    {r.colour ? ` • ${r.colour}` : ""}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
