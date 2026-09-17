'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeagueSurvivorBoard, SurvivorBoardPlayer } from '@/server/actions/leagues';
import { Shield, Heart, Skull, Crown, Lock, Users, Share2, AlertCircle, History, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { StandingsShareItem } from '@/lib/sharing';

interface SurvivorBoardProps {
  leagueId: string;
  gameweekNumber: number;
  currentUserId?: string;
  onInviteClick?: () => void;
  onViewHistoryClick?: () => void;
  onShareStandingsClick?: (standings: StandingsShareItem[]) => void;
}

export function SurvivorBoard({
  leagueId,
  gameweekNumber,
  currentUserId,
  onInviteClick,
  onViewHistoryClick,
  onShareStandingsClick,
}: SurvivorBoardProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['survivor-board', leagueId, gameweekNumber, currentUserId],
    queryFn: async () => {
      return await getLeagueSurvivorBoard(leagueId, gameweekNumber, currentUserId);
    },
    staleTime: 15 * 1000,
  });

  const players = data?.players || [];
  const aliveCount = players.filter((p) => p.status === 'ALIVE' || p.status === 'WINNER').length;
  const eliminatedCount = players.filter((p) => p.status === 'ELIMINATED').length;

  if (isLoading) {
    return (
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 flex items-center justify-center min-h-[220px]">
        <div className="flex flex-col items-center gap-2 text-xs text-neutral-400">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading Survivor Board...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <span>Survivor Board</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                GW {gameweekNumber}
              </span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              {aliveCount} Alive • {eliminatedCount} Eliminated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onShareStandingsClick && players.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const standingsItems = players.slice(0, 5).map((p, idx) => ({
                  rank: idx + 1,
                  name: p.displayName,
                  score: p.status === 'ELIMINATED' ? 'Eliminated' : `${p.livesRemaining} lives`,
                  extra: p.currentPick?.teamName,
                }));
                onShareStandingsClick(standingsItems);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold transition cursor-pointer"
              title="Share Standings on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-blue-400/20 text-blue-400" />
              <span>Share</span>
            </button>
          )}

          {onInviteClick && (
            <button
              type="button"
              onClick={onInviteClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          )}
        </div>
      </div>

      {/* Players List */}
      {players.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-xs flex flex-col items-center gap-2">
          <Users className="w-8 h-8 opacity-40 text-neutral-400" />
          <span>No players enrolled yet. Share the invite link to get started!</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {players.map((player) => {
            const isCurrentUser = currentUserId === player.userId;
            const isWinner = player.status === 'WINNER';
            const isAlive = player.status === 'ALIVE';
            const isEliminated = player.status === 'ELIMINATED';

            return (
              <div
                key={player.userId}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  isCurrentUser
                    ? 'bg-neutral-800/60 border-emerald-500/30'
                    : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700/60'
                } ${isEliminated ? 'opacity-50' : ''}`}
              >
                {/* Left: Avatar & Name */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.displayName}`}
                      alt={player.displayName}
                      className="w-8 h-8 rounded-full bg-neutral-800 object-cover border border-neutral-700"
                    />
                    {isWinner && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-[9px] shadow">
                        👑
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-100">{player.displayName}</span>
                      {isCurrentUser && (
                        <span className="text-[10px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                          You
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isWinner ? (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                          <Crown className="w-3 h-3" /> Winner
                        </span>
                      ) : isAlive ? (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <Heart className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                          <span>
                            {player.livesRemaining} {player.livesRemaining === 1 ? 'Life' : 'Lives'} left
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-1">
                          <Skull className="w-3 h-3" /> Knocked Out
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Gameweek Pick */}
                <div className="flex items-center gap-2">
                  {player.currentPick ? (
                    player.currentPick.isMasked ? (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs font-medium text-amber-400/90 shadow-sm"
                        title="Opponent pick hidden until match kickoff"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-mono text-[11px] font-semibold">Locked</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-medium">
                        {player.currentPick.crestUrl && (
                          <img
                            src={player.currentPick.crestUrl}
                            alt={player.currentPick.teamName}
                            className="w-4 h-4 object-contain"
                          />
                        )}
                        <span className="font-bold text-neutral-200">{player.currentPick.teamTla}</span>
                        {player.currentPick.result === 'SURVIVED' && (
                          <span className="text-[10px] text-emerald-400 font-bold ml-0.5" title="Survived">✓</span>
                        )}
                        {player.currentPick.result === 'LOST_LIFE' && (
                          <span className="text-[10px] text-rose-400 font-bold ml-0.5" title="Lost Life">✗</span>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-neutral-500 italic px-2 py-1">
                      <span>No pick yet</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer History / Pick Matrix Trigger */}
      {onViewHistoryClick && (
        <button
          type="button"
          onClick={onViewHistoryClick}
          className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-emerald-400 transition flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          <History className="w-3.5 h-3.5 text-emerald-400" />
          <span>View Pick Matrix & Burned Teams</span>
        </button>
      )}
    </div>
  );
}
