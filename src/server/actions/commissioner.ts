'use server';

import { query, withTransaction } from '@/server/db/pool';
import { getCurrentUser } from '@/server/auth/session';

export interface UpdateLeagueSettingsInput {
  leagueId: string;
  userId?: string;
  name?: string;
  startingLives?: number;
  exclusiveTeamPicks?: boolean;
  exclusiveMatchClaims?: boolean;
  allowDuplicatePredictions?: boolean;
  matchesPerGameweek?: number | 'ALL';
}

export interface LeagueMemberRosterItem {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  isCreator: boolean;
  lmsStatus?: string;
  lmsLives?: number;
  predictorPoints?: number;
}

export interface CommissionerRoundHistoryItem {
  roundNumber: number;
  winnerUserId?: string;
  winnerName?: string;
  completedAt: string;
  totalParticipants: number;
}

/**
 * Internal helper to verify that a user is the league creator or an ADMIN member.
 */
export async function verifyCommissioner(
  leagueId: string,
  userIdOverride?: string
): Promise<{ isCommissioner: boolean; league?: any; userId?: string }> {
  let userId = userIdOverride;
  if (!userId) {
    const user = await getCurrentUser();
    if (!user) return { isCommissioner: false };
    userId = user.id;
  }

  const res = await query(
    `
    SELECT 
      l.id, 
      l.creator_id, 
      l.name, 
      l.type, 
      l.current_round,
      l.settings,
      lm.role
    FROM leagues l
    LEFT JOIN league_members lm ON lm.league_id = l.id AND lm.user_id::text = $2
    WHERE l.id::text = $1
    `,
    [leagueId, userId]
  );

  if (res.rows.length === 0) {
    return { isCommissioner: false, userId };
  }

  const row = res.rows[0];
  const isCreator = String(row.creator_id) === String(userId);
  const isAdmin = row.role === 'ADMIN';

  return {
    isCommissioner: isCreator || isAdmin,
    league: row,
    userId,
  };
}

/**
 * Server Action: Update tournament name and configuration rules.
 */
export async function updateLeagueSettings(
  input: UpdateLeagueSettingsInput
): Promise<{ success: boolean; message: string; league?: any }> {
  try {
    const { isCommissioner, league, userId } = await verifyCommissioner(
      input.leagueId,
      input.userId
    );

    if (!isCommissioner || !league) {
      return { success: false, message: 'Only the league commissioner can modify settings.' };
    }

    const currentSettings =
      typeof league.settings === 'string' ? JSON.parse(league.settings) : league.settings || {};

    const updatedSettings = {
      ...currentSettings,
      ...(input.startingLives !== undefined && { starting_lives: Number(input.startingLives) }),
      ...(input.exclusiveTeamPicks !== undefined && { exclusive_team_picks: Boolean(input.exclusiveTeamPicks) }),
      ...(input.exclusiveMatchClaims !== undefined && { exclusive_match_claims: Boolean(input.exclusiveMatchClaims) }),
      ...(input.allowDuplicatePredictions !== undefined && { allow_duplicate_predictions: Boolean(input.allowDuplicatePredictions) }),
      ...(input.matchesPerGameweek !== undefined && { matches_per_gameweek: input.matchesPerGameweek }),
    };

    const newName = input.name?.trim() ? input.name.trim() : league.name;

    const res = await query(
      `
      UPDATE leagues
      SET name = $1, settings = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, type, current_round, settings;
      `,
      [newName, JSON.stringify(updatedSettings), input.leagueId]
    );

    return {
      success: true,
      message: 'League settings updated successfully.',
      league: res.rows[0],
    };
  } catch (error: any) {
    console.error('[updateLeagueSettings] Error:', error);
    return { success: false, message: error?.message || 'Failed to update settings.' };
  }
}

/**
 * Server Action: Retrieve member roster for commissioner management.
 */
export async function getLeagueMembersRoster(
  leagueId: string,
  userIdOverride?: string
): Promise<{ success: boolean; members: LeagueMemberRosterItem[]; message?: string }> {
  try {
    const { isCommissioner, league } = await verifyCommissioner(leagueId, userIdOverride);
    if (!isCommissioner || !league) {
      return { success: false, members: [], message: 'Unauthorized. Commissioner access required.' };
    }

    const res = await query(
      `
      SELECT 
        u.id AS user_id,
        u.display_name,
        u.email,
        u.avatar_url,
        lm.role,
        lm.joined_at,
        (l.creator_id = u.id) AS is_creator,
        e.status AS lms_status,
        e.lives_remaining AS lms_lives,
        plb.total_points AS predictor_points
      FROM league_members lm
      JOIN leagues l ON lm.league_id = l.id
      JOIN users u ON lm.user_id = u.id
      LEFT JOIN lms_entries e ON e.league_id = l.id AND e.user_id = u.id
      LEFT JOIN predictor_leaderboard plb ON plb.league_id = l.id AND plb.user_id = u.id
      WHERE lm.league_id::text = $1
      ORDER BY 
        (l.creator_id = u.id) DESC,
        lm.role = 'ADMIN' DESC,
        u.display_name ASC;
      `,
      [leagueId]
    );

    const members: LeagueMemberRosterItem[] = res.rows.map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      email: r.email,
      avatarUrl: r.avatar_url,
      role: r.role,
      joinedAt: r.joined_at,
      isCreator: r.is_creator,
      lmsStatus: r.lms_status,
      lmsLives: r.lms_lives,
      predictorPoints: r.predictor_points,
    }));

    return { success: true, members };
  } catch (error: any) {
    console.error('[getLeagueMembersRoster] Error:', error);
    return { success: false, members: [], message: error?.message || 'Failed to load member roster.' };
  }
}

