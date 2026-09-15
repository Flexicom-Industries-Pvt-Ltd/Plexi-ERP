import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { GateService } from "@/services/gate.service";
import { withIdempotency } from "@/lib/idempotency";
import { rateLimiters, applyRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimitRes = await rateLimiters.general(request);
  if (!rateLimitRes.success) {
    const errorResponse = apiError("Too Many Requests: Rate limit exceeded", 429);
    return applyRateLimitHeaders(errorResponse, rateLimitRes);
  }

  const authResult = await requireApiAuth({
    module: Module.SECURITY_GATE,
    action: "canRead",
  });
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const purpose = searchParams.get("purpose");
  const truckNumber = searchParams.get("truckNumber");
  const search = searchParams.get("search");
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");

  try {
    const result = await GateService.listGateEntries({
      status,
      purpose,
      truckNumber,
      search,
      page,
      limit,
    });

    const response = apiSuccess(result.entries, { meta: result.meta as any });
    return applyRateLimitHeaders(response, rateLimitRes);
  } catch (error) {
    console.error("Error fetching gate entries:", error);
    const response = apiError("Failed to fetch gate entries", 500);
    return applyRateLimitHeaders(response, rateLimitRes);
  }
}

export async function POST(request: NextRequest) {
  const rateLimitRes = await rateLimiters.mutation(request);
  if (!rateLimitRes.success) {
    const errorResponse = apiError("Too Many Requests: Rate limit exceeded", 429);
    return applyRateLimitHeaders(errorResponse, rateLimitRes);
  }

  const authResult = await requireApiAuth({
    module: Module.SECURITY_GATE,
    action: "canCreate",
  });
  if (!authResult.ok) return authResult.response;

  return withIdempotency(request, async () => {
    try {
      const data = await request.json();
      if (!data.truckNumber || !data.driverName) {
        const response = apiError("Truck number and Driver name are required", 400);
        return applyRateLimitHeaders(response, rateLimitRes);
      }

      const newEntry = await GateService.createGateEntry(data, authResult.user.id);
      const response = apiSuccess(newEntry, { status: 201 });
      return applyRateLimitHeaders(response, rateLimitRes);
    } catch (error: any) {
      console.error("Error creating gate entry:", error);
      const response = apiError(error.message || "Failed to create gate entry", 500);
      return applyRateLimitHeaders(response, rateLimitRes);
    }
  });
}

