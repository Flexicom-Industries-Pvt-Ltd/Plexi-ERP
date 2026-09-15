import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { ScrapService } from "@/services/scrap.service";
import { CreateScrapRecordSchema, ListScrapRecordsQuerySchema } from "@/lib/schemas/scrap";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const query = ListScrapRecordsQuerySchema.parse({
      phase: searchParams.get("phase") || undefined,
      sourceType: searchParams.get("sourceType") || undefined,
      reasonCode: searchParams.get("reasonCode") || undefined,
      inventoryItemId: searchParams.get("inventoryItemId") || undefined,
      locationId: searchParams.get("locationId") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const [listResult, stats] = await Promise.all([
      ScrapService.listScrapRecords(query, { paginate: true }),
      ScrapService.getScrapStats(),
    ]);

    return apiSuccess({
      ...listResult,
      stats,
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch scrap records", 400);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canCreate" });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const data = CreateScrapRecordSchema.parse(body);

    const record = await ScrapService.recordScrap({
      ...data,
      recordedById: auth.session.user.id,
    });

    return apiSuccess(record, { status: 201 });
  } catch (error: any) {
    return apiError(error.message || "Failed to record scrap waste", 400);
  }
}
