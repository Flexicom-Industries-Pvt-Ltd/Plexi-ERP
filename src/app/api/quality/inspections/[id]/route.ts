import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { QualityService } from "@/services/quality.service";
import { RecordQcDecisionSchema } from "@/lib/schemas/quality";
import { Module } from "@/generated/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const inspection = await QualityService.getInspectionById(id);

    if (!inspection) {
      return apiError("QC Inspection record not found", 404);
    }

    return apiSuccess(inspection);
  } catch (error: any) {
    return apiError(error.message || "Failed to retrieve QC inspection", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canUpdate" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = RecordQcDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        validationErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await QualityService.recordDecision(id, {
      ...parsed.data,
      inspectorId: parsed.data.inspectorId || auth.user.id,
    });

    return apiSuccess(updated);
  } catch (error: any) {
    const status = error.message?.includes("not found") ? 404 : 400;
    return apiError(error.message || "Failed to record QC decision", status);
  }
}
