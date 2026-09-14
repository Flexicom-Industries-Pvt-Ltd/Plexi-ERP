import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { GateService } from "@/services/gate.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    return apiSuccess(result.entries, { meta: result.meta as any });
  } catch (error) {
    console.error("Error fetching gate entries:", error);
    return apiError("Failed to fetch gate entries", 500);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth({
    module: Module.SECURITY_GATE,
    action: "canCreate",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const data = await request.json();
    if (!data.truckNumber || !data.driverName) {
      return apiError("Truck number and Driver name are required", 400);
    }

    const newEntry = await GateService.createGateEntry(data, authResult.user.id);
    return apiSuccess(newEntry, { status: 201 });
  } catch (error: any) {
    console.error("Error creating gate entry:", error);
    return apiError(error.message || "Failed to create gate entry", 500);
  }
}
