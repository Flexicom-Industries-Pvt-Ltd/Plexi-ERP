import { NextResponse } from "next/server";
import { pruneExpiredEvidencePhotos } from "@/lib/production/photo-retention";
import { pruneExpiredGatePhotos } from "@/lib/gate/gate-photo-retention";

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
    const [productionResult, gateResult] = await Promise.all([
      pruneExpiredEvidencePhotos(3),
      pruneExpiredGatePhotos(3),
    ]);

    const totalPruned = (productionResult.totalPruned || 0) + (gateResult.totalPruned || 0);

    return NextResponse.json({
      success: true,
      message: `Pruned ${totalPruned} photos older than 3 days (${productionResult.totalPruned || 0} production, ${gateResult.totalPruned || 0} gate entry).`,
      production: productionResult,
      gate: gateResult,
    });
  } catch (error: any) {
    console.error("Cron photo pruning failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to prune photos" },
      { status: 500 }
    );
  }
}
