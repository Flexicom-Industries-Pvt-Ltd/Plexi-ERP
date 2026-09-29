"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, X, Check, Sparkles } from "lucide-react";
import { filterQualities, normalizeQualityName } from "@/lib/lamination/quality-filter";

export interface QualityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  qualities: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function QualityAutocomplete({
  value,
  onChange,
  qualities,
  placeholder = "Type Quality Name...",
  className = "",
  disabled = false,
}: QualityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync internal search query when external value changes and dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(value || "");
    }
  }, [value, isOpen]);

  // Click outside to dismiss dropdown
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

  // Filter qualities based on active input query
  const filteredQualities = useMemo(() => {
    return filterQualities(qualities, searchQuery);
  }, [qualities, searchQuery]);

  // Scroll highlighted item into view automatically
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedEl = listRef.current.querySelector(
        `[data-quality-idx="${highlightedIndex}"]`
      ) as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectQuality = (selected: string) => {
    const clean = normalizeQualityName(selected);
    onChange(clean);
    setSearchQuery(clean);
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
          filteredQualities.length > 0 ? (prev + 1) % filteredQualities.length : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((prev) =>
          filteredQualities.length > 0
            ? (prev - 1 + filteredQualities.length) % filteredQualities.length
            : 0
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (filteredQualities[highlightedIndex]) {
          handleSelectQuality(filteredQualities[highlightedIndex]);
        } else if (searchQuery.trim()) {
          handleSelectQuality(searchQuery.trim().toUpperCase());
        } else {
          setIsOpen(false);
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
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
    }
  };

  const isExactMatchInFiltered = filteredQualities.some(
    (q) => q.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? "z-50" : "z-10"} ${className}`}
    >
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchQuery}
          placeholder={placeholder}
          onFocus={() => {
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
            onChange(val);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full h-8 pl-2 pr-12 text-xs font-semibold rounded border transition-colors outline-none ${
            isOpen
              ? "border-sky-500 ring-2 ring-sky-400/20 bg-white text-slate-900"
              : "border-slate-200 hover:border-slate-300 bg-transparent focus:bg-white text-slate-800"
          }`}
        />

        <div className="absolute right-1 flex items-center gap-0.5">
          {searchQuery ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              title="Clear quality"
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
            title="Toggle qualities"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isOpen ? "rotate-180 text-sky-600" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 top-full mt-1 z-50 w-full min-w-[240px] max-w-[340px] max-h-64 overflow-y-auto bg-white rounded-lg border border-slate-300 shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t flex items-center justify-between mb-1 border-b border-slate-200">
            <span>Qualities ({filteredQualities.length})</span>
            <span className="text-[9px] text-slate-400 font-normal">
              Type to filter • ↑↓ Enter
            </span>
          </div>

          {filteredQualities.length === 0 ? (
            <div className="p-3 text-center text-slate-500">
              <p className="text-xs">No matching qualities found.</p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelectQuality(searchQuery.trim().toUpperCase())}
                  className="mt-2 w-full px-2.5 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded border border-sky-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className="truncate">
                    Use &ldquo;{searchQuery.trim().toUpperCase()}&rdquo; as Quality
                  </span>
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredQualities.map((q, idx) => {
                const isSelected = value && q.toUpperCase() === value.toUpperCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${q}-${idx}`}
                    data-quality-idx={idx}
                    onClick={() => handleSelectQuality(q)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-2.5 py-1.5 rounded-md flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-sky-600 text-white font-bold"
                        : isHighlighted
                        ? "bg-sky-50 text-sky-900 font-semibold border-l-2 border-sky-500"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <span className="font-medium text-xs truncate">{q}</span>
                    </div>
                  </div>
                );
              })}

              {/* If user typed something custom not exactly in the list, offer quick action */}
              {searchQuery.trim() && !isExactMatchInFiltered && (
                <div className="mt-1 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectQuality(searchQuery.trim().toUpperCase())}
                    className="w-full text-left px-2.5 py-1.5 rounded text-[11px] font-semibold text-sky-700 hover:bg-sky-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
                    <span className="truncate">
                      Use &ldquo;{searchQuery.trim().toUpperCase()}&rdquo; as Custom
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
