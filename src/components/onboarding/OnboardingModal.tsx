'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Swords,
  Flame,
  Users,
  Trophy,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { SquadPicksLogo } from '@/components/SquadPicksLogo';

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRules?: () => void;
}

const STORAGE_KEY = 'gb_onboarding_completed_v1';

export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markOnboardingSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Ignore storage issues
  }
}

export function OnboardingModal({
  isOpen,
  onClose,
  onOpenRules,
}: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const slides = [
    {
      id: 'welcome',
      badge: 'Welcome to SquadPicks',
      title: 'The football games you play with mates.',
      subtitle: 'Zero spreadsheets. Instant live scoring. Total bragging rights.',
      icon: Sparkles,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
          <p>
            SquadPicks replaces messy WhatsApp chats and manual Excel spreadsheets with clean, automated Premier League tournament pools for your friends, family, and colleagues.
          </p>
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-left space-y-1">
              <span className="text-emerald-400 font-bold block text-xs">🛡️ Last Man Standing</span>
              <span className="text-neutral-400 text-[11px] block">Survive round-by-round picking 1 winning team each week.</span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-left space-y-1">
              <span className="text-amber-400 font-bold block text-xs">🎯 Match Predictor</span>
              <span className="text-neutral-400 text-[11px] block">Score points for exact scorelines, outcomes, and goal totals.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'lms',
      badge: 'Game Mode 1: Survival',
      title: 'Last Man Standing (LMS)',
      subtitle: 'Pick 1 winning team per week. Draw or lose, and you lose a life.',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 border-emerald-500/30',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
          <ul className="space-y-2 text-left">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Lives System:</strong> You start with 2 or 3 lives. If your picked team wins, you survive. If they lose or draw, you lose 1 life.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Burned Teams (No-Repeat):</strong> You cannot pick the same club twice in a tournament. Think ahead!</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Kickoff Lock:</strong> Picks lock when the match kicks off. The last player with lives remaining wins!</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'predictor',
      badge: 'Game Mode 2: Multi-Market',
      title: 'Match Predictor',
      subtitle: 'Score up to 6 points per fixture with scoreline & outcome forecasts.',
      icon: Swords,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <span>🎯 Exact Score</span>
              <strong className="text-amber-400 font-mono">+3 pts</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <span>🏆 Match Outcome</span>
              <strong className="text-emerald-400 font-mono">+1 pt</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <span>⚽ BTTS (Both Score)</span>
              <strong className="text-teal-400 font-mono">+1 pt</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <span>📊 Over/Under 2.5</span>
              <strong className="text-sky-400 font-mono">+1 pt</strong>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 text-left">
            Climb the group leaderboard week-after-week as cumulative points add up across the season!
          </p>
        </div>
      ),
    },
    {
      id: 'matchday',
      badge: 'Live Experience',
      title: 'Matchday Live Hub',
      subtitle: 'Real-time live scores, goal alerts & instant leaderboard swings.',
      icon: Flame,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/15 border-rose-500/30',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
          <p>
            When Premier League games kick off on Saturday and Sunday, SquadPicks transitions into a live matchday hub with real-time WebSocket sync.
          </p>
          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-left space-y-1.5 text-xs text-neutral-400">
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Instant Score Updates &amp; Settlement</span>
            </div>
            <p>
              Watch live goals affect group standings instantly. Settle scores without waiting for manual spreadsheet calculations.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'ready',
      badge: 'You Are All Set!',
      title: 'Playing with Mates & Sharing',
      subtitle: 'Invite your group in 10 seconds via WhatsApp.',
      icon: Trophy,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/15 border-amber-500/30',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
          <p>
            Create private groups, share your 5-letter invite code, or send 1-tap WhatsApp invitations. You can customize your player profile with official Premier League club crests in the Avatar Studio!
          </p>
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-left space-y-1">
            <span className="text-emerald-300 font-bold block text-xs">Need to review rules later?</span>
            <span className="text-neutral-400 text-[11px] block">
              You can reopen the official rules anytime via the <strong>&quot;Rules &amp; Guide&quot;</strong> button in the top header or user menu.
            </span>
          </div>
        </div>
      ),
    },
  ];

  const handleFinish = () => {
    markOnboardingSeen();
    onClose();
  };

  const handleOpenRulesDirect = () => {
    markOnboardingSeen();
    onClose();
    onOpenRules?.();
  };

  if (!isOpen) return null;

  const current = slides[currentSlide];
  const Icon = current.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 bg-neutral-900/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <SquadPicksLogo size="sm" variant="mark" />
            <span className="text-xs font-bold text-neutral-200 font-mono">
              Quick Guide ({currentSlide + 1}/{slides.length})
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="text-xs text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            Skip Tour
          </button>
        </div>

        {/* Slide Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
          {/* Badge & Icon */}
          <div className="flex flex-col items-center gap-2.5">
            <div className={`w-14 h-14 rounded-2xl ${current.iconBg} flex items-center justify-center ${current.iconColor} shadow-lg shadow-black/40`}>
              <Icon className="w-7 h-7" />
            </div>
            <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700 uppercase tracking-wide">
              {current.badge}
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h3 id="onboarding-title" className="text-lg sm:text-xl font-black text-neutral-100 tracking-tight">
              {current.title}
            </h3>
            <p className="text-xs text-neutral-400 max-w-sm">
              {current.subtitle}
            </p>
          </div>

          {/* Dynamic Slide Content */}
          <div className="w-full pt-1">
            {current.content}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-5 border-t border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between gap-3 shrink-0">
          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? 'w-6 bg-emerald-400' : 'w-2 bg-neutral-800 hover:bg-neutral-700'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentSlide > 0 && (
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => prev - 1)}
                className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {isLast ? (
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 cursor-pointer"
              >
                <span>Let&apos;s Play!</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => prev + 1)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
