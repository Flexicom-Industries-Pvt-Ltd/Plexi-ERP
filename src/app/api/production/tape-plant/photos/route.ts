import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import path from "path";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const base64Data = formData.get("base64") as string | null;

    if (!file && !base64Data) {
      return NextResponse.json({ error: "No image file or camera capture provided" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "tape-plant");
    await mkdir(uploadDir, { recursive: true });

    let fileName = "";
    let buffer: Buffer;

    if (file) {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      const ext = path.extname(file.name) || ".jpg";
      fileName = `telemetry-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    } else if (base64Data) {
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ error: "Invalid base64 image data" }, { status: 400 });
      }
      buffer = Buffer.from(matches[2], "base64");
      fileName = `camera-capture-${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
    } else {
      return NextResponse.json({ error: "Unsupported image payload" }, { status: 400 });
    }

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const photoUrl = `/uploads/tape-plant/${fileName}`;

    return NextResponse.json({
      success: true,
      photoUrl,
      fileName,
    });
  } catch (error: any) {
    console.error("Tape Plant photo upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload photo" }, { status: 500 });
  }
}
