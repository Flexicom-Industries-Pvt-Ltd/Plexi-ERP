"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import Image from "next/image";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if already installed (standalone mode)
    const checkStandalone = () => {
      const isStan = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(isStan);
    };
    checkStandalone();

    const checkMobile = () => {
      const ua = window.navigator.userAgent;
      const mobile = window.innerWidth <= 768 || /Mobi|Android/i.test(ua);
      const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      setIsMobile(mobile);
      setIsIos(ios);
      
      // If iOS and mobile and not standalone, show the prompt manually 
      // (since iOS doesn't fire beforeinstallprompt)
      if (ios && mobile && !isStandalone) {
        setIsVisible(true);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (window.innerWidth <= 768 || /Mobi|Android/i.test(navigator.userAgent)) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("resize", checkMobile);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (isIos) {
      alert("To install on iOS: Tap the Share button at the bottom of Safari and select 'Add to Home Screen'.");
      return;
    }
    
    if (!deferredPrompt) {
      alert("App can only be installed over HTTPS or localhost, or it's already installed.");
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !isMobile || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] bg-slate-900 text-white rounded-xl shadow-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between animate-in slide-in-from-bottom-5">
      <div className="flex items-center space-x-3">
        <div className="bg-slate-100 p-1 rounded-lg shrink-0 flex items-center justify-center overflow-hidden h-12 w-12 relative">
          <Image src="/logo.png" alt="Plexi ERP Logo" fill className="object-contain p-1" />
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
