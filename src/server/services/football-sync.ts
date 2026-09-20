import { footballClient } from '@/core/api/football';
import { query } from '@/server/db/pool';
import { MatchStatus } from '@/core/types/database';

export interface SyncResult {
  competitionId: string;
  syncedTeams: number;
  syncedGameweeks: number;
  syncedFixtures: number;
  settledFixtures: number;
  liveFixtures: number;
  currentGameweek: number;
  timestamp: string;
}

function mapApiStatusToMatchStatus(apiStatus: string): MatchStatus {
  const s = (apiStatus || '').toUpperCase();
  if (['FINISHED', 'FT', 'AET', 'PEN', 'AWARDED'].includes(s)) {
    return 'FINISHED';
  }
  if (['IN_PLAY', 'PAUSED', 'LIVE', '1H', 'HT', '2H', 'ET', 'BT', 'P'].includes(s)) {
    return 'LIVE';
  }
  if (['POSTPONED', 'PST', 'SUSP', 'INT'].includes(s)) {
    return 'POSTPONED';
  }
  if (['CANCELLED', 'CANC', 'ABD'].includes(s)) {
    return 'CANCELLED';
  }
  return 'SCHEDULED';
}

/**
 * Ingests current season Premier League teams, gameweeks, and fixtures into PostgreSQL.
 * Automatically settles finished matches via settle_fixture() and updates live match scores.
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
  const currentGameweek = fixturesData.currentMatchday || 1;

  // 2. Upsert Competition (Premier League)
  const compUpsert = await query(
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

  // 3. Upsert Teams (cached lookup: only insert missing teams)
  const existingTeams = await query<{ id: string; external_id: number }>('SELECT id, external_id FROM teams');
  const teamIdMap = new Map<number, string>();
  for (const row of existingTeams.rows) {
    teamIdMap.set(row.external_id, row.id);
  }

  for (const team of teams) {
    if (!teamIdMap.has(team.id)) {
      const teamUpsert = await query<{ id: string; external_id: number }>(
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
        [team.id, team.name, team.shortName, team.tla, team.crest]
      );
      teamIdMap.set(team.id, teamUpsert.rows[0].id);
    }
  }

  // 4. Group fixtures by gameweek to calculate gameweek deadlines and completion
  const gameweekMap = new Map<number, typeof fixtures>();
  for (const f of fixtures) {
    const gw = f.gameweek || 1;
    const group = gameweekMap.get(gw) || [];
    group.push(f);
    gameweekMap.set(gw, group);
  }

  // 5. Upsert Gameweeks (only update changed flags)
  const existingGws = await query<{
    id: string;
    gameweek_number: number;
    is_current: boolean;
    is_completed: boolean;
  }>('SELECT id, gameweek_number, is_current, is_completed FROM gameweeks WHERE competition_id = $1', [competitionId]);
  const existingGwsMap = new Map(existingGws.rows.map((g) => [g.gameweek_number, g]));
  const gameweekIdMap = new Map<number, string>();

  for (const [gwNumber, gwFixtures] of gameweekMap.entries()) {
    const sortedKickoffs = gwFixtures
      .map((f) => new Date(f.utcDate).getTime())
      .sort((a, b) => a - b);
    const earliestDeadline = new Date(sortedKickoffs[0] || Date.now()).toISOString();
    const isCurrent = gwNumber === currentGameweek;
    const isCompleted =
      gwNumber < currentGameweek ||
      gwFixtures.every((f) => ['FINISHED', 'FT', 'AWARDED'].includes(f.status));

    const existingGw = existingGwsMap.get(gwNumber);
    if (!existingGw) {
      const gwUpsert = await query<{ id: string; gameweek_number: number }>(
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
    } else {
      gameweekIdMap.set(gwNumber, existingGw.id);
      if (existingGw.is_current !== isCurrent || existingGw.is_completed !== isCompleted) {
        await query(
          `UPDATE gameweeks SET is_current = $1, is_completed = $2, updated_at = NOW() WHERE id = $3`,
          [isCurrent, isCompleted, existingGw.id]
        );
      }
    }
  }

  // 6. Fetch existing DB fixtures for comparison
  const existingFixturesRes = await query<{
    id: string;
    external_id: number;
    status: MatchStatus;
    home_score: number | null;
    away_score: number | null;
    settled_at: string | null;
    kickoff_time: string;
    gameweek_id: string;
  }>('SELECT id, external_id, status, home_score, away_score, settled_at, kickoff_time, gameweek_id FROM fixtures');

  const existingMap = new Map<number, typeof existingFixturesRes.rows[number]>();
  for (const row of existingFixturesRes.rows) {
    existingMap.set(row.external_id, row);
  }

  let fixtureCount = 0;
  let settledCount = 0;
  let liveCount = 0;

  for (const f of fixtures) {
    const homeTeamId = teamIdMap.get(f.homeTeam.id);
    const awayTeamId = teamIdMap.get(f.awayTeam.id);
    const gameweekId = gameweekIdMap.get(f.gameweek);

    if (!homeTeamId || !awayTeamId || !gameweekId) {
      continue;
    }

    const normalizedStatus = mapApiStatusToMatchStatus(f.status);
    const existing = existingMap.get(f.id);

    let fixtureId = existing?.id;

    if (!existing) {
      // Insert new fixture
      const insertRes = await query<{ id: string }>(
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
          updated_at = NOW()
        RETURNING id;
        `,
        [
          f.id,
          gameweekId,
          homeTeamId,
          awayTeamId,
          f.utcDate,
          normalizedStatus,
          f.homeScore,
          f.awayScore,
        ]
      );
      fixtureId = insertRes.rows[0]?.id;
    } else {
      // Only update kickoff time or gameweek if actually changed
      const kickoffChanged = new Date(existing.kickoff_time).getTime() !== new Date(f.utcDate).getTime();
      const gwChanged = existing.gameweek_id !== gameweekId;
      if (kickoffChanged || gwChanged) {
        await query(
          `
          UPDATE fixtures
          SET kickoff_time = $1, gameweek_id = $2
          WHERE id = $3
          `,
          [f.utcDate, gameweekId, existing.id]
        );
      }
    }

    fixtureCount++;

    if (!fixtureId) continue;

    // 7. Handle Settlement and Live Scores
    if (normalizedStatus === 'FINISHED') {
      const needsSettlement = !existing?.settled_at || existing.status !== 'FINISHED';
      if (needsSettlement) {
        try {
          console.log(`[FootballSync] Settling fixture ${fixtureId} (${f.homeTeam.name} vs ${f.awayTeam.name}) at ${f.homeScore}-${f.awayScore}...`);
          await query('SELECT settle_fixture($1, $2, $3)', [
            fixtureId,
            f.homeScore ?? 0,
            f.awayScore ?? 0,
          ]);
          settledCount++;
        } catch (settleErr) {
          console.error(`[FootballSync] Error settling fixture ${fixtureId}:`, settleErr);
        }
      } else if (
        existing.home_score !== f.homeScore ||
        existing.away_score !== f.awayScore
      ) {
        // Score corrected post-match
        await query(
          `UPDATE fixtures SET home_score = $1, away_score = $2, updated_at = NOW() WHERE id = $3`,
          [f.homeScore, f.awayScore, fixtureId]
        );
      }
    } else if (normalizedStatus === 'LIVE') {
      liveCount++;
      await query(
        `
        UPDATE fixtures
        SET status = 'LIVE',
            home_score = $1,
            away_score = $2,
            updated_at = NOW()
        WHERE id = $3 AND (status != 'LIVE' OR home_score IS DISTINCT FROM $1 OR away_score IS DISTINCT FROM $2)
        `,
        [f.homeScore, f.awayScore, fixtureId]
      );
    } else if (normalizedStatus === 'POSTPONED' || normalizedStatus === 'CANCELLED') {
      if (existing && existing.status !== normalizedStatus) {
        try {
          console.log(`[FootballSync] Voiding fixture ${fixtureId}...`);
          await query('SELECT void_fixture($1)', [fixtureId]);
        } catch (voidErr) {
          console.error(`[FootballSync] Error voiding fixture ${fixtureId}:`, voidErr);
        }
      }
    } else if (normalizedStatus === 'SCHEDULED' && existing && existing.status === 'LIVE') {
      // Reverted from live
      await query(
        `UPDATE fixtures SET status = 'SCHEDULED', home_score = NULL, away_score = NULL, updated_at = NOW() WHERE id = $1`,
        [fixtureId]
      );
    }
  }

  console.log(
    `[FootballSync] Current season synced: ${teams.length} teams, ${gameweekMap.size} gameweeks, ${fixtureCount} fixtures (${settledCount} newly settled, ${liveCount} live). Active Matchday: GW ${currentGameweek}`
  );

  return {
    competitionId,
    syncedTeams: teams.length,
    syncedGameweeks: gameweekMap.size,
    syncedFixtures: fixtureCount,
    settledFixtures: settledCount,
    liveFixtures: liveCount,
    currentGameweek,
    timestamp: new Date().toISOString(),
  };
}
