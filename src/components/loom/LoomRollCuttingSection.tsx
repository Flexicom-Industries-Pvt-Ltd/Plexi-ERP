"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Printer,
  FileSpreadsheet,
  Scissors,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Building,
  Layers,
  Sparkles,
  X,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  LoomRollCuttingEntryItem,
  LoomRollCuttingReportData,
  RollCuttingKpis,
  RollCuttingContractorSummary,
  RollCuttingQualitySummary,
  computeRollMeters,
  computeRollWeightsAndAvg,
  generateNextRollNumber,
  computeContractorRollSummary,
  computeQualityRollSummary,
} from "@/lib/loom/loom-roll-cutting-types";
import { exportLoomRollCuttingExcel } from "@/lib/loom/loom-roll-cutting-export";
import { LoomRollCuttingPrintModal } from "./LoomRollCuttingPrintModal";
import { UniversalQualityInput } from "@/components/ui/UniversalQualityInput";

interface AvailableQuality {
  code: string;
  colorGroup: string;
  colour: string;
  denier: number | null;
  reedSpaceCm: number | null;
  size: string;
}

interface AvailableShift {
  id: string;
  name: string;
}

interface AvailableOperator {
  id: string;
  name: string;
  employeeCode?: string | null;
  section?: string | null;
  designation?: string | null;
}

interface AvailableContractor {
  id: string;
  name: string;
  code?: string | null;
  section?: string | null;
}

interface AvailableSupervisor {
  id: string;
  name: string;
  code?: string | null;
  department?: string | null;
}

