'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  ShieldCheck,
  Swords,
  Trophy,
  Flame,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  Share2,
} from 'lucide-react';
import { SquadPicksLogo } from '@/components/SquadPicksLogo';

export type RulesTab = 'lms' | 'predictor' | 'navigation';

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: RulesTab;
}

export function RulesModal({
  isOpen,
  onClose,
  initialTab = 'lms',
}: RulesModalProps) {
  const [tab, setTab] = useState<RulesTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="rules-modal-title" className="text-sm sm:text-base font-bold text-neutral-100 flex items-center gap-2">
                <span>How to Play &amp; Game Rules</span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Official SquadPicks guidelines, points scoring &amp; app features
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-auto self-end">
            {/* Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setTab('lms')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  tab === 'lms'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Last Man Standing</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('predictor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  tab === 'predictor'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>Match Predictor</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('navigation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer hidden md:flex ${
                  tab === 'navigation'
                    ? 'bg-neutral-800 text-neutral-100'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                <span>Navigation</span>
              </button>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
              title="Close rules"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-sm text-neutral-300 leading-relaxed overscroll-contain">
          {tab === 'lms' && (
            <div className="space-y-6">
              {/* LMS Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-neutral-900/40 border border-emerald-500/20 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-neutral-100 text-base">Last Man Standing (LMS)</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Survive round-by-round. Pick 1 winning Premier League team each gameweek. Draw or lose, and you lose a life!
                  </p>
                </div>
              </div>

              {/* Core Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Rule 1: The Pick */}
                <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-neutral-100 font-bold text-sm">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">1</span>
                    <h4>1 Team Per Gameweek</h4>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Each round, select exactly 1 team that you believe will win their Premier League fixture. If they win, you advance to the next round intact.
                  </p>
                </div>

                {/* Rule 2: Lives System */}
                <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-neutral-100 font-bold text-sm">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">2</span>
                    <h4>Lives &amp; Elimination</h4>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Tournaments start with 2 or 3 lives (configured by host). If your picked team loses or draws, you lose 1 life. When all lives are spent, you are eliminated!
                  </p>
                </div>

                {/* Rule 3: Burned Teams */}
                <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-neutral-100 font-bold text-sm">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">3</span>
                    <h4>The Burned Teams Rule (No Repeats)</h4>
                  </div>
                  <p className="text-xs text-neutral-400">
                    You cannot select the same Premier League club twice in the same tournament cycle. If you picked Arsenal in Gameweek 5, you must select someone else in Gameweek 6!
                  </p>
                </div>

                {/* Rule 4: Kickoff Deadlines */}
                <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-2">
                  <div className="flex items-center gap-2 text-neutral-100 font-bold text-sm">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">4</span>
                    <h4>Strict Kickoff Deadlines</h4>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Selections lock strictly when that specific match kicks off. You can edit or change your pick up until the referee blows the whistle. Missing a gameweek results in losing 1 life.
                  </p>
                </div>
              </div>

              {/* Special League Settings */}
              <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-2.5">
                <div className="flex items-center gap-2 text-neutral-200 font-bold text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Commissioner Options &amp; Game Variations</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-400">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
                    <strong className="text-neutral-200 block mb-1">Exclusive Team Claims</strong>
                    When toggled ON by the host, each Premier League club can only be picked by ONE player per gameweek. First player to lock in Arsenal gets them!
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
                    <strong className="text-neutral-200 block mb-1">Round 2 Tournament Resets</strong>
                    When a winner emerges or all players are knocked out, the Commissioner can trigger a Round 2 reset with fresh lives while preserving all-time trophies.
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'predictor' && (
            <div className="space-y-6">
              {/* Predictor Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-neutral-900/40 border border-amber-500/20 flex items-start gap-3">
                <Swords className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-neutral-100 text-base">Match Predictor Scoring System</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Score cumulative points across Premier League fixtures with multi-market predictions!
                  </p>
                </div>
              </div>

              {/* Scoring Table */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <h4 className="font-bold text-neutral-100 text-sm flex items-center justify-between">
                  <span>Points Breakdown per Fixture</span>
                  <span className="text-xs font-mono text-amber-400 font-normal">Max: 6 Pts / Match</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <strong className="text-neutral-100 block">Exact Final Score</strong>
                      <span className="text-[11px] text-neutral-400">e.g. Predicted 2-1, final score is 2-1</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-sm">
                      +3 pts
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <strong className="text-neutral-100 block">Correct Outcome</strong>
                      <span className="text-[11px] text-neutral-400">Home Win, Draw, or Away Win</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-sm">
                      +1 pt
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <strong className="text-neutral-100 block">Both Teams to Score (BTTS)</strong>
                      <span className="text-[11px] text-neutral-400">Predicted YES / NO correctly</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-mono font-bold text-sm">
                      +1 pt
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div>
                      <strong className="text-neutral-100 block">Over / Under 2.5 Goals</strong>
                      <span className="text-[11px] text-neutral-400">3+ total match goals or 2 and under</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-mono font-bold text-sm">
                      +1 pt
                    </span>
                  </div>
                </div>
              </div>

              {/* Deadlines & Tiebreakers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-neutral-400">
                <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-neutral-200 font-bold">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Live Settlement &amp; Deadlines</span>
                  </div>
                  <p>
                    Predictions lock at match kickoff. Points are calculated in real time as goals occur and finalized when the final whistle sounds.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-neutral-200 font-bold">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Leaderboard Tiebreakers</span>
                  </div>
                  <p>
                    Rankings are sorted by: 1) Total Cumulative Points, 2) Number of Exact Scores nailed, 3) Correct Outcomes picked.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === 'navigation' && (
            <div className="space-y-6">
              {/* Navigation Banner */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-neutral-100 text-base">Navigating SquadPicks</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Key features, live matchday hub, WhatsApp group sharing, and trophies.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-neutral-100 font-bold">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <span>Matchday Live Hub</span>
                  </div>
                  <p className="text-neutral-400">
                    Track live Premier League scores, minute-by-minute updates, and realtime leaderboard swings as goals hit the back of the net.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-neutral-100 font-bold">
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp Group Sharing</span>
                  </div>
                  <p className="text-neutral-400">
                    Use 1-tap WhatsApp buttons to send group invites, gameweek deadline reminders, and weekly leaderboard bragging rights.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-neutral-100 font-bold">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Trophy Cabinet &amp; Profile</span>
                  </div>
                  <p className="text-neutral-400">
                    Unlock badges like *Iron Survivor* (3 rounds), *Dead-Eye Predictor* (exact scores), and customize your avatar with Premier League club crests.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-neutral-100 font-bold">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Commissioner Tools</span>
                  </div>
                  <p className="text-neutral-400">
                    League creators can edit pool names, remove inactive members, configure exclusive picks, and start Round 2 resets.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-900/40 flex items-center justify-between gap-3 shrink-0 text-xs">
          <span className="text-[11px] text-neutral-500 font-mono">
            SquadPicks • Zero Spreadsheets
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer shadow-sm"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
