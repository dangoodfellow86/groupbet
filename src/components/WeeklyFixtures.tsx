'use client';

import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Target,
  Filter,
} from 'lucide-react';

import { UserFixturePrediction, PredictorMatchClaim } from '@/server/actions/predictor';
import { LeagueTeamClaim } from '@/server/actions/leagues';

type FixtureItem = FixturesApiResponse['fixtures'][number];

interface WeeklyFixturesProps {
  initialGameweek?: number;
  gameweek?: number;
  competitionCode?: string;
  competitionName?: string;
  maxGameweeks?: number;
  matchesPerGameweek?: number | 'ALL';
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
  competitionCode = 'PL',
  competitionName,
  maxGameweeks,
  matchesPerGameweek = 1,
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
  const compCode = competitionCode || 'PL';
  const totalGameweeks = maxGameweeks ?? (compCode === 'ELC' ? 46 : 38);
  const [filterOverride, setFilterOverride] = useState<'picked' | 'all' | null>(null);

  useEffect(() => {
    setFilterOverride(null);
  }, [currentGameweek, gameMode, compCode]);

  const handleGameweekChange = (newGw: number) => {
    setInternalGameweek(newGw);
    onGameweekChange?.(newGw);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useGameweekFixtures(currentGameweek, compCode);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleRefresh = async () => {
    setIsManualSyncing(true);
    try {
      await fetch(`/api/fixtures?comp=${encodeURIComponent(compCode)}&gw=${currentGameweek}&refresh=true`);
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

  const activeGameweek = data?.activeGameweek ?? currentGameweek;
  const isPastGameweek = currentGameweek < activeGameweek;
  const isActiveGameweek = currentGameweek === activeGameweek;
  const isFutureGameweek = currentGameweek > activeGameweek;

  // Predictor selection & league-wide picked matches calculation
  const isFixturePickedInLeague = (f: FixtureItem) =>
    Boolean(
      predictions[f.id] ||
        predictions[String(f.external_id)] ||
        (predictorMatchClaims &&
          (predictorMatchClaims[String(f.id)] || predictorMatchClaims[String(f.external_id)]))
    );

  const userPickedFixturesCount = fixtures.filter((f) =>
    Boolean(predictions[f.id] || predictions[String(f.external_id)])
  ).length;

  const leaguePickedFixtures = fixtures.filter(isFixturePickedInLeague);

  const isGameweekCompleted =
    isPastGameweek || (fixtures.length > 0 && fixtures.every((f) => f.status === 'FINISHED'));

  const targetQuota =
    matchesPerGameweek === 'ALL'
      ? fixtures.length
      : typeof matchesPerGameweek === 'number' && matchesPerGameweek > 0
      ? matchesPerGameweek
      : 1;

  const isUserSelectionsCompleted =
    fixtures.length > 0 && userPickedFixturesCount >= targetQuota;

  const shouldAutoFilterPicked =
    gameMode === 'predictor' &&
    leaguePickedFixtures.length > 0 &&
    (isUserSelectionsCompleted || isGameweekCompleted);

  const showOnlyPicked =
    gameMode === 'predictor' &&
    leaguePickedFixtures.length > 0 &&
    (filterOverride === 'picked' || (filterOverride === null && shouldAutoFilterPicked));

  const displayedFixtures = showOnlyPicked ? leaguePickedFixtures : fixtures;

  // Group displayed fixtures by formatted date
  const groupedFixtures = displayedFixtures.reduce<Record<string, FixtureItem[]>>((acc, f) => {
    const header = formatDateGroupHeader(f.kickoff_time);
    if (!acc[header]) acc[header] = [];
    acc[header].push(f);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      {/* Gameweek Stepper Header */}
      <div className="flex items-center justify-between gap-2 p-3 sm:p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
          <h2 className="text-base sm:text-lg font-bold text-neutral-100 tracking-tight truncate">
            <span className="hidden sm:inline">
              {competitionName || (compCode === 'ELC' ? 'Championship' : 'Premier League')}{' '}
            </span>
            Fixtures
          </h2>
          {liveCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800 animate-pulse shrink-0">
              {liveCount} LIVE
            </span>
          )}
        </div>

        {/* Stepper controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isActiveGameweek && (
            <button
              type="button"
              onClick={() => handleGameweekChange(activeGameweek)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
              title={`Return to current active Gameweek ${activeGameweek}`}
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">Active (GW {activeGameweek})</span>
            </button>
          )}

          <div className="flex items-center gap-0.5 sm:gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              disabled={currentGameweek <= 1}
              onClick={() => handleGameweekChange(Math.max(1, currentGameweek - 1))}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-neutral-300 cursor-pointer"
              aria-label="Previous Gameweek"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5">
              <span className="text-xs sm:text-sm font-bold text-neutral-200 font-mono whitespace-nowrap">
                GW {currentGameweek}
              </span>
              {isPastGameweek ? (
                <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide bg-neutral-800 text-neutral-400 border border-neutral-700 hidden sm:inline">
                  Finished
                </span>
              ) : isActiveGameweek ? (
                <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hidden sm:inline">
                  Active
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30 hidden sm:inline">
                  Next
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={currentGameweek >= totalGameweeks}
              onClick={() => handleGameweekChange(Math.min(totalGameweeks, currentGameweek + 1))}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-neutral-300 cursor-pointer"
              aria-label="Next Gameweek"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualSyncing}
            className="p-2 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
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
                {gameMode === 'predictor'
                  ? 'All fixtures in this round are finished. Click any picked match below to view the outcomes and points breakdown.'
                  : 'All fixtures in this round are finished. Team selections and match points are locked.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleGameweekChange(activeGameweek)}
            className="self-start sm:self-auto text-xs text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 cursor-pointer"
          >
            Return to Active Round (GW {activeGameweek}) →
          </button>
        </div>
      )}

      {/* Predictor Selection Progress & Picked Games Filter Bar */}
      {gameMode === 'predictor' && !isLoading && fixtures.length > 0 && (
        <div
          className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all animate-in fade-in duration-200 ${
            isGameweekCompleted
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : isUserSelectionsCompleted
              ? 'bg-amber-950/20 border-amber-500/30'
              : 'bg-neutral-900/90 border-neutral-800'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                isGameweekCompleted || isUserSelectionsCompleted
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
            >
              {isGameweekCompleted || isUserSelectionsCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Target className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-neutral-100">
                  {isGameweekCompleted
                    ? `Gameweek ${currentGameweek} Outcomes Ready`
                    : isUserSelectionsCompleted
                    ? 'All Selections Completed!'
                    : `Weekly Selections (${userPickedFixturesCount} / ${
                        matchesPerGameweek === 'ALL' ? fixtures.length : targetQuota
                      })`}
                </span>
                {showOnlyPicked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    Showing Picked Games Only
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {isGameweekCompleted
                  ? leaguePickedFixtures.length > 0
                    ? `Click on any of the ${leaguePickedFixtures.length} picked ${
                        leaguePickedFixtures.length === 1 ? 'match' : 'matches'
                      } to see selections & market outcomes.`
                    : 'No predictions were submitted for this gameweek.'
                  : isUserSelectionsCompleted
                  ? 'Filtering to games picked in your league. Click any match to inspect selections or toggle All Fixtures to change your pick.'
                  : `Select ${
                      matchesPerGameweek === 'ALL'
                        ? 'all fixtures'
                        : `${targetQuota - userPickedFixturesCount} more ${
                            targetQuota - userPickedFixturesCount === 1 ? 'match' : 'matches'
                          }`
                    } to complete your predictions for GW ${currentGameweek}.`}
              </p>
            </div>
          </div>

          {leaguePickedFixtures.length > 0 && (
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterOverride('picked')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  showOnlyPicked
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>Picked Games ({leaguePickedFixtures.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterOverride('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  !showOnlyPicked
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                All Fixtures ({fixtures.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Gameweek Deadline & Countdown Card */}
      {!isPastGameweek && earliestKickoff && (
        <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
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
                  First Kickoff
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

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start flex-wrap">
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
                <span>Nudge WhatsApp</span>
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

          {displayedFixtures.length === 0 && (
            <div className="p-8 text-center text-neutral-500 rounded-xl bg-neutral-900/30 border border-neutral-800">
              No fixtures scheduled for Gameweek {currentGameweek}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

