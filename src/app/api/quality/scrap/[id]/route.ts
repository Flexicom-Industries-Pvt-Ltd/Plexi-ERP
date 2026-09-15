import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { ScrapService } from "@/services/scrap.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const record = await ScrapService.getScrapById(id);

    if (!record) {
      return apiError("Scrap record not found", 404);
    }

    return apiSuccess(record);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch scrap record", 400);
  }
}
