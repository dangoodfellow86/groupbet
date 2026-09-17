-- ====================================================================
-- 001_initial_schema.sql
-- Groupbet Football Predictor & Last Man Standing Database Schema
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
DO $$ BEGIN
  CREATE TYPE match_status AS ENUM (
    'SCHEDULED',
    'TIMED',
    'LIVE',
    'FINISHED',
    'POSTPONED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE league_type AS ENUM (
    'LAST_MAN_STANDING',
    'PREDICTOR'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE entry_status AS ENUM (
    'ALIVE',
    'ELIMINATED',
    'WINNER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pick_result AS ENUM (
    'PENDING',
    'SURVIVED',
    'LOST_LIFE',
    'VOID'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE market_type AS ENUM (
    'EXACT_SCORE',
    'OUTCOME',
    'BTTS',
    'OVER_UNDER_2_5'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. COMPETITIONS
CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  season VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INT UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100) NOT NULL,
  tla VARCHAR(10) NOT NULL,
  crest_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. GAMEWEEKS
CREATE TABLE IF NOT EXISTS gameweeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  gameweek_number INT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_competition_gameweek UNIQUE (competition_id, gameweek_number)
);

-- 4. FIXTURES
CREATE TABLE IF NOT EXISTS fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id INT UNIQUE NOT NULL,
  gameweek_id UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  kickoff_time TIMESTAMPTZ NOT NULL,
  status match_status NOT NULL DEFAULT 'SCHEDULED',
  home_score INT DEFAULT NULL,
  away_score INT DEFAULT NULL,
  settled_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  avatar_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. LEAGUES
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name VARCHAR(150) NOT NULL,
  type league_type NOT NULL,
  invite_code VARCHAR(50) UNIQUE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. LEAGUE MEMBERS
CREATE TABLE IF NOT EXISTS league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_league_user UNIQUE (league_id, user_id)
);

-- 8. LMS ENTRIES
CREATE TABLE IF NOT EXISTS lms_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lives_remaining INT NOT NULL DEFAULT 1,
  status entry_status NOT NULL DEFAULT 'ALIVE',
  eliminated_at_gameweek_id UUID REFERENCES gameweeks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lms_league_user UNIQUE (league_id, user_id)
);

-- 9. LMS PICKS
CREATE TABLE IF NOT EXISTS lms_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES lms_entries(id) ON DELETE CASCADE,
  gameweek_id UUID NOT NULL REFERENCES gameweeks(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  result pick_result NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lms_entry_gameweek UNIQUE (entry_id, gameweek_id)
);

-- 10. PREDICTOR PICKS
CREATE TABLE IF NOT EXISTS predictor_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  market market_type NOT NULL,
  predicted_home_score INT DEFAULT NULL,
  predicted_away_score INT DEFAULT NULL,
  predicted_outcome VARCHAR(20) DEFAULT NULL,
  points_awarded INT NOT NULL DEFAULT 0,
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_predictor_pick UNIQUE (league_id, user_id, fixture_id, market)
);

-- 11. PREDICTOR LEADERBOARD
CREATE TABLE IF NOT EXISTS predictor_leaderboard (
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_points INT NOT NULL DEFAULT 0,
  correct_exact_scores INT NOT NULL DEFAULT 0,
  correct_outcomes INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_fixtures_gw_status ON fixtures(gameweek_id, status);
CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON fixtures(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_lms_picks_entry_gw ON lms_picks(entry_id, gameweek_id);
CREATE INDEX IF NOT EXISTS idx_lms_picks_team ON lms_picks(entry_id, team_id);
CREATE INDEX IF NOT EXISTS idx_predictor_leaderboard_league_pts ON predictor_leaderboard(league_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_predictor_picks_fixture ON predictor_picks(fixture_id, is_settled);
