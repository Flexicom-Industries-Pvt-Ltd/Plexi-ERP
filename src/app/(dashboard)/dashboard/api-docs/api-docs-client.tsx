"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import {
  BookOpen,
  Server,
  Search,
  Copy,
  Check,
  Layers,
  ShieldCheck,
  Truck,
  Package,
  Factory,
  FileText,
  Settings,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  Download,
  Terminal,
  Filter,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Scalar custom CSS aligned with Flexicom ERP theme */
const SCALAR_CUSTOM_CSS = `
  .scalar-app {
    --scalar-font: var(--font-sans, "Inter", system-ui, sans-serif);
    --scalar-font-code: var(--font-geist-mono, "JetBrains Mono", monospace);
    --scalar-color-accent: #0284c7;
    --scalar-background-accent: rgba(2, 132, 199, 0.08);
    --scalar-button-1: #0284c7;
    --scalar-button-1-hover: #0369a1;
    --scalar-button-1-color: #ffffff;
    --scalar-border-color: #e2e8f0;
    --scalar-background-1: #ffffff;
    --scalar-background-2: #f8fafc;
    --scalar-background-3: #f0f9ff;
    --scalar-color-1: #0f172a;
    --scalar-color-2: #64748b;
    --scalar-radius: 8px;
    --scalar-radius-lg: 12px;
    --scalar-radius-xl: 16px;
  }
  .scalar-app .sidebar {
    border-right: 1px solid #e2e8f0;
    background: #ffffff;
  }
  .scalar-app .section-header {
    font-weight: 700;
  }
  @media (max-width: 768px) {
    .scalar-app .sidebar {
      width: 100% !important;
    }
  }
`;

interface EndpointItem {
  id: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  summary: string;
  description: string;
  tag: string;
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    schema?: any;
  }>;
  requestBody?: any;
  responses?: any;
}

const MODULE_TABS = [
  { id: "ALL", label: "All APIs", icon: Layers, description: "All system endpoints" },
  { id: "Gate", label: "Gate & Logistics", icon: Truck, description: "Trucks, Gate Pass & Security" },
  { id: "Inventory", label: "Inventory & Stocks", icon: Package, description: "Raw Materials, WIP & Receipts" },
  { id: "Production", label: "Production & Looms", icon: Factory, description: "Shift Runs, Looms, BCS & Baling" },
  { id: "Settings", label: "Data Centre", icon: Settings, description: "Master Data, Machines & Locations" },
  { id: "Users", label: "Users & Roles", icon: User, description: "RBAC & Permissions" },
  { id: "Logs", label: "Audit & Logs", icon: FileText, description: "Traceability & System History" },
  { id: "System", label: "Health & Profile", icon: Activity, description: "Telemetry & Credentials" },
];

const METHOD_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  get: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-600 text-white",
  },
  post: {
    bg: "bg-sky-50 text-sky-700 border-sky-200",
    text: "text-sky-700",
    border: "border-sky-200",
    badge: "bg-sky-600 text-white",
  },
  put: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-600 text-white",
  },
  patch: {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-700",
    border: "border-amber-200",
    badge: "bg-amber-600 text-white",
  },
  delete: {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-700",
    border: "border-rose-200",
    badge: "bg-rose-600 text-white",
  },
};

