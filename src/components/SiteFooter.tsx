'use client';

import React from 'react';
import Link from 'next/link';
import { SquadPicksLogo } from '@/components/SquadPicksLogo';
import { ShieldCheck, Mail, Heart, ExternalLink } from 'lucide-react';

export interface SiteFooterProps {
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
  onOpenRules?: (tab?: 'lms' | 'predictor' | 'navigation') => void;
  className?: string;
  hideTopBorder?: boolean;
}

export function SiteFooter({
  onOpenLegal,
  onOpenRules,
  className = '',
  hideTopBorder = false,
}: SiteFooterProps) {
  const handleLegalClick = (e: React.MouseEvent<HTMLAnchorElement>, tab: 'terms' | 'privacy') => {
    // If command/ctrl or middle click, allow opening in new tab naturally
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
      return;
    }
    if (onOpenLegal) {
      e.preventDefault();
      onOpenLegal(tab);
    }
  };

  return (
    <footer
      className={`bg-brand-950 text-neutral-400 text-xs ${
        hideTopBorder ? '' : 'border-t border-neutral-800/80'
      } px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-10 transition-colors ${className}`}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Top Tier: Brand, Tagline & Quick Links */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link href="/" className="shrink-0 transition-opacity hover:opacity-90">
              <SquadPicksLogo size="sm" variant="full" />
            </Link>
            <span className="hidden sm:inline text-neutral-700">|</span>
            <p className="text-xs text-neutral-400 leading-snug">
              The football games you play with mates. <span className="text-neutral-300 font-semibold">Zero spreadsheets.</span>
            </p>
          </div>

          {/* Navigation & Legal Links */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium">
            {onOpenRules && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenRules('lms')}
                  className="text-neutral-400 hover:text-emerald-400 transition cursor-pointer"
                >
                  How to Play
                </button>
                <span className="text-neutral-700">•</span>
              </>
            )}
            <Link
              href="/terms"
              onClick={(e) => handleLegalClick(e, 'terms')}
              className="text-neutral-400 hover:text-emerald-400 transition cursor-pointer"
            >
              Terms of Service
            </Link>
            <span className="text-neutral-700">•</span>
            <Link
              href="/privacy"
              onClick={(e) => handleLegalClick(e, 'privacy')}
              className="text-neutral-400 hover:text-emerald-400 transition cursor-pointer"
            >
              Privacy Policy
            </Link>
            <span className="text-neutral-700">•</span>
            <a
              href="mailto:support@squadpicks.co.uk"
              className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-emerald-400 transition"
              title="Email SquadPicks Support"
            >
              <Mail className="w-3.5 h-3.5 text-neutral-500" />
              <span>support@squadpicks.co.uk</span>
            </a>
          </div>
        </div>

        {/* Middle Tier: Responsible Free-to-Play Pill */}
        <div className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] leading-relaxed">
          <div className="flex items-center gap-2 text-neutral-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Free-to-Play Entertainment Only:</strong> SquadPicks is a social sports game for friendly group competition. We are not a gambling operator and facilitate zero real-money betting.
            </span>
          </div>
          <span className="shrink-0 text-emerald-400/90 font-mono text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            100% Free • No Wagering
          </span>
        </div>

        {/* Bottom Tier: Disclaimers & Copyright */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-[11px] text-neutral-500 border-t border-neutral-900">
          <p>
            © {new Date().getFullYear()} SquadPicks (<a href="https://www.squadpicks.co.uk" className="hover:text-neutral-400">www.squadpicks.co.uk</a>). All rights reserved.
          </p>
          <p className="font-mono text-[10px] text-neutral-600 flex items-center gap-1 flex-wrap">
            <span>Powered by Football-Data.org</span>
            <span>•</span>
            <span>Not affiliated with the Premier League</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
