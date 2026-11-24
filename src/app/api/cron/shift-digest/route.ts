import { NextRequest } from "next/server";
import { ShiftDigestService } from "@/services/shift-digest.service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authCheck = verifyCronRequest(request);
  if (!authCheck.ok) return authCheck.response;

  const { searchParams } = new URL(request.url);
  const shift = searchParams.get("shift") || "A";
  const date = searchParams.get("date") || undefined;

  try {
    const digest = await ShiftDigestService.generateShiftDigest({
      shift,
      date,
    });

    return apiSuccess(digest);
  } catch (err: any) {
    return apiError(err.message || "Failed to generate shift digest", 500);
  }
}
