import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as postExport } from "../export/route";
import { GET as getJob } from "../[id]/route";
import { GET as downloadJob } from "../[id]/download/route";
import { taskQueue } from "@/lib/queue/task-queue";
import { requireApiAuth } from "@/lib/api-auth";

vi.mock("@/lib/api-auth", () => ({
  requireApiAuth: vi.fn(),
  isSuperAdminRole: vi.fn().mockReturnValue(true),
}));

describe("Real Background CSV Export & Download Endpoint", () => {
  beforeEach(() => {
    taskQueue.clear();
    vi.mocked(requireApiAuth).mockResolvedValue({
      ok: true,
      session: { user: { id: "user-export-admin", role: "Super Admin" } } as any,
      user: { id: "user-export-admin", role: "Super Admin" } as any,
    });
  });

  it("should generate real CSV data and allow authorized download", async () => {
    // 1. Enqueue real audit log export
    const postReq = new NextRequest("http://localhost:3000/api/jobs/export", {
      method: "POST",
      body: JSON.stringify({ type: "EXPORT_AUDIT_LOGS" }),
    });

    const postRes = await postExport(postReq);
    expect(postRes.status).toBe(202);
    const postBody = await postRes.json();
    const jobId = postBody.data.jobId;

    // 2. Wait for background queue processing to finish
    await new Promise((resolve) => setTimeout(resolve, 80));

    // 3. Inspect job status
    const getReq = new NextRequest(`http://localhost:3000/api/jobs/${jobId}`);
    const getRes = await getJob(getReq, { params: Promise.resolve({ id: jobId }) });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    if (getBody.data.status === "FAILED") {
      console.error("JOB FAILED WITH ERROR:", getBody.data.error);
    }
    expect(getBody.data.status).toBe("COMPLETED");
    expect(getBody.data.result.fileType).toBe("csv");
    expect(getBody.data.result.downloadUrl).toBe(`/api/jobs/${jobId}/download`);

    // 4. Download generated CSV
    const downloadReq = new NextRequest(`http://localhost:3000/api/jobs/${jobId}/download`);
    const downloadRes = await downloadJob(downloadReq, { params: Promise.resolve({ id: jobId }) });
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers.get("content-type")).toContain("text/csv");
    expect(downloadRes.headers.get("content-disposition")).toContain(`attachment; filename="export-export_audit_logs-${jobId}.csv"`);

    const csvContent = await downloadRes.text();
    expect(csvContent).toContain("Timestamp,CorrelationId,Module,Severity,Action,IP");
  });

  it("should prevent unauthorized user from downloading another user's export", async () => {
    const job = await taskQueue.enqueue("EXPORT_AUDIT_LOGS", {}, { createdById: "other-user-999" });
    await new Promise((resolve) => setTimeout(resolve, 80));

    // Mock non-admin other user
    const { isSuperAdminRole } = await import("@/lib/api-auth");
    vi.mocked(isSuperAdminRole).mockReturnValue(false);
    vi.mocked(requireApiAuth).mockResolvedValue({
      ok: true,
      session: { user: { id: "attacker-user-123", role: "Operator" } } as any,
      user: { id: "attacker-user-123", role: "Operator" } as any,
    });

    const downloadReq = new NextRequest(`http://localhost:3000/api/jobs/${job.id}/download`);
    const downloadRes = await downloadJob(downloadReq, { params: Promise.resolve({ id: job.id }) });
    expect(downloadRes.status).toBe(403);
  });
});
