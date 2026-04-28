"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if this is iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Handle Chrome/Edge PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
  };

  if (dismissed || !showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-surface-950 to-surface-900 border-t border-surface-700/50 p-4 shadow-xl z-40">
      <div className="max-w-md mx-auto">
        {isIOS ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white text-sm">Add ReelTunes to Home Screen</p>
                <p className="text-xs text-surface-100/65 mt-1">
                  Tap the Share button, then select "Add to Home Screen" to use ReelTunes as an app and share songs directly!
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-surface-400 hover:text-surface-300 transition p-1"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white text-sm">Install ReelTunes App</p>
                <p className="text-xs text-surface-100/65 mt-1">
                  Install as an app to share songs directly from Instagram and other apps!
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-surface-400 hover:text-surface-300 transition p-1"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
            <button
              onClick={handleInstall}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-semibold text-sm transition"
            >
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
