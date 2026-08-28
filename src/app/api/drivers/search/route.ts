import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

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

    const drivers = await db.driver.findMany({
      where: {
        phone: {
          startsWith: query,
        },
        isActive: true,
      },
      take: 10,
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("[DRIVER_SEARCH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to search drivers" },
      { status: 500 }
    );
  }
}
