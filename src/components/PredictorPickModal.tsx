'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { FixturesApiResponse } from '@/hooks/useFootballData';
import {
  submitPredictorPicks,
  removePredictorPicks,
  getFixtureClaimedScores,
  ClaimedScore,
  UserFixturePrediction,
} from '@/server/actions/predictor';
import { MatchOutcome } from '@/core/types/database';
import {
  Trophy,
  X,
  Plus,
  Minus,
  Check,
  Loader2,
  Sparkles,
  Calendar,
  AlertCircle,
  HelpCircle,
  Lock,
  Info,
  Trash2,
} from 'lucide-react';

type FixtureItem = FixturesApiResponse['fixtures'][number];

const COMMON_SCORE_PRESETS = [
  { home: 1, away: 0 },
  { home: 2, away: 0 },
  { home: 2, away: 1 },
  { home: 3, away: 1 },
  { home: 0, away: 0 },
  { home: 1, away: 1 },
  { home: 2, away: 2 },
  { home: 0, away: 1 },
  { home: 0, away: 2 },
  { home: 1, away: 2 },
];

interface PredictorPickModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixture: FixtureItem | null;
  leagueId: string;
  userId?: string;
  initialPrediction?: UserFixturePrediction | null;
  hasOtherGameweekPick?: boolean;
  onPredictionSaved?: (fixtureId: string, prediction: UserFixturePrediction) => void;
  onPredictionRemoved?: (fixtureId: string) => void;
}

