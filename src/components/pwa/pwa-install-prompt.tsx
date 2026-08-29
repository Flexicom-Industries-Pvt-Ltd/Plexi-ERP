"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile using simple window width or userAgent
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Only show if mobile
      if (window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent)) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-slate-900 text-white rounded-xl shadow-2xl p-4 flex items-center justify-between animate-in slide-in-from-bottom-5">
      <div className="flex items-center space-x-3">
        <div className="bg-slate-800 p-2 rounded-lg">
          <Download className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">Install Plexi ERP</h4>
          <p className="text-xs text-slate-400">Add to home screen for native experience</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button onClick={handleInstallClick} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-xs">
          Install
        </Button>
        <button onClick={handleDismiss} className="p-2 text-slate-400 hover:text-white rounded-full">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
