import assert from 'node:assert/strict';
import { query } from '../db/pool';
import { createLeague, joinLeague } from './leagues';
import {
  verifyCommissioner,
  updateLeagueSettings,
  getLeagueMembersRoster,
  removeLeagueMember,
  startTournamentRoundTwo,
} from './commissioner';

async function runTests() {
  console.log('🧪 Starting League Commissioner & Round 2 Test Suite...\n');

  try {
    // ------------------------------------------------------------------------
    // 1. SETUP: Create League, Host, and 2 Players
    // ------------------------------------------------------------------------
    console.log('1. Setting up test league and participants...');
    const now = Date.now();
    const hostName = `HostComm_${now}`;
    const hostEmail = `host_${now}@comm.test`;
    const friendAName = `PlayerA_${now}`;
    const friendAEmail = `playera_${now}@comm.test`;
    const friendBName = `PlayerB_${now}`;
    const friendBEmail = `playerb_${now}@comm.test`;

    const createRes = await createLeague({
      name: 'Old Firm Clash 2026',
      type: 'ALL_IN_ONE',
      creatorDisplayName: hostName,
      creatorEmail: hostEmail,
      startingLives: 2,
    });
    assert.ok(createRes.success, `League creation failed: ${createRes.message}`);
    const leagueId = createRes.league!.id;
    const inviteCode = createRes.inviteCode!;
    const hostId = createRes.user!.id;
    const hostEntryId = createRes.entryId!;

    // Join Player A
    const joinARes = await joinLeague({
      inviteCode,
      displayName: friendAName,
      email: friendAEmail,
    });
    assert.ok(joinARes.success, 'Player A join failed');
    const playerAId = joinARes.user!.id;
    const playerAEntryId = joinARes.entryId!;

    // Join Player B
    const joinBRes = await joinLeague({
      inviteCode,
      displayName: friendBName,
      email: friendBEmail,
    });
    assert.ok(joinBRes.success, 'Player B join failed');
    const playerBId = joinBRes.user!.id;

    // ------------------------------------------------------------------------
    // 2. TEST: verifyCommissioner
    // ------------------------------------------------------------------------
    console.log('\n2. Testing verifyCommissioner...');
    const hostAuth = await verifyCommissioner(leagueId, hostId);
    assert.equal(hostAuth.isCommissioner, true, 'Host must be recognized as commissioner');

    const playerAuth = await verifyCommissioner(leagueId, playerAId);
    assert.equal(playerAuth.isCommissioner, false, 'Regular member must not be commissioner');
    console.log('   ✅ Permission verification validated');

    // ------------------------------------------------------------------------
    // 3. TEST: updateLeagueSettings
    // ------------------------------------------------------------------------
    console.log('\n3. Testing updateLeagueSettings...');
    // Unauthorized attempt
    const rogueUpdate = await updateLeagueSettings({
      leagueId,
      userId: playerAId,
      name: 'Hacked League',
    });
    assert.equal(rogueUpdate.success, false, 'Non-commissioner update must be rejected');

    // Authorized update
    const legitUpdate = await updateLeagueSettings({
      leagueId,
      userId: hostId,
      name: 'Premier Super League 2026',
      startingLives: 3,
      exclusiveTeamPicks: false,
    });
    assert.ok(legitUpdate.success, 'Commissioner update must succeed');
    assert.equal(legitUpdate.league.name, 'Premier Super League 2026');

    const dbCheck = await query(`SELECT name, settings FROM leagues WHERE id::text = $1`, [leagueId]);
    const settings = typeof dbCheck.rows[0].settings === 'string'
      ? JSON.parse(dbCheck.rows[0].settings)
      : dbCheck.rows[0].settings;
    assert.equal(settings.starting_lives, 3, 'Starting lives should be updated to 3');
    assert.equal(settings.exclusive_team_picks, false, 'Exclusive picks should be updated to false');
    console.log('   ✅ League name and settings updated in database');

    // ------------------------------------------------------------------------
    // 4. TEST: getLeagueMembersRoster
    // ------------------------------------------------------------------------
    console.log('\n4. Testing getLeagueMembersRoster...');
    const rosterRes = await getLeagueMembersRoster(leagueId, hostId);
    assert.ok(rosterRes.success, 'Roster retrieval should succeed');
    assert.equal(rosterRes.members.length, 3, 'Should list all 3 enrolled players');
    assert.equal(rosterRes.members[0].isCreator, true, 'Creator should be prioritized in roster');
    console.log('   ✅ Member roster accurately lists all players with roles');

    // ------------------------------------------------------------------------
    // 5. TEST: removeLeagueMember
    // ------------------------------------------------------------------------
    console.log('\n5. Testing removeLeagueMember...');
    // Attempt removing creator
    const removeHostRes = await removeLeagueMember(leagueId, hostId, hostId);
    assert.equal(removeHostRes.success, false, 'Cannot remove league founder');

    // Remove Player B
    const removePlayerBRes = await removeLeagueMember(leagueId, playerBId, hostId);
    assert.ok(removePlayerBRes.success, 'Host should successfully remove Player B');

    const checkMemberRes = await query(
      `SELECT COUNT(*)::int AS count FROM league_members WHERE league_id::text = $1`,
      [leagueId]
    );
    assert.equal(checkMemberRes.rows[0].count, 2, 'Should now have 2 members remaining');
    console.log('   ✅ Player B removed cleanly from tournament');

    // ------------------------------------------------------------------------
    // 6. TEST: startTournamentRoundTwo (Tournament Reset)
    // ------------------------------------------------------------------------
    console.log('\n6. Testing startTournamentRoundTwo (Tournament Reset)...');
    // Simulate Round 1 end: Host won, Player A eliminated
    await query(`UPDATE lms_entries SET status = 'WINNER', lives_remaining = 2 WHERE id::text = $1`, [hostEntryId]);
    await query(`UPDATE lms_entries SET status = 'ELIMINATED', lives_remaining = 0 WHERE id::text = $1`, [playerAEntryId]);

    const resetRes = await startTournamentRoundTwo(leagueId, hostId);
    assert.ok(resetRes.success, `Round 2 reset failed: ${resetRes.message}`);
    assert.equal(resetRes.newRound, 2, 'New round should be 2');
    assert.equal(resetRes.archivedRound, 1, 'Archived round should be 1');
    assert.equal(resetRes.winnerName, hostName, 'Host should be recorded as winner');

    // Verify Database State
    const leagueRoundRes = await query(
      `SELECT current_round, settings FROM leagues WHERE id::text = $1`,
      [leagueId]
    );
    assert.equal(leagueRoundRes.rows[0].current_round, 2, 'Database current_round must be 2');

    const roundHistory = (typeof leagueRoundRes.rows[0].settings === 'string'
      ? JSON.parse(leagueRoundRes.rows[0].settings)
      : leagueRoundRes.rows[0].settings).round_history;
    assert.ok(Array.isArray(roundHistory), 'round_history array should exist in settings');
    assert.equal(roundHistory.length, 1, 'Should contain 1 archived round snapshot');
    assert.equal(roundHistory[0].winnerName, hostName, 'Archived winner should be preserved');

    // Verify all members restored to ALIVE with 3 lives
    const entriesRes = await query(
      `SELECT user_id, status, lives_remaining FROM lms_entries WHERE league_id::text = $1`,
      [leagueId]
    );
    assert.equal(entriesRes.rows.length, 2, 'Both active members should retain entries');
    for (const row of entriesRes.rows) {
      assert.equal(row.status, 'ALIVE', 'All entries must be restored to ALIVE');
      assert.equal(row.lives_remaining, 3, 'All entries must be restored to 3 lives');
    }
    console.log('   ✅ Round 2 launched: current_round=2, lives restored to 3, all players ALIVE');

    console.log('\n✨ All Commissioner & Round 2 Reset Tests Passed successfully!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
