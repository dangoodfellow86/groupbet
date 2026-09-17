import { footballClient } from '@/core/api/football';
import { withTransaction } from '@/server/db/pool';
import { MatchStatus } from '@/core/types/database';

export interface SyncResult {
  competitionId: string;
  syncedTeams: number;
  syncedGameweeks: number;
  syncedFixtures: number;
  currentGameweek: number;
  timestamp: string;
}

/**
 * Ingests current season Premier League teams, gameweeks, and fixtures into PostgreSQL.
 */
export async function syncFootballData(competitionCode = 'PL'): Promise<SyncResult> {
  console.log(`[FootballSync] Ingesting current live season from Football-Data.org for ${competitionCode}...`);

  // 1. Fetch normalized teams and current season fixtures
  const [teams, fixturesData] = await Promise.all([
    footballClient.getTeams(competitionCode),
    footballClient.getFixtures(competitionCode),
  ]);

  const fixtures = fixturesData.matches;
  const seasonStr = fixturesData.season;
  const currentGameweek = fixturesData.currentMatchday;

  return await withTransaction(async (client) => {
    // 2. Upsert Competition (Premier League)
    const compUpsert = await client.query(
      `
      INSERT INTO competitions (external_id, name, code, season)
      VALUES (2021, 'Premier League', 'PL', $1)
      ON CONFLICT (external_id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        season = EXCLUDED.season,
        updated_at = NOW()
      RETURNING id;
      `,
      [seasonStr]
    );
    const competitionId: string = compUpsert.rows[0].id;

    // Clean old fixtures and gameweeks for this competition before populating current season
    await client.query('DELETE FROM fixtures WHERE gameweek_id IN (SELECT id FROM gameweeks WHERE competition_id = $1)', [competitionId]);
    await client.query('DELETE FROM gameweeks WHERE competition_id = $1', [competitionId]);

    // 3. Upsert Teams
    const teamIdMap = new Map<number, string>(); // external_id -> db UUID
    for (const team of teams) {
      const teamUpsert = await client.query(
        `
        INSERT INTO teams (external_id, name, short_name, tla, crest_url)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (external_id) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          tla = EXCLUDED.tla,
          crest_url = EXCLUDED.crest_url,
          updated_at = NOW()
        RETURNING id, external_id;
        `,
        [
          team.id,
          team.name,
          team.shortName,
          team.tla,
          team.crest,
        ]
      );
      teamIdMap.set(team.id, teamUpsert.rows[0].id);
    }

    // 4. Group fixtures by gameweek to calculate gameweek deadlines
    const gameweekMap = new Map<number, typeof fixtures>();
    for (const f of fixtures) {
      const gw = f.gameweek || 1;
      const group = gameweekMap.get(gw) || [];
      group.push(f);
      gameweekMap.set(gw, group);
    }

    // 5. Upsert Gameweeks
    const gameweekIdMap = new Map<number, string>(); // gameweek_number -> gameweek UUID
    for (const [gwNumber, gwFixtures] of gameweekMap.entries()) {
      const sortedKickoffs = gwFixtures
        .map((f) => new Date(f.utcDate).getTime())
        .sort((a, b) => a - b);
      const earliestDeadline = new Date(sortedKickoffs[0] || Date.now()).toISOString();
      const isCurrent = gwNumber === currentGameweek;
      const isCompleted = gwFixtures.every((f) => f.status === 'FINISHED');

      const gwUpsert = await client.query(
        `
        INSERT INTO gameweeks (competition_id, gameweek_number, deadline, is_current, is_completed)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (competition_id, gameweek_number) DO UPDATE SET
          deadline = EXCLUDED.deadline,
          is_current = EXCLUDED.is_current,
          is_completed = EXCLUDED.is_completed,
          updated_at = NOW()
        RETURNING id, gameweek_number;
        `,
        [competitionId, gwNumber, earliestDeadline, isCurrent, isCompleted]
      );
      gameweekIdMap.set(gwNumber, gwUpsert.rows[0].id);
    }

    // 6. Upsert Fixtures
    let fixtureCount = 0;
    for (const f of fixtures) {
      const homeTeamId = teamIdMap.get(f.homeTeam.id);
      const awayTeamId = teamIdMap.get(f.awayTeam.id);
      const gameweekId = gameweekIdMap.get(f.gameweek);

      if (!homeTeamId || !awayTeamId || !gameweekId) {
        continue;
      }

      await client.query(
        `
        INSERT INTO fixtures (
          external_id,
          gameweek_id,
          home_team_id,
          away_team_id,
          kickoff_time,
          status,
          home_score,
          away_score
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (external_id) DO UPDATE SET
          kickoff_time = EXCLUDED.kickoff_time,
          status = EXCLUDED.status,
          home_score = EXCLUDED.home_score,
          away_score = EXCLUDED.away_score,
          updated_at = NOW();
        `,
        [
          f.id,
          gameweekId,
          homeTeamId,
          awayTeamId,
          f.utcDate,
          f.status as MatchStatus,
          f.homeScore,
          f.awayScore,
        ]
      );
      fixtureCount++;
    }

    console.log(
      `[FootballSync] Current season synced: ${teams.length} teams, ${gameweekMap.size} gameweeks, ${fixtureCount} fixtures. Current Matchday: GW ${currentGameweek}`
    );

    return {
      competitionId,
      syncedTeams: teams.length,
      syncedGameweeks: gameweekMap.size,
      syncedFixtures: fixtureCount,
      currentGameweek,
      timestamp: new Date().toISOString(),
    };
  });
}
