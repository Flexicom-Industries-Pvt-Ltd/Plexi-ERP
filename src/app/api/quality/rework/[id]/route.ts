import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { QualityService } from "@/services/quality.service";
import { UpdateQcReworkTicketSchema } from "@/lib/schemas/quality";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const ticket = await QualityService.getReworkTicketById(id);

    if (!ticket) {
      return apiError("Rework ticket not found", 404);
    }

    return apiSuccess(ticket);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch rework ticket", 400);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canUpdate" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateQcReworkTicketSchema.parse(body);

    const updated = await QualityService.updateReworkTicket(id, {
      ...data,
      completedById: data.completedById || auth.session.user.id,
    });

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || "Failed to update rework ticket", 400);
  }
}
