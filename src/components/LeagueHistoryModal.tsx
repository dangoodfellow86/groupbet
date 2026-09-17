'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeagueHistoryMatrix, getUserBurnedTeams } from '@/server/actions/history';
import {
  X,
  History,
  Flame,
  Shield,
  Trophy,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Sparkles,
  Users,
} from 'lucide-react';

interface LeagueHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  leagueName: string;
  leagueType: string;
  currentUserId?: string;
}

export function LeagueHistoryModal({
  isOpen,
  onClose,
  leagueId,
  leagueName,
  leagueType,
  currentUserId,
}: LeagueHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'burned'>('matrix');

  const isLms = leagueType === 'LAST_MAN_STANDING' || leagueType === 'ALL_IN_ONE';

  // Query League History Matrix
  const { data: matrixData, isLoading: isMatrixLoading } = useQuery({
    queryKey: ['league-history-matrix', leagueId, currentUserId],
    queryFn: async () => {
      return await getLeagueHistoryMatrix(leagueId, currentUserId);
    },
    enabled: isOpen,
    staleTime: 30 * 1000,
  });

  // Query User Burned Teams
  const { data: burnedData, isLoading: isBurnedLoading } = useQuery({
    queryKey: ['user-burned-teams', leagueId, currentUserId],
    queryFn: async () => {
      return await getUserBurnedTeams(leagueId, currentUserId);
    },
    enabled: isOpen && isLms,
    staleTime: 30 * 1000,
  });

  if (!isOpen) return null;

  const gameweeks = matrixData?.gameweeks || [1, 2, 3, 4, 5];
  const players = matrixData?.players || [];
  const teams = burnedData?.teams || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-neutral-100 flex flex-col gap-5 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/40">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-neutral-100">
                  {leagueName}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-neutral-800 text-neutral-400 border border-neutral-700 font-bold">
                  Archive
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Full gameweek-by-gameweek pick history and tournament audit
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Group Pick Matrix</span>
            </button>

            {isLms && (
              <button
                type="button"
                onClick={() => setActiveTab('burned')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === 'burned'
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>My Burned Teams ({burnedData?.burnedCount ?? 0}/20)</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-neutral-500 font-mono hidden sm:block">
            GW 1 – GW 5 Premier League Season
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto min-h-[300px] pr-1">
          {activeTab === 'matrix' ? (
            /* TAB 1: GROUP PICK MATRIX */
            isMatrixLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Loading tournament pick history...</span>
              </div>
            ) : players.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-xs">
                No player records found for this league.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950/60 shadow-inner">
                <table className="w-full text-left border-collapse min-w-[640px]">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-950/90 text-neutral-400 text-[11px] uppercase tracking-wider font-mono">
                      <th className="py-3 px-4 sticky left-0 bg-neutral-950/95 z-10">Player</th>
                      {gameweeks.map((gw) => (
                        <th key={gw} className="py-3 px-3 text-center min-w-[100px]">
                          GW {gw}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80 text-xs">
                    {players.map((player) => {
                      const isCurrentUser = currentUserId === player.userId;
                      return (
                        <tr
                          key={player.userId}
                          className={`hover:bg-neutral-900/50 transition-colors ${
                            isCurrentUser ? 'bg-emerald-500/[0.04]' : ''
                          }`}
                        >
                          {/* Player cell */}
                          <td className="py-3 px-4 sticky left-0 bg-neutral-950/95 z-10">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={
                                  player.avatarUrl ||
                                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                    player.displayName
                                  )}`
                                }
                                alt={player.displayName}
                                className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 object-cover shrink-0"
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-neutral-100 flex items-center gap-1.5">
                                  {player.displayName}
                                  {isCurrentUser && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                      You
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Gameweek pick cells */}
                          {gameweeks.map((gw) => {
                            const pick = player.picksByGameweek[gw];
                            return (
                              <td key={gw} className="py-3 px-3 text-center">
                                {pick?.isMasked ? (
                                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 font-mono">
                                    <Lock className="w-2.5 h-2.5 text-neutral-500" />
                                    <span>Locked</span>
                                  </div>
                                ) : pick?.teamName ? (
                                  <div className="inline-flex flex-col items-center gap-0.5">
                                    <div className="flex items-center gap-1">
                                      {pick.crestUrl && (
                                        <img
                                          src={pick.crestUrl}
                                          alt={pick.teamName}
                                          className="w-4 h-4 object-contain"
                                        />
                                      )}
                                      <span className="font-bold text-neutral-200 text-[11px] truncate max-w-[85px]">
                                        {pick.teamTla || pick.teamName}
                                      </span>
                                    </div>
                                    {pick.result === 'SURVIVED' ? (
                                      <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> Won
                                      </span>
                                    ) : pick.result === 'LOST_LIFE' ? (
                                      <span className="text-[9px] font-bold text-rose-400 flex items-center gap-0.5">
                                        <XCircle className="w-2.5 h-2.5" /> Lost
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-amber-400 flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" /> Pending
                                      </span>
                                    )}
                                  </div>
                                ) : pick?.predictorPoints !== undefined ? (
                                  <span className="font-mono font-bold text-amber-400">
                                    +{pick.predictorPoints} pts
                                  </span>
                                ) : (
                                  <span className="text-neutral-600 font-mono text-xs">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Status cell */}
                          <td className="py-3 px-4 text-right">
                            {isLms ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                                  player.status === 'ALIVE'
                                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                                }`}
                              >
                                <Shield className="w-3 h-3" />
                                <span>
                                  {player.livesRemaining} {player.livesRemaining === 1 ? 'Life' : 'Lives'}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                <Trophy className="w-3 h-3" />
                                <span>{player.totalPoints} pts</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* TAB 2: MY BURNED TEAMS GRID */
            isBurnedLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <span>Loading team availability...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Stats overview banner */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-100">
                        {burnedData?.burnedCount ?? 0} of 20 Teams Burned
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        In LMS, you cannot pick the same club twice throughout the tournament.
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-emerald-400">
                      {burnedData?.availableCount ?? 20} Available
                    </span>
                  </div>
                </div>

                {/* 20 Teams Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition ${
                        team.isBurned
                          ? 'bg-neutral-950/60 border-neutral-800/60 opacity-60'
                          : 'bg-neutral-950 border-neutral-800 hover:border-emerald-500/40 shadow-sm'
                      }`}
                    >
                      <img
                        src={team.crestUrl}
                        alt={team.name}
                        className={`w-8 h-8 object-contain shrink-0 ${
                          team.isBurned ? 'grayscale opacity-60' : ''
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-bold truncate ${
                            team.isBurned
                              ? 'line-through text-neutral-400'
                              : 'text-neutral-100'
                          }`}
                        >
                          {team.name}
                        </div>
                        {team.isBurned ? (
                          <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Flame className="w-3 h-3 text-amber-500" />
                            <span>Burned (GW {team.gameweekNumber})</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            <span>Available</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500">
          <span>Groupbet Tournament Engine • Season 2026/2027</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
