import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { GateService } from "@/services/gate.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireApiAuth({
    module: Module.SECURITY_GATE,
    action: "canRead",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const entry = await GateService.getGateEntry(id);
    if (!entry) return apiError("Gate entry not found", 404);

    return apiSuccess(entry);
  } catch (error) {
    console.error("Error fetching gate entry details:", error);
    return apiError("Failed to fetch gate entry", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireApiAuth({
    module: Module.SECURITY_GATE,
    action: "canUpdate",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const data = await request.json();
    const updated = await GateService.updateGateEntry(id, data, authResult.user.id);
    if (!updated) return apiError("Gate entry not found", 404);

    return apiSuccess(updated);
  } catch (error: any) {
    console.error("Error updating gate entry:", error);
    return apiError(error.message || "Failed to update gate entry", 400);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireApiAuth({
    module: Module.SECURITY_GATE,
    action: "canDelete",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const result = await GateService.deleteGateEntry(id, authResult.user.id);
    if (result.notFound) return apiError("Gate entry not found", 404);

    return apiSuccess({ success: true });
  } catch (error: any) {
    console.error("Error deleting gate entry:", error);
    return apiError(error.message || "Failed to delete gate entry", 400);
  }
}
