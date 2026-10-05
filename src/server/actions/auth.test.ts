import assert from 'node:assert/strict';
import { query } from '../db/pool';
import { syncAuthenticatedUser } from './auth';
import { createLeague, joinLeague } from './leagues';
import { submitLmsPick } from './lms';

async function runTests() {
  console.log('🧪 Starting Supabase Auth & Multi-Device Sync Tests...\n');

  try {
    // ----------------------------------------------------
    // 1. TEST syncAuthenticatedUser
    // ----------------------------------------------------
    console.log('1. Testing syncAuthenticatedUser (linking Supabase user to PostgreSQL)...');
    const mockAuthId = `sb_auth_${Date.now()}`;
    const testEmail = `player_${Date.now()}@groupbet.com`;
    const displayName = 'Alex Ferguson';

    const syncedUser = await syncAuthenticatedUser(
      {
        id: mockAuthId,
        email: testEmail,
        user_metadata: { display_name: displayName },
      },
      displayName
    );

    assert.ok(syncedUser.id, 'Synced user should have database UUID');
    assert.equal(syncedUser.auth_id, mockAuthId, 'auth_id must match Supabase auth ID');
    assert.equal(syncedUser.email, testEmail, 'Email must match');
    assert.equal(syncedUser.display_name, displayName, 'Display name must match');
    console.log(`   ✅ User record created in public.users: ${syncedUser.display_name} (${syncedUser.id})`);

    // ----------------------------------------------------
    // 2. IDEMPOTENT RE-SYNC WITH UPDATED METADATA
    // ----------------------------------------------------
    console.log('\n2. Testing idempotent re-sync and display name update...');
    const updatedName = 'Sir Alex Ferguson';
    const reSyncedUser = await syncAuthenticatedUser(
      {
        id: mockAuthId,
        email: testEmail,
        user_metadata: { display_name: updatedName },
      },
      updatedName
    );

    assert.equal(reSyncedUser.id, syncedUser.id, 'User ID should remain the same on re-sync');
    assert.equal(reSyncedUser.display_name, updatedName, 'Display name should update cleanly');
    console.log(`   ✅ Re-sync verified: updated display name to "${updatedName}" without duplicate rows`);

    // ----------------------------------------------------
    // 3. GUEST ACCOUNT MERGING & PICK PRESERVATION
    // ----------------------------------------------------
    console.log('\n3. Testing Guest-to-Authenticated Account Claiming (Zero Data Loss)...');
    // Step A: Create a guest user who joins a league and makes an LMS pick
    const guestRes = await query(
      `INSERT INTO users (auth_id, display_name, email)
       VALUES ($1, $2, $3)
       RETURNING id, auth_id, display_name, email`,
      [
        `guest_${Date.now()}`,
        'Guest Player',
        `guest_${Date.now()}@groupbet.internal`,
      ]
    );
    const guestUser = guestRes.rows[0];

    // Fetch upcoming scheduled fixture
    const fixRes = await query(
      `SELECT f.id, f.gameweek_id, f.home_team_id, ht.name AS home_name, gw.gameweek_number
       FROM fixtures f
       JOIN gameweeks gw ON f.gameweek_id = gw.id
       JOIN teams ht ON f.home_team_id = ht.id
       WHERE f.status = 'SCHEDULED' AND f.kickoff_time > NOW()
       ORDER BY f.kickoff_time ASC
       LIMIT 1`
    );
    assert.ok(fixRes.rows.length > 0, 'No upcoming scheduled fixture found');
    const fixture = fixRes.rows[0];

    // Create league with host
    const leagueRes = await createLeague({
      name: 'Auth Test Trophy',
      type: 'LAST_MAN_STANDING',
      creatorDisplayName: 'LeagueHost',
      creatorEmail: `host_${Date.now()}@test.com`,
      startingGameweek: fixture.gameweek_number,
    });
    assert.ok(leagueRes.success, 'League creation failed');
    const leagueId = leagueRes.league!.id;

    // Guest joins league
    const joinRes = await joinLeague({
      inviteCode: leagueRes.inviteCode!,
      displayName: 'Guest Player',
      email: guestUser.email,
    });
    assert.ok(joinRes.success, 'Guest join failed');
    const guestEntryId = joinRes.entryId!;

    // Guest submits LMS pick on upcoming fixture
    const pickSubmit = await submitLmsPick({
      entryId: guestEntryId,
      gameweekId: fixture.gameweek_id,
      teamId: fixture.home_team_id,
      fixtureId: fixture.id,
      kickoffTime: new Date(Date.now() + 86400000).toISOString(),
      teamName: fixture.home_name,
    });
    assert.ok(pickSubmit.success, 'Guest pick submission failed');
    console.log(`   ✅ Guest user made pick for ${fixture.home_name} in entry ${guestEntryId}`);

    // Step B: Guest signs up / links their account to new authenticated Supabase user
    const authenticatedId = `sb_auth_new_${Date.now()}`;
    const registeredEmail = `new_registered_${Date.now()}@test.com`;

    const claimedUser = await syncAuthenticatedUser(
      {
        id: authenticatedId,
        email: registeredEmail,
      },
      'Registered Champ'
    );

    // Reassign guest membership to authenticated user
    await query(
      `UPDATE league_members SET user_id = $1 WHERE user_id = $2`,
      [claimedUser.id, joinRes.user!.id]
    );
    await query(
      `UPDATE lms_entries SET user_id = $1 WHERE user_id = $2`,
      [claimedUser.id, joinRes.user!.id]
    );

    // Verify league membership transferred
    const memberCheck = await query(
      `SELECT id FROM league_members WHERE league_id = $1 AND user_id = $2`,
      [leagueId, claimedUser.id]
    );
    assert.equal(memberCheck.rows.length, 1, 'Authenticated user should own the league membership');

    // Verify LMS entry and pick transferred
    const entryCheck = await query(
      `SELECT e.id, p.team_id 
       FROM lms_entries e
       JOIN lms_picks p ON e.id = p.entry_id
       WHERE e.user_id = $1 AND e.league_id = $2`,
      [claimedUser.id, leagueId]
    );
    assert.equal(entryCheck.rows.length, 1, 'Authenticated user should retain their LMS pick');
    assert.equal(entryCheck.rows[0].team_id, fixture.home_team_id, 'Pick team ID must match');
    console.log(`   ✅ Guest data merged: Authenticated user retained league membership & pick for ${fixture.home_name}`);

    // ----------------------------------------------------
    // 4. GOOGLE OAUTH METADATA ENRICHMENT & AVATAR SYNC
    // ----------------------------------------------------
    console.log('\n4. Testing Google OAuth Sync (real name & avatar extraction)...');
    const googleAuthId = `google_oauth_${Date.now()}`;
    const googleEmail = `beckham_${Date.now()}@gmail.com`;
    const googlePhoto = 'https://lh3.googleusercontent.com/a/test-google-avatar-photo';

    const googleUser = await syncAuthenticatedUser({
      id: googleAuthId,
      email: googleEmail,
      user_metadata: {
        full_name: 'David Beckham',
        picture: googlePhoto,
      },
    });

    assert.equal(googleUser.auth_id, googleAuthId, 'auth_id must match Google OAuth ID');
    assert.equal(googleUser.display_name, 'David Beckham', 'Display name should extract from full_name');
    assert.equal(googleUser.avatar_url, googlePhoto, 'Avatar URL must extract from Google picture metadata');
    console.log(`   ✅ Google OAuth new registration extracted name "${googleUser.display_name}" and photo "${googleUser.avatar_url}"`);

    // ----------------------------------------------------
    // 5. EXISTING USER UPGRADE WITH GOOGLE AVATAR
    // ----------------------------------------------------
    console.log('\n5. Testing upgrade of existing user profile with Google OAuth photo...');
    const existingEmail = `player_upgrade_${Date.now()}@gmail.com`;

    // First, user was created with default DiceBear avatar and generic name
    const initialUser = await syncAuthenticatedUser({
      id: `email_user_${Date.now()}`,
      email: existingEmail,
    });
    assert.ok(initialUser.avatar_url && initialUser.avatar_url.includes('dicebear.com'), 'Initial user should have DiceBear avatar');

    // Later, user logs in via Google OAuth with high-res photo and real name
    const upgradedGoogleAuthId = `google_auth_upgrade_${Date.now()}`;
    const upgradedGooglePhoto = 'https://lh3.googleusercontent.com/a/high-res-google-profile-pic';

    const upgradedUser = await syncAuthenticatedUser({
      id: upgradedGoogleAuthId,
      email: existingEmail,
      user_metadata: {
        full_name: 'Wayne Rooney',
        picture: upgradedGooglePhoto,
      },
    });

    assert.equal(upgradedUser.id, initialUser.id, 'User database ID should be preserved');
    assert.equal(upgradedUser.auth_id, upgradedGoogleAuthId, 'auth_id should be updated to Google OAuth ID');
    assert.equal(upgradedUser.display_name, 'Wayne Rooney', 'Generic name should be upgraded to Google name');
    assert.equal(upgradedUser.avatar_url, upgradedGooglePhoto, 'DiceBear avatar should be upgraded to Google photo');
    console.log(`   ✅ Existing user profile successfully upgraded to Google photo "${upgradedUser.avatar_url}"`);

    // ----------------------------------------------------
    // 6. CLEANUP
    // ----------------------------------------------------
    console.log('\n6. Cleaning up test records...');
    await query(`DELETE FROM lms_picks WHERE entry_id = $1`, [guestEntryId]);
    await query(`DELETE FROM lms_entries WHERE league_id = $1`, [leagueId]);
    await query(`DELETE FROM league_members WHERE league_id = $1`, [leagueId]);
    await query(`DELETE FROM leagues WHERE id = $1`, [leagueId]);
    await query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4, $5)`, [
      syncedUser.id,
      guestUser.id,
      claimedUser.id,
      googleUser.id,
      initialUser.id,
    ]);
    console.log('   🧹 Test data cleaned up.');

    console.log('\n🎉 ALL AUTH & MULTI-DEVICE SYNC TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Auth tests failed:', err);
    process.exit(1);
  }
}

runTests();
