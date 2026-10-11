import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Scale, ShieldCheck, Printer } from 'lucide-react';
import { SquadPicksLogo } from '@/components/SquadPicksLogo';
import { LegalContent } from '@/components/legal/LegalContent';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Terms of Service | SquadPicks',
  description:
    'SquadPicks Terms of Service. Learn about our rules, free-to-play social entertainment platform, pick deadlines, and tournament policies.',
  openGraph: {
    title: 'Terms of Service | SquadPicks',
    description: 'SquadPicks Terms of Service and rules for social Premier League games.',
    url: 'https://www.squadpicks.co.uk/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-950 text-neutral-100 flex flex-col selection:bg-pitch selection:text-brand-950">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-800/80 bg-brand-950/90 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:opacity-90 transition">
              <SquadPicksLogo size="sm" variant="full" />
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/privacy"
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 font-semibold transition hidden sm:inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy Policy</span>
            </Link>

            <Link
              href="/"
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Game</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="p-6 sm:p-10 rounded-3xl bg-neutral-900/60 border border-neutral-800/80 shadow-2xl backdrop-blur-sm space-y-8">
          <div className="border-b border-neutral-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wide">
                  Official Terms
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  Effective: October 2026
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight">
                Terms of Service
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Rules, platform disclaimer, and user terms for SquadPicks (www.squadpicks.co.uk).
              </p>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              <Link
                href="/privacy"
                className="px-3 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-800 text-xs text-neutral-300 font-medium transition sm:hidden flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Privacy</span>
              </Link>
            </div>
          </div>

          <LegalContent section="terms" />
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
