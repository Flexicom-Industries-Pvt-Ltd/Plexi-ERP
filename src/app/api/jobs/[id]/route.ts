import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { taskQueue } from "@/lib/queue/task-queue";
import { rateLimiters, applyRateLimitHeaders } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitRes = await rateLimiters.general(request);
  if (!rateLimitRes.success) {
    const errorResponse = apiError("Too Many Requests: Rate limit exceeded", 429);
    return applyRateLimitHeaders(errorResponse, rateLimitRes);
  }

  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const job = taskQueue.getJob(id);

    if (!job) {
      const errorResponse = apiError("Job not found", 404);
      return applyRateLimitHeaders(errorResponse, rateLimitRes);
    }

    const response = apiSuccess(
      {
        jobId: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
      { meta: {} }
    );

    return applyRateLimitHeaders(response, rateLimitRes);
  } catch (err: any) {
    const errorResponse = apiError(err.message || "Failed to query job status", 500);
    return applyRateLimitHeaders(errorResponse, rateLimitRes);
  }
}
