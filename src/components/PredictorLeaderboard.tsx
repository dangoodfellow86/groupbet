'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeaguePredictorLeaderboard, PredictorLeaderboardRow } from '@/server/actions/predictor';
import { Trophy, Target, Award, Share2, Users, Flame, History, MessageCircle } from 'lucide-react';
import { StandingsShareItem } from '@/lib/sharing';

interface PredictorLeaderboardProps {
  leagueId: string;
  currentUserId?: string;
  onInviteClick?: () => void;
  onViewHistoryClick?: () => void;
  onShareStandingsClick?: (standings: StandingsShareItem[]) => void;
}

export function PredictorLeaderboard({
  leagueId,
  currentUserId,
  onInviteClick,
  onViewHistoryClick,
  onShareStandingsClick,
}: PredictorLeaderboardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['predictor-leaderboard', leagueId],
    queryFn: async () => {
      return await getLeaguePredictorLeaderboard(leagueId);
    },
    staleTime: 15 * 1000,
  });

  const leaderboard = data?.leaderboard || [];

  if (isLoading) {
    return (
      <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 flex items-center justify-center min-h-[220px]">
        <div className="flex flex-col items-center gap-2 text-xs text-neutral-400">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading Predictor Standings...</span>
        </div>
      </div>
    );
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-base" title="1st Place">🥇</span>;
    if (rank === 2) return <span className="text-base" title="2nd Place">🥈</span>;
    if (rank === 3) return <span className="text-base" title="3rd Place">🥉</span>;
    return (
      <span className="font-mono text-xs font-bold text-neutral-400 w-5 text-center">
        {rank}
      </span>
    );
  };

  return (
    <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
              <span>Predictor Standings</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                League
              </span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              {leaderboard.length} {leaderboard.length === 1 ? 'Player' : 'Players'} competing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onShareStandingsClick && leaderboard.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const standingsItems = leaderboard.slice(0, 5).map((r) => ({
                  rank: r.rank,
                  name: r.displayName,
                  score: `${r.totalPoints} pts`,
                  extra: `${r.correctExactScores} exact`,
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard Rows */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-xs flex flex-col items-center gap-2">
          <Users className="w-8 h-8 opacity-40 text-neutral-400" />
          <span>No predictions recorded yet. Predict upcoming matches to claim the top spot!</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {leaderboard.map((row) => {
            const isCurrentUser = currentUserId === row.userId;

            return (
              <div
                key={row.userId}
                className={`flex items-center justify-between p-3 rounded-xl border transition ${
                  isCurrentUser
                    ? 'bg-neutral-800/60 border-amber-500/30 shadow-sm'
                    : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700/60'
                }`}
              >
                {/* Left: Rank & Avatar & Name */}
                <div className="flex items-center gap-2.5">
                  <div className="w-6 flex items-center justify-center shrink-0">
                    {getRankBadge(row.rank)}
                  </div>

                  <img
                    src={row.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${row.displayName}`}
                    alt={row.displayName}
                    className="w-8 h-8 rounded-full bg-neutral-800 object-cover border border-neutral-700 shrink-0"
                  />

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-100 truncate max-w-[120px] sm:max-w-[150px]">
                        {row.displayName}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-amber-400 font-mono">
                          You
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Target className="w-3 h-3 text-amber-400" />
                        <span>{row.correctExactScores} exact</span>
                      </span>
                      <span>•</span>
                      <span>{row.correctOutcomes} outcomes</span>
                    </div>
                  </div>
                </div>

                {/* Right: Total Points Badge */}
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-black px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {row.totalPoints} {row.totalPoints === 1 ? 'pt' : 'pts'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History & Archive Matrix Button */}
      {onViewHistoryClick && (
        <button
          type="button"
          onClick={onViewHistoryClick}
          className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-amber-400 transition flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>View Weekly Points Matrix</span>
        </button>
      )}
    </div>
  );
}
