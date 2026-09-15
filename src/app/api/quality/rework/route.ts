import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { QualityService } from "@/services/quality.service";
import {
  CreateQcReworkTicketSchema,
  ListQcReworkTicketsQuerySchema,
} from "@/lib/schemas/quality";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const query = ListQcReworkTicketsQuerySchema.parse({
      status: searchParams.get("status") || undefined,
      targetPhase: searchParams.get("targetPhase") || undefined,
      sourceReferenceType: searchParams.get("sourceReferenceType") || undefined,
      sourceReferenceId: searchParams.get("sourceReferenceId") || undefined,
      assignedOperatorId: searchParams.get("assignedOperatorId") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const result = await QualityService.listReworkTickets(query, { paginate: true });
    return apiSuccess(result);
  } catch (error: any) {
    return apiError(error.message || "Failed to list rework tickets", 400);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.QUALITY_CONTROL, action: "canCreate" });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const data = CreateQcReworkTicketSchema.parse(body);

    const ticket = await QualityService.createReworkTicket({
      ...data,
      assignedOperatorId: data.assignedOperatorId || auth.session.user.id,
    });

    return apiSuccess(ticket, { status: 201 });
  } catch (error: any) {

    return apiError(error.message || "Failed to create rework ticket", 400);
  }
}
