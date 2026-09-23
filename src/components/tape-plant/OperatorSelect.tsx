"use client";

import React, { useState, useEffect, useRef } from "react";
import { User, ChevronDown, Check, Plus, Users, Search, X } from "lucide-react";
import Link from "next/link";

export interface OperatorOption {
  id: string;
  name: string;
  code?: string | null;
  section: string;
  designation?: string | null;
  shiftPreference?: string | null;
}

interface OperatorSelectProps {
  value?: string;
  operatorId?: string;
  onChange: (operatorName: string, operatorId?: string) => void;
  section?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function OperatorSelect({
  value = "",
  operatorId,
  onChange,
  section = "TAPE_PLANT",
  label = "Shift Operator",
  placeholder = "Select operating technician...",
  disabled = false,
}: OperatorSelectProps) {
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/data-centre/operators?section=${section}&activeOnly=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: OperatorOption[]) => {
        if (mounted) setOperators(data || []);
      })
      .catch((err) => console.error("Error loading operators:", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [section]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = operators.filter((op) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      op.name.toLowerCase().includes(q) ||
      (op.code && op.code.toLowerCase().includes(q)) ||
      (op.designation && op.designation.toLowerCase().includes(q))
    );
  });

  const selectedOp = operators.find(
    (op) =>
      (operatorId && op.id === operatorId) ||
      (value && op.name.toLowerCase() === value.toLowerCase())
  );

  const handleSelect = (op: OperatorOption) => {
    onChange(op.name, op.id);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 transition-all min-w-[180px] max-w-[240px] ${
          value
            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <User className={`h-3.5 w-3.5 shrink-0 ${value ? "text-primary-foreground" : "text-slate-400"}`} />
          <span className="truncate font-medium">
            {value || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search operator..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-7 pl-8 pr-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none font-medium"
              />
            </div>
          </div>

          {/* List of operators */}
          <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
            {loading ? (
              <div className="p-3 text-center text-xs text-slate-400">Loading operators...</div>
            ) : filtered.length === 0 ? (
              <div className="p-3 text-center space-y-1">
                <p className="text-xs text-slate-500 font-medium">No registered operators</p>
                {search.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(search.trim(), "");
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className="text-[11px] font-bold text-primary hover:underline block mx-auto"
                  >
                    Use &ldquo;{search.trim()}&rdquo; as Operator
                  </button>
                )}
              </div>
            ) : (
              filtered.map((op) => {
                const isSelected =
                  (operatorId && op.id === operatorId) ||
                  (value && op.name.toLowerCase() === value.toLowerCase());
                return (
                  <div
                    key={op.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(op);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{op.name}</span>
                        {op.code && (
                          <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {op.code}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {op.designation || "Operator"} {op.shiftPreference ? `• Shift ${op.shiftPreference}` : ""}
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick link to Data Centre -> Operators */}
          <div className="pt-1.5 px-1 flex items-center justify-between text-[11px]">
            <Link
              href="/dashboard/data-centre/operators"
              target="_blank"
              className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <Users className="h-3 w-3" />
              <span>Manage Operators</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
