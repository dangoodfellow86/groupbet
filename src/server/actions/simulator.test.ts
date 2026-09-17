import assert from 'node:assert/strict';
import { query } from '../db/pool';
import { createLeague } from './leagues';
import { submitPredictorPicks } from './predictor';
import {
  simulateFixtureLive,
  simulateFixtureFinished,
  resetFixture,
  simulateEntireGameweek,
  resetEntireGameweek,
} from './simulator';

async function runTests() {
  console.log('🧪 Starting Match Simulator & Settlement Reversal Test Suite...\n');

  let testLeagueId: string | null = null;
  let testUserId: string | null = null;
  let targetFixtureId: string | null = null;

  try {
    // 1. Fetch a Gameweek 5 Fixture for Testing
    console.log('1. Fetching a Gameweek 5 fixture...');
    const fixRes = await query(
      `
      SELECT f.id, f.home_team_id, f.away_team_id, t_home.name AS home_name, t_away.name AS away_name
      FROM fixtures f
      JOIN gameweeks gw ON f.gameweek_id = gw.id
      JOIN teams t_home ON f.home_team_id = t_home.id
      JOIN teams t_away ON f.away_team_id = t_away.id
      WHERE gw.gameweek_number = 5
      LIMIT 1;
      `
    );

    assert.ok(fixRes.rows.length > 0, 'Should find at least 1 fixture in GW 5');
    const targetFixture = fixRes.rows[0];
    targetFixtureId = targetFixture.id;
    console.log(`   ✅ Target fixture: ${targetFixture.home_name} vs ${targetFixture.away_name} (${targetFixtureId})`);

    // 2. Set up a Test User & All-in-One League with Picks
    console.log('\n2. Setting up test user and All-in-One league with picks...');
    const hostEmail = `sim_host_${Date.now()}@test.com`;
    const hostName = `SimHost_${Date.now()}`;

    const leagueRes = await createLeague({
      name: 'Simulator Sandbox League',
      type: 'ALL_IN_ONE',
      creatorDisplayName: hostName,
      creatorEmail: hostEmail,
      startingGameweek: 5,
      startingLives: 2,
    });

    assert.ok(leagueRes.success);
    testLeagueId = leagueRes.league!.id;
    testUserId = leagueRes.user!.id;

    // Submit Predictor picks for target fixture (Exact score: 2-1)
    const predRes = await submitPredictorPicks({
      leagueId: testLeagueId,
      userId: testUserId,
      fixtureId: targetFixtureId!,
      exactScore: { home: 2, away: 1 },
      outcome: 'HOME',
      btts: 'YES',
      overUnder: 'OVER',
    });
    assert.ok(predRes.success, 'Predictor pick should be submitted');

    // Submit LMS pick on Home team
    const gwRes = await query(`SELECT id FROM gameweeks WHERE gameweek_number = 5`);
    const gw5Id = gwRes.rows[0].id;

    await query(
      `
      INSERT INTO lms_picks (entry_id, gameweek_id, team_id, result)
      VALUES ($1, $2, $3, 'PENDING')
      ON CONFLICT (entry_id, gameweek_id) DO UPDATE SET team_id = EXCLUDED.team_id, result = 'PENDING';
      `,
      [leagueRes.entryId!, gw5Id, targetFixture.home_team_id]
    );
    console.log('   ✅ Test league, Predictor picks (2-1), and LMS pick (Home team) initialized');

    // 3. Test simulateFixtureLive (In-Play)
    console.log('\n3. Testing simulateFixtureLive (setting status to LIVE with live score)...');
    const liveRes = await simulateFixtureLive({
      fixtureId: targetFixtureId!,
      homeScore: 1,
      awayScore: 0,
    });
    assert.ok(liveRes.success, liveRes.message);

    const checkLive = await query(`SELECT status, home_score, away_score, settled_at FROM fixtures WHERE id = $1`, [targetFixtureId]);
    assert.equal(checkLive.rows[0].status, 'LIVE');
    assert.equal(checkLive.rows[0].home_score, 1);
    assert.equal(checkLive.rows[0].away_score, 0);
    assert.equal(checkLive.rows[0].settled_at, null);
    console.log('   ✅ Match successfully transitioned to LIVE (1 - 0)');

    // 4. Test simulateFixtureFinished (Full Time Settlement)
    console.log('\n4. Testing simulateFixtureFinished (Full Time settlement at 2 - 1)...');
    const ftRes = await simulateFixtureFinished({
      fixtureId: targetFixtureId!,
      homeScore: 2,
      awayScore: 1,
    });
    assert.ok(ftRes.success, ftRes.message);

    const checkFt = await query(`SELECT status, home_score, away_score, settled_at FROM fixtures WHERE id = $1`, [targetFixtureId]);
    assert.equal(checkFt.rows[0].status, 'FINISHED');
    assert.equal(checkFt.rows[0].home_score, 2);
    assert.equal(checkFt.rows[0].away_score, 1);
    assert.ok(checkFt.rows[0].settled_at !== null);

    // Verify Predictor Leaderboard updated with points (+3 exact, +1 outcome, +1 btts, +1 over = 6 pts)
    const plbCheck = await query(
      `SELECT total_points, correct_exact_scores, correct_outcomes FROM predictor_leaderboard WHERE league_id = $1 AND user_id = $2`,
      [testLeagueId, testUserId]
    );
    assert.equal(plbCheck.rows[0].total_points, 6, 'Player should have earned 6 points for 2-1 scoreline');
    assert.equal(plbCheck.rows[0].correct_exact_scores, 1);
    assert.equal(plbCheck.rows[0].correct_outcomes, 1);

    // Verify LMS Pick survived
    const lmsPickCheck = await query(
      `SELECT result FROM lms_picks WHERE entry_id = $1 AND gameweek_id = $2`,
      [leagueRes.entryId!, gw5Id]
    );
    assert.equal(lmsPickCheck.rows[0].result, 'SURVIVED');
    console.log('   ✅ Match settled FT: Predictor Leaderboard awarded 6 pts, LMS pick SURVIVED');

    // 5. Test resetFixture (Revert to Scheduled)
    console.log('\n5. Testing resetFixture (reverting fixture back to SCHEDULED)...');
    const resetRes = await resetFixture(targetFixtureId!);
    assert.ok(resetRes.success, resetRes.message);

    const checkReset = await query(`SELECT status, home_score, away_score, settled_at FROM fixtures WHERE id = $1`, [targetFixtureId]);
    assert.equal(checkReset.rows[0].status, 'SCHEDULED');
    assert.equal(checkReset.rows[0].home_score, null);
    assert.equal(checkReset.rows[0].away_score, null);
    assert.equal(checkReset.rows[0].settled_at, null);

    // Verify Leaderboard rolled back cleanly
    const plbResetCheck = await query(
      `SELECT total_points, correct_exact_scores, correct_outcomes FROM predictor_leaderboard WHERE league_id = $1 AND user_id = $2`,
      [testLeagueId, testUserId]
    );
    assert.equal(plbResetCheck.rows[0].total_points, 0, 'Points should be reverted to 0');
    assert.equal(plbResetCheck.rows[0].correct_exact_scores, 0);

    // Verify LMS pick reverted to PENDING
    const lmsResetPickCheck = await query(
      `SELECT result FROM lms_picks WHERE entry_id = $1 AND gameweek_id = $2`,
      [leagueRes.entryId!, gw5Id]
    );
    assert.equal(lmsResetPickCheck.rows[0].result, 'PENDING');
    console.log('   ✅ Match cleanly reverted: Points rolled back to 0, LMS pick restored to PENDING');

    // 6. Test Gameweek Simulation and Gameweek Revert
    console.log('\n6. Testing simulateEntireGameweek & resetEntireGameweek...');
    const gwSimRes = await simulateEntireGameweek(5);
    assert.ok(gwSimRes.success, gwSimRes.message);

    const checkAllFinished = await query(
      `SELECT COUNT(*)::int AS finished_count FROM fixtures f JOIN gameweeks gw ON f.gameweek_id = gw.id WHERE gw.gameweek_number = 5 AND f.status = 'FINISHED'`
    );
    assert.ok(checkAllFinished.rows[0].finished_count >= 10, 'All 10 fixtures should be FINISHED');
    console.log(`   ✅ Simulated full GW5: ${checkAllFinished.rows[0].finished_count} fixtures finished`);

    const gwResetRes = await resetEntireGameweek(5);
    assert.ok(gwResetRes.success, gwResetRes.message);

    const checkAllScheduled = await query(
      `SELECT COUNT(*)::int AS scheduled_count FROM fixtures f JOIN gameweeks gw ON f.gameweek_id = gw.id WHERE gw.gameweek_number = 5 AND f.status = 'SCHEDULED'`
    );
    assert.ok(checkAllScheduled.rows[0].scheduled_count >= 10, 'All 10 fixtures should be restored to SCHEDULED');
    console.log(`   ✅ Reset full GW5: ${checkAllScheduled.rows[0].scheduled_count} fixtures restored to SCHEDULED`);

    // 7. Clean up test records
    console.log('\n7. Cleaning up test data...');
    if (testLeagueId) {
      await query(`DELETE FROM leagues WHERE id = $1`, [testLeagueId]);
    }
    if (testUserId) {
      await query(`DELETE FROM users WHERE id = $1`, [testUserId]);
    }
    console.log('   🧹 Test data cleaned up.');

    console.log('\n🎉 ALL MATCH SIMULATOR TESTS PASSED!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    // Cleanup attempt if failed
    if (targetFixtureId) {
      await query(`SELECT revert_fixture($1)`, [targetFixtureId]).catch(() => {});
    }
    if (testLeagueId) {
      await query(`DELETE FROM leagues WHERE id = $1`, [testLeagueId]).catch(() => {});
    }
    if (testUserId) {
      await query(`DELETE FROM users WHERE id = $1`, [testUserId]).catch(() => {});
    }
    process.exit(1);
  }
}

runTests().then(() => process.exit(0));
