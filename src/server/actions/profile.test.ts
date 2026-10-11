import assert from 'node:assert/strict';
import { query } from '../db/pool';
import { createLeague } from './leagues';
import { getPlayerCareerStats, updateUserProfile, getPremierLeagueClubBadges } from './profile';

async function runTests() {
  console.log('🧪 Starting Player Profile & Trophy Cabinet Test Suite...\n');

  try {
    // 1. SETUP: Create Test User and League
    console.log('1. Setting up test player and tournament...');
    const now = Date.now();
    const hostName = `ProfileTester_${now}`;
    const hostEmail = `profile_${now}@test.com`;

    const createRes = await createLeague({
      name: 'Championship Trophy Pool',
      type: 'ALL_IN_ONE',
      creatorDisplayName: hostName,
      creatorEmail: hostEmail,
    });
    assert.ok(createRes.success, `League creation failed: ${createRes.message}`);
    const hostId = createRes.user!.id;
    const leagueId = createRes.league!.id;
    const entryId = createRes.entryId!;

    // 2. Initial Profile Stats Check
    console.log('\n2. Testing initial getPlayerCareerStats...');
    const initialStats = await getPlayerCareerStats(hostId);
    assert.ok(initialStats.success, 'Profile stats retrieval should succeed');
    assert.equal(initialStats.user.displayName, hostName, 'Display name should match');
    assert.equal(initialStats.metrics.tournamentsEntered, 1, 'Should have entered 1 tournament');
    assert.equal(initialStats.tournaments.length, 1, 'Should list 1 tournament');

    // Founder badge should be unlocked
    const founderBadge = initialStats.badges.find((b) => b.id === 'league-founder');
    assert.ok(founderBadge, 'Founder badge should exist');
    assert.equal(founderBadge.isUnlocked, true, 'Founder badge should be unlocked');

    // Champion badge should be locked initially
    const champBadge = initialStats.badges.find((b) => b.id === 'tournament-champion');
    assert.ok(champBadge, 'Champion badge should exist');
    assert.equal(champBadge.isUnlocked, false, 'Champion badge should be locked');

    // 3. Simulate LMS Survival & Predictor Points
    console.log('\n3. Simulating game activity (survived round & predictor points)...');
    // Mark entry as WINNER
    await query(`UPDATE lms_entries SET status = 'WINNER' WHERE id = $1`, [entryId]);

    // Insert 3 survived LMS picks
    const gameweeksRes = await query(`SELECT id FROM gameweeks ORDER BY gameweek_number ASC LIMIT 3`);
    const teamsRes = await query(`SELECT id FROM teams LIMIT 3`);
    for (let i = 0; i < 3; i++) {
      await query(
        `
        INSERT INTO lms_picks (entry_id, gameweek_id, team_id, result)
        VALUES ($1, $2, $3, 'SURVIVED')
        ON CONFLICT DO NOTHING;
        `,
        [entryId, gameweeksRes.rows[i].id, teamsRes.rows[i].id]
      );
    }

    // Update predictor leaderboard: 35 points, 2 exact scores
    await query(
      `
      INSERT INTO predictor_leaderboard (league_id, user_id, total_points, correct_exact_scores, correct_outcomes)
      VALUES ($1, $2, 35, 2, 4)
      ON CONFLICT (league_id, user_id) 
      DO UPDATE SET total_points = 35, correct_exact_scores = 2, correct_outcomes = 4;
      `,
      [leagueId, hostId]
    );

    // 4. Verify Updated Profile Metrics & Unlocked Badges
    console.log('\n4. Verifying career stats and unlocked trophies...');
    const updatedStats = await getPlayerCareerStats(hostId);
    assert.ok(updatedStats.success, 'Updated stats retrieval should succeed');

    assert.equal(updatedStats.metrics.tournamentsWon, 1, 'Should record 1 tournament won');
    assert.equal(updatedStats.metrics.lmsWeeksSurvived, 3, 'Should record 3 weeks survived');
    assert.equal(updatedStats.metrics.totalPredictorPoints, 35, 'Should record 35 predictor points');
    assert.equal(updatedStats.metrics.correctExactScores, 2, 'Should record 2 exact scores');

    // Verify Badges
    const updatedChampBadge = updatedStats.badges.find((b) => b.id === 'tournament-champion');
    assert.equal(updatedChampBadge?.isUnlocked, true, 'Champion badge should now be unlocked');

    const ironSurvivorBadge = updatedStats.badges.find((b) => b.id === 'iron-survivor');
    assert.equal(ironSurvivorBadge?.isUnlocked, true, 'Iron Survivor badge should now be unlocked (3 rounds)');

    const deadEyeBadge = updatedStats.badges.find((b) => b.id === 'dead-eye');
    assert.equal(deadEyeBadge?.isUnlocked, true, 'Dead-Eye badge should now be unlocked (2 exact scores)');

    const centurionBadge = updatedStats.badges.find((b) => b.id === 'points-centurion');
    assert.equal(centurionBadge?.isUnlocked, true, 'Points Centurion badge should now be unlocked (35 pts >= 30)');

    // 5. Test updateUserProfile (display name & custom avatar)
    console.log('\n5. Testing updateUserProfile (display name & custom avatar)...');
    const updatedName = `RenamedPlayer_${now}`;
    const customAvatarUrl = 'https://supabase.co/storage/v1/object/public/avatars/test-avatar.webp';

    const updateRes = await updateUserProfile(
      {
        displayName: updatedName,
        avatarUrl: customAvatarUrl,
        customAvatar: true,
      },
      hostId
    );
    assert.ok(updateRes.success, `Update profile failed: ${updateRes.message}`);
    assert.equal(updateRes.user?.display_name, updatedName, 'Display name should be updated');
    assert.equal(updateRes.user?.avatar_url, customAvatarUrl, 'Avatar URL should be updated');
    assert.equal(updateRes.user?.custom_avatar, true, 'custom_avatar flag should be true');

    // Verify in database directly
    const userDbCheck = await query(
      `SELECT display_name, avatar_url, custom_avatar FROM users WHERE id = $1`,
      [hostId]
    );
    assert.equal(userDbCheck.rows[0].display_name, updatedName, 'Database display_name must match');
    assert.equal(userDbCheck.rows[0].avatar_url, customAvatarUrl, 'Database avatar_url must match');
    assert.equal(userDbCheck.rows[0].custom_avatar, true, 'Database custom_avatar flag must be true');
    console.log('   ✅ updateUserProfile successfully persisted name & custom avatar');

    // 6. Test updateUserProfile Validation Constraints
    console.log('\n6. Testing profile validation constraints...');
    const shortNameRes = await updateUserProfile({ displayName: 'A' }, hostId);
    assert.equal(shortNameRes.success, false, 'Display name < 2 chars should fail');
    assert.ok(
      shortNameRes.message?.includes('at least 2 characters'),
      'Should mention at least 2 characters'
    );

    const longNameRes = await updateUserProfile({ displayName: 'A'.repeat(31) }, hostId);
    assert.equal(longNameRes.success, false, 'Display name > 30 chars should fail');
    assert.ok(
      longNameRes.message?.includes('cannot exceed 30 characters'),
      'Should mention cannot exceed 30 characters'
    );
    console.log('   ✅ Profile validation correctly rejected invalid names (<2 and >30 chars)');

    // 7. Test getPremierLeagueClubBadges
    console.log('\n7. Testing getPremierLeagueClubBadges (Avatar Studio)...');
    const badgesRes = await getPremierLeagueClubBadges();
    assert.ok(badgesRes.success, 'getPremierLeagueClubBadges should succeed');
    assert.ok(badgesRes.clubs.length >= 20, `Should return at least 20 Premier League clubs, got ${badgesRes.clubs.length}`);
    const sampleClub = badgesRes.clubs[0];
    assert.ok(sampleClub.id, 'Club should have ID');
    assert.ok(sampleClub.name, 'Club should have name');
    assert.ok(sampleClub.crestUrl, 'Club should have crest URL');
    console.log(`   ✅ getPremierLeagueClubBadges returned ${badgesRes.clubs.length} official club crests`);

    // 8. Cleanup
    console.log('\n8. Cleaning up test records...');
    await query(`DELETE FROM lms_picks WHERE entry_id = $1`, [entryId]);
    await query(`DELETE FROM lms_entries WHERE league_id = $1`, [leagueId]);
    await query(`DELETE FROM predictor_leaderboard WHERE league_id = $1`, [leagueId]);
    await query(`DELETE FROM league_members WHERE league_id = $1`, [leagueId]);
    await query(`DELETE FROM leagues WHERE id = $1`, [leagueId]);
    await query(`DELETE FROM users WHERE id = $1`, [hostId]);
    console.log('   🧹 Test data cleaned up.');

    console.log('\n✨ All Player Profile & Avatar Studio Tests Passed successfully!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
