'use client';

import React, { useState, useEffect } from 'react';
import { MatchLiveEvent } from '@/hooks/useMatchdayRealtime';
import { Zap, Trophy, Shield, X, Sparkles } from 'lucide-react';

interface MatchdayLiveNotifierProps {
  event: MatchLiveEvent | null;
  onDismiss: () => void;
}

export function MatchdayLiveNotifier({
  event,
  onDismiss,
}: MatchdayLiveNotifierProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (event) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 6000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [event, onDismiss]);

  if (!event || !visible) return null;

  const isGoal = event.type === 'GOAL';
  const isKickoff = event.type === 'KICKOFF';
  const isFullTime = event.type === 'FULL_TIME';

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div
        className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-xl flex flex-col gap-2.5 transition-all ${
          isGoal
            ? 'bg-neutral-900/95 border-emerald-500/50 shadow-emerald-950/50'
            : isKickoff
            ? 'bg-neutral-900/95 border-amber-500/50 shadow-amber-950/50'
            : 'bg-neutral-900/95 border-neutral-700/60 shadow-neutral-950/50'
        }`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                isGoal
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isKickoff
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              {isGoal ? '⚽' : isKickoff ? <Zap className="w-3.5 h-3.5 fill-current" /> : '🏁'}
            </span>
            <span
              className={`text-[11px] font-extrabold uppercase tracking-wider ${
                isGoal
                  ? 'text-emerald-400'
                  : isKickoff
                  ? 'text-amber-400'
                  : 'text-neutral-400'
              }`}
            >
              {isGoal ? 'Live Goal Alert' : isKickoff ? 'Matchday Kickoff' : 'Full Time Settlement'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                onDismiss();
              }}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 transition"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message body */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
              <span>{event.homeTeamName}</span>
              <span className="font-mono text-emerald-400 font-extrabold px-1 py-0.5 rounded bg-neutral-950/80 border border-neutral-800">
                {event.homeScore ?? 0} - {event.awayScore ?? 0}
              </span>
              <span>{event.awayTeamName}</span>
            </div>
            <p className="text-[11px] text-neutral-400">{event.message}</p>
          </div>
        </div>

        {/* Personal relevance badges */}
        {(event.isPersonalLms || event.isPersonalPredictor) && (
          <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/80 flex-wrap">
            {event.isPersonalLms && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                <Shield className="w-3 h-3" />
                <span>Your LMS Survivor Pick</span>
              </span>
            )}
            {event.isPersonalPredictor && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                <Trophy className="w-3 h-3" />
                <span>Your Predictor Match</span>
              </span>
            )}
          </div>
        )}

        {/* Auto-dismiss progress bar */}
        <div className="w-full bg-neutral-800/60 rounded-full h-0.5 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-400 to-amber-400 h-full w-full animate-[progress_6s_linear_forwards]" />
        </div>
      </div>
    </div>
  );
}
