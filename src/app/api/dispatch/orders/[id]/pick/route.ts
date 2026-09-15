import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { DispatchService } from "@/services/dispatch.service";
import { PickDispatchOrderSchema } from "@/lib/schemas/dispatch";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DISPATCH, Module.INVENTORY],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = PickDispatchOrderSchema.parse(body);

    const order = await DispatchService.pickOrderLots(id, data, {
      userId: auth.session.user.id,
    });

    return apiSuccess(order);
  } catch (error: any) {
    return apiError(error.message || "Failed to pick lots for dispatch order", 400);
  }
}
