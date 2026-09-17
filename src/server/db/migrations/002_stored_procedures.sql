-- ====================================================================
-- 002_stored_procedures.sql
-- Groupbet Stored Procedures: settle_fixture & void_fixture
-- ====================================================================

CREATE OR REPLACE FUNCTION settle_fixture(
  p_fixture_id UUID,
  p_home_score INT,
  p_away_score INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_gameweek_id UUID;
  v_home_team_id UUID;
  v_away_team_id UUID;
  v_current_status match_status;
  v_settled_at TIMESTAMPTZ;
  v_winning_team_id UUID := NULL;
  v_outcome VARCHAR(10);
  v_btts BOOLEAN;
  v_over_2_5 BOOLEAN;
  r_lms RECORD;
  r_pred RECORD;
  v_lms_league_id UUID;
  v_alive_count INT;
  v_pts INT;
BEGIN
  -- 1. Idempotency Check & Retrieve Fixture Metadata
  SELECT gameweek_id, home_team_id, away_team_id, status, settled_at
  INTO v_gameweek_id, v_home_team_id, v_away_team_id, v_current_status, v_settled_at
  FROM fixtures
  WHERE id = p_fixture_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture with ID % not found', p_fixture_id;
  END IF;

  IF v_current_status = 'FINISHED' AND v_settled_at IS NOT NULL THEN
    -- Already settled; idempotent exit
    RETURN;
  END IF;

  -- 2. Mark Fixture Finished and Settled
  UPDATE fixtures
  SET home_score = p_home_score,
      away_score = p_away_score,
      status = 'FINISHED',
      settled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_fixture_id;

  -- 3. Calculate Winner and Match Attributes
  IF p_home_score > p_away_score THEN
    v_winning_team_id := v_home_team_id;
    v_outcome := 'HOME';
  ELSIF p_away_score > p_home_score THEN
    v_winning_team_id := v_away_team_id;
    v_outcome := 'AWAY';
  ELSE
    v_winning_team_id := NULL; -- Draw
    v_outcome := 'DRAW';
  END IF;

  v_btts := (p_home_score > 0 AND p_away_score > 0);
  v_over_2_5 := ((p_home_score + p_away_score) > 2);

  -- 4. Settle LMS Picks
  FOR r_lms IN
    SELECT lp.id AS pick_id, lp.entry_id, lp.team_id, le.league_id, le.lives_remaining
    FROM lms_picks lp
    JOIN lms_entries le ON le.id = lp.entry_id
    WHERE lp.gameweek_id = v_gameweek_id
      AND lp.team_id IN (v_home_team_id, v_away_team_id)
      AND lp.result = 'PENDING'
    FOR UPDATE OF lp, le
  LOOP
    IF v_winning_team_id IS NOT NULL AND r_lms.team_id = v_winning_team_id THEN
      -- Pick survived!
      UPDATE lms_picks
      SET result = 'SURVIVED', updated_at = NOW()
      WHERE id = r_lms.pick_id;
    ELSE
      -- Pick lost (defeat or draw)
      UPDATE lms_picks
      SET result = 'LOST_LIFE', updated_at = NOW()
      WHERE id = r_lms.pick_id;

      -- Decrement life
      IF r_lms.lives_remaining - 1 <= 0 THEN
        UPDATE lms_entries
        SET lives_remaining = 0,
            status = 'ELIMINATED',
            eliminated_at_gameweek_id = v_gameweek_id,
            updated_at = NOW()
        WHERE id = r_lms.entry_id;
      ELSE
        UPDATE lms_entries
        SET lives_remaining = lives_remaining - 1,
            updated_at = NOW()
        WHERE id = r_lms.entry_id;
      END IF;
    END IF;

    -- Check if league has a sole winner remaining
    SELECT COUNT(*)
    INTO v_alive_count
    FROM lms_entries
    WHERE league_id = r_lms.league_id AND status = 'ALIVE';

    IF v_alive_count = 1 THEN
      UPDATE lms_entries
      SET status = 'WINNER', updated_at = NOW()
      WHERE league_id = r_lms.league_id AND status = 'ALIVE';
    END IF;
  END LOOP;

  -- 5. Settle Predictor Picks
  FOR r_pred IN
    SELECT id, league_id, user_id, market, predicted_home_score, predicted_away_score, predicted_outcome
    FROM predictor_picks
    WHERE fixture_id = p_fixture_id AND is_settled = FALSE
    FOR UPDATE
  LOOP
    v_pts := 0;

    IF r_pred.market = 'EXACT_SCORE' THEN
      IF r_pred.predicted_home_score = p_home_score AND r_pred.predicted_away_score = p_away_score THEN
        v_pts := 3;
      END IF;
    ELSIF r_pred.market = 'OUTCOME' THEN
      IF UPPER(r_pred.predicted_outcome) = v_outcome THEN
        v_pts := 1;
      END IF;
    ELSIF r_pred.market = 'BTTS' THEN
      IF (UPPER(r_pred.predicted_outcome) = 'YES' AND v_btts) OR
         (UPPER(r_pred.predicted_outcome) = 'NO' AND NOT v_btts) THEN
        v_pts := 1;
      END IF;
    ELSIF r_pred.market = 'OVER_UNDER_2_5' THEN
      IF (UPPER(r_pred.predicted_outcome) = 'OVER' AND v_over_2_5) OR
         (UPPER(r_pred.predicted_outcome) = 'UNDER' AND NOT v_over_2_5) THEN
        v_pts := 1;
      END IF;
    END IF;

    UPDATE predictor_picks
    SET points_awarded = v_pts,
        is_settled = TRUE,
        updated_at = NOW()
    WHERE id = r_pred.id;

    -- 6. Atomically Roll Up Leaderboard
    INSERT INTO predictor_leaderboard (
      league_id,
      user_id,
      total_points,
      correct_exact_scores,
      correct_outcomes,
      last_updated
    )
    VALUES (
      r_pred.league_id,
      r_pred.user_id,
      v_pts,
      CASE WHEN r_pred.market = 'EXACT_SCORE' AND v_pts > 0 THEN 1 ELSE 0 END,
      CASE WHEN r_pred.market = 'OUTCOME' AND v_pts > 0 THEN 1 ELSE 0 END,
      NOW()
    )
    ON CONFLICT (league_id, user_id) DO UPDATE SET
      total_points = (
        SELECT COALESCE(SUM(points_awarded), 0)
        FROM predictor_picks
        WHERE league_id = EXCLUDED.league_id AND user_id = EXCLUDED.user_id AND is_settled = TRUE
      ),
      correct_exact_scores = (
        SELECT COUNT(*)
        FROM predictor_picks
        WHERE league_id = EXCLUDED.league_id AND user_id = EXCLUDED.user_id AND market = 'EXACT_SCORE' AND points_awarded > 0 AND is_settled = TRUE
      ),
      correct_outcomes = (
        SELECT COUNT(*)
        FROM predictor_picks
        WHERE league_id = EXCLUDED.league_id AND user_id = EXCLUDED.user_id AND market = 'OUTCOME' AND points_awarded > 0 AND is_settled = TRUE
      ),
      last_updated = NOW();
  END LOOP;

END;
$$;

CREATE OR REPLACE FUNCTION void_fixture(
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
  -- 1. Get Fixture Info
  SELECT gameweek_id, home_team_id, away_team_id
  INTO v_gameweek_id, v_home_team_id, v_away_team_id
  FROM fixtures
  WHERE id = p_fixture_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture with ID % not found', p_fixture_id;
  END IF;

  -- 2. Update Fixture Status
  UPDATE fixtures
  SET status = 'POSTPONED',
      settled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_fixture_id;

  -- 3. Void LMS Picks (no life lost)
  UPDATE lms_picks
  SET result = 'VOID',
      updated_at = NOW()
  WHERE gameweek_id = v_gameweek_id
    AND team_id IN (v_home_team_id, v_away_team_id)
    AND result = 'PENDING';

  -- 4. Settle Predictor Picks with 0 points
  UPDATE predictor_picks
  SET points_awarded = 0,
      is_settled = TRUE,
      updated_at = NOW()
  WHERE fixture_id = p_fixture_id
    AND is_settled = FALSE;
END;
$$;
