import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const downloadsDir = path.join(process.cwd(), "public", "downloads");
    const installerCandidates = [
      path.join(downloadsDir, "Plexi-ERP-Setup.exe"),
      path.join(downloadsDir, "Plexi-ERP-Setup-0.1.0.exe"),
    ];

    for (const candidate of installerCandidates) {
      if (fs.existsSync(candidate)) {
        const fileBuffer = fs.readFileSync(candidate);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.microsoft.portable-executable",
            "Content-Disposition": 'attachment; filename="Plexi-ERP-Setup.exe"',
            "Content-Length": fileBuffer.length.toString(),
          },
        });
      }
    }

    // If binary not placed in public/downloads yet, check for release redirection or return manifest metadata
    const releaseUrl =
      process.env.ELECTRON_RELEASE_URL ||
      "https://github.com/Flexicom-Industries-Pvt-Ltd/Plexi-ERP/releases/latest/download/Plexi-ERP-Setup.exe";

    // If query parameter format=json requested, return metadata
    if (req.nextUrl.searchParams.get("format") === "json") {
      return NextResponse.json({
        available: true,
        version: "0.1.0",
        platform: "win32",
        arch: "x64",
        filename: "Plexi-ERP-Setup.exe",
        url: releaseUrl,
        publisher: "Flexicom Industries Pvt. Ltd.",
      });
    }

    // Redirect to direct release binary download
    return NextResponse.redirect(releaseUrl, { status: 302 });
  } catch (error) {
    console.error("Desktop download handler error:", error);
    return NextResponse.json(
      { error: "Failed to resolve desktop installer" },
      { status: 500 }
    );
  }
}
