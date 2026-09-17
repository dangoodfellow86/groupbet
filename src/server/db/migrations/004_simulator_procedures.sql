-- ====================================================================
-- 004_simulator_procedures.sql
-- Groupbet Match Simulator Procedures: set_fixture_live, revert_fixture, revert_gameweek
-- ====================================================================

-- 1. Set Fixture Live (In-Play)
CREATE OR REPLACE FUNCTION set_fixture_live(
  p_fixture_id UUID,
  p_home_score INT,
  p_away_score INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE fixtures
  SET status = 'LIVE',
      home_score = p_home_score,
      away_score = p_away_score,
      settled_at = NULL,
      updated_at = NOW()
  WHERE id = p_fixture_id;
END;
$$;

-- 2. Revert Single Fixture Back to Scheduled
CREATE OR REPLACE FUNCTION revert_fixture(
  p_fixture_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_gameweek_id UUID;
  v_home_team_id UUID;
  v_away_team_id UUID;
BEGIN
  -- 1. Retrieve Fixture Metadata
  SELECT gameweek_id, home_team_id, away_team_id
  INTO v_gameweek_id, v_home_team_id, v_away_team_id
  FROM fixtures
  WHERE id = p_fixture_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture with ID % not found', p_fixture_id;
  END IF;

  -- 2. Reset Fixture Status & Scores
  UPDATE fixtures
  SET status = 'SCHEDULED',
      home_score = NULL,
      away_score = NULL,
      settled_at = NULL,
      updated_at = NOW()
  WHERE id = p_fixture_id;

  -- 3. Reset Predictor Picks for this Fixture
  UPDATE predictor_picks
  SET points_awarded = 0,
      is_settled = FALSE,
      updated_at = NOW()
  WHERE fixture_id = p_fixture_id;

  -- 4. Recalculate Predictor Leaderboards for Affected Leagues
  UPDATE predictor_leaderboard plb
  SET total_points = COALESCE((
        SELECT SUM(points_awarded)
        FROM predictor_picks
        WHERE league_id = plb.league_id AND user_id = plb.user_id AND is_settled = TRUE
      ), 0),
      correct_exact_scores = COALESCE((
        SELECT COUNT(*)
        FROM predictor_picks
        WHERE league_id = plb.league_id AND user_id = plb.user_id AND is_settled = TRUE AND market = 'EXACT_SCORE' AND points_awarded > 0
      ), 0),
      correct_outcomes = COALESCE((
        SELECT COUNT(*)
        FROM predictor_picks
        WHERE league_id = plb.league_id AND user_id = plb.user_id AND is_settled = TRUE AND market = 'OUTCOME' AND points_awarded > 0
      ), 0),
      last_updated = NOW()
  WHERE plb.league_id IN (
    SELECT DISTINCT league_id FROM predictor_picks WHERE fixture_id = p_fixture_id
  );

  -- 5. Revert LMS Picks for this Match
  UPDATE lms_picks
  SET result = 'PENDING',
      updated_at = NOW()
  WHERE gameweek_id = v_gameweek_id
    AND team_id IN (v_home_team_id, v_away_team_id);

  -- 6. Recalculate LMS Lives & Status for Affected Entries
  UPDATE lms_entries le
  SET lives_remaining = COALESCE((l.settings->>'starting_lives')::int, 1) - COALESCE((
        SELECT COUNT(*)
        FROM lms_picks lp
        WHERE lp.entry_id = le.id AND lp.result = 'LOST_LIFE'
      ), 0),
      status = CASE 
        WHEN (COALESCE((l.settings->>'starting_lives')::int, 1) - COALESCE((
          SELECT COUNT(*)
          FROM lms_picks lp
          WHERE lp.entry_id = le.id AND lp.result = 'LOST_LIFE'
        ), 0)) > 0 THEN 'ALIVE'::entry_status
        ELSE 'ELIMINATED'::entry_status
      END,
      eliminated_at_gameweek_id = CASE
        WHEN (COALESCE((l.settings->>'starting_lives')::int, 1) - COALESCE((
          SELECT COUNT(*)
          FROM lms_picks lp
          WHERE lp.entry_id = le.id AND lp.result = 'LOST_LIFE'
        ), 0)) > 0 THEN NULL
        ELSE le.eliminated_at_gameweek_id
      END,
      updated_at = NOW()
  FROM leagues l
  WHERE l.id = le.league_id
    AND le.id IN (
      SELECT lp.entry_id
      FROM lms_picks lp
      WHERE lp.gameweek_id = v_gameweek_id
        AND lp.team_id IN (v_home_team_id, v_away_team_id)
    );

  -- 7. If sole WINNER status was triggered prematurely, restore to ALIVE if other survivors exist
  UPDATE lms_entries le
  SET status = 'ALIVE',
      updated_at = NOW()
  WHERE le.status = 'WINNER'
    AND (
      SELECT COUNT(*)
      FROM lms_entries sub
      WHERE sub.league_id = le.league_id AND sub.status IN ('ALIVE', 'WINNER')
    ) > 1;
END;
$$;

-- 3. Revert Entire Gameweek
CREATE OR REPLACE FUNCTION revert_gameweek(
  p_gameweek_number INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT f.id
    FROM fixtures f
    JOIN gameweeks gw ON f.gameweek_id = gw.id
    WHERE gw.gameweek_number = p_gameweek_number
  LOOP
    PERFORM revert_fixture(r.id);
  END LOOP;
END;
$$;
