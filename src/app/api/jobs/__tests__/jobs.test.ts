import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as postExport } from "../export/route";
import { GET as getJob } from "../[id]/route";
import { taskQueue } from "@/lib/queue/task-queue";
import { requireApiAuth } from "@/lib/api-auth";

vi.mock("@/lib/api-auth", () => ({
  requireApiAuth: vi.fn(),
}));

describe("Background Jobs API (/api/jobs)", () => {
  beforeEach(() => {
    taskQueue.clear();
    vi.mocked(requireApiAuth).mockResolvedValue({
      ok: true,
      session: { user: { id: "user-test-admin" } } as any,
      user: { id: "user-test-admin" } as any,
    });
  });

  it("POST /api/jobs/export should enqueue task and return 202 Accepted with jobId", async () => {
    const request = new NextRequest("http://localhost:3000/api/jobs/export", {
      method: "POST",
      body: JSON.stringify({ type: "EXPORT_AUDIT_LOGS", filters: { limit: 500 } }),
    });

    const response = await postExport(request);
    expect(response.status).toBe(202);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.jobId).toMatch(/^job_/);
    expect(["PENDING", "PROCESSING"]).toContain(body.data.status);
    expect(body.data.pollUrl).toBe(`/api/jobs/${body.data.jobId}`);
  });

  it("GET /api/jobs/[id] should return 200 with job details", async () => {
    const job = await taskQueue.enqueue("EXPORT_AUDIT_LOGS", {});
    const request = new NextRequest(`http://localhost:3000/api/jobs/${job.id}`);

    const response = await getJob(request, { params: Promise.resolve({ id: job.id }) });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.jobId).toBe(job.id);
  });

  it("GET /api/jobs/[id] should return 404 if job does not exist", async () => {
    const request = new NextRequest("http://localhost:3000/api/jobs/non-existent-id");
    const response = await getJob(request, { params: Promise.resolve({ id: "non-existent-id" }) });

    expect(response.status).toBe(404);
  });
});