export function PredictorPickModal({
  isOpen,
  onClose,
  fixture,
  leagueId,
  userId,
  initialPrediction,
  hasOtherGameweekPick,
  onPredictionSaved,
  onPredictionRemoved,
}: PredictorPickModalProps) {
  const [homeScore, setHomeScore] = useState<number>(2);
  const [awayScore, setAwayScore] = useState<number>(1);
  const [outcome, setOutcome] = useState<MatchOutcome>('HOME');
  const [btts, setBtts] = useState<'YES' | 'NO'>('YES');
  const [overUnder, setOverUnder] = useState<'OVER' | 'UNDER'>('OVER');

  const [claimedScores, setClaimedScores] = useState<ClaimedScore[]>([]);
  const [allowDuplicate, setAllowDuplicate] = useState<boolean>(false);
  const [matchesPerGameweek, setMatchesPerGameweek] = useState<number | 'ALL'>(1);
  const [isLoadingClaims, setIsLoadingClaims] = useState<boolean>(false);
  const [isMatchClaimedByOther, setIsMatchClaimedByOther] = useState<boolean>(false);
  const [claimedByOtherName, setClaimedByOtherName] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state when fixture or initialPrediction changes
  useEffect(() => {
    if (isOpen && fixture) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsMatchClaimedByOther(false);
      setClaimedByOtherName(null);

      if (initialPrediction?.exactScore) {
        setHomeScore(initialPrediction.exactScore.home);
        setAwayScore(initialPrediction.exactScore.away);
        setOutcome(initialPrediction.outcome || (initialPrediction.exactScore.home > initialPrediction.exactScore.away ? 'HOME' : initialPrediction.exactScore.home < initialPrediction.exactScore.away ? 'AWAY' : 'DRAW'));
        setBtts(initialPrediction.btts || (initialPrediction.exactScore.home > 0 && initialPrediction.exactScore.away > 0 ? 'YES' : 'NO'));
        setOverUnder(initialPrediction.overUnder || ((initialPrediction.exactScore.home + initialPrediction.exactScore.away) > 2 ? 'OVER' : 'UNDER'));
      } else {
        // Default smart baseline: 2 - 1 Home Win
        setHomeScore(2);
        setAwayScore(1);
        setOutcome('HOME');
        setBtts('YES');
        setOverUnder('OVER');
      }

      // Fetch claimed scorelines and match exclusivity for validation
      setIsLoadingClaims(true);
      getFixtureClaimedScores(leagueId, String(fixture.id || fixture.external_id), userId)
        .then((res) => {
          if (res.success) {
            setClaimedScores(res.claimedScores);
            setAllowDuplicate(res.allowDuplicate);
            setIsMatchClaimedByOther(res.isMatchClaimedByOther);
            setClaimedByOtherName(res.claimedByOtherName || null);
            if (res.matchesPerGameweek !== undefined) {
              setMatchesPerGameweek(res.matchesPerGameweek);
            }
          }
        })
        .catch((err) => console.error('[PredictorPickModal] Error fetching claims:', err))
        .finally(() => setIsLoadingClaims(false));
    }
  }, [isOpen, fixture, initialPrediction, leagueId, userId]);

  const conflictingClaim = !allowDuplicate
    ? claimedScores.find(
        (c) => !c.isOwn && c.home === homeScore && c.away === awayScore
      )
    : null;
  const isScoreClaimedByOther = Boolean(conflictingClaim);

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

  if (!isOpen || !fixture) return null;

  // Auto-sync helpers when user touches the scoreline
  const handleScoreChange = (newHome: number, newAway: number) => {
    setHomeScore(newHome);
    setAwayScore(newAway);

    // Auto-sync Outcome
    if (newHome > newAway) setOutcome('HOME');
    else if (newAway > newHome) setOutcome('AWAY');
    else setOutcome('DRAW');

    // Auto-sync BTTS
    if (newHome > 0 && newAway > 0) setBtts('YES');
    else setBtts('NO');

    // Auto-sync Over/Under 2.5
    if (newHome + newAway > 2) setOverUnder('OVER');
    else setOverUnder('UNDER');
  };

  const handleSave = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const res = await submitPredictorPicks({
        leagueId,
        userId,
        fixtureId: String(fixture.id || fixture.external_id),
        exactScore: { home: homeScore, away: awayScore },
        outcome,
        btts,
        overUnder,
        kickoffTime: fixture.kickoff_time,
      });

      if (res.success) {
        setSuccessMessage('Predictions saved successfully!');
        onPredictionSaved?.(String(fixture.id || fixture.external_id), {
          fixtureId: String(fixture.id || fixture.external_id),
          exactScore: { home: homeScore, away: awayScore },
          outcome,
          btts,
          overUnder,
          pointsAwarded: 0,
          isSettled: false,
        });

        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  const handleRemove = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const res = await removePredictorPicks({
        leagueId,
        fixtureId: String(fixture.id || fixture.external_id),
        userId,
      });

      if (res.success) {
        setSuccessMessage(res.message);
        onPredictionRemoved?.(String(fixture.id || fixture.external_id));
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  const formattedKickoff = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fixture.kickoff_time));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-7 shadow-2xl text-neutral-100 flex flex-col gap-6 max-h-[92vh] overflow-y-auto">
        {/* Header & Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Match Predictor</h2>
              <p className="text-xs text-neutral-400">Predict score & markets for up to 6 points</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fixture Matchup Card */}
        <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 flex flex-col items-center gap-3">
          <div className="flex items-center justify-between w-full px-2">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-1.5 w-5/12 text-center">
              {fixture.home_team.crest_url && (
                <img
                  src={fixture.home_team.crest_url}
                  alt={fixture.home_team.name}
                  className="w-10 h-10 object-contain drop-shadow"
                />
              )}
              <span className="font-bold text-xs sm:text-sm text-neutral-100 truncate w-full">
                {fixture.home_team.name}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                Home
              </span>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-black tracking-widest text-neutral-500">VS</span>
              <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                <Calendar className="w-3 h-3 text-neutral-500" />
                <span>{formattedKickoff}</span>
              </div>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-1.5 w-5/12 text-center">
              {fixture.away_team.crest_url && (
                <img
                  src={fixture.away_team.crest_url}
                  alt={fixture.away_team.name}
                  className="w-10 h-10 object-contain drop-shadow"
                />
              )}
              <span className="font-bold text-xs sm:text-sm text-neutral-100 truncate w-full">
                {fixture.away_team.name}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
                Away
              </span>
            </div>
          </div>
        </div>

        {/* Match Claimed by Another Player Banner */}
        {isMatchClaimedByOther && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/70 text-amber-200 text-xs font-medium flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Match Exclusively Claimed: </span>
              This fixture has already been selected by{' '}
              <span className="font-bold text-white underline">{claimedByOtherName}</span> in this group.
              Under exclusive match rules, each fixture can only be predicted by one player per gameweek.
            </div>
          </div>
        )}

        {/* 1-Match Limit Gameweek Warning Banner */}
        {matchesPerGameweek === 1 && hasOtherGameweekPick && !initialPrediction && !isMatchClaimedByOther && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-blue-400" />
            <span>
              Your group is set to <strong>1 match prediction per gameweek</strong>. Saving will switch your active gameweek prediction to this fixture.
            </span>
          </div>
        )}

        {/* Alert Feedback Messages */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Market 1: Exact Score Stepper & Presets */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <span>1. Exact Score</span>
              {!allowDuplicate && (
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Exclusive</span>
                </span>
              )}
            </label>
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              +3 Points
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-around">
            {/* Home Goals Stepper */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold text-neutral-400">
                {fixture.home_team.tla}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleScoreChange(Math.max(0, homeScore - 1), awayScore)}
                  className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 flex items-center justify-center text-neutral-200 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-mono text-2xl font-black text-neutral-100">
                  {homeScore}
                </span>
                <button
                  type="button"
                  onClick={() => handleScoreChange(homeScore + 1, awayScore)}
                  className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 flex items-center justify-center text-neutral-200 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <span className="text-xl font-bold text-neutral-600">:</span>

            {/* Away Goals Stepper */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold text-neutral-400">
                {fixture.away_team.tla}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleScoreChange(homeScore, Math.max(0, awayScore - 1))}
                  className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 flex items-center justify-center text-neutral-200 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-mono text-2xl font-black text-neutral-100">
                  {awayScore}
                </span>
                <button
                  type="button"
                  onClick={() => handleScoreChange(homeScore, awayScore + 1)}
                  className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 flex items-center justify-center text-neutral-200 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Scoreline Presets */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-neutral-500">
              Quick Pick:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SCORE_PRESETS.map((preset) => {
                const isSelected = homeScore === preset.home && awayScore === preset.away;
                const claim = !allowDuplicate
                  ? claimedScores.find((c) => !c.isOwn && c.home === preset.home && c.away === preset.away)
                  : null;
                const isPresetClaimed = Boolean(claim);

                return (
                  <button
                    key={`${preset.home}-${preset.away}`}
                    type="button"
                    disabled={isPresetClaimed}
                    onClick={() => handleScoreChange(preset.home, preset.away)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 border ${
                      isPresetClaimed
                        ? 'bg-neutral-900/40 border-neutral-800/60 text-neutral-600 line-through cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm shadow-amber-950/40'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                    }`}
                    title={isPresetClaimed ? `Claimed by ${claim?.claimedBy}` : undefined}
                  >
                    {isPresetClaimed && <Lock className="w-2.5 h-2.5 text-neutral-500" />}
                    <span>{preset.home} - {preset.away}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conflicting Claim Warning */}
          {isScoreClaimedByOther && conflictingClaim && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-150">
              <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Scoreline <strong>{homeScore} - {awayScore}</strong> has already been claimed by <strong>{conflictingClaim.claimedBy}</strong>. In this group, scorelines are exclusive — please select a different scoreline.
              </span>
            </div>
          )}

          {/* List of claimed scorelines by group members */}
          {!allowDuplicate && claimedScores.length > 0 && (
            <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/60 flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-neutral-500" />
                <span>Claimed scorelines for this match ({claimedScores.length}):</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {claimedScores.map((c, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                      c.isOwn
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-300'
                    }`}
                  >
                    <span>{c.home} - {c.away}</span>
                    <span className="text-[10px] opacity-75">
                      ({c.isOwn ? 'You' : c.claimedBy})
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Market 2: Match Outcome (1X2) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              2. Match Outcome (1X2)
            </label>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              +1 Point
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setOutcome('HOME')}
              className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-0.5 ${
                outcome === 'HOME'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <span>{fixture.home_team.tla} Win</span>
              <span className="text-[10px] font-normal opacity-80">Home (1)</span>
            </button>

            <button
              type="button"
              onClick={() => setOutcome('DRAW')}
              className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-0.5 ${
                outcome === 'DRAW'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <span>Draw</span>
              <span className="text-[10px] font-normal opacity-80">(X)</span>
            </button>

            <button
              type="button"
              onClick={() => setOutcome('AWAY')}
              className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-0.5 ${
                outcome === 'AWAY'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <span>{fixture.away_team.tla} Win</span>
              <span className="text-[10px] font-normal opacity-80">Away (2)</span>
            </button>
          </div>
        </div>

        {/* Markets 3 & 4: BTTS & Over/Under side-by-side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Market 3: BTTS */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                3. Both Teams Score
              </label>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                +1 Pt
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBtts('YES')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  btts === 'YES'
                    ? 'bg-neutral-800 border-emerald-500 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                YES
              </button>
              <button
                type="button"
                onClick={() => setBtts('NO')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  btts === 'NO'
                    ? 'bg-neutral-800 border-emerald-500 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                NO
              </button>
            </div>
          </div>

          {/* Market 4: Over/Under 2.5 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                4. Total Goals
              </label>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                +1 Pt
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOverUnder('OVER')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  overUnder === 'OVER'
                    ? 'bg-neutral-800 border-emerald-500 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                Over 2.5
              </button>
              <button
                type="button"
                onClick={() => setOverUnder('UNDER')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  overUnder === 'UNDER'
                    ? 'bg-neutral-800 border-emerald-500 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                Under 2.5
              </button>
            </div>
          </div>
        </div>

        {/* Potential Points Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-neutral-300">Max Potential Points</span>
          </div>
          <span className="font-mono text-sm font-black text-amber-400">
            6 Points Available
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {initialPrediction ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending || Boolean(successMessage)}
              className="py-3 px-3.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-xs font-semibold border border-rose-800/50 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Pick</span>
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2.5 flex-1 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer shrink-0"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || isMatchClaimedByOther || isScoreClaimedByOther || Boolean(successMessage)}
              className="flex-1 max-w-[200px] py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isMatchClaimedByOther ? (
                <>
                  <Lock className="w-4 h-4 text-neutral-900" />
                  <span>Match Claimed ({claimedByOtherName})</span>
                </>
              ) : isScoreClaimedByOther ? (
                <>
                  <Lock className="w-4 h-4 text-neutral-900" />
                  <span>Scoreline Taken ({conflictingClaim?.claimedBy})</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 font-bold" />
                  <span>{initialPrediction ? 'Update Pick' : 'Save Pick'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
