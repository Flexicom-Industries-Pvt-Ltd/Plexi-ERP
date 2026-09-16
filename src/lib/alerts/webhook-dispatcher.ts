/**
 * Enterprise Emergency Alert Webhook Dispatcher for Plexi-ERP
 *
 * Dispatches real-time push alerts for critical shop-floor events
 * (e.g. Critical Machine Breakdown, QC Scrap Spikes, Document Rejections).
 */

export type AlertEventType =
  | "MACHINE_BREAKDOWN_CRITICAL"
  | "QC_SCRAP_SPIKE"
  | "DISPATCH_GATE_OUT"
  | "DOCUMENT_REJECTED"
  | "SYSTEM_ALERT";

export interface AlertPayload {
  eventId: string;
  eventType: AlertEventType;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookDeliveryRecord {
  eventId: string;
  eventType: string;
  url: string;
  status: "DELIVERED" | "FAILED" | "MOCKED";
  statusCode?: number;
  error?: string;
  timestamp: string;
}

class WebhookDispatcher {
  private deliveryHistory: WebhookDeliveryRecord[] = [];
  private maxHistory = 500;

  /**
   * Dispatch an emergency alert to configured webhooks
   */
  async dispatch(
    eventType: AlertEventType,
    options: {
      severity?: "INFO" | "WARNING" | "CRITICAL";
      title: string;
      message: string;
      details?: Record<string, unknown>;
      webhookUrl?: string;
    }
  ): Promise<WebhookDeliveryRecord> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const url = options.webhookUrl || process.env.ALERT_WEBHOOK_URL || "https://internal.webhook.local/alerts";

    const payload: AlertPayload = {
      eventId,
      eventType,
      severity: options.severity || "CRITICAL",
      title: options.title,
      message: options.message,
      details: options.details || {},
      timestamp: new Date().toISOString(),
    };

    let record: WebhookDeliveryRecord;

    // If external URL is not live/configured or in test mode, record simulated delivery
    if (
      url.includes("internal.webhook.local") ||
      process.env.NODE_ENV === "test" ||
      !process.env.ALERT_WEBHOOK_URL
    ) {
      record = {
        eventId,
        eventType,
        url,
        status: "MOCKED",
        statusCode: 200,
        timestamp: new Date().toISOString(),
      };
    } else {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ERP-Event": eventType,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(5000), // 5s timeout
        });

        record = {
          eventId,
          eventType,
          url,
          status: response.ok ? "DELIVERED" : "FAILED",
          statusCode: response.status,
          timestamp: new Date().toISOString(),
        };
      } catch (err: any) {
        record = {
          eventId,
          eventType,
          url,
          status: "FAILED",
          error: err?.message || "Webhook delivery failed",
          timestamp: new Date().toISOString(),
        };
      }
    }

    this.deliveryHistory.unshift(record);
    if (this.deliveryHistory.length > this.maxHistory) {
      this.deliveryHistory.pop();
    }

    return record;
  }

  /**
   * Get recent webhook delivery history
   */
  getHistory(): WebhookDeliveryRecord[] {
    return [...this.deliveryHistory];
  }

  /**
   * Clear delivery history (for test isolation)
   */
  clearHistory(): void {
    this.deliveryHistory = [];
  }
}

export const webhookDispatcher = new WebhookDispatcher();
