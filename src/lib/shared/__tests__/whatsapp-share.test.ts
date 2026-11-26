import { describe, it, expect } from "vitest";
import {
  detectA4Orientation,
  sanitizePdfFileName,
  buildWhatsAppShareUrl,
  prepareIsolatedPrintHtml,
  isMobileShareEnvironment,
} from "../whatsapp-share";

describe("whatsapp-share utilities", () => {
  it("detects A4 landscape vs portrait orientation from @page CSS", () => {
    expect(
      detectA4Orientation("<style>@page { size: A4 landscape; margin: 8mm; }</style>")
    ).toBe("landscape");
    expect(
      detectA4Orientation("<style>@page { size: A4 portrait; margin: 5mm; }</style>")
    ).toBe("portrait");
    expect(detectA4Orientation("<html><body>No page rule</body></html>")).toBe("portrait");
  });

  it("sanitizes filenames and enforces .pdf suffix", () => {
    expect(sanitizePdfFileName("RP-WC-20261126-001")).toBe("RP-WC-20261126-001.pdf");
    expect(sanitizePdfFileName("Report / #12 (Day).pdf")).toBe("Report_12_Day_.pdf");
    expect(sanitizePdfFileName("   ")).toBe("report.pdf");
  });

  it("builds official api.whatsapp.com launcher URL with encoded caption", () => {
    const url = buildWhatsAppShareUrl("Wastage Report\nDate: 2026-11-26");
    expect(url).toBe(
      "https://api.whatsapp.com/send?text=Wastage%20Report%0ADate%3A%202026-11-26"
    );
  });

  it("strips scripts and resolves root-relative image URLs against origin", () => {
    const html = `<html><body><img src="/logo.png" /><script>alert(1)</script></body></html>`;
    const prepared = prepareIsolatedPrintHtml(html, "https://plexi-erp.flexicom.in");
    expect(prepared).toContain('src="https://plexi-erp.flexicom.in/logo.png"');
    expect(prepared).not.toContain("<script>");
  });

  it("identifies mobile share environments while keeping narrow desktop windows on desktop path", () => {
    const desktopNarrow = {
      innerWidth: 500,
      navigator: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0",
      },
    } as unknown as Window;
    expect(isMobileShareEnvironment(desktopNarrow)).toBe(false);

    const androidPhone = {
      innerWidth: 412,
      navigator: {
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36",
      },
    } as unknown as Window;
    expect(isMobileShareEnvironment(androidPhone)).toBe(true);

    const electronWin = {
      innerWidth: 1200,
      __IS_ELECTRON__: true,
      navigator: {
        userAgent: "Mozilla/5.0 (Linux; Android 14) Electron/34.2.0",
      },
    } as unknown as Window;
    expect(isMobileShareEnvironment(electronWin)).toBe(false);
  });
});
