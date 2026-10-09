"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronDown, X, Check, Sparkles, Loader2 } from "lucide-react";

export interface UniversalQualityOption {
  code: string;
  label?: string | null;
  tapeType?: string | null;
  colour?: string | null;
  colorGroup?: string | null;
  denier?: number | string | null;
  size?: string | null;
  reedSpaceCm?: number | null;
  recipeGroup?: string | null;
  remarks?: string | null;
  source?: "recipe" | "loom_mapping" | "party_printing" | "production";
}

// Module-level cache to prevent multiple fetches across 50+ table rows
let cachedQualities: UniversalQualityOption[] | null = null;
let activeFetchPromise: Promise<UniversalQualityOption[]> | null = null;

export async function fetchUniversalQualities(): Promise<UniversalQualityOption[]> {
  if (cachedQualities && cachedQualities.length > 0) {
    return cachedQualities;
  }
  if (activeFetchPromise) {
    return activeFetchPromise;
  }
  activeFetchPromise = (async () => {
    try {
      const res = await fetch("/api/data-centre/qualities");
      if (!res.ok) throw new Error("Failed to load Data Centre qualities");
      const json = await res.json();
      const list = Array.isArray(json?.qualities) ? json.qualities : [];
      cachedQualities = list;
      return list;
    } catch (err) {
      console.warn("UniversalQualityInput: could not fetch data-centre qualities:", err);
      return [];
    } finally {
      activeFetchPromise = null;
    }
  })();
  return activeFetchPromise;
}

