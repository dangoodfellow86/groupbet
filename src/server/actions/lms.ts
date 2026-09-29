'use server';

import { withTransaction, query } from '@/server/db/pool';

export interface SubmitLmsPickInput {
  entryId: string;
  gameweekId: string;
  teamId: string;
  fixtureId: string;
  kickoffTime?: string;
  teamName?: string;
}

export interface SubmitLmsPickResult {
  success: boolean;
  message: string;
  pickId?: string;
  teamId?: string;
  livesRemaining?: number;
}

export interface UserLmsRoundPicksResult {
  success: boolean;
  roundNumber: number;
  picksByGameweek: Record<number, {
    pickId: string;
    teamId: string;
    teamExternalId: number;
    teamName: string;
    teamTla: string;
    crestUrl: string;
    gameweekNumber: number;
    result: string;
    isKickoffPassed: boolean;
  }>;
  burnedTeamIds: string[];
  burnedCount: number;
  availableCount: number;
  message?: string;
}

/**
 * Server Action: Retrieve all LMS picks made by the user in the active tournament round
 * for a specific league, returning burned team IDs and a map of picks by gameweek.
 */
export async function getUserLmsRoundPicks(
  leagueId: string,
  viewingUserId?: string
): Promise<UserLmsRoundPicksResult> {
  try {
    let userId = viewingUserId;
    if (!userId) {
      try {
        const { getCurrentUser } = await import('@/server/auth/session');
        const user = await getCurrentUser();
        if (user) userId = user.id;
      } catch {
        // Fallback
      }
    }

    if (!userId) {
      return {
        success: true,
        roundNumber: 1,
        picksByGameweek: {},
        burnedTeamIds: [],
        burnedCount: 0,
        availableCount: 20,
      };
    }

    // 1. Fetch league round
    const leagueRes = await query(
      `SELECT current_round FROM leagues WHERE id::text = $1 LIMIT 1`,
      [leagueId]
    );
    const roundNumber = leagueRes.rows[0]?.current_round || 1;

    // 2. Fetch user's picks in this round
    const sql = `
      SELECT 
        p.id AS pick_id,
        p.team_id,
        p.result,
        gw.gameweek_number,
        t.name AS team_name,
        t.tla AS team_tla,
        t.crest_url,
        t.external_id AS team_external_id,
        f.kickoff_time
      FROM lms_picks p
      JOIN lms_entries e ON p.entry_id = e.id
      JOIN gameweeks gw ON p.gameweek_id = gw.id
      JOIN teams t ON p.team_id = t.id
      LEFT JOIN fixtures f ON f.gameweek_id = gw.id AND (f.home_team_id = t.id OR f.away_team_id = t.id)
      WHERE e.league_id::text = $1
        AND e.user_id::text = $2
        AND p.round_number = $3
      ORDER BY gw.gameweek_number ASC;
    `;
    const picksRes = await query(sql, [leagueId, userId, roundNumber]);

    const picksByGameweek: UserLmsRoundPicksResult['picksByGameweek'] = {};
    const burnedTeamIdsSet = new Set<string>();
    const now = Date.now();

    for (const r of picksRes.rows) {
      const isKickoffPassed = r.kickoff_time
        ? new Date(r.kickoff_time).getTime() <= now
        : false;

      picksByGameweek[r.gameweek_number] = {
        pickId: r.pick_id,
        teamId: r.team_id,
        teamExternalId: r.team_external_id,
        teamName: r.team_name,
        teamTla: r.team_tla,
        crestUrl: r.crest_url,
        gameweekNumber: r.gameweek_number,
        result: r.result,
        isKickoffPassed,
      };

      burnedTeamIdsSet.add(String(r.team_id));
      if (r.team_external_id) {
        burnedTeamIdsSet.add(String(r.team_external_id));
      }
    }

    const burnedCount = Object.keys(picksByGameweek).length;
    const availableCount = Math.max(0, 20 - burnedCount);

    return {
      success: true,
      roundNumber,
      picksByGameweek,
      burnedTeamIds: Array.from(burnedTeamIdsSet),
      burnedCount,
      availableCount,
    };
  } catch (error: any) {
    console.error('[getUserLmsRoundPicks] Error:', error);
    return {
      success: false,
      roundNumber: 1,
      picksByGameweek: {},
      burnedTeamIds: [],
      burnedCount: 0,
      availableCount: 20,
      message: error?.message || 'Failed to fetch user LMS picks.',
    };
  }
}

/**
 * Server Action: Submit or update an LMS pick with full rule validation.
 */
