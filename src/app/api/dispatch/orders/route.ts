import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { DispatchService } from "@/services/dispatch.service";
import {
  CreateDispatchOrderSchema,
  ListDispatchOrdersQuerySchema,
} from "@/lib/schemas/dispatch";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DISPATCH, Module.INVENTORY],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const query = ListDispatchOrdersQuerySchema.parse({
      status: searchParams.get("status") || undefined,
      customerName: searchParams.get("customerName") || undefined,
      search: searchParams.get("search") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const [listResult, stats] = await Promise.all([
      DispatchService.listDispatchOrders(query, { paginate: true }),
      DispatchService.getDispatchStats(),
    ]);

    return apiSuccess({
      ...listResult,
      stats,
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch dispatch orders", 400);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({
    module: Module.DISPATCH,
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const data = CreateDispatchOrderSchema.parse(body);

    const order = await DispatchService.createDispatchOrder(data, {
      userId: auth.session.user.id,
    });

    return apiSuccess(order, { status: 201 });
  } catch (error: any) {
    return apiError(error.message || "Failed to create dispatch order", 400);
  }
}
