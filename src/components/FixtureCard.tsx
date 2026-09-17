'use client';

import React from 'react';
import { FixturesApiResponse } from '@/hooks/useFootballData';
import { Clock, CheckCircle, Radio, Lock } from 'lucide-react';
import { CountdownTimer } from '@/components/CountdownTimer';

import { UserFixturePrediction, PredictorMatchClaim } from '@/server/actions/predictor';
import { LeagueTeamClaim } from '@/server/actions/leagues';

type FixtureItem = FixturesApiResponse['fixtures'][number];

interface FixtureCardProps {
  fixture: FixtureItem;
  selectedTeamId?: string | null;
  pickedTeamIds?: string[]; // teams picked in prior gameweeks
  leagueTeamClaims?: Record<string, LeagueTeamClaim>; // teams claimed by other group members in this GW
  predictorMatchClaims?: Record<string, PredictorMatchClaim>; // fixtures claimed by other group members in this GW
  onSelectTeam?: (team: FixtureItem['home_team'], fixture: FixtureItem) => void;
  onRemoveLmsPick?: (fixture: FixtureItem) => void;
  interactive?: boolean;
  gameMode?: 'fixtures' | 'lms' | 'predictor';
  userPrediction?: UserFixturePrediction | null;
  onPredictClick?: (fixture: FixtureItem) => void;
  onRemovePredictorPick?: (fixture: FixtureItem) => void;
}

function formatKickoff(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Today ${timeStr}`;
  }

  const dayName = date.toLocaleDateString([], { weekday: 'short' });
  const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${dayName} ${monthDay}, ${timeStr}`;
}

