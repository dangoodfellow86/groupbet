-- ====================================================================
-- 010_auto_advance_gameweek.sql
-- Automatic Gameweek Completion & Active Gameweek Advancement
-- ====================================================================

-- 1. Helper Procedure: Recalculate completion for a gameweek and ensure
--    the competition's is_current flag points to the lowest uncompleted gameweek.
CREATE OR REPLACE FUNCTION public.sync_gameweek_completion(
  p_gameweek_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_competition_id UUID;
  v_total_actionable INT;
  v_unfinished_count INT;
  v_is_completed BOOLEAN;
  v_target_current_gw_id UUID;
BEGIN
  SELECT competition_id
  INTO v_competition_id
  FROM gameweeks
  WHERE id = p_gameweek_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Count actionable fixtures (excluding POSTPONED and CANCELLED) and unfinished fixtures (SCHEDULED or LIVE)
  SELECT
    COUNT(*) FILTER (WHERE status NOT IN ('POSTPONED', 'CANCELLED')),
    COUNT(*) FILTER (WHERE status IN ('SCHEDULED', 'LIVE'))
  INTO v_total_actionable, v_unfinished_count
  FROM fixtures
  WHERE gameweek_id = p_gameweek_id;

  -- A gameweek is completed when it has at least 1 actionable fixture and 0 unfinished fixtures
  v_is_completed := (v_total_actionable > 0 AND v_unfinished_count = 0);

  UPDATE gameweeks
  SET is_completed = v_is_completed,
      updated_at = NOW()
  WHERE id = p_gameweek_id
    AND is_completed IS DISTINCT FROM v_is_completed;

  -- Determine the true current gameweek for this competition:
  -- The lowest gameweek_number where is_completed = FALSE (or fallback to highest gameweek_number if season finished)
  SELECT id
  INTO v_target_current_gw_id
  FROM gameweeks
  WHERE competition_id = v_competition_id
    AND is_completed = FALSE
  ORDER BY gameweek_number ASC
  LIMIT 1;

  IF v_target_current_gw_id IS NULL THEN
    SELECT id
    INTO v_target_current_gw_id
    FROM gameweeks
    WHERE competition_id = v_competition_id
    ORDER BY gameweek_number DESC
    LIMIT 1;
  END IF;

  -- Clear is_current on any other gameweek in this competition
  UPDATE gameweeks
  SET is_current = FALSE,
      updated_at = NOW()
  WHERE competition_id = v_competition_id
    AND is_current = TRUE
    AND id IS DISTINCT FROM v_target_current_gw_id;

  -- Set is_current = TRUE on the target gameweek
  IF v_target_current_gw_id IS NOT NULL THEN
    UPDATE gameweeks
    SET is_current = TRUE,
        updated_at = NOW()
    WHERE id = v_target_current_gw_id
      AND is_current = FALSE;
  END IF;
END;
$$;

-- 2. Upgrade settle_fixture to automatically advance gameweek when final fixture settles
CREATE OR REPLACE FUNCTION public.settle_fixture(
  p_fixture_id UUID,
  p_home_score INT,
  p_away_score INT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
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
    -- Even on idempotent exit, ensure gameweek completion flag is consistent
    PERFORM sync_gameweek_completion(v_gameweek_id);
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
      UPDATE lms_picks
      SET result = 'SURVIVED', updated_at = NOW()
      WHERE id = r_lms.pick_id;
    ELSE
      UPDATE lms_picks
      SET result = 'LOST_LIFE', updated_at = NOW()
      WHERE id = r_lms.pick_id;

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

  -- 7. Synchronize Gameweek Completion & Active Gameweek Flag
  PERFORM sync_gameweek_completion(v_gameweek_id);
END;
$$;

-- 3. Upgrade void_fixture to synchronize gameweek completion
CREATE OR REPLACE FUNCTION public.void_fixture(
  p_fixture_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_gameweek_id UUID;
  v_home_team_id UUID;
  v_away_team_id UUID;
BEGIN
  SELECT gameweek_id, home_team_id, away_team_id
  INTO v_gameweek_id, v_home_team_id, v_away_team_id
  FROM fixtures
  WHERE id = p_fixture_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture with ID % not found', p_fixture_id;
  END IF;

  UPDATE fixtures
  SET status = 'POSTPONED',
      settled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_fixture_id;

  UPDATE lms_picks
  SET result = 'VOID',
      updated_at = NOW()
  WHERE gameweek_id = v_gameweek_id
    AND team_id IN (v_home_team_id, v_away_team_id)
    AND result = 'PENDING';

  UPDATE predictor_picks
  SET points_awarded = 0,
      is_settled = TRUE,
      updated_at = NOW()
  WHERE fixture_id = p_fixture_id
    AND is_settled = FALSE;

  PERFORM sync_gameweek_completion(v_gameweek_id);
END;
$$;

-- 4. Upgrade set_fixture_live to synchronize gameweek completion
CREATE OR REPLACE FUNCTION public.set_fixture_live(
  p_fixture_id UUID,
  p_home_score INT,
  p_away_score INT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_gameweek_id UUID;
BEGIN
  UPDATE fixtures
  SET status = 'LIVE',
      home_score = p_home_score,
      away_score = p_away_score,
      settled_at = NULL,
      updated_at = NOW()
  WHERE id = p_fixture_id
  RETURNING gameweek_id INTO v_gameweek_id;

  IF v_gameweek_id IS NOT NULL THEN
    PERFORM sync_gameweek_completion(v_gameweek_id);
  END IF;
END;
$$;

-- 5. Upgrade revert_fixture to synchronize gameweek completion
CREATE OR REPLACE FUNCTION public.revert_fixture(
  p_fixture_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_gameweek_id UUID;
  v_home_team_id UUID;
  v_away_team_id UUID;
BEGIN
  SELECT gameweek_id, home_team_id, away_team_id
  INTO v_gameweek_id, v_home_team_id, v_away_team_id
  FROM fixtures
  WHERE id = p_fixture_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture with ID % not found', p_fixture_id;
  END IF;

  UPDATE fixtures
  SET status = 'SCHEDULED',
      home_score = NULL,
      away_score = NULL,
      settled_at = NULL,
      updated_at = NOW()
  WHERE id = p_fixture_id;

  UPDATE predictor_picks
  SET points_awarded = 0,
      is_settled = FALSE,
      updated_at = NOW()
  WHERE fixture_id = p_fixture_id;

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

  UPDATE lms_picks
  SET result = 'PENDING',
      updated_at = NOW()
  WHERE gameweek_id = v_gameweek_id
    AND team_id IN (v_home_team_id, v_away_team_id);

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

  UPDATE lms_entries le
  SET status = 'ALIVE',
      updated_at = NOW()
  WHERE le.status = 'WINNER'
    AND (
      SELECT COUNT(*)
      FROM lms_entries sub
      WHERE sub.league_id = le.league_id AND sub.status IN ('ALIVE', 'WINNER')
    ) > 1;

  PERFORM sync_gameweek_completion(v_gameweek_id);
END;
$$;

-- 6. Lock down EXECUTE privileges on all administrative functions
REVOKE EXECUTE ON FUNCTION public.sync_gameweek_completion(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_fixture(UUID, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.void_fixture(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_fixture_live(UUID, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revert_fixture(UUID) FROM PUBLIC, anon, authenticated;

-- 7. Immediate Reconciliation Across All Existing Gameweeks
DO $$
DECLARE
  r_gw RECORD;
BEGIN
  FOR r_gw IN SELECT id FROM public.gameweeks ORDER BY gameweek_number ASC LOOP
    PERFORM public.sync_gameweek_completion(r_gw.id);
  END LOOP;
END;
$$;
