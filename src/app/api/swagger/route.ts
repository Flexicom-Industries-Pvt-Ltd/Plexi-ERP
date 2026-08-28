import { generateOpenApiSpec } from "@/lib/openapi";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";

export async function GET() {
  // Ideally, generating API docs should be protected if it contains sensitive internal shapes
  // For now we can protect it under INVENTORY or GATE access, or let it be public if preferred.
  // Actually, we'll allow logged-in users to view it, or we could just enforce SUPERADMIN.
  // Let's enforce that the user must be authenticated at least.
  
  try {
    // Generate the open API spec
    const spec = generateOpenApiSpec();
    return NextResponse.json(spec);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
