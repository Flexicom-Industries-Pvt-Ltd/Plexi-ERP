"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const cacheListeners = new Map<string, Set<() => void>>();

export function mutateCache(urlKey: string) {
  memoryCache.delete(urlKey);
  const listeners = cacheListeners.get(urlKey);
  if (listeners) {
    listeners.forEach((listener) => listener());
  }
}

export interface UseDataQueryOptions<T> {
  initialData?: T;
  dedupingInterval?: number; // ms to consider cache fresh
  revalidateOnFocus?: boolean;
}

export interface UseDataQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (newData?: T | Promise<T>, shouldRevalidate?: boolean) => Promise<T | undefined>;
  refetch: () => Promise<void>;
}

export function useDataQuery<T>(
  url: string | null,
  options: UseDataQueryOptions<T> = {}
): UseDataQueryResult<T> {
  const { initialData, dedupingInterval = 5000 } = options;

  const cached = url ? memoryCache.get(url) : undefined;
  const [data, setData] = useState<T | undefined>(() => cached?.data ?? initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(!cached && !initialData && Boolean(url));

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(
    async (showLoading = false) => {
      if (!url) return;

      const now = Date.now();
      const existing = memoryCache.get(url);

      if (existing && now - existing.timestamp < dedupingInterval && !showLoading) {
        if (isMountedRef.current) {
          setData(existing.data);
          setIsLoading(false);
        }
        return;
      }

      if (isMountedRef.current) {
        if (showLoading) setIsLoading(true);
        setIsValidating(true);
      }

      try {
        const res = await fetch(url);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
        const json = await res.json();
        
        // Unpack { success: true, data: [...] } if enveloped, or raw data
        const extractedData = json?.success && json?.data !== undefined ? json.data : json;

        memoryCache.set(url, { data: extractedData, timestamp: Date.now() });

        if (isMountedRef.current) {
          setData(extractedData);
          setError(null);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsValidating(false);
        }
      }
    },
    [url, dedupingInterval]
  );

  useEffect(() => {
    if (!url) return;

    // Register cache listener for global mutate triggers
    let listeners = cacheListeners.get(url);
    if (!listeners) {
      listeners = new Set();
      cacheListeners.set(url, listeners);
    }
    const listener = () => {
      fetchData(false);
    };
    listeners.add(listener);

    // Initial fetch (if cache not fresh)
    fetchData(Boolean(!cached && !initialData));

    return () => {
      listeners?.delete(listener);
    };
  }, [url, fetchData, cached, initialData]);

  const mutate = useCallback(
    async (newData?: T | Promise<T>, shouldRevalidate = true): Promise<T | undefined> => {
      if (!url) return undefined;

      if (newData !== undefined) {
        const resolved = await newData;
        memoryCache.set(url, { data: resolved, timestamp: Date.now() });
        if (isMountedRef.current) {
          setData(resolved);
        }
      }

      if (shouldRevalidate) {
        await fetchData(false);
      }

      return memoryCache.get(url)?.data;
    },
    [url, fetchData]
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    refetch: () => fetchData(true),
  };
}
