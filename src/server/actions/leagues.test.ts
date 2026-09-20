import assert from 'node:assert/strict';
import { query } from '../db/pool';
import {
  createLeague,
  getLeagueByInviteCode,
  joinLeague,
  getLeagueSurvivorBoard,
} from './leagues';

async function runTests() {
  console.log('🧪 Starting Leagues & Invite Code Test Suite...\n');

  try {
    // 1. Create LMS League
    console.log('1. Testing createLeague (LMS)...');
    const hostName = `Host_${Date.now()}`;
    const hostEmail = `host_${Date.now()}@test.com`;

    const createResult = await createLeague({
      name: 'Premier Pub Clash 2026',
      type: 'LAST_MAN_STANDING',
      creatorDisplayName: hostName,
      creatorEmail: hostEmail,
      startingGameweek: 5,
      startingLives: 2,
    });

    assert.ok(createResult.success, `createLeague failed: ${createResult.message}`);
    assert.ok(createResult.league, 'League object should be returned');
    assert.ok(createResult.inviteCode, 'Invite code should be generated');
    assert.match(createResult.inviteCode!, /^GB-[2-9A-HJ-NP-Z]{5}$/, 'Invite code should match GB-XXXXX pattern');
    assert.ok(createResult.entryId, 'Host should have an LMS entry ID');
    console.log(`   ✅ Created league "${createResult.league.name}" with code ${createResult.inviteCode}`);

    // 2. Get League by Invite Code (Preview Screen)
    console.log('\n2. Testing getLeagueByInviteCode...');
    const previewResult = await getLeagueByInviteCode(createResult.inviteCode!);
    assert.ok(previewResult.success, `getLeagueByInviteCode failed: ${previewResult.message}`);
    assert.equal(previewResult.league?.name, 'Premier Pub Clash 2026');
    assert.equal(previewResult.league?.creator_name, hostName);
    assert.equal(previewResult.league?.type, 'LAST_MAN_STANDING');
    assert.equal(previewResult.league?.starting_lives, 2);
    assert.equal(previewResult.league?.member_count, 1);
    assert.equal(previewResult.league?.exclusive_team_picks, true, 'Default exclusive_team_picks should be true');
    console.log(`   ✅ Preview successfully verified: 1 member (${hostName}), 2 lives, exclusive picks default true`);

    // 3. Friend Joins via Invite Code
    console.log('\n3. Testing joinLeague (Friend Joining)...');
    const friendName = `Friend_${Date.now()}`;
    const friendEmail = `friend_${Date.now()}@test.com`;

    const joinResult = await joinLeague({
      inviteCode: createResult.inviteCode!,
      displayName: friendName,
      email: friendEmail,
    });

    assert.ok(joinResult.success, `joinLeague failed: ${joinResult.message}`);
    assert.equal(joinResult.alreadyMember, false, 'Should be recognized as new member');
    assert.ok(joinResult.entryId, 'Friend should receive an LMS entry ID');
    console.log(`   ✅ Friend "${friendName}" successfully joined league`);

    // 4. Test Idempotent Join (Re-joining same league)
    console.log('\n4. Testing idempotent re-join...');
    const rejoinResult = await joinLeague({
      inviteCode: createResult.inviteCode!,
      displayName: friendName,
      email: friendEmail,
    });
    assert.ok(rejoinResult.success);
    assert.equal(rejoinResult.alreadyMember, true, 'Should recognize player is already a member');
    console.log('   ✅ Re-joining correctly handled idempotently');

    // 5. Verify Survivor Board
    console.log('\n5. Testing getLeagueSurvivorBoard...');
    const boardResult = await getLeagueSurvivorBoard(createResult.league!.id, 5);
    assert.ok(boardResult.success);
    assert.equal(boardResult.players.length, 2, 'Survivor board should show both Host and Friend');
    
    const hostPlayer = boardResult.players.find((p) => p.displayName === hostName);
    const friendPlayer = boardResult.players.find((p) => p.displayName === friendName);
    assert.ok(hostPlayer, 'Host should be on survivor board');
    assert.ok(friendPlayer, 'Friend should be on survivor board');
    assert.equal(hostPlayer?.livesRemaining, 2);
    assert.equal(friendPlayer?.livesRemaining, 2);
    assert.equal(hostPlayer?.status, 'ALIVE');
    assert.equal(friendPlayer?.status, 'ALIVE');
    console.log('   ✅ Both players verified ALIVE with 2 lives on Survivor Board');

    // Clean up first test league
    await query('DELETE FROM leagues WHERE id = $1', [createResult.league!.id]);
    await query('DELETE FROM users WHERE email IN ($1, $2)', [hostEmail, friendEmail]);

    // 6. Test All-in-One Group Creation & Dual Participation
    console.log('\n6. Testing All-in-One Group Creation & Dual Participation...');
    const aioHostName = `AioHost_${Date.now()}`;
    const aioHostEmail = `aiohost_${Date.now()}@test.com`;

    const aioCreateResult = await createLeague({
      name: 'All-in-One Super League',
      type: 'ALL_IN_ONE',
      creatorDisplayName: aioHostName,
      creatorEmail: aioHostEmail,
      startingGameweek: 5,
      startingLives: 3,
      exclusiveTeamPicks: false, // Explicitly false to test traditional secret pick masking
    });

    assert.ok(aioCreateResult.success, `createLeague (ALL_IN_ONE) failed: ${aioCreateResult.message}`);
    assert.equal(aioCreateResult.league?.type, 'ALL_IN_ONE');
    assert.ok(aioCreateResult.entryId, 'Host should receive an LMS entry ID in ALL_IN_ONE');

    // Verify creator is also in predictor_leaderboard
    const aioHostPredCheck = await query(
      `SELECT * FROM predictor_leaderboard WHERE league_id = $1 AND user_id = $2`,
      [aioCreateResult.league!.id, aioCreateResult.user!.id]
    );
    assert.equal(aioHostPredCheck.rows.length, 1, 'Host should be initialized in predictor_leaderboard');
    console.log('   ✅ All-in-One league created; creator initialized in LMS entries & Predictor leaderboard');

    // Friend joins All-in-One Group
    const aioFriendName = `AioFriend_${Date.now()}`;
    const aioFriendEmail = `aiofriend_${Date.now()}@test.com`;

    const aioJoinResult = await joinLeague({
      inviteCode: aioCreateResult.inviteCode!,
      displayName: aioFriendName,
      email: aioFriendEmail,
    });

    assert.ok(aioJoinResult.success, `joinLeague (ALL_IN_ONE) failed: ${aioJoinResult.message}`);
    assert.ok(aioJoinResult.entryId, 'Joining friend should receive LMS entry ID in ALL_IN_ONE');

    const aioFriendPredCheck = await query(
      `SELECT * FROM predictor_leaderboard WHERE league_id = $1 AND user_id = $2`,
      [aioCreateResult.league!.id, aioJoinResult.user!.id]
    );
    assert.equal(aioFriendPredCheck.rows.length, 1, 'Joining friend should be initialized in predictor_leaderboard');
    console.log('   ✅ Friend joined All-in-One league; enrolled into both LMS & Predictor');

    // 7. Test Survivor Board Pick Privacy Masking
    console.log('\n7. Testing Survivor Board Pick Privacy Masking...');
    const gw5TeamRes = await query(
      `SELECT t.id, t.name, t.tla, gw.id AS gameweek_id, gw.gameweek_number
       FROM fixtures f 
       JOIN gameweeks gw ON f.gameweek_id = gw.id 
       JOIN teams t ON f.home_team_id = t.id 
       WHERE f.status = 'SCHEDULED' AND f.kickoff_time > NOW()
       ORDER BY f.kickoff_time ASC
       LIMIT 1`
    );

    if (gw5TeamRes.rows.length > 0) {
      const targetTeam = gw5TeamRes.rows[0];
      // Insert an LMS pick for aioFriend on an upcoming fixture
      await query(
        `INSERT INTO lms_picks (entry_id, gameweek_id, team_id, result) 
         VALUES ($1, $2, $3, 'PENDING')`,
        [aioJoinResult.entryId!, targetTeam.gameweek_id, targetTeam.id]
      );

      // Host views the survivor board (host is viewingUserId)
      const hostView = await getLeagueSurvivorBoard(
        aioCreateResult.league!.id,
        targetTeam.gameweek_number,
        aioCreateResult.user!.id
      );
      const friendFromHostView = hostView.players.find((p) => p.displayName === aioFriendName);
      assert.ok(friendFromHostView?.currentPick, 'Friend should have a pick');
      assert.equal(
        friendFromHostView.currentPick.isMasked,
        true,
        'Opponent pick before kickoff must be masked'
      );
      assert.equal(
        friendFromHostView.currentPick.teamName,
        'Pick Locked',
        'Masked pick team name should be "Pick Locked"'
      );

      // Friend views the survivor board (friend is viewingUserId)
      const friendView = await getLeagueSurvivorBoard(
        aioCreateResult.league!.id,
        targetTeam.gameweek_number,
        aioJoinResult.user!.id
      );
      const friendFromFriendView = friendView.players.find((p) => p.displayName === aioFriendName);
      assert.ok(friendFromFriendView?.currentPick, 'Friend should have a pick');
      assert.equal(
        friendFromFriendView.currentPick.isMasked,
        false,
        'Own pick must be unmasked'
      );
      assert.equal(
        friendFromFriendView.currentPick.teamName,
        targetTeam.name,
        'Own pick team name should match picked team'
      );
      console.log('   ✅ Pick privacy masking verified: opponent sees "Pick Locked", user sees own selection');
    }

    // Clean up All-in-One test league
    await query('DELETE FROM leagues WHERE id = $1', [aioCreateResult.league!.id]);
    await query('DELETE FROM users WHERE email IN ($1, $2)', [aioHostEmail, aioFriendEmail]);
    console.log('\n   🧹 Cleaned up test records.');

    console.log('\n🎉 ALL LEAGUES & INVITE TESTS PASSED!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests().then(() => process.exit(0));
