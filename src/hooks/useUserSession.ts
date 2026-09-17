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
  const [activeLeagueId, setActiveLeagueIdState] = useState<string | null>(null);

  // Initialize activeLeagueId from localStorage if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gb_active_league_id');
      if (saved) {
        setActiveLeagueIdState(saved);
      }
    }
  }, []);

  const { data, isLoading, refetch } = useQuery<UserSessionResponse>({
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
    !user.email?.includes('@groupbet.internal')
  );

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
  };
}
