import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { QualityService } from "@/services/quality.service";
import { Module, QcReferenceType } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!type || !id) {
      return apiError("Parameters 'type' and 'id' are required", 400);
    }

    const target = await QualityService.resolveTarget(type as QcReferenceType, id);

    if (!target) {
      return apiError("Target entity not found", 404);
    }

    return apiSuccess(target);
  } catch (error: any) {
    return apiError(error.message || "Failed to resolve QC target", 500);
  }
}
