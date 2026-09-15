"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Factory,
  FileCheck2,
  Filter,
  Flame,
  Layers,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

interface QueueItem {
  id: string;
  referenceType: "ROLL" | "BALE" | "PRODUCTION_RUN";
  referenceId: string;
  identifier: string;
  type: string;
  sourcePhase: string;
  status: string;
  itemCode: string;
  itemName: string;
  weight?: number;
  length?: number;
  bagsPerBale?: number;
  quantity?: number;
  batchLot?: string;
  locationName?: string;
  machineName?: string;
  operatorName?: string;
  shiftName?: string;
  characteristics?: Record<string, any>;
  createdAt: string;
}

interface InspectionRecord {
  id: string;
  inspectionNumber: string;
  referenceType: string;
  referenceId: string;
  status: string;
  decision: "PASSED" | "FAILED" | "REWORK" | "ON_HOLD" | null;
  defectReason?: string;
  reworkInstructions?: string;
  notes?: string;
  samplesInspected: number;
  inspectedAt?: string;
  createdAt: string;
  inspector?: {
    id: string;
    name: string;
    email: string;
    employeeId?: string;
  };
  lines?: Array<{
    id: string;
    parameterName: string;
    standardValue?: string;
    actualValue: string;
    unit?: string;
    status: string;
  }>;
}

interface QueueStats {
  pendingCount: number;
  onHoldCount: number;
  reworkCount: number;
  inspectedToday: number;
  passedToday: number;
  failedToday: number;
  reworkToday: number;
  onHoldToday: number;
  passRate: number;
}

const COMMON_DEFECT_REASONS = [
  "Visual Defect / Pinholes / Weave Gaps",
  "Weight Out of Specification Tolerance",
  "Width / Dimension Variation",
  "GSM / Thickness Inconsistency",
  "Tensile Strength / Elongation Failure",
  "Printing Misalignment / Ink Smudge",
  "Lamination Delamination / Blistering",
  "Contamination / Foreign Material",
  "Damaged Edge / Wrinkling",
  "Stitching / Seam Defect",
];

const DEFAULT_LINE_PARAMETERS = [
  { parameterName: "Weight Check", standardValue: "Nominal ±2%", actualValue: "", unit: "kg" },
  { parameterName: "Width & Dimensions", standardValue: "Standard", actualValue: "", unit: "mm" },
  { parameterName: "Visual & Surface Appearance", standardValue: "No defects/tears", actualValue: "Clean", unit: "Grade" },
  { parameterName: "Tensile & Integrity", standardValue: "Standard", actualValue: "Pass", unit: "N" },
];

