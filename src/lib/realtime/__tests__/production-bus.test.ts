import { describe, it, expect, vi } from "vitest";
import {
  emitProductionSync,
  subscribeProductionSync,
  getLatestSheetState,
  ProductionSyncEvent,
} from "../production-bus";

describe("Production Realtime Event Bus", () => {
  it("should record latest sheet state when an event is emitted", () => {
    const event: ProductionSyncEvent = {
      module: "loom",
      sheet: "roll-cutting",
      action: "SAVE",
      date: "2026-11-17",
      shift: "Day Shift",
      user: {
        name: "Rajesh Kumar",
        role: "Shift Supervisor",
      },
      timestamp: Date.now(),
    };

    emitProductionSync(event);

    const latest = getLatestSheetState("loom", "roll-cutting");
    expect(latest).toBeDefined();
    expect(latest?.user.name).toBe("Rajesh Kumar");
    expect(latest?.action).toBe("SAVE");
    expect(latest?.sheet).toBe("roll-cutting");
  });

  it("should notify subscribers when matching events are emitted", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeProductionSync(callback, {
      module: "tape-plant",
      sheet: "temperature",
    });

    const event: ProductionSyncEvent = {
      module: "tape-plant",
      sheet: "temperature",
      action: "UPDATE",
      user: {
        name: "Anita Sharma",
        role: "QC Tech",
      },
      timestamp: Date.now(),
    };

    emitProductionSync(event);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "tape-plant",
        sheet: "temperature",
        action: "UPDATE",
        user: expect.objectContaining({ name: "Anita Sharma" }),
      })
    );

    unsubscribe();
  });

  it("should filter events when subscribed to a specific module", () => {
    const loomCallback = vi.fn();
    const tapeCallback = vi.fn();

    const unsubLoom = subscribeProductionSync(loomCallback, { module: "loom" });
    const unsubTape = subscribeProductionSync(tapeCallback, { module: "tape-plant" });

    emitProductionSync({
      module: "loom",
      sheet: "reading-sheet",
      action: "SAVE",
      user: { name: "User 1" },
      timestamp: Date.now(),
    });

    expect(loomCallback).toHaveBeenCalled();
    expect(tapeCallback).not.toHaveBeenCalled();

    unsubLoom();
    unsubTape();
  });
});
