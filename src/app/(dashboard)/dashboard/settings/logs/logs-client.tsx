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
  Shield,
  Activity,
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Smartphone,
  Laptop,
  Tablet,
  User,
  Link2,
  Hash,
} from "lucide-react";
import { format } from "date-fns";

import { TelemetryTab } from "./telemetry-tab";

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
  httpMethod: string | null;
  url: string | null;
  statusCode: number | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
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

interface Stats {
  total: number;
  errorsToday: number;
  warningsToday: number;
  securityToday: number;
  avgDurationMs: number;
  uniqueUsersToday: number;
}

interface FilterOptions {
  modules: string[];
  users: { id: string; name: string; email: string }[];
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const SEVERITIES = ["INFO", "NOTICE", "WARN", "ERROR", "CRITICAL", "SECURITY"];
const HTTP_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: any; dot: string }> = {
  INFO: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Info, dot: "bg-blue-500" },
  NOTICE: { color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200", icon: Info, dot: "bg-cyan-500" },
  WARN: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: AlertTriangle, dot: "bg-amber-500" },
  ERROR: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertCircle, dot: "bg-red-500" },
  CRITICAL: { color: "text-rose-800", bg: "bg-rose-100 border-rose-300", icon: AlertCircle, dot: "bg-rose-600" },
  SECURITY: { color: "text-violet-700", bg: "bg-violet-50 border-violet-200", icon: Shield, dot: "bg-violet-500" },
};

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-700 bg-emerald-50 border-emerald-200",
  POST: "text-blue-700 bg-blue-50 border-blue-200",
  PATCH: "text-amber-700 bg-amber-50 border-amber-200",
  PUT: "text-orange-700 bg-orange-50 border-orange-200",
  DELETE: "text-red-700 bg-red-50 border-red-200",
};

