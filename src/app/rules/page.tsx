import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Swords,
  Flame,
  Clock,
  Sparkles,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Users,
  Compass,
} from 'lucide-react';
import { SquadPicksLogo } from '@/components/SquadPicksLogo';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Football Last Man Standing Rules & Match Predictor Scoring | SquadPicks',
  description:
    'Official rules for Football Last Man Standing (LMS) and Match Predictor. Learn how the burned team rule works, lives, postponed matches, tiebreakers, and EFL Championship formats.',
  keywords: [
    'last man standing football rules',
    'last man standing rules',
    'how to play last man standing',
    'last man standing postponed match',
    'burned team rule last man standing',
    'football predictor rules',
    'football prediction scoring points',
    'premier league last man standing rules',
    'efl championship survivor rules',
    'squadpicks rules',
  ],
  alternates: {
    canonical: 'https://www.squadpicks.co.uk/rules',
  },
  openGraph: {
    title: 'Football Last Man Standing Rules & Match Predictor Scoring | SquadPicks',
    description:
      'Official rules for Football Last Man Standing (LMS) and Match Predictor. Learn how the burned team rule works, lives, postponed matches, tiebreakers, and EFL Championship formats.',
    url: 'https://www.squadpicks.co.uk/rules',
    siteName: 'SquadPicks',
    locale: 'en_GB',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Football Last Man Standing Rules & Match Predictor Scoring | SquadPicks',
    description:
      'Complete guide to Last Man Standing and Weekly Predictor football pool rules. Zero spreadsheets.',
  },
};

