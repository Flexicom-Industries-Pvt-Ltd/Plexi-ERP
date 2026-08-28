import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SECURITY_GATE" && p.canUpdate);

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = await request.json();
    const entry = await db.gateEntry.findUnique({ where: { entryNumber: id } });

    if (!entry) return NextResponse.json({ error: "Gate Entry not found" }, { status: 404 });

    const newDoc = await db.gateDocument.create({
      data: {
        gateEntryId: entry.id,
        documentType: data.documentType,
        fileUrl: data.fileUrl,
        remarks: data.remarks,
        status: "PENDING",
      },
    });

    logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: "Uploaded Document to Gate Entry",
      payload: newDoc,
      meta: { entryId: entry.id, entryNumber: entry.entryNumber },
    }).catch(console.error);

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