function getStatusColor(code: number | null) {
  if (!code) return "text-slate-400";
  if (code >= 200 && code < 300) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (code >= 400 && code < 500) return "text-amber-600 bg-amber-50 border-amber-200";
  if (code >= 500) return "text-red-600 bg-red-50 border-red-200";
  return "text-slate-500";
}

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
  const [stats, setStats] = useState<Stats>({
    total: 0,
    errorsToday: 0,
    warningsToday: 0,
    securityToday: 0,
    avgDurationMs: 0,
    uniqueUsersToday: 0,
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    modules: [],
    users: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [relatedLogs, setRelatedLogs] = useState<LogEntry[]>([]);

  // Top-level tab switcher
  const [activeMainTab, setActiveMainTab] = useState<"logs" | "telemetry">("logs");

  // Filters
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [httpMethodFilter, setHttpMethodFilter] = useState("");
  const [statusCodeFilter, setStatusCodeFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
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
        if (httpMethodFilter) params.set("httpMethod", httpMethodFilter);
        if (statusCodeFilter) params.set("statusCode", statusCodeFilter);
        if (userFilter) params.set("userId", userFilter);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);

        const res = await fetch(`/api/logs?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch logs");
        const json = await res.json();
        setLogs(json.data);
        setPagination(json.pagination);
        if (json.stats) setStats(json.stats);
        if (json.filterOptions) setFilterOptions(json.filterOptions);
      } catch (err) {
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    },
    [search, moduleFilter, severityFilter, httpMethodFilter, statusCodeFilter, userFilter, fromDate, toDate, pagination.limit]
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
  const handleExport = async (fmt: "csv" | "json") => {
    const params = new URLSearchParams();
    params.set("format", fmt);
    if (moduleFilter) params.set("module", moduleFilter);
    if (severityFilter) params.set("severity", severityFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    const res = await fetch(`/api/logs/export?${params.toString()}`);
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setModuleFilter("");
    setSeverityFilter("");
    setHttpMethodFilter("");
    setStatusCodeFilter("");
    setUserFilter("");
    setFromDate("");
    setToDate("");
  };

  const hasActiveFilters = search || moduleFilter || severityFilter || httpMethodFilter || statusCodeFilter || userFilter || fromDate || toDate;

  // ── Pagination helper ──
  const getPageNumbers = (current: number, total: number): (number | "...")[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (current > 3) pages.push("...");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  };

  // ── Open detail panel ──
  const openDetail = async (log: LogEntry) => {
    setSelectedLog(log);
    setRelatedLogs([]);
  };

  return (
    <div className="space-y-4">
      {/* ── Main Tab Switcher ── */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-max mb-6">
        <button
          onClick={() => setActiveMainTab("logs")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeMainTab === "logs"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Activity className="h-4 w-4" />
          Live Logs Table
        </button>
        <button
          onClick={() => setActiveMainTab("telemetry")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeMainTab === "telemetry"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Activity className="h-4 w-4" />
          System Telemetry
        </button>
      </div>

      {activeMainTab === "telemetry" ? (
        <TelemetryTab />
      ) : (
        <>
          {/* ── Stats Bar ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Entries"
          value={stats.total.toLocaleString()}
          icon={<FileText className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          label="Errors Today"
          value={String(stats.errorsToday)}
          icon={<AlertCircle className="h-4 w-4" />}
          color="red"
        />
        <StatCard
          label="Warnings Today"
          value={String(stats.warningsToday)}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="amber"
        />
        <StatCard
          label="Security Events"
          value={String(stats.securityToday)}
          icon={<Shield className="h-4 w-4" />}
          color="violet"
        />
        <StatCard
          label="Avg Response"
          value={stats.avgDurationMs ? `${stats.avgDurationMs}ms` : "—"}
          icon={<Zap className="h-4 w-4" />}
          color="emerald"
        />
        <StatCard
          label="Active Users"
          value={String(stats.uniqueUsersToday)}
          icon={<Users className="h-4 w-4" />}
          color="purple"
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs by action, module, correlation ID, IP, URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50"
            />
          </div>

          {/* Toggle Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-primary text-white border-primary"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
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

          {/* Real-time */}
          <button
            onClick={() => {
              setLiveMode(!liveMode);
              if (!liveMode) setLiveCount(0);
            }}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              liveMode
                ? "bg-emerald-500 text-white border-emerald-500 animate-pulse"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Radio className="h-4 w-4" />
            {liveMode ? `Live (${liveCount})` : "Real-time"}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchLogs(pagination.page)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          {/* Export */}
          <div className="relative group">
            <button className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 rounded-t-lg"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 rounded-b-lg"
              >
                <FileText className="h-4 w-4 text-blue-600" />
                Export JSON
              </button>
            </div>
          </div>
        </div>

        {/* ── Expanded Filters ── */}
        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
            <FilterSelect
              label="Module"
              value={moduleFilter}
              onChange={setModuleFilter}
              options={filterOptions.modules}
              placeholder="All Modules"
            />
            <FilterSelect
              label="Severity"
              value={severityFilter}
              onChange={setSeverityFilter}
              options={SEVERITIES}
              placeholder="All Severities"
            />
            <FilterSelect
              label="HTTP Method"
              value={httpMethodFilter}
              onChange={setHttpMethodFilter}
              options={HTTP_METHODS}
              placeholder="All Methods"
            />
            <FilterSelect
              label="Status Code"
              value={statusCodeFilter}
              onChange={setStatusCodeFilter}
              options={["200", "400", "500"]}
              placeholder="All Statuses"
              optionLabels={["2xx Success", "4xx Client Error", "5xx Server Error"]}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">User</label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 min-w-[160px]"
              >
                <option value="">All Users</option>
                {filterOptions.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
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
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Data Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[150px]">
                  Timestamp
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[90px]">
                  Severity
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[130px]">
                  Module
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[100px]">
                  Method
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[70px]">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[120px]">
                  User
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[120px]">
                  IP Address
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[70px]">
                  Duration
                </th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[50px]">
                  <Eye className="h-3.5 w-3.5 mx-auto" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && logs.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
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
                    onSelect={() => openDetail(log)}
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

      {/* ── Detail Panel (Slide-out overlay) ── */}
      {selectedLog && (
        <LogDetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
      {/* ── End of Logs Tab ── */}
        </>
      )}
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
  color: "blue" | "red" | "amber" | "violet" | "emerald" | "purple";
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-50 to-blue-100/50 border-blue-200 text-blue-700",
    red: "from-red-50 to-red-100/50 border-red-200 text-red-700",
    amber: "from-amber-50 to-amber-100/50 border-amber-200 text-amber-700",
    violet: "from-violet-50 to-violet-100/50 border-violet-200 text-violet-700",
    emerald: "from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700",
    purple: "from-purple-50 to-purple-100/50 border-purple-200 text-purple-700",
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
  optionLabels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  optionLabels?: string[];
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
        {options.map((opt, i) => (
          <option key={opt} value={opt}>
            {optionLabels ? optionLabels[i] : opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function LogRow({
  log,
  onSelect,
}: {
  log: LogEntry;
  onSelect: () => void;
}) {
  const sevConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
  const SevIcon = sevConfig.icon;
  const ts = log.timestamp ? new Date(log.timestamp) : null;

  return (
    <tr
      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      {/* Timestamp */}
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

      {/* Severity */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sevConfig.bg} ${sevConfig.color}`}
        >
          <SevIcon className="h-3 w-3" />
          {log.severity}
        </span>
      </td>

      {/* Module */}
      <td className="px-4 py-3">
        <span className="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
          {log.module}
        </span>
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        <span className="text-sm text-slate-800 font-medium line-clamp-1">{log.action}</span>
      </td>

      {/* HTTP Method */}
      <td className="px-4 py-3">
        {log.httpMethod ? (
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${METHOD_COLORS[log.httpMethod] || "text-slate-600 bg-slate-50 border-slate-200"}`}>
            {log.httpMethod}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>

      {/* Status Code */}
      <td className="px-4 py-3">
        {log.statusCode ? (
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(log.statusCode)}`}>
            {log.statusCode}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>

      {/* User */}
      <td className="px-4 py-3">
        {log.user ? (
          <span className="text-xs text-slate-700 font-medium truncate max-w-[100px] block">{log.user.name}</span>
        ) : (
          <span className="text-xs text-slate-300 italic">System</span>
        )}
      </td>

      {/* IP */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-slate-500">{log.ip || "—"}</span>
      </td>

      {/* Duration */}
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-slate-500">
          {log.durationMs != null ? `${log.durationMs}ms` : "—"}
        </span>
      </td>

      {/* View */}
      <td className="px-4 py-3 text-center">
        <button
          className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <Eye className="h-4 w-4 text-slate-400" />
        </button>
      </td>
    </tr>
  );
}

// ──────────────────────────────────────────────
// Log Detail Panel (Slide-out)
// ──────────────────────────────────────────────

function LogDetailPanel({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "payload" | "changes">("overview");
  const sevConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
  const SevIcon = sevConfig.icon;
  const ts = log.timestamp ? new Date(log.timestamp) : null;

  const copyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const DeviceIcon = log.deviceType === "mobile" ? Smartphone : log.deviceType === "tablet" ? Tablet : Laptop;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${sevConfig.bg} border`}>
                <SevIcon className={`h-5 w-5 ${sevConfig.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Log Detail</h2>
                <p className="text-xs text-slate-400">
                  {ts ? format(ts, "dd MMM yyyy, HH:mm:ss") : "—"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {(["overview", "payload", "changes"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {tab === "overview" ? "Overview" : tab === "payload" ? "Payload & Meta" : "Data Changes"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">

          {/* ── Overview Tab ── */}
          {activeTab === "overview" && (
            <>
              {/* Event Summary */}
              <Section title="Event Summary">
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Severity">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sevConfig.bg} ${sevConfig.color}`}>
                      <SevIcon className="h-3 w-3" />
                      {log.severity}
                    </span>
                  </DetailField>
                  <DetailField label="Module">
                    <span className="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                      {log.module}
                    </span>
                  </DetailField>
                  <DetailField label="Action" full>
                    <p className="text-sm font-semibold text-slate-800">{log.action}</p>
                  </DetailField>
                  <DetailField label="Correlation ID" full>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{log.correlationId}</code>
                      <button
                        onClick={() => copyId(log.correlationId)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                      </button>
                    </div>
                  </DetailField>
                  <DetailField label="Timestamp">
                    <p className="text-sm text-slate-700 font-mono">
                      {ts ? format(ts, "dd MMM yyyy, HH:mm:ss") : "—"}
                    </p>
                  </DetailField>
                  <DetailField label="Duration">
                    <p className="text-sm text-slate-700 font-mono">
                      {log.durationMs != null ? `${log.durationMs}ms` : "—"}
                    </p>
                  </DetailField>
                </div>
              </Section>

              {/* Request Info */}
              {(log.httpMethod || log.url || log.statusCode) && (
                <Section title="Request Info">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailField label="HTTP Method">
                      {log.httpMethod ? (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${METHOD_COLORS[log.httpMethod] || ""}`}>
                          {log.httpMethod}
                        </span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </DetailField>
                    <DetailField label="Status Code">
                      {log.statusCode ? (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(log.statusCode)}`}>
                          {log.statusCode}
                        </span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </DetailField>
                    {log.url && (
                      <DetailField label="URL" full>
                        <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded break-all block">{log.url}</code>
                      </DetailField>
                    )}
                  </div>
                </Section>
              )}

              {/* User Info */}
              <Section title="User">
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Name">
                    <p className="text-sm font-semibold text-slate-700">{log.user?.name || "System"}</p>
                  </DetailField>
                  <DetailField label="Email">
                    <p className="text-sm text-slate-600">{log.user?.email || "—"}</p>
                  </DetailField>
                  <DetailField label="User ID" full>
                    {log.userId ? (
                      <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{log.userId}</code>
                    ) : <span className="text-xs text-slate-300">N/A (System)</span>}
                  </DetailField>
                </div>
              </Section>

              {/* Device & Client */}
              <Section title="Device & Client">
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Device">
                    <div className="flex items-center gap-2">
                      <DeviceIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-700 capitalize">{log.deviceType || "—"}</span>
                    </div>
                  </DetailField>
                  <DetailField label="Browser">
                    <p className="text-sm text-slate-700">{log.browser || "—"}</p>
                  </DetailField>
                  <DetailField label="Operating System">
                    <p className="text-sm text-slate-700">{log.os || "—"}</p>
                  </DetailField>
                  <DetailField label="IP Address">
                    <p className="text-sm text-slate-700 font-mono">{log.ip || "—"}</p>
                  </DetailField>
                  {log.userAgent && (
                    <DetailField label="Full User Agent" full>
                      <p className="text-xs text-slate-500 break-all">{log.userAgent}</p>
                    </DetailField>
                  )}
                </div>
              </Section>
            </>
          )}

          {/* ── Payload Tab ── */}
          {activeTab === "payload" && (
            <>
              <Section title="Redacted Payload">
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {log.redactedPayload
                    ? JSON.stringify(log.redactedPayload, null, 2)
                    : "No payload"}
                </pre>
              </Section>

              {log.meta && (
                <Section title="Meta">
                  <pre className="p-4 bg-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed text-slate-700">
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                </Section>
              )}
            </>
          )}

          {/* ── Data Changes Tab ── */}
          {activeTab === "changes" && (
            <>
              {log.diffs && log.diffs.length > 0 ? (
                log.diffs.map((diff) => (
                  <Section key={diff.id} title={`${diff.entity} (${diff.entityId.slice(0, 8)}…)`}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-red-500 mb-2">Before</p>
                        <pre className="p-3 bg-red-50 rounded-lg text-xs font-mono text-red-700 whitespace-pre-wrap overflow-auto max-h-[250px] border border-red-200">
                          {JSON.stringify(diff.before, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 mb-2">After</p>
                        <pre className="p-3 bg-emerald-50 rounded-lg text-xs font-mono text-emerald-700 whitespace-pre-wrap overflow-auto max-h-[250px] border border-emerald-200">
                          {JSON.stringify(diff.after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </Section>
                ))
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No data changes recorded</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Data change diffs are only available for update/delete operations
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Micro-components
// ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function DetailField({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {children}
    </div>
  );
}
