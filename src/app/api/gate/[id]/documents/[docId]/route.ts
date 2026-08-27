import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check update permission
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: true } } },
  });

  const hasAccess =
    user?.role?.name === "SUPERADMIN" ||
    user?.role?.permissions.some((p) => p.module === "SECURITY_GATE" && p.canUpdate);

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = await request.json();
    const doc = await db.gateDocument.findUnique({ 
      where: { id: docId },
      include: { gateEntry: true }
    });

    if (!doc || doc.gateEntry.entryNumber !== id) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updatedDoc = await db.gateDocument.update({
      where: { id: docId },
      data: {
        status: data.status,
        remarks: data.remarks !== undefined ? data.remarks : doc.remarks,
        verifiedBy: data.status === "VERIFIED" || data.status === "REJECTED" ? session.user.id : doc.verifiedBy,
        verifiedAt: data.status === "VERIFIED" || data.status === "REJECTED" ? new Date() : doc.verifiedAt,
      },
      include: {
        verifier: { select: { name: true, email: true } },
      },
    });

    await logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: `Updated Gate Document Status to ${updatedDoc.status}`,
      payload: updatedDoc,
      meta: { entryId: id, documentId: updatedDoc.id },
    });

    return NextResponse.json(updatedDoc);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}
