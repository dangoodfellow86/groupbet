'use client';

import React, { useState, useEffect } from 'react';
import { WeeklyFixtures } from '@/components/WeeklyFixtures';
import { LeagueTable } from '@/components/LeagueTable';
import { LmsPickModal } from '@/components/LmsPickModal';
import { PredictorPickModal } from '@/components/PredictorPickModal';
import { CreateGameModal } from '@/components/CreateGameModal';
import { ShareGameModal } from '@/components/ShareGameModal';
import { JoinCodeModal } from '@/components/JoinCodeModal';
import { LeagueSwitcher } from '@/components/LeagueSwitcher';
import { SurvivorBoard } from '@/components/SurvivorBoard';
import { PredictorLeaderboard } from '@/components/PredictorLeaderboard';
import { SimulatorModal } from '@/components/SimulatorModal';
import { LeagueHistoryModal } from '@/components/LeagueHistoryModal';
import { ProfileModal } from '@/components/ProfileModal';
import { CommissionerModal } from '@/components/CommissionerModal';
import { AuthModal } from '@/components/AuthModal';
import { UserProfileMenu } from '@/components/UserProfileMenu';
import { MatchdayLiveNotifier } from '@/components/MatchdayLiveNotifier';
import { SquadPicksLogo } from '@/components/SquadPicksLogo';
import { MobileBottomNav, MobileNavTab } from '@/components/MobileBottomNav';
import { StandingsShareItem } from '@/lib/sharing';
import { useUserSession } from '@/hooks/useUserSession';
import { useMatchdayRealtime } from '@/hooks/useMatchdayRealtime';
import { FixturesApiResponse } from '@/hooks/useFootballData';
import {
  getUserGameweekPredictions,
  getLeagueGameweekPredictorClaims,
  removePredictorPicks,
  UserFixturePrediction,
  PredictorMatchClaim,
} from '@/server/actions/predictor';
import { removeLmsPick, getUserLmsRoundPicks } from '@/server/actions/lms';
import { getLeagueGameweekLmsPicks } from '@/server/actions/leagues';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  ShieldCheck,
  Flame,
  Users,
  Swords,
  Heart,
  Share2,
  Plus,
  Sparkles,
  KeyRound,
  Shield,
  ShieldAlert,
  Target,
  Zap,
  Gamepad2,
  Copy,
  Check,
} from 'lucide-react';