export default function RulesPage() {
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
              href="/#faq"
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 font-semibold transition hidden sm:inline-flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Common FAQs</span>
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

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hero Section */}
        <div className="p-6 sm:p-10 rounded-3xl bg-neutral-900/60 border border-neutral-800/80 shadow-2xl backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
              Official Guidelines
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              Updated for 2026/27 Football Season
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-100 tracking-tight leading-tight">
            How to Play &amp; Game Rules
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-3xl">
            Everything you need to know about playing{' '}
            <strong className="text-emerald-400 font-semibold">Last Man Standing (LMS)</strong>,{' '}
            <strong className="text-amber-400 font-semibold">Weekly Match Predictors</strong>, and{' '}
            <strong className="text-sky-400 font-semibold">All-in-One 44-Club Leagues</strong> on
            SquadPicks. Fair play, live automated scoring, and zero spreadsheets.
          </p>

          {/* Quick Jump Bar */}
          <div className="pt-2 flex flex-wrap gap-2 text-xs">
            <a
              href="#lms-rules"
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Last Man Standing</span>
            </a>
            <a
              href="#predictor-rules"
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition flex items-center gap-1.5"
            >
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Match Predictor</span>
            </a>
            <a
              href="#burned-team-rule"
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Burned Team Rule</span>
            </a>
            <a
              href="#postponed-matches"
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Postponed Matches</span>
            </a>
          </div>
        </div>

        {/* SECTION 1: LAST MAN STANDING (LMS) */}
        <section id="lms-rules" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-100">
                1. Last Man Standing (LMS) Rules
              </h2>
              <p className="text-xs text-neutral-400">
                The ultimate football survivor game. Survive round-by-round until one champion remains.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rule 1 */}
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2.5">
              <div className="flex items-center gap-2 text-neutral-100 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">
                  1
                </span>
                <h3>One Winning Team Per Gameweek</h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Each gameweek round, you must select exactly one football team that you predict will{' '}
                <strong className="text-emerald-400">win</strong> their upcoming match. If your team
                wins, you safely advance to the next round with all lives intact.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2.5">
              <div className="flex items-center gap-2 text-neutral-100 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">
                  2
                </span>
                <h3>Lives &amp; Elimination</h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Tournaments start with 1, 2, or 3 lives (set by the league commissioner). If your
                selected team <strong className="text-rose-400">draws or loses</strong>, or if you
                fail to submit a pick before kickoff, you lose 1 life. When a player has 0 lives
                remaining, they are eliminated.
              </p>
            </div>

            {/* Rule 3 */}
            <div
              id="burned-team-rule"
              className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2.5 md:col-span-2 scroll-mt-24"
            >
              <div className="flex items-center gap-2 text-neutral-100 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-mono">
                  3
                </span>
                <h3>The Burned Teams Rule (No Repeats)</h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                This is the signature rule of football Last Man Standing:{' '}
                <strong className="text-neutral-100">
                  You cannot pick the same club twice within the same tournament cycle.
                </strong>{' '}
                For example, if you pick Arsenal in Gameweek 1, Arsenal becomes &quot;burned&quot; for
                the rest of the tournament. Even if Arsenal plays newly promoted opposition at home in
                Gameweek 10, they are unavailable to you. Choosing when to save elite clubs is the key
                tactical challenge.
              </p>
            </div>

            {/* Rule 4 */}
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2.5">
              <div className="flex items-center gap-2 text-neutral-100 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">
                  4
                </span>
                <h3>Kickoff Deadlines</h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                Picks lock strictly at the scheduled kickoff of each specific fixture. You can change
                your pick at any time right up until the match referee blows the whistle. Once kickoff
                happens, picks are locked and viewable by your entire league.
              </p>
            </div>

            {/* Rule 5 */}
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2.5">
              <div className="flex items-center gap-2 text-neutral-100 font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">
                  5
                </span>
                <h3>Exclusive Claims Mode</h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                When enabled by the league commissioner, each club can only be selected by{' '}
                <strong className="text-neutral-100">one player per gameweek</strong>. The first
                player in your league to lock in Manchester City claims them for that round, forcing
                other members to pick alternative clubs!
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: MATCH PREDICTOR SCORING */}
        <section id="predictor-rules" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-100">
                2. Weekly Match Predictor Scoring System
              </h2>
              <p className="text-xs text-neutral-400">
                Predict weekly scorelines, build cumulative points, and climb your league leaderboard.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-neutral-100">
                Official Points Distribution (Up to 6 Points per Fixture)
              </h3>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-mono">
                Standard Scoring
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <strong className="text-neutral-100 block font-semibold">Exact Scoreline</strong>
                  <p className="text-xs text-neutral-400">
                    You predict 2-1 and the official full-time score is 2-1.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-sm shrink-0">
                  +3 pts
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <strong className="text-neutral-100 block font-semibold">Correct Match Outcome</strong>
                  <p className="text-xs text-neutral-400">
                    Correct Home Win, Draw, or Away Win (if exact score is missed).
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-sm shrink-0">
                  +1 pt
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <strong className="text-neutral-100 block font-semibold">Both Teams to Score (BTTS)</strong>
                  <p className="text-xs text-neutral-400">
                    Bonus point for correctly forecasting whether both teams score.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-mono font-bold text-sm shrink-0">
                  +1 pt
                </span>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <strong className="text-neutral-100 block font-semibold">Over / Under 2.5 Goals</strong>
                  <p className="text-xs text-neutral-400">
                    Bonus point for forecasting total match goals (3+ or 2 and under).
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-mono font-bold text-sm shrink-0">
                  +1 pt
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-400 space-y-1">
              <strong className="text-neutral-200 block font-medium">Leaderboard Tiebreaker Order:</strong>
              <ol className="list-decimal list-inside space-y-0.5 text-neutral-400">
                <li>Total Cumulative Points</li>
                <li>Highest number of Exact Scorelines nailed (+3s)</li>
                <li>Highest number of Correct Outcomes picked (+1s)</li>
              </ol>
            </div>
          </div>
        </section>

        {/* SECTION 3: 44-CLUB FORMAT */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-100">
                3. Leagues Supported: Premier League, Championship &amp; 44-Club
              </h2>
              <p className="text-xs text-neutral-400">
                Play exclusively in the top flight, test your knowledge in the Championship, or run a mega-league.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
              <span className="text-2xl">🦁</span>
              <h3 className="font-bold text-neutral-100">Premier League (20 Clubs)</h3>
              <p className="text-neutral-400">
                The classic format. Pick across all 380 matches from August through May.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
              <span className="text-2xl">🏆</span>
              <h3 className="font-bold text-neutral-100">EFL Championship (24 Clubs)</h3>
              <p className="text-neutral-400">
                The most unpredictable league in world football. 46 rounds with Tuesday/Wednesday night matches.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2">
              <span className="text-2xl">⚡</span>
              <h3 className="font-bold text-neutral-100">All-in-One Pool (44 Clubs)</h3>
              <p className="text-neutral-400">
                Pick from both the Premier League and Championship in a single combined survivor pool!
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4: POSTPONED MATCHES */}
        <section id="postponed-matches" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-100">
                4. Postponed, Void &amp; Abandoned Matches Policy
              </h2>
              <p className="text-xs text-neutral-400">
                What happens when weather, cup clashes, or unforeseen events cause a fixture to be called off?
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed">
            <div className="space-y-2">
              <h3 className="font-bold text-neutral-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Last Man Standing Postponement Rule</span>
              </h3>
              <p>
                If a fixture is postponed or cancelled before kickoff, players who selected that club{' '}
                <strong className="text-emerald-400">do not lose a life</strong>. Their selection is
                treated as a void match and they safely advance to the next round. Furthermore, that
                team is <strong className="text-neutral-100">not burned</strong> and remains eligible
                for selection in future gameweeks. Alternatively, if time permits before the gameweek
                deadline, players may freely amend their selection to another active fixture.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <h3 className="font-bold text-neutral-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>Predictor Postponement Rule</span>
              </h3>
              <p>
                If a match in a Predictor round is postponed, that match is marked as postponed in the
                live hub. Any points for that match remain void and the weekly leaderboard is settled
                based on all remaining completed fixtures.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5: CALL TO ACTION */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-amber-950/30 border border-emerald-500/20 text-center space-y-4">
          <h2 className="text-xl sm:text-3xl font-extrabold text-neutral-100">
            Ready to Start Your League?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
            Create a private pool in under 30 seconds. Share a WhatsApp invite link with your mates
            and enjoy live automated scoring all season.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-950/50"
            >
              Play SquadPicks Now
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}