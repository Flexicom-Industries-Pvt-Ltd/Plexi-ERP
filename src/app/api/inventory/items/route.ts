import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  const where: any = {};
  if (type) where.itemType = type;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        category: true,
        subCategory: true,
        uom: true,
        location: true,
      },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "INVENTORY" && p.canCreate);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Ensure code is unique
    const existing = await db.inventoryItem.findUnique({
      where: { code: body.code },
    });

    if (existing) {
      return NextResponse.json({ error: "Item code already exists" }, { status: 400 });
    }

    const newItem = await db.inventoryItem.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        itemType: body.itemType,
        categoryId: body.categoryId || null,
        subCategoryId: body.subCategoryId || null,
        uomId: body.uomId,
        locationId: body.locationId || null,
        currentStock: body.currentStock || 0,
        minimumStock: body.minimumStock || 0,
        isActive: body.isActive ?? true,
      },
    });

    // Log the creation
    await logEvent({
      userId: session.user.id,
      module: "INVENTORY",
      action: "CREATE_ITEM",
      severity: "INFO",
      payload: { itemId: newItem.id, code: newItem.code },
      diffs: [
        {
          entity: "InventoryItem",
          entityId: newItem.id,
          before: {},
          after: newItem,
        }
      ]
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}
