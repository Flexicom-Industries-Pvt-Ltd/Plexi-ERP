import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { RecyclingService } from "@/services/recycling.service";
import { CreateRecyclingBatchSchema, ListRecyclingBatchesQuerySchema } from "@/lib/schemas/recycling";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.RECYCLING_PLANT, Module.PRODUCTION, Module.QUALITY_CONTROL],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const query = ListRecyclingBatchesQuerySchema.parse({
      status: searchParams.get("status") || undefined,
      granuleGrade: searchParams.get("granuleGrade") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const [listResult, stats] = await Promise.all([
      RecyclingService.listRecyclingBatches(query, { paginate: true }),
      RecyclingService.getRecyclingStats(),
    ]);

    return apiSuccess({
      ...listResult,
      stats,
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch recycling batches", 400);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.RECYCLING_PLANT, Module.PRODUCTION, Module.QUALITY_CONTROL],
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const data = CreateRecyclingBatchSchema.parse(body);

    const batch = await RecyclingService.createRecyclingBatch({
      ...data,
      operatorId: data.operatorId || auth.session.user.id,
    });

    return apiSuccess(batch, { status: 201 });
  } catch (error: any) {
    return apiError(error.message || "Failed to create recycling batch", 400);
  }
}
