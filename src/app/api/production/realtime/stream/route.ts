import {
  subscribeProductionSync,
  getLatestSheetState,
  ProductionSyncEvent,
} from "@/lib/realtime/production-bus";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isSuperAdminRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Enforce session authentication (ERP-012, ERP-031)
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (
    (session.user as any).isActive === false ||
    session.user.role === "DEACTIVATED" ||
    session.user.role === "NO_ROLE"
  ) {
    return new Response("Forbidden: Account is inactive or has no assigned role", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module") || undefined;
  const sheetParam = searchParams.get("sheet") || undefined;

  const isSuperAdmin = isSuperAdminRole(session.user.role);

  // Prevent unauthorized unrestricted global subscriptions (ERP-031)
  if (!moduleParam && !isSuperAdmin) {
    return new Response(
      "Bad Request: Explicit module parameter is required for production event subscriptions",
      { status: 400 }
    );
  }

  // Validate module read permissions for non-superadmin users
  if (moduleParam && !isSuperAdmin) {
    const permissions = ((session.user as any).permissions as Array<{ module: string; canRead?: boolean }>) || [];
    const hasPermission = permissions.some(
      (p) => (p.module === moduleParam || p.module === "ALL" || p.module === "PRODUCTION") && Boolean(p.canRead)
    );
    if (!hasPermission) {
      return new Response(`Forbidden: Insufficient permissions for module ${moduleParam}`, { status: 403 });
    }
  }

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

  // Heartbeat keep-alive every 20s with periodic authorization revalidation (ERP-031)
  let heartbeatTicks = 0;
  heartbeatTimer = setInterval(async () => {
    if (isClosed) {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      return;
    }
    heartbeatTicks++;

    // Revalidate user authorization against database every 60s (every 3 ticks)
    if (heartbeatTicks % 3 === 0 && session.user?.id) {
      try {
        const user = await db.user.findUnique({
          where: { id: session.user.id },
          select: {
            isActive: true,
            role: {
              select: {
                name: true,
                permissions: {
                  select: { module: true, canRead: true },
                },
              },
            },
          },
        });
        if (!user || !user.isActive || !user.role) {
          await safeWrite(`event: error\ndata: {"error":"Session or role revoked. Connection terminated."}\n\n`);
          cleanup();
          return;
        }

        // Dynamically terminate stream if user module read permission was revoked
        if (!isSuperAdminRole(user.role.name) && moduleParam) {
          const hasPerm = user.role.permissions.some(
            (p) => ((p.module as string) === moduleParam || (p.module as string) === "ALL" || (p.module as string) === "PRODUCTION") && Boolean(p.canRead)
          );
          if (!hasPerm) {
            await safeWrite(`event: error\ndata: {"error":"Module permissions revoked. Connection terminated."}\n\n`);
            cleanup();
            return;
          }
        }
      } catch {
        // If DB is temporarily unreachable during heartbeat, do not abruptly kill stream unless continuous
      }
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
