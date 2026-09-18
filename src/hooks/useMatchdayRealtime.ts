'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { FixturesApiResponse } from './useFootballData';

export interface MatchLiveEvent {
  id: string;
  type: 'GOAL' | 'KICKOFF' | 'FULL_TIME' | 'STATUS_CHANGE' | 'PICK_UPDATE';
  fixtureId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string;
  message: string;
  timestamp: number;
  isPersonalLms?: boolean;
  isPersonalPredictor?: boolean;
}

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseMatchdayRealtimeOptions {
  leagueId?: string | null;
  gameweekNumber?: number;
  currentUserId?: string | null;
  userLmsTeamId?: string | null;
  userPredictorFixtureIds?: string[];
  onLiveEvent?: (event: MatchLiveEvent) => void;
  enabled?: boolean;
}

export function useMatchdayRealtime({
  leagueId,
  gameweekNumber = 5,
  currentUserId,
  userLmsTeamId,
  userPredictorFixtureIds = [],
  onLiveEvent,
  enabled = true,
}: UseMatchdayRealtimeOptions = {}) {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('connecting');
  const [latestEvent, setLatestEvent] = useState<MatchLiveEvent | null>(null);

  // Derived count of active live matches from query cache
  const cachedFixtures =
    queryClient.getQueryData<FixturesApiResponse>(['fixtures', gameweekNumber]) ||
    queryClient.getQueryData<FixturesApiResponse>(['fixtures', 'current']);
  const liveMatchesCount = cachedFixtures?.fixtures.filter((f) => f.status === 'LIVE').length || 0;

  // References to keep callbacks current
  const onLiveEventRef = useRef(onLiveEvent);
  onLiveEventRef.current = onLiveEvent;

  const userLmsTeamIdRef = useRef(userLmsTeamId);
  userLmsTeamIdRef.current = userLmsTeamId;

  const userPredictorFixtureIdsRef = useRef(userPredictorFixtureIds);
  userPredictorFixtureIdsRef.current = userPredictorFixtureIds;

  // Helper to find fixture info from query cache
  const findCachedFixture = useCallback(
    (fixtureId: string) => {
      const cached = queryClient.getQueryData<FixturesApiResponse>(['fixtures', gameweekNumber]) ||
        queryClient.getQueryData<FixturesApiResponse>(['fixtures', 'current']);
      return cached?.fixtures.find((f) => f.id === fixtureId || String(f.external_id) === fixtureId);
    },
    [queryClient, gameweekNumber]
  );

  useEffect(() => {
    if (!enabled) {
      setConnectionStatus('disconnected');
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["']|["']$/g, '').trim();
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/^["']|["']$/g, '').trim();

    if (!url || !key || !url.startsWith('http')) {
      setConnectionStatus('disconnected');
      return;
    }

    const supabase = createClient();
    setConnectionStatus('connecting');

    const channelName = `matchday-hub-${leagueId || 'global'}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // 1. Listen for Live Fixture Changes (Goals, In-Play, Full Time)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'fixtures' },
      (payload) => {
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;

        // Invalidate all fixture & leaderboard queries immediately
        queryClient.invalidateQueries({ queryKey: ['fixtures'] });
        queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
        queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['user-session'] });
        queryClient.invalidateQueries({ queryKey: ['standings'] });

        const cached = findCachedFixture(newRecord.id);
        const homeName = cached?.home_team?.short_name || cached?.home_team?.name || 'Home';
        const awayName = cached?.away_team?.short_name || cached?.away_team?.name || 'Away';

        const isPersonalLms =
          Boolean(userLmsTeamIdRef.current &&
            (String(newRecord.home_team_id) === String(userLmsTeamIdRef.current) ||
             String(newRecord.away_team_id) === String(userLmsTeamIdRef.current) ||
             String(cached?.home_team?.id) === String(userLmsTeamIdRef.current) ||
             String(cached?.away_team?.id) === String(userLmsTeamIdRef.current)));

        const isPersonalPredictor =
          userPredictorFixtureIdsRef.current.includes(String(newRecord.id)) ||
          (cached && userPredictorFixtureIdsRef.current.includes(String(cached.external_id)));

        // A. Score changed (GOAL!)
        const scoreChanged =
          oldRecord &&
          (newRecord.home_score !== oldRecord.home_score || newRecord.away_score !== oldRecord.away_score);

        if (scoreChanged && newRecord.home_score !== null && newRecord.away_score !== null) {
          const event: MatchLiveEvent = {
            id: `goal-${newRecord.id}-${Date.now()}`,
            type: 'GOAL',
            fixtureId: newRecord.id,
            homeTeamName: homeName,
            awayTeamName: awayName,
            homeScore: newRecord.home_score,
            awayScore: newRecord.away_score,
            status: newRecord.status,
            message: `⚽ GOAL! ${homeName} ${newRecord.home_score} - ${newRecord.away_score} ${awayName}`,
            timestamp: Date.now(),
            isPersonalLms,
            isPersonalPredictor,
          };
          setLatestEvent(event);
          onLiveEventRef.current?.(event);
          return;
        }

        // B. Kickoff / Status changed to LIVE
        if (oldRecord && oldRecord.status !== 'LIVE' && newRecord.status === 'LIVE') {
          const event: MatchLiveEvent = {
            id: `kickoff-${newRecord.id}-${Date.now()}`,
            type: 'KICKOFF',
            fixtureId: newRecord.id,
            homeTeamName: homeName,
            awayTeamName: awayName,
            homeScore: newRecord.home_score ?? 0,
            awayScore: newRecord.away_score ?? 0,
            status: 'LIVE',
            message: `⚡ KICKOFF: ${homeName} vs ${awayName} is now in-play!`,
            timestamp: Date.now(),
            isPersonalLms,
            isPersonalPredictor,
          };
          setLatestEvent(event);
          onLiveEventRef.current?.(event);
          return;
        }

        // C. Match Finished
        if (oldRecord && oldRecord.status !== 'FINISHED' && newRecord.status === 'FINISHED') {
          const event: MatchLiveEvent = {
            id: `ft-${newRecord.id}-${Date.now()}`,
            type: 'FULL_TIME',
            fixtureId: newRecord.id,
            homeTeamName: homeName,
            awayTeamName: awayName,
            homeScore: newRecord.home_score,
            awayScore: newRecord.away_score,
            status: 'FINISHED',
            message: `🏁 FULL TIME: ${homeName} ${newRecord.home_score} - ${newRecord.away_score} ${awayName}`,
            timestamp: Date.now(),
            isPersonalLms,
            isPersonalPredictor,
          };
          setLatestEvent(event);
          onLiveEventRef.current?.(event);
        }
      }
    );

    // 2. Listen for LMS Picks & Claims
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'lms_picks' },
      () => {
        queryClient.invalidateQueries({ queryKey: ['lms-team-claims'] });
        queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
        queryClient.invalidateQueries({ queryKey: ['user-session'] });
      }
    );

    // 3. Listen for Predictor Picks & Claims
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'predictor_picks' },
      () => {
        queryClient.invalidateQueries({ queryKey: ['predictor-match-claims'] });
        queryClient.invalidateQueries({ queryKey: ['gameweek-predictions'] });
        queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['user-session'] });
      }
    );

    // 4. Listen for Predictor Leaderboard Updates
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'predictor_leaderboard' },
      () => {
        queryClient.invalidateQueries({ queryKey: ['predictor-leaderboard'] });
        queryClient.invalidateQueries({ queryKey: ['user-session'] });
      }
    );

    // 5. Listen for LMS Entries & Elimination Updates
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'lms_entries' },
      () => {
        queryClient.invalidateQueries({ queryKey: ['survivor-board'] });
        queryClient.invalidateQueries({ queryKey: ['user-session'] });
      }
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        setConnectionStatus('error');
      } else if (status === 'CLOSED') {
        setConnectionStatus('disconnected');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, leagueId, gameweekNumber, queryClient, findCachedFixture]);

  return {
    connectionStatus,
    latestEvent,
    liveMatchesCount,
    clearLatestEvent: () => setLatestEvent(null),
  };
}
