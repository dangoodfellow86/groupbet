'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Swords,
  Trophy,
  Zap,
  Plus,
  KeyRound,
  BookOpen,
  ChevronDown,
  Sparkles,
  HelpCircle,
  Share2,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { InstagramIcon } from '@/components/icons/InstagramIcon';

export interface LandingSeoSectionProps {
  onCreateGame: () => void;
  onJoinCode: () => void;
  onOpenRules?: () => void;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'what-is-lms',
    question: 'What is Football Last Man Standing (LMS)?',
    answer:
      'Last Man Standing (LMS) is the classic football survivor pool. Each round, you pick 1 team to win their fixture. If your team wins, you safely advance. If your team draws or loses, you lose a life. The catch is the "burned team" rule: you can only pick each club once all tournament! The last surviving player wins the pool.',
  },
  {
    id: 'burned-team-rule',
    question: 'How does the Burned Team rule work in LMS?',
    answer:
      'Once you pick a team (e.g. Manchester City in Gameweek 1), you cannot select that same club again for the remainder of the tournament cycle. This stops players from picking the easiest favourite every week and introduces deep tactical planning.',
  },
  {
    id: 'postponed-match',
    question: 'What happens if a match is postponed or cancelled?',
    answer:
      'If a match is postponed before kickoff, players with that pick advance safely without losing a life. The selection is treated as void, and the team is NOT burned, meaning it remains eligible for future gameweeks. Alternatively, players can amend their pick before the gameweek deadline.',
  },
  {
    id: 'predictor-scoring',
    question: 'How does the Weekly Match Predictor scoring work?',
    answer:
      'Players predict the final scoreline for selected matches each gameweek. You earn +3 points for an exact correct scoreline, +1 point for predicting the correct match outcome (Home/Draw/Away), +1 bonus point for Both Teams to Score (BTTS), and +1 bonus point for Over/Under 2.5 total goals (up to 6 points per fixture).',
  },
  {
    id: 'is-it-free',
    question: 'Is SquadPicks free to play?',
    answer:
      'Yes, SquadPicks is 100% free to play. It is built for friend groups, colleagues, football clubs, and family leagues to enjoy friendly competition with zero real-money gambling hosted.',
  },
  {
    id: 'pwa-install',
    question: 'Do my mates need to download an app from the App Store or Google Play?',
    answer:
      'No download is required! SquadPicks is a Progressive Web App (PWA). Anyone with an iPhone, Android, tablet, or desktop can play immediately in their mobile browser, or tap "Add to Home Screen" to install it as a fast, native-feeling app.',
  },
];

export function LandingSeoSection({
  onCreateGame,
  onJoinCode,
  onOpenRules,
}: LandingSeoSectionProps) {
  const [openFaq, setOpenFaq] = useState<string | null>('what-is-lms');

  const toggleFaq = (id: string) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mb-10 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900/95 to-emerald-950/40 border border-emerald-500/20 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Premier League &amp; EFL Championship
              </span>
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Free with friends
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-100 leading-tight">
              The Free Football Last Man Standing &amp; Match Predictor for Your Group Chat
            </h1>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xl">
              Ditch messy WhatsApp spreadsheets and manual score-checking. Create a private pool in
              10 seconds, share the invite link on WhatsApp, and enjoy live automated scoring with
              your mates all season.
            </p>

            <div className="pt-2 flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={onCreateGame}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-xl shadow-emerald-950/60 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Free Game</span>
              </button>
              <button
                type="button"
                onClick={onJoinCode}
                className="px-4 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-semibold text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-neutral-400" />
                <span>Join with Code</span>
              </button>
              <Link
                href="/rules"
                onClick={(e) => {
                  if (onOpenRules && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault();
                    onOpenRules();
                  }
                }}
                className="px-4 py-3 rounded-2xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-medium text-xs sm:text-sm transition flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Rules &amp; How to Play</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* LMS Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-neutral-100">Last Man Standing (LMS)</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Pick 1 winning team per round. Win and survive, draw or lose and spend a life. The
            tactical <strong className="text-neutral-200">Burned Team</strong> rule means each club can
            only be picked once per season.
          </p>
        </div>

        {/* Predictor Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Swords className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-neutral-100">Match Predictor League</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Predict weekly scorelines. Earn <strong className="text-neutral-200">+3 pts</strong> for
            exact scores, <strong className="text-neutral-200">+1 pt</strong> for match outcomes, plus
            BTTS and Over/Under 2.5 goal bonuses.
          </p>
        </div>

        {/* 44 Clubs Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Trophy className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-neutral-100">PL &amp; Championship</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Play with 20 Premier League clubs, 24 Championship clubs, or combine both in an epic
            44-club All-in-One survivor pool with midweek matches.
          </p>
        </div>

        {/* Zero Spreadsheets Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Zap className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-neutral-100">Zero Spreadsheets</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Live matchday scores settle picks automatically. Locked picks at kickoff prevent cheating,
            and 1-tap WhatsApp buttons make running leagues effortless.
          </p>
        </div>
      </div>

      {/* Crawlable FAQ Accordion Section */}
      <section id="faq" className="p-6 sm:p-8 rounded-3xl bg-neutral-900/40 border border-neutral-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg sm:text-xl font-bold text-neutral-100">
              Frequently Asked Questions
            </h2>
          </div>
          <Link
            href="/rules"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition flex items-center gap-1"
          >
            <span>View complete rule book</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-neutral-800/80 bg-neutral-950/60 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-neutral-100 hover:text-emerald-400 transition cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-neutral-300 leading-relaxed border-t border-neutral-800/50 pt-3 animate-in fade-in duration-150">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Instagram Community Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-pink-950/20 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px] shrink-0 shadow-lg shadow-rose-950/50">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center text-pink-400">
              <InstagramIcon className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-neutral-100">
                Follow SquadPicks on Instagram
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                @squad.picks
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Weekly Premier League banker picks, Last Man Standing heartbreak reels &amp; group chat banter.
            </p>
          </div>
        </div>

        <a
          href="https://www.instagram.com/squad.picks/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-neutral-200 hover:text-white transition flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-sm"
        >
          <span>Watch Reels</span>
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </div>
  );
}