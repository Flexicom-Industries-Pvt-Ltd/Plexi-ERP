import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { findGateEntryByIdOrNumber } from "@/lib/gate/resolve-gate-entry";
import { triggerOpportunisticGatePhotoPrune } from "@/lib/gate/gate-photo-retention";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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

  // Trigger non-blocking opportunistic prune of temporary gate photos (>3 days old)
  triggerOpportunisticGatePhotoPrune();

  try {
    const entry = await findGateEntryByIdOrNumber(id);
    if (!entry) return NextResponse.json({ error: "Gate Entry not found" }, { status: 404 });

    const contentType = request.headers.get("content-type") || "";

    let documentType = "";
    let remarks = "";
    let fileUrl: string | null = null;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "gate-documents");

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      documentType = ((formData.get("documentType") as string) || "").trim();
      remarks = ((formData.get("remarks") as string) || "").trim();
      const file = formData.get("file") as File | null;
      const base64Payload = (formData.get("base64") as string) || null;

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

        const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
        const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_") || "doc";
        const safeFileName = `${Date.now()}-${baseName}-${randomUUID().slice(0, 6)}${ext}`;

        try {
          await mkdir(uploadDir, { recursive: true });
          const filePath = path.join(uploadDir, safeFileName);
          await writeFile(filePath, buffer);
          fileUrl = `/uploads/gate-documents/${safeFileName}`;
        } catch (fsErr) {
          console.warn("Filesystem write failed, falling back to data URL:", fsErr);
          fileUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
        }
      } else if (base64Payload) {
        const matches = base64Payload.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mime = matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const ext = mime === "application/pdf" ? ".pdf" : mime.includes("webp") ? ".webp" : mime.includes("png") ? ".png" : ".jpg";
          const safeFileName = `scan-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;

          try {
            await mkdir(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, safeFileName);
            await writeFile(filePath, buffer);
            fileUrl = `/uploads/gate-documents/${safeFileName}`;
          } catch (fsErr) {
            console.warn("Filesystem write failed, falling back to base64:", fsErr);
            fileUrl = base64Payload;
          }
        } else {
          fileUrl = base64Payload;
        }
      } else {
        fileUrl = (formData.get("fileUrl") as string) || null;
      }
    } else {
      const data = await request.json();
      documentType = (data.documentType || "").trim();
      remarks = (data.remarks || "").trim();
      const base64Data = data.base64 || null;

      if (base64Data && typeof base64Data === "string" && base64Data.startsWith("data:")) {
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mime = matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const ext = mime === "application/pdf" ? ".pdf" : mime.includes("webp") ? ".webp" : mime.includes("png") ? ".png" : ".jpg";
          const safeFileName = `scan-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;

          try {
            await mkdir(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, safeFileName);
            await writeFile(filePath, buffer);
            fileUrl = `/uploads/gate-documents/${safeFileName}`;
          } catch (fsErr) {
            console.warn("Filesystem write failed, keeping inline data URL:", fsErr);
            fileUrl = base64Data;
          }
        } else {
          fileUrl = base64Data;
        }
      } else {
        fileUrl = data.fileUrl || null;
      }
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
