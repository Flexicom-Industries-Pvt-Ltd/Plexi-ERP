/**
 * PWA Utility Functions for Standalone Detection, Installation Tracking, and Dismissal Suppression
 */

export const PWA_STORAGE_KEYS = {
  INSTALLED: "plexi_pwa_installed",
  DISMISSED_UNTIL: "plexi_pwa_dismissed_until",
} as const;

export const PWA_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7-day dismissal memory

/**
 * Checks whether the current window/environment is running as a standalone installed PWA
 * via multi-factor heuristic checks (display-mode, iOS standalone, WebAPK referrer, URL param, localStorage).
 */
export function isPwaStandalone(win?: Window): boolean {
  if (typeof window === "undefined" && !win) return false;
  const w = win || window;

  // 1. CSS display-mode media queries
  const isStandalone = w.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
  const isFullscreen = w.matchMedia?.("(display-mode: fullscreen)")?.matches ?? false;
  const isMinimalUi = w.matchMedia?.("(display-mode: minimal-ui)")?.matches ?? false;

  // 2. iOS standalone boolean
  const isIosStandalone = (w.navigator as unknown as { standalone?: boolean })?.standalone === true;

  // 3. Android WebAPK intent launch referrer
  const isAndroidWebApk = Boolean(w.document?.referrer?.startsWith("android-app://"));

  // 4. Dedicated start_url query parameters
  const hasPwaParam = Boolean(
    w.location?.search?.includes("source=pwa") || w.location?.search?.includes("mode=standalone")
  );

  // 5. Persistent local storage marker
  let isMarkedInstalled = false;
  try {
    isMarkedInstalled = w.localStorage?.getItem(PWA_STORAGE_KEYS.INSTALLED) === "true";
  } catch {
    // Ignore private browsing storage restrictions
  }

  return (
    isStandalone ||
    isFullscreen ||
    isMinimalUi ||
    isIosStandalone ||
    isAndroidWebApk ||
    hasPwaParam ||
    isMarkedInstalled
  );
}

/**
 * Checks if the user previously dismissed the install prompt within the cooldown window.
 */
export function isPromptDismissed(win?: Window): boolean {
  if (typeof window === "undefined" && !win) return false;
  const w = win || window;
  try {
    const dismissedUntil = w.localStorage?.getItem(PWA_STORAGE_KEYS.DISMISSED_UNTIL);
    if (!dismissedUntil) return false;
    const expiry = parseInt(dismissedUntil, 10);
    return !isNaN(expiry) && Date.now() < expiry;
  } catch {
    return false;
  }
}

/**
 * Records that the user dismissed the install prompt for the designated cooldown duration.
 */
export function markPromptDismissed(
  win?: Window,
  cooldownMs: number = PWA_DISMISS_COOLDOWN_MS
): void {
  if (typeof window === "undefined" && !win) return;
  const w = win || window;
  try {
    w.localStorage?.setItem(
      PWA_STORAGE_KEYS.DISMISSED_UNTIL,
      (Date.now() + cooldownMs).toString()
    );
  } catch {
    // Ignore private browsing storage restrictions
  }
}

/**
 * Permanently records that the PWA has been installed on this device/client.
 */
export function markPwaInstalled(win?: Window): void {
  if (typeof window === "undefined" && !win) return;
  const w = win || window;
  try {
    w.localStorage?.setItem(PWA_STORAGE_KEYS.INSTALLED, "true");
  } catch {
    // Ignore private browsing storage restrictions
  }
}

/**
 * Detects whether the current client is a mobile device or iOS environment.
 */
export function isMobileOrIos(win?: Window): { isMobile: boolean; isIos: boolean } {
  if (typeof window === "undefined" && !win) return { isMobile: false, isIos: false };
  const w = win || window;
  const ua = w.navigator?.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(w as unknown as { MSStream?: unknown }).MSStream;
  const isMobile = (w.innerWidth ?? 1024) <= 768 || /Mobi|Android|iPhone|iPad/i.test(ua);
  return { isMobile, isIos };
}

/**
 * Detects whether the current window/environment is running inside the dedicated Electron desktop shell.
 */
export function isElectron(win?: Window): boolean {
  if (typeof window === "undefined" && !win) return false;
  const w = win || window;
  const ua = w.navigator?.userAgent || "";
  const hasElectronUa = /electron/i.test(ua);
  const hasElectronFlag = Boolean(
    (w as unknown as { __IS_ELECTRON__?: boolean }).__IS_ELECTRON__
  );
  return hasElectronUa || hasElectronFlag;
}
