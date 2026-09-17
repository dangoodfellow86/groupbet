import { query } from './pool';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runDatabaseSettlementTests() {
  console.log('--- Running Step 6 Live Database Settlement Tests against Supabase ---');

  // 1. Create Mock Users
  const userARes = await query(
    `
    INSERT INTO users (auth_id, display_name, email)
    VALUES ('auth-test-a-' || gen_random_uuid(), 'Alice Striker', 'alice.' || gen_random_uuid() || '@groupbet.dev')
    RETURNING id;
    `
  );
  const userAId = userARes.rows[0].id;

  const userBRes = await query(
    `
    INSERT INTO users (auth_id, display_name, email)
    VALUES ('auth-test-b-' || gen_random_uuid(), 'Bob Keeper', 'bob.' || gen_random_uuid() || '@groupbet.dev')
    RETURNING id;
    `
  );
  const userBId = userBRes.rows[0].id;
  console.log('✓ Created test users:', { userAId, userBId });

  // 2. Get competition & teams from synced DB
  const compRes = await query('SELECT id FROM competitions LIMIT 1');
  const competitionId = compRes.rows[0].id;

  const teamsRes = await query('SELECT id, name FROM teams LIMIT 2');
  const teamHome = teamsRes.rows[0];
  const teamAway = teamsRes.rows[1];
  console.log('✓ Using teams:', { home: teamHome.name, away: teamAway.name });

  // 3. Create a test gameweek & fixture
  const gwRes = await query(
    `
    INSERT INTO gameweeks (competition_id, gameweek_number, deadline, is_current, is_completed)
    VALUES ($1, 999, NOW() + INTERVAL '1 day', TRUE, FALSE)
    ON CONFLICT (competition_id, gameweek_number) DO UPDATE SET is_current = TRUE
    RETURNING id;
    `,
    [competitionId]
  );
  const gameweekId = gwRes.rows[0].id;

  const fixtureRes = await query(
    `
    INSERT INTO fixtures (external_id, gameweek_id, home_team_id, away_team_id, kickoff_time, status)
    VALUES (999001, $1, $2, $3, NOW() + INTERVAL '2 hours', 'SCHEDULED')
    ON CONFLICT (external_id) DO UPDATE SET status = 'SCHEDULED', settled_at = NULL, home_score = NULL, away_score = NULL
    RETURNING id;
    `,
    [gameweekId, teamHome.id, teamAway.id]
  );
  const fixtureId = fixtureRes.rows[0].id;
  console.log('✓ Created test fixture:', { fixtureId, gameweekId });

  // 4. Create LMS League & Entries
  const leagueRes = await query(
    `
    INSERT INTO leagues (competition_id, creator_id, name, type, invite_code, settings)
    VALUES ($1, $2, 'LMS Test Arena', 'LAST_MAN_STANDING', 'LMS-' || substr(gen_random_uuid()::text, 1, 8), '{"allow_repeat_teams": false}')
    RETURNING id;
    `,
    [competitionId, userAId]
  );
  const lmsLeagueId = leagueRes.rows[0].id;

  // Entry A (starts with 1 life, picks teamHome)
  const entryARes = await query(
    `
    INSERT INTO lms_entries (league_id, user_id, lives_remaining, status)
    VALUES ($1, $2, 1, 'ALIVE')
    RETURNING id;
    `,
    [lmsLeagueId, userAId]
  );
  const entryAId = entryARes.rows[0].id;

  // Entry B (starts with 1 life, picks teamAway)
  const entryBRes = await query(
    `
    INSERT INTO lms_entries (league_id, user_id, lives_remaining, status)
    VALUES ($1, $2, 1, 'ALIVE')
    RETURNING id;
    `,
    [lmsLeagueId, userBId]
  );
  const entryBId = entryBRes.rows[0].id;

  // Picks: Alice picks teamHome, Bob picks teamAway
  await query(
    `
    INSERT INTO lms_picks (entry_id, gameweek_id, team_id, result)
    VALUES ($1, $2, $3, 'PENDING'), ($4, $2, $5, 'PENDING');
    `,
    [entryAId, gameweekId, teamHome.id, entryBId, teamAway.id]
  );
  console.log('✓ Created LMS entries and pending picks for Alice and Bob');

  // 5. Create Predictor Picks for Alice
  const predLeagueRes = await query(
    `
    INSERT INTO leagues (competition_id, creator_id, name, type, invite_code)
    VALUES ($1, $2, 'Predictor Arena', 'PREDICTOR', 'PRED-' || substr(gen_random_uuid()::text, 1, 8))
    RETURNING id;
    `,
    [competitionId, userAId]
  );
  const predLeagueId = predLeagueRes.rows[0].id;

  // Alice predicts 2-1 (Exact Score) and HOME (Outcome)
  await query(
    `
    INSERT INTO predictor_picks (league_id, user_id, fixture_id, market, predicted_home_score, predicted_away_score, predicted_outcome)
    VALUES 
      ($1, $2, $3, 'EXACT_SCORE', 2, 1, NULL),
      ($1, $2, $3, 'OUTCOME', NULL, NULL, 'HOME'),
      ($1, $2, $3, 'BTTS', NULL, NULL, 'YES');
    `,
    [predLeagueId, userAId, fixtureId]
  );
  console.log('✓ Created Predictor picks for Alice (2-1, HOME, BTTS YES)');

  // =========================================================================
  // EXECUTE SETTLEMENT: Home Team wins 2-1!
  // =========================================================================
  console.log('--- Executing settle_fixture(fixtureId, 2, 1) ---');
  await query('SELECT settle_fixture($1, 2, 1)', [fixtureId]);

  // 6. Verify LMS Settlement
  const pickARes = await query('SELECT result FROM lms_picks WHERE entry_id = $1', [entryAId]);
  assert(pickARes.rows[0].result === 'SURVIVED', 'Alice (picked Home team) should SURVIVE');

  const pickBRes = await query('SELECT result FROM lms_picks WHERE entry_id = $1', [entryBId]);
  assert(pickBRes.rows[0].result === 'LOST_LIFE', 'Bob (picked Away team) should have LOST_LIFE');

  const entryBCheck = await query('SELECT lives_remaining, status FROM lms_entries WHERE id = $1', [entryBId]);
  assert(entryBCheck.rows[0].lives_remaining === 0, 'Bob should have 0 lives left');
  assert(entryBCheck.rows[0].status === 'ELIMINATED', 'Bob should be ELIMINATED');

  // Verify lone survivor triggered WINNER status
  const entryACheck = await query('SELECT status FROM lms_entries WHERE id = $1', [entryAId]);
  assert(
    entryACheck.rows[0].status === 'WINNER',
    'Alice should be marked WINNER as the sole remaining active entry'
  );
  console.log('✓ LMS Settlement Verified: Winner detected and eliminated player lost life!');

  // 7. Verify Predictor Settlement & Leaderboard Rollup
  const exactPick = await query(
    "SELECT points_awarded, is_settled FROM predictor_picks WHERE league_id = $1 AND market = 'EXACT_SCORE'",
    [predLeagueId]
  );
  assert(exactPick.rows[0].points_awarded === 3, 'Exact score should award 3 points');
  assert(exactPick.rows[0].is_settled === true, 'Pick should be marked settled');

  const outcomePick = await query(
    "SELECT points_awarded FROM predictor_picks WHERE league_id = $1 AND market = 'OUTCOME'",
    [predLeagueId]
  );
  assert(outcomePick.rows[0].points_awarded === 1, 'Outcome HOME should award 1 point');

  const bttsPick = await query(
    "SELECT points_awarded FROM predictor_picks WHERE league_id = $1 AND market = 'BTTS'",
    [predLeagueId]
  );
  assert(bttsPick.rows[0].points_awarded === 1, 'BTTS YES should award 1 point');

  const leaderboardCheck = await query(
    'SELECT total_points, correct_exact_scores, correct_outcomes FROM predictor_leaderboard WHERE league_id = $1 AND user_id = $2',
    [predLeagueId, userAId]
  );
  assert(leaderboardCheck.rows.length === 1, 'Leaderboard record should exist');
  assert(leaderboardCheck.rows[0].total_points === 5, 'Leaderboard total points should equal 5 (3+1+1)');
  assert(leaderboardCheck.rows[0].correct_exact_scores === 1, 'Correct exact scores should equal 1');
  assert(leaderboardCheck.rows[0].correct_outcomes === 1, 'Correct outcomes should equal 1');
  console.log('✓ Predictor Settlement Verified: Points awarded & Leaderboard rolled up correctly (5 points total)!');

  // Clean up test data
  await query('DELETE FROM gameweeks WHERE id = $1', [gameweekId]);
  await query('DELETE FROM leagues WHERE id IN ($1, $2)', [lmsLeagueId, predLeagueId]);
  await query('DELETE FROM users WHERE id IN ($1, $2)', [userAId, userBId]);
  console.log('✓ Test data cleaned up cleanly');

  console.log('All Step 6 Database Settlement tests passed successfully!');
}

runDatabaseSettlementTests().catch((err) => {
  console.error('Database Settlement test failed:', err);
  process.exit(1);
});
