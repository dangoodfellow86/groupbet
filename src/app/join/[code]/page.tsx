'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getLeagueByInviteCode, joinLeague, LeaguePreview } from '@/server/actions/leagues';
import { signInWithPassword, signUpWithPassword } from '@/server/actions/auth';
import { useUserSession } from '@/hooks/useUserSession';
import {
  Shield,
  Trophy,
  Users,
  Heart,
  Calendar,
  Check,
  Loader2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  KeyRound,
  LogIn,
} from 'lucide-react';

interface JoinPageProps {
  params: Promise<{ code: string }>;
}

export default function JoinLeaguePage({ params }: JoinPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const code = resolvedParams.code;
  const { user, isAuthenticated, refetch: refetchSession } = useUserSession();

  const [league, setLeague] = useState<LeaguePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Unauthenticated form tab: 'signup' | 'signin'
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    async function loadPreview() {
      setIsLoading(true);
      try {
        const res = await getLeagueByInviteCode(code);
        if (res.success && res.league) {
          setLeague(res.league);
        } else {
          setErrorMsg(res.message || 'Game not found');
        }
      } catch (err: any) {
        setErrorMsg('Failed to load game preview');
      } finally {
        setIsLoading(false);
      }
    }
    loadPreview();
  }, [code]);

  // Handle join for already authenticated user
  const handleAuthenticatedJoin = async () => {
    if (!user) return;
    setIsJoining(true);
    setErrorMsg(null);

    try {
      const res = await joinLeague({
        inviteCode: code,
        displayName: user.display_name,
        email: user.email,
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Failed to join game');
        setIsJoining(false);
        return;
      }

      setJoinSuccess(true);
      if (res.leagueId && typeof window !== 'undefined') {
        localStorage.setItem('gb_active_league_id', res.leagueId);
      }
      setTimeout(() => router.push('/'), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error joining game');
      setIsJoining(false);
    }
  };

  // Handle join with account creation or sign in
  const handleAuthAndJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsJoining(true);

    try {
      let resolvedDisplayName = displayName.trim();

      if (authMode === 'signup') {
        if (!resolvedDisplayName) {
          setErrorMsg('Please enter a display name for the league.');
          setIsJoining(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setIsJoining(false);
          return;
        }

        const authRes = await signUpWithPassword({
          email: email.trim(),
          password,
          displayName: resolvedDisplayName,
        });

        if (!authRes.success) {
          setErrorMsg(authRes.message);
          setIsJoining(false);
          return;
        }
      } else {
        // Sign in
        const authRes = await signInWithPassword({
          email: email.trim(),
          password,
        });

        if (!authRes.success) {
          setErrorMsg(authRes.message);
          setIsJoining(false);
          return;
        }
        resolvedDisplayName = authRes.user?.display_name || 'Player';
      }

      // Join the league
      const joinRes = await joinLeague({
        inviteCode: code,
        displayName: resolvedDisplayName,
        email: email.trim(),
      });

      if (!joinRes.success) {
        setErrorMsg(joinRes.message || 'Authenticated, but could not join game.');
        setIsJoining(false);
        return;
      }

      setJoinSuccess(true);
      if (joinRes.leagueId && typeof window !== 'undefined') {
        localStorage.setItem('gb_active_league_id', joinRes.leagueId);
      }
      refetchSession();
      setTimeout(() => router.push('/'), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred during account creation.');
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-xs text-neutral-400">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Looking up game invite...</span>
        </div>
      </div>
    );
  }

  if (errorMsg && !league) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            ⚠️
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-100">Invite Not Found</h2>
            <p className="text-xs text-neutral-400 mt-1">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition"
          >
            Go to Groupbet Home
          </button>
        </div>
      </div>
    );
  }

  const isAllInOne = league?.type === 'ALL_IN_ONE';
  const isLms = league?.type === 'LAST_MAN_STANDING' || isAllInOne;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 py-10">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        {/* Brand Banner */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center font-bold text-neutral-950">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-white bg-clip-text text-transparent">
              GROUPBET
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
            {code}
          </span>
        </div>

        {/* Invitation Context */}
        <div className="flex flex-col gap-3 text-center items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
            {isAllInOne ? (
              <Sparkles className="w-7 h-7 text-emerald-400" />
            ) : isLms ? (
              <Shield className="w-7 h-7 text-emerald-400" />
            ) : (
              <Trophy className="w-7 h-7 text-amber-400" />
            )}
          </div>

          <div>
            <div className="text-xs text-neutral-400">
              <strong className="text-emerald-400 font-semibold">{league?.creator_name}</strong> invited you to join
            </div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-100 mt-0.5">
              {league?.name}
            </h1>
          </div>

          {/* Quick Rules Pills */}
          <div className="flex items-center gap-2 flex-wrap justify-center mt-1">
            <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300">
              {isAllInOne ? <Sparkles className="w-3 h-3 text-emerald-400" /> : isLms ? <Shield className="w-3 h-3 text-emerald-400" /> : <Trophy className="w-3 h-3 text-amber-400" />}
              <span>{isAllInOne ? 'LMS + Predictor' : isLms ? 'Last Man Standing' : 'Predictor'}</span>
            </span>

            {isLms && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-emerald-400">
                <Heart className="w-3 h-3 fill-emerald-500" />
                <span>{league?.starting_lives} {league?.starting_lives === 1 ? 'Life' : 'Lives'}</span>
              </span>
            )}

            <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400">
              <Calendar className="w-3 h-3" />
              <span>Starts GW {league?.starting_gameweek}</span>
            </span>

            <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400">
              <Users className="w-3 h-3" />
              <span>{league?.member_count} {league?.member_count === 1 ? 'player' : 'players'}</span>
            </span>
          </div>
        </div>

        {/* Join / Auth Section */}
        {joinSuccess ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
            <div className="font-bold text-base text-neutral-100">You&apos;re in!</div>
            <div className="text-xs text-neutral-400">
              Enrolled into {league?.name}. Redirecting to matchday hub...
            </div>
          </div>
        ) : isAuthenticated && user ? (
          /* Option A: User is already logged in */
          <div className="flex flex-col gap-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.display_name)}`}
                alt={user.display_name}
                className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-neutral-100 truncate">
                  {user.display_name}
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Logged in as {user.email}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAuthenticatedJoin}
              disabled={isJoining}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining League...</span>
                </>
              ) : (
                <>
                  <span>Join {league?.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* Option B: User is NOT logged in - Must create an account or sign in to join */
          <div className="flex flex-col gap-4">
            {/* Tab switch */}
            <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg font-semibold transition cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Create Account & Join
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg font-semibold transition cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sign In & Join
              </button>
            </div>

            <p className="text-xs text-neutral-400 text-center">
              {authMode === 'signup'
                ? 'Create a free account to join this game and sync your picks across devices.'
                : 'Sign in to your existing account to join this game.'}
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAuthAndJoin} className="flex flex-col gap-3.5">
              {authMode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-300">
                    Player Name (Leaderboard Display) <span className="text-emerald-400">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex, Harry_99, SuperStriker"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Email Address <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Password <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 mt-1 cursor-pointer"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : authMode === 'signup' ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Account & Join Game</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In & Join Game</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer Rules Note */}
        <div className="text-center text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-800/80 pt-3">
          {isLms
            ? 'Pick 1 winning team each week. If your team wins, you advance. Lose or draw and you lose a life. No team can be picked twice.'
            : 'Predict scorelines and outcomes for each Premier League fixture to climb the group leaderboard.'}
        </div>
      </div>
    </div>
  );
}
