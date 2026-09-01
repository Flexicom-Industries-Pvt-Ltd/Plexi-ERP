"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";
import React from "react";
import { useBreadcrumbLabel } from "@/components/layout/breadcrumb-context";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  gate: "Gate",
  inventory: "Inventory",
  production: "Production",
  quality: "Quality Control",
  dispatch: "Dispatch",
  settings: "Settings",
  "data-centre": "Data Centre",
};

function formatSegment(segment: string, parent?: string) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (parent === "gate" && /^GE-\d/.test(segment)) return segment;
  if (parent === "gate") return "Entry";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function AppHeader() {
  const pathname = usePathname();
  const breadcrumb = useBreadcrumbLabel();

  const paths = pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/50 bg-white/70 px-4 backdrop-blur-xl shadow-sm">
      <SidebarTrigger className="-ml-1" />
      <div className="mr-2 h-4 w-px bg-border" />

      <Breadcrumb>
        <BreadcrumbList>
          {paths.map((path, index) => {
            const href = "/" + paths.slice(0, index + 1).join("/");
            const isLast = index === paths.length - 1;
            const parent = index > 0 ? paths[index - 1] : undefined;
            const title =
              isLast && breadcrumb?.pageLabel
                ? breadcrumb.pageLabel
                : formatSegment(path, parent);

            return (
              <React.Fragment key={path}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="font-semibold text-primary">{title}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