export function QualityClient() {
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [historyItems, setHistoryItems] = useState<InspectionRecord[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    pendingCount: 0,
    onHoldCount: 0,
    reworkCount: 0,
    inspectedToday: 0,
    passedToday: 0,
    failedToday: 0,
    reworkToday: 0,
    onHoldToday: 0,
    passRate: 100,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_QC");
  const [historyDecisionFilter, setHistoryDecisionFilter] = useState<string>("ALL");

  // Inspection Modal State
  const [selectedTarget, setSelectedTarget] = useState<QueueItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<"PASSED" | "FAILED" | "REWORK" | "ON_HOLD">("PASSED");
  const [defectReason, setDefectReason] = useState("");
  const [customDefectReason, setCustomDefectReason] = useState("");
  const [reworkInstructions, setReworkInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [samplesInspected, setSamplesInspected] = useState(1);
  const [parameterLines, setParameterLines] = useState(DEFAULT_LINE_PARAMETERS);

  const fetchQueue = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (typeFilter !== "ALL") params.append("referenceType", typeFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/quality/queue?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load queue");
      const data = await res.json();
      setQueueItems(data.items || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch inspection queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, statusFilter, search]);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (historyDecisionFilter !== "ALL") params.append("decision", historyDecisionFilter);
      if (search.trim()) params.append("search", search.trim());
      params.append("limit", "50");

      const res = await fetch(`/api/quality/inspections?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setHistoryItems(data.inspections || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch inspection history");
    }
  }, [historyDecisionFilter, search]);

  useEffect(() => {
    if (activeTab === "queue") {
      fetchQueue();
    } else {
      fetchHistory();
    }
  }, [activeTab, fetchQueue, fetchHistory]);

  const openInspectionModal = (item: QueueItem) => {
    setSelectedTarget(item);
    setDecision("PASSED");
    setDefectReason("");
    setCustomDefectReason("");
    setReworkInstructions("");
    setNotes("");
    setSamplesInspected(1);
    setParameterLines(
      DEFAULT_LINE_PARAMETERS.map((line) => {
        if (line.parameterName === "Weight Check" && item.weight) {
          return { ...line, actualValue: `${item.weight}` };
        }
        if (line.parameterName === "Width & Dimensions" && item.length) {
          return { ...line, actualValue: `${item.length}m` };
        }
        return line;
      })
    );
  };

  const closeInspectionModal = () => {
    setSelectedTarget(null);
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    setParameterLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addParameterLine = () => {
    setParameterLines((prev) => [
      ...prev,
      { parameterName: "", standardValue: "", actualValue: "", unit: "" },
    ]);
  };

  const removeParameterLine = (index: number) => {
    setParameterLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;

    const finalDefectReason =
      defectReason === "OTHER" ? customDefectReason : defectReason;

    if ((decision === "FAILED" || decision === "REWORK") && !finalDefectReason.trim()) {
      toast.error("Please provide or select a defect reason for non-conforming items");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create inspection
      const createRes = await fetch("/api/quality/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceType: selectedTarget.referenceType,
          referenceId: selectedTarget.referenceId,
          samplesInspected,
          notes,
          lines: parameterLines.filter((l) => l.parameterName.trim() && l.actualValue.trim()),
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Failed to initialize inspection record");
      }

      const inspection = await createRes.json();

      // 2. Record decision
      const decisionRes = await fetch(`/api/quality/inspections/${inspection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          defectReason: finalDefectReason || undefined,
          reworkInstructions: reworkInstructions || undefined,
          notes: notes || undefined,
          samplesInspected,
          lines: parameterLines.filter((l) => l.parameterName.trim() && l.actualValue.trim()),
        }),
      });

      if (!decisionRes.ok) {
        const err = await decisionRes.json();
        throw new Error(err.error || "Failed to record inspection decision");
      }

      toast.success(
        `QC Decision [${decision}] recorded for ${selectedTarget.identifier} (${inspection.inspectionNumber})`
      );

      closeInspectionModal();
      fetchQueue(true);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while saving the inspection");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PASSED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> Passed
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-600/20">
            <XCircle className="size-3.5 text-rose-600" /> Failed
          </span>
        );
      case "REWORK":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20">
            <RotateCcw className="size-3.5 text-amber-600" /> Rework
          </span>
        );
      case "ON_HOLD":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 ring-1 ring-purple-600/20">
            <AlertCircle className="size-3.5 text-purple-600" /> On Hold
          </span>
        );
      case "PENDING_QC":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-600/20">
            <Clock className="size-3.5 text-sky-600" /> Pending QC
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Quality Control Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Inspection queue, parameter validation, and pass / fail / rework verification
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (activeTab === "queue" ? fetchQueue(true) : fetchHistory())}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/production/rolls"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Layers className="size-4" />
            Roll Catalog
          </Link>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending QC</span>
            <Clock className="size-4 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.pendingCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting inspection</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Today Pass Rate</span>
            <FileCheck2 className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{stats.passRate}%</div>
          <p className="mt-1 text-xs text-muted-foreground">{stats.inspectedToday} inspected today</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Passed Today</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.passedToday}</div>
          <p className="mt-1 text-xs text-emerald-600">Conforming stock</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">On Hold</span>
            <AlertCircle className="size-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600">{stats.onHoldCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">Requires review</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Rework Items</span>
            <RotateCcw className="size-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{stats.reworkCount}</div>
          <p className="mt-1 text-xs text-muted-foreground">Requires correction</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Failed Today</span>
            <XCircle className="size-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{stats.failedToday}</div>
          <p className="mt-1 text-xs text-muted-foreground">Scrap / rejected</p>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-slate-100 px-6 pt-4">
          <div className="flex gap-8">
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
                activeTab === "queue"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Clock className="size-4" />
              Inspection Queue
              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {stats.pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
                activeTab === "history"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileCheck2 className="size-4" />
              Inspection Certificates & History
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Roll #, Bale #, Item code, or Lot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "queue" ? (
              <>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none"
                >
                  <option value="ALL">All Entity Types</option>
                  <option value="ROLL">Rolls (Loom / Lam / Print)</option>
                  <option value="BALE">Bales (Finished Goods)</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none"
                >
                  <option value="PENDING_QC">Status: Pending QC</option>
                  <option value="ON_HOLD">Status: On Hold</option>
                  <option value="REWORK">Status: Rework Required</option>
                  <option value="ALL">Status: All Statuses</option>
                </select>
              </>
            ) : (
              <select
                value={historyDecisionFilter}
                onChange={(e) => setHistoryDecisionFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-primary focus:outline-none"
              >
                <option value="ALL">All QC Verdicts</option>
                <option value="PASSED">Passed Only</option>
                <option value="FAILED">Failed / Rejected</option>
                <option value="REWORK">Rework</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            )}
          </div>
        </div>

        {/* Content Area */}
        {activeTab === "queue" ? (
          <div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-primary" />
                Loading inspection queue...
              </div>
            ) : queueItems.length === 0 ? (
              <div className="py-16 text-center">
                <ShieldCheck className="mx-auto size-12 text-emerald-500/80" />
                <h3 className="mt-3 text-base font-semibold text-slate-800">Inspection Queue is Clear</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  All production rolls and bales have been inspected and conforming stock is verified.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Identifier & Type</th>
                      <th className="px-6 py-3">Material & Item</th>
                      <th className="px-6 py-3">Machine & Operator</th>
                      <th className="px-6 py-3">Specs / Quantity</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Produced</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {queueItems.map((item) => (
                      <tr key={`${item.referenceType}-${item.id}`} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {item.identifier}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                              {item.referenceType}
                            </span>
                            <span>·</span>
                            <span>{item.sourcePhase}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{item.itemCode}</div>
                          <div className="truncate max-w-xs text-xs text-muted-foreground">{item.itemName}</div>
                          {item.batchLot && item.batchLot !== "—" && (
                            <div className="text-[11px] text-slate-500">Lot: {item.batchLot}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{item.machineName}</div>
                          <div className="text-xs text-muted-foreground">Op: {item.operatorName}</div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {item.referenceType === "ROLL" ? (
                            <div className="space-y-0.5">
                              <div><span className="text-muted-foreground">Weight:</span> {item.weight != null ? `${item.weight} kg` : "—"}</div>
                              <div><span className="text-muted-foreground">Length:</span> {item.length != null ? `${item.length} m` : "—"}</div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div><span className="text-muted-foreground">Bags:</span> {item.bagsPerBale || item.quantity || "—"}</div>
                              <div><span className="text-muted-foreground">Shift:</span> {item.shiftName}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "dd MMM HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.referenceType === "ROLL" && (
                              <Link
                                href={`/dashboard/production/rolls/${item.id}`}
                                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                title="View Roll Details"
                              >
                                <ExternalLink className="size-3.5" />
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => openInspectionModal(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
                            >
                              <ShieldCheck className="size-3.5" />
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {historyItems.length === 0 ? (
              <div className="py-16 text-center">
                <FileCheck2 className="mx-auto size-12 text-slate-300" />
                <h3 className="mt-3 text-base font-semibold text-slate-800">No inspection records found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Completed quality certificates and audits will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Certificate / QC #</th>
                      <th className="px-6 py-3">Target Entity</th>
                      <th className="px-6 py-3">Inspector</th>
                      <th className="px-6 py-3">Verdict</th>
                      <th className="px-6 py-3">Defect / Observations</th>
                      <th className="px-6 py-3">Inspected At</th>
                      <th className="px-6 py-3 text-right">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {historyItems.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4 font-mono font-semibold text-primary">
                          <Link href={`/dashboard/quality/inspections/${record.id}`} className="hover:underline">
                            {record.inspectionNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold text-slate-900">{record.referenceType}</div>
                          <div className="font-mono text-[11px] text-muted-foreground truncate max-w-[120px]">
                            {record.referenceId}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-medium text-slate-900">{record.inspector?.name || "System"}</div>
                          <div className="text-muted-foreground">{record.inspector?.employeeId || record.inspector?.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(record.decision || "PENDING_QC")}
                        </td>
                        <td className="px-6 py-4 text-xs max-w-xs">
                          {record.defectReason ? (
                            <span className="font-medium text-rose-700">{record.defectReason}</span>
                          ) : record.notes ? (
                            <span className="text-slate-600 truncate block">{record.notes}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {record.inspectedAt
                            ? format(new Date(record.inspectedAt), "dd MMM yyyy HH:mm")
                            : format(new Date(record.createdAt), "dd MMM yyyy HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/dashboard/quality/inspections/${record.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            View Sheet <ArrowRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QC Inspection & Decision Modal */}
      {selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Record QC Inspection & Verdict</h2>
                  <p className="text-xs text-muted-foreground">
                    Target: {selectedTarget.referenceType} · {selectedTarget.identifier}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeInspectionModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitInspection} className="p-6 space-y-6">
              {/* Target Summary Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Item:</span>
                    <p className="font-semibold text-slate-900">{selectedTarget.itemCode}</p>
                    <p className="text-slate-600 truncate">{selectedTarget.itemName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Machine / Line:</span>
                    <p className="font-semibold text-slate-900">{selectedTarget.machineName || "—"}</p>
                    <p className="text-slate-600">Op: {selectedTarget.operatorName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Specs:</span>
                    <p className="font-semibold text-slate-900">
                      {selectedTarget.weight ? `${selectedTarget.weight} kg` : ""} {selectedTarget.length ? `· ${selectedTarget.length}m` : ""}
                      {selectedTarget.bagsPerBale ? `${selectedTarget.bagsPerBale} bags/bale` : ""}
                    </p>
                    <p className="text-slate-600">Lot: {selectedTarget.batchLot || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Status:</span>
                    <div className="mt-0.5">{getStatusBadge(selectedTarget.status)}</div>
                  </div>
                </div>
              </div>

              {/* Decision Verdict Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quality Verdict Decision
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => setDecision("PASSED")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition ${
                      decision === "PASSED"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/30"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span className="text-xs font-bold">PASSED</span>
                    <span className="text-[10px] text-muted-foreground">Conforms to specs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision("REWORK")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition ${
                      decision === "REWORK"
                        ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-600/30"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <RotateCcw className="size-5 text-amber-600" />
                    <span className="text-xs font-bold">REWORK</span>
                    <span className="text-[10px] text-muted-foreground">Requires fix</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision("ON_HOLD")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition ${
                      decision === "ON_HOLD"
                        ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/30"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <AlertCircle className="size-5 text-purple-600" />
                    <span className="text-xs font-bold">ON HOLD</span>
                    <span className="text-[10px] text-muted-foreground">Under review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision("FAILED")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center transition ${
                      decision === "FAILED"
                        ? "border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-600/30"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <XCircle className="size-5 text-rose-600" />
                    <span className="text-xs font-bold">FAILED</span>
                    <span className="text-[10px] text-muted-foreground">Scrap / reject</span>
                  </button>
                </div>
              </div>

              {/* Defect Reasons (if not passed) */}
              {(decision === "FAILED" || decision === "REWORK" || decision === "ON_HOLD") && (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">
                      Primary Defect Reason / Classification
                    </label>
                    <select
                      value={defectReason}
                      onChange={(e) => setDefectReason(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">— Select Defect Reason —</option>
                      {COMMON_DEFECT_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                      <option value="OTHER">Other / Custom Defect</option>
                    </select>
                  </div>

                  {defectReason === "OTHER" && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Custom Defect Description
                      </label>
                      <input
                        type="text"
                        placeholder="Specify exact defect observation..."
                        value={customDefectReason}
                        onChange={(e) => setCustomDefectReason(e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}

                  {decision === "REWORK" && (
                    <div>
                      <label className="text-xs font-semibold text-slate-700">
                        Rework / Reprocessing Instructions
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Provide corrective actions for production rework operators..."
                        value={reworkInstructions}
                        onChange={(e) => setReworkInstructions(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-amber-300 bg-white p-2.5 text-sm text-slate-800 shadow-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Parameter Checks Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Characteristic Parameter Readings
                  </label>
                  <button
                    type="button"
                    onClick={addParameterLine}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="size-3.5" /> Add Parameter
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Parameter</th>
                        <th className="px-3 py-2">Standard</th>
                        <th className="px-3 py-2">Actual Reading</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-2 py-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parameterLines.map((line, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="p-2">
                            <input
                              type="text"
                              value={line.parameterName}
                              onChange={(e) => handleLineChange(idx, "parameterName", e.target.value)}
                              placeholder="e.g. GSM / Width"
                              className="h-8 w-full rounded border border-slate-200 px-2 text-xs focus:border-primary focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={line.standardValue || ""}
                              onChange={(e) => handleLineChange(idx, "standardValue", e.target.value)}
                              placeholder="Standard"
                              className="h-8 w-full rounded border border-slate-200 px-2 text-xs focus:border-primary focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={line.actualValue}
                              onChange={(e) => handleLineChange(idx, "actualValue", e.target.value)}
                              placeholder="Measured value"
                              className="h-8 w-full rounded border border-slate-200 px-2 text-xs font-semibold text-slate-900 focus:border-primary focus:outline-none"
                            />
                          </td>
                          <td className="p-2 w-20">
                            <input
                              type="text"
                              value={line.unit || ""}
                              onChange={(e) => handleLineChange(idx, "unit", e.target.value)}
                              placeholder="Unit"
                              className="h-8 w-full rounded border border-slate-200 px-2 text-xs focus:border-primary focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeParameterLine(idx)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <X className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inspector Notes & Sample Size */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Inspector Observations / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional inspector remarks..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">
                    Sample Size Checked
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={samplesInspected}
                    onChange={(e) => setSamplesInspected(Number(e.target.value) || 1)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeInspectionModal}
                  disabled={submitting}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  Confirm QC Verdict
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