export async function submitLmsPick(
  input: SubmitLmsPickInput
): Promise<SubmitLmsPickResult> {
  const { entryId, gameweekId, teamId, fixtureId, kickoffTime, teamName } = input;

  try {
    return await withTransaction(async (client) => {
      // 1. Row-level lock on entry
      const entryRes = await client.query(
        `
        SELECT 
          e.id, 
          e.league_id, 
          e.user_id, 
          e.lives_remaining, 
          e.status,
          l.settings,
          l.current_round
        FROM lms_entries e
        JOIN leagues l ON e.league_id = l.id
        WHERE e.id::text = $1
        FOR UPDATE OF e;
        `,
        [entryId]
      );

      if (entryRes.rows.length === 0) {
        if (entryId.startsWith('demo-')) {
          if (kickoffTime && new Date(kickoffTime).getTime() <= Date.now()) {
            return {
              success: false,
              message: 'Kickoff has already passed. LMS picks are locked.',
            };
          }
          return {
            success: true,
            message: `Pick confirmed for ${teamName || 'selected team'}! (Demo Mode)`,
            teamId,
            livesRemaining: 1,
          };
        }
        throw new Error('LMS Entry not found.');
      }

      const entry = entryRes.rows[0];

      // 2. Check remaining lives & status
      if (entry.status === 'ELIMINATED' || entry.lives_remaining <= 0) {
        throw new Error('Your entry has been eliminated from this tournament (0 lives remaining).');
      }

      // 3. Resolve Team to database UUID
      const teamRes = await client.query(
        `SELECT id, name, external_id FROM teams WHERE id::text = $1 OR external_id::text = $1 LIMIT 1`,
        [teamId]
      );
      if (teamRes.rows.length === 0) {
        throw new Error(`Team not found.`);
      }
      const actualTeamId = teamRes.rows[0].id;
      const actualTeamName = teamName || teamRes.rows[0].name;

      // 4. Resolve Gameweek to database UUID
      const gwRes = await client.query(
        `SELECT id, gameweek_number FROM gameweeks WHERE id::text = $1 OR gameweek_number::text = $1 LIMIT 1`,
        [gameweekId]
      );
      if (gwRes.rows.length === 0) {
        throw new Error(`Gameweek not found.`);
      }
      const actualGameweekId = gwRes.rows[0].id;

      // 5. Enforce gameweek kickoff deadline & fixture status
      const fixtureRes = await client.query(
        `
        SELECT id, kickoff_time, status, home_team_id, away_team_id
        FROM fixtures
        WHERE id::text = $1 OR external_id::text = $1
        LIMIT 1;
        `,
        [fixtureId]
      );

      if (fixtureRes.rows.length > 0) {
        const fixture = fixtureRes.rows[0];
        if (fixture.home_team_id !== actualTeamId && fixture.away_team_id !== actualTeamId) {
          throw new Error(`${actualTeamName} does not play in this fixture.`);
        }

        const targetKickoff = fixture.kickoff_time || kickoffTime;
        if (targetKickoff && new Date(targetKickoff).getTime() <= Date.now()) {
          throw new Error('Kickoff has already passed. LMS picks are locked.');
        }

        if (fixture.status === 'LIVE' || fixture.status === 'FINISHED') {
          throw new Error('Match is already in play or finished. Pick cannot be changed.');
        }
      } else if (kickoffTime && new Date(kickoffTime).getTime() <= Date.now()) {
        throw new Error('Kickoff has already passed. LMS picks are locked.');
      }

      // 6. Enforce no-repeat-team constraint (Burned Team Rule)
      const settings = typeof entry.settings === 'string' ? JSON.parse(entry.settings) : entry.settings || {};
      const allowRepeatTeams = settings.allow_repeat_teams === true;
      const exclusiveTeamPicks = settings.exclusive_team_picks ?? true;

      if (!allowRepeatTeams) {
        const priorPickRes = await client.query(
          `
          SELECT p.id, gw.gameweek_number, t.name AS team_name
          FROM lms_picks p
          JOIN gameweeks gw ON p.gameweek_id = gw.id
          JOIN teams t ON p.team_id = t.id
          WHERE p.entry_id = $1 
            AND p.gameweek_id != $2 
            AND p.team_id = $3
            AND p.round_number = $4
          LIMIT 1;
          `,
          [entry.id, actualGameweekId, actualTeamId, entry.current_round || 1]
        );

        if (priorPickRes.rows.length > 0) {
          const prior = priorPickRes.rows[0];
          throw new Error(
            `You already picked ${prior.team_name} in Gameweek ${prior.gameweek_number}. Under LMS rules, each team may only be selected once per tournament cycle.`
          );
        }
      }

      // 7. Enforce exclusive league picks constraint (Draft style / Unique team picks per gameweek)
      if (exclusiveTeamPicks) {
        const leagueClaimRes = await client.query(
          `
          SELECT u.display_name, t.name AS team_name
          FROM lms_picks p
          JOIN lms_entries e ON p.entry_id = e.id
          JOIN users u ON e.user_id = u.id
          JOIN teams t ON p.team_id = t.id
          WHERE e.league_id = $1
            AND p.gameweek_id = $2
            AND p.team_id = $3
            AND e.id != $4
            AND e.status != 'ELIMINATED'
          LIMIT 1;
          `,
          [entry.league_id, actualGameweekId, actualTeamId, entry.id]
        );

        if (leagueClaimRes.rows.length > 0) {
          const claimedBy = leagueClaimRes.rows[0].display_name;
          const claimedTeam = leagueClaimRes.rows[0].team_name || actualTeamName || 'This team';
          throw new Error(
            `${claimedTeam} has already been picked by ${claimedBy} in this group. Under exclusive pick rules, each team can only be chosen once per gameweek.`
          );
        }
      }

      // 8. Upsert pick record with PENDING status
      const pickUpsert = await client.query(
        `
        INSERT INTO lms_picks (entry_id, gameweek_id, team_id, result, round_number)
        VALUES ($1, $2, $3, 'PENDING', $4)
        ON CONFLICT (entry_id, gameweek_id) DO UPDATE SET
          team_id = EXCLUDED.team_id,
          result = 'PENDING',
          round_number = EXCLUDED.round_number,
          updated_at = NOW()
        RETURNING id, result;
        `,
        [entry.id, actualGameweekId, actualTeamId, entry.current_round || 1]
      );

      return {
        success: true,
        message: `Pick successfully confirmed for ${actualTeamName}!`,
        pickId: pickUpsert.rows[0].id,
        teamId: actualTeamId,
        livesRemaining: entry.lives_remaining,
      };
    });
  } catch (error: any) {
    const isDbUnavailable =
      error.code === 'ECONNREFUSED' ||
      error.name === 'AggregateError' ||
      error.message?.includes('connect') ||
      error.message?.includes('database') ||
      error.message?.includes('ECONNREFUSED') ||
      !error.message;

    if (isDbUnavailable) {
      return simulateOfflinePickSubmission(input);
    }

    return {
      success: false,
      message: error.message || 'Failed to submit pick.',
    };
  }
}

