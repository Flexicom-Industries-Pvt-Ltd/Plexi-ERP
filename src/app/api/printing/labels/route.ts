import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import {
  generateBobbinLabel,
  generateRollLabel,
  generateBaleLabel,
  GeneratedLabel,
} from "@/lib/printing/label-generator";
import { rateLimiters, applyRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimitRes = await rateLimiters.general(request);
  if (!rateLimitRes.success) {
    const errorResponse = apiError("Too Many Requests: Rate limit exceeded", 429);
    return applyRateLimitHeaders(errorResponse, rateLimitRes);
  }

  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { type, data, format } = body;

    let label: GeneratedLabel;

    switch (type) {
      case "BOBBIN":
        label = generateBobbinLabel(data);
        break;
      case "ROLL":
        label = generateRollLabel(data);
        break;
      case "BALE":
        label = generateBaleLabel(data);
        break;
      default:
        const errorResponse = apiError(
          "Invalid label type. Supported: BOBBIN, ROLL, BALE",
          400
        );
        return applyRateLimitHeaders(errorResponse, rateLimitRes);
    }

    if (format === "zpl") {
      return new NextResponse(label.zpl, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${label.identifier}.zpl"`,
        },
      });
    }

    const response = apiSuccess(label);
    return applyRateLimitHeaders(response, rateLimitRes);
  } catch (err: any) {
    const errorResponse = apiError(err.message || "Failed to generate label", 500);
    return applyRateLimitHeaders(errorResponse, rateLimitRes);
  }
}
