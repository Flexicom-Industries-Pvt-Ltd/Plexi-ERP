import { NextResponse } from "next/server";
import { pruneExpiredEvidencePhotos } from "@/lib/production/photo-retention";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Check cron secret header if configured (Vercel Cron protection)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pruneExpiredEvidencePhotos(3);

    return NextResponse.json({
      success: true,
      message: `Pruned ${result.totalPruned} evidence photos older than 3 days.`,
      result,
    });
  } catch (error: any) {
    console.error("Cron photo pruning failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to prune photos" },
      { status: 500 }
    );
  }
}
