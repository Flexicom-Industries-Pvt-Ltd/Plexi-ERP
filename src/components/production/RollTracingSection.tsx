"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Check,
  Camera,
  Layers,
  ArrowRight,
  AlertCircle,
  FileText,
  Weight,
  Ruler,
  Factory,
  Sparkles,
  ChevronRight,
  CheckCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { RollTracePrintModal } from "./RollTracePrintModal";
import { RollTraceResult } from "@/lib/production/roll-trace";

interface RollTraceSectionProps {
  initialRollNumber?: string;
}

export function RollTracingSection({ initialRollNumber }: RollTraceSectionProps) {
  const [searchInput, setSearchInput] = useState(initialRollNumber || "");
  const [activeRoll, setActiveRoll] = useState<string>(initialRollNumber || "");
  const [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState<RollTraceResult | null>(null);
  const [recentRolls, setRecentRolls] = useState<any[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const [copied, setCopied] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Fetch recent cut rolls for quick selection
  const fetchRecents = useCallback(async () => {
    try {
      setLoadingRecents(true);
      const res = await fetch("/api/production/trace");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.recentRolls) {
          setRecentRolls(json.data.recentRolls);
          if (!activeRoll && json.data.recentRolls.length > 0) {
            const first = json.data.recentRolls[0].rollNumber;
            setActiveRoll(first);
            setSearchInput(first);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to load recent rolls:", err);
    } finally {
      setLoadingRecents(false);
    }
  }, [activeRoll]);

  useEffect(() => {
    fetchRecents();
  }, [fetchRecents]);

  // Execute trace lookup
  const executeTrace = useCallback(async (rollNumberToTrace: string) => {
    const clean = (rollNumberToTrace || "").trim();
    if (!clean) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/production/trace/${encodeURIComponent(clean)}`);
      if (!res.ok) throw new Error("Failed to trace roll");
      const json = await res.json();
      if (json.data) {
        setTraceData(json.data);
        setActiveRoll(clean);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not retrieve roll genealogy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeRoll) {
      executeTrace(activeRoll);
    }
  }, [activeRoll, executeTrace]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      toast.error("Please enter a roll number");
      return;
    }
    setActiveRoll(searchInput.trim());
  };

  const handleCopyRollNumber = () => {
    if (!activeRoll) return;
    navigator.clipboard.writeText(activeRoll);
    setCopied(true);
    toast.success("Roll number copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-3 print:p-0">
      {/* Top Header Card (Standard System Banner) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs shrink-0">
              <Factory className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Roll Tracing
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Manufacturing Traveler
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Full lifecycle genealogy: Loom Section → Lamination → Printing → Convertex / Valvomatic.
              </p>
            </div>
          </div>

          {traceData?.found && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Roll Traveler</span>
              </button>
            </div>
          )}
        </div>

        {/* Minimalist Search & Roll Input Form */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Roll Number (e.g. CT-14376, DI13614, ROL-202611-00001)..."
                className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-2xs disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <span>Trace Roll</span>
                )}
              </button>
              {searchInput && searchInput !== activeRoll && (
                <button
                  type="button"
                  onClick={() => setSearchInput(activeRoll)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
                >
                  Reset
                </button>
              )}
            </div>
          </form>

          {/* Recently Cut Rolls Pills */}
          <div className="mt-3.5 flex items-center gap-2 overflow-hidden">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Recent:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {loadingRecents ? (
                <span className="text-xs text-slate-400 py-0.5">Loading recent rolls...</span>
              ) : recentRolls.length === 0 ? (
                <span className="text-xs text-slate-400 py-0.5">No recent rolls</span>
              ) : (
                recentRolls.map((r) => {
                  const isSelected = activeRoll.toUpperCase() === r.rollNumber.toUpperCase();
                  return (
                    <button
                      key={r.id || r.rollNumber}
                      type="button"
                      onClick={() => {
                        setSearchInput(r.rollNumber);
                        setActiveRoll(r.rollNumber);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all whitespace-nowrap border flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <span>{r.rollNumber}</span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded font-sans ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        L#{r.loomNumber}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-2xs">
          <RefreshCw className="h-7 w-7 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Retrieving manufacturing traveler data...</p>
          <p className="text-xs text-slate-400 mt-1">Cross-referencing Loom, Lamination, Printing, and Bag Conversion records</p>
        </div>
      ) : !traceData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-2xs">
          <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Roll Selected</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Enter a roll number above or select one from the recent list to view its complete production genealogy.
          </p>
        </div>
      ) : !traceData.found ? (
        <div className="bg-white border border-rose-200 rounded-xl p-10 text-center shadow-2xs">
          <AlertCircle className="h-9 w-9 text-rose-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Roll Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No records matched roll number <code className="font-mono font-bold text-slate-700">&quot;{activeRoll}&quot;</code> across Loom, Lamination, Printing, or Bag Conversion.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Roll Master Overview Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Roll Identification
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                      {traceData.rollNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRollNumber}
                      title="Copy Roll Number"
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${traceData.stageBadgeColor}`}
                >
                  <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                  {traceData.currentStageLabel}
                </span>

                <button
                  type="button"
                  onClick={() => setPrintModalOpen(true)}
                  className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-md shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-600" />
                  <span>Passport Preview</span>
                </button>
              </div>
            </div>

            {/* 5-Metric Bento Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Fabric Quality
                </div>
                <div className="text-base font-bold text-slate-900 mt-1 truncate" title={traceData.specs.qualityType}>
                  {traceData.specs.qualityType || "—"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Ruler className="h-3 w-3 text-slate-500" /> Width
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {traceData.specs.widthMm ? `${traceData.specs.widthMm} mm` : "—"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Ruler className="h-3 w-3 text-slate-500" /> Cut Length
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {traceData.specs.initialMeters ? `${traceData.specs.initialMeters.toLocaleString()} m` : "—"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Weight className="h-3 w-3 text-slate-500" /> Net Weight
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {traceData.specs.initialNettWeightKg ? `${traceData.specs.initialNettWeightKg.toFixed(2)} kg` : "—"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-slate-500" /> Avg Density
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">
                  {traceData.specs.avgWeightPerMeter ? `${traceData.specs.avgWeightPerMeter.toFixed(2)} g/m` : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Minimalist Horizontal Process Pipeline Indicator */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Process Flow Pipeline
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {traceData.timeline.map((stage, idx) => {
                const isComplete = stage.status === "COMPLETED";
                const isCurrent = stage.status === "CURRENT";
                return (
                  <div
                    key={stage.stage}
                    className={`p-3 rounded-lg border transition-all ${
                      isComplete
                        ? "bg-emerald-50/70 border-emerald-200"
                        : isCurrent
                        ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-100"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Stage {idx + 1}
                      </span>
                      {isComplete ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </span>
                      ) : isCurrent ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700">
                          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">Pending</span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {stage.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Stage Genealogy Cards (Standard Minimalist Layout) */}
          <div className="space-y-4">
            {traceData.timeline.map((step, idx) => {
              const isComplete = step.status === "COMPLETED";
              const isCurrent = step.status === "CURRENT";
              const isPending = step.status === "PENDING";
              const hasDetails = Object.keys(step.details || {}).length > 0;

              return (
                <div
                  key={step.stage}
                  className={`bg-white border rounded-xl overflow-hidden shadow-2xs transition-all ${
                    isComplete
                      ? "border-slate-200"
                      : isCurrent
                      ? "border-blue-300 ring-1 ring-blue-100"
                      : "border-slate-200/70 opacity-80"
                  }`}
                >
                  {/* Stage Card Header */}
                  <div className="p-4 sm:px-5 sm:py-3.5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                          isComplete
                            ? "bg-emerald-600 text-white"
                            : isCurrent
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                          {step.title}
                        </h3>
                        {step.operatorOrSupervisor && (
                          <div className="text-[11px] text-slate-500">
                            In-charge: <strong className="text-slate-700">{step.operatorOrSupervisor}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {step.date && (
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-600">
                          {step.date} {step.shift ? `(${step.shift})` : ""}
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          isComplete
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isCurrent
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {isComplete ? "Completed" : isCurrent ? "Active Stage" : "Awaiting Processing"}
                      </span>
                    </div>
                  </div>

                  {/* Stage Card Body */}
                  <div className="p-4 sm:p-5">
                    {!hasDetails || isPending ? (
                      <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
                        <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>Roll has not been processed in {step.title} yet.</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
                          {Object.entries(step.details).map(([k, v]) => {
                            if (k === "photoAvailable" || k === "photoUrl" || v === null || v === undefined) return null;
                            const label = k.replace(/([A-Z])/g, " $1");
                            return (
                              <div
                                key={k}
                                className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-2.5"
                              >
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                                  {label}
                                </div>
                                <div className="font-bold text-slate-900 mt-0.5 truncate" title={String(v)}>
                                  {String(v)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Scale Reading Photo Thumbnail (Loom Section) */}
                        {step.details?.photoUrl && (
                          <div className="pt-3 border-t border-slate-100">
                            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                              <Camera className="h-3.5 w-3.5 text-slate-500" />
                              Physical Scale Reading Photo Evidence:
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto(step.details.photoUrl)}
                              className="group relative inline-flex items-center gap-3 p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={step.details.photoUrl}
                                alt="Scale evidence thumbnail"
                                className="h-14 w-20 object-cover rounded border border-slate-200"
                              />
                              <div className="text-left pr-2">
                                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                  <span>View Scale Photo</span>
                                  <ExternalLink className="h-3 w-3 text-slate-400" />
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Click to enlarge full scale capture
                                </div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl overflow-hidden max-w-2xl w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Camera className="h-4 w-4 text-slate-600" />
                Physical Scale Reading Evidence
              </h4>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewPhoto}
                alt="Enlarged scale evidence"
                className="max-h-[70vh] object-contain rounded"
              />
            </div>
            <div className="p-3 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">Roll #{activeRoll}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Standard Dark-Header Print Traveler Modal */}
      {traceData?.found && (
        <RollTracePrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          data={traceData}
        />
      )}
    </div>
  );
}

export default RollTracingSection;
