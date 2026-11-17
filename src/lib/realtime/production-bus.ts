import { EventEmitter } from "events";

export interface ProductionSyncUser {
  id?: string;
  name: string;
  email?: string | null;
  role?: string | null;
}

export interface ProductionSyncEvent {
  module: "loom" | "tape-plant" | "lamination" | "printing" | "convertex" | "valvomatic" | string;
  sheet: string;
  action: "SAVE" | "UPDATE" | "DELETE" | "CLEAR" | string;
  user: ProductionSyncUser;
  timestamp: number;
  date?: string | null;
  shift?: string | null;
  metadata?: Record<string, any>;
}

export type ProductionSyncInput = Omit<ProductionSyncEvent, "timestamp"> & {
  timestamp?: number;
};

// Global EventEmitter instance persisted across HMR in dev
declare global {
  // eslint-disable-next-line no-var
  var __productionEventBus: EventEmitter | undefined;
  // eslint-disable-next-line no-var
  var __latestProductionSheetStates: Map<string, ProductionSyncEvent> | undefined;
}

const bus: EventEmitter = globalThis.__productionEventBus || new EventEmitter();
bus.setMaxListeners(500);
if (process.env.NODE_ENV !== "production") {
  globalThis.__productionEventBus = bus;
}

const latestSheetStates: Map<string, ProductionSyncEvent> =
  globalThis.__latestProductionSheetStates || new Map<string, ProductionSyncEvent>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__latestProductionSheetStates = latestSheetStates;
}

function getCacheKey(moduleName: string, sheetName?: string): string {
  return `${moduleName.toLowerCase()}:${(sheetName || "default").toLowerCase()}`;
}

/**
 * Broadcasts a production sync event to all active SSE subscribers and records latest state.
 */
export function emitProductionSync(event: ProductionSyncInput): void {
  const sanitizedEvent: ProductionSyncEvent = {
    ...event,
    timestamp: event.timestamp || Date.now(),
  };

  const key = getCacheKey(sanitizedEvent.module, sanitizedEvent.sheet);
  latestSheetStates.set(key, sanitizedEvent);

  bus.emit("production:sync", sanitizedEvent);
  bus.emit(`production:sync:${sanitizedEvent.module}`, sanitizedEvent);
  bus.emit(`production:sync:${key}`, sanitizedEvent);
}

/**
 * Subscribes a listener to production events with optional module/sheet filtering.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeProductionSync(
  callback: (event: ProductionSyncEvent) => void,
  filter?: { module?: string; sheet?: string }
): () => void {
  let eventName = "production:sync";
  if (filter?.module && filter?.sheet) {
    eventName = `production:sync:${getCacheKey(filter.module, filter.sheet)}`;
  } else if (filter?.module) {
    eventName = `production:sync:${filter.module.toLowerCase()}`;
  }

  bus.on(eventName, callback);
  return () => {
    bus.off(eventName, callback);
  };
}

/**
 * Retrieves the latest recorded update event for a given module and sheet.
 */
export function getLatestSheetState(moduleName: string, sheetName?: string): ProductionSyncEvent | undefined {
  return latestSheetStates.get(getCacheKey(moduleName, sheetName));
}
