"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check, Package, Search, Plus, Layers } from "lucide-react";
import { AvailableLaminationRoll } from "@/lib/lamination/lamination-types";

export interface UniversalRollSelectorProps {
  value: string; // The selected rollNumber
  availableRolls: AvailableLaminationRoll[];
  alreadySelectedRollNumbers?: string[];
  onChange: (rollNumber: string, selectedRoll?: AvailableLaminationRoll) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function UniversalRollSelector({
  value,
  availableRolls,
  alreadySelectedRollNumbers = [],
  onChange,
  placeholder = "— Select Roll ID —",
  className = "",
  disabled = false,
}: UniversalRollSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [dropdownCoords, setDropdownCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: "bottom" | "top";
  }>({ top: 0, left: 0, width: 340, maxHeight: 300, placement: "bottom" });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update viewport coordinates for Portal dropdown
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const preferredHeight = 320;

    const placement: "bottom" | "top" =
      spaceBelow < preferredHeight && spaceAbove > spaceBelow ? "top" : "bottom";

    const maxAvailableHeight =
      placement === "top"
        ? Math.max(140, Math.min(320, spaceAbove - 16))
        : Math.max(140, Math.min(320, spaceBelow - 16));

    const width = Math.min(Math.max(rect.width, 340), 460);

    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }
    if (left < 12) left = 12;

    const top = placement === "bottom" ? rect.bottom + 4 : rect.top - 4;

    setDropdownCoords({
      top,
      left,
      width,
      maxHeight: maxAvailableHeight,
      placement,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();

    const handleReposition = () => {
      updateDropdownPosition();
    };

    window.addEventListener("scroll", handleReposition, { capture: true, passive: true });
    window.addEventListener("resize", handleReposition, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleReposition, { capture: true });
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen, updateDropdownPosition]);

  // Focus search input when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Find currently selected roll if in availableRolls
  const currentRoll = useMemo(() => {
    if (!value) return null;
    return availableRolls.find(
      (r) => r.rollNumber.toLowerCase() === value.trim().toLowerCase()
    );
  }, [value, availableRolls]);

  // Filter available rolls
  const filteredRolls = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return availableRolls;
    }
    const q = searchQuery.trim().toLowerCase();
    return availableRolls.filter(
      (r) =>
        r.rollNumber.toLowerCase().includes(q) ||
        r.qualityType.toLowerCase().includes(q) ||
        String(r.loomNumber).includes(q) ||
        (r.size && r.size.toLowerCase().includes(q))
    );
  }, [availableRolls, searchQuery]);

  const handleSelect = (roll: AvailableLaminationRoll) => {
    onChange(roll.rollNumber, roll);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const q = searchQuery.trim();
    if (!q) return;
    onChange(q);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-8 px-2.5 rounded-md border text-xs flex items-center justify-between gap-1.5 transition-colors cursor-pointer text-left ${
          value
            ? "bg-sky-50/70 border-sky-300 hover:bg-sky-50 text-sky-950 font-semibold"
            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <Package className={`h-3.5 w-3.5 shrink-0 ${value ? "text-sky-600" : "text-slate-400"}`} />
          {value ? (
            <span className="font-mono font-bold text-sky-900 truncate">
              {value}
            </span>
          ) : (
            <span className="text-slate-400 italic truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
      </button>

      {/* Floating Portaled Dropdown */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={listRef}
            style={{
              position: "fixed",
              top:
                dropdownCoords.placement === "top"
                  ? `${dropdownCoords.top}px`
                  : `${dropdownCoords.top}px`,
              left: `${dropdownCoords.left}px`,
              width: `${dropdownCoords.width}px`,
              transform: dropdownCoords.placement === "top" ? "translateY(-100%)" : "none",
              zIndex: 9999,
            }}
            className="bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Search Header */}
            <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400 ml-1 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredRolls.length > 0) {
                      handleSelect(filteredRolls[0]);
                    } else if (searchQuery.trim()) {
                      handleCustomSubmit();
                    }
                  } else if (e.key === "Escape") {
                    setIsOpen(false);
                  }
                }}
                placeholder="Search Roll #, Quality, Loom..."
                className="w-full text-xs bg-transparent outline-hidden font-medium text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Rolls List */}
            <div
              style={{ maxHeight: `${dropdownCoords.maxHeight - 44}px` }}
              className="overflow-y-auto divide-y divide-slate-100 p-1"
            >
              {filteredRolls.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="text-xs text-slate-500 font-medium">No matching roll found</div>
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleCustomSubmit}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Use Custom &ldquo;{searchQuery.trim()}&rdquo;</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredRolls.map((roll) => {
                  const isSelected =
                    value && roll.rollNumber.toLowerCase() === value.trim().toLowerCase();
                  const isAlreadyUsed =
                    alreadySelectedRollNumbers.includes(roll.rollNumber) && !isSelected;

                  return (
                    <button
                      key={roll.id || roll.rollNumber}
                      type="button"
                      onClick={() => handleSelect(roll)}
                      className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-sky-50 border border-sky-200"
                          : isAlreadyUsed
                          ? "opacity-60 hover:bg-slate-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono font-bold text-xs text-sky-900 bg-sky-100/70 px-1.5 py-0.5 rounded-sm">
                            {roll.rollNumber}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                            Loom #{roll.loomNumber}
                          </span>
                          {isAlreadyUsed && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 rounded-sm">
                              In Sheet
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {roll.qualityType}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {roll.meter.toLocaleString()} m • {roll.nettWeightKg.toFixed(1)} kg • {roll.avgWeightPerMeter.toFixed(1)} g/m
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="h-4 w-4 text-sky-600 shrink-0 mr-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between px-3">
              <span>{availableRolls.length} rolls in circular loom stock</span>
              <span className="font-mono">Esc to close</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
