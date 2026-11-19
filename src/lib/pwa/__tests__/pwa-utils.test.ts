import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isPwaStandalone,
  isPromptDismissed,
  markPromptDismissed,
  markPwaInstalled,
  isMobileOrIos,
  isElectron,
  PWA_STORAGE_KEYS,
} from "../pwa-utils";
import fs from "fs";
import path from "path";

describe("PWA Utilities & Standalone Suppression Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("isPwaStandalone()", () => {
    it("returns false in standard browser viewport without standalone indicators", () => {
      const mockWin = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
        navigator: { standalone: false, userAgent: "Mozilla/5.0" },
        document: { referrer: "https://google.com" },
        location: { search: "" },
        localStorage: {
          getItem: vi.fn().mockReturnValue(null),
        },
      } as unknown as Window;

      expect(isPwaStandalone(mockWin)).toBe(false);
    });

    it("returns true when (display-mode: standalone) media query matches", () => {
      const mockWin = {
        matchMedia: vi.fn((query: string) => ({
          matches: query === "(display-mode: standalone)",
        })),
        navigator: { standalone: false },
        document: { referrer: "" },
        location: { search: "" },
        localStorage: { getItem: () => null },
      } as unknown as Window;

      expect(isPwaStandalone(mockWin)).toBe(true);
    });

    it("returns true when (display-mode: fullscreen) or (display-mode: minimal-ui) matches", () => {
      const mockWin = {
        matchMedia: vi.fn((query: string) => ({
          matches: query === "(display-mode: fullscreen)",
        })),
        navigator: { standalone: false },
        document: { referrer: "" },
        location: { search: "" },
        localStorage: { getItem: () => null },
      } as unknown as Window;

      expect(isPwaStandalone(mockWin)).toBe(true);
    });

    it("returns true when iOS navigator.standalone is true", () => {
      const mockWin = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
        navigator: { standalone: true },
        document: { referrer: "" },
        location: { search: "" },
        localStorage: { getItem: () => null },
      } as unknown as Window;

      expect(isPwaStandalone(mockWin)).toBe(true);
    });

    it("returns true when launched from Android WebAPK intent (android-app:// referrer)", () => {
      const mockWin = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
        navigator: { standalone: false },
        document: { referrer: "android-app://com.sec.android.app.sbrowser" },
        location: { search: "" },
        localStorage: { getItem: () => null },
      } as unknown as Window;

      expect(isPwaStandalone(mockWin)).toBe(true);
    });

    it("returns true when URL contains source=pwa parameter", () => {
      const mockWin = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
        navigator: { standalone: false },
        document: { referrer: "" },
        location: { search: "?source=pwa" },
        localStorage: { getItem: () => null },
      } as unknown as Window;

      expect(isPwaStandalone(mockWin)).toBe(true);
    });

    it("returns true when localStorage indicates PWA is already installed", () => {
      const mockWin = {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
        navigator: { standalone: false },
        document: { referrer: "" },
        location: { search: "" },
        localStorage: {
          getItem: (key: string) =>
            key === PWA_STORAGE_KEYS.INSTALLED ? "true" : null,
        },
      } as unknown as Window;

      expect(isPwaStandalone(mockWin)).toBe(true);
    });
  });

  describe("Dismissal & Installation Storage State", () => {
    it("recognizes freshly dismissed prompt within the active cooldown period", () => {
      const mockStorage: Record<string, string> = {};
      const mockWin = {
        localStorage: {
          getItem: (k: string) => mockStorage[k] || null,
          setItem: (k: string, v: string) => {
            mockStorage[k] = v;
          },
        },
      } as unknown as Window;

      expect(isPromptDismissed(mockWin)).toBe(false);

      // Dismiss for 7 days
      markPromptDismissed(mockWin, 7 * 86400000);
      expect(isPromptDismissed(mockWin)).toBe(true);
      expect(mockStorage[PWA_STORAGE_KEYS.DISMISSED_UNTIL]).toBeDefined();
    });

    it("expires dismissal memory when timestamp is in the past", () => {
      const mockWin = {
        localStorage: {
          getItem: () => (Date.now() - 1000).toString(), // Expired 1 sec ago
          setItem: vi.fn(),
        },
      } as unknown as Window;

      expect(isPromptDismissed(mockWin)).toBe(false);
    });

    it("permanently records PWA installation on markPwaInstalled()", () => {
      const mockStorage: Record<string, string> = {};
      const mockWin = {
        localStorage: {
          getItem: (k: string) => mockStorage[k] || null,
          setItem: (k: string, v: string) => {
            mockStorage[k] = v;
          },
        },
      } as unknown as Window;

      markPwaInstalled(mockWin);
      expect(mockStorage[PWA_STORAGE_KEYS.INSTALLED]).toBe("true");
    });
  });

  describe("Device Detection", () => {
    it("identifies iOS iPhone user agent", () => {
      const mockWin = {
        innerWidth: 390,
        navigator: {
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        },
      } as unknown as Window;

      const { isMobile, isIos } = isMobileOrIos(mockWin);
      expect(isMobile).toBe(true);
      expect(isIos).toBe(true);
    });

    it("identifies Android mobile user agent", () => {
      const mockWin = {
        innerWidth: 412,
        navigator: {
          userAgent:
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36",
        },
      } as unknown as Window;

      const { isMobile, isIos } = isMobileOrIos(mockWin);
      expect(isMobile).toBe(true);
      expect(isIos).toBe(false);
    });

    it("identifies desktop browser viewport", () => {
      const mockWin = {
        innerWidth: 1440,
        navigator: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        },
      } as unknown as Window;

      const { isMobile, isIos } = isMobileOrIos(mockWin);
      expect(isMobile).toBe(false);
      expect(isIos).toBe(false);
    });
  });

  describe("isElectron() Desktop Environment Detection", () => {
    it("returns false for standard web browsers", () => {
      const mockWin = {
        navigator: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        },
      } as unknown as Window;

      expect(isElectron(mockWin)).toBe(false);
    });

    it("returns true when User-Agent includes Electron", () => {
      const mockWin = {
        navigator: {
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Electron/34.2.0 PlexiERP-Desktop/0.1.0",
        },
      } as unknown as Window;

      expect(isElectron(mockWin)).toBe(true);
    });

    it("returns true when __IS_ELECTRON__ runtime marker is set on window", () => {
      const mockWin = {
        __IS_ELECTRON__: true,
        navigator: {
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      } as unknown as Window;

      expect(isElectron(mockWin)).toBe(true);
    });
  });

  describe("Desktop Electron & Production Manifest Asset Contract", () => {
    it("ensures public/icon.ico exists for Windows desktop executable & installer", () => {
      const icoPath = path.resolve(process.cwd(), "public/icon.ico");
      expect(fs.existsSync(icoPath)).toBe(true);
      const stat = fs.statSync(icoPath);
      expect(stat.size).toBeGreaterThan(5000);
    });

    it("ensures electron wrapper files and configuration exist", () => {
      const mainPath = path.resolve(process.cwd(), "electron/main.js");
      const preloadPath = path.resolve(process.cwd(), "electron/preload.js");
      const offlinePath = path.resolve(process.cwd(), "electron/offline.html");
      const builderConfigPath = path.resolve(process.cwd(), "electron-builder.json");

      expect(fs.existsSync(mainPath)).toBe(true);
      expect(fs.existsSync(preloadPath)).toBe(true);
      expect(fs.existsSync(offlinePath)).toBe(true);
      expect(fs.existsSync(builderConfigPath)).toBe(true);
    });
    it("ensures public/manifest.json conforms to modern PWA specification", () => {
      const manifestPath = path.resolve(process.cwd(), "public/manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      expect(manifestContent.id).toBe("/");
      expect(manifestContent.display).toBe("standalone");
      expect(manifestContent.start_url).toBe("/?source=pwa");
      expect(manifestContent.scope).toBe("/");
      expect(Array.isArray(manifestContent.icons)).toBe(true);

      // Verify separate 'any' and 'maskable' icons exist
      const hasAnyIcon = manifestContent.icons.some(
        (i: { purpose?: string }) => i.purpose === "any"
      );
      const hasMaskableIcon = manifestContent.icons.some(
        (i: { purpose?: string }) => i.purpose === "maskable"
      );

      expect(hasAnyIcon).toBe(true);
      expect(hasMaskableIcon).toBe(true);

      // Verify files referenced exist on disk
      for (const icon of manifestContent.icons) {
        const iconDiskPath = path.resolve(
          process.cwd(),
          "public",
          icon.src.replace(/^\//, "")
        );
        expect(fs.existsSync(iconDiskPath)).toBe(true);
      }
    });

    it("ensures public/apple-touch-icon.png exists on disk", () => {
      const appleIconPath = path.resolve(
        process.cwd(),
        "public/apple-touch-icon.png"
      );
      expect(fs.existsSync(appleIconPath)).toBe(true);
      const stat = fs.statSync(appleIconPath);
      expect(stat.size).toBeGreaterThan(1000);
    });
  });
});
