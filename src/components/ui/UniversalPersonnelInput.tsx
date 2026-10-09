"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronDown, X, Check, Sparkles, Loader2, User, Building, Plus } from "lucide-react";

export interface PersonnelItem {
  id?: string;
  name: string;
  code?: string | null;
  section?: string | null;
  designation?: string | null;
  phone?: string | null;
  type?: "operator" | "contractor" | "supervisor";
}

// Module-level caches
let cachedOperators: PersonnelItem[] | null = null;
let cachedContractors: PersonnelItem[] | null = null;
let cachedSupervisors: PersonnelItem[] | null = null;

let operatorPromise: Promise<PersonnelItem[]> | null = null;
let contractorPromise: Promise<PersonnelItem[]> | null = null;
let supervisorPromise: Promise<PersonnelItem[]> | null = null;

export async function fetchPersonnel(
  type: "operator" | "contractor" | "supervisor"
): Promise<PersonnelItem[]> {
  if (type === "operator") {
    if (cachedOperators) return cachedOperators;
    if (operatorPromise) return operatorPromise;
    operatorPromise = fetch("/api/data-centre/operators?activeOnly=true")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        const raw = Array.isArray(json?.data) ? json.data : [];
        const items: PersonnelItem[] = raw.map((r: any) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          section: r.section,
          designation: r.designation,
          phone: r.phone,
          type: "operator",
        }));
        cachedOperators = items;
        return items;
      })
      .catch(() => [])
      .finally(() => {
        operatorPromise = null;
      });
    return operatorPromise;
  }

  if (type === "contractor") {
    if (cachedContractors) return cachedContractors;
    if (contractorPromise) return contractorPromise;
    contractorPromise = fetch("/api/data-centre/contractors?activeOnly=true")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        const raw = Array.isArray(json?.data) ? json.data : [];
        const items: PersonnelItem[] = raw.map((r: any) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          section: r.section,
          phone: r.phone,
          type: "contractor",
        }));
        cachedContractors = items;
        return items;
      })
      .catch(() => [])
      .finally(() => {
        contractorPromise = null;
      });
    return contractorPromise;
  }

  if (type === "supervisor") {
    if (cachedSupervisors) return cachedSupervisors;
    if (supervisorPromise) return supervisorPromise;
    supervisorPromise = fetch("/api/data-centre/supervisors?activeOnly=true")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        const raw = Array.isArray(json?.data) ? json.data : [];
        const items: PersonnelItem[] = raw.map((r: any) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          section: r.department,
          phone: r.phone,
          type: "supervisor",
        }));
        cachedSupervisors = items;
        return items;
      })
      .catch(() => [])
      .finally(() => {
        supervisorPromise = null;
      });
    return supervisorPromise;
  }

  return [];
}

