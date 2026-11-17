"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ProductionSyncEvent, ProductionSyncUser } from "@/lib/realtime/production-bus";

interface UseProductionRealtimeOptions {
  module: "loom" | "tape-plant" | "lamination" | "printing" | "convertex" | "valvomatic" | string;
  sheet: string;
  date?: string;
  shift?: string;
  currentUser?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  onSync?: (event: ProductionSyncEvent) => void;
  enabled?: boolean;
}

interface UseProductionRealtimeResult {
  isConnected: boolean;
  lastUpdatedBy: ProductionSyncUser | null;
  lastUpdatedAt: Date | null;
  lastAction: string | null;
  isSelfUpdate: boolean;
  broadcastSync: (params?: { action?: string; date?: string; shift?: string; metadata?: Record<string, any> }) => void;
}

const BROADCAST_CHANNEL_NAME = "plexi-production-realtime";

export function useProductionRealtime({
  module: mod,
  sheet,
  date,
  shift,
  currentUser,
  onSync,
  enabled = true,
}: UseProductionRealtimeOptions): UseProductionRealtimeResult {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<ProductionSyncUser | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isSelfUpdate, setIsSelfUpdate] = useState(false);

  const [activeUser, setActiveUser] = useState<ProductionSyncUser>({
    name: currentUser?.name || "",
    email: currentUser?.email || undefined,
    role: currentUser?.role || "",
  });

  useEffect(() => {
    if (currentUser?.name && currentUser?.role) {
      setActiveUser({
        name: currentUser.name,
        email: currentUser.email || undefined,
        role: currentUser.role,
      });
      return;
    }

    if (typeof window === "undefined") return;

    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (session?.user) {
          setActiveUser({
            name: session.user.name || session.user.email?.split("@")[0] || "Operator",
            email: session.user.email,
            role: session.user.role || "Staff",
          });
        }
      })
      .catch(() => {});
  }, [currentUser]);

  const clientIdRef = useRef<string>("");
  if (!clientIdRef.current && typeof window !== "undefined") {
    clientIdRef.current = "client_" + Math.random().toString(36).substring(2, 9);
  }

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastEventTimestampRef = useRef<number>(0);
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const handleIncomingEvent = useCallback(
    (event: ProductionSyncEvent, sourceClientId?: string) => {
      // Check if event matches this sheet and date/shift (if specified)
      if (
        event.module.toLowerCase() !== mod.toLowerCase() ||
        event.sheet.toLowerCase() !== sheet.toLowerCase()
      ) {
        return;
      }

      // If date is tracked, ignore events for other dates
      if (date && event.date && event.date !== date) {
        return;
      }

      // Avoid processing duplicate older events
      if (event.timestamp <= lastEventTimestampRef.current) {
        return;
      }
      lastEventTimestampRef.current = event.timestamp;

      const userEmail = activeUser.email || currentUser?.email;
      const isFromSelf =
        (sourceClientId && sourceClientId === clientIdRef.current) ||
        (userEmail && event.user?.email === userEmail);

      setIsSelfUpdate(Boolean(isFromSelf));
      setLastUpdatedBy(event.user);
      setLastUpdatedAt(new Date(event.timestamp));
      setLastAction(event.action || "UPDATE");

      // Notify consumer to quietly re-fetch if update came from someone else
      if (!isFromSelf) {
        onSyncRef.current?.(event);
      }
    },
    [mod, sheet, date, activeUser.email, currentUser?.email]
  );

  // 1. Same-Browser Native BroadcastChannel (Multi-tab sync with 0 latency & 0 network overhead)
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return;
    }

    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      channel.onmessage = (msg: MessageEvent) => {
        if (msg.data && msg.data.event && msg.data.clientId !== clientIdRef.current) {
          handleIncomingEvent(msg.data.event, msg.data.clientId);
        }
      };

      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    } catch (err) {
      console.warn("BroadcastChannel not supported or failed to initialize", err);
    }
  }, [enabled, handleIncomingEvent]);

  // 2. Server-Sent Events (SSE) Stream
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let retryTimeout: NodeJS.Timeout | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let sseActive = true;

    const connectSSE = () => {
      try {
        const url = `/api/production/realtime/stream?module=${encodeURIComponent(mod)}&sheet=${encodeURIComponent(sheet)}`;
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
          setIsConnected(true);
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
        };

        es.addEventListener("sync", (e: MessageEvent) => {
          try {
            const eventData = JSON.parse(e.data) as ProductionSyncEvent;
            handleIncomingEvent(eventData);
          } catch {
            // ignore malformed JSON
          }
        });

        es.addEventListener("init", (e: MessageEvent) => {
          try {
            const initData = JSON.parse(e.data);
            if (initData && initData.timestamp && initData.user) {
              setLastUpdatedBy(initData.user);
              setLastUpdatedAt(new Date(initData.timestamp));
              lastEventTimestampRef.current = initData.timestamp;
            }
          } catch {
            // ignore
          }
        });

        es.onerror = () => {
          setIsConnected(false);
          es.close();
          eventSourceRef.current = null;

          // Start lightweight fallback polling (every 15s) while SSE reconnects
          if (!fallbackInterval && sseActive) {
            fallbackInterval = setInterval(async () => {
              try {
                const res = await fetch(
                  `/api/production/realtime/status?module=${encodeURIComponent(mod)}&sheet=${encodeURIComponent(sheet)}&since=${lastEventTimestampRef.current}`
                );
                if (res.ok) {
                  const data = await res.json();
                  if (data.hasUpdate && data.latest) {
                    handleIncomingEvent(data.latest);
                  }
                }
              } catch {
                // ignore network error
              }
            }, 15000);
          }

          // Retry SSE in 6 seconds
          if (sseActive) {
            retryTimeout = setTimeout(connectSSE, 6000);
          }
        };
      } catch (err) {
        console.warn("SSE connection error", err);
      }
    };

    connectSSE();

    return () => {
      sseActive = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled, mod, sheet, handleIncomingEvent]);

  // 3. Broadcast helper for components after a successful save
  const broadcastSync = useCallback(
    async (params?: { action?: string; date?: string; shift?: string; metadata?: Record<string, any> }) => {
      const event: ProductionSyncEvent = {
        module: mod,
        sheet,
        action: params?.action || "SAVE",
        date: params?.date || date,
        shift: params?.shift || shift,
        metadata: params?.metadata,
        user: {
          name: activeUser.name || currentUser?.name || "Operator",
          email: activeUser.email || currentUser?.email || undefined,
          role: activeUser.role || currentUser?.role || "Staff",
        },
        timestamp: Date.now(),
      };

      lastEventTimestampRef.current = event.timestamp;
      setIsSelfUpdate(true);
      setLastUpdatedBy(event.user);
      setLastUpdatedAt(new Date(event.timestamp));
      setLastAction(event.action);

      // Local cross-tab broadcast (0 latency)
      try {
        broadcastChannelRef.current?.postMessage({
          event,
          clientId: clientIdRef.current,
        });
      } catch {
        // ignore
      }

      // Server broadcast
      try {
        await fetch("/api/production/realtime/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
          keepalive: true,
        });
      } catch (err) {
        console.warn("Failed to notify server of production sync event", err);
      }
    },
    [mod, sheet, date, shift, currentUser]
  );

  return {
    isConnected,
    lastUpdatedBy,
    lastUpdatedAt,
    lastAction,
    isSelfUpdate,
    broadcastSync,
  };
}
