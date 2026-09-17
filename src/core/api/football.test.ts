import { footballClient } from './football';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- Running Live Football-Data.org Client Tests ---');

  // Test 1: Fetch teams
  const teams = await footballClient.getTeams('PL');
  assert(teams.length > 0, 'Teams response should have teams');
  assert(Boolean(teams[0].crest), 'First team should have a crest/logo URL');
  assert(Boolean(teams[0].tla), 'First team should have a 3-letter TLA');
  console.log(`✓ Fetched ${teams.length} teams successfully (Sample: ${teams[0].name} [${teams[0].tla}])`);

  // Test 2: Fetch fixtures for current matchday
  const { matches, currentMatchday, season } = await footballClient.getFixtures('PL');
  assert(matches.length > 0, 'Fixtures response should have matches');
  assert(Boolean(matches[0].homeTeam.name), 'Fixture should have home team');
  assert(Boolean(matches[0].awayTeam.name), 'Fixture should have away team');
  console.log(`✓ Fetched ${matches.length} matches for Season ${season}, GW ${currentMatchday} (${matches[0].homeTeam.name} vs ${matches[0].awayTeam.name})`);

  // Test 3: Fetch standings
  const standings = await footballClient.getStandings('PL');
  assert(standings.table.length > 0, 'Standings table should have rows');
  assert(standings.table[0].position === 1, 'First team in table should be position 1');
  console.log(`✓ Fetched standings table with ${standings.table.length} clubs successfully (Leader: ${standings.table[0].team.name}, Points: ${standings.table[0].points})`);

  console.log('All Football-Data.org Client tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Football-Data test failed:', err);
  process.exit(1);
});
