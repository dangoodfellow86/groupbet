'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlayerCareerStats, TrophyBadge, PlayerTournamentItem } from '@/server/actions/profile';
import {
  Trophy,
  Award,
  Users,
  Shield,
  Target,
  Sparkles,
  Lock,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Flame,
  ArrowRight,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSelectLeague?: (leagueId: string) => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  userId,
  onSelectLeague,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'trophies' | 'tournaments'>('overview');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['player-career-stats', userId],
    queryFn: async () => {
      return await getPlayerCareerStats(userId);
    },
    enabled: isOpen,
    staleTime: 30 * 1000,
  });

  if (!isOpen) return null;

  const user = data?.user;
  const metrics = data?.metrics;
  const badges = data?.badges || [];
  const tournaments = data?.tournaments || [];

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-neutral-100 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Player Profile & Trophy Cabinet</h2>
              <p className="text-xs text-neutral-400">Career statistics and tournament achievements</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Profile Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={
                user?.avatarUrl ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.displayName || 'Player')}`
              }
              alt={user?.displayName || 'Player'}
              className="w-14 h-14 rounded-2xl bg-neutral-800 border-2 border-amber-500/30 object-cover shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-100">{user?.displayName}</h3>
                {user?.isGuest ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-400 text-[10px] font-semibold">
                    Guest
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Member since {user?.memberSince || '2026'} • {unlockedCount} of {badges.length} Trophies Unlocked
              </p>
            </div>
          </div>

          {/* Badge completion pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Award className="w-4 h-4" />
            <span>{unlockedCount} / {badges.length} Badges</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Career Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trophies')}
            className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'trophies'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Trophy Cabinet ({unlockedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tournaments')}
            className={`py-2 px-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'tournaments'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>My Tournaments ({tournaments.length})</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-neutral-400">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Calculating career stats...</span>
          </div>
        )}

        {/* TAB 1: CAREER OVERVIEW */}
        {!isLoading && activeTab === 'overview' && metrics && (
          <div className="flex flex-col gap-5">
            {/* 4 Hero Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Trophies</span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                  {metrics.tournamentsWon}
                </div>
                <span className="text-[10px] text-neutral-500">Tournaments Won</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Points</span>
                  <Award className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-black font-mono text-blue-400 mt-1">
                  {metrics.totalPredictorPoints}
                </div>
                <span className="text-[10px] text-neutral-500">Predictor Score</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Survival</span>
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                  {metrics.lmsWeeksSurvived}
                </div>
                <span className="text-[10px] text-neutral-500">Rounds Survived</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col gap-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Exact Hits</span>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black font-mono text-purple-400 mt-1">
                  {metrics.correctExactScores}
                </div>
                <span className="text-[10px] text-neutral-500">Correct Scorelines</span>
              </div>
            </div>

            {/* Performance Analytics Box */}
            <div className="p-4 rounded-2xl bg-neutral-950/90 border border-neutral-800 flex flex-col gap-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Performance Analytics
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                  <span className="text-[11px] text-neutral-400 block">Total Picks Made</span>
                  <span className="text-base font-bold font-mono text-neutral-100 mt-0.5 block">
                    {metrics.totalPicksMade} picks
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                  <span className="text-[11px] text-neutral-400 block">Correct Match Outcomes</span>
                  <span className="text-base font-bold font-mono text-neutral-100 mt-0.5 block">
                    {metrics.correctOutcomes} matches
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
                  <span className="text-[11px] text-neutral-400 block">Tournament Win Rate</span>
                  <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">
                    {metrics.tournamentsEntered > 0
                      ? `${Math.round((metrics.tournamentsWon / metrics.tournamentsEntered) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TROPHY CABINET */}
        {!isLoading && activeTab === 'trophies' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition flex items-start gap-3.5 ${
                  badge.isUnlocked
                    ? 'bg-gradient-to-br from-amber-500/10 via-neutral-900 to-neutral-950 border-amber-500/40 shadow-sm shadow-amber-950/20'
                    : 'bg-neutral-950/60 border-neutral-800/80 opacity-60'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                    badge.isUnlocked
                      ? 'bg-amber-500/15 border border-amber-500/30'
                      : 'bg-neutral-900 border border-neutral-800 grayscale'
                  }`}
                >
                  {badge.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4
                      className={`text-sm font-bold truncate ${
                        badge.isUnlocked ? 'text-amber-300' : 'text-neutral-300'
                      }`}
                    >
                      {badge.title}
                    </h4>
                    {badge.isUnlocked ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Won
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 leading-snug">
                    {badge.description}
                  </p>
                  <span className="text-[10px] font-mono text-neutral-500 mt-2 block">
                    {badge.progressText}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: MY TOURNAMENTS */}
        {!isLoading && activeTab === 'tournaments' && (
          <div className="flex flex-col gap-2.5">
            {tournaments.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                <Users className="w-8 h-8 opacity-40 text-neutral-400" />
                <span>You haven't joined any tournaments yet. Join with an invite code to get started!</span>
              </div>
            ) : (
              tournaments.map((t) => (
                <div
                  key={t.leagueId}
                  className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 shrink-0">
                      {t.leagueType === 'ALL_IN_ONE' ? (
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                      ) : t.leagueType === 'PREDICTOR' ? (
                        <Target className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-100">{t.leagueName}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                          {t.leagueType === 'ALL_IN_ONE'
                            ? 'All-in-One'
                            : t.leagueType === 'PREDICTOR'
                            ? 'Predictor'
                            : 'LMS'}
                        </span>
                        {t.role === 'CREATOR' && (
                          <span className="text-[10px] text-amber-400 font-semibold">Host</span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {t.memberCount} Players • Code: <span className="font-mono text-neutral-300">{t.inviteCode}</span>
                        {t.lmsLives !== undefined && ` • ${t.lmsLives} Lives Left`}
                        {t.predictorPoints !== undefined && ` • ${t.predictorPoints} Pts`}
                      </p>
                    </div>
                  </div>

                  {onSelectLeague && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLeague(t.leagueId);
                        onClose();
                      }}
                      className="self-end sm:self-auto flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <span>Switch to Game</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal Footer */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition cursor-pointer"
        >
          Close Profile
        </button>
      </div>
    </div>
  );
}
