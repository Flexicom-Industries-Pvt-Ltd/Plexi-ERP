import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { DispatchService } from "@/services/dispatch.service";
import { PickDispatchOrderSchema } from "@/lib/schemas/dispatch";
import { withIdempotency } from "@/lib/idempotency";
import { rateLimiters, applyRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = await rateLimiters.mutation(request);
  if (!rateLimitRes.success) {
    const errorResponse = apiError("Too Many Requests: Rate limit exceeded", 429);
    return applyRateLimitHeaders(errorResponse, rateLimitRes);
  }

  const auth = await requireApiAuth({
    module: [Module.DISPATCH, Module.INVENTORY],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  return withIdempotency(request, async () => {
    try {
      const { id } = await params;
      const body = await request.json();
      const data = PickDispatchOrderSchema.parse(body);

      const order = await DispatchService.pickOrderLots(id, data, {
        userId: auth.session.user.id,
      });

      const response = apiSuccess(order);
      return applyRateLimitHeaders(response, rateLimitRes);
    } catch (error: any) {
      const response = apiError(error.message || "Failed to pick lots for dispatch order", 400);
      return applyRateLimitHeaders(response, rateLimitRes);
    }
  });
}

