'use server';

import { query } from '@/server/db/pool';
import { getCurrentUser } from '@/server/auth/session';

export interface HistoryGameweekPick {
  gameweekNumber: number;
  teamId?: string;
  teamName?: string;
  teamTla?: string;
  crestUrl?: string;
  result?: 'PENDING' | 'SURVIVED' | 'LOST_LIFE' | 'VOID';
  isMasked?: boolean;
  predictorPoints?: number;
}

export interface PlayerHistoryRow {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  livesRemaining: number;
  totalPoints: number;
  picksByGameweek: Record<number, HistoryGameweekPick>;
}

export interface LeagueHistoryMatrixResult {
  success: boolean;
  gameweeks: number[];
  currentGameweek: number;
  players: PlayerHistoryRow[];
  leagueType: string;
  leagueName: string;
  message?: string;
}

export interface TeamBurnStatus {
  id: string;
  externalId: number;
  name: string;
  shortName: string;
  tla: string;
  crestUrl: string;
  isBurned: boolean;
  gameweekNumber?: number;
  pickResult?: string;
}

/**
 * Server Action: Retrieve the full matrix of player picks and points across all gameweeks
 * for a league (audit trail / group history).
 */
export async function getLeagueHistoryMatrix(
  leagueId: string,
  viewingUserId?: string
): Promise<LeagueHistoryMatrixResult> {
  try {
    let currentUserId = viewingUserId;
    if (!currentUserId) {
      try {
        const user = await getCurrentUser();
        if (user) currentUserId = user.id;
      } catch {
        // Fallback for non-session callers
      }
    }

    // 1. Fetch League info
    const leagueRes = await query(
      `SELECT id, name, type, settings FROM leagues WHERE id::text = $1`,
      [leagueId]
    );

    if (leagueRes.rows.length === 0) {
      return {
        success: false,
        gameweeks: [],
        currentGameweek: 5,
        players: [],
        leagueType: 'LAST_MAN_STANDING',
        leagueName: '',
        message: 'League not found',
      };
    }

    const league = leagueRes.rows[0];
    const settings = typeof league.settings === 'string'
      ? JSON.parse(league.settings)
      : league.settings || {};
    const isExclusive = settings.exclusive_team_picks ?? true;

    // 2. Determine active / relevant gameweeks (GW 1 up to current active GW 5)
    const currentGameweek = 5;
    const gameweeks = [1, 2, 3, 4, 5];

    // 3. Fetch Players in League
    const playerSql = `
      SELECT 
        u.id AS user_id,
        u.display_name,
        u.avatar_url,
        COALESCE(e.lives_remaining, 1) AS lives_remaining,
        COALESCE(e.status, 'ALIVE') AS status,
        COALESCE(plb.total_points, 0) AS total_points,
        e.id AS entry_id
      FROM league_members lm
      JOIN users u ON lm.user_id = u.id
      LEFT JOIN lms_entries e ON lm.league_id = e.league_id AND lm.user_id = e.user_id
      LEFT JOIN predictor_leaderboard plb ON lm.league_id = plb.league_id AND lm.user_id = plb.user_id
      WHERE lm.league_id::text = $1
      ORDER BY 
        CASE 
          WHEN e.status = 'WINNER' THEN 1 
          WHEN e.status = 'ALIVE' THEN 2 
          ELSE 3 
        END,
        COALESCE(plb.total_points, 0) DESC,
        COALESCE(e.lives_remaining, 1) DESC,
        u.display_name ASC
    `;
    const playerRes = await query(playerSql, [leagueId]);

    // 4. Fetch LMS Picks
    const lmsSql = `
      SELECT 
        e.user_id,
        gw.gameweek_number,
        p.result,
        t.id AS team_id,
        t.name AS team_name,
        t.short_name,
        t.tla AS team_tla,
        t.crest_url,
        f.kickoff_time,
        f.status AS fixture_status
      FROM lms_picks p
      JOIN lms_entries e ON p.entry_id = e.id
      JOIN gameweeks gw ON p.gameweek_id = gw.id
      JOIN teams t ON p.team_id = t.id
      LEFT JOIN fixtures f ON f.gameweek_id = gw.id AND (f.home_team_id = t.id OR f.away_team_id = t.id)
      WHERE e.league_id::text = $1
    `;
    const lmsRes = await query(lmsSql, [leagueId]);

    // 5. Fetch Predictor Points per GW
    const predictorSql = `
      SELECT 
        p.user_id,
        gw.gameweek_number,
        SUM(COALESCE(p.points_awarded, 0))::int AS gameweek_points
      FROM predictor_picks p
      JOIN fixtures f ON p.fixture_id = f.id
      JOIN gameweeks gw ON f.gameweek_id = gw.id
      WHERE p.league_id::text = $1
      GROUP BY p.user_id, gw.gameweek_number
    `;
    const predictorRes = await query(predictorSql, [leagueId]);

    // Build index of predictor points: Record<`${userId}_${gw}`, points>
    const predictorPointsIndex: Record<string, number> = {};
    for (const row of predictorRes.rows) {
      predictorPointsIndex[`${row.user_id}_${row.gameweek_number}`] = row.gameweek_points;
    }

    // Build index of LMS picks: Record<`${userId}_${gw}`, pickData>
    const lmsPicksIndex: Record<string, any> = {};
    const now = Date.now();

    for (const row of lmsRes.rows) {
      const isOwn = Boolean(currentUserId && row.user_id === currentUserId);
      const isKickoffPassed = row.kickoff_time
        ? new Date(row.kickoff_time).getTime() <= now
        : false;
      const isLiveOrFinished = ['LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED'].includes(row.fixture_status);
      const isVisible = isOwn || isKickoffPassed || isLiveOrFinished || isExclusive;

      lmsPicksIndex[`${row.user_id}_${row.gameweek_number}`] = {
        teamId: isVisible ? row.team_id : undefined,
        teamName: isVisible ? row.team_name : 'Pick Locked',
        teamTla: isVisible ? row.team_tla : 'LCK',
        crestUrl: isVisible ? row.crest_url : '',
        result: row.result,
        isMasked: !isVisible,
      };
    }

    // Assemble Player Rows
    const players: PlayerHistoryRow[] = playerRes.rows.map((pRow) => {
      const picksByGameweek: Record<number, HistoryGameweekPick> = {};

      for (const gw of gameweeks) {
        const lmsPick = lmsPicksIndex[`${pRow.user_id}_${gw}`];
        const predPoints = predictorPointsIndex[`${pRow.user_id}_${gw}`];

        picksByGameweek[gw] = {
          gameweekNumber: gw,
          teamId: lmsPick?.teamId,
          teamName: lmsPick?.teamName,
          teamTla: lmsPick?.teamTla,
          crestUrl: lmsPick?.crestUrl,
          result: lmsPick?.result,
          isMasked: lmsPick?.isMasked,
          predictorPoints: predPoints,
        };
      }

      return {
        userId: pRow.user_id,
        displayName: pRow.display_name,
        avatarUrl: pRow.avatar_url,
        status: pRow.status,
        livesRemaining: pRow.lives_remaining,
        totalPoints: pRow.total_points,
        picksByGameweek,
      };
    });

    return {
      success: true,
      gameweeks,
      currentGameweek,
      players,
      leagueType: league.type,
      leagueName: league.name,
    };
  } catch (error: any) {
    console.error('[getLeagueHistoryMatrix] Error:', error);
    return {
      success: false,
      gameweeks: [],
      currentGameweek: 5,
      players: [],
      leagueType: 'LAST_MAN_STANDING',
      leagueName: '',
      message: error?.message || 'Failed to retrieve league history',
    };
  }
}

