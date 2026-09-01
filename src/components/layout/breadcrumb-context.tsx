"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";

type BreadcrumbContextValue = {
  pageLabel: string | null;
  setPageLabel: (label: string | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [pageLabel, setPageLabel] = useState<string | null>(null);
  const value = useMemo(() => ({ pageLabel, setPageLabel }), [pageLabel]);

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbLabel() {
  return useContext(BreadcrumbContext);
}
