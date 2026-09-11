"use client";

import { useEffect } from "react";
import { useBreadcrumbLabel } from "./breadcrumb-context";

export function GateBreadcrumb({ entryNumber }: { entryNumber: string }) {
  const ctx = useBreadcrumbLabel();

  useEffect(() => {
    ctx?.setPageLabel(entryNumber);
    return () => {
      ctx?.setPageLabel(null);
    };
  }, [entryNumber, ctx]);

  return null;
}
