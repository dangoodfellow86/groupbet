'use client';

import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, Check } from 'lucide-react';

const COOKIE_NOTICE_STORAGE_KEY = 'sp_essential_cookie_notice_ack_v1';

interface CookieNoticeBannerProps {
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
}

export function CookieNoticeBanner({ onOpenLegal }: CookieNoticeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const acknowledged = localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY);
        if (!acknowledged) {
          setIsVisible(true);
        }
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  const handleAcknowledge = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, '1');
      } catch {
        // Ignore storage errors
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="p-3.5 rounded-2xl bg-neutral-900/95 border border-neutral-800 shadow-2xl backdrop-blur-md text-xs text-neutral-300 flex flex-col gap-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Cookie className="w-4 h-4" />
          </div>
          <div className="leading-relaxed text-[11px] text-neutral-300">
            <div className="font-bold text-neutral-100 text-xs flex items-center gap-1.5 mb-0.5">
              <span>Essential Cookies &amp; Free-to-Play Notice</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            SquadPicks uses strictly essential cookies to keep you signed in (zero third-party ad trackers). SquadPicks is a{' '}
            <strong className="text-emerald-400">100% free-to-play</strong> social game with no real-money gambling.
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/80">
          <div className="flex items-center gap-2.5 text-[11px]">
            <button
              type="button"
              onClick={() => onOpenLegal ? onOpenLegal('privacy') : window.open('/privacy', '_blank')}
              className="text-neutral-400 hover:text-emerald-400 underline underline-offset-2 transition cursor-pointer"
            >
              Privacy &amp; Cookies
            </button>
            <span className="text-neutral-700">•</span>
            <button
              type="button"
              onClick={() => onOpenLegal ? onOpenLegal('terms') : window.open('/terms', '_blank')}
              className="text-neutral-400 hover:text-emerald-400 underline underline-offset-2 transition cursor-pointer"
            >
              Terms
            </button>
          </div>

          <button
            type="button"
            onClick={handleAcknowledge}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-950/50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Got it</span>
          </button>
        </div>
      </div>
    </div>
  );
}
