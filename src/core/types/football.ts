// Unified Football Data Interfaces (Normalized for API & UI)

export interface NormalizedTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface NormalizedFixture {
  id: number;
  gameweek: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  homeTeam: NormalizedTeam;
  awayTeam: NormalizedTeam;
  homeScore: number | null;
  awayScore: number | null;
  winner: 'HOME' | 'AWAY' | 'DRAW' | null;
}

export interface NormalizedStandingRow {
  position: number;
  team: NormalizedTeam;
  playedGames: number;
  form: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface NormalizedStandings {
  leagueId: number;
  leagueName: string;
  season: number | string;
  table: NormalizedStandingRow[];
}

// Football-Data.org API Interfaces
export interface FootballDataArea {
  id: number;
  name: string;
  code: string;
  flag: string | null;
}

export interface FootballDataCompetition {
  id: number;
  name: string;
  code: string;
  type: string;
  emblem: string | null;
}

export interface FootballDataSeason {
  id: number;
  startDate: string;
  endDate: string;
  currentMatchday: number;
  winner: any | null;
}

export interface FootballDataTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface FootballDataScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  duration?: string;
  fullTime: {
    home: number | null;
    away: number | null;
  };
}

export interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: FootballDataScore;
  season?: FootballDataSeason;
}

export interface FootballDataStandingTableItem {
  position: number;
  team: FootballDataTeam;
  playedGames: number;
  form: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface FootballDataStandingGroup {
  stage: string;
  type: string;
  group: string | null;
  table: FootballDataStandingTableItem[];
}

export interface FootballDataStandingsResponse {
  filters: Record<string, any>;
  area: FootballDataArea;
  competition: FootballDataCompetition;
  season: FootballDataSeason;
  standings: FootballDataStandingGroup[];
}

export interface FootballDataMatchesResponse {
  filters: Record<string, any>;
  resultSet: {
    count: number;
    first: string;
    last: string;
    played: number;
  };
  competition: FootballDataCompetition;
  season?: FootballDataSeason;
  matches: FootballDataMatch[];
}

export interface FootballDataTeamsResponse {
  count: number;
  competition: FootballDataCompetition;
  season?: FootballDataSeason;
  teams: FootballDataTeam[];
}

// API-Football v3 Interfaces
export interface ApiFootballFixtureItem {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string;
    timestamp: number;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
      extra: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
    standings?: boolean;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime?: { home: number | null; away: number | null };
    penalty?: { home: number | null; away: number | null };
  };
}

export interface ApiFootballStandingsItem {
  rank: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string | null;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: {
      for: number;
      against: number;
    };
  };
}

export interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, any>;
  errors: Record<string, string> | any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T;
}
