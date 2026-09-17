// Pure TypeScript interfaces mirroring Database Schema & Data Models

export type MatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'LIVE'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED';

export type LeagueType = 'LAST_MAN_STANDING' | 'PREDICTOR' | 'ALL_IN_ONE';

export type EntryStatus = 'ALIVE' | 'ELIMINATED' | 'WINNER';

export type PickResult = 'PENDING' | 'SURVIVED' | 'LOST_LIFE' | 'VOID';

export type MarketType =
  | 'EXACT_SCORE'
  | 'OUTCOME'
  | 'BTTS'
  | 'OVER_UNDER_2_5';

export type MatchOutcome = 'HOME' | 'AWAY' | 'DRAW';

export interface LmsLeagueSettings {
  allow_repeat_teams?: boolean;
  starting_lives?: number;
  starting_gameweek?: number;
  exclusive_team_picks?: boolean; // true (default: unique team claims & live visibility across group)
}

export interface PredictorLeagueSettings {
  points_exact_score?: number;
  points_outcome?: number;
  points_btts?: number;
  points_over_under?: number;
  starting_gameweek?: number;
  matches_per_gameweek?: number | 'ALL';
  allow_duplicate_predictions?: boolean;
}

export interface AllInOneLeagueSettings extends LmsLeagueSettings, PredictorLeagueSettings {}

export type LeagueSettings = LmsLeagueSettings | PredictorLeagueSettings | AllInOneLeagueSettings;

export interface Competition {
  id: string; // UUID
  external_id: number;
  name: string;
  code: string;
  season: string;
  created_at?: string;
  updated_at?: string;
}

export interface Team {
  id: string; // UUID
  external_id: number;
  name: string;
  short_name: string;
  tla: string;
  crest_url: string;
  created_at?: string;
  updated_at?: string;
}

export interface Gameweek {
  id: string; // UUID
  competition_id: string;
  gameweek_number: number;
  deadline: string; // ISO Timestamp
  is_current: boolean;
  is_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Fixture {
  id: string; // UUID
  external_id: number;
  gameweek_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_time: string; // ISO Timestamp
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  settled_at: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields for UI convenience
  home_team?: Team;
  away_team?: Team;
}

export interface User {
  id: string; // UUID
  auth_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface League {
  id: string; // UUID
  competition_id: string;
  creator_id: string;
  name: string;
  type: LeagueType;
  invite_code: string;
  settings: LeagueSettings;
  created_at?: string;
  updated_at?: string;
}

export interface LeagueMember {
  id: string; // UUID
  league_id: string;
  user_id: string;
  role: 'ADMIN' | 'MEMBER';
  joined_at: string;
}

export interface LmsEntry {
  id: string; // UUID
  league_id: string;
  user_id: string;
  lives_remaining: number;
  status: EntryStatus;
  eliminated_at_gameweek_id: string | null;
  created_at?: string;
  updated_at?: string;
  user?: User;
}

export interface LmsPick {
  id: string; // UUID
  entry_id: string;
  gameweek_id: string;
  team_id: string;
  result: PickResult;
  created_at?: string;
  updated_at?: string;
  team?: Team;
}

export interface PredictorPick {
  id: string; // UUID
  league_id: string;
  user_id: string;
  fixture_id: string;
  market: MarketType;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  predicted_outcome: string | null; // 'HOME' | 'AWAY' | 'DRAW' | 'YES' | 'NO' | 'OVER' | 'UNDER'
  points_awarded: number;
  is_settled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PredictorLeaderboard {
  league_id: string;
  user_id: string;
  total_points: number;
  correct_exact_scores: number;
  correct_outcomes: number;
  last_updated: string;
  user?: User;
}
