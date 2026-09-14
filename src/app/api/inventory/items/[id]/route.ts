import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { InventoryService } from "@/services/inventory.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireApiAuth({
    module: Module.INVENTORY,
    action: "canRead",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const item = await InventoryService.getInventoryItem(id);
    if (!item) return apiError("Item not found", 404);

    return apiSuccess(item);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return apiError("Failed to fetch inventory item", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireApiAuth({
    module: Module.INVENTORY,
    action: "canUpdate",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const body = await request.json();
    const updated = await InventoryService.updateInventoryItem(id, body, authResult.user.id);
    if (!updated) return apiError("Item not found", 404);

    return apiSuccess(updated);
  } catch (error: any) {
    console.error("Error updating inventory item:", error);
    return apiError(error.message || "Failed to update inventory item", 400);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireApiAuth({
    module: Module.INVENTORY,
    action: "canDelete",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const result = await InventoryService.deleteInventoryItem(id, authResult.user.id);
    if (result.notFound) return apiError("Item not found", 404);

    return apiSuccess({
      success: true,
      softDeleted: result.softDeleted,
      message: result.softDeleted
        ? "Item has past transactions and was safely deactivated."
        : "Item deleted successfully.",
    });
  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    return apiError(error.message || "Failed to delete inventory item", 400);
  }
}
