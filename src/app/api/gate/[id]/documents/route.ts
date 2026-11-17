import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { findGateEntryByIdOrNumber } from "@/lib/gate/resolve-gate-entry";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
    const entry = await findGateEntryByIdOrNumber(id);
    if (!entry) return NextResponse.json({ error: "Gate Entry not found" }, { status: 404 });

    const contentType = request.headers.get("content-type") || "";

    let documentType = "";
    let remarks = "";
    let fileUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      documentType = ((formData.get("documentType") as string) || "").trim();
      remarks = ((formData.get("remarks") as string) || "").trim();
      const file = formData.get("file") as File | null;

      if (file && file.size > 0) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/jpg",
          "application/pdf",
        ];
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json(
            { error: "Invalid file type. Only PDF, PNG, JPG, and WEBP documents are allowed." },
            { status: 400 }
          );
        }

        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: "File size exceeds the 10MB maximum limit." },
            { status: 400 }
          );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), "public", "uploads", "gate-documents");
        await mkdir(uploadDir, { recursive: true });

        const ext = path.extname(file.name) || ".bin";
        const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
        const safeFileName = `${Date.now()}-${baseName}${ext}`;
        const filePath = path.join(uploadDir, safeFileName);
        await writeFile(filePath, buffer);

        fileUrl = `/uploads/gate-documents/${safeFileName}`;
      } else {
        fileUrl = (formData.get("fileUrl") as string) || null;
      }
    } else {
      const data = await request.json();
      documentType = (data.documentType || "").trim();
      remarks = (data.remarks || "").trim();
      fileUrl = data.fileUrl || null;
    }

    if (!documentType) {
      return NextResponse.json({ error: "Document Type is required" }, { status: 400 });
    }

    const newDoc = await db.gateDocument.create({
      data: {
        gateEntryId: entry.id,
        documentType,
        fileUrl,
        remarks: remarks || null,
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
  } catch (error: any) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: error.message || "Failed to upload document" }, { status: 500 });
  }
}
