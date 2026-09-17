import {
  NormalizedFixture,
  NormalizedStandings,
  NormalizedTeam,
  FootballDataMatchesResponse,
  FootballDataStandingsResponse,
  FootballDataTeamsResponse,
  FootballDataMatch,
} from '../types/football';

const API_BASE_URL = 'https://api.football-data.org/v4';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  memoryCache.set(key, { data, timestamp: Date.now(), ttlMs });
}

function mapApiStatus(status: string): 'SCHEDULED' | 'TIMED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' {
  switch (status) {
    case 'IN_PLAY':
    case 'PAUSED':
      return 'LIVE';
    case 'FINISHED':
    case 'AWARDED':
      return 'FINISHED';
    case 'POSTPONED':
    case 'SUSPENDED':
      return 'POSTPONED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'TIMED':
    case 'SCHEDULED':
    default:
      return 'SCHEDULED';
  }
}

export class FootballApiClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ||
      process.env.FOOTBALL_DATA_API_KEY ||
      '566e86671d1f43469bc7c6bb9c0bd3ca';
  }

  private async fetchApi<T>(endpoint: string, ttlMs: number): Promise<T> {
    const cacheKey = `football_data_${endpoint}`;
    const cached = getCached<T>(cacheKey);
    if (cached) {
      return cached;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'X-Auth-Token': this.apiKey,
      },
      next: { revalidate: Math.floor(ttlMs / 1000) },
    });

    if (res.status === 429) {
      console.warn('[FootballApiClient] Football-Data.org rate limit (429).');
      throw new Error('RATE_LIMITED');
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Football-Data.org error ${res.status}: ${err}`);
    }

    const json: T = await res.json();
    setCache(cacheKey, json, ttlMs);
    return json;
  }

  /**
   * Fetch current competition metadata (season, currentMatchday)
   */
  async getCompetition(competitionCode = 'PL') {
    return await this.fetchApi<any>(`/competitions/${competitionCode}`, 3600000);
  }

  /**
   * Fetch all teams in competition.
   */
  async getTeams(competitionCode = 'PL'): Promise<NormalizedTeam[]> {
    try {
      const res = await this.fetchApi<FootballDataTeamsResponse>(
        `/competitions/${competitionCode}/teams`,
        86400000 // 24 hours
      );

      return res.teams.map((t) => ({
        id: t.id,
        name: t.name,
        shortName: t.shortName || t.name,
        tla: t.tla || t.shortName?.slice(0, 3).toUpperCase() || 'UNK',
        crest: t.crest,
      }));
    } catch (err: any) {
      console.warn(`[FootballApiClient] Using fallback teams due to: ${err.message}`);
      return getFallbackTeams();
    }
  }

  /**
   * Fetch fixtures for competition with optional matchday filter.
   */
  async getFixtures(
    competitionCode = 'PL',
    matchday?: number
  ): Promise<{ matches: NormalizedFixture[]; currentMatchday: number; season: string }> {
    try {
      const endpoint = matchday
        ? `/competitions/${competitionCode}/matches?matchday=${matchday}`
        : `/competitions/${competitionCode}/matches`;

      const res = await this.fetchApi<FootballDataMatchesResponse>(
        endpoint,
        60000 // 1 minute
      );

      const seasonObj = (res as any).season || (res.matches?.[0] as any)?.season;
      const currentMatchday = seasonObj?.currentMatchday || 4;
      const seasonStr = seasonObj?.startDate && seasonObj?.endDate
        ? `${seasonObj.startDate.slice(0, 4)}/${seasonObj.endDate.slice(0, 4)}`
        : '2026/2027';

      const matches = res.matches.map((m) => {
        let winner: 'HOME' | 'AWAY' | 'DRAW' | null = null;
        if (m.score?.winner === 'HOME_TEAM') winner = 'HOME';
        else if (m.score?.winner === 'AWAY_TEAM') winner = 'AWAY';
        else if (m.score?.winner === 'DRAW') winner = 'DRAW';

        return {
          id: m.id,
          gameweek: m.matchday,
          utcDate: m.utcDate,
          status: mapApiStatus(m.status),
          homeTeam: {
            id: m.homeTeam.id,
            name: m.homeTeam.name,
            shortName: m.homeTeam.shortName || m.homeTeam.name,
            tla: m.homeTeam.tla || 'UNK',
            crest: m.homeTeam.crest,
          },
          awayTeam: {
            id: m.awayTeam.id,
            name: m.awayTeam.name,
            shortName: m.awayTeam.shortName || m.awayTeam.name,
            tla: m.awayTeam.tla || 'UNK',
            crest: m.awayTeam.crest,
          },
          homeScore: m.score?.fullTime?.home ?? null,
          awayScore: m.score?.fullTime?.away ?? null,
          winner,
        };
      });

      return { matches, currentMatchday, season: seasonStr };
    } catch (err: any) {
      console.warn(`[FootballApiClient] Using fallback fixtures due to: ${err.message}`);
      return {
        matches: getFallbackFixtures(matchday),
        currentMatchday: 4,
        season: '2026/2027',
      };
    }
  }

  /**
   * Fetch current standings table.
   */
  async getStandings(competitionCode = 'PL'): Promise<NormalizedStandings> {
    try {
      const res = await this.fetchApi<FootballDataStandingsResponse>(
        `/competitions/${competitionCode}/standings`,
        900000 // 15 minutes
      );

      const tableData = res.standings?.[0]?.table || [];
      const seasonStr = `${res.season?.startDate?.slice(0, 4)}/${res.season?.endDate?.slice(0, 4)}`;

      const table: NormalizedStandings['table'] = tableData.map((item) => ({
        position: item.position,
        team: {
          id: item.team.id,
          name: item.team.name,
          shortName: item.team.shortName || item.team.name,
          tla: item.team.tla || 'UNK',
          crest: item.team.crest,
        },
        playedGames: item.playedGames,
        form: item.form,
        won: item.won,
        draw: item.draw,
        lost: item.lost,
        points: item.points,
        goalsFor: item.goalsFor,
        goalsAgainst: item.goalsAgainst,
        goalDifference: item.goalDifference,
      }));

      return {
        leagueId: res.competition.id,
        leagueName: res.competition.name,
        season: seasonStr as any,
        table,
      };
    } catch (err: any) {
      console.warn(`[FootballApiClient] Using fallback standings due to: ${err.message}`);
      return getFallbackStandings();
    }
  }
}

export const footballClient = new FootballApiClient();

// Fallback data
export function getFallbackTeams(): NormalizedTeam[] {
  return [
    { id: 57, name: 'Arsenal FC', shortName: 'Arsenal', tla: 'ARS', crest: 'https://crests.football-data.org/57.png' },
    { id: 64, name: 'Liverpool FC', shortName: 'Liverpool', tla: 'LIV', crest: 'https://crests.football-data.org/64.png' },
    { id: 65, name: 'Manchester City FC', shortName: 'Man City', tla: 'MCI', crest: 'https://crests.football-data.org/65.png' },
    { id: 61, name: 'Chelsea FC', shortName: 'Chelsea', tla: 'CHE', crest: 'https://crests.football-data.org/61.png' },
    { id: 66, name: 'Manchester United FC', shortName: 'Man United', tla: 'MUN', crest: 'https://crests.football-data.org/66.png' },
  ];
}

export function getFallbackFixtures(gameweek = 4): NormalizedFixture[] {
  const teams = getFallbackTeams();
  return [
    {
      id: 5001,
      gameweek,
      utcDate: new Date().toISOString(),
      status: 'TIMED',
      homeTeam: teams[0],
      awayTeam: teams[1],
      homeScore: null,
      awayScore: null,
      winner: null,
    },
  ];
}

export function getFallbackStandings(): NormalizedStandings {
  const teams = getFallbackTeams();
  return {
    leagueId: 2021,
    leagueName: 'Premier League',
    season: '2026/2027' as any,
    table: [
      { position: 1, team: teams[0], playedGames: 4, won: 4, draw: 0, lost: 0, points: 12, goalsFor: 10, goalsAgainst: 2, goalDifference: 8, form: 'W,W,W,W' },
      { position: 2, team: teams[1], playedGames: 4, won: 3, draw: 1, lost: 0, points: 10, goalsFor: 9, goalsAgainst: 3, goalDifference: 6, form: 'W,W,D,W' },
    ],
  };
}
