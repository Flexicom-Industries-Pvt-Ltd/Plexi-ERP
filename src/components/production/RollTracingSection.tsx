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
  AlertCircle,
  FileText,
  Weight,
  Ruler,
  Factory,
  Sparkles,
  ExternalLink,
  RefreshCw,
  ScanLine,
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
    <div className="space-y-5 max-w-7xl mx-auto px-1 sm:px-3 py-2 print:p-0 font-sans">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-100/80 shrink-0">
              <ScanLine className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Roll Tracing
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60">
                  Manufacturing Traveler
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Full lifecycle genealogy: Loom Section → Lamination → Printing → Convertex / Valvomatic.
              </p>
            </div>
          </div>

          {traceData?.found && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg border border-slate-200 hover:border-slate-300 shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4 text-sky-600" />
                <span>Print Roll Traveler</span>
              </button>
            </div>
          )}
        </div>

        {/* Minimalist Search & Roll Input Form */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Roll Number (e.g. CT-14376, ROL-202611-00001)..."
                className="w-full pl-10 pr-4 py-2 text-xs font-mono bg-slate-50/60 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 shadow-2xs"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" />
                    <span>Trace Roll</span>
                  </>
                )}
              </button>
              {searchInput && searchInput !== activeRoll && (
                <button
                  type="button"
                  onClick={() => setSearchInput(activeRoll)}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs transition-colors"
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
                      className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all whitespace-nowrap border flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-sky-50 text-sky-700 border-sky-300 font-semibold shadow-2xs ring-1 ring-sky-200"
                          : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      <span>{r.rollNumber}</span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded font-sans font-medium ${
                          isSelected ? "bg-sky-200/70 text-sky-800" : "bg-slate-100 text-slate-500"
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
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
          <RefreshCw className="h-6 w-6 text-sky-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Retrieving manufacturing traveler data...</p>
          <p className="text-xs text-slate-400 mt-1">Cross-referencing Loom, Lamination, Printing, and Bag Conversion records</p>
        </div>
      ) : !traceData ? (
        <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
          <Layers className="h-9 w-9 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Roll Selected</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Enter a roll number above or select one from the recent list to view its complete production genealogy.
          </p>
        </div>
      ) : !traceData.found ? (
        <div className="bg-white border border-rose-200/80 rounded-xl p-10 text-center shadow-xs">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Roll Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No records matched roll number <code className="font-mono font-bold text-slate-700">&quot;{activeRoll}&quot;</code> across Loom, Lamination, Printing, or Bag Conversion.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Roll Master Overview Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                  <FileText className="h-4 w-4" />
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
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                  {traceData.currentStageLabel}
                </span>
              </div>
            </div>

            {/* 5 Bento Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Fabric Quality
                </span>
                <div className="text-base font-bold text-slate-900 mt-1 truncate" title={traceData.specs.qualityType}>
                  {traceData.specs.qualityType || "—"}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Fabric Width
                  </span>
                  <div className="p-1 rounded bg-slate-50 text-slate-500">
                    <Ruler className="h-3 w-3" />
                  </div>
                </div>
                <div className="text-base font-bold font-mono text-slate-900 mt-1">
                  {traceData.specs.widthMm ? `${traceData.specs.widthMm} mm` : "—"}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-sky-700 uppercase tracking-wider">
                    Cut Length
                  </span>
                  <div className="p-1 rounded bg-sky-50 text-sky-600">
                    <Ruler className="h-3 w-3" />
                  </div>
                </div>
                <div className="text-base font-bold font-mono text-sky-700 mt-1">
                  {traceData.specs.initialMeters ? `${traceData.specs.initialMeters.toLocaleString()} m` : "—"}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                    Net Weight
                  </span>
                  <div className="p-1 rounded bg-emerald-50 text-emerald-600">
                    <Weight className="h-3 w-3" />
                  </div>
                </div>
                <div className="text-base font-bold font-mono text-emerald-700 mt-1">
                  {traceData.specs.initialNettWeightKg ? `${traceData.specs.initialNettWeightKg.toFixed(2)} kg` : "—"}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">
                    Avg Density
                  </span>
                  <div className="p-1 rounded bg-purple-50 text-purple-600">
                    <Sparkles className="h-3 w-3" />
                  </div>
                </div>
                <div className="text-base font-bold font-mono text-purple-700 mt-1">
                  {traceData.specs.avgWeightPerMeter ? `${traceData.specs.avgWeightPerMeter.toFixed(2)} g/m` : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Minimalist Process Flow Stepper */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Process Traveler Flow
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {traceData.timeline.filter((s) => s.status === "COMPLETED").length} of 4 Stages Completed
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {traceData.timeline.map((stage, idx) => {
                const isComplete = stage.status === "COMPLETED";
                const isCurrent = stage.status === "CURRENT";
                return (
                  <div
                    key={stage.stage}
                    className={`p-3 rounded-lg border transition-all ${
                      isComplete
                        ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                        : isCurrent
                        ? "bg-sky-50/60 border-sky-300 ring-1 ring-sky-200 text-sky-950"
                        : "bg-slate-50/50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-400 uppercase text-[10px]">
                        Stage {idx + 1}
                      </span>
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </span>
                      ) : isCurrent ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-sky-600 text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Pending</span>
                      )}
                    </div>
                    <div className="text-xs font-bold truncate">
                      {stage.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Stage Genealogy Cards */}
          <div className="space-y-3.5">
            {traceData.timeline.map((step, idx) => {
              const isComplete = step.status === "COMPLETED";
              const isCurrent = step.status === "CURRENT";
              const isPending = step.status === "PENDING";
              const hasDetails = Object.keys(step.details || {}).length > 0;

              return (
                <div
                  key={step.stage}
                  className={`bg-white border rounded-xl overflow-hidden shadow-xs transition-all ${
                    isComplete
                      ? "border-slate-200/80"
                      : isCurrent
                      ? "border-sky-300 ring-1 ring-sky-100"
                      : "border-slate-200/70"
                  }`}
                >
                  {/* Stage Card Header */}
                  <div className="px-4 py-3 bg-slate-50/40 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          isComplete
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : isCurrent
                            ? "bg-sky-100 text-sky-700 border border-sky-200"
                            : "bg-slate-100 text-slate-400 border border-slate-200"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                        {step.title}
                      </h3>
                      {step.operatorOrSupervisor && (
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          • In-charge: <strong className="text-slate-600 font-semibold">{step.operatorOrSupervisor}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {step.date && (
                        <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {step.date} {step.shift ? `(${step.shift})` : ""}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isComplete
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isCurrent
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}
                      >
                        {isComplete ? "Completed" : isCurrent ? "Active Stage" : "Awaiting Processing"}
                      </span>
                    </div>
                  </div>

                  {/* Stage Card Body */}
                  <div className="p-4 bg-white">
                    {!hasDetails || isPending ? (
                      <div className="text-xs text-slate-400 flex items-center gap-2 py-1">
                        <Clock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <span>Awaiting roll receipt and processing in {step.title}.</span>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
                          {Object.entries(step.details).map(([k, v]) => {
                            if (k === "photoAvailable" || k === "photoUrl" || v === null || v === undefined) return null;
                            const label = k.replace(/([A-Z])/g, " $1");
                            return (
                              <div
                                key={k}
                                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
                              >
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                                  {label}
                                </span>
                                <span className="text-xs font-bold text-slate-800 font-mono mt-0.5 block truncate" title={String(v)}>
                                  {String(v)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Scale Reading Photo Thumbnail (Loom Section) */}
                        {step.details?.photoUrl && (
                          <div className="pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto(step.details.photoUrl)}
                              className="inline-flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-sky-300 transition-all cursor-pointer shadow-2xs group"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={step.details.photoUrl}
                                alt="Scale reading evidence"
                                className="h-12 w-16 object-cover rounded border border-slate-200"
                              />
                              <div className="text-left">
                                <span className="text-xs font-semibold text-slate-700 group-hover:text-sky-600 flex items-center gap-1 transition-colors">
                                  Scale Reading Evidence
                                  <ExternalLink className="h-3 w-3 text-slate-400" />
                                </span>
                                <span className="text-[11px] text-slate-400 block">Click to view calibrated scale capture</span>
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
                <Camera className="h-4 w-4 text-sky-600" />
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
              <span className="text-xs text-slate-500 font-mono">Roll #{activeRoll}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
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
