import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logEvent } from "@/lib/logging";
import { masterDataConfig } from "@/lib/config/master-data";

export async function GET(request: Request, context: { params: Promise<{ model: string }> }) {
  const { model } = await context.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SETTINGS" && p.canRead);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const modelConfig = masterDataConfig[model];
  if (!modelConfig) return NextResponse.json({ error: "Invalid model" }, { status: 400 });

  try {
    // Dynamically access Prisma model
    const records = await (db as any)[modelConfig.modelName].findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ model: string }> }) {
  const { model } = await context.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SETTINGS" && p.canCreate);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const modelConfig = masterDataConfig[model];
  if (!modelConfig) return NextResponse.json({ error: "Invalid model" }, { status: 400 });

  try {
    const body = await request.json();
    
    const newRecord = await (db as any)[modelConfig.modelName].create({
      data: body,
    });

    logEvent({
      userId: session.user.id,
      module: "SETTINGS",
      severity: "INFO",
      action: `Created ${modelConfig.title} Record`,
      payload: body,
      meta: { model: modelConfig.modelName, recordId: newRecord.id },
    }).catch(console.error);

    return NextResponse.json(newRecord);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
