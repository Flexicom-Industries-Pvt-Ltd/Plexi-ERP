import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const stocks = await db.stock.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { uom: true },
      take: 10,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(stocks);
  } catch (error) {
    console.error("[STOCK_SEARCH_ERROR]", error);
    return NextResponse.json({ error: "Failed to search stocks" }, { status: 500 });
  }
}
