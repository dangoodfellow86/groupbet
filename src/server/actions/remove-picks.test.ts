import assert from 'node:assert/strict';
import { query } from '../db/pool';
import { createLeague, joinLeague } from './leagues';
import { submitLmsPick, removeLmsPick } from './lms';
import {
  submitPredictorPicks,
  removePredictorPicks,
  getUserGameweekPredictions,
} from './predictor';

async function runTests() {
  console.log('🧪 Starting Remove Pick Tests (LMS & Predictor)...\n');

  try {
    // ----------------------------------------------------
    // 1. LMS PICK REMOVAL & CLAIM RELEASE
    // ----------------------------------------------------
    console.log('1. Setting up LMS league and testing removeLmsPick...');
    const lmsHostName = `LmsRemoveHost_${Date.now()}`;
    const lmsLeagueRes = await createLeague({
      name: 'LMS Remove Test League',
      type: 'LAST_MAN_STANDING',
      creatorDisplayName: lmsHostName,
      creatorEmail: `lms_remove_${Date.now()}@test.com`,
      startingGameweek: 5,
    });
    assert.ok(lmsLeagueRes.success, 'Failed to create LMS league');
    const lmsLeagueId = lmsLeagueRes.league!.id;
    const lmsEntryId = lmsLeagueRes.entryId!;

    // Get a GW5 fixture
    const fixRes = await query(
      `SELECT f.id, f.gameweek_id, f.home_team_id, f.away_team_id, f.kickoff_time,
              ht.name AS home_name, at.name AS away_name
       FROM fixtures f
       JOIN gameweeks gw ON f.gameweek_id = gw.id
       JOIN teams ht ON f.home_team_id = ht.id
       JOIN teams at ON f.away_team_id = at.id
       WHERE gw.gameweek_number = 5
       LIMIT 1`
    );
    assert.ok(fixRes.rows.length > 0, 'No GW5 fixture found');
    const fixture = fixRes.rows[0];

    // Submit LMS pick
    const submitRes = await submitLmsPick({
      entryId: lmsEntryId,
      gameweekId: fixture.gameweek_id,
      teamId: fixture.home_team_id,
      fixtureId: fixture.id,
      kickoffTime: new Date(Date.now() + 86400000).toISOString(),
      teamName: fixture.home_name,
    });
    assert.ok(submitRes.success, 'Failed to submit LMS pick');

    // Verify pick exists
    const pickCheck1 = await query(
      `SELECT id FROM lms_picks WHERE entry_id = $1 AND gameweek_id = $2`,
      [lmsEntryId, fixture.gameweek_id]
    );
    assert.equal(pickCheck1.rows.length, 1, 'LMS pick should exist in database');
    console.log(`   ✅ Player 1 confirmed LMS pick for ${fixture.home_name}`);

    // Remove the pick
    const removeRes = await removeLmsPick({
      entryId: lmsEntryId,
      gameweekId: fixture.gameweek_id,
    });
    assert.ok(removeRes.success, `removeLmsPick failed: ${removeRes.message}`);
    console.log(`   ✅ LMS Pick successfully removed: "${removeRes.message}"`);

    // Verify pick is deleted
    const pickCheck2 = await query(
      `SELECT id FROM lms_picks WHERE entry_id = $1 AND gameweek_id = $2`,
      [lmsEntryId, fixture.gameweek_id]
    );
    assert.equal(pickCheck2.rows.length, 0, 'LMS pick should be deleted from database');
    console.log(`   ✅ Database verified: LMS pick record was cleanly removed`);

    // ----------------------------------------------------
    // 2. PREDICTOR PICK REMOVAL & RELEASE EXCLUSIVE MATCH
    // ----------------------------------------------------
    console.log('\n2. Setting up Predictor league and testing removePredictorPicks...');
    const predHostName = `PredHost_${Date.now()}`;
    const predLeagueRes = await createLeague({
      name: 'Predictor Remove Test League',
      type: 'PREDICTOR',
      creatorDisplayName: predHostName,
      creatorEmail: `pred_rem_${Date.now()}@test.com`,
      startingGameweek: 5,
    });
    assert.ok(predLeagueRes.success, 'Failed to create Predictor league');
    const predLeagueId = predLeagueRes.league!.id;
    const player1Id = predLeagueRes.user!.id;

    // Join Player 2
    const player2Res = await joinLeague({
      inviteCode: predLeagueRes.inviteCode!,
      displayName: `PredFriend_${Date.now()}`,
      email: `pred_friend_${Date.now()}@test.com`,
    });
    assert.ok(player2Res.success, 'Player 2 failed to join');
    const player2Id = player2Res.user!.id;

    // Player 1 claims fixture
    const futureKickoff = new Date(Date.now() + 86400000).toISOString();
    const p1Submit = await submitPredictorPicks({
      leagueId: predLeagueId,
      userId: player1Id,
      fixtureId: fixture.id,
      exactScore: { home: 2, away: 1 },
      outcome: 'HOME',
      btts: 'YES',
      overUnder: 'OVER',
      kickoffTime: futureKickoff,
    });
    assert.ok(p1Submit.success, 'Player 1 failed to submit prediction');
    console.log(`   ✅ Player 1 claimed fixture: ${fixture.home_name} vs ${fixture.away_name}`);

    // Player 2 attempts to claim SAME fixture (should be blocked by exclusivity)
    const p2Blocked = await submitPredictorPicks({
      leagueId: predLeagueId,
      userId: player2Id,
      fixtureId: fixture.id,
      exactScore: { home: 1, away: 1 },
      outcome: 'DRAW',
      btts: 'YES',
      overUnder: 'UNDER',
      kickoffTime: futureKickoff,
    });
    assert.equal(p2Blocked.success, false, 'Player 2 should be blocked by exclusivity');
    console.log(`   ✅ Player 2 correctly blocked by exclusivity: "${p2Blocked.message}"`);

    // Player 1 removes prediction
    const p1Remove = await removePredictorPicks({
      leagueId: predLeagueId,
      fixtureId: fixture.id,
      userId: player1Id,
    });
    assert.ok(p1Remove.success, `removePredictorPicks failed: ${p1Remove.message}`);
    console.log(`   ✅ Player 1 removed prediction: "${p1Remove.message}"`);

    // Verify Player 1 has no prediction left
    const p1Preds = await getUserGameweekPredictions(predLeagueId, 5, player1Id);
    assert.equal(p1Preds.predictions[fixture.id], undefined, 'Player 1 predictions should be cleared');

    // Now Player 2 can successfully claim the newly freed fixture!
    const p2Allowed = await submitPredictorPicks({
      leagueId: predLeagueId,
      userId: player2Id,
      fixtureId: fixture.id,
      exactScore: { home: 1, away: 1 },
      outcome: 'DRAW',
      btts: 'YES',
      overUnder: 'UNDER',
      kickoffTime: futureKickoff,
    });
    assert.ok(p2Allowed.success, `Player 2 should now be allowed to claim fixture: ${p2Allowed.message}`);
    console.log(`   ✅ Exclusivity freed: Player 2 successfully claimed the match after Player 1 removed it!`);

    // ----------------------------------------------------
    // 3. CLEANUP
    // ----------------------------------------------------
    console.log('\n3. Cleaning up test data...');
    await query(`DELETE FROM predictor_picks WHERE league_id = $1`, [predLeagueId]);
    await query(`DELETE FROM predictor_leaderboard WHERE league_id = $1`, [predLeagueId]);
    await query(`DELETE FROM league_members WHERE league_id IN ($1, $2)`, [lmsLeagueId, predLeagueId]);
    await query(`DELETE FROM lms_picks WHERE entry_id = $1`, [lmsEntryId]);
    await query(`DELETE FROM lms_entries WHERE league_id = $1`, [lmsLeagueId]);
    await query(`DELETE FROM leagues WHERE id IN ($1, $2)`, [lmsLeagueId, predLeagueId]);
    console.log('   🧹 Test data cleaned up.');

    console.log('\n🎉 ALL REMOVE PICK TESTS PASSED!');
  } catch (err) {
    console.error('❌ Remove pick tests failed:', err);
    process.exit(1);
  }
}

runTests();
