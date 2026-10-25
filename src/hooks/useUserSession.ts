'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User } from '@/core/types/database';
import { UserLeagueSummary } from '@/server/actions/leagues';

interface UserSessionResponse {
  user: User | null;
  leagues: UserLeagueSummary[];
}

export function useUserSession() {
  const queryClient = useQueryClient();
  const [activeLeagueId, setActiveLeagueIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('gb_active_league_id');
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize activeLeagueId from localStorage if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gb_active_league_id');
        if (saved) {
          setActiveLeagueIdState(saved);
        }
      } catch {
        // Ignore storage errors
      }
      setIsHydrated(true);
    }
  }, []);

  const { data, isLoading: isQueryLoading, refetch } = useQuery<UserSessionResponse>({
    queryKey: ['user-session'],
    queryFn: async () => {
      const res = await fetch('/api/user/session');
      if (!res.ok) {
        throw new Error('Failed to fetch user session');
      }
      return res.json();
    },
    staleTime: 10 * 1000,
  });

  const isLoading = !isHydrated || isQueryLoading;

  const leagues = data?.leagues || [];
  const user = data?.user || null;

  // Resolve activeLeague: saved activeLeagueId or fallback to first league
  const activeLeague =
    leagues.find((l) => l.id === activeLeagueId) || leagues[0] || null;

  const setActiveLeagueId = (id: string) => {
    setActiveLeagueIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gb_active_league_id', id);
    }
  };

  const setSession = async (displayName: string, email?: string) => {
    const res = await fetch('/api/user/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, email }),
    });
    if (!res.ok) {
      throw new Error('Failed to save session');
    }
    const result = await res.json();
    await queryClient.invalidateQueries({ queryKey: ['user-session'] });
    return result;
  };

  const isAuthenticated = Boolean(
    user &&
    user.auth_id &&
    !user.auth_id.startsWith('guest_') &&
    !user.email?.includes('@squadpicks.internal') &&
    !user.email?.includes('@groupbet.internal')
  );

  const updateProfile = async (displayName: string, avatarUrl?: string | null, customAvatar?: boolean) => {
    const { updateUserProfile } = await import('@/server/actions/profile');
    const result = await updateUserProfile({ displayName, avatarUrl, customAvatar });
    if (result.success) {
      await queryClient.invalidateQueries({ queryKey: ['user-session'] });
      await queryClient.invalidateQueries({ queryKey: ['player-career-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
      await queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
      await queryClient.invalidateQueries({ queryKey: ['league-history-matrix'] });
    }
    return result;
  };

  return {
    user,
    isAuthenticated,
    leagues,
    activeLeague,
    activeLeagueId: activeLeague?.id || null,
    setActiveLeagueId,
    isLoading,
    refetch,
    setSession,
    updateProfile,
  };
}
