import { NextResponse } from "next/server";
import { pruneExpiredEvidencePhotos } from "@/lib/production/photo-retention";
import { pruneExpiredGatePhotos } from "@/lib/gate/gate-photo-retention";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Fail-closed authorization: requires valid CRON_SECRET Bearer header
  const authCheck = verifyCronRequest(request);
  if (!authCheck.ok) return authCheck.response;

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
