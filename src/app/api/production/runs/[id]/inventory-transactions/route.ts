import { NextRequest, NextResponse } from "next/server";
import {
  BALE_REFERENCE,
  fetchProductionInventoryTransactions,
  PRODUCTION_RUN_REFERENCE,
} from "@/lib/production/inventory-tx";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const referenceType = searchParams.get("referenceType") ?? PRODUCTION_RUN_REFERENCE;

  const allowed = new Set([PRODUCTION_RUN_REFERENCE, BALE_REFERENCE]);
  if (!allowed.has(referenceType)) {
    return NextResponse.json({ error: "Invalid referenceType" }, { status: 400 });
  }

  try {
    const transactions = await fetchProductionInventoryTransactions(referenceType, id);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching production inventory transactions:", error);
    return NextResponse.json({ error: "Failed to fetch inventory transactions" }, { status: 500 });
  }
}
