import assert from 'node:assert/strict';
import { query } from '../db/pool';
import { createLeague, joinLeague } from './leagues';
import { submitLmsPick } from './lms';
import { submitPredictorPicks } from './predictor';
import { getLeagueHistoryMatrix, getUserBurnedTeams } from './history';

async function runTests() {
  console.log('🧪 Starting Gameweek History & Burned Teams Test Suite...\n');

  try {
    // ------------------------------------------------------------------------
    // 1. SETUP: Create Test League and 2 Players using standard actions
    // ------------------------------------------------------------------------
    console.log('1. Setting up test league and participants...');
    const now = Date.now();
    const hostName = `Host_${now}`;
    const hostEmail = `host_${now}@test.com`;
    const friendName = `Friend_${now}`;
    const friendEmail = `friend_${now}@test.com`;

    const createRes = await createLeague({
      name: 'History Test Tournament',
      type: 'ALL_IN_ONE',
      creatorDisplayName: hostName,
      creatorEmail: hostEmail,
      exclusiveTeamPicks: false,
    });
    assert.ok(createRes.success, `League creation failed: ${createRes.message}`);
    const leagueId = createRes.league!.id;
    const inviteCode = createRes.inviteCode!;
    const hostId = createRes.user!.id;
    const hostEntryId = createRes.entryId!;

    // Join friend
    const joinRes = await joinLeague({
      inviteCode,
      displayName: friendName,
      email: friendEmail,
    });
    assert.ok(joinRes.success, `Friend join failed: ${joinRes.message}`);
    const friendId = joinRes.user!.id;

    // Get GW 5 ID
    const gw5Res = await query(`SELECT id FROM gameweeks WHERE gameweek_number = 5 LIMIT 1;`);
    assert.ok(gw5Res.rows.length > 0, 'Gameweek 5 should exist');
    const gameweek5Id = gw5Res.rows[0].id;

    // Get a fixture in GW 5
    const fixtureRes = await query(`
      SELECT f.id, f.home_team_id, f.away_team_id, ht.name as home_name
      FROM fixtures f
      JOIN teams ht ON f.home_team_id = ht.id
      WHERE f.gameweek_id = $1
      LIMIT 1;
    `, [gameweek5Id]);
    assert.ok(fixtureRes.rows.length > 0, 'GW 5 fixture should exist');
    const fixture = fixtureRes.rows[0];
    const teamAId = fixture.home_team_id;
    const teamAName = fixture.home_name;

    // Submit an LMS pick for Host in GW 5
    console.log('\n2. Submitting LMS Pick for Host in GW 5...');
    const lmsRes = await submitLmsPick({
      entryId: hostEntryId,
      gameweekId: gameweek5Id,
      teamId: teamAId,
      fixtureId: fixture.id,
      teamName: teamAName,
    });
    assert.ok(lmsRes.success, `Host LMS pick failed: ${lmsRes.message}`);

    // Submit a Predictor pick for Friend in GW 5
    console.log('\n3. Submitting Predictor Pick for Friend in GW 5...');
    const predRes = await submitPredictorPicks({
      leagueId,
      userId: friendId,
      fixtureId: fixture.id,
      exactScore: { home: 2, away: 1 },
    });
    assert.ok(predRes.success, `Friend Predictor pick failed: ${predRes.message}`);

    // ------------------------------------------------------------------------
    // 4. TEST: getLeagueHistoryMatrix
    // ------------------------------------------------------------------------
    console.log('\n4. Testing getLeagueHistoryMatrix...');
    const matrixRes = await getLeagueHistoryMatrix(leagueId, hostId);
    assert.ok(matrixRes.success, 'Matrix retrieval should succeed');
    assert.equal(matrixRes.gameweeks.length, 5, 'Should return gameweeks 1 through 5');
    assert.equal(matrixRes.currentGameweek, 5, 'Current gameweek should be 5');
    assert.equal(matrixRes.players.length, 2, 'Should return both registered players');

    // Verify Host's GW 5 Pick is visible to Host
    const hostRow = matrixRes.players.find((p) => p.userId === hostId);
    assert.ok(hostRow, 'Host should be present in matrix');
    assert.ok(hostRow.picksByGameweek[5], 'Host should have GW 5 pick recorded');
    assert.equal(hostRow.picksByGameweek[5].teamName, teamAName, 'Host should see their own team pick');

    // ------------------------------------------------------------------------
    // 5. TEST: getUserBurnedTeams
    // ------------------------------------------------------------------------
    console.log('\n5. Testing getUserBurnedTeams...');
    const burnedRes = await getUserBurnedTeams(leagueId, hostId);
    assert.ok(burnedRes.success, 'getUserBurnedTeams should succeed');
    assert.equal(burnedRes.teams.length, 20, 'Should return all 20 Premier League teams');
    assert.equal(burnedRes.burnedCount, 1, 'Host should have exactly 1 burned team');
    assert.equal(burnedRes.availableCount, 19, 'Host should have 19 available teams');

    const burnedTeamA = burnedRes.teams.find((t) => t.id === teamAId);
    assert.ok(burnedTeamA, 'Team A should be found');
    assert.equal(burnedTeamA.isBurned, true, 'Team A should be marked as burned');
    assert.equal(burnedTeamA.gameweekNumber, 5, 'Team A should have gameweekNumber = 5');

    console.log('\n✨ All Gameweek History & Burned Teams Tests Passed successfully!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
