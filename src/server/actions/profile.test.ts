import assert from 'node:assert/strict';
import { query } from '../db/pool';
import { createLeague } from './leagues';
import { getPlayerCareerStats } from './profile';

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

    console.log('\n✨ All Player Profile & Trophy Cabinet Tests Passed successfully!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
