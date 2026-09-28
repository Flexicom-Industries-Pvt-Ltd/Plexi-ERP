import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION, Module.SETTINGS],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const contractor = await db.contractor.findUnique({
      where: { id },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    return NextResponse.json(contractor);
  } catch (error: any) {
    console.error("Error fetching contractor:", error);
    return NextResponse.json(
      { error: "Failed to fetch contractor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION, Module.SETTINGS],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await db.contractor.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      code,
      contactPerson,
      phone,
      email,
      address,
      section,
      notes,
      isActive,
    } = body;

    const cleanCode = code !== undefined ? (code ? String(code).trim().toUpperCase() : null) : existing.code;

    if (cleanCode && cleanCode !== existing.code) {
      const duplicate = await db.contractor.findUnique({
        where: { code: cleanCode },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: `A contractor with code '${cleanCode}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await db.contractor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(code !== undefined && { code: cleanCode }),
        ...(contactPerson !== undefined && { contactPerson: contactPerson ? String(contactPerson).trim() : null }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        ...(email !== undefined && { email: email ? String(email).trim() : null }),
        ...(address !== undefined && { address: address ? String(address).trim() : null }),
        ...(section !== undefined && { section: section ? String(section).trim().toUpperCase() : "LOOM" }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await logEvent({
      module: "DATA_CENTRE",
      action: "CONTRACTOR_UPDATED",
      severity: "INFO",
      payload: {
        contractorId: updated.id,
        name: updated.name,
        code: updated.code,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating contractor:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update contractor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION, Module.SETTINGS],
    action: "canDelete",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await db.contractor.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Soft delete by marking inactive
    const updated = await db.contractor.update({
      where: { id },
      data: { isActive: false },
    });

    await logEvent({
      module: "DATA_CENTRE",
      action: "CONTRACTOR_DEACTIVATED",
      severity: "WARN",
      payload: {
        contractorId: id,
        name: existing.name,
      },
    });

    return NextResponse.json({ success: true, message: "Contractor deactivated successfully", contractor: updated });
  } catch (error: any) {
    console.error("Error deactivating contractor:", error);
    return NextResponse.json(
      { error: error.message || "Failed to deactivate contractor" },
      { status: 500 }
    );
  }
}
