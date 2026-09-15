import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { QualityService } from "@/services/quality.service";
import { GetQcQueueQuerySchema } from "@/lib/schemas/quality";

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const query = GetQcQueueQuerySchema.parse({
      referenceType: searchParams.get("referenceType") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const result = await QualityService.getInspectionQueue(query);
    return apiSuccess(result);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch inspection queue", 400);
  }
}
