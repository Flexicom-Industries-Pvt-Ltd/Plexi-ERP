import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  emitProductionSync,
  getLatestSheetState,
  ProductionSyncEvent,
} from "@/lib/realtime/production-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const moduleParam = searchParams.get("module");
  const sheetParam = searchParams.get("sheet") || undefined;
  const sinceParam = searchParams.get("since");

  if (!moduleParam) {
    return NextResponse.json({ error: "module parameter is required" }, { status: 400 });
  }

  const latest = getLatestSheetState(moduleParam, sheetParam);
  if (!latest) {
    return NextResponse.json({ hasUpdate: false, latest: null });
  }

  if (sinceParam) {
    const sinceTime = parseInt(sinceParam, 10);
    const hasUpdate = !isNaN(sinceTime) && latest.timestamp > sinceTime;
    return NextResponse.json({
      hasUpdate,
      latest: hasUpdate ? latest : null,
      timestamp: latest.timestamp,
    });
  }

  return NextResponse.json({
    hasUpdate: true,
    latest,
    timestamp: latest.timestamp,
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const body = await request.json();

    const { module: mod, sheet, action, date, shift, metadata } = body;
    if (!mod || !sheet) {
      return NextResponse.json({ error: "module and sheet are required" }, { status: 400 });
    }

    const event: ProductionSyncEvent = {
      module: mod,
      sheet,
      action: action || "UPDATE",
      date,
      shift,
      metadata,
      user: {
        name: session?.user?.name || body.user?.name || "Production Operator",
        email: session?.user?.email || body.user?.email,
        role: (session?.user as any)?.roleName || (session?.user as any)?.role || body.user?.role || "Staff",
      },
      timestamp: Date.now(),
    };

    emitProductionSync(event);

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to broadcast sync event" }, { status: 500 });
  }
}
