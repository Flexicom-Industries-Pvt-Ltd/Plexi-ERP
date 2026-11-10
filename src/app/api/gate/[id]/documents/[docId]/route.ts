import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { gateEntryMatchesRouteParam } from "@/lib/gate/resolve-gate-entry";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SECURITY_GATE" && p.canUpdate);

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = await request.json();
    const doc = await db.gateDocument.findUnique({ 
      where: { id: docId },
      include: { gateEntry: true }
    });

    if (!doc || !gateEntryMatchesRouteParam(doc.gateEntry, id)) {
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

    logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: `Updated Gate Document Status to ${updatedDoc.status}`,
      payload: updatedDoc,
      meta: { entryId: id, documentId: updatedDoc.id },
    }).catch(console.error);

    return NextResponse.json(updatedDoc);
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SECURITY_GATE" && (p.canUpdate || p.canDelete));

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const doc = await db.gateDocument.findUnique({
      where: { id: docId },
      include: { gateEntry: true },
    });

    if (!doc || !gateEntryMatchesRouteParam(doc.gateEntry, id)) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Clean up local uploaded file if present
    if (doc.fileUrl && doc.fileUrl.startsWith("/uploads/gate-documents/")) {
      try {
        const { unlink } = await import("fs/promises");
        const path = await import("path");
        const localPath = path.join(process.cwd(), "public", doc.fileUrl);
        await unlink(localPath).catch(() => {});
      } catch (unlinkErr) {
        console.warn("Could not remove physical document file:", unlinkErr);
      }
    }

    await db.gateDocument.delete({
      where: { id: docId },
    });

    logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: `Deleted Gate Document (${doc.documentType})`,
      payload: { documentId: doc.id, documentType: doc.documentType },
      meta: { entryId: id, documentId: doc.id },
    }).catch(console.error);

    return NextResponse.json({ success: true, message: "Document deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: error.message || "Failed to delete document" }, { status: 500 });
  }
}
