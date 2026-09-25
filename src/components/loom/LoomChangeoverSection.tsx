"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Filter,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Grid,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  Boxes,
  Loader2,
  ChevronRight,
  Sparkles,
  Calendar,
  Zap,
  ArrowRight,
  ArrowUpDown,
  Edit3,
  Check,
  X,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Save,
  Sliders,
  Settings2,
} from "lucide-react";
import {
  LoomChangeoverItem,
  LoomChangeoverDataset,
  exportLoomChangeoverExcel,
} from "@/lib/loom/loom-changeover-export";
import { printLoomChangeover } from "@/lib/loom/print-loom-changeover";
import { COLOR_GROUP_STYLES } from "./LoomSummarySection";

export function LoomChangeoverSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"queue" | "table" | "matrix">("queue");

  const [looms, setLooms] = useState<LoomChangeoverItem[]>([]);
  const [availableQualities, setAvailableQualities] = useState<
    {
      code: string;
      colour: string;
      colorGroup: string;
      denier: number | null;
      reedSpaceCm: number | null;
      bobbinMarking: string;
      mesh: string;
    }[]
  >([]);
  const [availableShifts, setAvailableShifts] = useState<
    {
      id: string;
      name: string;
      startTime: string;
      endTime: string;
    }[]
  >([]);

  // Editing state for modal / drawer
  const [editingLoom, setEditingLoom] = useState<LoomChangeoverItem | null>(null);
  const [dirtyLoomNumbers, setDirtyLoomNumbers] = useState<Set<number>>(new Set());

  // Fetch changeover data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      params.set("_t", String(Date.now()));

      const res = await fetch(`/api/production/loom/changeover?${params.toString()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) throw new Error("Failed to load Loom Changeover data");
      const json = await res.json();
      setLooms(json.looms || []);
      setAvailableQualities(json.availableQualities || []);
      setAvailableShifts(json.availableShifts || []);
      setDirtyLoomNumbers(new Set());
    } catch {
      toast.error("Failed to load Loom Changeover data");
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute live KPIs
  const kpis = useMemo(() => {
    const totalLooms = 91;
    const totalScheduled = looms.filter(
      (item) => item.status === "SCHEDULED" || (item.hasChangeover && item.status !== "COMPLETED")
    ).length;
    const totalInProgress = looms.filter((item) => item.status === "IN_PROGRESS").length;
    const totalCompleted = looms.filter((item) => item.status === "COMPLETED").length;
    const totalPending = looms.filter((item) => item.status === "PENDING" && !item.hasChangeover).length;
    const totalReedSpaceChanges = looms.filter((item) => item.isReedSpaceChanged && item.hasChangeover).length;
    const queueLength = looms.filter((item) => item.hasChangeover || item.sequence > 0).length;

    return {
      totalLooms,
      totalScheduled,
      totalInProgress,
      totalCompleted,
      totalPending,
      totalReedSpaceChanges,
      queueLength,
    };
  }, [looms]);

  // Handle single loom field update in local state
  const handleUpdateLoomField = (
    loomNumber: number,
    field: keyof LoomChangeoverItem,
    value: any
  ) => {
    setLooms((prev) =>
      prev.map((item) => {
        if (item.loomNumber !== loomNumber) return item;

        const updated = { ...item, [field]: value };

        // If next quality code changed, auto-fill standard recipe parameters if matching recipe found
        if (field === "nextQualityCode") {
          const matched = availableQualities.find((q) => q.code === value);
          if (matched) {
            updated.nextColor = matched.colour;
            updated.nextColorGroup = matched.colorGroup;
            updated.nextDenier = matched.denier;
            updated.nextReedSpace = matched.reedSpaceCm ?? updated.currentReedSpace;
            updated.nextBobbinMark = matched.bobbinMarking;
            updated.nextMesh = matched.mesh;
            if (!updated.status || updated.status === "PENDING") {
              updated.status = "SCHEDULED";
            }
          }
        }

        // Recompute diff flags
        updated.hasChangeover = Boolean(
          updated.nextQualityCode && updated.nextQualityCode !== updated.currentQuality
        );
        updated.isReedSpaceChanged = Boolean(
          updated.nextReedSpace !== null &&
            updated.currentReedSpace !== null &&
            updated.nextReedSpace !== updated.currentReedSpace
        );
        updated.isColorChanged = Boolean(
          updated.nextColor && updated.currentColor && updated.nextColor !== updated.currentColor
        );
        updated.isBobbinMarkChanged = Boolean(
          updated.nextBobbinMark &&
            updated.currentBobbinMark &&
            updated.nextBobbinMark !== updated.currentBobbinMark
        );

        return updated;
      })
    );

    setDirtyLoomNumbers((prev) => new Set(prev).add(loomNumber));
  };

  // Move sequence up or down
  const handleShiftSequence = (loomNumber: number, direction: "up" | "down") => {
    const queue = looms
      .filter((l) => l.hasChangeover || l.sequence > 0)
      .sort((a, b) => a.sequence - b.sequence);

    const currentIndex = queue.findIndex((l) => l.loomNumber === loomNumber);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= queue.length) return;

    const currentItem = queue[currentIndex];
    const targetItem = queue[targetIndex];

    const tempSeq = currentItem.sequence || currentIndex + 1;
    const targetSeq = targetItem.sequence || targetIndex + 1;

    handleUpdateLoomField(currentItem.loomNumber, "sequence", targetSeq);
    handleUpdateLoomField(targetItem.loomNumber, "sequence", tempSeq);
  };

  // Save all modified changes to the server
  const handleSaveAll = async () => {
    if (dirtyLoomNumbers.size === 0) {
      toast.info("No unsaved changes");
      return;
    }

    setSaving(true);
    try {
      const itemsToSave = looms.filter((l) => dirtyLoomNumbers.has(l.loomNumber));

      const res = await fetch("/api/production/loom/changeover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: itemsToSave }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save changes");
      }

      toast.success(`Successfully saved ${itemsToSave.length} loom changeover record(s)`);
      setDirtyLoomNumbers(new Set());
      if (editingLoom) {
        setEditingLoom(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save changeover changes");
    } finally {
      setSaving(false);
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    if (looms.length === 0) {
      toast.error("No changeover data available to export");
      return;
    }

    const changeoverQueue = looms
      .filter((item) => item.hasChangeover || item.sequence > 0)
      .sort((a, b) => {
        if (a.sequence > 0 && b.sequence > 0) return a.sequence - b.sequence;
        if (a.sequence > 0) return -1;
        if (b.sequence > 0) return 1;
        return a.loomNumber - b.loomNumber;
      });

    exportLoomChangeoverExcel({
      looms,
      allLooms: looms,
      changeoverQueue,
      kpis,
      selectedStatus,
      searchQuery: search,
    });
    toast.success("Changeover Excel workbook downloaded successfully");
  };

  const handlePrintPdf = () => {
    if (looms.length === 0) {
      toast.error("No changeover data available to print");
      return;
    }

    const changeoverQueue = looms
      .filter((item) => item.hasChangeover || item.sequence > 0)
      .sort((a, b) => {
        if (a.sequence > 0 && b.sequence > 0) return a.sequence - b.sequence;
        if (a.sequence > 0) return -1;
        if (b.sequence > 0) return 1;
        return a.loomNumber - b.loomNumber;
      });

    printLoomChangeover({
      looms,
      allLooms: looms,
      changeoverQueue,
      kpis,
      selectedStatus,
      searchQuery: search,
    });
    toast.success("Print dialog opened for Loom Changeover schedule");
  };

  // Filtered changeover queue for the Priority Queue view
  const changeoverQueueList = useMemo(() => {
    return looms
      .filter((item) => item.hasChangeover || item.sequence > 0 || item.status === "SCHEDULED" || item.status === "IN_PROGRESS")
      .sort((a, b) => {
        if (a.sequence > 0 && b.sequence > 0) return a.sequence - b.sequence;
        if (a.sequence > 0) return -1;
        if (b.sequence > 0) return 1;
        return a.loomNumber - b.loomNumber;
      });
  }, [looms]);

  return (
    <div className="space-y-5">
      {/* Top Banner & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Loom Change Over Sheet
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Loom Section v1.2
              </span>
              {dirtyLoomNumbers.size > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                  {dirtyLoomNumbers.size} Unsaved Change(s)
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Select and sequence target quality formulations for Circular Looms #1–91. Monitor mechanical reed changes & bobbin markings.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {dirtyLoomNumbers.size > 0 && (
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Changes ({dirtyLoomNumbers.size})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Export Multi-Sheet Excel Workbook"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Print A4 Landscape Changeover Schedule"
            >
              <Printer className="h-4 w-4 text-slate-800" />
              <span>Print Schedule</span>
            </button>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Live Changeover KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
              Total Factory Looms
            </span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{kpis.totalLooms}</div>
            <span className="text-[10px] text-slate-700 mt-0.5 block">Loom #1 to #91</span>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
              Scheduled Queue
            </span>
            <div className="text-xl font-black text-blue-900 mt-0.5">{kpis.totalScheduled}</div>
            <span className="text-[10px] text-blue-600 mt-0.5 block">Looms in sequence</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              In-Progress
            </span>
            <div className="text-xl font-black text-amber-900 mt-0.5">{kpis.totalInProgress}</div>
            <span className="text-[10px] text-amber-600 mt-0.5 block">Floor conversion</span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Completed
            </span>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{kpis.totalCompleted}</div>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Converted & verified</span>
          </div>

          <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              Reed Modifications
            </span>
            <div className="text-xl font-black text-rose-900 mt-0.5">{kpis.totalReedSpaceChanges}</div>
            <span className="text-[10px] text-rose-600 mt-0.5 block">Mechanical reed diff</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
              Steady Running
            </span>
            <div className="text-xl font-black text-slate-700 mt-0.5">{kpis.totalPending}</div>
            <span className="text-[10px] text-slate-700 mt-0.5 block">No changeover</span>
          </div>
        </div>
      </div>

      {/* Filter and View Mode Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by loom #, quality, color, shift, remarks..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-800"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-600">Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by Status"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-800 font-semibold"
            >
              <option value="ALL">All Looms ({looms.length})</option>
              <option value="SCHEDULED">Scheduled / Queued ({kpis.totalScheduled})</option>
              <option value="IN_PROGRESS">In Progress ({kpis.totalInProgress})</option>
              <option value="COMPLETED">Completed ({kpis.totalCompleted})</option>
              <option value="PENDING">Steady Running ({kpis.totalPending})</option>
            </select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("queue")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "queue"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Priority Queue ({changeoverQueueList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>ERP Dense Table (91)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("matrix")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === "matrix"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>1-91 Matrix Grid</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-600" />
          <p className="text-sm font-semibold text-slate-700 mt-2">
            Loading Loom Changeover specifications...
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* VIEW 1: PRIORITY CHANGEOVER QUEUE VIEW */}
          {/* ========================================================================= */}
          {viewMode === "queue" && (
            <div className="space-y-3">
              {changeoverQueueList.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-xs">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-slate-800">No Changeovers Currently Queued</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    All 91 circular looms are running on their steady master formulations. Switch to <strong>ERP Dense Table</strong> or <strong>1-91 Matrix Grid</strong> to schedule target qualities.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {changeoverQueueList.map((item, index) => {
                    const seq = item.sequence > 0 ? item.sequence : index + 1;
                    const isDirty = dirtyLoomNumbers.has(item.loomNumber);

                    return (
                      <div
                        key={`queue_${item.loomNumber}`}
                        className={`bg-white border rounded-xl p-4 transition-all shadow-xs ${
                          isDirty
                            ? "border-amber-400 ring-2 ring-amber-100"
                            : item.status === "IN_PROGRESS"
                            ? "border-amber-300 bg-amber-50/20"
                            : item.status === "COMPLETED"
                            ? "border-emerald-300 bg-emerald-50/20"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Left: Sequence & Loom Badge */}
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-lg px-2.5 py-1.5 min-w-[50px] shadow-xs">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Seq</span>
                              <span className="text-lg font-black leading-none">#{seq}</span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-slate-900">
                                  Loom #{item.loomNumber}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.status === "IN_PROGRESS"
                                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                                      : item.status === "COMPLETED"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : item.status === "SCHEDULED"
                                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                                      : "bg-slate-100 text-slate-700 border border-slate-300"
                                  }`}
                                >
                                  {item.status}
                                </span>
                                {item.targetShiftName && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {item.targetShiftName}
                                  </span>
                                )}
                                {item.targetDate && (
                                  <span className="text-xs text-slate-500 font-mono">
                                    {item.targetDate}
                                  </span>
                                )}
                              </div>
                              {item.remarks && (
                                <p className="text-xs text-slate-500 mt-0.5 italic">
                                  Note: {item.remarks}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Center: Specs Diff Card (Current vs Next) */}
                          <div className="flex-1 max-w-2xl bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-3">
                            {/* Current Running Specs */}
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Current Running Quality
                              </div>
                              <div className="text-xs font-black font-mono text-slate-800 truncate" title={item.currentQuality}>
                                {item.currentQuality}
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-1.5 font-medium">
                                <span>{item.currentColor}</span>
                                <span>•</span>
                                <span>{item.currentDenier ? `${item.currentDenier}D` : "—"}</span>
                                <span>•</span>
                                <span>Reed: {item.currentReedSpace ? `${item.currentReedSpace}cm` : "—"}</span>
                                <span>•</span>
                                <span className="px-1.5 py-0.2 bg-white rounded border text-[10px]">{item.currentBobbinMark}</span>
                              </div>
                            </div>

                            {/* Arrow Indicator */}
                            <div className="text-slate-400 px-1">
                              <ArrowRight className="h-5 w-5 text-indigo-500" />
                            </div>

                            {/* Next Target Specs */}
                            <div className="flex-1 min-w-0 bg-white border border-indigo-200 rounded-md p-1.5 shadow-2xs">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center justify-between">
                                <span>Target Next Quality</span>
                                {item.isReedSpaceChanged && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-black text-[9px] border border-rose-300">
                                    Reed: {item.currentReedSpace} &rarr; {item.nextReedSpace}cm
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-black font-mono text-indigo-950 truncate" title={item.nextQualityCode || "—"}>
                                {item.nextQualityCode || "Not Selected"}
                              </div>
                              <div className="text-[11px] text-slate-700 mt-0.5 flex flex-wrap items-center gap-1.5 font-semibold">
                                <span className={item.isColorChanged ? "text-amber-700 font-bold" : ""}>
                                  {item.nextColor || "—"}
                                </span>
                                <span>•</span>
                                <span>{item.nextDenier ? `${item.nextDenier}D` : "—"}</span>
                                <span>•</span>
                                <span className={item.isReedSpaceChanged ? "text-rose-700 font-bold" : ""}>
                                  Reed: {item.nextReedSpace ? `${item.nextReedSpace}cm` : "—"}
                                </span>
                                <span>•</span>
                                <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-900 rounded border border-indigo-200 text-[10px]">
                                  {item.nextBobbinMark || "—"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions & Reordering */}
                          <div className="flex items-center gap-1.5 self-end lg:self-center">
                            <button
                              type="button"
                              onClick={() => handleShiftSequence(item.loomNumber, "up")}
                              disabled={index === 0}
                              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              title="Move Up in Sequence"
                            >
                              <MoveUp className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShiftSequence(item.loomNumber, "down")}
                              disabled={index === changeoverQueueList.length - 1}
                              className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              title="Move Down in Sequence"
                            >
                              <MoveDown className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingLoom(item)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Configure</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: DENSE ERP TABLE VIEW (ALL 91 LOOMS) */}
          {/* ========================================================================= */}
          {viewMode === "table" && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-2.5 px-3 w-14 text-center">Loom #</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Current Running Quality</th>
                      <th className="py-2.5 px-3">Current Specs</th>
                      <th className="py-2.5 px-3 min-w-[240px]">Target Next Quality Formulation</th>
                      <th className="py-2.5 px-3">Next Specs</th>
                      <th className="py-2.5 px-3 w-20 text-center">Seq #</th>
                      <th className="py-2.5 px-3 w-32">Status</th>
                      <th className="py-2.5 px-3 w-28">Target Shift</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Remarks / Floor Notes</th>
                      <th className="py-2.5 px-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {looms.map((item) => {
                      const isDirty = dirtyLoomNumbers.has(item.loomNumber);
                      return (
                        <tr
                          key={`row_${item.loomNumber}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isDirty
                              ? "bg-amber-50/40"
                              : item.hasChangeover
                              ? "bg-blue-50/20"
                              : ""
                          }`}
                        >
                          {/* Loom # */}
                          <td className="py-2 px-3 text-center font-black font-mono text-slate-900 bg-slate-50/50">
                            #{item.loomNumber}
                          </td>

                          {/* Current Quality */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-800 text-[11px]">
                            {item.currentQuality}
                          </td>

                          {/* Current Specs */}
                          <td className="py-2 px-3 text-slate-600 text-[11px]">
                            <div>
                              <span className="font-semibold text-slate-700">{item.currentColor}</span> • {item.currentDenier ? `${item.currentDenier}D` : "—"}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Reed: {item.currentReedSpace ? `${item.currentReedSpace}cm` : "—"} | Mark: {item.currentBobbinMark}
                            </div>
                          </td>

                          {/* Target Next Quality Dropdown */}
                          <td className="py-2 px-3">
                            <select
                              value={item.nextQualityCode || ""}
                              onChange={(e) =>
                                handleUpdateLoomField(
                                  item.loomNumber,
                                  "nextQualityCode",
                                  e.target.value ? e.target.value : null
                                )
                              }
                              aria-label={`Target Next Quality for Loom #${item.loomNumber}`}
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                            >
                              <option value="">— No Changeover Scheduled —</option>
                              {availableQualities.map((q) => (
                                <option key={`q_${q.code}`} value={q.code}>
                                  {q.code} ({q.colour} • {q.denier}D • {q.bobbinMarking})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Next Specs Preview */}
                          <td className="py-2 px-3 text-[11px]">
                            {item.nextQualityCode ? (
                              <div>
                                <div className={`font-semibold ${item.isColorChanged ? "text-amber-700 font-bold" : "text-slate-800"}`}>
                                  {item.nextColor || "—"} • {item.nextDenier ? `${item.nextDenier}D` : "—"}
                                </div>
                                <div className={`text-[10px] font-mono ${item.isReedSpaceChanged ? "text-rose-700 font-bold" : "text-slate-500"}`}>
                                  Reed: {item.nextReedSpace ? `${item.nextReedSpace}cm` : "—"} | Mark: {item.nextBobbinMark || "—"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Unchanged</span>
                            )}
                          </td>

                          {/* Sequence Input */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={item.sequence || ""}
                              onChange={(e) =>
                                handleUpdateLoomField(
                                  item.loomNumber,
                                  "sequence",
                                  e.target.value ? Number(e.target.value) : 0
                                )
                              }
                              placeholder="0"
                              aria-label={`Sequence for Loom #${item.loomNumber}`}
                              className="w-14 px-1.5 py-1 text-center font-bold text-xs bg-white border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                            />
                          </td>

                          {/* Status Selector */}
                          <td className="py-2 px-3">
                            <select
                              value={item.status}
                              onChange={(e) =>
                                handleUpdateLoomField(item.loomNumber, "status", e.target.value)
                              }
                              aria-label={`Status for Loom #${item.loomNumber}`}
                              className={`w-full px-2 py-1 text-[11px] font-bold rounded border focus:outline-hidden focus:ring-1 focus:ring-slate-900 ${
                                item.status === "IN_PROGRESS"
                                  ? "bg-amber-50 text-amber-900 border-amber-300"
                                  : item.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                                  : item.status === "SCHEDULED"
                                  ? "bg-blue-50 text-blue-900 border-blue-300"
                                  : "bg-slate-50 text-slate-700 border-slate-300"
                              }`}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="SCHEDULED">SCHEDULED</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>

                          {/* Target Shift */}
                          <td className="py-2 px-3">
                            <select
                              value={item.targetShiftId || ""}
                              onChange={(e) => {
                                const sId = e.target.value;
                                const sObj = availableShifts.find((s) => s.id === sId);
                                handleUpdateLoomField(item.loomNumber, "targetShiftId", sId || null);
                                handleUpdateLoomField(
                                  item.loomNumber,
                                  "targetShiftName",
                                  sObj?.name || null
                                );
                              }}
                              aria-label={`Target Shift for Loom #${item.loomNumber}`}
                              className="w-full px-2 py-1 text-[11px] bg-white border border-slate-300 rounded text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                            >
                              <option value="">— Any Shift —</option>
                              {availableShifts.map((s) => (
                                <option key={`shift_${s.id}`} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Remarks */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.remarks || ""}
                              onChange={(e) =>
                                handleUpdateLoomField(item.loomNumber, "remarks", e.target.value)
                              }
                              placeholder="Add floor remarks..."
                              aria-label={`Remarks for Loom #${item.loomNumber}`}
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                            />
                          </td>

                          {/* Action Modal Trigger */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setEditingLoom(item)}
                              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded cursor-pointer"
                              title="Open Detailed Modal"
                            >
                              <Settings2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: 1-91 FACTORY FLOOR MATRIX GRID */}
          {/* ========================================================================= */}
          {viewMode === "matrix" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Factory Floor 1-91 Loom Changeover Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any loom tile to configure next quality formulation and priority sequence.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-blue-500 inline-block"></span>
                    <span className="font-semibold text-slate-700">Scheduled Queue</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-amber-500 inline-block"></span>
                    <span className="font-semibold text-slate-700">In-Progress</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-emerald-500 inline-block"></span>
                    <span className="font-semibold text-slate-700">Completed</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-xs bg-slate-200 inline-block"></span>
                    <span className="font-semibold text-slate-700">Steady Running</span>
                  </span>
                </div>
              </div>

              {/* 91 Loom Tiles Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-9 gap-2.5">
                {looms.map((item) => {
                  const hasNext = Boolean(item.nextQualityCode);
                  const isScheduled = item.status === "SCHEDULED" || hasNext;
                  const isInProg = item.status === "IN_PROGRESS";
                  const isDone = item.status === "COMPLETED";

                  return (
                    <button
                      key={`matrix_loom_${item.loomNumber}`}
                      type="button"
                      onClick={() => setEditingLoom(item)}
                      className={`p-2.5 rounded-lg border text-left transition-all relative cursor-pointer hover:shadow-md ${
                        isInProg
                          ? "bg-amber-50 border-amber-400 ring-1 ring-amber-300"
                          : isDone
                          ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300"
                          : isScheduled
                          ? "bg-blue-50 border-blue-400 ring-1 ring-blue-300"
                          : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      {/* Sequence Badge if set */}
                      {item.sequence > 0 && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.2 rounded text-[9px] font-black bg-slate-900 text-white">
                          #{item.sequence}
                        </span>
                      )}

                      <div className="text-xs font-black text-slate-900 font-mono">
                        Loom #{item.loomNumber}
                      </div>

                      {/* Current Quality */}
                      <div className="text-[10px] font-mono font-bold text-slate-700 truncate mt-1" title={item.currentQuality}>
                        {item.currentQuality}
                      </div>

                      {/* Next Quality or Status */}
                      {hasNext ? (
                        <div className="mt-1 pt-1 border-t border-slate-200">
                          <span className="text-[9px] font-bold text-indigo-700 block uppercase">Next:</span>
                          <span className="text-[10px] font-mono font-black text-indigo-950 truncate block" title={item.nextQualityCode!}>
                            {item.nextQualityCode}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-600 mt-1">Steady Running</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* DETAILED LOOM CHANGEOVER CONFIGURATION MODAL / DRAWER */}
      {/* ========================================================================= */}
      {editingLoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black tracking-tight">
                  Configure Loom #{editingLoom.loomNumber} Changeover
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set target quality formulation, sequence priority, target date & shift
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLoom(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Current vs Next Side-by-Side Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Current Specs */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Current Running Quality
                  </div>
                  <div className="text-xs font-mono font-black text-slate-900">
                    {editingLoom.currentQuality}
                  </div>
                  <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-slate-200 font-medium">
                    <div><strong>Colour:</strong> {editingLoom.currentColor} ({editingLoom.currentColorGroup})</div>
                    <div><strong>Denier:</strong> {editingLoom.currentDenier ? `${editingLoom.currentDenier} D` : "—"}</div>
                    <div><strong>Reed Space:</strong> {editingLoom.currentReedSpace ? `${editingLoom.currentReedSpace} cm` : "—"}</div>
                    <div><strong>Bobbin Mark:</strong> {editingLoom.currentBobbinMark}</div>
                    <div><strong>Mesh:</strong> {editingLoom.currentMesh}</div>
                  </div>
                </div>

                {/* Next Target Specs */}
                <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3.5 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center justify-between">
                    <span>Target Next Quality</span>
                    {editingLoom.isReedSpaceChanged && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-black text-[9px]">
                        Reed Diff: {editingLoom.currentReedSpace} &rarr; {editingLoom.nextReedSpace}cm
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono font-black text-indigo-950">
                    {editingLoom.nextQualityCode || "— No Target Quality Selected —"}
                  </div>
                  <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-indigo-100 font-medium">
                    <div><strong>Colour:</strong> {editingLoom.nextColor || "—"} ({editingLoom.nextColorGroup || "—"})</div>
                    <div><strong>Denier:</strong> {editingLoom.nextDenier ? `${editingLoom.nextDenier} D` : "—"}</div>
                    <div><strong>Reed Space:</strong> {editingLoom.nextReedSpace ? `${editingLoom.nextReedSpace} cm` : "—"}</div>
                    <div><strong>Bobbin Mark:</strong> {editingLoom.nextBobbinMark || "—"}</div>
                    <div><strong>Mesh:</strong> {editingLoom.nextMesh || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Formulation Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Select Target Quality Formulation:
                </label>
                <select
                  value={editingLoom.nextQualityCode || ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    handleUpdateLoomField(editingLoom.loomNumber, "nextQualityCode", val);
                    const matched = availableQualities.find((q) => q.code === val);
                    if (matched) {
                      setEditingLoom((prev) =>
                        prev
                          ? {
                              ...prev,
                              nextQualityCode: val,
                              nextColor: matched.colour,
                              nextColorGroup: matched.colorGroup,
                              nextDenier: matched.denier,
                              nextReedSpace: matched.reedSpaceCm ?? prev.currentReedSpace,
                              nextBobbinMark: matched.bobbinMarking,
                              nextMesh: matched.mesh,
                              hasChangeover: Boolean(val && val !== prev.currentQuality),
                              isReedSpaceChanged: Boolean(
                                matched.reedSpaceCm !== null &&
                                  prev.currentReedSpace !== null &&
                                  matched.reedSpaceCm !== prev.currentReedSpace
                              ),
                              isColorChanged: Boolean(
                                matched.colour && prev.currentColor && matched.colour !== prev.currentColor
                              ),
                              isBobbinMarkChanged: Boolean(
                                matched.bobbinMarking &&
                                  prev.currentBobbinMark &&
                                  matched.bobbinMarking !== prev.currentBobbinMark
                              ),
                            }
                          : null
                      );
                    } else {
                      setEditingLoom((prev) =>
                        prev
                          ? {
                              ...prev,
                              nextQualityCode: null,
                              nextColor: null,
                              nextColorGroup: null,
                              nextDenier: null,
                              nextReedSpace: null,
                              nextBobbinMark: null,
                              nextMesh: null,
                              hasChangeover: false,
                              isReedSpaceChanged: false,
                              isColorChanged: false,
                              isBobbinMarkChanged: false,
                            }
                          : null
                      );
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">— Clear / No Changeover (Steady Running) —</option>
                  {availableQualities.map((q) => (
                    <option key={`opt_${q.code}`} value={q.code}>
                      {q.code} ({q.colour} • {q.denier}D • Reed: {q.reedSpaceCm ?? "—"}cm • Mark: {q.bobbinMarking})
                    </option>
                  ))}
                </select>
              </div>

              {/* Detailed editable overrides */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    Sequence Priority #
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={editingLoom.sequence || ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : 0;
                      handleUpdateLoomField(editingLoom.loomNumber, "sequence", val);
                      setEditingLoom((prev) => (prev ? { ...prev, sequence: val } : null));
                    }}
                    placeholder="1, 2, 3..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    Status
                  </label>
                  <select
                    value={editingLoom.status}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleUpdateLoomField(editingLoom.loomNumber, "status", val);
                      setEditingLoom((prev) => (prev ? { ...prev, status: val } : null));
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={editingLoom.targetDate || ""}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      handleUpdateLoomField(editingLoom.loomNumber, "targetDate", val);
                      setEditingLoom((prev) => (prev ? { ...prev, targetDate: val } : null));
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                    Target Shift
                  </label>
                  <select
                    value={editingLoom.targetShiftId || ""}
                    onChange={(e) => {
                      const sId = e.target.value || null;
                      const sObj = availableShifts.find((s) => s.id === sId);
                      handleUpdateLoomField(editingLoom.loomNumber, "targetShiftId", sId);
                      handleUpdateLoomField(editingLoom.loomNumber, "targetShiftName", sObj?.name || null);
                      setEditingLoom((prev) =>
                        prev ? { ...prev, targetShiftId: sId, targetShiftName: sObj?.name || null } : null
                      );
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="">— Any Shift —</option>
                    {availableShifts.map((s) => (
                      <option key={`edit_shift_${s.id}`} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-600 block mb-1">
                  Technician / Floor Remarks
                </label>
                <textarea
                  rows={2}
                  value={editingLoom.remarks || ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    handleUpdateLoomField(editingLoom.loomNumber, "remarks", val);
                    setEditingLoom((prev) => (prev ? { ...prev, remarks: val } : null));
                  }}
                  placeholder="e.g. Creel cleaning required, verify tension on warp bobbins, adjust reed space to 54cm..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingLoom(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
