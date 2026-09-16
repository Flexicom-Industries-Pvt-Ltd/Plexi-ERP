import { describe, it, expect, beforeEach } from "vitest";
import { webhookDispatcher } from "../webhook-dispatcher";

describe("Emergency Alert Webhook Dispatcher", () => {
  beforeEach(() => {
    webhookDispatcher.clearHistory();
  });

  it("should dispatch an emergency alert for critical machine breakdown", async () => {
    const record = await webhookDispatcher.dispatch("MACHINE_BREAKDOWN_CRITICAL", {
      severity: "CRITICAL",
      title: "Loom-24 Motor Overheating",
      message: "Loom 24 stopped abruptly due to high temperature alert.",
      details: { loomId: "L-24", tempCelsius: 98 },
    });

    expect(record).toBeDefined();
    expect(record.eventType).toBe("MACHINE_BREAKDOWN_CRITICAL");
    expect(["MOCKED", "DELIVERED"]).toContain(record.status);
    expect(record.statusCode).toBe(200);

    const history = webhookDispatcher.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].eventId).toBe(record.eventId);
  });

  it("should dispatch a QC scrap spike alert", async () => {
    const record = await webhookDispatcher.dispatch("QC_SCRAP_SPIKE", {
      severity: "WARNING",
      title: "Extruder Scrap Spike Detected",
      message: "Batch BOB-20260916-0004 generated 4.8% scrap.",
      details: { batchId: "BOB-20260916-0004", scrapPercent: 4.8 },
    });

    expect(record.eventType).toBe("QC_SCRAP_SPIKE");
    expect(webhookDispatcher.getHistory()).toHaveLength(1);
  });
});