/**
 * Offline simulation for frontend testing when PostgreSQL is not running locally.
 */
function simulateOfflinePickSubmission(input: SubmitLmsPickInput): SubmitLmsPickResult {
  const { kickoffTime, teamName } = input;

  if (kickoffTime && Date.now() >= new Date(kickoffTime).getTime()) {
    return {
      success: false,
      message: 'Kickoff has already passed. LMS picks are locked.',
    };
  }

  return {
    success: true,
    message: `Pick confirmed for ${teamName || 'team'} (Demo Mode)`,
    teamId: input.teamId,
    livesRemaining: 1,
  };
}

export interface RemoveLmsPickInput {
  entryId: string;
  gameweekId: string;
}

export interface RemoveLmsPickResult {
  success: boolean;
  message: string;
}

/**
 * Server Action: Remove/cancel an existing LMS pick before match kickoff.
 * Releases the claimed team back to the pool.
 */
export async function removeLmsPick(
  input: RemoveLmsPickInput
): Promise<RemoveLmsPickResult> {
  const { entryId, gameweekId } = input;

  try {
    return await withTransaction(async (client) => {
      // 1. Resolve Entry
      const entryRes = await client.query(
        `SELECT id, status FROM lms_entries WHERE id::text = $1 FOR UPDATE`,
        [entryId]
      );

      if (entryRes.rows.length === 0) {
        if (entryId.startsWith('demo-')) {
          return { success: true, message: 'Pick removed successfully! (Demo Mode)' };
        }
        throw new Error('LMS Entry not found.');
      }

      const entry = entryRes.rows[0];
      if (entry.status === 'ELIMINATED') {
        throw new Error('Eliminated entries cannot modify picks.');
      }

      // 2. Resolve Gameweek
      const gwRes = await client.query(
        `SELECT id FROM gameweeks WHERE id::text = $1 OR gameweek_number::text = $1 LIMIT 1`,
        [gameweekId]
      );
      const targetGwId = gwRes.rows.length > 0 ? gwRes.rows[0].id : gameweekId;

      // 3. Find active pick for this gameweek and check kickoff deadline
      const pickRes = await client.query(
        `
        SELECT p.id, p.result, f.kickoff_time, f.status AS fixture_status
        FROM lms_picks p
        LEFT JOIN fixtures f ON f.gameweek_id = p.gameweek_id AND (f.home_team_id = p.team_id OR f.away_team_id = p.team_id)
        WHERE p.entry_id = $1 AND p.gameweek_id = $2
        LIMIT 1;
        `,
        [entry.id, targetGwId]
      );

      if (pickRes.rows.length === 0) {
        return { success: true, message: 'No pick found to remove.' };
      }

      const pick = pickRes.rows[0];
      if (pick.kickoff_time && new Date(pick.kickoff_time).getTime() <= Date.now()) {
        throw new Error('Kickoff has already passed. LMS pick is locked and cannot be removed.');
      }
      if (pick.fixture_status === 'LIVE' || pick.fixture_status === 'FINISHED') {
        throw new Error('Match is already in progress or finished. Pick cannot be removed.');
      }
      if (pick.result !== 'PENDING') {
        throw new Error('Settled picks cannot be removed.');
      }

      // 4. Delete the pick
      await client.query(
        `DELETE FROM lms_picks WHERE entry_id = $1 AND gameweek_id = $2`,
        [entry.id, targetGwId]
      );

      return {
        success: true,
        message: 'Pick removed successfully. Your team selection has been cleared.',
      };
    });
  } catch (error: any) {
    console.error('[removeLmsPick] Error:', error);
    return {
      success: false,
      message: error?.message || 'Failed to remove pick.',
    };
  }
}
