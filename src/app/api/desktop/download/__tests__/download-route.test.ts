import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import fs from "fs";

describe("Desktop Installer Download API Route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns metadata JSON when format=json query parameter is passed", async () => {
    const req = new NextRequest("http://localhost:3000/api/desktop/download?format=json");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.available).toBe(true);
    expect(data.platform).toBe("win32");
    expect(data.filename).toBe("Plexi-ERP-Setup.exe");
    expect(data.publisher).toBe("Flexicom Industries Pvt. Ltd.");
  });

  it("returns 302 redirect to release binary when local installer is not present", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const req = new NextRequest("http://localhost:3000/api/desktop/download");
    const res = await GET(req);

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("Plexi-ERP-Setup.exe");
  });

  it("streams binary executable when local installer exists in public/downloads", async () => {
    const mockBuffer = Buffer.from("MZ mock executable header");
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      return typeof p === "string" && p.includes("Plexi-ERP-Setup.exe");
    });
    vi.spyOn(fs, "readFileSync").mockReturnValue(mockBuffer);

    const req = new NextRequest("http://localhost:3000/api/desktop/download");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/vnd.microsoft.portable-executable");
    expect(res.headers.get("Content-Disposition")).toContain('attachment; filename="Plexi-ERP-Setup.exe"');
  });
});
