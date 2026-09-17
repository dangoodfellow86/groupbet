'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Trophy, Shield, Plus, Share2, Users, Check, KeyRound } from 'lucide-react';
import { UserLeagueSummary } from '@/server/actions/leagues';

interface LeagueSwitcherProps {
  leagues: UserLeagueSummary[];
  activeLeague: UserLeagueSummary | null;
  onSelectLeague: (leagueId: string) => void;
  onCreateGameClick: () => void;
  onShareClick: () => void;
  onJoinCodeClick: () => void;
}

export function LeagueSwitcher({
  leagues,
  activeLeague,
  onSelectLeague,
  onCreateGameClick,
  onShareClick,
  onJoinCodeClick,
}: LeagueSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 text-xs font-semibold text-neutral-100 transition shadow-sm"
      >
        <div className="w-5 h-5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          {activeLeague?.type === 'PREDICTOR' ? (
            <Trophy className="w-3 h-3 text-amber-400" />
          ) : activeLeague?.type === 'ALL_IN_ONE' ? (
            <Trophy className="w-3 h-3 text-emerald-400" />
          ) : (
            <Shield className="w-3 h-3 text-emerald-400" />
          )}
        </div>

        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="truncate max-w-[120px] sm:max-w-[160px]">
              {activeLeague ? activeLeague.name : 'No Active Game'}
            </span>
            {activeLeague && (
              <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-neutral-800 text-neutral-400">
                {activeLeague.type === 'ALL_IN_ONE' ? 'ALL-IN-ONE' : activeLeague.type === 'LAST_MAN_STANDING' ? 'LMS' : 'PRED'}
              </span>
            )}
          </div>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-neutral-900 border border-neutral-800 p-2 shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Your Games & Leagues
          </div>

          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
            {leagues.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-neutral-500">
                You haven&apos;t joined or created any games yet.
              </div>
            ) : (
              leagues.map((league) => {
                const isActive = activeLeague?.id === league.id;
                const isAllInOne = league.type === 'ALL_IN_ONE';
                const isLms = league.type === 'LAST_MAN_STANDING';

                return (
                  <button
                    key={league.id}
                    type="button"
                    onClick={() => {
                      onSelectLeague(league.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                      isActive
                        ? 'bg-neutral-800 text-neutral-100 border border-neutral-700/60'
                        : 'hover:bg-neutral-800/50 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-6 h-6 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                        {isAllInOne ? (
                          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isLms ? (
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{league.name}</div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1.5">
                          <span>{isAllInOne ? 'LMS + Pred' : isLms ? 'LMS' : 'Predictor'}</span>
                          <span>•</span>
                          {isAllInOne ? (
                            <span className="text-emerald-400">
                              {league.lives_remaining ?? 1}L • {league.points ?? 0}pts
                            </span>
                          ) : isLms ? (
                            <span className="text-emerald-400">
                              {league.lives_remaining ?? 1} {(league.lives_remaining ?? 1) === 1 ? 'Life' : 'Lives'}
                            </span>
                          ) : (
                            <span className="text-amber-400">{league.points ?? 0} pts</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Action Row */}
          <div className="mt-2 pt-2 border-t border-neutral-800 flex flex-col gap-1">
            {activeLeague && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onShareClick();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Invite Friends to this Game</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateGameClick();
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create New Game</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onJoinCodeClick();
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Join with Code</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
