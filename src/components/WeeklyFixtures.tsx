'use client';

import React, { useState } from 'react';
import { useGameweekFixtures, FixturesApiResponse } from '@/hooks/useFootballData';
import { FixtureCard } from './FixtureCard';
import { CountdownTimer } from './CountdownTimer';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  History,
  Clock,
  MessageCircle,
} from 'lucide-react';

import { UserFixturePrediction, PredictorMatchClaim } from '@/server/actions/predictor';
import { LeagueTeamClaim } from '@/server/actions/leagues';

type FixtureItem = FixturesApiResponse['fixtures'][number];

interface WeeklyFixturesProps {
  initialGameweek?: number;
  gameweek?: number;
  onGameweekChange?: (gw: number) => void;
  selectedTeamId?: string | null;
  pickedTeamIds?: string[];
  leagueTeamClaims?: Record<string, LeagueTeamClaim>;
  predictorMatchClaims?: Record<string, PredictorMatchClaim>;
  onSelectTeam?: (team: FixtureItem['home_team'], fixture: FixtureItem) => void;
  onRemoveLmsPick?: (fixture: FixtureItem) => void;
  interactive?: boolean;
  gameMode?: 'fixtures' | 'lms' | 'predictor';
  predictions?: Record<string, UserFixturePrediction>;
  onPredictFixture?: (fixture: FixtureItem) => void;
  onRemovePredictorPick?: (fixture: FixtureItem) => void;
  onNudgeClick?: (gameweek: number, deadline?: string) => void;
}

function formatDateGroupHeader(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function WeeklyFixtures({
  initialGameweek = 1,
  gameweek: controlledGameweek,
  onGameweekChange,
  selectedTeamId,
  pickedTeamIds = [],
  leagueTeamClaims,
  predictorMatchClaims,
  onSelectTeam,
  onRemoveLmsPick,
  interactive = false,
  gameMode = 'fixtures',
  predictions = {},
  onPredictFixture,
  onRemovePredictorPick,
  onNudgeClick,
}: WeeklyFixturesProps) {
  const [internalGameweek, setInternalGameweek] = useState<number>(initialGameweek);
  const currentGameweek = controlledGameweek ?? internalGameweek;

  const handleGameweekChange = (newGw: number) => {
    setInternalGameweek(newGw);
    onGameweekChange?.(newGw);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useGameweekFixtures(currentGameweek);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleRefresh = async () => {
    setIsManualSyncing(true);
    try {
      await fetch(`/api/fixtures?gw=${currentGameweek}&refresh=true`);
      await refetch();
    } catch (e) {
      console.warn('Manual sync failed:', e);
      refetch();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const fixtures = data?.fixtures || [];
  const liveCount = fixtures.filter((f) => f.status === 'LIVE').length;

  // Earliest kickoff among fixtures in this gameweek (Gameweek Deadline)
  const earliestKickoff =
    fixtures.length > 0
      ? [...fixtures].sort(
          (a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
        )[0]?.kickoff_time
      : null;

  // Group fixtures by formatted date
  const groupedFixtures = fixtures.reduce<Record<string, FixtureItem[]>>((acc, f) => {
    const header = formatDateGroupHeader(f.kickoff_time);
    if (!acc[header]) acc[header] = [];
    acc[header].push(f);
    return acc;
  }, {});

  const activeGameweek = data?.activeGameweek ?? 5;
  const isPastGameweek = currentGameweek < activeGameweek;
  const isActiveGameweek = currentGameweek === activeGameweek;
  const isFutureGameweek = currentGameweek > activeGameweek;

  return (
    <div className="flex flex-col gap-5">
      {/* Gameweek Stepper Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 backdrop-blur">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-neutral-100 tracking-tight">
            Premier League Fixtures
          </h2>
          {liveCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800 animate-pulse">
              {liveCount} LIVE
            </span>
          )}
        </div>

        {/* Stepper controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isActiveGameweek && (
            <button
              type="button"
              onClick={() => handleGameweekChange(5)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
              title="Return to current active Gameweek 5"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Active (GW 5)</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              disabled={currentGameweek <= 1}
              onClick={() => handleGameweekChange(Math.max(1, currentGameweek - 1))}
              className="p-1.5 rounded-lg hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-neutral-300 cursor-pointer"
              aria-label="Previous Gameweek"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2 py-0.5">
              <span className="text-xs sm:text-sm font-bold text-neutral-200 font-mono">
                GW {currentGameweek}
              </span>
              {isPastGameweek ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-neutral-800 text-neutral-400 border border-neutral-700">
                  Completed
                </span>
              ) : isActiveGameweek ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Active
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Upcoming
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={currentGameweek >= 38}
              onClick={() => handleGameweekChange(Math.min(38, currentGameweek + 1))}
              className="p-1.5 rounded-lg hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-neutral-300 cursor-pointer"
              aria-label="Next Gameweek"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualSyncing}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh fixtures & sync latest live scores"
            aria-label="Refresh fixtures & sync latest live scores"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching || isManualSyncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Historical Archive Notice Banner */}
      {isPastGameweek && (
        <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-neutral-200">Gameweek {currentGameweek} Historical Archive</span>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                All fixtures in this round are finished. Team selections and match points are locked.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleGameweekChange(5)}
            className="self-start sm:self-auto text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 cursor-pointer"
          >
            Return to Active Round (GW 5) →
          </button>
        </div>
      )}

      {/* Gameweek Deadline & Countdown Card */}
      {!isPastGameweek && earliestKickoff && (
        <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-200">
                  Gameweek {currentGameweek} Deadline
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  First Match Kickoff
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {new Date(earliestKickoff).toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
              <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
                Closing:
              </span>
              <CountdownTimer targetDate={earliestKickoff} size="sm" showIcon={true} />
            </div>

            {onNudgeClick && (
              <button
                type="button"
                onClick={() => onNudgeClick(currentGameweek, earliestKickoff)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
                title="Remind group members to make their picks before kickoff"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-emerald-400/20 text-emerald-400" />
                <span>Nudge WhatsApp Group</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-neutral-900/40 border border-neutral-800/60"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Unable to load fixtures: </span>
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      )}

      {/* Date-grouped Fixtures */}
      {!isLoading && !isError && (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedFixtures).map(([dateGroup, items]) => (
            <div key={dateGroup} className="flex flex-col gap-2.5">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-1">
                {dateGroup}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {items.map((fixture) => (
                  <FixtureCard
                    key={fixture.id}
                    fixture={fixture}
                    selectedTeamId={selectedTeamId}
                    pickedTeamIds={pickedTeamIds}
                    leagueTeamClaims={leagueTeamClaims}
                    predictorMatchClaims={predictorMatchClaims}
                    onSelectTeam={onSelectTeam}
                    onRemoveLmsPick={onRemoveLmsPick}
                    interactive={interactive && !isPastGameweek}
                    gameMode={gameMode}
                    userPrediction={
                      predictions[fixture.id] ||
                      predictions[String(fixture.external_id)] ||
                      null
                    }
                    onPredictClick={onPredictFixture}
                    onRemovePredictorPick={onRemovePredictorPick}
                  />
                ))}
              </div>
            </div>
          ))}

          {fixtures.length === 0 && (
            <div className="p-8 text-center text-neutral-500 rounded-xl bg-neutral-900/30 border border-neutral-800">
              No fixtures scheduled for Gameweek {currentGameweek}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
