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
  markLocalEdit: () => void;
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
  const [isConnected, setIsConnected] = useState(true);
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
      .catch(() => { });
  }, [currentUser]);

  // Unique tab identifier generated in memory to distinguish separate tabs/devices
  const clientIdRef = useRef<string>("");
  if (!clientIdRef.current && typeof window !== "undefined") {
    clientIdRef.current = "client_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
  }

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastEventTimestampRef = useRef<number>(0);
  const lastLocalSaveTimestampRef = useRef<number>(0);
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const markLocalEdit = useCallback(() => {
    lastLocalSaveTimestampRef.current = Date.now();
  }, []);

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

      // Only remote events trigger onSync.
      // A change is from self if:
      // 1. Matches tab clientId from BroadcastChannel or server payload
      // 2. Or if no client ID is known, happened within our local save/edit grace window (5000ms)
      const hasKnownRemoteSender = Boolean(
        (sourceClientId && sourceClientId !== clientIdRef.current) ||
        (event.clientId && event.clientId !== clientIdRef.current)
      );

      const isFromSelf = !hasKnownRemoteSender && Boolean(
        (sourceClientId && sourceClientId === clientIdRef.current) ||
        (event.clientId && event.clientId === clientIdRef.current) ||
        (lastLocalSaveTimestampRef.current > 0 && Math.abs(event.timestamp - lastLocalSaveTimestampRef.current) < 5000)
      );

      setIsSelfUpdate(isFromSelf);
      setLastUpdatedBy(event.user);
      setLastUpdatedAt(new Date(event.timestamp));
      setLastAction(event.action || "UPDATE");

      // Notify consumer component to quietly re-fetch ONLY if update came from another tab or device
      if (!isFromSelf) {
        onSyncRef.current?.(event);
      }
    },
    [mod, sheet, date]
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

  // 2. High-Performance PostgreSQL-Backed Adaptive Heartbeat Polling
  // Guaranteed cross-serverless synchronization (runs every 2.5s on active tab, 30s when backgrounded)
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let isDisposed = false;
    let timerId: NodeJS.Timeout | null = null;

    const checkDatabaseSync = async () => {
      if (isDisposed) return;

      try {
        const params = new URLSearchParams({
          module: mod,
          sheet,
          clientId: clientIdRef.current,
          _t: Date.now().toString(),
        });
        if (date) params.set("date", date);
        if (shift) params.set("shift", shift);
        if (lastEventTimestampRef.current > 0) {
          params.set("since", lastEventTimestampRef.current.toString());
        }

        const res = await fetch(`/api/production/realtime/status?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (res.ok && !isDisposed) {
          setIsConnected(true);
          const data = await res.json();
          if (data.isSelfUpdate) {
            // Server confirmed this modification was authored by this tab
            setIsSelfUpdate(true);
            if (data.latest?.user) setLastUpdatedBy(data.latest.user);
            if (data.timestamp) {
              setLastUpdatedAt(new Date(data.timestamp));
              lastEventTimestampRef.current = data.timestamp;
            }
          } else if (data.hasUpdate && data.latest) {
            handleIncomingEvent(data.latest, data.latest.clientId);
          } else if (data.timestamp && data.timestamp > lastEventTimestampRef.current) {
            // Sync up initial timestamp
            lastEventTimestampRef.current = data.timestamp;
            if (data.latest?.user) {
              setLastUpdatedBy(data.latest.user);
              setLastUpdatedAt(new Date(data.timestamp));
            }
          }
        }
      } catch {
        // Silently tolerate transient network drop; preserve UI smoothness
        if (!isDisposed) setIsConnected(false);
      } finally {
        if (!isDisposed) {
          // Schedule next check: 2500ms when tab is focused and visible; 30000ms when tab is hidden
          const nextInterval =
            typeof document !== "undefined" && document.visibilityState === "hidden"
              ? 30000
              : 2500;
          timerId = setTimeout(checkDatabaseSync, nextInterval);
        }
      }
    };

    // Immediate initial sync check
    checkDatabaseSync();

    // Trigger instant check when user switches back to this tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (timerId) clearTimeout(timerId);
        checkDatabaseSync();
      }
    };

    const handleFocus = () => {
      if (timerId) clearTimeout(timerId);
      checkDatabaseSync();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      isDisposed = true;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, mod, sheet, date, shift, handleIncomingEvent]);

  // 3. Broadcast helper for components after a successful save
  const broadcastSync = useCallback(
    async (params?: { action?: string; date?: string; shift?: string; metadata?: Record<string, any> }) => {
      const eventTimestamp = Date.now();
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
        timestamp: eventTimestamp,
      };

      lastLocalSaveTimestampRef.current = eventTimestamp;
      lastEventTimestampRef.current = eventTimestamp;
      setIsSelfUpdate(true);
      setLastUpdatedBy(event.user);
      setLastUpdatedAt(new Date(eventTimestamp));
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

      // Server broadcast to notify all serverless containers and invalidate sync cache
      try {
        await fetch("/api/production/realtime/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...event, clientId: clientIdRef.current }),
          keepalive: true,
        });
      } catch (err) {
        console.warn("Failed to notify server of production sync event", err);
      }
    },
    [mod, sheet, date, shift, activeUser, currentUser]
  );

  return {
    isConnected,
    lastUpdatedBy,
    lastUpdatedAt,
    lastAction,
    isSelfUpdate,
    broadcastSync,
    markLocalEdit,
  };
}
