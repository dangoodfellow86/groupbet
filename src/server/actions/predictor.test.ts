import assert from 'node:assert/strict';
import { query } from '../db/pool';
import { createLeague } from './leagues';
import {
  submitPredictorPicks,
  getUserGameweekPredictions,
  getLeaguePredictorLeaderboard,
} from './predictor';

async function runTests() {
  console.log('🧪 Starting Predictor Server Action Tests...\n');

  try {
    // 1. Create a Predictor League
    console.log('1. Setting up test user & Predictor league...');
    const hostName = `PredictorHost_${Date.now()}`;
    const hostEmail = `pred_host_${Date.now()}@test.com`;

    const leagueRes = await createLeague({
      name: 'Premier League Predictor 2026',
      type: 'PREDICTOR',
      creatorDisplayName: hostName,
      creatorEmail: hostEmail,
      startingGameweek: 5,
    });

    assert.ok(leagueRes.success, `Failed to create league: ${leagueRes.message}`);
    const leagueId = leagueRes.league!.id;
    const userId = leagueRes.user!.id;
    console.log(`   ✅ Created league "${leagueRes.league!.name}" (${leagueId}) for ${hostName}`);

    // 2. Fetch a Gameweek 5 upcoming fixture
    console.log('\n2. Fetching upcoming fixture for GW 5...');
    const fixRes = await query(
      `
      SELECT f.id, f.kickoff_time, ht.name AS home_team, at.name AS away_team
      FROM fixtures f
      JOIN gameweeks gw ON f.gameweek_id = gw.id
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      WHERE gw.gameweek_number = 5 AND f.status = 'SCHEDULED'
      ORDER BY f.kickoff_time ASC
      LIMIT 1;
      `
    );

    assert.ok(fixRes.rows.length > 0, 'Should find at least 1 scheduled fixture in GW 5');
    const fixture = fixRes.rows[0];
    console.log(`   ✅ Using fixture: ${fixture.home_team} vs ${fixture.away_team} (${fixture.id})`);

    // 3. Submit Multi-Market Predictions
    console.log('\n3. Testing submitPredictorPicks (Exact Score, Outcome, BTTS, Over/Under)...');
    const submitRes = await submitPredictorPicks({
      leagueId,
      userId,
      fixtureId: fixture.id,
      exactScore: { home: 2, away: 1 },
      outcome: 'HOME',
      btts: 'YES',
      overUnder: 'OVER',
      kickoffTime: fixture.kickoff_time,
    });

    assert.ok(submitRes.success, `Pick submission failed: ${submitRes.message}`);
    console.log('   ✅ Multi-market predictions saved to database');

    // 4. Test getUserGameweekPredictions
    console.log('\n4. Testing getUserGameweekPredictions prefetching...');
    const picksRes = await getUserGameweekPredictions(leagueId, 5, userId);
    assert.ok(picksRes.success);
    const pred = picksRes.predictions[fixture.id];
    assert.ok(pred, 'Prediction for fixture should be returned');
    assert.equal(pred.exactScore?.home, 2);
    assert.equal(pred.exactScore?.away, 1);
    assert.equal(pred.outcome, 'HOME');
    assert.equal(pred.btts, 'YES');
    assert.equal(pred.overUnder, 'OVER');
    console.log('   ✅ Gameweek predictions correctly prefilled (2-1, HOME, BTTS YES, OVER 2.5)');

    // 5. Test getLeaguePredictorLeaderboard
    console.log('\n5. Testing getLeaguePredictorLeaderboard...');
    const lboardRes = await getLeaguePredictorLeaderboard(leagueId);
    assert.ok(lboardRes.success);
    assert.equal(lboardRes.leaderboard.length, 1);
    assert.equal(lboardRes.leaderboard[0].displayName, hostName);
    assert.equal(lboardRes.leaderboard[0].rank, 1);
    console.log(`   ✅ Predictor Leaderboard verified with player rank #1`);

    // 6. Test Deadline Enforcement (Simulate past kickoff)
    console.log('\n6. Testing past kickoff deadline rejection...');
    const pastKickoffResult = await submitPredictorPicks({
      leagueId,
      userId,
      fixtureId: fixture.id,
      exactScore: { home: 0, away: 0 },
      kickoffTime: new Date(Date.now() - 60000).toISOString(), // 1 minute in the past
    });
    assert.equal(pastKickoffResult.success, false);
    assert.match(pastKickoffResult.message, /locked|Kickoff/i);
    console.log('   ✅ Correctly rejected pick submission for match in the past');

    // 7. Test Exclusive Match Claim Rule (First-Come, First-Served)
    console.log('\n7. Testing Exclusive Match Claim Rule between 2 players...');
    const player2Name = `PredictorGuest_${Date.now()}`;
    const player2Email = `pred_guest_${Date.now()}@test.com`;
    const player2AuthId = `auth_pred_guest_${Date.now()}`;
    const player2UserRes = await query(
      `INSERT INTO users (auth_id, display_name, email) VALUES ($1, $2, $3) RETURNING id`,
      [player2AuthId, player2Name, player2Email]
    );
    const player2Id = player2UserRes.rows[0].id;

    // Player 2 attempts to predict on the SAME match (fixture.id) already chosen by Player 1
    const duplicateRes = await submitPredictorPicks({
      leagueId,
      userId: player2Id,
      fixtureId: fixture.id,
      exactScore: { home: 1, away: 0 },
      outcome: 'HOME',
      btts: 'NO',
      overUnder: 'UNDER',
      kickoffTime: fixture.kickoff_time,
    });
    assert.equal(duplicateRes.success, false);
    assert.match(duplicateRes.message, /already been chosen/i);
    console.log(`   ✅ Correctly rejected duplicate match selection: "${duplicateRes.message}"`);

    // Fetch a second fixture for Player 2
    const secondFixRes = await query(
      `
      SELECT f.id, f.kickoff_time, ht.name AS home_team, at.name AS away_team
      FROM fixtures f
      JOIN gameweeks gw ON f.gameweek_id = gw.id
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      WHERE gw.gameweek_number = 5 AND f.status = 'SCHEDULED' AND f.id != $1
      ORDER BY f.kickoff_time ASC
      LIMIT 1;
      `,
      [fixture.id]
    );
    assert.ok(secondFixRes.rows.length > 0, 'Should find a 2nd fixture in GW 5');
    const fixture2 = secondFixRes.rows[0];

    // Player 2 chooses the unclaimed 2nd match
    const uniqueRes = await submitPredictorPicks({
      leagueId,
      userId: player2Id,
      fixtureId: fixture2.id,
      exactScore: { home: 1, away: 0 },
      outcome: 'HOME',
      btts: 'NO',
      overUnder: 'UNDER',
      kickoffTime: fixture2.kickoff_time,
    });
    assert.ok(uniqueRes.success, `Unique pick should succeed: ${uniqueRes.message}`);
    console.log(`   ✅ Player 2 successfully claimed unique match: ${fixture2.home_team} vs ${fixture2.away_team}`);

    // 8. Test getLeagueGameweekPredictorClaims
    console.log('\n8. Testing getLeagueGameweekPredictorClaims API...');
    const matchClaimsRes = await import('./predictor').then((m) =>
      m.getLeagueGameweekPredictorClaims(leagueId, 5, userId)
    );
    assert.ok(matchClaimsRes.success);
    assert.equal(matchClaimsRes.exclusiveMatches, true);
    assert.ok(matchClaimsRes.claims[fixture.id], 'Host fixture should be claimed');
    assert.equal(matchClaimsRes.claims[fixture.id].isOwn, true, 'Host fixture should be owned by host');
    assert.equal(matchClaimsRes.claims[fixture.id].claimedBy, hostName);

    assert.ok(matchClaimsRes.claims[fixture2.id], 'Player 2 fixture should be claimed');
    assert.equal(matchClaimsRes.claims[fixture2.id].isOwn, false, 'Player 2 fixture is not owned by host');
    assert.equal(matchClaimsRes.claims[fixture2.id].claimedBy, player2Name);
    console.log('   ✅ Predictor match claims list verified with ownership flags (Fixture 1 isOwn=true, Fixture 2 isOwn=false)');

    // 9. Test 1-Match Limit Replacement
    console.log('\n9. Testing 1-match limit automatic replacement...');
    const thirdFixRes = await query(
      `
      SELECT f.id, f.kickoff_time, ht.name AS home_team, at.name AS away_team
      FROM fixtures f
      JOIN gameweeks gw ON f.gameweek_id = gw.id
      JOIN teams ht ON f.home_team_id = ht.id
      JOIN teams at ON f.away_team_id = at.id
      WHERE gw.gameweek_number = 5 AND f.status = 'SCHEDULED' AND f.id NOT IN ($1, $2)
      ORDER BY f.kickoff_time ASC
      LIMIT 1;
      `,
      [fixture.id, fixture2.id]
    );
    assert.ok(thirdFixRes.rows.length > 0, 'Should find a 3rd fixture in GW 5');
    const fixture3 = thirdFixRes.rows[0];

    // Player 2 switches their 1-match pick to fixture 3
    const switchRes = await submitPredictorPicks({
      leagueId,
      userId: player2Id,
      fixtureId: fixture3.id,
      exactScore: { home: 3, away: 0 },
      outcome: 'HOME',
      btts: 'NO',
      overUnder: 'OVER',
      kickoffTime: fixture3.kickoff_time,
    });
    assert.ok(switchRes.success, `Pick switch failed: ${switchRes.message}`);

    // Verify Player 2 now only has 1 pick in GW 5 on fixture 3
    const player2Picks = await getUserGameweekPredictions(leagueId, 5, player2Id);
    assert.ok(player2Picks.success);
    assert.equal(player2Picks.predictions[fixture2.id], undefined, 'Old fixture 2 pick must be deleted');
    assert.ok(player2Picks.predictions[fixture3.id], 'New fixture 3 pick must exist');
    assert.equal(player2Picks.predictions[fixture3.id].exactScore?.home, 3);
    assert.equal(player2Picks.predictions[fixture3.id].exactScore?.away, 0);
    console.log('   ✅ 1-Match limit successfully replaced fixture 2 pick with fixture 3 pick');

    // Clean up
    console.log('\n   🧹 Cleaning up test records...');
    await query('DELETE FROM leagues WHERE id = $1', [leagueId]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [userId, player2Id]);
    console.log('   ✅ Cleaned up successfully.');

    console.log('\n🎉 ALL PREDICTOR SERVER ACTION TESTS PASSED!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests().then(() => process.exit(0));
