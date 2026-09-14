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
    const query = searchParams.get("q") || searchParams.get("name");
    const stockId = searchParams.get("id");

    if (stockId) {
      const stock = await db.stock.findUnique({
        where: { id: stockId },
        include: {
          uom: true,
          inventoryItems: {
            select: {
              id: true,
              currentStock: true,
              reservedStock: true,
              minimumStock: true,
            },
          },
        },
      });

      if (!stock) {
        return NextResponse.json({ error: "Stock not found" }, { status: 404 });
      }

      const currentStock = stock.inventoryItems.reduce((acc, item) => acc + (item.currentStock || 0), 0);
      const reservedStock = stock.inventoryItems.reduce((acc, item) => acc + (item.reservedStock || 0), 0);
      const availableStock = Math.max(0, currentStock - reservedStock);

      return NextResponse.json({
        id: stock.id,
        code: stock.code,
        name: stock.name,
        materialType: stock.materialType,
        uom: stock.uom,
        currentStock,
        reservedStock,
        availableStock,
      });
    }

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const [stocks, standaloneItems] = await Promise.all([
      db.stock.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          uom: true,
          inventoryItems: {
            select: {
              id: true,
              currentStock: true,
              reservedStock: true,
              minimumStock: true,
            },
          },
        },
        take: 15,
        orderBy: { name: "asc" },
      }),
      db.inventoryItem.findMany({
        where: {
          isActive: true,
          stockId: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { uom: true },
        take: 10,
        orderBy: { name: "asc" },
      }),
    ]);

    const results: any[] = stocks.map((stock) => {
      const currentStock = stock.inventoryItems.reduce((acc, item) => acc + (item.currentStock || 0), 0);
      const reservedStock = stock.inventoryItems.reduce((acc, item) => acc + (item.reservedStock || 0), 0);
      const availableStock = Math.max(0, currentStock - reservedStock);

      return {
        id: stock.id,
        code: stock.code,
        name: stock.name,
        materialType: stock.materialType,
        uom: stock.uom,
        currentStock,
        reservedStock,
        availableStock,
      };
    });

    const existingNames = new Set(results.map((r) => r.name.toLowerCase()));

    for (const item of standaloneItems) {
      if (!existingNames.has(item.name.toLowerCase())) {
        const availableStock = Math.max(0, (item.currentStock || 0) - (item.reservedStock || 0));
        results.push({
          id: item.id,
          code: item.code,
          name: item.name,
          materialType: "RAW_MATERIALS",
          uom: item.uom,
          currentStock: item.currentStock || 0,
          reservedStock: item.reservedStock || 0,
          availableStock,
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[STOCK_SEARCH_ERROR]", error);
    return NextResponse.json({ error: "Failed to search stocks" }, { status: 500 });
  }
}
