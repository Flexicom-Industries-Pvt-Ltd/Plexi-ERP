import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  emitProductionSync,
  getLatestSheetState,
  ProductionSyncEvent,
} from "@/lib/realtime/production-bus";
import {
  getLatestDatabaseSheetUpdate,
  invalidateSyncCache,
} from "@/lib/realtime/db-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module");
  const sheetParam = searchParams.get("sheet") || undefined;
  const dateParam = searchParams.get("date") || undefined;
  const shiftParam = searchParams.get("shift") || undefined;
  const sinceParam = searchParams.get("since");
  const callerClientId = searchParams.get("clientId") || undefined;

  if (!moduleParam) {
    return NextResponse.json({ error: "module parameter is required" }, { status: 400 });
  }

  // 1. Authoritative Neon PostgreSQL Database check (cross-serverless shared truth)
  const dbUpdate = await getLatestDatabaseSheetUpdate(
    moduleParam,
    sheetParam,
    dateParam,
    shiftParam
  );

  // 2. In-memory state check (immediate fallback if DB row not created yet)
  const memoryUpdate = getLatestSheetState(moduleParam, sheetParam);

  // Resolve whichever has the newest timestamp
  let latestEvent: ProductionSyncEvent | null = null;
  let latestTimestamp = 0;

  if (dbUpdate && dbUpdate.timestamp > latestTimestamp) {
    latestTimestamp = dbUpdate.timestamp;
    latestEvent = {
      module: moduleParam,
      sheet: sheetParam || "default",
      action: dbUpdate.action,
      date: dateParam,
      shift: shiftParam,
      user: dbUpdate.user,
      timestamp: dbUpdate.timestamp,
      clientId: memoryUpdate && Math.abs(memoryUpdate.timestamp - dbUpdate.timestamp) < 5000 ? memoryUpdate.clientId : null,
    };
  }

  if (memoryUpdate && memoryUpdate.timestamp > latestTimestamp) {
    latestTimestamp = memoryUpdate.timestamp;
    latestEvent = memoryUpdate;
  }

  const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };

  if (!latestEvent) {
    return NextResponse.json({ hasUpdate: false, latest: null }, { headers: noCacheHeaders });
  }

  const isOriginatingClient = Boolean(callerClientId && latestEvent.clientId === callerClientId);

  if (sinceParam) {
    const sinceTime = parseInt(sinceParam, 10);
    const hasUpdate = !isNaN(sinceTime) && latestTimestamp > sinceTime;
    return NextResponse.json(
      {
        hasUpdate,
        isSelfUpdate: isOriginatingClient,
        latest: hasUpdate ? latestEvent : null,
        timestamp: latestTimestamp,
      },
      { headers: noCacheHeaders }
    );
  }

  return NextResponse.json(
    {
      hasUpdate: true,
      isSelfUpdate: isOriginatingClient,
      latest: latestEvent,
      timestamp: latestTimestamp,
    },
    { headers: noCacheHeaders }
  );
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();

    const { module: mod, sheet, action, date, shift, metadata, clientId } = body;
    if (!mod || !sheet) {
      return NextResponse.json({ error: "module and sheet are required" }, { status: 400 });
    }

    const event: ProductionSyncEvent = {
      module: mod,
      sheet,
      action: action || "UPDATE",
      date,
      shift,
      clientId: clientId || body.user?.clientId || null,
      metadata,
      user: {
        name: session?.user?.name || body.user?.name || "Production Operator",
        email: session?.user?.email || body.user?.email,
        role: (session?.user as any)?.roleName || (session?.user as any)?.role || body.user?.role || "Staff",
      },
      timestamp: Date.now(),
    };

    invalidateSyncCache(mod, sheet);
    emitProductionSync(event);

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to broadcast sync event" }, { status: 500 });
  }
}
