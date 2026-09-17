'use client';

import React, { useState } from 'react';
import { PlusCircle, Shield, Trophy, Heart, Calendar, User as UserIcon, X, Loader2, Sparkles, Target, Lock } from 'lucide-react';
import { createLeague, CreateLeagueResult } from '@/server/actions/leagues';
import { LeagueType } from '@/core/types/database';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUserName?: string;
  defaultUserEmail?: string;
  onGameCreated: (result: CreateLeagueResult) => void;
}

export function CreateGameModal({
  isOpen,
  onClose,
  defaultUserName = '',
  defaultUserEmail,
  onGameCreated,
}: CreateGameModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<LeagueType>('ALL_IN_ONE');
  const [startingGameweek, setStartingGameweek] = useState(5);
  const [startingLives, setStartingLives] = useState(1);
  const [matchesPerGameweek, setMatchesPerGameweek] = useState<number | 'ALL'>(1);
  const [allowDuplicatePredictions, setAllowDuplicatePredictions] = useState(false);
  const [exclusiveTeamPicks, setExclusiveTeamPicks] = useState(true);
  const [creatorDisplayName, setCreatorDisplayName] = useState(defaultUserName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter a league name');
      return;
    }
    if (!creatorDisplayName.trim()) {
      setErrorMsg('Please enter your host display name');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createLeague({
        name: name.trim(),
        type,
        startingGameweek,
        startingLives: type === 'PREDICTOR' ? 0 : startingLives,
        creatorDisplayName: creatorDisplayName.trim(),
        creatorEmail: defaultUserEmail,
        matchesPerGameweek,
        allowDuplicatePredictions,
        exclusiveTeamPicks,
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Failed to create game');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onGameCreated(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-neutral-100 flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Create New Game</h2>
              <p className="text-xs text-neutral-400">Set up a pool and invite your mates</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Game Type Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Game Format
            </label>
            
            {/* Featured: All-in-One */}
            <button
              type="button"
              onClick={() => setType('ALL_IN_ONE')}
              className={`p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3 transition ${
                type === 'ALL_IN_ONE'
                  ? 'bg-gradient-to-r from-emerald-500/15 to-amber-500/15 border-emerald-500/60 text-neutral-100 shadow-md'
                  : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-neutral-100">All-in-One Group</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      Recommended
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-tight mt-1">
                    Play <strong>Last Man Standing</strong> and <strong>Predictor</strong> together! One link for friends to compete in both survivor and points.
                  </div>
                </div>
              </div>
              {type === 'ALL_IN_ONE' && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1" />
              )}
            </button>

            {/* Individual Modes Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('LAST_MAN_STANDING')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition ${
                  type === 'LAST_MAN_STANDING'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                    : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  {type === 'LAST_MAN_STANDING' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs text-neutral-100">LMS Only</div>
                  <div className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                    Pure survivor tournament. Pick 1 winner per week.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('PREDICTOR')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-2 transition ${
                  type === 'PREDICTOR'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                    : 'bg-neutral-950/70 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  {type === 'PREDICTOR' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs text-neutral-100">Predictor Only</div>
                  <div className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                    Pure fantasy points league across all fixtures.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* League Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              League Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Pub Lads LMS, Work Football League"
              className="bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60 transition"
            />
          </div>

          {/* Your Display Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Your Display Name (Host) <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                required
                value={creatorDisplayName}
                onChange={(e) => setCreatorDisplayName(e.target.value)}
                placeholder="e.g. Jack D, Harry_07"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/60 transition"
              />
            </div>
          </div>

          {/* Mode-Specific Rules */}
          {type !== 'PREDICTOR' ? (
            <div className="flex flex-col gap-2 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    <span>LMS Lives</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStartingLives(1)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        startingLives === 1
                          ? 'bg-neutral-800 border-emerald-500 text-emerald-400'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      1 Life
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartingLives(2)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        startingLives === 2
                          ? 'bg-neutral-800 border-emerald-500 text-emerald-400'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      2 Lives
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Starts At</span>
                  </label>
                  <select
                    value={startingGameweek}
                    onChange={(e) => setStartingGameweek(Number(e.target.value))}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium text-neutral-200 focus:outline-none focus:border-emerald-500/60 transition"
                  >
                    <option value={5}>Gameweek 5 (Upcoming)</option>
                    <option value={6}>Gameweek 6</option>
                    <option value={7}>Gameweek 7</option>
                  </select>
                </div>
              </div>

              {/* LMS Team Exclusivity & Live Visibility */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>LMS Team Selection Rule</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExclusiveTeamPicks(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left flex flex-col gap-0.5 transition ${
                      exclusiveTeamPicks
                        ? 'bg-neutral-800 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Exclusive Picks
                    </span>
                    <span className="text-[10px] text-neutral-500 font-normal leading-tight">
                      Unique teams per group • Live visibility
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExclusiveTeamPicks(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left flex flex-col gap-0.5 transition ${
                      !exclusiveTeamPicks
                        ? 'bg-neutral-800 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-bold">Secret Picks</span>
                    <span className="text-[10px] text-neutral-500 font-normal leading-tight">
                      Duplicate teams allowed • Hidden until kickoff
                    </span>
                  </button>
                </div>
              </div>

              {type === 'ALL_IN_ONE' && (
                <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-xs text-neutral-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Includes <strong>Last Man Standing</strong> ({startingLives} {startingLives === 1 ? 'life' : 'lives'}) + weekly <strong>Predictor</strong> points (+3 exact, +1 outcome, +1 BTTS, +1 Over/Under).
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 text-xs text-neutral-400">
              Starts at <strong className="text-neutral-200">Gameweek 5</strong>. Points awarded for Exact Score (+3), Match Outcome (+1), BTTS (+1), and Over/Under (+1).
            </div>
          )}

          {/* Predictor Specific Settings (Applies to Predictor & All-in-One) */}
          {(type === 'PREDICTOR' || type === 'ALL_IN_ONE') && (
            <div className="flex flex-col gap-3 pt-2 border-t border-neutral-800/80">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Predictor Choices per Gameweek</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMatchesPerGameweek(1)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left flex flex-col gap-0.5 transition ${
                      matchesPerGameweek === 1
                        ? 'bg-neutral-800 border-amber-500/80 text-amber-400 shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-bold">1 Match (Featured)</span>
                    <span className="text-[10px] text-neutral-500 font-normal">Pick 1 key game per week</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchesPerGameweek('ALL')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left flex flex-col gap-0.5 transition ${
                      matchesPerGameweek === 'ALL'
                        ? 'bg-neutral-800 border-amber-500/80 text-amber-400 shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-bold">All 10 Matches</span>
                    <span className="text-[10px] text-neutral-500 font-normal">Predict every fixture</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Predictor Match Claim Rule</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllowDuplicatePredictions(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left flex flex-col gap-0.5 transition ${
                      !allowDuplicatePredictions
                        ? 'bg-neutral-800 border-amber-500/80 text-amber-400 shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Exclusive Matches
                    </span>
                    <span className="text-[10px] text-neutral-500 font-normal leading-tight">
                      Unique fixture per player • Live visibility
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllowDuplicatePredictions(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left flex flex-col gap-0.5 transition ${
                      allowDuplicatePredictions
                        ? 'bg-neutral-800 border-amber-500/80 text-amber-400 shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-bold">Open Picks</span>
                    <span className="text-[10px] text-neutral-500 font-normal leading-tight">
                      Multiple players can predict the same fixture
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-neutral-800/80">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Game...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Game & Get Invite Link</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
