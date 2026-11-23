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
  RotateCcw,
  Sparkles,
  AlertCircle,
  FileText,
  Weight,
  Ruler,
  Factory,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface RollTraceSectionProps {
  initialRollNumber?: string;
}

export function RollTracingSection({ initialRollNumber }: RollTraceSectionProps) {
  const [searchInput, setSearchInput] = useState(initialRollNumber || "");
  const [activeRoll, setActiveRoll] = useState<string>(initialRollNumber || "");
  const [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState<any>(null);
  const [recentRolls, setRecentRolls] = useState<any[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const [copied, setCopied] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Fetch recent cut rolls for quick selection
  const fetchRecents = useCallback(async () => {
    try {
      setLoadingRecents(true);
      const res = await fetch("/api/production/trace");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.recentRolls) {
          setRecentRolls(json.data.recentRolls);
          // If no initial roll was passed, pick the first recent roll as default
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

  const handlePrintPassport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4 print:p-0 print:m-0">
      {/* Search Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span className="p-2 bg-primary/10 rounded-lg text-primary">
                <Factory className="h-6 w-6" />
              </span>
              Roll Genealogy & Tracing Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Trace cut rolls from Loom Weaving → Lamination → Printing → Bag Conversion with full physical scale evidence.
            </p>
          </div>

          {traceData?.found && (
            <button
              onClick={handlePrintPassport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors self-start sm:self-auto"
            >
              <Printer className="h-4 w-4" />
              Print Roll Passport
            </button>
          )}
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter Roll Number (e.g. CT-14376, DI13614, ROL-202611-00001)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Tracing...
              </span>
            ) : (
              <span>Trace Roll</span>
            )}
          </button>
        </form>

        {/* Quick Pick: Recent Rolls */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Recently Cut Rolls:
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {loadingRecents ? (
              <div className="text-xs text-slate-400 py-1">Loading recent cut rolls...</div>
            ) : recentRolls.length === 0 ? (
              <div className="text-xs text-slate-400 py-1">No recent roll records found</div>
            ) : (
              recentRolls.map((r) => {
                const isSelected = activeRoll.toUpperCase() === r.rollNumber.toUpperCase();
                return (
                  <button
                    key={r.id || r.rollNumber}
                    onClick={() => {
                      setSearchInput(r.rollNumber);
                      setActiveRoll(r.rollNumber);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap border flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{r.rollNumber}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded font-sans ${isSelected ? "bg-white/20" : "bg-slate-200 text-slate-600"}`}>
                      Loom #{r.loomNumber}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Trace Results View */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <div className="inline-block h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-600">Reconstructing end-to-end roll genealogy...</p>
        </div>
      ) : !traceData ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <Layers className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Roll Selected</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Search a roll number above or select one from the recently cut rolls list to view its complete production genealogy.
          </p>
        </div>
      ) : !traceData.found ? (
        <div className="bg-white border border-rose-200 rounded-xl p-10 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">Roll Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No records matched roll number <code className="font-mono font-bold text-slate-700">&quot;{activeRoll}&quot;</code> in Loom, Lamination, Printing, or Bag Conversion.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Roll Passport Header Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-900 text-white rounded-xl shadow-sm">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Roll Passport</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h2 className="text-2xl font-black font-mono text-slate-900 tracking-tight">{traceData.rollNumber}</h2>
                    <button
                      onClick={handleCopyRollNumber}
                      title="Copy roll number"
                      className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${traceData.stageBadgeColor} flex items-center gap-1.5`}>
                  <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                  {traceData.currentStageLabel}
                </div>
                <div className="text-xs text-slate-500 font-medium border-l border-slate-200 pl-3">
                  Fabric: <span className="font-bold text-slate-800">{traceData.specs.qualityType}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-5">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5 text-sky-600" />
                  Fabric Width
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {traceData.specs.widthMm ? `${traceData.specs.widthMm} mm` : "—"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5 text-blue-600" />
                  Initial Length
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {traceData.specs.initialMeters ? `${traceData.specs.initialMeters.toLocaleString()} m` : "—"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Weight className="h-3.5 w-3.5 text-emerald-600" />
                  Initial Net Wt
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {traceData.specs.initialNettWeightKg ? `${traceData.specs.initialNettWeightKg.toFixed(2)} kg` : "—"}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  Avg Fabric Density
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {traceData.specs.avgWeightPerMeter ? `${traceData.specs.avgWeightPerMeter.toFixed(2)} g/m` : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Timeline: Factory Journey */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              End-to-End Production Genealogy
            </h3>

            <div className="space-y-8 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-200 before:top-3 before:bottom-3">
              {traceData.timeline.map((step: any, idx: number) => {
                const isComplete = step.status === "COMPLETED";
                const isCurrent = step.status === "CURRENT";
                const isPending = step.status === "PENDING";

                return (
                  <div key={step.stage} className="relative flex items-start gap-4 sm:gap-6 pl-1">
                    {/* Stepper Icon */}
                    <div
                      className={`relative z-10 flex items-center justify-center h-9 w-9 rounded-full border-2 transition-colors shrink-0 shadow-sm ${
                        isComplete
                          ? "bg-emerald-500 border-emerald-600 text-white"
                          : isCurrent
                          ? "bg-primary border-primary text-white animate-pulse"
                          : "bg-white border-slate-300 text-slate-300"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : isCurrent ? (
                        <span className="h-3 w-3 bg-white rounded-full" />
                      ) : (
                        <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Content Card */}
                    <div className="flex-1 bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                        <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Phase {idx + 1}
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-0.5">{step.title}</h4>
                        </div>

                        <div className="flex items-center gap-2">
                          {step.date && (
                            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600">
                              📅 {step.date} {step.shift ? `(${step.shift})` : ""}
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                              isComplete
                                ? "bg-emerald-100 text-emerald-800"
                                : isCurrent
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isComplete ? "Completed" : isCurrent ? "Active Stage" : "Pending"}
                          </span>
                        </div>
                      </div>

                      {/* Step Attributes */}
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                        {Object.entries(step.details).map(([k, v]) => {
                          if (k === "photoAvailable" || k === "photoUrl") return null;
                          return (
                            <div key={k} className="bg-white p-2.5 rounded border border-slate-100 shadow-2xs">
                              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                {k.replace(/([A-Z])/g, " $1")}
                              </div>
                              <div className="font-bold text-slate-800 mt-0.5 truncate">{String(v)}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Scale Reading / Physical Photo Thumbnail */}
                      {step.details?.photoUrl && (
                        <div className="mt-4 pt-3 border-t border-slate-200/60">
                          <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5 text-primary" />
                            Physical Roll & Scale Reading Photo Evidence:
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(step.details.photoUrl)}
                            className="group relative inline-block rounded-lg overflow-hidden border border-slate-200 shadow-xs hover:border-primary transition-colors"
                          >
                            <img
                              src={step.details.photoUrl}
                              alt="Physical roll evidence"
                              className="h-20 w-32 object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                              Enlarge Photo
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl overflow-hidden max-w-2xl w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Physical Scale Reading Evidence
              </h4>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center">
              <img
                src={previewPhoto}
                alt="Enlarged evidence"
                className="max-h-[70vh] object-contain rounded"
              />
            </div>
            <div className="p-3 bg-slate-50 text-right">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RollTracingSection;
