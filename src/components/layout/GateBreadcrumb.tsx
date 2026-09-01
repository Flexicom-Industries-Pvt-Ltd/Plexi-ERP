"use client";

import { useLayoutEffect } from "react";
import { useBreadcrumbLabel } from "./breadcrumb-context";

export function GateBreadcrumb({ entryNumber }: { entryNumber: string }) {
  const ctx = useBreadcrumbLabel();

  if (ctx && ctx.pageLabel !== entryNumber) {
    ctx.setPageLabel(entryNumber);
  }

  useLayoutEffect(() => {
    return () => ctx?.setPageLabel(null);
  }, [ctx]);

  return null;
}
