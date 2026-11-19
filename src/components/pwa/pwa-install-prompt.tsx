"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Share, PlusSquare, Smartphone } from "lucide-react";
import Image from "next/image";
import {
  isPwaStandalone,
  isPromptDismissed,
  markPromptDismissed,
  markPwaInstalled,
  isMobileOrIos,
  isElectron,
} from "@/lib/pwa/pwa-utils";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Immediately abort if running in Electron, standalone PWA, previously dismissed/installed, or on desktop/laptop
    const { isMobile: mobile, isIos: ios } = isMobileOrIos();
    setIsIos(ios);

    if (!mobile || isElectron() || isPwaStandalone() || isPromptDismissed()) {
      return;
    }

    // 2. On iOS mobile web
    if (ios && mobile) {
      setIsVisible(true);
    }

    // 3. Android / Chromium beforeinstallprompt listener (mobile phones only)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const { isMobile: isMobileDevice } = isMobileOrIos();
      if (isMobileDevice && !isPwaStandalone() && !isPromptDismissed() && !isElectron()) {
        setIsVisible(true);
      }
    };

    // 4. Browser appinstalled event listener (fires when user completes installation)
    const handleAppInstalled = () => {
      markPwaInstalled();
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback instruction for browsers without deferredPrompt
      alert("To install Plexi ERP, open your browser menu (⋮) and select 'Install app' or 'Add to Home screen'.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        markPwaInstalled();
      }
    } catch (err) {
      console.warn("PWA install error:", err);
    } finally {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    markPromptDismissed();
    setIsVisible(false);
    setShowIosGuide(false);
  };

  // Never render in standalone PWA or if hidden
  if (!isVisible && !showIosGuide) {
    return null;
  }

  return (
    <>
      {/* iOS Step-by-Step Installation Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-sm tracking-tight text-slate-100">Install Plexi ERP on iOS</h3>
              </div>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start space-x-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="bg-blue-600/20 text-blue-400 p-2 rounded-lg shrink-0">
                  <Share className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Step 1:</span> Tap the <strong className="text-sky-400">Share</strong> button in Safari&apos;s bottom navigation bar.
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="bg-sky-600/20 text-sky-400 p-2 rounded-lg shrink-0">
                  <PlusSquare className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Step 2:</span> Scroll down and select <strong className="text-sky-400">&apos;Add to Home Screen&apos;</strong>.
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="bg-emerald-600/20 text-emerald-400 p-2 rounded-lg shrink-0">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Step 3:</span> Tap <strong className="text-emerald-400">&apos;Add&apos;</strong> in the top-right corner to finish.
                </div>
              </div>
            </div>

            <Button
              onClick={handleDismiss}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs h-9"
            >
              Got it
            </Button>
          </div>
        </div>
      )}

      {/* Main Persistent Bottom Notification */}
      {isVisible && !showIosGuide && (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-slate-900/95 backdrop-blur-md text-white rounded-2xl border border-slate-800 shadow-2xl p-3.5 flex items-center justify-between gap-3 max-w-lg mx-auto animate-in slide-in-from-bottom-5">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="bg-white p-1 rounded-xl shrink-0 flex items-center justify-center overflow-hidden h-11 w-11 relative border border-slate-200/20 shadow-xs">
              <Image
                src="/icon-192x192.png"
                alt="Plexi ERP Logo"
                fill
                sizes="44px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div className="truncate">
              <h4 className="font-bold text-xs sm:text-sm tracking-tight text-slate-100 truncate">
                Install Plexi ERP
              </h4>
              <p className="text-[11px] text-slate-400 truncate">
                {isIos ? "Add to home screen for native iOS app" : "Add to home screen for fast native app"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold h-8 px-3.5 text-xs rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install</span>
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Dismiss installation prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
