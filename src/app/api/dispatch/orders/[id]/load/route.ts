import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { DispatchService } from "@/services/dispatch.service";
import { LoadDispatchOrderSchema } from "@/lib/schemas/dispatch";

export async function POST(
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
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const data = LoadDispatchOrderSchema.parse(body);

    const order = await DispatchService.loadAndDispatchOrder(id, data, {
      userId: auth.session.user.id,
    });

    return apiSuccess(order);
  } catch (error: any) {
    return apiError(error.message || "Failed to confirm loading and dispatch", 400);
  }
}
