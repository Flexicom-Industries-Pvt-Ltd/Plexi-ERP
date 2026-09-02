"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Check,
  Copy,
  Download,
  Lock,
  Search,
  Server,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OpenApiSpec = {
  info: { title: string; description?: string; version: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
  tags?: { name: string; description?: string }[];
};

type OpenApiOperation = {
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Record<string, unknown>[];
  responses?: Record<string, { description?: string }>;
};

type Endpoint = {
  id: string;
  method: string;
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  secured: boolean;
};

const TAG_ORDER = [
  "Authentication",
  "Gate",
  "Inventory",
  "Production",
  "Data Centre",
  "Settings",
  "Profile",
  "Logs & Audit",
  "System",
];

const METHOD_STYLES: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  POST: "bg-sky-500/10 text-sky-700 border-sky-200",
  PUT: "bg-amber-500/10 text-amber-700 border-amber-200",
  PATCH: "bg-orange-500/10 text-orange-700 border-orange-200",
  DELETE: "bg-red-500/10 text-red-700 border-red-200",
};

function parseEndpoints(spec: OpenApiSpec): Endpoint[] {
  const endpoints: Endpoint[] = [];
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (method === "parameters") continue;
      const operation = op as OpenApiOperation;
      endpoints.push({
        id: `${method}:${path}`,
        method: method.toUpperCase(),
        path,
        summary: operation.summary ?? path,
        description: operation.description,
        tags: operation.tags ?? ["Other"],
        secured: operation.security !== undefined && operation.security.length > 0,
      });
    }
  }
  return endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

function groupByTag(endpoints: Endpoint[]) {
  const groups = new Map<string, Endpoint[]>();
  for (const ep of endpoints) {
    const tag = ep.tags[0] ?? "Other";
    if (!groups.has(tag)) groups.set(tag, []);
    groups.get(tag)!.push(ep);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    const ai = TAG_ORDER.indexOf(a);
    const bi = TAG_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[4.5rem] items-center justify-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide",
        METHOD_STYLES[method] ?? "bg-muted text-muted-foreground border-border"
      )}
    >
      {method}
    </span>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [copied, setCopied] = useState(false);

  const copyPath = async () => {
    await navigator.clipboard.writeText(endpoint.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card
      id={endpoint.id}
      className="scroll-mt-24 border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md"
    >
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <MethodBadge method={endpoint.method} />
          <code className="flex-1 font-mono text-sm text-slate-800">{endpoint.path}</code>
          <div className="flex items-center gap-2">
            {endpoint.secured ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <Lock className="size-3" />
                Auth required
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Shield className="size-3" />
                Public
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="size-8" onClick={copyPath} title="Copy path">
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
        </div>
        <CardTitle className="text-base font-semibold text-slate-900">{endpoint.summary}</CardTitle>
        {endpoint.description && (
          <CardDescription className="text-sm leading-relaxed">{endpoint.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 font-mono text-xs text-slate-600">
          <span className="font-semibold text-slate-500">Base URL</span>{" "}
          <span className="text-primary">/api</span>
          <span>{endpoint.path.replace(/^\/api/, "")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApiDocsClient() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/swagger")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load API specification");
        return r.json();
      })
      .then((data) => setSpec(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const endpoints = useMemo(() => (spec ? parseEndpoints(spec) : []), [spec]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = endpoints;
    if (activeTag) list = list.filter((e) => e.tags.includes(activeTag));
    if (!q) return list;
    return list.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [endpoints, search, activeTag]);

  const grouped = useMemo(() => groupByTag(filtered), [filtered]);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ep of endpoints) {
      const tag = ep.tags[0] ?? "Other";
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return counts;
  }, [endpoints]);

  const downloadSpec = () => {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flexicom-erp-openapi.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Skeleton className="h-96 rounded-xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Failed to load API documentation</CardTitle>
          <CardDescription>{error ?? "Unknown error"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-sky-400 p-6 text-white shadow-lg md:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sky-100">
              <BookOpen className="size-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">Developer Reference</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{spec.info.title}</h1>
            <p className="max-w-2xl text-sm text-sky-50/90 md:text-base">
              {spec.info.description ?? "Complete API reference for all Flexicom ERP modules."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
              <Server className="size-4" />
              <span className="text-sm font-medium">{endpoints.length} endpoints</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
              <span className="text-sm font-medium">v{spec.info.version}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/90 text-sky-700 hover:bg-white"
              onClick={downloadSpec}
            >
              <Download className="size-4" />
              Download OpenAPI
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search endpoints by path, method, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 border-slate-200 bg-white pl-10 shadow-sm"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tag sidebar */}
        <Card className="h-fit border-slate-200/80 bg-white/90 shadow-sm ring-1 ring-black/5 lg:sticky lg:top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Modules</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[calc(100vh-20rem)]">
              <nav className="flex flex-col gap-0.5 p-2">
                <button
                  type="button"
                  onClick={() => setActiveTag(null)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    activeTag === null
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span>All APIs</span>
                  <span className="text-xs text-muted-foreground">{endpoints.length}</span>
                </button>
                {TAG_ORDER.filter((t) => tagCounts.has(t)).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      activeTag === tag
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span>{tag}</span>
                    <span className="text-xs text-muted-foreground">{tagCounts.get(tag)}</span>
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Endpoint list */}
        <div className="flex flex-col gap-8">
          {grouped.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <Search className="size-8 text-muted-foreground/50" />
                <p className="font-medium text-slate-700">No endpoints match your search</p>
                <p className="text-sm text-muted-foreground">Try a different keyword or clear filters</p>
              </CardContent>
            </Card>
          ) : (
            grouped.map(([tag, eps]) => (
              <section key={tag} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-800">{tag}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {eps.length}
                  </Badge>
                </div>
                <div className="flex flex-col gap-3">
                  {eps.map((ep) => (
                    <EndpointCard key={ep.id} endpoint={ep} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