export function ApiDocsClient() {
  const [viewMode, setViewMode] = useState<"directory" | "interactive">("directory");
  const [endpoints, setEndpoints] = useState<EndpointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/swagger")
      .then((res) => (res.ok ? res.json() : null))
      .then((spec) => {
        if (!spec || !spec.paths) return;

        const list: EndpointItem[] = [];
        Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
          Object.entries(methods).forEach(([method, def]: [string, any]) => {
            const validMethods = ["get", "post", "put", "patch", "delete"];
            if (!validMethods.includes(method.toLowerCase())) return;

            const primaryTag = Array.isArray(def.tags) && def.tags[0] ? def.tags[0] : "General";
            list.push({
              id: `${method.toUpperCase()} ${path}`,
              method: method.toLowerCase() as any,
              path,
              summary: def.summary || `${method.toUpperCase()} ${path}`,
              description: def.description || "Processes requests for this ERP business module.",
              tag: primaryTag,
              parameters: def.parameters,
              requestBody: def.requestBody,
              responses: def.responses,
            });
          });
        });

        // Sort by tag, then path
        list.sort((a, b) => a.tag.localeCompare(b.tag) || a.path.localeCompare(b.path));
        setEndpoints(list);
      })
      .catch((err) => {
        console.error("Failed to load API spec", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((item) => {
      // Tab filter
      if (activeTab !== "ALL") {
        if (activeTab === "Users" && (item.tag === "Users" || item.tag === "Roles")) {
          // matches
        } else if (activeTab === "System" && (item.tag === "System" || item.tag === "Profile" || item.tag === "Health")) {
          // matches
        } else if (item.tag !== activeTab) {
          return false;
        }
      }

      // Method filter
      if (methodFilter !== "ALL" && item.method.toUpperCase() !== methodFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          item.path.toLowerCase().includes(query) ||
          item.summary.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tag.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [endpoints, activeTab, methodFilter, searchQuery]);

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    toast.success(`Copied path: ${path}`);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleDownloadSpec = () => {
    const link = document.createElement("a");
    link.href = "/api/swagger";
    link.download = "plexi-erp-openapi-spec.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("OpenAPI JSON specification downloaded");
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 p-3.5 sm:p-6 max-w-7xl mx-auto w-full min-w-0">
      {/* ── Brand Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-slate-900 p-5 sm:p-8 text-white shadow-md">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Terminal className="w-64 h-64 text-white" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-sky-100 border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-sky-300" />
              <span>Plexi-ERP Enterprise API Directory</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
              API Documentation & Services
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed">
              Complete reference for ERP modules — Truck Gates, Raw Material Inventory, Looms & Production, Data Centre, and RBAC Security.
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-xs">
              <Server className="h-4 w-4 text-sky-300" />
              <div>
                <span className="block font-bold text-white">{endpoints.length || "70+"} Endpoints</span>
                <span className="text-[10px] text-sky-200">OpenAPI 3.0</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <div>
                <span className="block font-bold text-white">RBAC Guarded</span>
                <span className="text-[10px] text-sky-200">Role Permissions</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadSpec}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-sky-900 font-bold text-xs hover:bg-sky-50 transition-colors shadow-sm cursor-pointer touch-manipulation"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mode Switcher Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Toggle Buttons */}
        <div className="inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setViewMode("directory")}
            className={cn(
              "flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-bold transition-all cursor-pointer touch-manipulation",
              viewMode === "directory"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <BookOpen className="h-4 w-4 text-primary" />
            <span>Module Directory</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("interactive")}
            className={cn(
              "flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-bold transition-all cursor-pointer touch-manipulation",
              viewMode === "interactive"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Terminal className="h-4 w-4 text-primary" />
            <span>Interactive Playground</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 px-2">
          <span>Base URL:</span>
          <code className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
            /api
          </code>
        </div>
      </div>

      {/* ── View Mode: Interactive Scalar Playground ── */}
      {viewMode === "interactive" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[650px] w-full">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2 font-medium">
              <Terminal className="h-4 w-4 text-sky-600" />
              <span>Live Interactive Request Runner (Scalar)</span>
            </div>
            <a
              href="/api/swagger"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-semibold"
            >
              <span>Raw JSON Spec</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="h-[calc(100vh-14rem)] min-h-[600px] w-full bg-white">
            <ApiReferenceReact
              configuration={{
                spec: { url: "/api/swagger" },
                theme: "default",
                layout: "modern",
                darkMode: false,
                forceDarkModeState: "light",
                hideDarkModeToggle: true,
                showSidebar: true,
                hideModels: false,
                hideTestRequestButton: false,
                hideSearch: false,
                documentDownloadType: "both",
                defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
                customCss: SCALAR_CUSTOM_CSS,
                customFetch: (input, init) =>
                  fetch(input, { ...init, credentials: "include" }),
              }}
            />
          </div>
        </div>
      ) : (
        /* ── View Mode: Module Directory (Friendly, Visual & Mobile First) ── */
        <div className="space-y-4 sm:space-y-6 w-full">
          {/* Module Selector Chips */}
          <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar w-full">
            {MODULE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap cursor-pointer touch-manipulation",
                    isActive
                      ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-sky-600")} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            {/* Search Input */}
            <div className="sm:col-span-8 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search endpoints by keyword, path, or description (e.g. gate, stock, loom)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all bg-slate-50/50"
              />
            </div>

            {/* Method Filter */}
            <div className="sm:col-span-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white font-semibold text-slate-700"
              >
                <option value="ALL">All HTTP Methods</option>
                <option value="GET">GET (Read Data)</option>
                <option value="POST">POST (Create New)</option>
                <option value="PATCH">PATCH (Update Partial)</option>
                <option value="PUT">PUT (Replace)</option>
                <option value="DELETE">DELETE (Remove)</option>
              </select>
            </div>
          </div>

          {/* Endpoints Count Status */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing <strong className="text-slate-800">{filteredEndpoints.length}</strong> of{" "}
              <strong className="text-slate-800">{endpoints.length}</strong> registered endpoints
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-sky-600 hover:text-sky-700 font-bold underline cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <RefreshCw className="h-8 w-8 text-sky-500 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Loading OpenAPI Endpoint Catalog...</p>
            </div>
          ) : filteredEndpoints.length === 0 ? (
            /* Empty Search Results */
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Search className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No matching endpoints found</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Try searching for a different keyword like "gate", "inventory", "stock", "runs", or select "All APIs".
              </p>
            </div>
          ) : (
            /* Endpoint Cards List */
            <div className="space-y-3.5">
              {filteredEndpoints.map((item) => {
                const colors = METHOD_COLORS[item.method] || METHOD_COLORS.get;
                const isExpanded = expandedId === item.id;
                const isCopied = copiedPath === item.path;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "bg-white rounded-xl border border-slate-200 transition-all shadow-sm hover:shadow-md overflow-hidden",
                      isExpanded && "ring-1 ring-sky-500/30 border-sky-300"
                    )}
                  >
                    {/* Card Header & Summary */}
                    <div className="p-3.5 sm:p-5 flex flex-col gap-3">
                      {/* Row 1: Method Badge + Path + Tag + Copy Button */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          {/* Method Badge */}
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider font-mono border shrink-0",
                              colors.bg
                            )}
                          >
                            {item.method}
                          </span>

                          {/* Monospace Path with Copy */}
                          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/80 min-w-0 max-w-full">
                            <code className="text-xs sm:text-sm font-mono font-bold text-slate-800 truncate">
                              {item.path}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.path)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer shrink-0"
                              title="Copy endpoint path"
                            >
                              {isCopied ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Module Tag Badge */}
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {item.tag}
                        </span>
                      </div>

                      {/* Row 2: Plain-English Summary & Action Purpose */}
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {item.summary}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Row 3: Parameter Pills & Expand Toggle */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          <ShieldCheck className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                          <span>Session Authentication & RBAC Required</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="inline-flex items-center gap-1 font-bold text-sky-600 hover:text-sky-700 cursor-pointer touch-manipulation"
                        >
                          <span>{isExpanded ? "Hide Details" : "View Parameters & Schemas"}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Technical Details Drawer */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-200 space-y-4 text-xs">
                        {/* Parameters Table */}
                        {item.parameters && item.parameters.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                              Request Parameters
                            </h4>
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
                              {item.parameters.map((param, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                                >
                                  <div className="flex items-center gap-2 font-mono">
                                    <span className="font-bold text-slate-800">{param.name}</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {param.in}
                                    </span>
                                    {param.required && (
                                      <span className="text-[10px] text-red-600 font-bold">Required</span>
                                    )}
                                  </div>
                                  <div className="text-slate-500 text-[11px]">
                                    {param.description || (param.schema?.type ? `Type: ${param.schema.type}` : "Parameter")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Request Body Info */}
                        {item.requestBody && (
                          <div className="space-y-1.5">
                            <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                              Request Body Payload
                            </h4>
                            <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-600 font-mono text-[11px]">
                              Content-Type: <code>application/json</code> (Zod Schema Validated)
                            </div>
                          </div>
                        )}

                        {/* Quick cURL Example */}
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                            cURL Example
                          </h4>
                          <div className="relative group">
                            <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed">
                              {`curl -X ${item.method.toUpperCase()} "${window.location.origin}${item.path}" \\
  -H "Content-Type: application/json" \\
  -H "Cookie: next-auth.session-token=..."`}
                            </pre>
                            <button
                              type="button"
                              onClick={() => {
                                const cmd = `curl -X ${item.method.toUpperCase()} "${window.location.origin}${item.path}" -H "Content-Type: application/json"`;
                                navigator.clipboard.writeText(cmd);
                                toast.success("cURL command copied to clipboard");
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                              title="Copy cURL command"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
