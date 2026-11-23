import {
  subscribeProductionSync,
  getLatestSheetState,
  ProductionSyncEvent,
} from "@/lib/realtime/production-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module") || undefined;
  const sheetParam = searchParams.get("sheet") || undefined;

  const headers = new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disables Nginx buffering for SSE
  });

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  let isClosed = false;

  // Subscribe to production event bus
  const unsubscribe = subscribeProductionSync(
    (event: ProductionSyncEvent) => {
      safeWrite(`event: sync\ndata: ${JSON.stringify(event)}\n\n`);
    },
    { module: moduleParam, sheet: sheetParam }
  );

  let heartbeatTimer: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    try {
      unsubscribe();
    } catch {
      // already unsubscribed
    }
    try {
      writer.close();
    } catch {
      // already closed
    }
  };

  const safeWrite = async (text: string) => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(text));
    } catch {
      cleanup();
    }
  };

  // Send initial state if available
  if (moduleParam) {
    const latest = getLatestSheetState(moduleParam, sheetParam);
    if (latest) {
      safeWrite(`event: init\ndata: ${JSON.stringify(latest)}\n\n`);
    } else {
      safeWrite(`event: init\ndata: ${JSON.stringify({ status: "connected" })}\n\n`);
    }
  } else {
    safeWrite(`event: init\ndata: ${JSON.stringify({ status: "connected" })}\n\n`);
  }

  // Heartbeat keep-alive every 20s
  heartbeatTimer = setInterval(() => {
    if (isClosed) {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      return;
    }
    safeWrite(`event: ping\ndata: {"time":${Date.now()}}\n\n`);
  }, 20000);

  // Cleanup on request abort / socket close
  request.signal.addEventListener("abort", cleanup);
  writer.closed.catch(() => {}).finally(cleanup);

  return new Response(stream.readable, {
    status: 200,
    headers,
  });
}
