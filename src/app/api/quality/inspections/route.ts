import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { QualityService } from "@/services/quality.service";
import { CreateQcInspectionSchema } from "@/lib/schemas/quality";
import { Module } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const referenceType = searchParams.get("referenceType");
    const referenceId = searchParams.get("referenceId");
    const status = searchParams.get("status");
    const decision = searchParams.get("decision");
    const inspectorId = searchParams.get("inspectorId");
    const search = searchParams.get("search");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    const result = await QualityService.listInspections(
      {
        referenceType,
        referenceId,
        status,
        decision,
        inspectorId,
        search,
        page,
        limit,
      },
      { paginate: Boolean(page || limit) }
    );

    return apiSuccess(result.inspections, {
      meta: result.meta ? { ...result.meta } : undefined,
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch inspections", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canCreate" });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = CreateQcInspectionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        validationErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const newInspection = await QualityService.createInspection({
      ...parsed.data,
      inspectorId: parsed.data.inspectorId || auth.user.id,
    });

    return apiSuccess(newInspection, { status: 201 });
  } catch (error: any) {
    return apiError(error.message || "Failed to create QC inspection", 400);
  }
}
