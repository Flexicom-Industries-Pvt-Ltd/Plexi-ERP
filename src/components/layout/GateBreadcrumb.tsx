"use client";

import { useLayoutEffect } from "react";
import { useBreadcrumbLabel } from "./breadcrumb-context";

export function GateBreadcrumb({ entryNumber }: { entryNumber: string }) {
  const ctx = useBreadcrumbLabel();

  useLayoutEffect(() => {
    ctx?.setPageLabel(entryNumber);
    return () => ctx?.setPageLabel(null);
  }, [ctx, entryNumber]);

  return null;
}
