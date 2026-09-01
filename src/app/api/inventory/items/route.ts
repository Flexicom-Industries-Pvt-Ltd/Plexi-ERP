import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { z } from "zod";
import { registry } from "@/lib/openapi";

export const dynamic = "force-dynamic";
// 1. Define Zod Schema for input
const CreateInventoryItemSchema = z.object({
  code: z.string().min(1, "Item code is required"),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  itemType: z.enum(["RAW_MATERIAL", "SEMI_FINISHED_GOOD", "FINISHED_GOOD", "SCRAP"]),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  uomId: z.string().min(1, "Unit of Measure is required"),
  locationId: z.string().optional(),
  currentStock: z.number().default(0),
  minimumStock: z.number().default(0),
  isActive: z.boolean().default(true),
}).openapi("CreateInventoryItemInput");

// 2. Define Output Schema
const InventoryItemResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
}).openapi("InventoryItemResponse");

// 3. Register the Route
registry.registerPath({
  method: "post",
  path: "/api/inventory/items",
  summary: "Create Inventory Item",
  description: "Creates a new master data inventory item.",
  tags: ["Inventory"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateInventoryItemSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Inventory item created successfully",
      content: {
        "application/json": {
          schema: InventoryItemResponseSchema,
        },
      },
    },
    400: { description: "Validation error or code exists" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
  },
});



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
  const materialType = searchParams.get("materialType");
  const includeMovement = searchParams.get("includeMovement") === "true";

  const where: Record<string, unknown> = {};
  if (type) where.itemType = type;
  if (materialType) where.stock = { materialType };
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
        stock: true,
      },
    });

    if (!includeMovement) {
      return NextResponse.json(items);
    }

    const itemIds = items.map((i) => i.id);
    const movements = itemIds.length
      ? await db.inventoryTransaction.groupBy({
          by: ["itemId", "type"],
          where: { itemId: { in: itemIds } },
          _sum: { quantity: true },
        })
      : [];

    const movementMap = new Map<string, { received: number; consumed: number }>();
    for (const row of movements) {
      const current = movementMap.get(row.itemId) || { received: 0, consumed: 0 };
      const qty = row._sum.quantity ?? 0;
      if (row.type === "IN") current.received += qty;
      if (row.type === "OUT") current.consumed += qty;
      movementMap.set(row.itemId, current);
    }

    const enriched = items.map((item) => {
      const movement = movementMap.get(item.id) || { received: 0, consumed: 0 };
      return {
        ...item,
        movementSummary: {
          available: item.currentStock,
          reserved: item.reservedStock,
          received: movement.received,
          consumed: movement.consumed,
        },
      };
    });

    return NextResponse.json(enriched);
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
    const jsonBody = await request.json();
    const parseResult = CreateInventoryItemSchema.safeParse(jsonBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Validation failed", details: parseResult.error.format() }, { status: 400 });
    }

    const body = parseResult.data;
    
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
