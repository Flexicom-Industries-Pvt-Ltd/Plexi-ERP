import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { DispatchService } from "@/services/dispatch.service";
import { UpdateDispatchOrderSchema } from "@/lib/schemas/dispatch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DISPATCH, Module.INVENTORY],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const order = await DispatchService.getDispatchOrderById(id);

    if (!order) {
      return apiError("Dispatch order not found", 404);
    }

    return apiSuccess(order);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch dispatch order", 400);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: Module.DISPATCH,
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateDispatchOrderSchema.parse(body);

    const updated = await DispatchService.updateDispatchOrder(id, data, {
      userId: auth.session.user.id,
    });

    if (!updated) {
      return apiError("Dispatch order not found", 404);
    }

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || "Failed to update dispatch order", 400);
  }
}
