import { submitLmsPick } from './lms';
import { createLeague, joinLeague, getLeagueSurvivorBoard, getLeagueGameweekLmsPicks } from './leagues';
import { query } from '../db/pool';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runLmsActionTests() {
  console.log('--- Running LMS Server Action Tests ---');

  // Test 1: Reject pick if kickoff has passed
  const pastKickoff = new Date(Date.now() - 3600000).toISOString();
  const pastResult = await submitLmsPick({
    entryId: 'demo-entry-123',
    gameweekId: '1',
    teamId: 'team-ars',
    fixtureId: 'fixture-past',
    kickoffTime: pastKickoff,
    teamName: 'Arsenal',
  });

  assert(pastResult.success === false, 'Pick after kickoff should be rejected');
  assert(
    pastResult.message.includes('Kickoff has already passed'),
    'Should return deadline passed error message'
  );
  console.log('✓ Deadline enforcement verified: Past kickoff picks rejected');

  // Test 2: Allow pick before kickoff (demo mode)
  const futureKickoff = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const futureResult = await submitLmsPick({
    entryId: 'demo-entry-123',
    gameweekId: '1',
    teamId: 'team-mci',
    fixtureId: 'fixture-future',
    kickoffTime: futureKickoff,
    teamName: 'Manchester City',
  });

  assert(futureResult.success === true, 'Future pick should be accepted');
  console.log('✓ Valid pick submission verified: Future picks confirmed');

  // Test 3: Exclusive Team Claims & Live Pick Visibility in League
  console.log('\n--- Running Live DB Exclusive Team Claims & Live Visibility Tests ---');
  const timestamp = Date.now();
  const hostName = `LmsHost_${timestamp}`;
  const hostEmail = `lms_host_${timestamp}@test.com`;

  // Fetch an upcoming scheduled fixture with home and away teams
  const fixRes = await query(
    `
    SELECT f.id AS fixture_id, f.gameweek_id, f.kickoff_time, gw.gameweek_number,
           ht.id AS home_team_id, ht.name AS home_team_name,
           at.id AS away_team_id, at.name AS away_team_name
    FROM fixtures f
    JOIN gameweeks gw ON f.gameweek_id = gw.id
    JOIN teams ht ON f.home_team_id = ht.id
    JOIN teams at ON f.away_team_id = at.id
    WHERE f.status = 'SCHEDULED' AND f.kickoff_time > NOW()
    ORDER BY f.kickoff_time ASC
    LIMIT 1;
    `
  );

  assert(fixRes.rows.length > 0, 'Should find at least 1 upcoming scheduled fixture');
  const fix = fixRes.rows[0];

  const leagueRes = await createLeague({
    name: `LMS Clash ${timestamp}`,
    type: 'LAST_MAN_STANDING',
    creatorDisplayName: hostName,
    creatorEmail: hostEmail,
    startingGameweek: fix.gameweek_number,
    startingLives: 1,
    exclusiveTeamPicks: true,
  });

  assert(leagueRes.success, 'League creation should succeed');
  const leagueId = leagueRes.league!.id;
  const hostUserId = leagueRes.user!.id;
  const hostEntryId = leagueRes.entryId!;
  let friendUserId: string | null = null;

  try {
    // Player 1 (Host) picks home team
    const hostPick = await submitLmsPick({
      entryId: hostEntryId,
      gameweekId: fix.gameweek_id,
      teamId: fix.home_team_id,
      fixtureId: fix.fixture_id,
      kickoffTime: fix.kickoff_time,
      teamName: fix.home_team_name,
    });
    assert(hostPick.success, `Host pick should succeed: ${hostPick.message}`);
    console.log(`✓ Player 1 (${hostName}) successfully locked in ${fix.home_team_name}`);

    // Player 2 (Friend) joins the league
    const friendName = `LmsFriend_${timestamp}`;
    const friendEmail = `lms_friend_${timestamp}@test.com`;

    const joinRes = await joinLeague({
      inviteCode: leagueRes.inviteCode!,
      displayName: friendName,
      email: friendEmail,
    });
    assert(joinRes.success, 'Friend should join successfully');
    friendUserId = joinRes.user!.id;
    const friendEntryId = joinRes.entryId!;

    // Player 2 attempts to pick the SAME team (home_team) in Gameweek 5
    const duplicatePick = await submitLmsPick({
      entryId: friendEntryId,
      gameweekId: fix.gameweek_id,
      teamId: fix.home_team_id,
      fixtureId: fix.fixture_id,
      kickoffTime: fix.kickoff_time,
      teamName: fix.home_team_name,
    });
    assert(duplicatePick.success === false, 'Duplicate team pick should be rejected');
    assert(
      duplicatePick.message.includes('already been picked by'),
      `Error should mention already picked: ${duplicatePick.message}`
    );
    console.log(`✓ Correctly rejected duplicate team selection: "${duplicatePick.message}"`);

    // Player 2 chooses the away team instead
    const friendPick = await submitLmsPick({
      entryId: friendEntryId,
      gameweekId: fix.gameweek_id,
      teamId: fix.away_team_id,
      fixtureId: fix.fixture_id,
      kickoffTime: fix.kickoff_time,
      teamName: fix.away_team_name,
    });
    assert(friendPick.success, `Unique team pick should succeed: ${friendPick.message}`);
    console.log(`✓ Player 2 (${friendName}) successfully picked unique team: ${fix.away_team_name}`);

    // Test getLeagueGameweekLmsPicks returns both claims with ownership
    const claimsRes = await getLeagueGameweekLmsPicks(leagueId, fix.gameweek_number, hostUserId);
    assert(claimsRes.success, 'getLeagueGameweekLmsPicks should succeed');
    assert(claimsRes.exclusiveTeamPicks === true, 'League should be marked exclusive');
    assert(claimsRes.claims[fix.home_team_id]?.isOwn === true, 'Host should own home team pick');
    assert(claimsRes.claims[fix.away_team_id]?.isOwn === false, 'Friend should own away team pick');
    console.log('✓ getLeagueGameweekLmsPicks verified: claimed teams correctly identified with ownership');

    // Test getLeagueSurvivorBoard reveals picks live (unmasked) under exclusive rules
    const boardRes = await getLeagueSurvivorBoard(leagueId, fix.gameweek_number, hostUserId);
    assert(boardRes.success, 'Survivor board lookup should succeed');
    assert(boardRes.players.length === 2, 'Should have 2 players on board');

    const hostOnBoard = boardRes.players.find((p) => p.userId === hostUserId);
    const friendOnBoard = boardRes.players.find((p) => p.userId === friendUserId);
    assert(hostOnBoard?.currentPick?.isMasked === false, 'Host pick should be unmasked');
    assert(friendOnBoard?.currentPick?.isMasked === false, 'Friend pick should be unmasked (live visibility)');
    assert(
      friendOnBoard?.currentPick?.teamName === fix.away_team_name,
      `Friend pick should display actual team: ${friendOnBoard?.currentPick?.teamName}`
    );
    console.log('✓ Survivor Board verified: picks visible live to all league members under exclusive flag');
  } finally {
    // Clean up
    console.log('🧹 Cleaning up test records...');
    await query('DELETE FROM leagues WHERE id = $1', [leagueId]);
    if (friendUserId) {
      await query('DELETE FROM users WHERE id IN ($1, $2)', [hostUserId, friendUserId]);
    } else {
      await query('DELETE FROM users WHERE id = $1', [hostUserId]);
    }
    console.log('✓ Cleaned up successfully.');
  }

  console.log('\nAll LMS Server Action tests passed successfully!');
}

runLmsActionTests().catch((err) => {
  console.error('LMS Action test failed:', err);
  process.exit(1);
});
