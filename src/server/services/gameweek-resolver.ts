import { query } from '@/server/db/pool';
import { syncFootballData } from './football-sync';

const LAST_AUTO_SYNC_BY_COMP = new Map<string, number>();
const AUTO_SYNC_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export interface ResolveActiveGameweekOptions {
  competitionId?: string | null;
  competitionCode?: string | null;
  allowOverdueAutoSync?: boolean;
}

interface GameweekStatusRow {
  id: string;
  competition_id: string;
  competition_code: string;
  gameweek_number: number;
  is_current: boolean;
  is_completed: boolean;
  actionable_count: number;
  unfinished_count: number;
  overdue_unfinished_count: number;
}

async function fetchGameweekStatuses(
  competitionId?: string | null,
  competitionCode?: string | null
): Promise<GameweekStatusRow[]> {
  if (competitionId) {
    const res = await query<GameweekStatusRow>(
      `
      SELECT
        gw.id,
        gw.competition_id,
        c.code AS competition_code,
        gw.gameweek_number,
        gw.is_current,
        gw.is_completed,
        COUNT(f.id) FILTER (WHERE f.status NOT IN ('POSTPONED', 'CANCELLED'))::int AS actionable_count,
        COUNT(f.id) FILTER (WHERE f.status IN ('SCHEDULED', 'LIVE'))::int AS unfinished_count,
        COUNT(f.id) FILTER (
          WHERE f.status IN ('SCHEDULED', 'LIVE')
            AND f.kickoff_time < NOW() - INTERVAL '3 hours'
        )::int AS overdue_unfinished_count
      FROM gameweeks gw
      JOIN competitions c ON gw.competition_id = c.id
      LEFT JOIN fixtures f ON f.gameweek_id = gw.id
      WHERE gw.competition_id = $1
      GROUP BY gw.id, gw.competition_id, c.code, gw.gameweek_number, gw.is_current, gw.is_completed
      ORDER BY gw.gameweek_number ASC
      `,
      [competitionId]
    );
    return res.rows;
  }

  const code = (competitionCode || 'PL').toUpperCase();
  const res = await query<GameweekStatusRow>(
    `
    SELECT
      gw.id,
      gw.competition_id,
      c.code AS competition_code,
      gw.gameweek_number,
      gw.is_current,
      gw.is_completed,
      COUNT(f.id) FILTER (WHERE f.status NOT IN ('POSTPONED', 'CANCELLED'))::int AS actionable_count,
      COUNT(f.id) FILTER (WHERE f.status IN ('SCHEDULED', 'LIVE'))::int AS unfinished_count,
      COUNT(f.id) FILTER (
        WHERE f.status IN ('SCHEDULED', 'LIVE')
          AND f.kickoff_time < NOW() - INTERVAL '3 hours'
      )::int AS overdue_unfinished_count
    FROM gameweeks gw
    JOIN competitions c ON gw.competition_id = c.id
    LEFT JOIN fixtures f ON f.gameweek_id = gw.id
    WHERE UPPER(c.code) = $1
    GROUP BY gw.id, gw.competition_id, c.code, gw.gameweek_number, gw.is_current, gw.is_completed
    ORDER BY gw.gameweek_number ASC
    `,
    [code]
  );
  return res.rows;
}

/**
 * Determines the true active (upcoming/in-progress) gameweek for a competition
 * based on live fixture completion states, automatically healing stale `is_current`
 * or `is_completed` flags in PostgreSQL so completed gameweeks never stay stuck as current.
 */
