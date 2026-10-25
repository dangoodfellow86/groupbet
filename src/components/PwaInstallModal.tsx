'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, X, Sparkles } from 'lucide-react';
import { SquadPicksLogo } from './SquadPicksLogo';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const BANNER_DISMISSED_KEY = 'sp_pwa_banner_dismissed_v1';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Register Service Worker (/sw.js)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration skipped:', err);
        });
    }

    // 2. Detect Standalone mode (already installed to Home Screen)
    const checkStandalone = () => {
      const standaloneMatch =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(Boolean(standaloneMatch));
    };
    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = () => checkStandalone();
    mediaQuery.addEventListener?.('change', handleMediaChange);

    // 3. Detect iOS / iPadOS
    const ua = window.navigator.userAgent || '';
    const iOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIOS(iOSDevice);

    // 4. Check if mobile install banner was previously dismissed
    try {
      const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY) === 'true';
      setIsBannerDismissed(dismissed);
    } catch {
      setIsBannerDismissed(false);
    }

    // 5. Listen for Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerNativeInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  return {
    isStandalone,
    isIOS,
    canNativePrompt: Boolean(deferredPrompt),
    showMobileBanner: !isStandalone && !isBannerDismissed && (Boolean(deferredPrompt) || isIOS),
    triggerNativeInstall,
    dismissBanner,
  };
}

interface PwaInstallBannerProps {
  isIOS: boolean;
  canNativePrompt: boolean;
  onInstallClick: () => void;
  onDismiss: () => void;
}

export function PwaInstallBanner({
  isIOS,
  canNativePrompt,
  onInstallClick,
  onDismiss,
}: PwaInstallBannerProps) {
  return (
    <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-neutral-900/95 to-neutral-900 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200 sm:hidden">
      <div className="flex items-center gap-2.5 min-w-0">
        <SquadPicksLogo variant="mark" size="sm" />
        <div className="min-w-0">
          <div className="text-xs font-bold text-neutral-100 truncate flex items-center gap-1.5">
            <span>Install SquadPicks App</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Free
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 truncate">
            {isIOS && !canNativePrompt
              ? 'Add to your iPhone Home Screen for 1-tap access'
              : 'Add to your Home Screen for full-screen matchdays'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onInstallClick}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
        >
          Install
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
          aria-label="Dismiss install banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isStandalone: boolean;
  canNativePrompt: boolean;
  onTriggerNativeInstall: () => Promise<boolean>;
}

export function PwaInstallModal({
  isOpen,
  onClose,
  isIOS,
  isStandalone,
  canNativePrompt,
  onTriggerNativeInstall,
}: PwaInstallModalProps) {
  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const installed = await onTriggerNativeInstall();
    if (installed) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SquadPicksLogo variant="mark" size="md" />
            <div>
              <h2 className="text-base font-bold tracking-tight text-neutral-100">
                Install SquadPicks App
              </h2>
              <p className="text-xs text-neutral-400">
                Add to your Home Screen for a native app experience
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlights */}
        <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 flex flex-col gap-2 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Full-Screen Display:</strong> Runs like a native app without browser address bars.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>1-Tap Matchday Launch:</strong> Jump straight into your LMS &amp; Predictor picks from your Home Screen.
            </span>
          </div>
        </div>

        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>SquadPicks is already installed on your device!</span>
          </div>
        ) : canNativePrompt ? (
          <button
            type="button"
            onClick={handleNativeInstall}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install SquadPicks Now</span>
          </button>
        ) : isIOS ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              How to Install on iPhone / iPad (Safari)
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                  1
                </div>
                <div className="text-xs text-neutral-200 flex-1">
                  Tap the <strong>Share</strong> button{' '}
                  <Share className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5 -mt-0.5" /> at the bottom of Safari.
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                  2
                </div>
                <div className="text-xs text-neutral-200 flex-1">
                  Scroll down and tap{' '}
                  <strong>
                    Add to Home Screen{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5 -mt-0.5" />
                  </strong>
                  , then tap <strong>Add</strong>.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              How to Add to Home Screen
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
              Open your browser menu (<strong>⋮</strong> in Chrome or <strong>Share ⎋</strong> in Safari) and select{' '}
              <strong className="text-emerald-400">&ldquo;Install App&rdquo;</strong> or{' '}
              <strong className="text-emerald-400">&ldquo;Add to Home Screen&rdquo;</strong>.
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