export function useDataCentreQualities(externalOptions?: (string | UniversalQualityOption)[]): {
  qualities: UniversalQualityOption[];
  loading: boolean;
} {
  const [qualities, setQualities] = useState<UniversalQualityOption[]>(() => {
    if (externalOptions && externalOptions.length > 0) {
      return normalizeOptions(externalOptions);
    }
    return cachedQualities || [];
  });
  const [loading, setLoading] = useState<boolean>(!cachedQualities && (!externalOptions || externalOptions.length === 0));

  useEffect(() => {
    if (externalOptions && externalOptions.length > 0) {
      setQualities(normalizeOptions(externalOptions));
      setLoading(false);
      return;
    }
    if (cachedQualities && cachedQualities.length > 0) {
      setQualities(cachedQualities);
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    fetchUniversalQualities().then((data) => {
      if (isMounted) {
        setQualities(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [externalOptions]);

  return { qualities, loading };
}

function normalizeOptions(opts: (string | UniversalQualityOption)[]): UniversalQualityOption[] {
  return opts.map((opt) => {
    if (typeof opt === "string") {
      return { code: opt };
    }
    return opt;
  });
}

export interface UniversalQualityInputProps {
  value: string;
  onChange: (value: string, selectedOption?: UniversalQualityOption) => void;
  options?: (string | UniversalQualityOption)[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  gridCellId?: string;
  rowIndex?: number;
  colIndex?: number;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onGridKeyDown?: (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
  allowManualTyping?: boolean;
  showClearButton?: boolean;
  showChevron?: boolean;
  compact?: boolean;
  title?: string;
  id?: string;
}

export function UniversalQualityInput({
  value,
  onChange,
  options,
  placeholder = "— Select / Type Quality —",
  className = "",
  inputClassName = "",
  dropdownClassName = "",
  disabled = false,
  gridCellId,
  rowIndex = 0,
  colIndex = 0,
  onFocus,
  onBlur,
  onGridKeyDown,
  allowManualTyping = true,
  showClearButton = true,
  showChevron = true,
  compact = false,
  title,
  id,
}: UniversalQualityInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-flip upward if viewport space below is tight
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < 260 && spaceAbove > spaceBelow);
    }
  }, [isOpen]);

  // Load qualities from options or Data Centre API
  const { qualities: masterQualities, loading: masterLoading } = useDataCentreQualities(options);

  // Sync internal search query with value when not focused / open
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

  // Filter master qualities based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return masterQualities;
    }
    const q = searchQuery.trim().toLowerCase();
    return masterQualities.filter((item) => {
      const code = (item.code || "").toLowerCase();
      const label = (item.label || "").toLowerCase();
      const tapeType = (item.tapeType || "").toLowerCase();
      const colour = (item.colour || "").toLowerCase();
      const colorGroup = (item.colorGroup || "").toLowerCase();
      const denier = item.denier ? String(item.denier).toLowerCase() : "";
      const size = (item.size || "").toLowerCase();
      const recipeGroup = (item.recipeGroup || "").toLowerCase();
      return (
        code.includes(q) ||
        label.includes(q) ||
        tapeType.includes(q) ||
        colour.includes(q) ||
        colorGroup.includes(q) ||
        denier.includes(q) ||
        size.includes(q) ||
        recipeGroup.includes(q)
      );
    });
  }, [masterQualities, searchQuery]);

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.querySelector(
        `[data-quality-idx="${highlightedIndex}"]`
      ) as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectOption = useCallback(
    (opt: UniversalQualityOption | string) => {
      const selected = typeof opt === "string" ? { code: opt } : opt;
      onChange(selected.code, selected);
      setSearchQuery(selected.code);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setSearchQuery("");
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((prev) =>
          filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((prev) =>
          filteredOptions.length > 0
            ? (prev - 1 + filteredOptions.length) % filteredOptions.length
            : 0
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        } else if (searchQuery.trim()) {
          handleSelectOption(searchQuery.trim());
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
        // If there is an exact or single match or typed text, commit on tab
        if (allowManualTyping && searchQuery !== value) {
          onChange(searchQuery);
        }
        return;
      }
    } else {
      // If dropdown is closed:
      if (e.key === "Enter" || (e.altKey && e.key === "ArrowDown")) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }

      // Delegate to parent Excel-like spreadsheet grid navigation
      if (onGridKeyDown) {
        onGridKeyDown(e, rowIndex, colIndex);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!isOpen) setIsOpen(true);
    setHighlightedIndex(0);

    // Live update parent if manual typing allowed
    if (allowManualTyping) {
      const match = masterQualities.find(
        (m) => m.code.toLowerCase() === val.trim().toLowerCase()
      );
      onChange(val, match);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (allowManualTyping && searchQuery !== value) {
      const match = masterQualities.find(
        (m) => m.code.toLowerCase() === searchQuery.trim().toLowerCase()
      );
      onChange(searchQuery, match);
    }
    onBlur?.(e);
  };

  const isExactMatch = useMemo(() => {
    return masterQualities.some(
      (m) => m.code.toLowerCase() === searchQuery.trim().toLowerCase()
    );
  }, [masterQualities, searchQuery]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? "z-50" : "z-10"} ${className}`}
      title={title}
    >
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          id={id}
          type="text"
          disabled={disabled}
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
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className={`w-full outline-none transition-colors ${
            compact ? "h-7 text-xs px-2 pr-12" : "h-8.5 text-xs px-2.5 pr-14"
          } rounded border ${
            isOpen
              ? "border-sky-500 ring-2 ring-sky-400/20 bg-white"
              : "border-slate-300 hover:border-slate-400 bg-white"
          } ${
            !value && !searchQuery
              ? "text-slate-400 italic font-normal"
              : "text-slate-900 font-bold font-mono"
          } ${inputClassName}`}
        />

        <div className="absolute right-1 flex items-center gap-0.5">
          {masterLoading && !searchQuery && (
            <Loader2 className="w-3 h-3 text-slate-400 animate-spin mr-0.5" />
          )}

          {showClearButton && searchQuery ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              title="Clear quality selection"
              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}

          {showChevron && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }}
              title="Toggle quality list"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  isOpen ? "rotate-180 text-sky-600" : ""
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className={`absolute left-0 z-50 w-full min-w-[280px] max-w-[420px] max-h-72 overflow-y-auto bg-white rounded-lg border border-slate-300 shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100 ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          } ${dropdownClassName}`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t flex items-center justify-between mb-1 border-b pb-1">
            <span>
              {masterLoading ? "Loading Qualities..." : `Qualities (${filteredOptions.length})`}
            </span>
            <span className="text-[9px] text-slate-400 font-normal">
              ↑↓ Navigate • Enter Pick
            </span>
          </div>

          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-slate-500">
              <p className="text-xs">No predefined quality found.</p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelectOption(searchQuery.trim())}
                  className="mt-2 w-full px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded border border-sky-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className="truncate">
                    Use &ldquo;{searchQuery.trim()}&rdquo; as Custom Quality
                  </span>
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredOptions.map((opt, idx) => {
                const isSelected = value && opt.code.toLowerCase() === value.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${opt.code}-${idx}`}
                    data-quality-idx={idx}
                    onClick={() => handleSelectOption(opt)}
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
                        <span className="w-3.5 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-mono text-xs font-bold truncate">
                          {opt.code}
                        </span>
                        {opt.label && (
                          <span
                            className={`block text-[10px] truncate ${
                              isSelected ? "text-sky-100" : "text-slate-400"
                            }`}
                          >
                            {opt.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {(opt.tapeType || opt.colour || opt.denier || opt.size) && (
                      <div
                        className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? "text-sky-100 bg-sky-700/60 border-sky-500"
                            : "text-slate-600 bg-slate-100 border-slate-200"
                        }`}
                      >
                        {[
                          opt.tapeType,
                          opt.colour,
                          opt.denier ? `${opt.denier}D` : null,
                          opt.size,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Quick option to confirm typed text if not an exact match */}
              {searchQuery.trim() && !isExactMatch && (
                <div className="mt-1 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectOption(searchQuery.trim())}
                    className="w-full text-left px-2.5 py-1.5 rounded text-[11px] font-semibold text-sky-700 hover:bg-sky-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
                    <span className="truncate">
                      Use &ldquo;{searchQuery.trim()}&rdquo; as Custom Quality
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

export default UniversalQualityInput;
