"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { BookOpen, Server } from "lucide-react";

/** Scalar theme overrides to match Flexicom ERP sky-blue dashboard aesthetic */
const SCALAR_CUSTOM_CSS = `
  .scalar-app {
    --scalar-font: var(--font-sans, "Inter", system-ui, sans-serif);
    --scalar-font-code: var(--font-geist-mono, "JetBrains Mono", monospace);
    --scalar-color-accent: #0ea5e9;
    --scalar-background-accent: rgba(14, 165, 233, 0.08);
    --scalar-button-1: #0ea5e9;
    --scalar-button-1-hover: #0284c7;
    --scalar-button-1-color: #ffffff;
    --scalar-border-color: #e2e8f0;
    --scalar-background-1: #ffffff;
    --scalar-background-2: #f8fafc;
    --scalar-background-3: #f0f9ff;
    --scalar-color-1: #0f172a;
    --scalar-color-2: #64748b;
    --scalar-radius: 6px;
    --scalar-radius-lg: 8px;
    --scalar-radius-xl: 12px;
  }
  .scalar-app .sidebar {
    border-right: 1px solid #e2e8f0;
    background: #ffffff;
  }
  .scalar-app .section-header {
    font-weight: 600;
  }
`;

export function ApiDocsClient() {
  return (
    <div className="flex flex-col gap-0 -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Dashboard-styled header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 to-sky-400 px-4 py-5 text-white md:px-6 md:py-6">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sky-100">
              <BookOpen className="size-4" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Developer Reference</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">API Documentation</h1>
            <p className="text-sm text-sky-50/90">
              Interactive reference — browse schemas, select a client language, and test requests live.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 backdrop-blur-sm">
            <Server className="size-4" />
            <span className="text-sm font-medium">71 endpoints · OpenAPI 3.0</span>
          </div>
        </div>
      </div>

      {/* Scalar interactive reference */}
      <div className="h-[calc(100vh-12rem)] min-h-[600px] w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] border-t border-slate-200 bg-white">
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
  );
}
