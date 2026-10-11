import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Scale, ShieldCheck } from 'lucide-react';
import { SquadPicksLogo } from '@/components/SquadPicksLogo';
import { LegalContent } from '@/components/legal/LegalContent';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy | SquadPicks',
  description:
    'SquadPicks Privacy Policy. Understand how we protect your information, our essential session cookies, and your rights under UK GDPR and Data Protection Act 2018.',
  openGraph: {
    title: 'Privacy Policy | SquadPicks',
    description: 'SquadPicks Privacy Policy and UK GDPR compliance documentation.',
    url: 'https://www.squadpicks.co.uk/privacy',
  },
};

export default function PrivacyPage() {
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
              href="/terms"
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 font-semibold transition hidden sm:inline-flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Terms of Service</span>
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
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 uppercase tracking-wide">
                  Privacy &amp; Data Protection
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  Effective: October 2026
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-100 tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                How SquadPicks (www.squadpicks.co.uk) protects your personal information under the UK GDPR.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:self-center">
              <Link
                href="/terms"
                className="px-3 py-2 rounded-xl bg-neutral-800/90 hover:bg-neutral-800 text-xs text-neutral-300 font-medium transition sm:hidden flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                <span>Terms</span>
              </Link>
            </div>
          </div>

          <LegalContent section="privacy" />
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
