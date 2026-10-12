'use client';

import { useQuery } from '@tanstack/react-query';
import { NormalizedFixture, NormalizedStandingRow } from '@/core/types/football';

export interface FixturesApiResponse {
  gameweek: number;
  activeGameweek?: number;
  competition?: {
    code: string;
    name: string;
  };
  fixtures: Array<{
    id: string;
    external_id: number;
    gameweek_id: string;
    kickoff_time: string;
    status: 'SCHEDULED' | 'TIMED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
    home_score: number | null;
    away_score: number | null;
    settled_at: string | null;
    gameweek_number: number;
    home_team: {
      id: string;
      external_id: number;
      name: string;
      short_name: string;
      tla: string;
      crest_url: string;
    };
    away_team: {
      id: string;
      external_id: number;
      name: string;
      short_name: string;
      tla: string;
      crest_url: string;
    };
  }>;
  source: 'db' | 'api';
}

export interface StandingsApiResponse {
  leagueId: number;
  leagueName: string;
  season: number;
  table: NormalizedStandingRow[];
}

/**
 * Hook to retrieve fixtures for a given gameweek and competition.
 * Automatically polls every 60 seconds when any match is in 'LIVE' status.
 */
export function useGameweekFixtures(gameweek?: number, competitionCode = 'PL') {
  const comp = competitionCode || 'PL';
  return useQuery<FixturesApiResponse>({
    queryKey: ['fixtures', comp, gameweek ?? 'current'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (comp) params.set('comp', comp);
      if (gameweek) params.set('gw', String(gameweek));
      const res = await fetch(`/api/fixtures?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch fixtures: ${res.statusText}`);
      }
      return res.json();
    },
    staleTime: 30 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasLiveMatch = data?.fixtures.some((f) => f.status === 'LIVE');
      return hasLiveMatch ? 60 * 1000 : false;
    },
  });
}

/**
 * Hook to retrieve standings table for a competition.
 * Cached for 15 minutes.
 */
export function useStandings(competitionCode = 'PL') {
  const comp = competitionCode || 'PL';
  return useQuery<StandingsApiResponse>({
    queryKey: ['standings', comp],
    queryFn: async () => {
      const res = await fetch(`/api/standings?comp=${encodeURIComponent(comp)}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch standings: ${res.statusText}`);
      }
      return res.json();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000,
  });
}