export async function resolveActiveGameweek(
  options: ResolveActiveGameweekOptions = {}
): Promise<number> {
  const {
    competitionId = null,
    competitionCode = 'PL',
    allowOverdueAutoSync = true,
  } = options;

  const normalizedCode = (competitionCode || 'PL').toUpperCase();
  const effectiveCode = normalizedCode === 'BOTH' ? 'PL' : normalizedCode;

  let rows = await fetchGameweekStatuses(
    normalizedCode === 'BOTH' ? null : competitionId,
    effectiveCode
  );

  if (rows.length === 0) {
    return 1;
  }

  const resolvedCompCode = (rows[0].competition_code || effectiveCode || 'PL').toUpperCase();

  // Optional Stale Match Guard: If an earlier gameweek has SCHEDULED/LIVE matches whose kickoff
  // was > 3 hours ago, trigger a throttled background sync so finished matches settle automatically.
  if (allowOverdueAutoSync) {
    const hasOverdueMatches = rows.some((r) => r.overdue_unfinished_count > 0);
    const lastSyncAt = LAST_AUTO_SYNC_BY_COMP.get(resolvedCompCode) || 0;

    if (hasOverdueMatches && Date.now() - lastSyncAt > AUTO_SYNC_COOLDOWN_MS) {
      LAST_AUTO_SYNC_BY_COMP.set(resolvedCompCode, Date.now());
      try {
        await syncFootballData(resolvedCompCode);
        rows = await fetchGameweekStatuses(competitionId, resolvedCompCode);
      } catch (err: any) {
        console.warn(
          `[GameweekResolver] Overdue match auto-sync failed for ${resolvedCompCode}:`,
          err?.message || err
        );
      }
    }
  }

  // Evaluate true completion state per gameweek from actual fixture statuses
  const evaluated = rows.map((row) => {
    const trueIsCompleted =
      row.actionable_count > 0
        ? row.unfinished_count === 0
        : row.is_completed;
    return {
      ...row,
      trueIsCompleted,
    };
  });

  // The true active gameweek is the lowest gameweek_number that is NOT completed
  const firstUncompleted = evaluated.find((g) => !g.trueIsCompleted);
  const targetActiveGw =
    firstUncompleted ?? evaluated[evaluated.length - 1];

  // Self-heal any gameweeks whose DB flags (`is_current` or `is_completed`) are out of sync
  for (const gw of evaluated) {
    const trueIsCurrent = gw.id === targetActiveGw.id;
    if (gw.is_current !== trueIsCurrent || gw.is_completed !== gw.trueIsCompleted) {
      await query(
        `UPDATE gameweeks
         SET is_current = $1,
             is_completed = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [trueIsCurrent, gw.trueIsCompleted, gw.id]
      );
    }
  }

  return targetActiveGw.gameweek_number;
}

export function isCombinedCompetitions(settings: any): boolean {
  if (!settings) return false;
  const s = typeof settings === 'string' ? JSON.parse(settings) : settings;
  if (Array.isArray(s?.included_competitions)) {
    const codes = s.included_competitions.map((c: string) => String(c).toUpperCase());
    return codes.includes('PL') && codes.includes('ELC');
  }
  return false;
}

export interface PairedRoundGameweeks {
  activePlGw: number;
  activeElcGw: number;
  plGwNumber: number;
  elcGwNumber: number;
  plGwId: string | null;
  elcGwId: string | null;
  gameweekIds: string[];
}

/**
 * Resolves the paired Premier League + Championship gameweeks for a given round number
 * (where round number is indexed relative to the Premier League gameweek number).
 */
export async function resolvePairedGameweeks(
  requestedPlGwNumber?: number,
  allowOverdueAutoSync = false
): Promise<PairedRoundGameweeks> {
  const [activePlGw, activeElcGw] = await Promise.all([
    resolveActiveGameweek({ competitionCode: 'PL', allowOverdueAutoSync }),
    resolveActiveGameweek({ competitionCode: 'ELC', allowOverdueAutoSync }),
  ]);

  const plGwNumber = requestedPlGwNumber ?? activePlGw;
  const offset = plGwNumber - activePlGw;
  const elcGwNumber = Math.min(46, Math.max(1, activeElcGw + offset));

  const gwsRes = await query<{ id: string; code: string; gameweek_number: number }>(
    `
    SELECT gw.id, UPPER(c.code) AS code, gw.gameweek_number
    FROM gameweeks gw
    JOIN competitions c ON gw.competition_id = c.id
    WHERE (UPPER(c.code) = 'PL' AND gw.gameweek_number = $1)
       OR (UPPER(c.code) = 'ELC' AND gw.gameweek_number = $2)
    `,
    [plGwNumber, elcGwNumber]
  );

  const plRow = gwsRes.rows.find((r) => r.code === 'PL');
  const elcRow = gwsRes.rows.find((r) => r.code === 'ELC');
  const plGwId = plRow?.id || null;
  const elcGwId = elcRow?.id || null;
  const gameweekIds = [plGwId, elcGwId].filter((id): id is string => Boolean(id));

  return {
    activePlGw,
    activeElcGw,
    plGwNumber,
    elcGwNumber,
    plGwId,
    elcGwId,
    gameweekIds,
  };
}

export interface LeagueRoundGameweekContext {
  isCombined: boolean;
  competitionCode: 'PL' | 'ELC' | 'BOTH';
  totalTeams: number;
  primaryGwNumber: number;
  activePlGw?: number;
  activeElcGw?: number;
  pairedNumbers?: { PL: number; ELC: number };
  gameweekIds: string[];
}

/**
 * Resolves the active or requested round's gameweek UUID(s) for a specific league.
 * For single-league games ('PL' or 'ELC'), returns `[gwId]`.
 * For combined games ('BOTH'), returns `[plGwId, elcGwId]`.
 */
export async function resolveLeagueRoundGameweeks(
  leagueId: string,
  requestedGwNumber?: number
): Promise<LeagueRoundGameweekContext> {
  const leagueRes = await query<{
    competition_id: string;
    competition_code: string;
    settings: any;
  }>(
    `SELECT l.competition_id, COALESCE(c.code, 'PL') AS competition_code, l.settings
     FROM leagues l
     LEFT JOIN competitions c ON l.competition_id = c.id
     WHERE l.id::text = $1
     LIMIT 1`,
    [leagueId]
  );

  if (leagueRes.rows.length === 0) {
    return {
      isCombined: false,
      competitionCode: 'PL',
      totalTeams: 20,
      primaryGwNumber: requestedGwNumber ?? 1,
      gameweekIds: [],
    };
  }

  const row = leagueRes.rows[0];
  const combined = isCombinedCompetitions(row.settings);

  if (combined) {
    const paired = await resolvePairedGameweeks(requestedGwNumber, false);
    return {
      isCombined: true,
      competitionCode: 'BOTH',
      totalTeams: 44,
      primaryGwNumber: paired.plGwNumber,
      activePlGw: paired.activePlGw,
      activeElcGw: paired.activeElcGw,
      pairedNumbers: { PL: paired.plGwNumber, ELC: paired.elcGwNumber },
      gameweekIds: paired.gameweekIds,
    };
  }

  const compCode = (row.competition_code || 'PL').toUpperCase() as 'PL' | 'ELC';
  const targetGw =
    requestedGwNumber ??
    (await resolveActiveGameweek({
      competitionId: row.competition_id,
      competitionCode: compCode,
      allowOverdueAutoSync: false,
    }));

  const gwRes = await query<{ id: string }>(
    `SELECT id FROM gameweeks WHERE competition_id = $1 AND gameweek_number = $2 LIMIT 1`,
    [row.competition_id, targetGw]
  );

  return {
    isCombined: false,
    competitionCode: compCode,
    totalTeams: compCode === 'ELC' ? 24 : 20,
    primaryGwNumber: targetGw,
    gameweekIds: gwRes.rows[0]?.id ? [gwRes.rows[0].id] : [],
  };
}

/**
 * Given a fixture's gameweek_id inside a league, resolves the paired gameweek IDs
 * belonging to the same round so weekly limits and LMS pick replacements span both PL + ELC.
 */
export async function resolveSiblingGameweekIdsForFixture(
  leagueId: string,
  fixtureGameweekId: string
): Promise<string[]> {
  const leagueRes = await query<{ settings: any }>(
    `SELECT settings FROM leagues WHERE id::text = $1 LIMIT 1`,
    [leagueId]
  );
  if (leagueRes.rows.length === 0 || !isCombinedCompetitions(leagueRes.rows[0].settings)) {
    return [fixtureGameweekId];
  }

  const gwRes = await query<{ gameweek_number: number; code: string }>(
    `SELECT gw.gameweek_number, UPPER(c.code) AS code
     FROM gameweeks gw
     JOIN competitions c ON gw.competition_id = c.id
     WHERE gw.id = $1
     LIMIT 1`,
    [fixtureGameweekId]
  );

  if (gwRes.rows.length === 0) {
    return [fixtureGameweekId];
  }

  const { gameweek_number: gwNum, code } = gwRes.rows[0];
  const [activePlGw, activeElcGw] = await Promise.all([
    resolveActiveGameweek({ competitionCode: 'PL', allowOverdueAutoSync: false }),
    resolveActiveGameweek({ competitionCode: 'ELC', allowOverdueAutoSync: false }),
  ]);

  const equivalentPlGw =
    code === 'ELC'
      ? Math.min(38, Math.max(1, activePlGw + (gwNum - activeElcGw)))
      : gwNum;

  const paired = await resolvePairedGameweeks(equivalentPlGw, false);
  return paired.gameweekIds.length > 0 ? paired.gameweekIds : [fixtureGameweekId];
}
