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

      // 3. Enforce gameweek kickoff deadline
      const fixtureRes = await client.query(
        `
        SELECT kickoff_time, status
        FROM fixtures
        WHERE id::text = $1 OR external_id::text = $1
        LIMIT 1;
        `,
        [fixtureId]
      );

      const targetKickoff = fixtureRes.rows[0]?.kickoff_time || kickoffTime;
      if (targetKickoff) {
        const kickoffDate = new Date(targetKickoff).getTime();
        const now = Date.now();
        if (now >= kickoffDate) {
          throw new Error('Kickoff has already passed. LMS picks are locked.');
        }
      }

      if (fixtureRes.rows[0]?.status === 'LIVE' || fixtureRes.rows[0]?.status === 'FINISHED') {
        throw new Error('Match is already in play or finished. Pick cannot be changed.');
      }

      // 4. Enforce no-repeat-team constraint
      const settings = typeof entry.settings === 'string' ? JSON.parse(entry.settings) : entry.settings || {};
      const allowRepeatTeams = settings.allow_repeat_teams === true;
      const exclusiveTeamPicks = settings.exclusive_team_picks ?? true;

      if (!allowRepeatTeams) {
        const priorPickRes = await client.query(
          `
          SELECT id, gameweek_id, team_id
          FROM lms_picks
          WHERE entry_id = $1 
            AND gameweek_id::text != $2 
            AND team_id::text = $3
            AND round_number = $4
          LIMIT 1;
          `,
          [entry.id, gameweekId, teamId, entry.current_round || 1]
        );

        if (priorPickRes.rows.length > 0) {
          throw new Error(
            `You have already picked ${teamName || 'this team'} in a previous gameweek of this round. Under LMS rules, each team may only be selected once per tournament round.`
          );
        }
      }

      // 4b. Enforce exclusive league picks constraint (Draft style / Unique team picks per gameweek)
      if (exclusiveTeamPicks) {
        const leagueClaimRes = await client.query(
          `
          SELECT u.display_name, t.name AS team_name
          FROM lms_picks p
          JOIN lms_entries e ON p.entry_id = e.id
          JOIN users u ON e.user_id = u.id
          JOIN teams t ON p.team_id = t.id
          WHERE e.league_id = $1
            AND p.gameweek_id::text = $2
            AND (p.team_id::text = $3 OR t.external_id::text = $3)
            AND e.id != $4
            AND e.status != 'ELIMINATED'
          LIMIT 1;
          `,
          [entry.league_id, gameweekId, teamId, entry.id]
        );

        if (leagueClaimRes.rows.length > 0) {
          const claimedBy = leagueClaimRes.rows[0].display_name;
          const claimedTeam = leagueClaimRes.rows[0].team_name || teamName || 'This team';
          throw new Error(
            `${claimedTeam} has already been picked by ${claimedBy} in this group. Under exclusive pick rules, each team can only be chosen once per gameweek.`
          );
        }
      }

      // 5. Upsert pick record with PENDING status
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
        [entry.id, gameweekId, teamId, entry.current_round || 1]
      );

      return {
        success: true,
        message: `Pick successfully confirmed for ${teamName || 'selected team'}!`,
        pickId: pickUpsert.rows[0].id,
        teamId,
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