export function FixtureCard({
  fixture,
  selectedTeamId,
  pickedTeamIds = [],
  leagueTeamClaims,
  predictorMatchClaims,
  onSelectTeam,
  onRemoveLmsPick,
  interactive = false,
  gameMode = 'fixtures',
  userPrediction = null,
  onPredictClick,
  onRemovePredictorPick,
}: FixtureCardProps) {
  const isLive = fixture.status === 'LIVE';
  const isFinished = fixture.status === 'FINISHED';
  const isPostponed = fixture.status === 'POSTPONED' || fixture.status === 'CANCELLED';
  const isScheduled = !isLive && !isFinished && !isPostponed;

  const isHomePickedBefore = pickedTeamIds.includes(String(fixture.home_team.external_id));
  const isAwayPickedBefore = pickedTeamIds.includes(String(fixture.away_team.external_id));

  const homeClaim = leagueTeamClaims
    ? leagueTeamClaims[String(fixture.home_team.id)] ||
      leagueTeamClaims[String(fixture.home_team.external_id)]
    : null;
  const isHomeClaimedByOther = Boolean(homeClaim && !homeClaim.isOwn);

  const awayClaim = leagueTeamClaims
    ? leagueTeamClaims[String(fixture.away_team.id)] ||
      leagueTeamClaims[String(fixture.away_team.external_id)]
    : null;
  const isAwayClaimedByOther = Boolean(awayClaim && !awayClaim.isOwn);

  const predictorClaim = predictorMatchClaims
    ? predictorMatchClaims[String(fixture.id)] ||
      predictorMatchClaims[String(fixture.external_id)]
    : null;
  const isPredictorClaimedByOther = Boolean(predictorClaim && !predictorClaim.isOwn);

  const isHomeSelected = selectedTeamId === String(fixture.home_team.id) || selectedTeamId === String(fixture.home_team.external_id);
  const isAwaySelected = selectedTeamId === String(fixture.away_team.id) || selectedTeamId === String(fixture.away_team.external_id);

  return (
    <div className={`relative rounded-xl border p-4 transition-all shadow-sm ${
      isLive
        ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/25 via-neutral-900/90 to-neutral-900 shadow-rose-950/40 ring-1 ring-rose-500/25'
        : 'border-neutral-800 bg-neutral-900/70 backdrop-blur hover:border-neutral-700'
    }`}>
      {/* Top Bar: Status and Kickoff */}
      <div className="flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-1.5 font-medium">
          {isLive && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-rose-400 bg-rose-950/60 border border-rose-800/80 animate-pulse">
              <Radio className="w-3 h-3 text-rose-400" /> LIVE
            </span>
          )}
          {isFinished && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-neutral-400 bg-neutral-800/90 border border-neutral-700">
              FT
            </span>
          )}
          {isPostponed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-amber-400 bg-amber-950/60 border border-amber-800/80">
              {fixture.status}
            </span>
          )}
          {isScheduled && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-neutral-400">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                {formatKickoff(fixture.kickoff_time)}
              </span>
              <CountdownTimer
                targetDate={fixture.kickoff_time}
                size="xs"
                prefix="Starts in "
                className="px-1.5 py-0.5 rounded bg-neutral-950/80 border border-neutral-800"
              />
            </div>
          )}
        </div>

        <span className="text-neutral-500 text-[11px] font-mono">
          GW {fixture.gameweek_number}
        </span>
      </div>

      {/* Main Match Row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Home Team */}
        <button
          type="button"
          disabled={!interactive || !isScheduled || isHomeClaimedByOther}
          onClick={() => onSelectTeam?.(fixture.home_team, fixture)}
          className={`flex items-center justify-end gap-2.5 p-2 rounded-lg transition-all text-right group ${
            isHomeClaimedByOther
              ? 'opacity-40 cursor-not-allowed bg-neutral-950/40 border border-neutral-800/50'
              : interactive && isScheduled
              ? 'hover:bg-neutral-800 cursor-pointer'
              : 'cursor-default'
          } ${isHomeSelected ? 'ring-2 ring-emerald-500 bg-emerald-950/30' : ''}`}
          title={isHomeClaimedByOther ? `Claimed by ${homeClaim?.claimedBy}` : undefined}
        >
          <div className="flex flex-col items-end min-w-0">
            <span
              className={`text-sm font-semibold truncate ${
                isHomeSelected
                  ? 'text-emerald-400'
                  : isHomeClaimedByOther
                  ? 'text-neutral-500 line-through'
                  : 'text-neutral-200'
              }`}
            >
              {fixture.home_team.short_name}
            </span>
            {isHomeClaimedByOther ? (
              <span className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span className="truncate max-w-[80px]">{homeClaim?.claimedBy}</span>
              </span>
            ) : isHomePickedBefore ? (
              <span className="text-[10px] text-amber-400/80">Already picked</span>
            ) : null}
          </div>
          {fixture.home_team.crest_url ? (
            <img
              src={fixture.home_team.crest_url}
              alt={fixture.home_team.name}
              className={`w-7 h-7 object-contain shrink-0 ${isHomeClaimedByOther ? 'grayscale opacity-50' : ''}`}
              loading="lazy"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400">
              {fixture.home_team.tla}
            </div>
          )}
        </button>

        {/* Center Score / VS */}
        <div
          className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg border min-w-[70px] transition-all ${
            isLive
              ? 'bg-rose-950/40 border-rose-500/40 shadow-sm shadow-rose-950/50'
              : 'bg-neutral-950/80 border-neutral-800'
          }`}
        >
          {isFinished || isLive ? (
            <div className="flex items-center gap-2 font-mono text-base font-bold text-neutral-100">
              <span className={isLive ? 'text-rose-400 font-extrabold animate-pulse' : ''}>
                {fixture.home_score ?? 0}
              </span>
              <span className={isLive ? 'text-rose-500' : 'text-neutral-600'}>-</span>
              <span className={isLive ? 'text-rose-400 font-extrabold animate-pulse' : ''}>
                {fixture.away_score ?? 0}
              </span>
            </div>
          ) : (
            <span className="text-xs font-medium text-neutral-500 tracking-wider">VS</span>
          )}
        </div>

        {/* Away Team */}
        <button
          type="button"
          disabled={!interactive || !isScheduled || isAwayClaimedByOther}
          onClick={() => onSelectTeam?.(fixture.away_team, fixture)}
          className={`flex items-center justify-start gap-2.5 p-2 rounded-lg transition-all text-left group ${
            isAwayClaimedByOther
              ? 'opacity-40 cursor-not-allowed bg-neutral-950/40 border border-neutral-800/50'
              : interactive && isScheduled
              ? 'hover:bg-neutral-800 cursor-pointer'
              : 'cursor-default'
          } ${isAwaySelected ? 'ring-2 ring-emerald-500 bg-emerald-950/30' : ''}`}
          title={isAwayClaimedByOther ? `Claimed by ${awayClaim?.claimedBy}` : undefined}
        >
          {fixture.away_team.crest_url ? (
            <img
              src={fixture.away_team.crest_url}
              alt={fixture.away_team.name}
              className={`w-7 h-7 object-contain shrink-0 ${isAwayClaimedByOther ? 'grayscale opacity-50' : ''}`}
              loading="lazy"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400">
              {fixture.away_team.tla}
            </div>
          )}
          <div className="flex flex-col items-start min-w-0">
            <span
              className={`text-sm font-semibold truncate ${
                isAwaySelected
                  ? 'text-emerald-400'
                  : isAwayClaimedByOther
                  ? 'text-neutral-500 line-through'
                  : 'text-neutral-200'
              }`}
            >
              {fixture.away_team.short_name}
            </span>
            {isAwayClaimedByOther ? (
              <span className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span className="truncate max-w-[80px]">{awayClaim?.claimedBy}</span>
              </span>
            ) : isAwayPickedBefore ? (
              <span className="text-[10px] text-amber-400/80">Already picked</span>
            ) : null}
          </div>
        </button>
      </div>

      {/* Selected Indicator for LMS */}
      {gameMode === 'lms' && (isHomeSelected || isAwaySelected) && (
        <div className="mt-2.5 pt-2 border-t border-emerald-900/40 flex items-center justify-between text-xs text-emerald-400 font-medium">
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Pick Selected: {isHomeSelected ? fixture.home_team.name : fixture.away_team.name}
            </span>
          </div>
          {isScheduled && onRemoveLmsPick && (
            <button
              type="button"
              onClick={() => onRemoveLmsPick(fixture)}
              className="text-[11px] text-rose-400 hover:text-rose-300 underline font-semibold ml-2 shrink-0 transition cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {/* Predictor Mode Badge / CTA */}
      {gameMode === 'predictor' && (
        <div className="mt-2.5 pt-2 border-t border-neutral-800/80">
          {userPrediction ? (
            <div className="w-full flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-neutral-950/60 border border-amber-500/20 hover:border-amber-500/40 transition">
              <button
                type="button"
                disabled={!isScheduled}
                onClick={() => onPredictClick?.(fixture)}
                className="flex items-center gap-1.5 truncate text-left flex-1 hover:opacity-90 transition cursor-pointer"
              >
                <span className="font-mono font-bold text-amber-400 text-xs">
                  🎯 {userPrediction.exactScore?.home} - {userPrediction.exactScore?.away}
                </span>
                <span className="text-[10px] text-neutral-400 truncate">
                  ({userPrediction.outcome} • BTTS: {userPrediction.btts})
                </span>
              </button>
              {isScheduled ? (
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => onPredictClick?.(fixture)}
                    className="text-[10px] font-semibold text-amber-400/90 underline hover:text-amber-300 transition cursor-pointer"
                  >
                    Edit
                  </button>
                  {onRemovePredictorPick && (
                    <button
                      type="button"
                      onClick={() => onRemovePredictorPick(fixture)}
                      className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 underline transition cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-[10px] font-mono font-bold text-neutral-400 shrink-0 ml-1.5">
                  {userPrediction.isSettled ? `+${userPrediction.pointsAwarded} pts` : 'Locked'}
                </span>
              )}
            </div>
          ) : isPredictorClaimedByOther ? (
            <div className="w-full flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-neutral-950/60 border border-amber-900/30 opacity-60 cursor-not-allowed">
              <div className="flex items-center gap-1.5 truncate">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-medium text-neutral-300 truncate">
                  Claimed by <span className="text-amber-400 font-semibold">{predictorClaim?.claimedBy}</span>
                </span>
                {predictorClaim?.exactScore && (
                  <span className="text-[10px] font-mono text-neutral-400 ml-1">
                    ({predictorClaim.exactScore.home} - {predictorClaim.exactScore.away})
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider shrink-0 ml-1.5">
                Locked
              </span>
            </div>
          ) : (
            <button
              type="button"
              disabled={!isScheduled}
              onClick={() => onPredictClick?.(fixture)}
              className="w-full flex items-center justify-center gap-1.5 py-1 text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-40 transition"
            >
              <span>+ Predict Score & Markets</span>
              <span className="text-[10px] text-neutral-400 font-normal">(Up to 6 pts)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
