'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useGameweekFixtures } from '@/hooks/useFootballData';
import { useQueryClient } from '@tanstack/react-query';
import {
  simulateFixtureLive,
  simulateFixtureFinished,
  resetFixture,
  simulateEntireGameweek,
  resetEntireGameweek,
} from '@/server/actions/simulator';
import {
  Zap,
  X,
  Radio,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Play,
  Flame,
} from 'lucide-react';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGameweek?: number;
}

export function SimulatorModal({
  isOpen,
  onClose,
  defaultGameweek = 5,
}: SimulatorModalProps) {
  const queryClient = useQueryClient();
  const [gameweek, setGameweek] = useState<number>(defaultGameweek);
  const [isPending, startTransition] = useTransition();
  const [activeFixtureId, setActiveFixtureId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Local state for scores being edited per fixture: { [fixtureId]: { home: number, away: number } }
  const [editedScores, setEditedScores] = useState<
    Record<string, { home: number; away: number }>
  >({});

  const { data, isLoading, refetch } = useGameweekFixtures(gameweek);
  const fixtures = data?.fixtures || [];

  // Initialize or synchronize local score inputs when fixtures load
  useEffect(() => {
    if (fixtures.length > 0) {
      setEditedScores((prev) => {
        const next = { ...prev };
        fixtures.forEach((f) => {
          if (!next[f.id]) {
            next[f.id] = {
              home: f.home_score ?? 1,
              away: f.away_score ?? 0,
            };
          }
        });
        return next;
      });
    }
  }, [fixtures]);

  // Handle escape key
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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['fixtures'] });
    queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
    queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['gameweek-predictions'] });
    queryClient.invalidateQueries({ queryKey: ['user-session'] });
  };

  const handleScoreChange = (
    fixtureId: string,
    team: 'home' | 'away',
    delta: number
  ) => {
    setEditedScores((prev) => {
      const current = prev[fixtureId] || { home: 1, away: 0 };
      const nextVal = Math.max(0, current[team] + delta);
      return {
        ...prev,
        [fixtureId]: {
          ...current,
          [team]: nextVal,
        },
      };
    });
  };

  const handleSetPreset = (fixtureId: string, home: number, away: number) => {
    setEditedScores((prev) => ({
      ...prev,
      [fixtureId]: { home, away },
    }));
  };

  const handleSimulateLive = (fixtureId: string) => {
    setActiveFixtureId(fixtureId);
    setStatusMessage(null);
    const scores = editedScores[fixtureId] || { home: 1, away: 0 };

    startTransition(async () => {
      const res = await simulateFixtureLive({
        fixtureId,
        homeScore: scores.home,
        awayScore: scores.away,
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        invalidateAll();
        refetch();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
      setActiveFixtureId(null);
    });
  };

  const handleSimulateFinished = (fixtureId: string) => {
    setActiveFixtureId(fixtureId);
    setStatusMessage(null);
    const scores = editedScores[fixtureId] || { home: 2, away: 1 };

    startTransition(async () => {
      const res = await simulateFixtureFinished({
        fixtureId,
        homeScore: scores.home,
        awayScore: scores.away,
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        invalidateAll();
        refetch();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
      setActiveFixtureId(null);
    });
  };

  const handleResetFixture = (fixtureId: string) => {
    setActiveFixtureId(fixtureId);
    setStatusMessage(null);

    startTransition(async () => {
      const res = await resetFixture(fixtureId);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        invalidateAll();
        refetch();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
      setActiveFixtureId(null);
    });
  };

  const handleSimulateAllGameweek = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await simulateEntireGameweek(gameweek);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        invalidateAll();
        refetch();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    });
  };

  const handleResetAllGameweek = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await resetEntireGameweek(gameweek);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        invalidateAll();
        refetch();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulator-title"
        className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl border border-neutral-800 bg-neutral-950 p-5 sm:p-7 shadow-2xl flex flex-col gap-5 overflow-hidden text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-950/60 text-neutral-950">
              <Zap className="w-5 h-5 font-black fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="simulator-title" className="text-lg sm:text-xl font-black tracking-tight text-neutral-100">
                  Matchday Testing Simulator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  DEV CONSOLE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Simulate in-play action, trigger final whistle settlements, and test live point rollups.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Controls & Gameweek Stepper */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 shrink-0">
          {/* Stepper */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={gameweek <= 1}
              onClick={() => setGameweek((g) => Math.max(1, g - 1))}
              className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 transition text-neutral-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono font-bold text-neutral-200">
              Gameweek {gameweek}
            </span>
            <button
              type="button"
              disabled={gameweek >= 38}
              onClick={() => setGameweek((g) => Math.min(38, g + 1))}
              className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 transition text-neutral-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSimulateAllGameweek}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold transition shadow-md shadow-amber-950/40 disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Simulate Full GW{gameweek}</span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleResetAllGameweek}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset GW{gameweek}</span>
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-neutral-400 hover:text-neutral-200 text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Matches Scrollable List */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-500 text-xs gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span>Loading fixtures for Gameweek {gameweek}...</span>
            </div>
          ) : fixtures.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              No fixtures scheduled for Gameweek {gameweek}.
            </div>
          ) : (
            fixtures.map((fixture) => {
              const scores = editedScores[fixture.id] || {
                home: fixture.home_score ?? 1,
                away: fixture.away_score ?? 0,
              };
              const isOperating = isPending && activeFixtureId === fixture.id;

              return (
                <div
                  key={fixture.id}
                  className="p-3.5 sm:p-4 rounded-2xl border border-neutral-800/90 bg-neutral-900/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition hover:border-neutral-700/80"
                >
                  {/* Left: Teams & Live Status */}
                  <div className="flex flex-col gap-1.5 min-w-[200px] sm:min-w-[260px]">
                    <div className="flex items-center gap-2">
                      {fixture.status === 'LIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-rose-400 bg-rose-950/70 border border-rose-800 animate-pulse">
                          <Radio className="w-3 h-3" /> LIVE {fixture.home_score} - {fixture.away_score}
                        </span>
                      ) : fixture.status === 'FINISHED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-neutral-300 bg-neutral-800 border border-neutral-700">
                          FT {fixture.home_score} - {fixture.away_score}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-neutral-400 bg-neutral-900 border border-neutral-800">
                          SCHEDULED
                        </span>
                      )}
                    </div>

                    {/* Matchup */}
                    <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-neutral-100">
                      <div className="flex items-center gap-1.5">
                        {fixture.home_team.crest_url && (
                          <img
                            src={fixture.home_team.crest_url}
                            alt={fixture.home_team.name}
                            className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
                          />
                        )}
                        <span>{fixture.home_team.name}</span>
                      </div>
                      <span className="text-neutral-500 font-normal">vs</span>
                      <div className="flex items-center gap-1.5">
                        {fixture.away_team.crest_url && (
                          <img
                            src={fixture.away_team.crest_url}
                            alt={fixture.away_team.name}
                            className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
                          />
                        )}
                        <span>{fixture.away_team.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Interactive Score Editor & Quick Presets */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    {/* Steppers */}
                    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-neutral-950 border border-neutral-800">
                      {/* Home */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleScoreChange(fixture.id, 'home', -1)}
                          className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-sm text-neutral-100">
                          {scores.home}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleScoreChange(fixture.id, 'home', 1)}
                          className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>

                      <span className="text-neutral-600 font-bold px-0.5">:</span>

                      {/* Away */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleScoreChange(fixture.id, 'away', -1)}
                          className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 flex items-center justify-center transition"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono font-bold text-sm text-neutral-100">
                          {scores.away}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleScoreChange(fixture.id, 'away', 1)}
                          className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 flex items-center justify-center transition"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      {[
                        [1, 0],
                        [2, 1],
                        [1, 1],
                        [0, 2],
                        [3, 2],
                      ].map(([h, a]) => (
                        <button
                          key={`${h}-${a}`}
                          type="button"
                          onClick={() => handleSetPreset(fixture.id, h, a)}
                          className={`px-1.5 py-1 rounded border transition ${
                            scores.home === h && scores.away === a
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {h}-{a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    {/* Go Live */}
                    <button
                      type="button"
                      disabled={isOperating}
                      onClick={() => handleSimulateLive(fixture.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition disabled:opacity-40"
                      title="Set match to Live status with current scoreline"
                    >
                      <Radio className="w-3 h-3 text-rose-400" />
                      <span>Live</span>
                    </button>

                    {/* FT (Settle) */}
                    <button
                      type="button"
                      disabled={isOperating}
                      onClick={() => handleSimulateFinished(fixture.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm shadow-emerald-950/40 disabled:opacity-40"
                      title="End match at Full Time and settle points"
                    >
                      {isOperating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>Settle FT</span>
                    </button>

                    {/* Reset */}
                    {(fixture.status === 'LIVE' || fixture.status === 'FINISHED') && (
                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleResetFixture(fixture.id)}
                        className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition disabled:opacity-40"
                        title="Reset match back to Scheduled"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <span>
            Tip: Settle any match to immediately observe points and LMS survival update on the dashboard!
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 font-semibold transition"
          >
            Done Testing
          </button>
        </div>
      </div>
    </div>
  );
}