/**
 * Server Action: Retrieve the 20 Premier League teams with their burned/used status
 * for the current user in a specific LMS league.
 */
export async function getUserBurnedTeams(
  leagueId: string,
  userIdOverride?: string
): Promise<{ success: boolean; teams: TeamBurnStatus[]; burnedCount: number; availableCount: number }> {
  try {
    let userId = userIdOverride;
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) return { success: true, teams: [], burnedCount: 0, availableCount: 0 };
      userId = user.id;
    }

    // 1. Fetch all Premier League teams participating in active fixtures
    const teamsRes = await query(`
      SELECT DISTINCT t.id, t.external_id, t.name, t.short_name, t.tla, t.crest_url
      FROM teams t
      WHERE t.id IN (
        SELECT home_team_id FROM fixtures
        UNION
        SELECT away_team_id FROM fixtures
      )
      ORDER BY t.name ASC;
    `);

    // 2. Fetch user's picks in this league for the active tournament round
    const picksRes = await query(`
      SELECT p.team_id, gw.gameweek_number, p.result
      FROM lms_picks p
      JOIN lms_entries e ON p.entry_id = e.id
      JOIN gameweeks gw ON p.gameweek_id = gw.id
      JOIN leagues l ON e.league_id = l.id
      WHERE e.league_id::text = $1 AND e.user_id::text = $2 AND p.round_number = l.current_round;
    `, [leagueId, userId]);

    const picksMap = new Map<string, { gameweekNumber: number; result: string }>();
    for (const r of picksRes.rows) {
      picksMap.set(String(r.team_id), {
        gameweekNumber: r.gameweek_number,
        result: r.result,
      });
    }

    let burnedCount = 0;
    const teams: TeamBurnStatus[] = teamsRes.rows.map((t) => {
      const pick = picksMap.get(String(t.id));
      const isBurned = Boolean(pick);
      if (isBurned) burnedCount++;

      return {
        id: t.id,
        externalId: t.external_id,
        name: t.name,
        shortName: t.short_name,
        tla: t.tla,
        crestUrl: t.crest_url,
        isBurned,
        gameweekNumber: pick?.gameweekNumber,
        pickResult: pick?.result,
      };
    });

    return {
      success: true,
      teams,
      burnedCount,
      availableCount: teams.length - burnedCount,
    };
  } catch (error: any) {
    console.error('[getUserBurnedTeams] Error:', error);
    return {
      success: false,
      teams: [],
      burnedCount: 0,
      availableCount: 0,
    };
  }
}
