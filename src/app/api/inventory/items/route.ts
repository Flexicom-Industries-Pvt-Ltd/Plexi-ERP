import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { InventoryService } from "@/services/inventory.service";
import { z } from "zod";

export const dynamic = "force-dynamic";

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
});

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth({
    module: Module.INVENTORY,
    action: "canRead",
  });
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const materialType = searchParams.get("materialType");
  const includeMovement = searchParams.get("includeMovement") === "true";
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");

  try {
    const result = await InventoryService.listInventoryItems({
      type,
      search,
      materialType,
      includeMovement,
      page,
      limit,
    });

    return apiSuccess(result.items, { meta: result.meta as any });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return apiError("Failed to fetch inventory items", 500);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth({
    module: Module.INVENTORY,
    action: "canCreate",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const jsonBody = await request.json();
    const parseResult = CreateInventoryItemSchema.safeParse(jsonBody);

    if (!parseResult.success) {
      return apiError("Validation failed", 400, { details: parseResult.error.format() });
    }

    const newItem = await InventoryService.createInventoryItem(
      parseResult.data,
      authResult.user.id
    );

    return apiSuccess(newItem, { status: 201 });
  } catch (error: any) {
    console.error("Error creating inventory item:", error);
    return apiError(error.message || "Failed to create inventory item", 400);
  }
}