export interface UniversalPersonnelInputProps {
  value: string;
  onChange: (name: string, selectedItem?: PersonnelItem) => void;
  type?: "operator" | "contractor" | "supervisor";
  section?: string;
  options?: (string | PersonnelItem)[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  compact?: boolean;
  allowManualTyping?: boolean;
  showClearButton?: boolean;
  showChevron?: boolean;
  title?: string;
  id?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
}

export function UniversalPersonnelInput({
  value,
  onChange,
  type = "operator",
  section,
  options,
  placeholder,
  className = "",
  inputClassName = "",
  dropdownClassName = "",
  disabled = false,
  compact = false,
  allowManualTyping = true,
  showClearButton = true,
  showChevron = true,
  title,
  id,
  onAddNew,
  addNewLabel,
}: UniversalPersonnelInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || "");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [loadedItems, setLoadedItems] = useState<PersonnelItem[]>([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const defaultPlaceholder =
    placeholder ||
    (type === "contractor"
      ? "— Select / Type Contractor —"
      : type === "supervisor"
      ? "— Select / Type Supervisor —"
      : "— Select / Type Operator —");

  // Fetch personnel if options not explicitly provided
  useEffect(() => {
    if (options && options.length > 0) {
      setLoadedItems(
        options.map((opt) => (typeof opt === "string" ? { name: opt } : opt))
      );
      return;
    }

    let isMounted = true;
    setLoading(true);
    fetchPersonnel(type).then((items) => {
      if (!isMounted) return;
      if (section && section !== "ALL") {
        setLoadedItems(
          items.filter(
            (i) =>
              !i.section ||
              i.section.toUpperCase() === "ALL" ||
              i.section.toUpperCase().includes(section.toUpperCase())
          )
        );
      } else {
        setLoadedItems(items);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [type, section, options]);

  // Sync internal search query with value when not focused
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(value || "");
    }
  }, [value, isOpen]);

  // Auto-flip upward if viewport space below is tight
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < 240 && spaceAbove > spaceBelow);
    }
  }, [isOpen]);

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

  // Filter items based on active search query
  const filteredItems = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return loadedItems;
    }
    const q = searchQuery.trim().toLowerCase();
    return loadedItems.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const code = (item.code || "").toLowerCase();
      const desig = (item.designation || "").toLowerCase();
      return name.includes(q) || code.includes(q) || desig.includes(q);
    });
  }, [loadedItems, searchQuery]);

  // Auto-scroll highlighted into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.querySelector(
        `[data-personnel-idx="${highlightedIndex}"]`
      ) as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectItem = useCallback(
    (item: PersonnelItem | string) => {
      const selected = typeof item === "string" ? { name: item } : item;
      onChange(selected.name, selected);
      setSearchQuery(selected.name);
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
          filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((prev) =>
          filteredItems.length > 0
            ? (prev - 1 + filteredItems.length) % filteredItems.length
            : 0
        );
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (filteredItems.length > 0 && filteredItems[highlightedIndex]) {
          handleSelectItem(filteredItems[highlightedIndex]);
        } else if (searchQuery.trim()) {
          handleSelectItem(searchQuery.trim());
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
        if (allowManualTyping && searchQuery !== value) {
          onChange(searchQuery);
        }
        return;
      }
    } else {
      if (e.key === "Enter" || (e.altKey && e.key === "ArrowDown")) {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!isOpen) setIsOpen(true);
    setHighlightedIndex(0);

    if (allowManualTyping) {
      const match = loadedItems.find(
        (i) => i.name.toLowerCase() === val.trim().toLowerCase()
      );
      onChange(val, match);
    }
  };

  const handleInputBlur = () => {
    if (allowManualTyping && searchQuery !== value) {
      const match = loadedItems.find(
        (i) => i.name.toLowerCase() === searchQuery.trim().toLowerCase()
      );
      onChange(searchQuery, match);
    }
  };

  const isExactMatch = useMemo(() => {
    return loadedItems.some(
      (i) => i.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );
  }, [loadedItems, searchQuery]);

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
          placeholder={defaultPlaceholder}
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
              : "text-slate-900 font-semibold"
          } ${inputClassName}`}
        />

        <div className="absolute right-1 flex items-center gap-0.5">
          {loading && !searchQuery && (
            <Loader2 className="w-3 h-3 text-slate-400 animate-spin mr-0.5" />
          )}

          {showClearButton && searchQuery ? (
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

          {showChevron && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setIsOpen((prev) => !prev);
                inputRef.current?.focus();
              }}
              title="Toggle list"
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
          className={`absolute left-0 z-50 w-full min-w-[240px] max-w-[360px] max-h-64 overflow-y-auto bg-white rounded-lg border border-slate-300 shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100 ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          } ${dropdownClassName}`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t flex items-center justify-between mb-1 border-b pb-1">
            <span>
              {loading
                ? "Loading..."
                : `${type.toUpperCase()}S (${filteredItems.length})`}
            </span>
            <span className="text-[9px] text-slate-400 font-normal">
              ↑↓ Pick • Enter
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-3 text-center text-slate-500">
              <p className="text-xs">No registered {type} found.</p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => handleSelectItem(searchQuery.trim())}
                  className="mt-2 w-full px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 rounded border border-sky-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
                  <span className="truncate">
                    Use &ldquo;{searchQuery.trim()}&rdquo; as Manual {type}
                  </span>
                </button>
              )}
              {onAddNew && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onAddNew();
                  }}
                  className="mt-1.5 w-full px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 rounded border border-dashed border-sky-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>
                    {addNewLabel ||
                      `+ Register New ${type.charAt(0).toUpperCase() + type.slice(1)}...`}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredItems.map((item, idx) => {
                const isSelected = value && item.name.toLowerCase() === value.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${item.id || item.name}-${idx}`}
                    data-personnel-idx={idx}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-2.5 py-2 rounded-md flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-sky-600 text-white font-bold"
                        : isHighlighted
                        ? "bg-sky-50 text-slate-900 font-semibold"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : type === "contractor" ? (
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="text-xs font-semibold truncate">
                          {item.name}
                        </span>
                        {item.designation && (
                          <span
                            className={`block text-[10px] truncate ${
                              isSelected ? "text-sky-100" : "text-slate-400"
                            }`}
                          >
                            {item.designation}
                          </span>
                        )}
                      </div>
                    </div>

                    {(item.code || item.section) && (
                      <div
                        className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? "text-sky-100 bg-sky-700/60 border-sky-500"
                            : "text-slate-500 bg-slate-100 border-slate-200"
                        }`}
                      >
                        {item.code || item.section}
                      </div>
                    )}
                  </div>
                );
              })}

              {searchQuery.trim() && !isExactMatch && (
                <div className="mt-1 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSelectItem(searchQuery.trim())}
                    className="w-full text-left px-2.5 py-1.5 rounded text-[11px] font-semibold text-sky-700 hover:bg-sky-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-sky-500 shrink-0" />
                    <span className="truncate">
                      Use &ldquo;{searchQuery.trim()}&rdquo; as Manual {type}
                    </span>
                  </button>
                </div>
              )}

              {onAddNew && (
                <div className="mt-1 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded text-[11px] font-bold text-sky-700 hover:bg-sky-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>
                      {addNewLabel ||
                        `+ Register New ${type.charAt(0).toUpperCase() + type.slice(1)}...`}
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

export default UniversalPersonnelInput;
