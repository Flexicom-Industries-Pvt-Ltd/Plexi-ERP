"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Radio,
  X,
  FileText,
  FileSpreadsheet,
  Eye,
  Clock,
  Globe,
  Monitor,
  AlertTriangle,
  Info,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface LogEntry {
  id: string;
  timestamp: string;
  correlationId: string;
  userId: string | null;
  module: string;
  severity: string;
  action: string;
  payload: any;
  redactedPayload: any;
  ip: string | null;
  location: string | null;
  userAgent: string | null;
  durationMs: number | null;
  meta: any;
  diffs: LogDiff[];
  user?: { id: string; name: string; email: string } | null;
}

interface LogDiff {
  id: string;
  entity: string;
  entityId: string;
  before: any;
  after: any;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const MODULES = [
  "business",
  "security",
  "settings",
  "users",
  "dataDiff",
  "offline",
  "gate",
  "inventory",
  "production",
  "quality",
  "dispatch",
];

const SEVERITIES = ["INFO", "WARN", "ERROR"];

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  INFO: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Info },
  WARN: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: AlertTriangle },
  ERROR: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertCircle },
};

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function LogsClient() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Real-time
  const [liveMode, setLiveMode] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ── Fetch logs ──
  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(pagination.limit));
        if (search) params.set("search", search);
        if (moduleFilter) params.set("module", moduleFilter);
        if (severityFilter) params.set("severity", severityFilter);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);

        const res = await fetch(`/api/logs?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch logs");
        const json = await res.json();
        setLogs(json.data);
        setPagination(json.pagination);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    },
    [search, moduleFilter, severityFilter, fromDate, toDate, pagination.limit]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  // ── Real-time SSE ──
  useEffect(() => {
    if (!liveMode) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      return;
    }

    const es = new EventSource("/api/logs/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      if (event.data === "heartbeat") return;
      try {
        const entry = JSON.parse(event.data);
        setLogs((prev) => [entry, ...prev].slice(0, pagination.limit));
        setLiveCount((c) => c + 1);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      setLiveMode(false);
    };

    return () => {
      es.close();
    };
  }, [liveMode, pagination.limit]);

  // ── Export ──
  const handleExport = async (format: "csv" | "json") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (moduleFilter) params.set("module", moduleFilter);
    if (severityFilter) params.set("severity", severityFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    const res = await fetch(`/api/logs/export?${params.toString()}`);
    if (!res.ok) return;

    if (format === "csv") {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setModuleFilter("");
    setSeverityFilter("");
    setFromDate("");
    setToDate("");
  };

  const hasActiveFilters = search || moduleFilter || severityFilter || fromDate || toDate;

  return (
    <div className="space-y-4">
      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Entries"
          value={pagination.total.toLocaleString()}
          icon={<FileText className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          label="Live Events"
          value={liveCount.toLocaleString()}
          icon={<Radio className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          label="Current Page"
          value={`${pagination.page} / ${pagination.totalPages || 1}`}
          icon={<Monitor className="h-4 w-4" />}
          color="purple"
        />
        <StatCard
          label="Per Page"
          value={String(pagination.limit)}
          icon={<Clock className="h-4 w-4" />}
          color="orange"
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs by action, module, correlation ID, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 transition-all"
            />
          </div>

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
              showFilters || hasActiveFilters
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white/20 text-xs font-bold">
                !
              </span>
            )}
          </button>

          {/* Live Mode */}
          <button
            onClick={() => {
              setLiveMode(!liveMode);
              setLiveCount(0);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
              liveMode
                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm animate-pulse"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Radio className="h-4 w-4" />
            {liveMode ? "Live" : "Real-time"}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {/* Export */}
          <div className="relative group">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all">
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export as CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg transition-colors"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                Export as JSON
              </button>
            </div>
          </div>
        </div>

        {/* ── Advanced Filters ── */}
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-100">
            <FilterSelect
              label="Module"
              value={moduleFilter}
              onChange={setModuleFilter}
              options={MODULES}
              placeholder="All Modules"
            />
            <FilterSelect
              label="Severity"
              value={severityFilter}
              onChange={setSeverityFilter}
              options={SEVERITIES}
              placeholder="All Severities"
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">From</label>
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">To</label>
              <input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50"
              />
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Log Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[180px]">
                  Timestamp
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[100px]">
                  Severity
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[120px]">
                  Module
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[140px]">
                  IP Address
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[80px]">
                  Duration
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[60px]">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && logs.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <FileText className="h-12 w-12 stroke-1" />
                      <div>
                        <p className="font-medium text-slate-600">No log entries found</p>
                        <p className="text-sm">
                          {hasActiveFilters
                            ? "Try adjusting your filters"
                            : "System events will appear here as they occur"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <LogRow
                    key={log.id || log.correlationId}
                    log={log}
                    isExpanded={expandedRow === (log.id || log.correlationId)}
                    onToggle={() =>
                      setExpandedRow(
                        expandedRow === (log.id || log.correlationId)
                          ? null
                          : log.id || log.correlationId
                      )
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-700">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-slate-700">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-700">{pagination.total.toLocaleString()}</span>{" "}
              entries
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              {/* Page numbers */}
              {getPageNumbers(pagination.page, pagination.totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => fetchLogs(p as number)}
                    className={`inline-flex items-center justify-center h-8 w-8 text-sm rounded-lg transition-colors ${
                      p === pagination.page
                        ? "bg-primary text-white font-medium shadow-sm"
                        : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "from-blue-50 to-blue-100/50 border-blue-200 text-blue-700",
    green: "from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700",
    purple: "from-violet-50 to-violet-100/50 border-violet-200 text-violet-700",
    orange: "from-amber-50 to-amber-100/50 border-amber-200 text-amber-700",
  };

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border bg-gradient-to-br ${colors[color]} transition-all hover:shadow-sm`}
    >
      <div className="p-2 rounded-lg bg-white/60 shadow-sm">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 min-w-[140px]"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function LogRow({
  log,
  isExpanded,
  onToggle,
}: {
  log: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const sevConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
  const SevIcon = sevConfig.icon;

  const copyCorrelationId = () => {
    navigator.clipboard.writeText(log.correlationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ts = log.timestamp ? new Date(log.timestamp) : null;

  return (
    <>
      <tr
        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
          isExpanded ? "bg-slate-50" : ""
        }`}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="font-mono text-xs text-slate-700">
              {ts ? format(ts, "dd MMM yyyy") : "—"}
            </span>
            <span className="font-mono text-xs text-slate-400">
              {ts ? format(ts, "HH:mm:ss") : ""}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sevConfig.bg} ${sevConfig.color}`}
          >
            <SevIcon className="h-3 w-3" />
            {log.severity}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
            {log.module}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-slate-800 font-medium">{log.action}</span>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-slate-500">{log.ip || "—"}</span>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-slate-500">
            {log.durationMs != null ? `${log.durationMs}ms` : "—"}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <button
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <Eye className="h-4 w-4 text-slate-400" />
            )}
          </button>
        </td>
      </tr>

      {/* ── Expanded Detail ── */}
      {isExpanded && (
        <tr className="bg-slate-50/80">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Metadata */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Event Details
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <DetailItem
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label="Correlation ID"
                    value={
                      <span className="flex items-center gap-1">
                        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {log.correlationId?.slice(0, 12)}…
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyCorrelationId();
                          }}
                          className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                        >
                          {copied ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      </span>
                    }
                  />
                  <DetailItem
                    icon={<Monitor className="h-3.5 w-3.5" />}
                    label="User Agent"
                    value={
                      <span className="truncate max-w-[200px] block text-xs">{log.userAgent || "—"}</span>
                    }
                  />
                  <DetailItem
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label="IP Address"
                    value={log.ip || "—"}
                  />
                  <DetailItem
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label="Location"
                    value={log.location || "—"}
                  />
                  <DetailItem
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="Duration"
                    value={log.durationMs != null ? `${log.durationMs}ms` : "—"}
                  />
                  <DetailItem
                    icon={<Info className="h-3.5 w-3.5" />}
                    label="User"
                    value={
                      log.user ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{log.user.name}</span>
                          <span className="text-slate-400 text-xs">{log.user.email}</span>
                        </div>
                      ) : log.userId ? (
                        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {log.userId.slice(0, 12)}…
                        </code>
                      ) : (
                        "System"
                      )
                    }
                  />
                </div>
              </div>

              {/* Right: Payload */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Redacted Payload
                </h4>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                  {log.redactedPayload
                    ? JSON.stringify(log.redactedPayload, null, 2)
                    : log.payload
                    ? JSON.stringify(log.payload, null, 2)
                    : "No payload"}
                </pre>

                {/* Diffs */}
                {log.diffs && log.diffs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Data Changes
                    </h4>
                    {log.diffs.map((diff) => (
                      <div key={diff.id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                        <p className="font-medium text-slate-700 mb-2">
                          {diff.entity} ({diff.entityId.slice(0, 8)}…)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-red-500 font-semibold mb-1">Before</p>
                            <pre className="p-2 bg-red-50 rounded text-red-700 font-mono whitespace-pre-wrap overflow-auto max-h-[100px]">
                              {JSON.stringify(diff.before, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-emerald-600 font-semibold mb-1">After</p>
                            <pre className="p-2 bg-emerald-50 rounded text-emerald-700 font-mono whitespace-pre-wrap overflow-auto max-h-[100px]">
                              {JSON.stringify(diff.after, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Meta */}
                {log.meta && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meta</h4>
                    <pre className="p-3 bg-slate-100 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.meta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-100">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
        <div className="text-xs text-slate-700 font-medium">{value}</div>
      </div>
    </div>
  );
}

// ── Pagination helper ──
function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | string)[] = [1];
  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}
