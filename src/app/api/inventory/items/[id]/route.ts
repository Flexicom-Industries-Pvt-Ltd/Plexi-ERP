import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "INVENTORY" && p.canRead);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
        uom: true,
        location: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: { select: { name: true } },
          }
        }
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json({ error: "Failed to fetch inventory item" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "INVENTORY" && p.canUpdate);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    const existing = await db.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (body.code && body.code !== existing.code) {
      const checkCode = await db.inventoryItem.findUnique({ where: { code: body.code } });
      if (checkCode) {
        return NextResponse.json({ error: "Item code already exists" }, { status: 400 });
      }
    }

    const updatedItem = await db.inventoryItem.update({
      where: { id },
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        itemType: body.itemType,
        categoryId: body.categoryId || null,
        subCategoryId: body.subCategoryId || null,
        uomId: body.uomId,
        locationId: body.locationId || null,
        minimumStock: body.minimumStock,
        isActive: body.isActive,
      },
    });

    // Log the update
    await logEvent({
      userId: session.user.id,
      module: "INVENTORY",
      action: "UPDATE_ITEM",
      severity: "INFO",
      payload: { itemId: id },
      diffs: [
        {
          entity: "InventoryItem",
          entityId: id,
          before: existing,
          after: updatedItem,
        }
      ]
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "INVENTORY" && p.canDelete);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await db.inventoryItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await db.inventoryItem.delete({
      where: { id },
    });

    await logEvent({
      userId: session.user.id,
      module: "INVENTORY",
      action: "DELETE_ITEM",
      severity: "WARN",
      payload: { itemId: id, code: existing.code },
      diffs: [
        {
          entity: "InventoryItem",
          entityId: id,
          before: existing,
          after: {},
        }
      ]
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting inventory item:", error);
    return NextResponse.json({ error: "Failed to delete inventory item (it may have related transactions)" }, { status: 400 });
  }
}
