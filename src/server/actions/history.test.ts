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

    // Get upcoming scheduled fixture
    const fixtureRes = await query(`
      SELECT f.id, f.gameweek_id, f.home_team_id, f.away_team_id, f.kickoff_time, ht.name as home_name, gw.gameweek_number
      FROM fixtures f
      JOIN gameweeks gw ON f.gameweek_id = gw.id
      JOIN teams ht ON f.home_team_id = ht.id
      WHERE f.status = 'SCHEDULED' AND f.kickoff_time > NOW()
      ORDER BY f.kickoff_time ASC
      LIMIT 1;
    `);
    assert.ok(fixtureRes.rows.length > 0, 'Upcoming scheduled fixture should exist');
    const fixture = fixtureRes.rows[0];
    const targetGwId = fixture.gameweek_id;
    const targetGw = fixture.gameweek_number;
    const teamAId = fixture.home_team_id;
    const teamAName = fixture.home_name;

    // Submit an LMS pick for Host
    console.log(`\n2. Submitting LMS Pick for Host in GW ${targetGw}...`);
    const lmsRes = await submitLmsPick({
      entryId: hostEntryId,
      gameweekId: targetGwId,
      teamId: teamAId,
      fixtureId: fixture.id,
      teamName: teamAName,
      kickoffTime: fixture.kickoff_time,
    });
    assert.ok(lmsRes.success, `Host LMS pick failed: ${lmsRes.message}`);

    // Submit a Predictor pick for Friend
    console.log(`\n3. Submitting Predictor Pick for Friend in GW ${targetGw}...`);
    const predRes = await submitPredictorPicks({
      leagueId,
      userId: friendId,
      fixtureId: fixture.id,
      exactScore: { home: 2, away: 1 },
      kickoffTime: fixture.kickoff_time,
    });
    assert.ok(predRes.success, `Friend Predictor pick failed: ${predRes.message}`);

    // ------------------------------------------------------------------------
    // 4. TEST: getLeagueHistoryMatrix
    // ------------------------------------------------------------------------
    console.log('\n4. Testing getLeagueHistoryMatrix...');
    const matrixRes = await getLeagueHistoryMatrix(leagueId, hostId);
    assert.ok(matrixRes.success, 'Matrix retrieval should succeed');
    assert.equal(matrixRes.gameweeks.length, targetGw, `Should return gameweeks 1 through ${targetGw}`);
    assert.equal(matrixRes.currentGameweek, targetGw, `Current gameweek should be ${targetGw}`);
    assert.equal(matrixRes.players.length, 2, 'Should return both registered players');

    // Verify Host's Pick is visible to Host
    const hostRow = matrixRes.players.find((p) => p.userId === hostId);
    assert.ok(hostRow, 'Host should be present in matrix');
    assert.ok(hostRow.picksByGameweek[targetGw], `Host should have GW ${targetGw} pick recorded`);
    assert.equal(hostRow.picksByGameweek[targetGw].teamName, teamAName, 'Host should see their own team pick');

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
    assert.equal(burnedTeamA.gameweekNumber, targetGw, `Team A should have gameweekNumber = ${targetGw}`);

    console.log('\n✨ All Gameweek History & Burned Teams Tests Passed successfully!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
