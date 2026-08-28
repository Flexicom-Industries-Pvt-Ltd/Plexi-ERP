import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "INVENTORY" && p.canRead);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Fetch Gate Entries that are either UNLOADING or COMPLETED, have purpose LOADING/UNLOADING, 
    // and have stock details that have NOT been synced to inventory yet (actualQuantity is null).
    const entries = await db.gateEntry.findMany({
      where: {
        status: { in: ["UNLOADING", "COMPLETED", "GATE_OUT"] },
        stockDetails: {
          some: {
            actualQuantity: null,
          }
        }
      },
      orderBy: { arrivalTime: "desc" },
      include: {
        stockDetails: true,
      },
    });
    
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching pending gate receipts:", error);
    return NextResponse.json({ error: "Failed to fetch pending gate receipts" }, { status: 500 });
  }
}