type FixtureItem = FixturesApiResponse['fixtures'][number];

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const {
    user,
    isAuthenticated,
    leagues,
    activeLeague,
    activeLeagueId,
    setActiveLeagueId,
    refetch: refetchSession,
  } = useUserSession();

  const [gameMode, setGameMode] = useState<'lms' | 'predictor'>('lms');
  const [mobileTab, setMobileTab] = useState<MobileNavTab>('picks');
  const [desktopView, setDesktopView] = useState<'game' | 'matchday'>('game');
  const [selectedGameweek, setSelectedGameweek] = useState<number>(5);
  const [hasCopiedInviteCode, setHasCopiedInviteCode] = useState(false);

  // Synchronize game mode with active league type
  useEffect(() => {
    if (activeLeague?.type === 'PREDICTOR') {
      setGameMode('predictor');
    } else if (activeLeague?.type === 'LAST_MAN_STANDING') {
      setGameMode('lms');
    }
  }, [activeLeague?.id, activeLeague?.type]);

  const handleCopyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setHasCopiedInviteCode(true);
      setTimeout(() => setHasCopiedInviteCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy invite code:', err);
    }
  };

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isJoinCodeModalOpen, setIsJoinCodeModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCommissionerModalOpen, setIsCommissionerModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [authPrompt, setAuthPrompt] = useState<{ title?: string; subtitle?: string } | null>(null);
  const [authErrorParam, setAuthErrorParam] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authErr = params.get('auth_error');
      if (authErr) {
        setAuthErrorParam(
          authErr === 'true'
            ? 'Authentication could not be completed.'
            : decodeURIComponent(authErr)
        );
        setIsAuthModalOpen(true);
        // Clean up URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete('auth_error');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    }
  }, []);

  const requireAuth = (title: string, subtitle: string, mode: 'signin' | 'signup' = 'signup') => {
    setAuthPrompt({ title, subtitle });
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleCreateGameClick = () => {
    if (!isAuthenticated) {
      requireAuth(
        'Create a Free Account to Host Games',
        'Sign in or register to create a game and invite your friends.'
      );
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleJoinCodeClick = () => {
    if (!isAuthenticated) {
      requireAuth(
        'Sign In to Join with Code',
        'Sign in or create an account to enter a tournament invite code.'
      );
      return;
    }
    setIsJoinCodeModalOpen(true);
  };

  // LMS Pick Modal State
  const [isPickModalOpen, setIsPickModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<FixtureItem['home_team'] | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<FixtureItem | null>(null);
  const [confirmedPickTeamId, setConfirmedPickTeamId] = useState<string | null>(null);

  // Predictor Pick Modal State
  const [isPredictorModalOpen, setIsPredictorModalOpen] = useState(false);
  const [selectedPredictorFixture, setSelectedPredictorFixture] = useState<FixtureItem | null>(null);

  // Recently created league info for share modal
  const [shareLeagueData, setShareLeagueData] = useState<{
    name: string;
    inviteCode: string;
    type?: string;
  } | null>(null);
  const [shareModalTab, setShareModalTab] = useState<'invite' | 'deadline' | 'standings'>('invite');
  const [shareStandingsData, setShareStandingsData] = useState<StandingsShareItem[]>([]);

  // Query submitted predictions for active league and selected gameweek
  const { data: predictionsData } = useQuery({
    queryKey: ['gameweek-predictions', activeLeague?.id, selectedGameweek, user?.id],
    queryFn: async () => {
      if (!activeLeague?.id) return {};
      const res = await getUserGameweekPredictions(activeLeague.id, selectedGameweek, user?.id);
      return res.predictions || {};
    },
    enabled: !!activeLeague?.id,
    staleTime: 15 * 1000,
  });

  const userPredictions: Record<string, UserFixturePrediction> = predictionsData || {};

  // Supabase Realtime WebSocket connection for live matchday sync
  const { connectionStatus, latestEvent, liveMatchesCount, clearLatestEvent } = useMatchdayRealtime({
    leagueId: activeLeague?.id,
    gameweekNumber: selectedGameweek,
    currentUserId: user?.id,
    userLmsTeamId: confirmedPickTeamId,
    userPredictorFixtureIds: Object.keys(userPredictions),
  });

  // Query claimed LMS team picks for active league and selected gameweek
  const { data: lmsClaimsData } = useQuery({
    queryKey: ['lms-team-claims', activeLeague?.id, selectedGameweek, user?.id],
    queryFn: async () => {
      if (!activeLeague?.id) return { success: true, claims: {}, exclusiveTeamPicks: true };
      return await getLeagueGameweekLmsPicks(activeLeague.id, selectedGameweek, user?.id);
    },
    enabled: !!activeLeague?.id,
    staleTime: 15 * 1000,
  });

  const leagueTeamClaims = lmsClaimsData?.claims || {};

  // Query user's LMS picks across the active round (Burned Teams)
  const { data: userLmsPicksData } = useQuery({
    queryKey: ['user-lms-picks', activeLeague?.id, user?.id],
    queryFn: async () => {
      if (!activeLeague?.id || !user?.id) return null;
      return await getUserLmsRoundPicks(activeLeague.id, user.id);
    },
    enabled: Boolean(activeLeague?.id && user?.id),
    staleTime: 15 * 1000,
  });

  // Calculate burned team IDs for the currently selected gameweek
  // (Teams picked in ANY OTHER gameweek of this round are burned and unavailable for selectedGameweek)
  const burnedTeamIdsForSelectedGw: string[] = React.useMemo(() => {
    if (!userLmsPicksData?.picksByGameweek) return [];
    const ids: string[] = [];
    for (const [gwStr, pick] of Object.entries(userLmsPicksData.picksByGameweek)) {
      if (Number(gwStr) !== selectedGameweek) {
        ids.push(String(pick.teamId));
        if (pick.teamExternalId) {
          ids.push(String(pick.teamExternalId));
        }
      }
    }
    return ids;
  }, [userLmsPicksData, selectedGameweek]);

  // Determine the active user's pick for the currently selected gameweek
  const activeGameweekPickTeamId = React.useMemo(() => {
    if (userLmsPicksData?.picksByGameweek?.[selectedGameweek]) {
      return String(userLmsPicksData.picksByGameweek[selectedGameweek].teamId);
    }
    const ownClaim = Object.values(leagueTeamClaims).find((c) => c.isOwn);
    return ownClaim?.teamId || confirmedPickTeamId || null;
  }, [userLmsPicksData, selectedGameweek, leagueTeamClaims, confirmedPickTeamId]);

  // Query claimed Predictor matches for active league and selected gameweek
  const { data: predictorClaimsData } = useQuery({
    queryKey: ['predictor-match-claims', activeLeague?.id, selectedGameweek, user?.id],
    queryFn: async () => {
      if (!activeLeague?.id) return { success: true, claims: {}, exclusiveMatches: true };
      return await getLeagueGameweekPredictorClaims(activeLeague.id, selectedGameweek, user?.id);
    },
    enabled: !!activeLeague?.id,
    staleTime: 15 * 1000,
  });

  const predictorMatchClaims = predictorClaimsData?.claims || {};

  const isCommissioner = Boolean(
    isAuthenticated &&
    activeLeague &&
    (activeLeague.role === 'ADMIN' || (user?.id && activeLeague.creator_id === user.id))
  );

  // Handlers for LMS
  const handleSelectTeam = (team: FixtureItem['home_team'], fixture: FixtureItem) => {
    if (!isAuthenticated) {
      requireAuth(
        'Sign In to Lock in LMS Pick',
        'Create an account or sign in to pick teams and join the survivor competition.'
      );
      return;
    }
    setSelectedTeam(team);
    setSelectedFixture(fixture);
    setIsPickModalOpen(true);
  };

  const handlePickConfirmed = (teamId: string) => {
    setConfirmedPickTeamId(teamId);
    queryClient.invalidateQueries({ queryKey: ['user-lms-picks'] });
    queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
    queryClient.invalidateQueries({ queryKey: ['lms-team-claims'] });
    queryClient.invalidateQueries({ queryKey: ['user-session'] });
  };

  const handleRemoveLmsPick = async (fixture: FixtureItem) => {
    if (!isAuthenticated) {
      requireAuth('Sign In to Manage Picks', 'Please sign in to modify your picks.');
      return;
    }
    if (!activeLeague?.entryId) return;
    const res = await removeLmsPick({
      entryId: activeLeague.entryId,
      gameweekId: String(fixture.gameweek_number || selectedGameweek),
    });
    if (res.success) {
      setConfirmedPickTeamId(null);
      queryClient.invalidateQueries({ queryKey: ['user-lms-picks'] });
      queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
      queryClient.invalidateQueries({ queryKey: ['lms-team-claims'] });
      queryClient.invalidateQueries({ queryKey: ['user-session'] });
    }
  };

  const handleLmsPickRemoved = () => {
    setConfirmedPickTeamId(null);
    queryClient.invalidateQueries({ queryKey: ['user-lms-picks'] });
    queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
    queryClient.invalidateQueries({ queryKey: ['lms-team-claims'] });
    queryClient.invalidateQueries({ queryKey: ['user-session'] });
  };

  // Handlers for Predictor
  const handlePredictFixture = (fixture: FixtureItem) => {
    if (!isAuthenticated) {
      requireAuth(
        'Sign In to Predict Matches',
        'Create an account or sign in to submit predictions and climb the leaderboard.'
      );
      return;
    }
    setSelectedPredictorFixture(fixture);
    setIsPredictorModalOpen(true);
  };

  const handlePredictionSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['gameweek-predictions'] });
    queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['predictor-match-claims'] });
    queryClient.invalidateQueries({ queryKey: ['lms-team-claims'] });
    queryClient.invalidateQueries({ queryKey: ['user-session'] });
  };

  const handleRemovePredictorPick = async (fixture: FixtureItem) => {
    if (!isAuthenticated) {
      requireAuth('Sign In to Manage Picks', 'Please sign in to modify your picks.');
      return;
    }
    if (!activeLeague?.id) return;
    const res = await removePredictorPicks({
      leagueId: activeLeague.id,
      fixtureId: String(fixture.id || fixture.external_id),
      userId: user?.id,
    });
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['gameweek-predictions'] });
      queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['predictor-match-claims'] });
      queryClient.invalidateQueries({ queryKey: ['lms-team-claims'] });
      queryClient.invalidateQueries({ queryKey: ['user-session'] });
    }
  };

  const handlePredictorPickRemoved = () => {
    queryClient.invalidateQueries({ queryKey: ['gameweek-predictions'] });
    queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['predictor-match-claims'] });
    queryClient.invalidateQueries({ queryKey: ['lms-team-claims'] });
    queryClient.invalidateQueries({ queryKey: ['user-session'] });
  };

  const handleGameCreated = (res: any) => {
    setIsCreateModalOpen(false);
    refetchSession();
    if (res.league) {
      setActiveLeagueId(res.league.id);
      if (res.league.type === 'PREDICTOR') {
        setGameMode('predictor');
      } else {
        setGameMode('lms');
      }
      setShareLeagueData({
        name: res.league.name,
        inviteCode: res.inviteCode,
        type: res.league.type,
      });
      setShareModalTab('invite');
      setIsShareModalOpen(true);
    }
  };

  const handleOpenShare = (
    tab: 'invite' | 'deadline' | 'standings' | React.MouseEvent = 'invite',
    standings?: StandingsShareItem[]
  ) => {
    if (!activeLeague) return;
    const cleanTab = typeof tab === 'string' ? tab : 'invite';
    setShareLeagueData({
      name: activeLeague.name,
      inviteCode: activeLeague.invite_code,
      type: activeLeague.type,
    });
    setShareModalTab(cleanTab);
    if (standings) {
      setShareStandingsData(standings);
    }
    setIsShareModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-brand-950 text-brand-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-brand-800/90 bg-brand-950/80 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & League Switcher */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile: compact icon crest */}
            <SquadPicksLogo size="sm" variant="mark" className="sm:hidden shrink-0" />
            {/* Desktop: full logo wordmark */}
            <SquadPicksLogo size="md" variant="full" className="hidden sm:flex shrink-0" />

            {/* League Switcher Dropdown */}
            <LeagueSwitcher
              leagues={leagues}
              activeLeague={activeLeague}
              onSelectLeague={(id) => {
                setActiveLeagueId(id);
                const selected = leagues.find((l) => l.id === id);
                if (selected?.type === 'PREDICTOR') setGameMode('predictor');
                else if (selected?.type === 'LAST_MAN_STANDING') setGameMode('lms');
              }}
              onCreateGameClick={handleCreateGameClick}
              onShareClick={handleOpenShare}
              onJoinCodeClick={handleJoinCodeClick}
            />
          </div>

          {/* Right Nav Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {activeLeague && (
              <button
                type="button"
                onClick={handleOpenShare}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
                title="Invite Friends"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Invite Friends</span>
              </button>
            )}

            {/* Real-time Live Sync Status Badge */}
            <div
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono select-none"
              title={
                connectionStatus === 'connected'
                  ? 'Real-Time WebSocket Sync Active'
                  : connectionStatus === 'connecting'
                  ? 'Connecting to Live Match Stream...'
                  : 'Real-Time Sync Disconnected'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? liveMatchesCount > 0
                      ? 'bg-rose-500 animate-ping shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                      : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : connectionStatus === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-neutral-600'
                }`}
              />
              <span className="text-[11px] font-semibold text-neutral-300 hidden md:inline">
                {connectionStatus === 'connected'
                  ? liveMatchesCount > 0
                    ? `${liveMatchesCount} In-Play`
                    : 'Live Sync'
                  : connectionStatus === 'connecting'
                  ? 'Connecting'
                  : 'Offline'}
              </span>
            </div>

            {/* Live Match Simulator Button (desktop only, accessible on mobile via League tab) */}
            <button
              type="button"
              onClick={() => setIsSimulatorOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition shadow-sm cursor-pointer"
              title="Open Matchday Simulator"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Simulator</span>
            </button>

            {/* New Game Button (desktop only, accessible on mobile via League tab) */}
            <button
              type="button"
              onClick={handleCreateGameClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Game</span>
            </button>

            {/* User Profile Menu */}
            <UserProfileMenu
              user={user}
              onOpenAuth={(mode = 'signin') => {
                setAuthModalMode(mode);
                setIsAuthModalOpen(true);
              }}
              onOpenJoinCode={handleJoinCodeClick}
              onOpenProfile={() => setIsProfileModalOpen(true)}
              onUserLoggedOut={() => {
                refetchSession();
                queryClient.invalidateQueries({ queryKey: ['user-session'] });
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8">
        {/* Welcome Callout if No Leagues Joined Yet */}
        {leagues.length === 0 ? (
          <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-emerald-950/40 border border-emerald-500/20 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Premier League Season
                </span>
                <span className="text-xs text-neutral-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Play with mates
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-100">
                Start a Last Man Standing or Match Predictor game.
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Create a private pool in 10 seconds, share the invite link on WhatsApp, and compete with your friends week-in, week-out!
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleCreateGameClick}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-xl shadow-emerald-950/60"
              >
                <Plus className="w-4 h-4" />
                <span>Create Game</span>
              </button>
              <button
                type="button"
                onClick={handleJoinCodeClick}
                className="px-4 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-semibold text-xs sm:text-sm transition flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-neutral-400" />
                <span>Join with Code</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-3 sm:p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                {activeLeague?.type === 'PREDICTOR' ? (
                  <Trophy className="w-4 h-4 text-amber-400" />
                ) : activeLeague?.type === 'ALL_IN_ONE' ? (
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <div className="font-bold text-neutral-100 text-sm truncate">{activeLeague?.name}</div>
                  {activeLeague?.type === 'ALL_IN_ONE' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-emerald-500/20 to-amber-500/20 text-emerald-300 border border-emerald-500/30">
                      All-in-One
                    </span>
                  )}
                  {activeLeague?.current_round && activeLeague.current_round > 1 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Round {activeLeague.current_round}
                    </span>
                  )}
                </div>
                <div className="text-neutral-400 text-[11px] flex items-center gap-2 mt-0.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => activeLeague?.invite_code && handleCopyInviteCode(activeLeague.invite_code)}
                    className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                    title="Click to copy invite code"
                  >
                    <span>Code: <strong>{activeLeague?.invite_code}</strong></span>
                    {hasCopiedInviteCode ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-neutral-500 hover:text-emerald-400" />
                    )}
                  </button>
                  <span>•</span>
                  <span>Role: {activeLeague?.role}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/60">
              {isCommissioner && (
                <button
                  type="button"
                  onClick={() => setIsCommissionerModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition cursor-pointer shadow-sm"
                  title="League Commissioner Tools"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Commissioner</span>
                </button>
              )}

              {activeLeague?.type === 'ALL_IN_ONE' ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/20">
                    <Heart className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                    <span>{activeLeague.lives_remaining ?? 1} {(activeLeague.lives_remaining ?? 1) === 1 ? 'Life' : 'Lives'} Left</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/10 font-mono text-xs font-bold text-amber-400 border border-amber-500/20">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{activeLeague?.points ?? 0} Pts</span>
                  </span>
                </div>
              ) : activeLeague?.type === 'LAST_MAN_STANDING' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400 border border-emerald-500/20">
                  <Heart className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                  <span>{activeLeague.lives_remaining ?? 1} {(activeLeague.lives_remaining ?? 1) === 1 ? 'Life' : 'Lives'} Left</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500/10 font-mono text-xs font-bold text-amber-400 border border-amber-500/20">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeLeague?.points ?? 0} Points</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleOpenShare}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
                title="Share Game"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        )}

        {/* Game Mode / View Navigation Bar */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-neutral-800/80">
          {/* Left: League Game Mode indicator or All-in-One selector */}
          <div className="flex items-center gap-2">
            {activeLeague?.type === 'ALL_IN_ONE' || !activeLeague ? (
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setGameMode('lms')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    gameMode === 'lms'
                      ? 'bg-neutral-800 text-emerald-400 shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Last Man Standing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode('predictor')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    gameMode === 'predictor'
                      ? 'bg-neutral-800 text-amber-400 shadow-sm font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Predictor</span>
                </button>
              </div>
            ) : activeLeague.type === 'LAST_MAN_STANDING' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Last Man Standing</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold">
                <Swords className="w-4 h-4 text-amber-400" />
                <span>Match Predictor</span>
              </div>
            )}
          </div>

          {/* Right: Desktop View Switcher (Game Dashboard vs Matchday Live Hub) */}
          <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDesktopView('game')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                desktopView === 'game'
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Game Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => setDesktopView('matchday')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                desktopView === 'matchday'
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              <span>Matchday Live Hub</span>
              {liveMatchesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {liveMatchesCount} LIVE
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Desktop 2-Column Grid (lg: and above) */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-8 items-start">
          {/* Main Fixtures Column */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            <WeeklyFixtures
              initialGameweek={5}
              gameweek={selectedGameweek}
              onGameweekChange={setSelectedGameweek}
              selectedTeamId={activeGameweekPickTeamId}
              pickedTeamIds={burnedTeamIdsForSelectedGw}
              leagueTeamClaims={leagueTeamClaims}
              predictorMatchClaims={predictorMatchClaims}
              onSelectTeam={handleSelectTeam}
              onRemoveLmsPick={handleRemoveLmsPick}
              interactive={desktopView === 'game'}
              gameMode={desktopView === 'matchday' ? 'fixtures' : gameMode}
              predictions={userPredictions}
              onPredictFixture={handlePredictFixture}
              onRemovePredictorPick={handleRemovePredictorPick}
              onNudgeClick={() => handleOpenShare('deadline')}
            />
          </section>

          {/* Right Sidebar Column */}
          <aside className="lg:col-span-4 flex flex-col gap-6 sticky top-20">
            {desktopView === 'game' ? (
              <>
                {gameMode === 'lms' && activeLeague && (
                  <SurvivorBoard
                    leagueId={activeLeague.id}
                    gameweekNumber={selectedGameweek}
                    currentUserId={user?.id}
                    burnedCount={userLmsPicksData?.burnedCount}
                    availableCount={userLmsPicksData?.availableCount}
                    onInviteClick={() => handleOpenShare('invite')}
                    onShareStandingsClick={(standings) => handleOpenShare('standings', standings)}
                    onViewHistoryClick={() => setIsHistoryModalOpen(true)}
                  />
                )}

                {gameMode === 'predictor' && activeLeague && (
                  <PredictorLeaderboard
                    leagueId={activeLeague.id}
                    currentUserId={user?.id}
                    onInviteClick={() => handleOpenShare('invite')}
                    onShareStandingsClick={(standings) => handleOpenShare('standings', standings)}
                    onViewHistoryClick={() => setIsHistoryModalOpen(true)}
                  />
                )}

                <LeagueTable />

                {/* Rules Overview Card (Adaptive to game mode) */}
                {gameMode === 'predictor' ? (
                  <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur text-xs text-neutral-400 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <Target className="w-4 h-4" />
                      <span>Predictor Scoring Rules</span>
                    </div>
                    <p>• <strong className="text-neutral-200">Exact Score</strong>: +3 Points for guessing the exact final scoreline.</p>
                    <p>• <strong className="text-neutral-200">Match Outcome (1X2)</strong>: +1 Point for predicting Home Win, Draw, or Away Win.</p>
                    <p>• <strong className="text-neutral-200">Both Teams to Score (BTTS)</strong>: +1 Point for predicting Yes/No.</p>
                    <p>• <strong className="text-neutral-200">Over/Under 2.5 Goals</strong>: +1 Point for predicting total goals.</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur text-xs text-neutral-400 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-neutral-200 font-bold">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>Last Man Standing Rules</span>
                    </div>
                    <p>1. Pick 1 team to win outright each gameweek before kickoff.</p>
                    <p>2. If your club draws or loses, you lose a life.</p>
                    <p>3. You cannot pick the same club twice throughout the tournament.</p>
                  </div>
                )}
              </>
            ) : (
              /* Matchday Live Hub Right Column */
              <>
                <LeagueTable />
                <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur text-xs text-neutral-400 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Flame className="w-4 h-4" />
                    <span>Matchday Live Center</span>
                  </div>
                  <p className="text-neutral-300">
                    Live match events, goal alerts, and score settlements sync automatically in real-time.
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[11px]">
                    <span className="text-neutral-400">Sync Status:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{connectionStatus === 'connected' ? 'Connected' : 'Reconnecting'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Live Matches:</span>
                    <span className="font-mono text-rose-400 font-semibold">{liveMatchesCount} In-Play</span>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>

        {/* Mobile View Switching (< lg) */}
        <div className="flex flex-col gap-5 lg:hidden">
          {/* Tab 1: Picks */}
          {mobileTab === 'picks' && (
            <WeeklyFixtures
              initialGameweek={5}
              gameweek={selectedGameweek}
              onGameweekChange={setSelectedGameweek}
              selectedTeamId={activeGameweekPickTeamId}
              pickedTeamIds={burnedTeamIdsForSelectedGw}
              leagueTeamClaims={leagueTeamClaims}
              predictorMatchClaims={predictorMatchClaims}
              onSelectTeam={handleSelectTeam}
              onRemoveLmsPick={handleRemoveLmsPick}
              interactive={true}
              gameMode={gameMode}
              predictions={userPredictions}
              onPredictFixture={handlePredictFixture}
              onRemovePredictorPick={handleRemovePredictorPick}
              onNudgeClick={() => handleOpenShare('deadline')}
            />
          )}

          {/* Tab 2: Standings */}
          {mobileTab === 'standings' && (
            <div className="flex flex-col gap-5">
              {gameMode === 'lms' && activeLeague && (
                <SurvivorBoard
                  leagueId={activeLeague.id}
                  gameweekNumber={selectedGameweek}
                  currentUserId={user?.id}
                  burnedCount={userLmsPicksData?.burnedCount}
                  availableCount={userLmsPicksData?.availableCount}
                  onInviteClick={() => handleOpenShare('invite')}
                  onShareStandingsClick={(standings) => handleOpenShare('standings', standings)}
                  onViewHistoryClick={() => setIsHistoryModalOpen(true)}
                />
              )}

              {gameMode === 'predictor' && activeLeague && (
                <PredictorLeaderboard
                  leagueId={activeLeague.id}
                  currentUserId={user?.id}
                  onInviteClick={() => handleOpenShare('invite')}
                  onShareStandingsClick={(standings) => handleOpenShare('standings', standings)}
                  onViewHistoryClick={() => setIsHistoryModalOpen(true)}
                />
              )}

              {/* Rules Overview Card */}
              {gameMode === 'predictor' ? (
                <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur text-xs text-neutral-400 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Target className="w-4 h-4" />
                    <span>Predictor Scoring Rules</span>
                  </div>
                  <p>• <strong className="text-neutral-200">Exact Score</strong>: +3 Points for guessing exact scoreline.</p>
                  <p>• <strong className="text-neutral-200">Match Outcome (1X2)</strong>: +1 Point for predicting 1X2 outcome.</p>
                  <p>• <strong className="text-neutral-200">Both Teams to Score</strong>: +1 Point for Yes/No.</p>
                  <p>• <strong className="text-neutral-200">Over/Under 2.5 Goals</strong>: +1 Point for over/under.</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur text-xs text-neutral-400 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-neutral-200 font-bold">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Last Man Standing Rules</span>
                  </div>
                  <p>1. Pick 1 team to win outright each gameweek before kickoff.</p>
                  <p>2. If your club draws or loses, you lose a life.</p>
                  <p>3. You cannot pick the same club twice throughout the tournament.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Matchday Live Hub */}
          {mobileTab === 'matchday' && (
            <div className="flex flex-col gap-5">
              <WeeklyFixtures
                initialGameweek={5}
                gameweek={selectedGameweek}
                onGameweekChange={setSelectedGameweek}
                interactive={false}
                gameMode="fixtures"
                onNudgeClick={() => handleOpenShare('deadline')}
              />
              <LeagueTable />
            </div>
          )}

          {/* Tab 4: Mobile League Hub */}
          {mobileTab === 'league' && (
            <div className="flex flex-col gap-4">
              {activeLeague ? (
                <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        {activeLeague.type === 'PREDICTOR' ? (
                          <Trophy className="w-5 h-5 text-amber-400" />
                        ) : activeLeague.type === 'ALL_IN_ONE' ? (
                          <Sparkles className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-neutral-100 text-sm">{activeLeague.name}</h3>
                        <p className="text-[11px] text-neutral-400">Role: {activeLeague.role}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                      Round {activeLeague.current_round || 1}
                    </span>
                  </div>

                  {/* Invite Code row */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-neutral-400 uppercase font-mono">Invite Code</span>
                      <span className="font-mono font-bold text-sm text-emerald-400">{activeLeague.invite_code}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyInviteCode(activeLeague.invite_code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition cursor-pointer"
                    >
                      {hasCopiedInviteCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{hasCopiedInviteCode ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* WhatsApp Invite Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenShare('invite')}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Invite Friends on WhatsApp</span>
                  </button>

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsHistoryModalOpen(true)}
                      className="w-full min-h-[40px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700/60 transition cursor-pointer"
                    >
                      <span>View Pick Matrix & Burned Teams</span>
                    </button>

                    {isCommissioner && (
                      <button
                        type="button"
                        onClick={() => setIsCommissionerModalOpen(true)}
                        className="w-full min-h-[40px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition cursor-pointer"
                      >
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span>League Commissioner Tools</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsSimulatorOpen(true)}
                      className="w-full min-h-[40px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-xs font-bold transition cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Launch Matchday Simulator</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-center flex flex-col items-center gap-3">
                  <Users className="w-8 h-8 text-neutral-500" />
                  <p className="text-xs text-neutral-300">No active league selected.</p>
                </div>
              )}

              {/* Create / Join buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCreateGameClick}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Game</span>
                </button>
                <button
                  type="button"
                  onClick={handleJoinCodeClick}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Join with Code</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        gameMode={gameMode}
        leagueType={activeLeague?.type}
        liveMatchesCount={liveMatchesCount}
        hasPickForGameweek={
          gameMode === 'lms'
            ? Boolean(activeGameweekPickTeamId)
            : Boolean(Object.keys(userPredictions).length > 0)
        }
      />

      {/* LMS Pick Modal */}
      <LmsPickModal
        isOpen={isPickModalOpen}
        onClose={() => setIsPickModalOpen(false)}
        selectedTeam={selectedTeam}
        fixture={selectedFixture}
        gameweek={selectedFixture?.gameweek_number || selectedGameweek}
        entryId={activeLeague?.entryId}
        pickedTeamIds={burnedTeamIdsForSelectedGw}
        leagueTeamClaims={leagueTeamClaims}
        onPickConfirmed={handlePickConfirmed}
        onPickRemoved={handleLmsPickRemoved}
      />

      {/* Predictor Pick Modal */}
      <PredictorPickModal
        isOpen={isPredictorModalOpen}
        onClose={() => setIsPredictorModalOpen(false)}
        fixture={selectedPredictorFixture}
        leagueId={activeLeague?.id || 'demo-league'}
        userId={user?.id}
        initialPrediction={
          selectedPredictorFixture
            ? userPredictions[selectedPredictorFixture.id] ||
              userPredictions[String(selectedPredictorFixture.external_id)] ||
              null
            : null
        }
        hasOtherGameweekPick={
          Boolean(
            selectedPredictorFixture &&
            Object.keys(userPredictions).some(
              (fid) =>
                fid !== String(selectedPredictorFixture.id) &&
                fid !== String(selectedPredictorFixture.external_id)
            )
          )
        }
        onPredictionSaved={handlePredictionSaved}
        onPredictionRemoved={handlePredictorPickRemoved}
      />

      {/* Create Game Modal */}
      <CreateGameModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultUserName={user?.display_name}
        defaultUserEmail={user?.email}
        onGameCreated={handleGameCreated}
      />

      {/* Share Game Modal */}
      {shareLeagueData && (
        <ShareGameModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          leagueName={shareLeagueData.name}
          inviteCode={shareLeagueData.inviteCode}
          leagueType={shareLeagueData.type}
          gameweekNumber={selectedGameweek}
          standings={shareStandingsData}
          initialTab={shareModalTab}
        />
      )}

      {/* Join with Code Modal */}
      <JoinCodeModal
        isOpen={isJoinCodeModalOpen}
        onClose={() => setIsJoinCodeModalOpen(false)}
        defaultUserName={user?.display_name}
        onJoined={(res) => {
          refetchSession();
          if (res.leagueId) {
            setActiveLeagueId(res.leagueId);
          }
        }}
      />

      {/* Developer Match Simulator Modal */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        defaultGameweek={selectedGameweek}
      />

      {/* League Pick Matrix & History Modal */}
      {activeLeague && (
        <LeagueHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          leagueId={activeLeague.id}
          leagueName={activeLeague.name}
          leagueType={activeLeague.type}
          currentUserId={user?.id}
        />
      )}

      {/* Player Profile & Trophy Cabinet Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={user?.id}
        onSelectLeague={(id) => setActiveLeagueId(id)}
      />

      {/* League Commissioner Tools Modal */}
      {activeLeague && (
        <CommissionerModal
          isOpen={isCommissionerModalOpen}
          onClose={() => setIsCommissionerModalOpen(false)}
          leagueId={activeLeague.id}
          leagueName={activeLeague.name}
          leagueType={activeLeague.type === 'ALL_IN_ONE' ? 'LAST_MAN_STANDING' : activeLeague.type}
          currentRound={activeLeague.current_round || 1}
          currentUserId={user?.id}
          onLeagueUpdated={() => {
            refetchSession();
            queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
            queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
            queryClient.invalidateQueries({ queryKey: ['gameweek-predictions'] });
            queryClient.invalidateQueries({ queryKey: ['lms-team-claims'] });
            queryClient.invalidateQueries({ queryKey: ['predictor-match-claims'] });
            queryClient.invalidateQueries({ queryKey: ['user-burned-teams'] });
            queryClient.invalidateQueries({ queryKey: ['user-session'] });
          }}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthPrompt(null);
          setAuthErrorParam(null);
        }}
        defaultMode={authModalMode}
        title={authPrompt?.title}
        subtitle={authPrompt?.subtitle}
        initialError={authErrorParam}
        onAuthenticated={() => {
          refetchSession();
          queryClient.invalidateQueries({ queryKey: ['user-session'] });
          queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
          queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
          queryClient.invalidateQueries({ queryKey: ['gameweek-predictions'] });
        }}
      />

      {/* Live Matchday Realtime Notifier */}
      <MatchdayLiveNotifier
        event={latestEvent}
        onDismiss={clearLatestEvent}
      />

      {/* Footer */}
      <footer className="border-t border-brand-800/80 bg-brand-950 px-4 sm:px-8 py-6 text-center text-xs text-brand-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 SquadPicks. Football Predictor & Last Man Standing Platform.</p>
          <p className="font-mono text-[11px] text-brand-600">
            Powered by Football-Data.org • Next.js 16 • React 19
          </p>
        </div>
      </footer>
    </div>
  );
}
