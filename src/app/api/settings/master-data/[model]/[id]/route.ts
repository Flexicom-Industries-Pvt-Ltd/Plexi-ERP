import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logEvent } from "@/lib/logging";
import { masterDataConfig } from "@/lib/config/master-data";

export async function PATCH(request: Request, context: { params: Promise<{ model: string, id: string }> }) {
  const { model, id } = await context.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const modelConfig = masterDataConfig[model];
  if (!modelConfig) return NextResponse.json({ error: "Invalid model" }, { status: 400 });

  const requiredModule = modelConfig.requiredModule || "SETTINGS";

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === requiredModule && p.canUpdate);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const allowed = new Set(modelConfig.fields.map((f) => f.key));
    const data = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.has(key)));

    const oldRecord = await (db as any)[modelConfig.modelName].findUnique({
      where: { id: id }
    });
    if (!oldRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updatedRecord = await (db as any)[modelConfig.modelName].update({
      where: { id: id },
      data,
    });

    logEvent({
      userId: session.user.id,
      module: requiredModule,
      severity: "WARN",
      action: `Updated ${modelConfig.title} Record`,
      payload: { old: oldRecord, new: updatedRecord },
      meta: { model: modelConfig.modelName, recordId: updatedRecord.id },
    }).catch(console.error);

    return NextResponse.json(updatedRecord);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ model: string, id: string }> }) {
  const { model, id } = await context.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const modelConfig = masterDataConfig[model];
  if (!modelConfig) return NextResponse.json({ error: "Invalid model" }, { status: 400 });

  const requiredModule = modelConfig.requiredModule || "SETTINGS";

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === requiredModule && p.canDelete);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    // For safety, some master data should not be hard deleted if relations exist.
    // A robust system would soft-delete or catch Foreign Key constraints.
    const deletedRecord = await (db as any)[modelConfig.modelName].delete({
      where: { id: id },
    });

    logEvent({
      userId: session.user.id,
      module: requiredModule,
      severity: "ERROR",
      action: `Deleted ${modelConfig.title} Record`,
      payload: deletedRecord,
      meta: { model: modelConfig.modelName, recordId: deletedRecord.id },
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2003') { // Prisma FK constraint error
      return NextResponse.json({ error: "Cannot delete this record because it is in use by other records." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