export function LoomRollCuttingSection() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedShift, setSelectedShift] = useState("Day Shift");
  const [supervisorName, setSupervisorName] = useState("");
  const [reportStatus, setReportStatus] = useState("DRAFT");
  const [reportRemarks, setReportRemarks] = useState("");

  const [entries, setEntries] = useState<LoomRollCuttingEntryItem[]>([]);
  const [availableQualities, setAvailableQualities] = useState<AvailableQuality[]>([]);
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [availableOperators, setAvailableOperators] = useState<AvailableOperator[]>([]);
  const [availableContractors, setAvailableContractors] = useState<AvailableContractor[]>([]);
  const [availableSupervisors, setAvailableSupervisors] = useState<AvailableSupervisor[]>([]);
  const [loomAllocations, setLoomAllocations] = useState<Record<number, { qualityCode: string; size: string; denier: string }>>({});
  const [suggestedRollNumber, setSuggestedRollNumber] = useState("CT-14376");
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Quick contractor modal state
  const [quickContractorModalOpen, setQuickContractorModalOpen] = useState(false);
  const [quickContractorName, setQuickContractorName] = useState("");
  const [quickContractorCode, setQuickContractorCode] = useState("");
  const [quickContractorPhone, setQuickContractorPhone] = useState("");
  const [quickContractorSaving, setQuickContractorSaving] = useState(false);
  const [targetEntryIndexForNewContractor, setTargetEntryIndexForNewContractor] = useState<number | null>(null);

  const latestPayloadRef = useRef<any>(null);
  const lastSavedPayloadRef = useRef<string>("");
  const isInitialMountRef = useRef<boolean>(true);

  // Fetch report data
  const fetchData = useCallback(async () => {
    setLoading(true);
    isInitialMountRef.current = true;
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        shiftName: selectedShift,
        _t: String(Date.now()),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/production/loom/roll-cutting?${params.toString()}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });

      if (!res.ok) throw new Error("Failed to load Roll Cutting Report");
      const json = await res.json();

      const report = json.report || {};
      const fetchedEntries: LoomRollCuttingEntryItem[] = json.entries || [];
      const supName = report.supervisorName || "";
      const status = report.status || "DRAFT";
      const remarks = report.remarks || "";

      setSupervisorName(supName);
      setReportStatus(status);
      setReportRemarks(remarks);
      setEntries(fetchedEntries);
      setAvailableQualities(json.availableQualities || []);
      setAvailableShifts(json.availableShifts || []);
      setAvailableOperators(json.availableOperators || []);
      setAvailableContractors(json.availableContractors || []);
      setAvailableSupervisors(json.availableSupervisors || []);
      setLoomAllocations(json.loomAllocations || {});
      if (json.suggestedNextRollNumber) {
        setSuggestedRollNumber(json.suggestedNextRollNumber);
      }

      const initialPayload = {
        action: "SAVE_REPORT",
        date: selectedDate,
        shiftName: selectedShift,
        supervisorName: supName,
        status,
        remarks,
        entries: fetchedEntries,
      };
      latestPayloadRef.current = initialPayload;
      lastSavedPayloadRef.current = JSON.stringify(initialPayload);
      isInitialMountRef.current = false;
    } catch {
      toast.error("Failed to load Roll Cutting Report");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedShift, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Immediate or debounced auto-save function
  const triggerAutoSave = useCallback(async (isImmediate: boolean = false, keepalive: boolean = false) => {
    if (!latestPayloadRef.current || isInitialMountRef.current) return;
    const serialized = JSON.stringify(latestPayloadRef.current);
    if (serialized === lastSavedPayloadRef.current) return;

    if (!isImmediate) {
      setAutoSaving(true);
    }

    try {
      const res = await fetch("/api/production/loom/roll-cutting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serialized,
        keepalive,
      });

      if (res.ok) {
        lastSavedPayloadRef.current = serialized;
        setLastAutoSavedAt(new Date());
      }
    } catch (err) {
      console.error("Roll cutting auto-save error:", err);
    } finally {
      if (!isImmediate) {
        setAutoSaving(false);
      }
    }
  }, []);

  // Sync latestPayloadRef and debounce auto-save (500ms)
  useEffect(() => {
    if (loading || isInitialMountRef.current) return;

    const payload = {
      action: "SAVE_REPORT",
      date: selectedDate,
      shiftName: selectedShift,
      supervisorName,
      status: reportStatus,
      remarks: reportRemarks,
      entries,
    };

    latestPayloadRef.current = payload;
    const serialized = JSON.stringify(payload);
    if (serialized === lastSavedPayloadRef.current) return;

    const timer = setTimeout(() => {
      triggerAutoSave(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    entries,
    selectedDate,
    selectedShift,
    supervisorName,
    reportStatus,
    reportRemarks,
    loading,
    triggerAutoSave,
  ]);

  // Immediate flush on page reload, tab close, or navigation hide
  useEffect(() => {
    const handleUnloadOrHide = () => {
      if (latestPayloadRef.current && !isInitialMountRef.current) {
        const serialized = JSON.stringify(latestPayloadRef.current);
        if (serialized !== lastSavedPayloadRef.current) {
          fetch("/api/production/loom/roll-cutting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: serialized,
            keepalive: true,
          }).catch(() => {});
          lastSavedPayloadRef.current = serialized;
        }
      }
    };

    window.addEventListener("beforeunload", handleUnloadOrHide);
    window.addEventListener("pagehide", handleUnloadOrHide);
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        handleUnloadOrHide();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleUnloadOrHide);
      window.removeEventListener("pagehide", handleUnloadOrHide);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Live KPI Calculations
  const kpis: RollCuttingKpis = useMemo(() => {
    const totalRollsCount = entries.length;
    const totalMeters = Math.round(entries.reduce((s, e) => s + (Number(e.meter) || 0), 0) * 100) / 100;
    const totalGrossWtKg = Math.round(entries.reduce((s, e) => s + (Number(e.grossWeightKg) || 0), 0) * 100) / 100;
    const totalTareWtKg = Math.round(
      entries.reduce((s, e) => {
        const tareVal = e.tareWeightKg !== "" && e.tareWeightKg !== null && e.tareWeightKg !== undefined
          ? (!isNaN(Number(e.tareWeightKg)) ? Number(e.tareWeightKg) : 1.2)
          : 1.2;
        return s + tareVal;
      }, 0) * 100
    ) / 100;
    const totalNettWtKg = Math.round(entries.reduce((s, e) => s + (Number(e.nettWeightKg) || 0), 0) * 100) / 100;
    const averageWeightPerMeter = totalMeters > 0 && totalNettWtKg > 0
      ? Math.round(((totalNettWtKg * 1000) / totalMeters) * 10) / 10
      : 0;
    const uniqueLooms = new Set(entries.map((e) => Number(e.loomNumber)).filter(Boolean));

    return {
      totalRollsCount,
      totalMeters,
      totalGrossWtKg,
      totalTareWtKg,
      totalNettWtKg,
      averageWeightPerMeter,
      activeLoomsCount: uniqueLooms.size,
    };
  }, [entries]);

  // Real-time Summaries (Contractor-wise & Quality-wise)
  const contractorSummary: RollCuttingContractorSummary[] = useMemo(() => {
    return computeContractorRollSummary(entries);
  }, [entries]);

  const qualitySummary: RollCuttingQualitySummary[] = useMemo(() => {
    return computeQualityRollSummary(entries);
  }, [entries]);

  // Handle entry field update with live recalculation
  const handleUpdateEntry = (index: number, field: keyof LoomRollCuttingEntryItem, value: any) => {
    setEntries((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], [field]: value };

      if (field === "loomNumber") {
        const loomNum = Number(value);
        current.loomNumber = isNaN(loomNum) ? 0 : loomNum;
        const alloc = loomAllocations[loomNum];
        if (alloc && alloc.qualityCode) {
          current.qualityType = alloc.qualityCode;
          if (alloc.size) {
            current.size = alloc.size;
          }
        } else if (loomNum >= 1 && loomNum <= 91) {
          // Asynchronously query live Loom Summary if allocation wasn't preloaded
          fetch(`/api/production/loom/summary?loomNumber=${loomNum}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.allLoomSummaries) {
                const matched = data.allLoomSummaries.find((l: any) => l.loomNumber === loomNum);
                if (matched?.activeRecipe) {
                  setLoomAllocations((prev) => ({
                    ...prev,
                    [loomNum]: {
                      qualityCode: matched.activeRecipe,
                      size: matched.size || "",
                      denier: matched.denier ? String(matched.denier) : "",
                    },
                  }));
                  setEntries((prevEntries) => {
                    const next = [...prevEntries];
                    if (next[index] && next[index].loomNumber === loomNum) {
                      next[index] = {
                        ...next[index],
                        qualityType: matched.activeRecipe,
                        size: matched.size || next[index].size,
                      };
                    }
                    return next;
                  });
                }
              }
            })
            .catch(() => {});
        }
      }

      if (field === "qualityType") {
        const qObj = availableQualities.find((q) => q.code === value);
        if (qObj && qObj.size) {
          current.size = qObj.size;
        }
      }

      const init = current.initialReading !== "" && current.initialReading !== undefined && current.initialReading !== null
        ? current.initialReading
        : 0;
      const final = current.finalReading !== "" && current.finalReading !== undefined && current.finalReading !== null
        ? current.finalReading
        : 0;
      current.meter = computeRollMeters(init, final);

      const gross = current.grossWeightKg !== "" && current.grossWeightKg !== undefined && current.grossWeightKg !== null
        ? current.grossWeightKg
        : 0;
      const tare = current.tareWeightKg !== "" && current.tareWeightKg !== undefined && current.tareWeightKg !== null
        ? current.tareWeightKg
        : 1.2;

      const { nettWeightKg, avgWeightPerMeter } = computeRollWeightsAndAvg(
        current.meter,
        gross,
        tare
      );
      current.nettWeightKg = nettWeightKg;
      current.avgWeightPerMeter = avgWeightPerMeter;

      copy[index] = current;
      return copy;
    });
  };

  // Quick Register Contractor Handler
  const handleCreateQuickContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContractorName.trim()) {
      toast.error("Contractor name is required");
      return;
    }

    setQuickContractorSaving(true);
    try {
      const res = await fetch("/api/data-centre/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickContractorName.trim(),
          code: quickContractorCode.trim() ? quickContractorCode.trim().toUpperCase() : undefined,
          phone: quickContractorPhone.trim() || undefined,
          section: "LOOM",
          isActive: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to register contractor");

      const newC: AvailableContractor = {
        id: json.id,
        name: json.name,
        code: json.code,
        section: json.section,
      };

      setAvailableContractors((prev) => [...prev, newC]);
      toast.success(`Contractor "${newC.name}" registered`);

      if (targetEntryIndexForNewContractor !== null) {
        handleUpdateEntry(targetEntryIndexForNewContractor, "contractor", newC.name);
      }

      setQuickContractorName("");
      setQuickContractorCode("");
      setQuickContractorPhone("");
      setTargetEntryIndexForNewContractor(null);
      setQuickContractorModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to register contractor");
    } finally {
      setQuickContractorSaving(false);
    }
  };

  // Add new roll entry
  const handleAddEntry = () => {
    const lastEntry = entries[entries.length - 1];
    const nextRoll = generateNextRollNumber(lastEntry?.rollNumber || suggestedRollNumber);
    const defaultLoom = lastEntry ? (Number(lastEntry.loomNumber) % 91) + 1 : 1;
    const alloc = loomAllocations[defaultLoom];

    const newEntry: LoomRollCuttingEntryItem = {
      sequence: entries.length + 1,
      rollNumber: nextRoll,
      loomNumber: defaultLoom,
      size: alloc?.size || lastEntry?.size || "490",
      qualityType: alloc?.qualityCode || lastEntry?.qualityType || availableQualities[0]?.code || "Mahal/LPP/W",
      contractor: lastEntry?.contractor || (availableContractors[0]?.name || ""),
      initialReading: 0,
      finalReading: 0,
      meter: 0,
      grossWeightKg: "",
      tareWeightKg: 1.2,
      nettWeightKg: 0,
      avgWeightPerMeter: 0,
      supervisorSign: supervisorName,
      remarks: "",
    };

    setEntries((prev) => [...prev, newEntry]);
    setSuggestedRollNumber(generateNextRollNumber(nextRoll));
  };

  // Duplicate an entry
  const handleDuplicateEntry = (index: number) => {
    const target = entries[index];
    const nextRoll = generateNextRollNumber(target.rollNumber);
    const newEntry: LoomRollCuttingEntryItem = {
      ...target,
      id: undefined,
      sequence: entries.length + 1,
      rollNumber: nextRoll,
      contractor: target.contractor || "",
      initialReading: target.finalReading,
      finalReading: target.finalReading,
      meter: 0,
      grossWeightKg: "",
      tareWeightKg: target.tareWeightKg !== undefined ? target.tareWeightKg : 1.2,
      nettWeightKg: 0,
      avgWeightPerMeter: 0,
    };
    setEntries((prev) => [...prev, newEntry]);
    toast.success(`Duplicated entry #${index + 1} with Roll #${nextRoll}`);
  };

  // Delete an entry
  const handleDeleteEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    toast.info("Roll cutting entry removed");
  };

  // Submit Report & Sync to Roll Stock
  const handleSubmitReport = async () => {
    if (entries.length === 0) {
      toast.error("Please add at least one roll cutting entry before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        action: "SAVE_REPORT",
        date: selectedDate,
        shiftName: selectedShift,
        supervisorName,
        status: "SUBMITTED",
        remarks: reportRemarks,
        entries,
      };

      const res = await fetch("/api/production/loom/roll-cutting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit report");

      setReportStatus("SUBMITTED");
      lastSavedPayloadRef.current = JSON.stringify(payload);
      setLastAutoSavedAt(new Date());
      toast.success("Daily Roll Cutting Report submitted and synced to Roll Stock!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const reportDataForPrint: LoomRollCuttingReportData = {
    date: selectedDate,
    shiftName: selectedShift,
    supervisorName,
    preparedBy: supervisorName,
    status: reportStatus,
    remarks: reportRemarks,
    totalRollsCount: kpis.totalRollsCount,
    totalMeters: kpis.totalMeters,
    totalGrossWtKg: kpis.totalGrossWtKg,
    totalTareWtKg: kpis.totalTareWtKg,
    totalNettWtKg: kpis.totalNettWtKg,
    averageWeightPerMeter: kpis.averageWeightPerMeter,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                Daily Loom Roll Cutting Report
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  reportStatus === "SUBMITTED" || reportStatus === "APPROVED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}>
                  {reportStatus}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Physical floor log entry with contractor tracking, live quality summaries, and auto-weight computation.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons & Auto-Save Status */}
        <div className="flex flex-wrap items-center gap-2">
          {autoSaving ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Auto-saving...
            </div>
          ) : lastAutoSavedAt ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Saved {lastAutoSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          ) : null}

          <button
            onClick={() => exportLoomRollCuttingExcel({ report: reportDataForPrint, entries, kpis })}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Excel
          </button>

          <button
            onClick={() => setPrintModalOpen(true)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Preview
          </button>

          <button
            onClick={handleSubmitReport}
            disabled={submitting || loading || entries.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {submitting ? "Submitting..." : "Submit & Sync Roll Stock"}
          </button>
        </div>
      </div>

      {/* Filter & Sheet Meta Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 rounded-xl bg-card border shadow-xs">
        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5" /> Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-xs font-mono px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5" /> Shift
          </label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
          >
            <option value="Day Shift">Day Shift (08:00 - 20:00)</option>
            <option value="Night Shift">Night Shift (20:00 - 08:00)</option>
            <option value="Shift A">Shift A</option>
            <option value="Shift B">Shift B</option>
            {availableShifts.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <User className="w-3.5 h-3.5" /> Entering Supervisor
          </label>
          <select
            value={supervisorName}
            onChange={(e) => setSupervisorName(e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer"
          >
            <option value="">— Select Supervisor —</option>
            {availableSupervisors.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} {s.code ? `(${s.code})` : ""} {s.department ? `• ${s.department}` : ""}
              </option>
            ))}
            {supervisorName && !availableSupervisors.some((s) => s.name === supervisorName) && (
              <option value={supervisorName}>{supervisorName} (Custom)</option>
            )}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <Search className="w-3.5 h-3.5" /> Quick Filter
          </label>
          <input
            type="text"
            placeholder="Filter roll #, loom #, quality, contractor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
          />
        </div>
      </div>

      {/* KPI Highlight Summary Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Rolls Cut</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-foreground">{kpis.totalRollsCount}</span>
            <span className="text-xs text-muted-foreground font-medium">{kpis.activeLoomsCount} Looms</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Cut Length</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {kpis.totalMeters.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">meters</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Total Nett Weight</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {kpis.totalNettWtKg.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground block">Avg Linear Mass</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {kpis.averageWeightPerMeter.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">g/m</span>
          </div>
        </div>
      </div>

      {/* Real-Time Live Breakdowns: Contractor-Wise & Quality-Wise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contractor-Wise Live Roll Count */}
        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Contractor-Wise Roll Breakdown
              </h3>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              {contractorSummary.length} Active {contractorSummary.length === 1 ? "Entity" : "Entities"}
            </span>
          </div>

          <div className="mt-3 divide-y divide-border/50">
            {contractorSummary.length > 0 ? (
              contractorSummary.map((c) => (
                <div key={c.contractor} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground truncate">{c.contractor}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-muted-foreground">
                      {c.totalMeters.toLocaleString()} m
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-muted text-foreground">
                      {c.rollsCount} {c.rollsCount === 1 ? "roll" : "rolls"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-3 text-center italic">
                Add entries to see live contractor-wise roll distribution.
              </p>
            )}
          </div>
        </div>

        {/* Quality-Wise Live Roll Count */}
        <div className="p-4 rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Quality-Wise Roll Breakdown
              </h3>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              {qualitySummary.length} {qualitySummary.length === 1 ? "Quality" : "Qualities"} Running
            </span>
          </div>

          <div className="mt-3 divide-y divide-border/50">
            {qualitySummary.length > 0 ? (
              qualitySummary.map((q) => (
                <div key={q.qualityType} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground truncate">{q.qualityType}</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                      ({q.avgWeightPerMeter.toFixed(1)} g/m)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-muted-foreground">
                      {q.totalMeters.toLocaleString()} m
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-muted text-foreground">
                      {q.rollsCount} {q.rollsCount === 1 ? "roll" : "rolls"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-3 text-center italic">
                Add entries to see live quality-wise roll distribution.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Daily Floor Form Table */}
      <div
        className={
          isFullscreen
            ? "fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-6 shadow-2xl overflow-hidden"
            : "rounded-xl border bg-card shadow-sm overflow-hidden"
        }
      >
        <div className="px-5 py-3.5 border-b bg-muted/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Top-Left Fullscreen Expand / Collapse button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border bg-background hover:bg-muted text-foreground transition-all shadow-2xs cursor-pointer active:scale-95"
              title={isFullscreen ? "Collapse back to normal view (Esc)" : "Expand sheet to fullscreen"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-sky-500" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-sky-500" />
                  <span>Expand</span>
                </>
              )}
            </button>

            <div className="p-1.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Scissors className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">Floor Roll Cut Log Entries</h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground border border-border/60">
                {entries.length} {entries.length === 1 ? "roll" : "rolls"}
              </span>
            </div>
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground border-l pl-3 ml-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-500" />
              Scroll horizontally to view & edit all 16 floor columns
            </span>
          </div>

          <button
            onClick={handleAddEntry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Roll Row
          </button>
        </div>

        <div className={isFullscreen ? "overflow-x-auto overflow-y-auto flex-1 border rounded-lg bg-card" : "overflow-x-auto min-h-[300px]"}>
          <table className="w-full text-xs text-left border-collapse min-w-[2140px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-white">
                <th className="p-3 text-center border-r border-slate-800 w-14 min-w-[56px] text-white font-bold">S.No.</th>
                <th className="p-3 border-r border-slate-800 w-36 min-w-[144px] text-white font-bold">Roll No.</th>
                <th className="p-3 border-r border-slate-800 w-36 min-w-[130px] text-center text-white font-bold">Loom #</th>
                <th className="p-3 border-r border-slate-800 w-28 min-w-[100px] text-center text-white font-bold">Size (mm)</th>
                <th className="p-3 border-r border-slate-800 w-80 min-w-[300px] text-white font-bold">Quality Code</th>
                <th className="p-3 border-r border-slate-800 w-64 min-w-[240px] text-white font-bold">Contractor</th>
                <th className="p-3 border-r border-slate-800 w-32 min-w-[120px] text-right text-white font-bold">Init Reading</th>
                <th className="p-3 border-r border-slate-800 w-32 min-w-[120px] text-right text-white font-bold">Final Reading</th>
                <th className="p-3 border-r border-slate-800 w-28 min-w-[110px] text-right bg-slate-950 text-white font-extrabold">Meter</th>
                <th className="p-3 border-r border-slate-800 w-32 min-w-[120px] text-right text-white font-bold">Gross Wt (kg)</th>
                <th className="p-3 border-r border-slate-800 w-28 min-w-[100px] text-right text-slate-300 font-bold">Tare (kg)</th>
                <th className="p-3 border-r border-slate-800 w-32 min-w-[120px] text-right font-extrabold text-emerald-300 bg-emerald-950/70">Nett (kg)</th>
                <th className="p-3 border-r border-slate-800 w-28 min-w-[110px] text-right text-purple-300 font-extrabold bg-purple-950/70">Avg (g/m)</th>
                <th className="p-3 border-r border-slate-800 w-44 min-w-[160px] text-center text-white font-bold">Sup. Sign</th>
                <th className="p-3 border-r border-slate-800 w-64 min-w-[220px] text-white font-bold">Remarks</th>
                <th className="p-3 text-center border-slate-800 w-28 min-w-[100px] text-white font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {entries.length > 0 ? (
                entries.map((entry, idx) => (
                  <tr key={entry.id || idx} className="hover:bg-muted/30 transition-colors group">
                    {/* S.No */}
                    <td className="p-2.5 text-center border-r font-mono text-muted-foreground font-bold text-xs">
                      {idx + 1}
                    </td>

                    {/* Roll No */}
                    <td className="p-2 border-r">
                      <input
                        type="text"
                        value={entry.rollNumber}
                        onChange={(e) => handleUpdateEntry(idx, "rollNumber", e.target.value)}
                        className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden uppercase shadow-2xs"
                        placeholder="CT-14376"
                      />
                    </td>

                    {/* Loom No - Fast Typing Input with Datalist */}
                    <td className="p-2 border-r">
                      <input
                        type="number"
                        min={1}
                        max={91}
                        list="roll-cutting-loom-options"
                        value={entry.loomNumber || ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          handleUpdateEntry(idx, "loomNumber", val);
                        }}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= 1 && val <= 91) {
                            handleUpdateEntry(idx, "loomNumber", val);
                          }
                        }}
                        className="w-full text-xs font-mono font-bold text-center px-3 py-2 rounded-lg border bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 focus:ring-2 focus:ring-sky-500/20 outline-hidden shadow-2xs"
                        placeholder="1-91"
                        title="Type Loom # (1-91) - Quality and specs auto-populate instantly"
                      />
                    </td>

                    {/* Size */}
                    <td className="p-2 border-r">
                      <input
                        type="text"
                        value={entry.size || ""}
                        onChange={(e) => handleUpdateEntry(idx, "size", e.target.value)}
                        className="w-full text-xs font-mono font-bold text-center px-2 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden shadow-2xs"
                        placeholder="490"
                      />
                    </td>

                    {/* Quality */}
                    <td className="p-2 border-r min-w-[220px]">
                      <UniversalQualityInput
                        value={entry.qualityType}
                        title={entry.qualityType}
                        onChange={(newCode, option) => {
                          handleUpdateEntry(idx, "qualityType", newCode);
                          if (option?.size && !entry.size) {
                            handleUpdateEntry(idx, "size", option.size.replace("mm", ""));
                          }
                        }}
                        options={availableQualities}
                        placeholder="— Select / Type Quality —"
                        compact={true}
                        inputClassName="h-8 text-xs font-semibold"
                      />
                    </td>

                    {/* Contractor */}
                    <td className="p-2 border-r">
                      <select
                        value={entry.contractor || ""}
                        title={entry.contractor || "In-House / Direct"}
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setTargetEntryIndexForNewContractor(idx);
                            setQuickContractorModalOpen(true);
                          } else {
                            handleUpdateEntry(idx, "contractor", e.target.value);
                          }
                        }}
                        className="w-full text-xs font-medium px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden cursor-pointer shadow-2xs"
                      >
                        <option value="">In-House / Direct</option>
                        {availableContractors.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.code ? `(${c.code})` : ""}
                          </option>
                        ))}
                        {entry.contractor &&
                          !availableContractors.some((c) => c.name === entry.contractor) && (
                            <option value={entry.contractor}>{entry.contractor}</option>
                          )}
                        <option value="__NEW__" className="text-primary font-bold">
                          + Register New Contractor...
                        </option>
                      </select>
                    </td>

                    {/* Initial Reading */}
                    <td className="p-2 border-r">
                      <input
                        type="number"
                        value={entry.initialReading !== undefined && entry.initialReading !== null ? entry.initialReading : ""}
                        onChange={(e) => handleUpdateEntry(idx, "initialReading", e.target.value)}
                        className="w-full text-xs font-mono font-semibold text-right px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden shadow-2xs"
                        placeholder="0"
                      />
                    </td>

                    {/* Final Reading */}
                    <td className="p-2 border-r">
                      <input
                        type="number"
                        value={entry.finalReading !== undefined && entry.finalReading !== null ? entry.finalReading : ""}
                        onChange={(e) => handleUpdateEntry(idx, "finalReading", e.target.value)}
                        className="w-full text-xs font-mono font-semibold text-right px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden shadow-2xs"
                        placeholder="0"
                      />
                    </td>

                    {/* Meter (Auto-Calculated) */}
                    <td className="p-2 border-r text-right bg-muted/20">
                      <div className="px-3 py-2 rounded-lg bg-muted/60 border border-border/40 font-mono font-extrabold text-xs text-foreground text-right shadow-2xs">
                        {entry.meter !== undefined && entry.meter !== null ? Number(entry.meter).toLocaleString() : "0"} m
                      </div>
                    </td>

                    {/* Gross Wt */}
                    <td className="p-2 border-r">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.grossWeightKg !== undefined && entry.grossWeightKg !== null ? entry.grossWeightKg : ""}
                        onChange={(e) => handleUpdateEntry(idx, "grossWeightKg", e.target.value)}
                        className="w-full text-xs font-mono font-bold text-right px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden shadow-2xs"
                        placeholder="0.00"
                      />
                    </td>

                    {/* Tare Wt */}
                    <td className="p-2 border-r">
                      <input
                        type="number"
                        step="0.01"
                        value={entry.tareWeightKg !== undefined && entry.tareWeightKg !== null ? entry.tareWeightKg : ""}
                        onChange={(e) => handleUpdateEntry(idx, "tareWeightKg", e.target.value)}
                        className="w-full text-xs font-mono font-medium text-right px-3 py-2 rounded-lg border bg-background text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-hidden shadow-2xs"
                        placeholder="1.20"
                      />
                    </td>

                    {/* Nett Wt (Auto-Calculated) */}
                    <td className="p-2 border-r text-right bg-emerald-500/5">
                      <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400 text-right shadow-2xs">
                        {entry.nettWeightKg !== undefined && entry.nettWeightKg !== null ? Number(entry.nettWeightKg).toFixed(2) : "0.00"} kg
                      </div>
                    </td>

                    {/* Avg g/m (Auto-Calculated) */}
                    <td className="p-2 border-r text-right bg-purple-500/5">
                      <div className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 font-mono font-extrabold text-xs text-purple-600 dark:text-purple-400 text-right shadow-2xs">
                        {entry.avgWeightPerMeter !== undefined && entry.avgWeightPerMeter !== null ? Number(entry.avgWeightPerMeter).toFixed(1) : "0.0"}
                      </div>
                    </td>

                    {/* Sup. Sign */}
                    <td className="p-2 border-r">
                      <input
                        type="text"
                        list="supervisors-datalist"
                        value={entry.supervisorSign || ""}
                        onChange={(e) => handleUpdateEntry(idx, "supervisorSign", e.target.value)}
                        className="w-full text-xs text-center px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden shadow-2xs font-medium"
                        placeholder={supervisorName || "Sign"}
                      />
                      <datalist id="supervisors-datalist">
                        {availableSupervisors.map((s) => (
                          <option key={s.id} value={s.name} />
                        ))}
                      </datalist>
                    </td>

                    {/* Remarks */}
                    <td className="p-2 border-r">
                      <input
                        type="text"
                        value={entry.remarks || ""}
                        onChange={(e) => handleUpdateEntry(idx, "remarks", e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden shadow-2xs"
                        placeholder="Notes / remarks..."
                      />
                    </td>

                    {/* Row Actions */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleDuplicateEntry(idx)}
                          className="p-2 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-transparent hover:border-sky-200 transition-colors cursor-pointer"
                          title="Duplicate row for next roll cut"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(idx)}
                          className="p-2 rounded-lg text-slate-500 hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-muted-foreground">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="p-3 bg-muted rounded-full w-fit mx-auto text-muted-foreground">
                        <Scissors className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium">No roll cutting entries for this shift</p>
                      <p className="text-xs">
                        Click <strong>&quot;Add Roll Row&quot;</strong> to start logging floor roll cuts.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={handleAddEntry}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add First Row
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="bg-muted font-bold border-t-2 text-foreground text-xs">
                  <td className="p-3 text-center border-r font-extrabold">TOTAL</td>
                  <td className="p-3 border-r font-mono font-bold">{entries.length} Rolls</td>
                  <td className="p-3 border-r text-center font-mono font-bold text-sky-600 dark:text-sky-400">{kpis.activeLoomsCount} Looms</td>
                  <td className="p-3 border-r"></td>
                  <td className="p-3 border-r"></td>
                  <td className="p-3 border-r"></td>
                  <td className="p-3 border-r"></td>
                  <td className="p-3 border-r"></td>
                  <td className="p-3 border-r text-right font-mono font-extrabold text-foreground">{kpis.totalMeters.toLocaleString()} m</td>
                  <td className="p-3 border-r text-right font-mono font-bold">{kpis.totalGrossWtKg.toFixed(2)} kg</td>
                  <td className="p-3 border-r text-right font-mono font-medium text-muted-foreground">{kpis.totalTareWtKg.toFixed(2)} kg</td>
                  <td className="p-3 border-r text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.totalNettWtKg.toFixed(2)} kg</td>
                  <td className="p-3 border-r text-right font-mono font-extrabold text-purple-600 dark:text-purple-400">{kpis.averageWeightPerMeter.toFixed(1)} g/m</td>
                  <td className="p-3 border-r"></td>
                  <td className="p-3 border-r"></td>
                  <td className="p-3 text-center">
                    <button
                      onClick={handleAddEntry}
                      className="inline-flex items-center justify-center p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                      title="Add another row"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          <datalist id="roll-cutting-loom-options">
            {Array.from({ length: 91 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                Loom #{num} {loomAllocations[num]?.qualityCode ? `• ${loomAllocations[num].qualityCode}` : ""}
              </option>
            ))}
          </datalist>
        </div>
      </div>

      {/* Quick Register Contractor Modal */}
      {quickContractorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-card text-card-foreground rounded-xl border shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-xs text-foreground">Register Contractor</h3>
              </div>
              <button
                onClick={() => setQuickContractorModalOpen(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickContractor} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Contractor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma Enterprise"
                  value={quickContractorName}
                  onChange={(e) => setQuickContractorName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CON-005"
                  value={quickContractorCode}
                  onChange={(e) => setQuickContractorCode(e.target.value)}
                  className="w-full text-xs font-mono uppercase px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={quickContractorPhone}
                  onChange={(e) => setQuickContractorPhone(e.target.value)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary/20 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setQuickContractorModalOpen(false)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickContractorSaving}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {quickContractorSaving ? "Saving..." : "Save & Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      <LoomRollCuttingPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        report={reportDataForPrint}
        entries={entries}
        kpis={kpis}
      />
    </div>
  );
}
