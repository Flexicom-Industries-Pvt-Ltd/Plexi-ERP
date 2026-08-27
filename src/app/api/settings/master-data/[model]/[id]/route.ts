import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logEvent } from "@/lib/logging";
import { masterDataConfig } from "@/lib/config/master-data";

export async function PATCH(request: Request, context: { params: Promise<{ model: string, id: string }> }) {
  const { model, id } = await context.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: true } } },
  });

  const hasAccess = user?.role?.name === "SUPERADMIN" || user?.role?.permissions.some(
    (p) => p.module === "SETTINGS" && p.canUpdate
  );
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const modelConfig = masterDataConfig[model];
  if (!modelConfig) return NextResponse.json({ error: "Invalid model" }, { status: 400 });

  try {
    const body = await request.json();
    
    // Fetch old record for diffing
    const oldRecord = await (db as any)[modelConfig.modelName].findUnique({
      where: { id: id }
    });
    if (!oldRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updatedRecord = await (db as any)[modelConfig.modelName].update({
      where: { id: id },
      data: body,
    });

    await logEvent({
      userId: session.user.id,
      module: "SETTINGS",
      severity: "WARN",
      action: `Updated ${modelConfig.title} Record`,
      payload: { old: oldRecord, new: updatedRecord },
      meta: { model: modelConfig.modelName, recordId: updatedRecord.id },
    });

    return NextResponse.json(updatedRecord);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ model: string, id: string }> }) {
  const { model, id } = await context.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: true } } },
  });

  const hasAccess = user?.role?.name === "SUPERADMIN" || user?.role?.permissions.some(
    (p) => p.module === "SETTINGS" && p.canDelete
  );
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const modelConfig = masterDataConfig[model];
  if (!modelConfig) return NextResponse.json({ error: "Invalid model" }, { status: 400 });

  try {
    // For safety, some master data should not be hard deleted if relations exist.
    // A robust system would soft-delete or catch Foreign Key constraints.
    const deletedRecord = await (db as any)[modelConfig.modelName].delete({
      where: { id: id },
    });

    await logEvent({
      userId: session.user.id,
      module: "SETTINGS",
      severity: "ERROR",
      action: `Deleted ${modelConfig.title} Record`,
      payload: deletedRecord,
      meta: { model: modelConfig.modelName, recordId: deletedRecord.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2003') { // Prisma FK constraint error
      return NextResponse.json({ error: "Cannot delete this record because it is in use by other records." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
