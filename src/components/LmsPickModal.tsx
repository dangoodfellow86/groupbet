'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { submitLmsPick, removeLmsPick } from '@/server/actions/lms';
import { FixturesApiResponse } from '@/hooks/useFootballData';
import {
  ShieldAlert,
  ShieldCheck,
  X,
  AlertTriangle,
  Clock,
  Check,
  Loader2,
  Lock,
  Trash2,
} from 'lucide-react';
import { LeagueTeamClaim } from '@/server/actions/leagues';

type FixtureItem = FixturesApiResponse['fixtures'][number];

interface LmsPickModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeam: FixtureItem['home_team'] | null;
  fixture: FixtureItem | null;
  gameweek: number;
  entryId?: string;
  pickedTeamIds?: string[];
  leagueTeamClaims?: Record<string, LeagueTeamClaim>;
  onPickConfirmed?: (teamId: string) => void;
  onPickRemoved?: () => void;
}

export function LmsPickModal({
  isOpen,
  onClose,
  selectedTeam,
  fixture,
  gameweek,
  entryId,
  pickedTeamIds = [],
  leagueTeamClaims,
  onPickConfirmed,
  onPickRemoved,
}: LmsPickModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, selectedTeam]);

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

  if (!isOpen || !selectedTeam || !fixture) {
    return null;
  }

  const isHome = selectedTeam.id === fixture.home_team.id;
  const opponent = isHome ? fixture.away_team : fixture.home_team;
  const venue = isHome ? 'Home' : 'Away';

  const isAlreadyPicked =
    pickedTeamIds.includes(String(selectedTeam.id)) ||
    pickedTeamIds.includes(String(selectedTeam.external_id));

  const teamClaim = leagueTeamClaims
    ? leagueTeamClaims[String(selectedTeam.id)] ||
      leagueTeamClaims[String(selectedTeam.external_id)]
    : null;
  const isClaimedByOther = Boolean(teamClaim && !teamClaim.isOwn);
  const isOwnPick = Boolean(teamClaim?.isOwn);

  const isKickoffPassed = new Date(fixture.kickoff_time).getTime() <= Date.now();

  const handleRemovePick = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await removeLmsPick({
        entryId: entryId || 'demo-entry-uuid-001',
        gameweekId: String(gameweek),
      });

      if (res.success) {
        setSuccessMessage(res.message);
        onPickRemoved?.();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  const handleConfirm = () => {
    setErrorMessage(null);

    startTransition(async () => {
      const res = await submitLmsPick({
        entryId: entryId || 'demo-entry-uuid-001',
        gameweekId: String(gameweek),
        teamId: String(selectedTeam.external_id || selectedTeam.id),
        fixtureId: String(fixture.external_id || fixture.id),
        kickoffTime: fixture.kickoff_time,
        teamName: selectedTeam.name,
      });

      if (res.success) {
        setSuccessMessage(res.message);
        onPickConfirmed?.(String(selectedTeam.external_id || selectedTeam.id));
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl text-neutral-100 flex flex-col gap-5"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 id="modal-title" className="text-base font-bold text-neutral-100">
              Confirm LMS Pick
            </h3>
            <p className="text-xs text-neutral-400">Gameweek {gameweek} Selection</p>
          </div>
        </div>

        {/* Selected Club & Opponent Context */}
        <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {selectedTeam.crest_url ? (
              <img
                src={selectedTeam.crest_url}
                alt={selectedTeam.name}
                className="w-12 h-12 object-contain shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold">
                {selectedTeam.tla}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Your Selection ({venue})
              </span>
              <h4 className="text-base font-bold text-neutral-100 truncate">
                {selectedTeam.name}
              </h4>
              <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                <span>vs</span>
                <span className="font-medium text-neutral-300">{opponent.name}</span>
              </p>
            </div>
          </div>

          <div className="text-right text-[11px] text-neutral-500 font-mono shrink-0">
            <Clock className="w-3.5 h-3.5 inline mr-1 text-neutral-400" />
            {new Date(fixture.kickoff_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        {/* Warning: Claimed by another league member */}
        {isClaimedByOther && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold">Team Already Taken:</span> {selectedTeam.name} has already been claimed by <strong>{teamClaim?.claimedBy}</strong> in this group. Under exclusive pick rules, each team can only be selected once per gameweek.
            </div>
          </div>
        )}

        {/* Warning: Already Picked */}
        {isAlreadyPicked && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold">Team Already Selected:</span> You have already chosen {selectedTeam.name} in a previous round. Under LMS rules, each team may only be selected once.
            </div>
          </div>
        )}

        {/* Warning: Kickoff Passed */}
        {isKickoffPassed && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <span className="font-bold">Deadline Passed:</span> Kickoff has already taken place for this fixture. Picks are locked.
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Success Feedback */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Rule reminder */}
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          Remember: {selectedTeam.name} must win in 90 minutes. Draws and losses both result in the loss of 1 life.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-800">
          <div>
            {isOwnPick && !isKickoffPassed && (
              <button
                type="button"
                onClick={handleRemovePick}
                disabled={isPending || Boolean(successMessage)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Pick
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || isAlreadyPicked || isKickoffPassed || isClaimedByOther || Boolean(successMessage)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed transition-all text-neutral-950 shadow-md shadow-emerald-950/40 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                Confirming Pick...
              </>
            ) : isClaimedByOther ? (
              <>
                <Lock className="w-4 h-4 text-neutral-400" /> Team Taken ({teamClaim?.claimedBy})
              </>
            ) : successMessage ? (
              <>
                <Check className="w-4 h-4 text-neutral-950" /> Pick Confirmed
              </>
            ) : (
              'Lock In My Pick'
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