/**
 * Server Action: Remove/kick a player from the league.
 */
export async function removeLeagueMember(
  leagueId: string,
  targetUserId: string,
  callerUserIdOverride?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { isCommissioner, league, userId } = await verifyCommissioner(
      leagueId,
      callerUserIdOverride
    );

    if (!isCommissioner || !league) {
      return { success: false, message: 'Unauthorized. Only commissioners can remove members.' };
    }

    if (String(targetUserId) === String(league.creator_id)) {
      return { success: false, message: 'Cannot remove the league founder.' };
    }

    if (String(targetUserId) === String(userId)) {
      return { success: false, message: 'You cannot kick yourself. Delete the league instead.' };
    }

    await withTransaction(async (client) => {
      // 1. Delete member
      await client.query(
        `DELETE FROM league_members WHERE league_id::text = $1 AND user_id::text = $2`,
        [leagueId, targetUserId]
      );

      // 2. Cascade delete LMS entry and Predictor board
      await client.query(
        `DELETE FROM lms_entries WHERE league_id::text = $1 AND user_id::text = $2`,
        [leagueId, targetUserId]
      );

      await client.query(
        `DELETE FROM predictor_leaderboard WHERE league_id::text = $1 AND user_id::text = $2`,
        [leagueId, targetUserId]
      );
    });

    return { success: true, message: 'Player successfully removed from the tournament.' };
  } catch (error: any) {
    console.error('[removeLeagueMember] Error:', error);
    return { success: false, message: error?.message || 'Failed to remove member.' };
  }
}

/**
 * Server Action: Start "Round 2" (Tournament Reset)
 * - Archives Round 1 winner and standing snapshot
 * - Increments current_round
 * - Restores all LMS players to ALIVE with full starting lives
 * - Clears burned teams for the fresh round
 * - Retains all group members so nobody needs to re-join
 */
export async function startTournamentRoundTwo(
  leagueId: string,
  callerUserIdOverride?: string
): Promise<{
  success: boolean;
  message: string;
  newRound?: number;
  archivedRound?: number;
  winnerName?: string;
}> {
  try {
    const { isCommissioner, league } = await verifyCommissioner(
      leagueId,
      callerUserIdOverride
    );

    if (!isCommissioner || !league) {
      return { success: false, message: 'Only the league commissioner can launch a new tournament round.' };
    }

    return await withTransaction(async (client) => {
      const currentRound = league.current_round ?? 1;
      const settings = typeof league.settings === 'string' ? JSON.parse(league.settings) : league.settings || {};
      const startingLives = settings.starting_lives ?? 1;

      // 1. Identify Round Winner / Top Survivor
      const winnerRes = await client.query(
        `
        SELECT u.id, u.display_name, e.status, e.lives_remaining
        FROM lms_entries e
        JOIN users u ON e.user_id = u.id
        WHERE e.league_id::text = $1
        ORDER BY (e.status = 'WINNER') DESC, e.lives_remaining DESC
        LIMIT 1;
        `,
        [leagueId]
      );

      const winnerRow = winnerRes.rows[0];
      const winnerName = winnerRow?.display_name || 'Group Champions';

      // 2. Count total members
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS count FROM league_members WHERE league_id::text = $1`,
        [leagueId]
      );
      const totalParticipants = countRes.rows[0]?.count || 0;

      // 3. Build Round History Archive Item
      const roundArchiveItem: CommissionerRoundHistoryItem = {
        roundNumber: currentRound,
        winnerUserId: winnerRow?.id,
        winnerName,
        completedAt: new Date().toISOString(),
        totalParticipants,
      };

      const roundHistory: CommissionerRoundHistoryItem[] = settings.round_history || [];
      roundHistory.push(roundArchiveItem);

      const nextRound = currentRound + 1;
      const updatedSettings = {
        ...settings,
        round_history: roundHistory,
      };

      // 4. Update League to Next Round
      await client.query(
        `
        UPDATE leagues
        SET current_round = $1, settings = $2, updated_at = NOW()
        WHERE id::text = $3
        `,
        [nextRound, JSON.stringify(updatedSettings), leagueId]
      );

      // 5. Reset all LMS entries: restore to ALIVE with full starting lives
      await client.query(
        `
        UPDATE lms_entries
        SET 
          status = 'ALIVE',
          lives_remaining = $1,
          eliminated_at_gameweek_id = NULL,
          updated_at = NOW()
        WHERE league_id::text = $2
        `,
        [startingLives, leagueId]
      );

      return {
        success: true,
        message: `Round ${nextRound} is officially live! All player lives have been restored to ${startingLives} and burned teams are cleared for the fresh round.`,
        newRound: nextRound,
        archivedRound: currentRound,
        winnerName,
      };
    });
  } catch (error: any) {
    console.error('[startTournamentRoundTwo] Error:', error);
    return { success: false, message: error?.message || 'Failed to start next tournament round.' };
  }
}
